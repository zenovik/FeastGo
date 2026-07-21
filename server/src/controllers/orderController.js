import Order, { ORDER_STATUSES } from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import { ApiError } from '../utils/ApiError.js';

const TAX_RATE = 0.05;
const FREE_DISCOUNT_THRESHOLD = 800; // ₹800+ orders get a 10% discount

// Advances a freshly placed order through the delivery lifecycle automatically,
// simulating a live kitchen/courier so the tracking UI has real transitions to show.
function simulateProgression(orderId) {
  const stages = ['confirmed', 'preparing', 'out_for_delivery', 'delivered'];
  const delays = [4000, 9000, 15000, 24000];
  stages.forEach((status, i) => {
    setTimeout(async () => {
      const order = await Order.findById(orderId);
      if (!order || order.status === 'cancelled') return;
      order.status = status;
      order.statusHistory.push({ status, at: new Date() });
      await order.save();
    }, delays[i]);
  });
}

export async function createOrder(req, res, next) {
  try {
    const { restaurantSlug, items, address, paymentMethod } = req.body;
    if (!restaurantSlug || !items?.length || !address) {
      throw new ApiError(400, 'restaurantSlug, items and address are required');
    }

    const restaurant = await Restaurant.findOne({ slug: restaurantSlug });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');

    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    const menuItemMap = new Map(menuItems.map((m) => [m._id.toString(), m]));

    let subtotal = 0;
    const orderItems = items.map(({ menuItemId, qty }) => {
      const menuItem = menuItemMap.get(menuItemId);
      if (!menuItem) throw new ApiError(400, `Menu item ${menuItemId} not found`);
      const quantity = Math.max(1, Number(qty) || 1);
      subtotal += menuItem.price * quantity;
      return { menuItem: menuItem._id, name: menuItem.name, price: menuItem.price, qty: quantity, isVeg: menuItem.isVeg };
    });

    const deliveryFee = restaurant.deliveryFee;
    const taxes = Math.round(subtotal * TAX_RATE);
    const discount = subtotal >= FREE_DISCOUNT_THRESHOLD ? Math.round(subtotal * 0.1) : 0;
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
      total,
      status: 'placed',
      statusHistory: [{ status: 'placed', at: new Date() }],
      address,
      paymentMethod,
      etaMinutes: restaurant.deliveryTimeMax,
    });

    simulateProgression(order._id);

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
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export const ALL_STATUSES = ORDER_STATUSES;
