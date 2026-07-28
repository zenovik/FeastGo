import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import RestaurantOwner from '../models/RestaurantOwner.js';
import DeliveryAssignment from '../models/DeliveryAssignment.js';
import DeliveryTracking from '../models/DeliveryTracking.js';
import DeliveryEarning from '../models/DeliveryEarning.js';
import SystemSettings from '../models/SystemSettings.js';
import { ApiError } from '../utils/ApiError.js';
import {
  notifyCustomer,
  notifyCustomerOrderStatus,
  notifySeller,
  notifyAdmins,
  notifySellerRiderReachedRestaurant,
  notifySellerOrderPickedUp,
  notifyFailedDelivery,
  notifyCompletedDelivery,
  notifyDeliveryPartner,
  notifyCustomerUnreachable,
} from '../utils/notify.js';
import { autoAssignDeliveryPartner } from '../utils/deliveryAssign.js';

function requireApproved(user) {
  if (user.status !== 'approved') throw new ApiError(403, 'Your account is awaiting admin approval');
}

// `delivered` stays directly reachable from `out_for_delivery` (skipping
// `reached_customer`) so a partner isn't forced to tap an extra step for a
// short hop — `reached_customer` is an optional "I've arrived" checkpoint
// the UI can offer, not a mandatory gate.
const DELIVERY_TRANSITIONS = {
  accepted: ['reached_restaurant', 'cancelled'],
  reached_restaurant: ['picked_up', 'cancelled'],
  picked_up: ['out_for_delivery'],
  out_for_delivery: ['reached_customer', 'delivered', 'failed'],
  reached_customer: ['delivered', 'failed'],
  failed: ['returned'],
};

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Orders ready to be picked up and not yet claimed by another partner.
export async function listAvailableOrders(_req, res, next) {
  try {
    const orders = await Order.find({ status: 'ready_for_pickup', deliveryPartner: null })
      .sort({ createdAt: 1 })
      .limit(50);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

export async function listMyOrders(req, res, next) {
  try {
    const filter = { deliveryPartner: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.deliveryStatus) filter.deliveryStatus = req.query.deliveryStatus;
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

export async function getOrderDetail(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.user._id })
      .populate('user', 'name phone')
      .populate('restaurant', 'name address location owner');
    if (!order) throw new ApiError(404, 'Order not found');

    let sellerPhone = '';
    if (order.restaurant?.owner) {
      const owner = await RestaurantOwner.findById(order.restaurant.owner).select('phone');
      sellerPhone = owner?.phone ?? '';
    }

    res.json({ order, sellerPhone });
  } catch (err) {
    next(err);
  }
}

// Covers two distinct paths that both land here from the client's single
// "Accept" button: (1) self-serve — partner picks an unclaimed order straight
// from the available list, and (2) confirming an order auto/admin-assigned
// to this same partner (deliveryStatus 'assigned') — which already holds
// req.user.currentOrder, so the "already busy" guard must not fire on it.
export async function acceptOrder(req, res, next) {
  try {
    requireApproved(req.user);

    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');

    const isOwnAssignment =
      order.deliveryPartner?.equals(req.user._id) && order.deliveryStatus === 'assigned';

    if (!isOwnAssignment) {
      if (req.user.currentOrder) throw new ApiError(409, 'You already have an active delivery in progress');
      if (order.status !== 'ready_for_pickup' || order.deliveryPartner) {
        throw new ApiError(409, 'This order is no longer available');
      }
      order.deliveryPartner = req.user._id;
    }

    order.deliveryStatus = 'accepted';
    order.deliveryStatusHistory.push({ status: 'accepted' });
    await order.save();

    req.user.currentOrder = order._id;
    await req.user.save();

    const existingAssignment = await DeliveryAssignment.findOne({ order: order._id, partner: req.user._id });
    if (existingAssignment) {
      existingAssignment.status = 'accepted';
      existingAssignment.respondedAt = new Date();
      await existingAssignment.save();
    } else {
      await DeliveryAssignment.create({
        order: order._id,
        partner: req.user._id,
        assignedByRole: 'auto',
        status: 'accepted',
        respondedAt: new Date(),
      });
    }

    const shortId = order._id.toString().slice(-6);
    // For an own-assignment confirm, the customer/seller were already told
    // "delivery partner assigned" the moment auto/admin-assign happened —
    // this accept is just the partner confirming, not a new fact for them.
    if (!isOwnAssignment) {
      await notifyCustomer(order, 'delivery_assigned', 'Delivery partner assigned', `${req.user.name} will deliver order #${shortId}`);
      const restaurant = await Restaurant.findById(order.restaurant);
      if (restaurant) await notifySeller(restaurant, 'delivery_assigned', 'Delivery partner assigned', `${req.user.name} will pick up order #${shortId}`, order._id);
    }
    await notifyAdmins('delivery_assigned', 'Delivery assigned', `${req.user.name} accepted order #${shortId}`, order._id);

    res.json({ order });
  } catch (err) {
    next(err);
  }
}

// Declines an order that admin/auto assigned before the partner accepted it.
// Rejecting never touches the customer-facing Order.status — only the
// delivery-side deliveryStatus changes — so the order stays active and is
// never cancelled just because one partner turned it down.
export async function rejectOrder(req, res, next) {
  try {
    const reason = String(req.body.reason ?? '').trim();
    if (!reason) throw new ApiError(400, 'A rejection reason is required');

    const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.user._id });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.deliveryStatus !== 'assigned') throw new ApiError(400, 'This order cannot be rejected at this stage');

    const now = new Date();
    const shortId = order._id.toString().slice(-6);
    const rejectingPartnerName = req.user.name;

    await DeliveryAssignment.findOneAndUpdate(
      { order: order._id, partner: req.user._id, status: 'assigned' },
      { status: 'rejected', respondedAt: now, note: reason }
    );

    req.user.currentOrder = null;
    req.user.orderRejectionCount += 1;
    await req.user.save();

    order.deliveryPartner = null;
    order.deliveryStatus = 'searching';
    order.deliveryStatusHistory.push({ status: 'searching' });
    order.reassignCount += 1;
    await order.save();

    const restaurant = await Restaurant.findById(order.restaurant);

    // Never hand the order straight back to a partner who already declined
    // it (or anyone else already tried for it this round).
    const triedPartnerIds = await DeliveryAssignment.find({ order: order._id }).distinct('partner');
    const reassigned = restaurant ? await autoAssignDeliveryPartner(order, restaurant, triedPartnerIds) : null;

    await notifyCustomer(
      order,
      'general',
      'Finding a new delivery partner',
      `Your delivery partner was unable to take order #${shortId} — we're assigning a new one now. Your order is safe and will still be delivered.`
    );
    if (restaurant) {
      await notifySeller(
        restaurant,
        'general',
        'Delivery partner declined',
        `${rejectingPartnerName} declined order #${shortId}: ${reason}`,
        order._id
      );
    }

    const settings = await SystemSettings.getOrCreate();

    if (!reassigned) {
      await notifyAdmins('failed_delivery', 'No delivery partner available', `Order #${shortId} needs manual assignment`, order._id);
    }
    if (order.reassignCount >= settings.maxReassignAttempts) {
      await notifyAdmins(
        'failed_delivery',
        'Manual assignment needed',
        `Order #${shortId} has been declined ${order.reassignCount} times — please assign a delivery partner manually`,
        order._id
      );
    }

    if (req.user.orderRejectionCount >= settings.maxRejectionsBeforeFlag && !req.user.flaggedForReview) {
      req.user.flaggedForReview = true;
      await req.user.save();
      await notifyAdmins(
        'user_report',
        'Delivery partner flagged for review',
        `${rejectingPartnerName} has rejected ${req.user.orderRejectionCount} orders — flagged for admin review`
      );
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function updateDeliveryStatus(req, res, next) {
  try {
    requireApproved(req.user);
    const { status, otp, proofImage, reason } = req.body;

    const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.user._id });
    if (!order) throw new ApiError(404, 'Order not found');

    const allowed = DELIVERY_TRANSITIONS[order.deliveryStatus] || [];
    if (!allowed.includes(status)) {
      throw new ApiError(400, `Cannot move this delivery from "${order.deliveryStatus}" to "${status}"`);
    }

    const restaurant = await Restaurant.findById(order.restaurant);

    if (status === 'picked_up') {
      order.pickedUpAt = new Date();
      order.deliveryOtp = generateOtp();
      if (restaurant) await notifySellerOrderPickedUp(restaurant, order, req.user);
      await notifyCustomer(
        order,
        'general',
        'Order picked up',
        `${req.user.name} has picked up order #${order._id.toString().slice(-6)} and is heading your way`
      );
      await notifyCustomer(
        order,
        'general',
        'Your delivery OTP',
        `Share this OTP with your delivery partner at drop-off: ${order.deliveryOtp}`
      );
    }

    if (status === 'out_for_delivery') {
      order.status = 'out_for_delivery';
      order.statusHistory.push({ status: 'out_for_delivery' });
      await notifyCustomerOrderStatus(order, 'out_for_delivery');
    }

    if (status === 'reached_restaurant' && restaurant) {
      await notifySellerRiderReachedRestaurant(restaurant, order, req.user);
    }

    if (status === 'reached_customer') {
      order.reachedCustomerAt = new Date();
    }

    if (status === 'delivered') {
      // Mandatory confirmation — either the 4-digit OTP or a scanned QR code
      // (the QR just encodes the same OTP string, so both paths check here).
      // A proof photo alone is not accepted as a substitute: the spec calls
      // for OTP/QR confirmation specifically, not "any evidence."
      if (!order.deliveryOtp || !otp || otp !== order.deliveryOtp) {
        throw new ApiError(400, 'Enter the correct delivery OTP or scan the customer\'s QR code to confirm delivery');
      }
      order.deliveryOtpVerified = true;
      if (proofImage) order.deliveryProofImage = proofImage;
      order.deliveredAt = new Date();
      order.status = 'delivered';
      order.statusHistory.push({ status: 'delivered' });

      const earningTotal = order.deliveryFee + (order.tip || 0);
      await DeliveryEarning.create({
        partner: req.user._id,
        order: order._id,
        baseFee: order.deliveryFee,
        tip: order.tip || 0,
        total: earningTotal,
      });
      await DeliveryAssignment.updateMany({ order: order._id, partner: req.user._id }, { status: 'completed' });
      await notifyDeliveryPartner(
        req.user._id,
        'earnings_updated',
        'Earnings updated',
        `You earned ₹${earningTotal.toFixed(2)} for order #${order._id.toString().slice(-6)}`,
        order._id
      );

      req.user.currentOrder = null;
      await req.user.save();

      await notifyCustomerOrderStatus(order, 'delivered');
      await notifyCompletedDelivery(order);
    }

    if (status === 'failed') {
      order.deliveryFailReason = reason || '';
      order.status = 'failed';
      order.statusHistory.push({ status: 'failed' });
      req.user.currentOrder = null;
      await req.user.save();
      if (/unreachable/i.test(reason || '')) {
        await notifyCustomerUnreachable(order);
      }
      await notifyFailedDelivery(order, reason);
    }

    if (status === 'returned') {
      order.status = 'returned';
      order.statusHistory.push({ status: 'returned' });
      await notifyAdmins('completed_delivery', 'Order returned', `Order #${order._id.toString().slice(-6)} was returned to ${order.restaurantName}`, order._id);
    }

    if (status === 'cancelled') {
      order.deliveryFailReason = reason || '';
      req.user.currentOrder = null;
      await req.user.save();
      await DeliveryAssignment.updateMany({ order: order._id, partner: req.user._id }, { status: 'cancelled' });

      const oldPartnerId = order.deliveryPartner;
      order.deliveryPartner = null;
      order.reassignCount += 1;
      order.deliveryStatus = 'pending';
      order.deliveryStatusHistory.push({ status: 'pending' });
      await order.save();

      const reassigned = restaurant ? await autoAssignDeliveryPartner(order, restaurant) : null;
      if (!reassigned) {
        await notifyAdmins('failed_delivery', 'No delivery partner available', `Order #${order._id.toString().slice(-6)} needs manual reassignment`, order._id);
      }
      return res.json({ order });
    }

    order.deliveryStatus = status;
    order.deliveryStatusHistory.push({ status });
    await order.save();

    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function updateLocation(req, res, next) {
  try {
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new ApiError(400, 'Invalid coordinates');
    }

    req.user.location = { lat, lng };
    req.user.lastLocationAt = new Date();
    await req.user.save();

    if (req.user.currentOrder) {
      await DeliveryTracking.create({ order: req.user.currentOrder, partner: req.user._id, lat, lng });
    }

    res.json({ location: req.user.location });
  } catch (err) {
    next(err);
  }
}

export async function getMyEarnings(req, res, next) {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [totalAgg, todayAgg, weeklyAgg, monthlyAgg, pendingAgg] = await Promise.all([
      DeliveryEarning.aggregate([
        { $match: { partner: req.user._id } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 }, tips: { $sum: '$tip' }, bonus: { $sum: '$bonus' } } },
      ]),
      DeliveryEarning.aggregate([{ $match: { partner: req.user._id, createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      DeliveryEarning.aggregate([{ $match: { partner: req.user._id, createdAt: { $gte: weekStart } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      DeliveryEarning.aggregate([{ $match: { partner: req.user._id, createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      // No payout/settlement run exists yet (see DeliveryEarning.paid) — this
      // is every earning still awaiting FeastGo's next payout cycle.
      DeliveryEarning.aggregate([{ $match: { partner: req.user._id, paid: false } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    ]);

    res.json({
      orderCount: totalAgg[0]?.count ?? 0,
      totalEarnings: totalAgg[0]?.total ?? 0,
      todayEarnings: todayAgg[0]?.total ?? 0,
      weeklyEarnings: weeklyAgg[0]?.total ?? 0,
      monthlyEarnings: monthlyAgg[0]?.total ?? 0,
      tipsReceived: totalAgg[0]?.tips ?? 0,
      incentives: totalAgg[0]?.bonus ?? 0,
      pendingPayments: pendingAgg[0]?.total ?? 0,
      dailyTarget: req.user.dailyTarget,
    });
  } catch (err) {
    next(err);
  }
}

export async function listMyEarningsHistory(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const [rows, total] = await Promise.all([
      DeliveryEarning.find({ partner: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('order', 'restaurantName total'),
      DeliveryEarning.countDocuments({ partner: req.user._id }),
    ]);

    res.json({ earnings: rows, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardStats(req, res, next) {
  try {
    const partnerId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [statusCounts, todayDeliveries, recentDeliveries] = await Promise.all([
      Order.aggregate([{ $match: { deliveryPartner: partnerId } }, { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } }]),
      Order.countDocuments({ deliveryPartner: partnerId, deliveredAt: { $gte: today } }),
      Order.find({ deliveryPartner: partnerId, deliveryStatus: 'delivered' }).sort({ deliveredAt: -1 }).limit(5),
    ]);

    const countByStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
    const activeStatuses = ['assigned', 'accepted', 'reached_restaurant', 'picked_up', 'out_for_delivery', 'reached_customer'];
    const activeDeliveries = activeStatuses.reduce((sum, s) => sum + (countByStatus[s] ?? 0), 0);

    const completedDeliveries = countByStatus.delivered ?? 0;
    const cancelledOnly = countByStatus.cancelled ?? 0;
    const failedDeliveries = countByStatus.failed ?? 0;
    const finishedDeliveries = completedDeliveries + cancelledOnly + failedDeliveries;
    const successRate = finishedDeliveries > 0 ? Math.round((completedDeliveries / finishedDeliveries) * 1000) / 10 : 0;

    res.json({
      todayDeliveries,
      pendingPickups: (countByStatus.assigned ?? 0) + (countByStatus.accepted ?? 0) + (countByStatus.reached_restaurant ?? 0),
      activeDeliveries,
      completedDeliveries,
      // Kept as the combined cancelled+failed count for backward compatibility
      // with the existing dashboard card — failedDeliveries below breaks it out.
      cancelledDeliveries: cancelledOnly + failedDeliveries,
      failedDeliveries,
      successRate,
      rating: req.user.rating,
      recentDeliveries,
    });
  } catch (err) {
    next(err);
  }
}
