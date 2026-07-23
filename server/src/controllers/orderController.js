import Order, { ORDER_STATUSES } from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import { ApiError } from '../utils/ApiError.js';
import { notifySeller, notifyCustomer } from '../utils/notify.js';
import { resolveCoupon } from '../utils/coupon.js';

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
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) throw new ApiError(404, 'Order not found');
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function cancelOrder(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) throw new ApiError(404, 'Order not found');
    if (['delivered', 'cancelled'].includes(order.status)) {
      throw new ApiError(400, `Order already ${order.status}`);
    }
    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', at: new Date() });
    await order.save();

    const restaurant = await Restaurant.findById(order.restaurant);
    if (restaurant) {
      await notifySeller(
        restaurant,
        'cancelled_order',
        'Order cancelled',
        `Order #${order._id.toString().slice(-6)} was cancelled by the customer`,
        order._id
      );
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export const ALL_STATUSES = ORDER_STATUSES;
