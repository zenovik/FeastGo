import Order, { ORDER_STATUSES } from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import DeliveryAssignment from '../models/DeliveryAssignment.js';
import DeliveryRating from '../models/DeliveryRating.js';
import DeliveryEarning from '../models/DeliveryEarning.js';
import SystemSettings from '../models/SystemSettings.js';
import { ApiError } from '../utils/ApiError.js';
import { notifySeller, notifyCustomer, notifyOrderCancellation, notifyDeliveryPartner } from '../utils/notify.js';
import { resolveCoupon } from '../utils/coupon.js';

// Customer can only cancel before the kitchen starts working the order:
// while it's freshly placed, or briefly after the restaurant accepts it
// (see CUSTOMER_CANCEL_GRACE below for the acceptance window).
const CUSTOMER_CANCELLABLE_STATUSES = ['placed', 'confirmed'];
const CANNOT_CANCEL_MESSAGE = 'This order can no longer be cancelled because the restaurant has already started preparing your food.';

const TAX_RATE = 0.05;

export async function createOrder(req, res, next) {
  try {
    const { restaurantSlug, items, address, paymentMethod, couponCode } = req.body;
    if (!restaurantSlug || !items?.length || !address) {
      throw new ApiError(400, 'restaurantSlug, items and address are required');
    }

    const restaurant = await Restaurant.findOne({ slug: restaurantSlug });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    if (restaurant.verificationStatus !== 'approved' || restaurant.isSuspended) {
      throw new ApiError(400, 'This restaurant is not currently accepting orders');
    }
    if (!restaurant.isOpen) throw new ApiError(400, 'This restaurant is currently closed');

    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds }, restaurant: restaurant._id });
    const menuItemMap = new Map(menuItems.map((m) => [m._id.toString(), m]));

    let subtotal = 0;
    const orderItems = items.map(({ menuItemId, qty }) => {
      const menuItem = menuItemMap.get(menuItemId);
      if (!menuItem) throw new ApiError(400, `Menu item ${menuItemId} not found`);
      if (!menuItem.isAvailable || menuItem.isHiddenByAdmin) throw new ApiError(400, `${menuItem.name} is currently unavailable`);
      const quantity = Math.max(1, Number(qty) || 1);
      if (menuItem.stockCount != null && quantity > menuItem.stockCount) {
        throw new ApiError(400, `Only ${menuItem.stockCount} of ${menuItem.name} left in stock`);
      }
      subtotal += menuItem.price * quantity;
      return { menuItem: menuItem._id, name: menuItem.name, price: menuItem.price, qty: quantity, isVeg: menuItem.isVeg };
    });

    const deliveryFee = restaurant.deliveryFee;
    const taxes = Math.round(subtotal * TAX_RATE);

    let discount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const result = await resolveCoupon(restaurant._id, couponCode, subtotal);
      appliedCoupon = result.coupon;
      discount = result.discount;
    }

    const total = Math.round(subtotal + deliveryFee + taxes - discount);

    const order = await Order.create({
      user: req.user._id,
      restaurant: restaurant._id,
      restaurantName: restaurant.name,
      items: orderItems,
      subtotal,
      deliveryFee,
      taxes,
      discount,
      couponCode: appliedCoupon?.code ?? null,
      total,
      status: 'placed',
      statusHistory: [{ status: 'placed', at: new Date() }],
      address,
      paymentMethod,
      etaMinutes: restaurant.deliveryTimeMax,
    });

    if (appliedCoupon) {
      appliedCoupon.timesUsed += 1;
      await appliedCoupon.save();
      await notifyCustomer(order, 'coupon_applied', 'Coupon applied', `${appliedCoupon.code} saved you ₹${discount} on this order`);
    }

    // Decrement stock for items that track it, and flag anything that just crossed
    // its low-stock threshold so the seller gets a heads-up.
    const lowStockItems = [];
    for (const { menuItem, qty } of orderItems) {
      const item = menuItemMap.get(menuItem.toString());
      if (item.stockCount == null) continue;
      item.stockCount = Math.max(0, item.stockCount - qty);
      await item.save();
      if (item.stockCount <= item.lowStockThreshold) lowStockItems.push(item);
    }

    await notifySeller(
      restaurant,
      'new_order',
      'New order received',
      `Order #${order._id.toString().slice(-6)} — ${orderItems.length} item${orderItems.length === 1 ? '' : 's'}, ${total}`,
      order._id
    );
    await notifySeller(
      restaurant,
      'payment',
      'Payment received',
      `₹${total} via ${paymentMethod || 'cod'} for order #${order._id.toString().slice(-6)}`,
      order._id
    );
    for (const item of lowStockItems) {
      await notifySeller(restaurant, 'low_stock', 'Low stock alert', `${item.name} is down to ${item.stockCount} left`);
    }

    await notifyCustomer(
      order,
      'general',
      'Order placed',
      `Your order #${order._id.toString().slice(-6)} at ${restaurant.name} has been placed — ${paymentMethod === 'cod' ? 'pay on delivery' : 'payment received'}`
    );

    // Payment is simulated inline with order creation (there's no separate
    // gateway step, so it always "succeeds" once we get this far) — online
    // methods get their own payment + cashback notifications on top of the
    // "Order placed" one above; COD has nothing to pay yet.
    if (paymentMethod && paymentMethod !== 'cod') {
      await notifyCustomer(order, 'payment', 'Payment successful', `₹${total} paid via ${paymentMethod.toUpperCase()} for order #${order._id.toString().slice(-6)}`);
      const cashback = Math.floor(total * 0.02);
      if (cashback > 0) {
        await notifyCustomer(order, 'cashback_received', 'Cashback received', `You earned ₹${cashback} cashback on order #${order._id.toString().slice(-6)}`);
      }
    }

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
}

export async function listMyOrders(req, res, next) {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).populate(
      'deliveryPartner',
      'name phone photo vehicleType vehicleNumber location rating'
    );
    if (!order) throw new ApiError(404, 'Order not found');
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function getCancellationPolicy(_req, res, next) {
  try {
    const settings = await SystemSettings.getOrCreate();
    res.json({ graceMinutes: settings.cancellationGraceMinutes });
  } catch (err) {
    next(err);
  }
}

export async function cancelOrder(req, res, next) {
  try {
    const reason = String(req.body.reason ?? '').trim();
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status === 'cancelled') throw new ApiError(400, 'This order has already been cancelled');
    if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
      throw new ApiError(400, CANNOT_CANCEL_MESSAGE);
    }
    if (order.status === 'confirmed') {
      const settings = await SystemSettings.getOrCreate();
      const confirmedAt = order.statusHistory.find((h) => h.status === 'confirmed')?.at;
      const graceMs = settings.cancellationGraceMinutes * 60 * 1000;
      if (confirmedAt && Date.now() - new Date(confirmedAt).getTime() > graceMs) {
        throw new ApiError(400, CANNOT_CANCEL_MESSAGE);
      }
    }
    if (!reason) throw new ApiError(400, 'A cancellation reason is required');

    const previousStatus = order.status;
    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', at: new Date() });
    order.cancelledBy = req.user._id;
    order.cancelledByRole = 'customer';
    order.cancellationReason = reason;
    order.cancelledAt = new Date();
    order.cancelledFromStatus = previousStatus;
    if (order.paymentMethod !== 'cod') {
      order.refundStatus = 'requested';
      order.refundAmount = order.total;
    }

    // Free up the assigned partner (if any) — the order never reached pickup.
    let freedPartnerId = null;
    if (order.deliveryPartner) {
      freedPartnerId = order.deliveryPartner;
      await DeliveryAssignment.updateMany({ order: order._id, partner: order.deliveryPartner }, { status: 'cancelled' });
      await DeliveryPartner.updateOne({ _id: order.deliveryPartner, currentOrder: order._id }, { currentOrder: null });
      order.deliveryPartner = null;
      order.deliveryStatus = 'cancelled';
      order.deliveryStatusHistory.push({ status: 'cancelled' });
    }
    await order.save();

    await notifyOrderCancellation(order, { cancelledByRole: 'customer', reason, deliveryPartnerId: freedPartnerId });

    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function rateDelivery(req, res, next) {
  try {
    const { rating, comment, tip } = req.body;
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status !== 'delivered') throw new ApiError(400, 'You can only rate delivery after the order is delivered');
    if (!order.deliveryPartner) throw new ApiError(400, 'This order had no delivery partner');

    const existing = await DeliveryRating.findOne({ order: order._id });
    if (existing) throw new ApiError(409, 'You have already rated this delivery');

    const ratingValue = Number(rating);
    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) throw new ApiError(400, 'Rating must be between 1 and 5');

    await DeliveryRating.create({ order: order._id, partner: order.deliveryPartner, user: req.user._id, rating: ratingValue, comment: comment || '' });

    const partner = await DeliveryPartner.findById(order.deliveryPartner);
    if (partner) {
      const newCount = partner.rating.count + 1;
      const newAverage = (partner.rating.average * partner.rating.count + ratingValue) / newCount;
      partner.rating = { average: Math.round(newAverage * 10) / 10, count: newCount };
      await partner.save();
      await notifyDeliveryPartner(partner._id, 'rating_received', 'New rating received', `You received a ${ratingValue}-star rating for order #${order._id.toString().slice(-6)}`, order._id);
    }

    const tipAmount = Number(tip) || 0;
    if (tipAmount > 0) {
      order.tip = tipAmount;
      await order.save();
      await DeliveryEarning.updateOne(
        { order: order._id },
        { $inc: { tip: tipAmount, total: tipAmount } }
      );
    }

    res.json({ message: 'Thanks for your feedback!' });
  } catch (err) {
    next(err);
  }
}

export const ALL_STATUSES = ORDER_STATUSES;
