import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';
import Order, { ORDER_STATUSES } from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import Review from '../models/Review.js';
import DeliveryIssue from '../models/DeliveryIssue.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import DeliveryAssignment from '../models/DeliveryAssignment.js';
import { ApiError } from '../utils/ApiError.js';
import { notifyCustomerOrderStatus, notifySellerAccount, notifyAdmins, notifyOrderCancellation } from '../utils/notify.js';
import { autoAssignDeliveryPartner } from '../utils/deliveryAssign.js';

// Seller may cancel any time before the order has been picked up by a
// delivery partner — after that the order belongs to the delivery/customer
// side of the flow and only admin can step in.
const SELLER_CANCELLABLE_STATUSES = ['placed', 'confirmed', 'preparing', 'ready_for_pickup'];

function requireOwnRestaurant(req) {
  if (!req.user.restaurant) throw new ApiError(400, 'Register a restaurant first');
  return req.user.restaurant;
}

// Flattens a `.populate('user', 'name')` lookup into a plain `customerName`
// string alongside the original `user` id, so the response shape stays the
// same as everywhere else `Order` is serialized.
function withCustomerName(order) {
  const customerName = order.user?.name ?? 'Customer';
  return { ...order, user: order.user?._id ?? order.user, customerName };
}

export async function getMyRestaurant(req, res, next) {
  try {
    if (!req.user.restaurant) return res.json({ restaurant: null });
    const restaurant = await Restaurant.findById(req.user.restaurant);
    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
}

const RESTAURANT_FIELDS = [
  'name',
  'description',
  'cuisines',
  'category',
  'coverImage',
  'logoImage',
  'images',
  'address',
  'priceRange',
  'deliveryFee',
  'minOrder',
  'offer',
  'isOpen',
  'businessHours',
  'holidays',
  'deliveryRadiusKm',
  'openingTime',
  'closingTime',
  'socialLinks',
  'gstNumber',
  'fssaiNumber',
  'bankDetails',
  'notificationPrefs',
];

export async function updateMyRestaurant(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');

    for (const field of RESTAURANT_FIELDS) {
      if (req.body[field] !== undefined) restaurant[field] = req.body[field];
    }
    await restaurant.save();
    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
}

export async function updateCategoryOrder(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const { categoryOrder } = req.body;
    if (!Array.isArray(categoryOrder)) throw new ApiError(400, 'categoryOrder must be an array');

    const restaurant = await Restaurant.findByIdAndUpdate(restaurantId, { categoryOrder }, { new: true });
    res.json({ categoryOrder: restaurant.categoryOrder });
  } catch (err) {
    next(err);
  }
}

// ---- Menu management ----
export async function listMyMenu(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const items = await MenuItem.find({ restaurant: restaurantId }).sort({ category: 1, sortOrder: 1, name: 1 });
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

const MENU_ITEM_CREATE_FIELDS = [
  'description',
  'image',
  'images',
  'isVeg',
  'spiceLevel',
  'isFeatured',
  'isRecommended',
  'stockCount',
  'lowStockThreshold',
  'scheduledAvailability',
];

const MENU_ITEM_UPDATE_FIELDS = [
  'name',
  'description',
  'price',
  'image',
  'images',
  'category',
  'isVeg',
  'isBestseller',
  'isFeatured',
  'isRecommended',
  'isAvailable',
  'spiceLevel',
  'stockCount',
  'lowStockThreshold',
  'sortOrder',
  'scheduledAvailability',
];

function assertValidPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) throw new ApiError(400, 'Price must be a positive number');
  if (n > 100000) throw new ApiError(400, 'Price is unrealistically high');
}

async function assertUniqueName(restaurantId, name, excludeId) {
  const filter = { restaurant: restaurantId, name: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await MenuItem.findOne(filter);
  if (existing) throw new ApiError(409, 'You already have a menu item with this name');
}

export async function createMenuItem(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const { name, price, category } = req.body;
    if (!name || price == null || !category) throw new ApiError(400, 'Name, price and category are required');
    assertValidPrice(price);
    await assertUniqueName(restaurantId, name);

    const payload = { restaurant: restaurantId, name, price, category, isVeg: req.body.isVeg !== false };
    for (const field of MENU_ITEM_CREATE_FIELDS) {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    }

    const item = await MenuItem.create(payload);
    await notifySellerAccount(req.user._id, 'menu_added', 'Menu item added', `"${item.name}" was added to your menu`);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
}

export async function updateMenuItem(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const item = await MenuItem.findOne({ _id: req.params.id, restaurant: restaurantId });
    if (!item) throw new ApiError(404, 'Menu item not found');
    if (req.body.price !== undefined) assertValidPrice(req.body.price);
    if (req.body.name !== undefined && req.body.name.trim() !== item.name) {
      await assertUniqueName(restaurantId, req.body.name, item._id);
    }

    for (const field of MENU_ITEM_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    }
    await item.save();
    await notifySellerAccount(req.user._id, 'menu_updated', 'Menu item updated', `"${item.name}" was updated`);
    res.json({ item });
  } catch (err) {
    next(err);
  }
}

export async function deleteMenuItem(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const item = await MenuItem.findOneAndDelete({ _id: req.params.id, restaurant: restaurantId });
    if (!item) throw new ApiError(404, 'Menu item not found');
    await notifySellerAccount(req.user._id, 'menu_deleted', 'Menu item deleted', `"${item.name}" was removed from your menu`);
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    next(err);
  }
}

export async function duplicateMenuItem(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const source = await MenuItem.findOne({ _id: req.params.id, restaurant: restaurantId }).lean();
    if (!source) throw new ApiError(404, 'Menu item not found');

    delete source._id;
    delete source.createdAt;
    delete source.updatedAt;

    // Keep duplicating the same item collision-free: "X (Copy)", "X (Copy 2)", "X (Copy 3)"...
    let name = `${source.name} (Copy)`;
    let suffix = 2;
    while (await MenuItem.findOne({ restaurant: restaurantId, name })) {
      name = `${source.name} (Copy ${suffix})`;
      suffix += 1;
    }

    const copy = await MenuItem.create({ ...source, name });
    res.status(201).json({ item: copy });
  } catch (err) {
    next(err);
  }
}

export async function reorderMenuItems(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const { items } = req.body; // [{ id, sortOrder }]
    if (!Array.isArray(items)) throw new ApiError(400, 'items must be an array of { id, sortOrder }');

    await Promise.all(
      items.map(({ id, sortOrder }) =>
        MenuItem.updateOne({ _id: id, restaurant: restaurantId }, { $set: { sortOrder } })
      )
    );
    res.json({ message: 'Order updated' });
  } catch (err) {
    next(err);
  }
}

// ---- Orders ----
const SELLER_ALLOWED_TRANSITIONS = {
  placed: ['confirmed', 'rejected'],
  confirmed: ['preparing'],
  preparing: ['ready_for_pickup'],
};

export async function listMyOrders(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const { status, paymentMethod, dateFrom, dateTo, q } = req.query;

    const filter = { restaurant: restaurantId };
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    if (q) {
      const trimmed = String(q).trim();
      const regex = new RegExp(trimmed, 'i');
      const orConditions = [{ 'address.line1': regex }, { 'address.area': regex }, { 'address.city': regex }];
      // Order IDs are shown to users as the last 6 hex chars (e.g. "#63ec2b") — match on that.
      if (/^[a-f0-9]{1,24}$/i.test(trimmed)) {
        orConditions.push({ $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: trimmed, options: 'i' } } });
      }
      filter.$or = orConditions;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(500).populate('user', 'name').lean();
    res.json({ orders: orders.map(withCustomerName) });
  } catch (err) {
    next(err);
  }
}

export async function getOrderDetail(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const order = await Order.findOne({ _id: req.params.id, restaurant: restaurantId })
      .populate('user', 'name phone email')
      .populate('deliveryPartner', 'name phone vehicleType vehicleNumber');
    if (!order) throw new ApiError(404, 'Order not found');
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) throw new ApiError(400, 'Invalid status');

    const order = await Order.findOne({ _id: req.params.id, restaurant: restaurantId });
    if (!order) throw new ApiError(404, 'Order not found');

    const allowed = SELLER_ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      throw new ApiError(400, `Cannot move order from "${order.status}" to "${status}"`);
    }

    order.status = status;
    order.statusHistory.push({ status });
    await order.save();
    await notifyCustomerOrderStatus(order, status);
    if (status === 'ready_for_pickup') {
      const restaurant = await Restaurant.findById(restaurantId);
      if (restaurant) await autoAssignDeliveryPartner(order, restaurant);
    }
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function bulkUpdateOrderStatus(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const { orderIds, status } = req.body;
    if (!Array.isArray(orderIds) || !orderIds.length) throw new ApiError(400, 'orderIds is required');
    if (!ORDER_STATUSES.includes(status)) throw new ApiError(400, 'Invalid status');

    const orders = await Order.find({ _id: { $in: orderIds }, restaurant: restaurantId });
    const restaurant = status === 'ready_for_pickup' ? await Restaurant.findById(restaurantId) : null;
    const updated = [];
    const skipped = [];
    for (const order of orders) {
      const allowed = SELLER_ALLOWED_TRANSITIONS[order.status] || [];
      if (!allowed.includes(status)) {
        skipped.push(order._id);
        continue;
      }
      order.status = status;
      order.statusHistory.push({ status });
      await order.save();
      await notifyCustomerOrderStatus(order, status);
      if (status === 'ready_for_pickup' && restaurant) await autoAssignDeliveryPartner(order, restaurant);
      updated.push(order._id);
    }
    res.json({ updated, skipped });
  } catch (err) {
    next(err);
  }
}

export async function cancelOrderSeller(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const reason = String(req.body.reason ?? '').trim();
    if (!reason) throw new ApiError(400, 'A cancellation reason is required');

    const order = await Order.findOne({ _id: req.params.id, restaurant: restaurantId });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status === 'cancelled') throw new ApiError(400, 'This order has already been cancelled');
    if (!SELLER_CANCELLABLE_STATUSES.includes(order.status)) {
      throw new ApiError(
        400,
        ['out_for_delivery', 'delivered'].includes(order.status)
          ? 'This order has already been picked up and can no longer be cancelled'
          : `Order already ${order.status}`
      );
    }

    const previousStatus = order.status;
    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', at: new Date() });
    order.cancelledBy = req.user._id;
    order.cancelledByRole = 'seller';
    order.cancellationReason = reason;
    order.cancelledAt = new Date();
    order.cancelledFromStatus = previousStatus;
    if (order.paymentMethod !== 'cod') {
      order.refundStatus = 'requested';
      order.refundAmount = order.total;
    }

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

    await notifyOrderCancellation(order, { cancelledByRole: 'seller', reason, deliveryPartnerId: freedPartnerId });
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderNotes(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const { notes } = req.body;
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurant: restaurantId },
      { sellerNotes: notes ?? '' },
      { new: true }
    );
    if (!order) throw new ApiError(404, 'Order not found');
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function reportDeliveryIssue(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const reason = String(req.body.reason ?? '').trim();
    if (!reason) throw new ApiError(400, 'Describe the issue');

    const order = await Order.findOne({ _id: req.params.id, restaurant: restaurantId });
    if (!order) throw new ApiError(404, 'Order not found');

    const issue = await DeliveryIssue.create({
      order: order._id,
      restaurant: restaurantId,
      reportedBy: req.user._id,
      partner: order.deliveryPartner,
      reason,
    });

    await notifyAdmins(
      'user_report',
      'Delivery issue reported',
      `${req.user.businessName} reported an issue with order #${order._id.toString().slice(-6)}: ${reason}`,
      order._id
    );

    res.status(201).json({ issue });
  } catch (err) {
    next(err);
  }
}

// ---- Coupons scoped to this restaurant ----
export async function listMyCoupons(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const coupons = await Coupon.find({ restaurant: restaurantId }).sort({ createdAt: -1 });
    res.json({ coupons });
  } catch (err) {
    next(err);
  }
}

const COUPON_FIELDS = [
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
  'applicableItems',
];

export async function createMyCoupon(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const { code, discountType, value } = req.body;
    if (!code || !discountType || value == null) throw new ApiError(400, 'Code, discount type and value are required');

    const payload = { code: String(code).toUpperCase().trim(), restaurant: restaurantId, discountType, value };
    for (const field of COUPON_FIELDS) {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    }

    const coupon = await Coupon.create(payload);
    await notifyAdmins('new_coupon_submitted', 'New coupon created', `${req.user.businessName} created coupon "${coupon.code}"`);
    res.status(201).json({ coupon });
  } catch (err) {
    next(err);
  }
}

export async function updateMyCoupon(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const coupon = await Coupon.findOne({ _id: req.params.id, restaurant: restaurantId });
    if (!coupon) throw new ApiError(404, 'Coupon not found');

    for (const field of COUPON_FIELDS) {
      if (req.body[field] !== undefined) coupon[field] = req.body[field];
    }
    await coupon.save();
    res.json({ coupon });
  } catch (err) {
    next(err);
  }
}

export async function deleteMyCoupon(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    await Coupon.findOneAndDelete({ _id: req.params.id, restaurant: restaurantId });
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    next(err);
  }
}

// ---- Reviews ----
export async function listMyReviews(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const filter = { restaurant: restaurantId };
    if (req.query.rating) filter.rating = Number(req.query.rating);
    const reviews = await Review.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
}

export async function replyToReview(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const { text } = req.body;
    if (!text?.trim()) throw new ApiError(400, 'Reply text is required');

    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, restaurant: restaurantId },
      { sellerReply: { text: text.trim(), at: new Date() } },
      { new: true }
    );
    if (!review) throw new ApiError(404, 'Review not found');
    res.json({ review });
  } catch (err) {
    next(err);
  }
}

export async function reviewAnalytics(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const breakdown = await Review.aggregate([
      { $match: { restaurant: restaurantId } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);
    const byStar = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let sum = 0;
    for (const row of breakdown) {
      byStar[row._id] = row.count;
      total += row.count;
      sum += row._id * row.count;
    }
    res.json({ byStar, total, average: total ? Number((sum / total).toFixed(2)) : 0 });
  } catch (err) {
    next(err);
  }
}

// ---- Earnings ----
export async function getMyEarnings(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const [summary] = await Order.aggregate([
      { $match: { restaurant: restaurantId, status: 'delivered' } },
      { $group: { _id: null, totalEarnings: { $sum: '$total' }, orderCount: { $sum: 1 } } },
    ]);
    res.json({
      totalEarnings: summary?.totalEarnings ?? 0,
      orderCount: summary?.orderCount ?? 0,
    });
  } catch (err) {
    next(err);
  }
}

export { requireOwnRestaurant, withCustomerName };
