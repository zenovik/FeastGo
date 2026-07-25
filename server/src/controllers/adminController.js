import mongoose from 'mongoose';
import User from '../models/User.js';
import RestaurantOwner from '../models/RestaurantOwner.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import Order, { ORDER_STATUSES } from '../models/Order.js';
import Review from '../models/Review.js';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';
import Banner from '../models/Banner.js';
import DeliveryAssignment from '../models/DeliveryAssignment.js';
import DeliveryIssue from '../models/DeliveryIssue.js';
import { ApiError } from '../utils/ApiError.js';
import { logAdminAction } from '../utils/auditLog.js';
import {
  notifyCustomerOrderStatus,
  notifyDeliveryAssigned,
  notifyDeliveryCancelledToPartner,
  notifyCustomer,
  notifySeller,
  notifySellerAccount,
  notifyDeliveryPartner,
  notifyAdmins,
} from '../utils/notify.js';
import { autoAssignDeliveryPartner } from '../utils/deliveryAssign.js';

// ---- Users ----
export async function listUsers(req, res, next) {
  try {
    const { q, status } = req.query;
    const filter = {};
    if (status === 'blocked') filter.isBlocked = true;
    if (status === 'active') filter.isBlocked = { $ne: true };
    if (q) {
      const regex = new RegExp(String(q).trim(), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json({ users: users.map((u) => u.toSafeObject()) });
  } catch (err) {
    next(err);
  }
}

export async function getUserDetail(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ user: user.toSafeObject(), orders });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    const fields = ['name', 'email', 'gender'];
    for (const field of fields) {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    }
    await user.save();
    await logAdminAction(req, 'user.edit', { targetType: 'User', targetId: user._id });
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function setUserBlocked(req, res, next) {
  try {
    const { isBlocked } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    user.isBlocked = !!isBlocked;
    await user.save();
    await logAdminAction(req, isBlocked ? 'user.block' : 'user.unblock', { targetType: 'User', targetId: user._id });
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    await logAdminAction(req, 'user.delete', { targetType: 'User', targetId: req.params.id, details: user.name });
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}

// ---- Restaurant owners (sellers) ----
export async function listRestaurantOwners(req, res, next) {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const owners = await RestaurantOwner.find(filter).sort({ createdAt: -1 });
    res.json({ owners: owners.map((o) => o.toSafeObject()) });
  } catch (err) {
    next(err);
  }
}

export async function setRestaurantOwnerStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) throw new ApiError(400, 'Invalid status');

    const owner = await RestaurantOwner.findById(req.params.id);
    if (!owner) throw new ApiError(404, 'Restaurant owner not found');

    owner.status = status;
    await owner.save();

    if (owner.restaurant) {
      await Restaurant.findByIdAndUpdate(owner.restaurant, {
        verificationStatus: status,
        isOpen: status === 'approved',
      });
    }

    if (status === 'approved') {
      await notifySellerAccount(owner._id, 'restaurant_approved', 'Account approved', `Your seller account and restaurant "${owner.businessName}" have been approved — you're live on FeastGo!`);
    } else if (status === 'rejected') {
      await notifySellerAccount(owner._id, 'general', 'Application rejected', `Your seller application for "${owner.businessName}" was not approved. Contact support for details.`);
    }

    await logAdminAction(req, `seller.${status}`, { targetType: 'RestaurantOwner', targetId: owner._id, details: owner.businessName });
    res.json({ owner: owner.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function setRestaurantOwnerSuspension(req, res, next) {
  try {
    const { isSuspended } = req.body;
    const owner = await RestaurantOwner.findById(req.params.id);
    if (!owner) throw new ApiError(404, 'Restaurant owner not found');
    owner.isSuspended = !!isSuspended;
    await owner.save();
    if (isSuspended) {
      await notifySellerAccount(owner._id, 'restaurant_suspended', 'Account suspended', `Your seller account "${owner.businessName}" has been suspended by the admin. Contact support for help.`);
    } else {
      await notifySellerAccount(owner._id, 'general', 'Account reactivated', `Your seller account "${owner.businessName}" has been reactivated.`);
    }
    await logAdminAction(req, isSuspended ? 'seller.suspend' : 'seller.activate', {
      targetType: 'RestaurantOwner',
      targetId: owner._id,
      details: owner.businessName,
    });
    res.json({ owner: owner.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function getSellerEarnings(req, res, next) {
  try {
    const owner = await RestaurantOwner.findById(req.params.id);
    if (!owner) throw new ApiError(404, 'Restaurant owner not found');
    if (!owner.restaurant) return res.json({ totalEarnings: 0, orderCount: 0, monthlyEarnings: 0 });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [summary, monthlySummary] = await Promise.all([
      Order.aggregate([
        { $match: { restaurant: owner.restaurant, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { restaurant: owner.restaurant, status: 'delivered', createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    res.json({
      totalEarnings: summary[0]?.total ?? 0,
      orderCount: summary[0]?.count ?? 0,
      monthlyEarnings: monthlySummary[0]?.total ?? 0,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteRestaurantOwner(req, res, next) {
  try {
    const owner = await RestaurantOwner.findById(req.params.id);
    if (!owner) throw new ApiError(404, 'Restaurant owner not found');

    if (owner.restaurant) {
      await MenuItem.deleteMany({ restaurant: owner.restaurant });
      await Coupon.deleteMany({ restaurant: owner.restaurant });
      await Restaurant.findByIdAndDelete(owner.restaurant);
    }
    await RestaurantOwner.findByIdAndDelete(owner._id);

    await logAdminAction(req, 'seller.delete', { targetType: 'RestaurantOwner', targetId: req.params.id, details: owner.businessName });
    res.json({ message: 'Seller deleted' });
  } catch (err) {
    next(err);
  }
}

// ---- Delivery partners ----
export async function listDeliveryPartners(req, res, next) {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const partners = await DeliveryPartner.find(filter).sort({ createdAt: -1 });
    res.json({ partners: partners.map((p) => p.toSafeObject()) });
  } catch (err) {
    next(err);
  }
}

export async function setDeliveryPartnerStatus(req, res, next) {
  try {
    const { status, reason } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) throw new ApiError(400, 'Invalid status');

    const partner = await DeliveryPartner.findById(req.params.id);
    if (!partner) throw new ApiError(404, 'Delivery partner not found');

    partner.status = status;
    partner.rejectionReason = status === 'rejected' ? reason || '' : '';
    await partner.save();
    if (status === 'approved') {
      await notifyDeliveryPartner(partner._id, 'general', 'Account approved', "You're approved as a FeastGo delivery partner — you can now go online and accept deliveries.");
    } else if (status === 'rejected') {
      await notifyDeliveryPartner(partner._id, 'general', 'Application rejected', `Your delivery partner application was not approved.${reason ? ` Reason: ${reason}` : ''}`);
    }
    await logAdminAction(req, `delivery.${status}`, { targetType: 'DeliveryPartner', targetId: partner._id, details: partner.name });
    res.json({ partner: partner.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function setDeliveryPartnerSuspension(req, res, next) {
  try {
    const { isSuspended } = req.body;
    const partner = await DeliveryPartner.findById(req.params.id);
    if (!partner) throw new ApiError(404, 'Delivery partner not found');
    partner.isSuspended = !!isSuspended;
    if (isSuspended) {
      partner.isOnline = false;
      if (partner.currentOrder) {
        const order = await Order.findById(partner.currentOrder);
        if (order && !['delivered', 'cancelled'].includes(order.status)) {
          await DeliveryAssignment.updateMany({ order: order._id, partner: partner._id }, { status: 'cancelled' });
          await notifyDeliveryCancelledToPartner(partner._id, order, 'Partner suspended by admin');
          order.deliveryPartner = null;
          order.deliveryStatus = 'pending';
          order.deliveryStatusHistory.push({ status: 'pending' });
          order.reassignCount += 1;
          await order.save();
          const restaurant = await Restaurant.findById(order.restaurant);
          if (restaurant) await autoAssignDeliveryPartner(order, restaurant);
        }
        partner.currentOrder = null;
      }
    }
    await partner.save();
    if (isSuspended) {
      await notifyDeliveryPartner(partner._id, 'general', 'Account suspended', 'Your delivery partner account has been suspended by the admin. Contact support for help.');
    } else {
      await notifyDeliveryPartner(partner._id, 'general', 'Account reactivated', 'Your delivery partner account has been reactivated.');
    }
    await logAdminAction(req, isSuspended ? 'delivery.suspend' : 'delivery.activate', {
      targetType: 'DeliveryPartner',
      targetId: partner._id,
      details: partner.name,
    });
    res.json({ partner: partner.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function getDeliveryPerformance(req, res, next) {
  try {
    const partner = await DeliveryPartner.findById(req.params.id);
    if (!partner) throw new ApiError(404, 'Delivery partner not found');

    const [summary] = await Order.aggregate([
      { $match: { deliveryPartner: partner._id, status: 'delivered' } },
      { $group: { _id: null, count: { $sum: 1 }, earnings: { $sum: '$deliveryFee' } } },
    ]);
    const cancelledCount = await Order.countDocuments({ deliveryPartner: partner._id, status: 'cancelled' });

    res.json({
      deliveriesCompleted: summary?.count ?? 0,
      totalEarnings: summary?.earnings ?? 0,
      cancelledCount,
    });
  } catch (err) {
    next(err);
  }
}

// Also serves as "reassign" — if the order already has a partner, that
// assignment is cancelled and freed before the new one is created.
export async function assignDeliveryPartner(req, res, next) {
  try {
    const { partnerId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (!['ready_for_pickup', 'out_for_delivery'].includes(order.status)) {
      throw new ApiError(400, 'Order is not ready for delivery assignment yet');
    }
    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner || partner.status !== 'approved' || partner.isSuspended) {
      throw new ApiError(400, 'Delivery partner is not available');
    }
    if (partner.currentOrder && partner.currentOrder.toString() !== order._id.toString()) {
      throw new ApiError(400, 'This partner already has an active delivery');
    }

    const isReassignment = order.deliveryPartner && order.deliveryPartner.toString() !== partner._id.toString();
    if (isReassignment) {
      await DeliveryAssignment.updateMany({ order: order._id, partner: order.deliveryPartner }, { status: 'reassigned' });
      await DeliveryPartner.updateOne({ _id: order.deliveryPartner, currentOrder: order._id }, { currentOrder: null });
      order.reassignCount += 1;
    }

    await DeliveryAssignment.create({ order: order._id, partner: partner._id, assignedByRole: 'admin', assignedByAdmin: req.user._id, status: 'assigned' });

    order.deliveryPartner = partner._id;
    order.deliveryStatus = 'assigned';
    order.deliveryStatusHistory.push({ status: 'assigned' });
    await order.save();

    partner.currentOrder = order._id;
    await partner.save();

    await notifyDeliveryAssigned(order, partner);
    await logAdminAction(req, isReassignment ? 'order.reassign_delivery' : 'order.assign_delivery', {
      targetType: 'Order',
      targetId: order._id,
      details: partner.name,
    });
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

// Active deliveries with the assigned partner's last-known location, for the
// admin "live tracking" view.
export async function listLiveDeliveries(_req, res, next) {
  try {
    const orders = await Order.find({
      deliveryPartner: { $ne: null },
      deliveryStatus: { $in: ['assigned', 'accepted', 'reached_restaurant', 'picked_up', 'out_for_delivery', 'reached_customer'] },
    })
      .populate('deliveryPartner', 'name phone vehicleType vehicleNumber location lastLocationAt')
      .sort({ updatedAt: -1 });

    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

// ---- Delivery disputes ----
export async function listDeliveryIssues(req, res, next) {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const issues = await DeliveryIssue.find(filter)
      .populate('order', 'restaurantName total status deliveryStatus')
      .populate('restaurant', 'name')
      .populate('reportedBy', 'name businessName')
      .populate('partner', 'name phone')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ issues });
  } catch (err) {
    next(err);
  }
}

export async function resolveDeliveryIssue(req, res, next) {
  try {
    const resolution = String(req.body.resolution ?? '').trim();
    if (!resolution) throw new ApiError(400, 'Enter a resolution note');

    const issue = await DeliveryIssue.findById(req.params.id);
    if (!issue) throw new ApiError(404, 'Issue not found');
    if (issue.status === 'resolved') throw new ApiError(400, 'This issue is already resolved');

    issue.status = 'resolved';
    issue.resolution = resolution;
    issue.resolvedBy = req.user._id;
    issue.resolvedAt = new Date();
    await issue.save();

    await notifySellerAccount(issue.reportedBy, 'general', 'Delivery issue resolved', resolution);
    await logAdminAction(req, 'delivery.resolve_issue', { targetType: 'DeliveryIssue', targetId: issue._id, details: resolution });

    res.json({ issue });
  } catch (err) {
    next(err);
  }
}

// ---- Restaurants ----
export async function listRestaurantsAdmin(req, res, next) {
  try {
    const { status, q } = req.query;
    const filter = {};
    if (status) filter.verificationStatus = status;
    if (q) filter.name = new RegExp(String(q).trim(), 'i');
    const restaurants = await Restaurant.find(filter).sort({ createdAt: -1 });
    res.json({ restaurants });
  } catch (err) {
    next(err);
  }
}

export async function setRestaurantStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) throw new ApiError(400, 'Invalid status');

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');

    restaurant.verificationStatus = status;
    if (status === 'approved') restaurant.isOpen = true;
    if (status === 'rejected') restaurant.isOpen = false;
    await restaurant.save();

    if (status === 'approved') {
      await notifySellerAccount(restaurant.owner, 'restaurant_approved', 'Restaurant approved', `"${restaurant.name}" has been approved and is now live on FeastGo!`);
    } else if (status === 'rejected') {
      await notifySellerAccount(restaurant.owner, 'general', 'Restaurant rejected', `"${restaurant.name}" was not approved. Contact support for details.`);
    }

    await logAdminAction(req, `restaurant.${status}`, { targetType: 'Restaurant', targetId: restaurant._id, details: restaurant.name });
    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
}

export async function setRestaurantSuspension(req, res, next) {
  try {
    const { isSuspended } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    restaurant.isSuspended = !!isSuspended;
    if (isSuspended) restaurant.isOpen = false;
    await restaurant.save();
    if (isSuspended) {
      await notifySellerAccount(restaurant.owner, 'restaurant_suspended', 'Restaurant suspended', `"${restaurant.name}" has been suspended by the admin. Contact support for help.`);
    } else {
      await notifySellerAccount(restaurant.owner, 'general', 'Restaurant reactivated', `"${restaurant.name}" has been reactivated.`);
    }
    await logAdminAction(req, isSuspended ? 'restaurant.suspend' : 'restaurant.activate', {
      targetType: 'Restaurant',
      targetId: restaurant._id,
      details: restaurant.name,
    });
    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
}

const RESTAURANT_ADMIN_FIELDS = [
  'name',
  'description',
  'cuisines',
  'coverImage',
  'images',
  'address',
  'priceRange',
  'deliveryFee',
  'minOrder',
  'offer',
  'isOpen',
  'isFeatured',
  'isPromoted',
];

export async function updateRestaurantAdmin(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    for (const field of RESTAURANT_ADMIN_FIELDS) {
      if (req.body[field] !== undefined) restaurant[field] = req.body[field];
    }
    await restaurant.save();
    await logAdminAction(req, 'restaurant.edit', { targetType: 'Restaurant', targetId: restaurant._id, details: restaurant.name });
    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
}

export async function getRestaurantPerformance(req, res, next) {
  try {
    const restaurantId = new mongoose.Types.ObjectId(req.params.id);
    const [summary, statusCounts, topItems] = await Promise.all([
      Order.aggregate([
        { $match: { restaurant: restaurantId, status: 'delivered' } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([{ $match: { restaurant: restaurantId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { restaurant: restaurantId, status: { $nin: ['cancelled', 'rejected'] } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', qty: { $sum: '$items.qty' } } },
        { $sort: { qty: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      totalRevenue: summary[0]?.revenue ?? 0,
      deliveredOrders: summary[0]?.count ?? 0,
      ordersByStatus: statusCounts.map((s) => ({ status: s._id, count: s.count })),
      topItems: topItems.map((i) => ({ name: i._id, qty: i.qty })),
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteRestaurantAdmin(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');

    await MenuItem.deleteMany({ restaurant: restaurant._id });
    await Coupon.deleteMany({ restaurant: restaurant._id });
    if (restaurant.owner) await RestaurantOwner.updateOne({ _id: restaurant.owner }, { $set: { restaurant: null } });
    await Restaurant.findByIdAndDelete(restaurant._id);

    await logAdminAction(req, 'restaurant.delete', { targetType: 'Restaurant', targetId: req.params.id, details: restaurant.name });
    res.json({ message: 'Restaurant deleted' });
  } catch (err) {
    next(err);
  }
}

// ---- Foods ----
export async function listFoodsAdmin(req, res, next) {
  try {
    const { q } = req.query;
    const filter = {};
    if (q) filter.name = new RegExp(String(q).trim(), 'i');
    const items = await MenuItem.find(filter).sort({ createdAt: -1 }).limit(500).populate('restaurant', 'name slug');
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

const FOOD_ADMIN_FIELDS = ['name', 'description', 'price', 'image', 'category', 'isVeg', 'isBestseller', 'isFeatured', 'isRecommended', 'isAvailable'];

export async function updateFoodAdmin(req, res, next) {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) throw new ApiError(404, 'Menu item not found');
    if (req.body.price !== undefined) {
      const n = Number(req.body.price);
      if (!Number.isFinite(n) || n <= 0) throw new ApiError(400, 'Price must be a positive number');
    }
    for (const field of FOOD_ADMIN_FIELDS) {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    }
    await item.save();
    await logAdminAction(req, 'food.edit', { targetType: 'MenuItem', targetId: item._id, details: item.name });
    res.json({ item });
  } catch (err) {
    next(err);
  }
}

export async function setFoodHidden(req, res, next) {
  try {
    const { isHiddenByAdmin } = req.body;
    const item = await MenuItem.findById(req.params.id);
    if (!item) throw new ApiError(404, 'Menu item not found');
    item.isHiddenByAdmin = !!isHiddenByAdmin;
    await item.save();
    await logAdminAction(req, isHiddenByAdmin ? 'food.hide' : 'food.show', { targetType: 'MenuItem', targetId: item._id, details: item.name });
    res.json({ item });
  } catch (err) {
    next(err);
  }
}

export async function deleteFoodAdmin(req, res, next) {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) throw new ApiError(404, 'Menu item not found');
    await logAdminAction(req, 'food.delete', { targetType: 'MenuItem', targetId: req.params.id, details: item.name });
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    next(err);
  }
}

export async function listTrendingFoods(_req, res, next) {
  try {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const trending = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $nin: ['cancelled', 'rejected'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', qty: { $sum: '$items.qty' } } },
      { $sort: { qty: -1 } },
      { $limit: 10 },
    ]);
    res.json({ items: trending.map((i) => ({ name: i._id, qty: i.qty })) });
  } catch (err) {
    next(err);
  }
}

// ---- Orders ----
export async function listOrdersAdmin(req, res, next) {
  try {
    const { status, q, dateFrom, dateTo, paymentMethod } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    if (q) {
      const trimmed = String(q).trim();
      const orConditions = [{ restaurantName: new RegExp(trimmed, 'i') }];
      if (/^[a-f0-9]{1,24}$/i.test(trimmed)) {
        orConditions.push({ $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: trimmed, options: 'i' } } });
      }
      filter.$or = orConditions;
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(500).populate('user', 'name phone');
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatusAdmin(req, res, next) {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) throw new ApiError(400, 'Invalid status');
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    order.status = status;
    order.statusHistory.push({ status });
    await order.save();
    await notifyCustomerOrderStatus(order, status);
    await logAdminAction(req, 'order.status_override', { targetType: 'Order', targetId: order._id, details: status });
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function cancelOrderAdmin(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (['delivered', 'cancelled'].includes(order.status)) throw new ApiError(400, `Order already ${order.status}`);
    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled' });
    await order.save();
    await notifyCustomerOrderStatus(order, 'cancelled');
    await logAdminAction(req, 'order.cancel', { targetType: 'Order', targetId: order._id });
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

// ---- Refunds ----
export async function listRefundRequests(req, res, next) {
  try {
    const filter = req.query.status ? { refundStatus: req.query.status } : { refundStatus: { $ne: 'none' } };
    const orders = await Order.find(filter).sort({ updatedAt: -1 }).limit(200).populate('user', 'name phone');
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

export async function updateRefundStatus(req, res, next) {
  try {
    const { refundStatus, refundAmount, refundReason } = req.body;
    if (!['none', 'requested', 'approved', 'rejected', 'refunded'].includes(refundStatus)) {
      throw new ApiError(400, 'Invalid refund status');
    }
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    order.refundStatus = refundStatus;
    if (refundAmount !== undefined) order.refundAmount = refundAmount;
    if (refundReason !== undefined) order.refundReason = refundReason;
    await order.save();
    if (refundStatus === 'refunded') {
      await notifyCustomer(order, 'refund_processed', 'Refund processed', `₹${order.refundAmount ?? order.total} has been refunded for order #${order._id.toString().slice(-6)}`);
    }
    await logAdminAction(req, 'order.refund', { targetType: 'Order', targetId: order._id, details: refundStatus });
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

// ---- Reviews ----
export async function listReviewsAdmin(req, res, next) {
  try {
    const filter = {};
    if (req.query.reported === 'true') filter.reportCount = { $gt: 0 };
    if (req.query.hidden === 'true') filter.isHidden = true;
    const reviews = await Review.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
}

export async function setReviewHidden(req, res, next) {
  try {
    const { isHidden } = req.body;
    const review = await Review.findByIdAndUpdate(req.params.id, { isHidden: !!isHidden }, { new: true });
    if (!review) throw new ApiError(404, 'Review not found');
    await logAdminAction(req, isHidden ? 'review.hide' : 'review.show', { targetType: 'Review', targetId: review._id });
    res.json({ review });
  } catch (err) {
    next(err);
  }
}

export async function deleteReviewAdmin(req, res, next) {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) throw new ApiError(404, 'Review not found');
    await logAdminAction(req, 'review.delete', { targetType: 'Review', targetId: req.params.id });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
}

// ---- Categories ----
export async function listCategories(_req, res, next) {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, image } = req.body;
    if (!name) throw new ApiError(400, 'Category name is required');
    if (!image) throw new ApiError(400, 'Category image is required');
    const slug = String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const count = await Category.countDocuments();
    const category = await Category.create({ name, slug, image, sortOrder: count });
    await logAdminAction(req, 'category.create', { targetType: 'Category', targetId: category._id, details: name });
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) throw new ApiError(404, 'Category not found');
    const { name, image, isActive } = req.body;
    if (name !== undefined) category.name = name;
    if (image !== undefined) category.image = image;
    if (isActive !== undefined) category.isActive = isActive;
    await category.save();
    res.json({ category });
  } catch (err) {
    next(err);
  }
}

export async function reorderCategories(req, res, next) {
  try {
    const { categoryIds } = req.body;
    if (!Array.isArray(categoryIds)) throw new ApiError(400, 'categoryIds must be an array');
    await Promise.all(categoryIds.map((id, index) => Category.updateOne({ _id: id }, { $set: { sortOrder: index } })));
    res.json({ message: 'Categories reordered' });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    await logAdminAction(req, 'category.delete', { targetType: 'Category', targetId: req.params.id, details: category?.name });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
}

// ---- Coupons ----
export async function listCouponsAdmin(_req, res, next) {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ coupons });
  } catch (err) {
    next(err);
  }
}

const COUPON_ADMIN_FIELDS = [
  'offerType',
  'discountType',
  'value',
  'minOrder',
  'maxDiscount',
  'usageLimit',
  'startsAt',
  'expiresAt',
  'isActive',
  'buyQty',
  'getQty',
  'comboItems',
  'comboPrice',
];

export async function createCoupon(req, res, next) {
  try {
    const { code, discountType, value } = req.body;
    if (!code || !discountType || value == null) throw new ApiError(400, 'Code, discount type and value are required');
    const payload = { code: String(code).toUpperCase().trim(), discountType, value };
    for (const field of COUPON_ADMIN_FIELDS) {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    }
    const coupon = await Coupon.create(payload);
    await logAdminAction(req, 'coupon.create', { targetType: 'Coupon', targetId: coupon._id, details: coupon.code });
    res.status(201).json({ coupon });
  } catch (err) {
    next(err);
  }
}

export async function updateCoupon(req, res, next) {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    for (const field of COUPON_ADMIN_FIELDS) {
      if (req.body[field] !== undefined) coupon[field] = req.body[field];
    }
    await coupon.save();
    res.json({ coupon });
  } catch (err) {
    next(err);
  }
}

export async function deleteCoupon(req, res, next) {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    next(err);
  }
}

// ---- Banners ----
export async function listBannersAdmin(_req, res, next) {
  try {
    const banners = await Banner.find().sort({ sortOrder: 1 });
    res.json({ banners });
  } catch (err) {
    next(err);
  }
}

export async function createBanner(req, res, next) {
  try {
    const { title, image, link, placement, sortOrder, startsAt, expiresAt } = req.body;
    if (!title || !image) throw new ApiError(400, 'Title and image are required');
    const banner = await Banner.create({
      title,
      image,
      link: link || '',
      placement: placement || 'homepage',
      sortOrder: sortOrder || 0,
      startsAt: startsAt || null,
      expiresAt: expiresAt || null,
    });
    await logAdminAction(req, 'banner.create', { targetType: 'Banner', targetId: banner._id, details: title });
    res.status(201).json({ banner });
  } catch (err) {
    next(err);
  }
}

export async function updateBanner(req, res, next) {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) throw new ApiError(404, 'Banner not found');
    const fields = ['title', 'image', 'link', 'placement', 'sortOrder', 'isActive', 'startsAt', 'expiresAt'];
    for (const field of fields) {
      if (req.body[field] !== undefined) banner[field] = req.body[field];
    }
    await banner.save();
    res.json({ banner });
  } catch (err) {
    next(err);
  }
}

export async function deleteBanner(req, res, next) {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Banner deleted' });
  } catch (err) {
    next(err);
  }
}

// ---- Reports / analytics (simple aggregates) ----
export async function getReports(_req, res, next) {
  try {
    const [totalOrders, totalRevenueAgg, totalUsers, totalRestaurants, totalDeliveryPartners, ordersByStatus] =
      await Promise.all([
        Order.countDocuments(),
        Order.aggregate([{ $match: { status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
        User.countDocuments(),
        Restaurant.countDocuments(),
        DeliveryPartner.countDocuments(),
        Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ]);

    res.json({
      totalOrders,
      totalRevenue: totalRevenueAgg[0]?.total ?? 0,
      totalUsers,
      totalRestaurants,
      totalDeliveryPartners,
      ordersByStatus: ordersByStatus.map((s) => ({ status: s._id, count: s.count })),
    });
  } catch (err) {
    next(err);
  }
}
