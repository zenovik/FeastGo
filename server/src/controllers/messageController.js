import Order from '../models/Order.js';
import Message from '../models/Message.js';
import RestaurantOwner from '../models/RestaurantOwner.js';
import { ApiError } from '../utils/ApiError.js';
import { emitToRecipient } from '../realtime/socket.js';

const MAX_MESSAGES = 200;

// Fetching a thread is what a real inbox would call "opening" it — so this
// is also the point where any unread messages addressed to the viewer in
// that thread get marked read, the same way opening a chat clears its badge.
async function listThread(order, thread, recipientId) {
  await Message.updateMany({ order: order._id, thread, recipientId, readAt: null }, { readAt: new Date() });
  return Message.find({ order: order._id, thread }).sort({ createdAt: 1 }).limit(MAX_MESSAGES);
}

// Unread messages for one recipient, broken down by order + thread — what
// lets each "Chat" button show its own badge instead of one lump sum with
// nowhere obvious to put it (a recipient can have unread messages sitting in
// several different orders' threads at once).
async function unreadCountFor(recipientId, recipientRole) {
  const rows = await Message.aggregate([
    { $match: { recipientId, recipientRole, readAt: null } },
    { $group: { _id: { order: '$order', thread: '$thread' }, count: { $sum: 1 } } },
  ]);
  const byOrder = {};
  let total = 0;
  for (const row of rows) {
    const orderId = row._id.order.toString();
    byOrder[orderId] = byOrder[orderId] || {};
    byOrder[orderId][row._id.thread] = row.count;
    total += row.count;
  }
  return { count: total, byOrder };
}

async function sendMessage({ order, thread, senderId, senderRole, senderName, recipientId, recipientRole, text }) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) throw new ApiError(400, 'Message cannot be empty');
  if (trimmed.length > 1000) throw new ApiError(400, 'Message is too long (max 1000 characters)');

  const message = await Message.create({
    order: order._id,
    thread,
    senderId,
    senderRole,
    senderName,
    recipientId,
    recipientRole,
    text: trimmed,
  });
  emitToRecipient(recipientRole, recipientId, 'message:new', message);
  return message;
}

// ---- Customer <-> delivery partner ----

export async function listCustomerMessages(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) throw new ApiError(404, 'Order not found');
    if (!order.deliveryPartner) return res.json({ messages: [] });
    res.json({ messages: await listThread(order, 'customer-delivery', req.user._id) });
  } catch (err) {
    next(err);
  }
}

export async function sendCustomerMessage(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) throw new ApiError(404, 'Order not found');
    if (!order.deliveryPartner) throw new ApiError(400, 'No delivery partner assigned yet');

    const message = await sendMessage({
      order,
      thread: 'customer-delivery',
      senderId: req.user._id,
      senderRole: 'customer',
      senderName: req.user.name,
      recipientId: order.deliveryPartner,
      recipientRole: 'delivery',
      text: req.body.text,
    });
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

// ---- Seller <-> delivery partner ----

export async function listSellerMessages(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurant: req.user.restaurant });
    if (!order) throw new ApiError(404, 'Order not found');
    if (!order.deliveryPartner) return res.json({ messages: [] });
    res.json({ messages: await listThread(order, 'seller-delivery', req.user._id) });
  } catch (err) {
    next(err);
  }
}

export async function sendSellerMessage(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurant: req.user.restaurant });
    if (!order) throw new ApiError(404, 'Order not found');
    if (!order.deliveryPartner) throw new ApiError(400, 'No delivery partner assigned yet');

    const message = await sendMessage({
      order,
      thread: 'seller-delivery',
      senderId: req.user._id,
      senderRole: 'seller',
      senderName: req.user.businessName || req.user.name,
      recipientId: order.deliveryPartner,
      recipientRole: 'delivery',
      text: req.body.text,
    });
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

// ---- Delivery partner <-> customer/seller ----

export async function listDeliveryMessages(req, res, next) {
  try {
    const withRole = req.query.with === 'seller' ? 'seller' : 'customer';
    const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.user._id });
    if (!order) throw new ApiError(404, 'Order not found');
    res.json({ messages: await listThread(order, `${withRole}-delivery`, req.user._id) });
  } catch (err) {
    next(err);
  }
}

export async function sendDeliveryMessage(req, res, next) {
  try {
    const withRole = req.query.with === 'seller' ? 'seller' : 'customer';
    const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.user._id });
    if (!order) throw new ApiError(404, 'Order not found');

    let recipientId;
    if (withRole === 'customer') {
      recipientId = order.user;
    } else {
      const owner = await RestaurantOwner.findOne({ restaurant: order.restaurant }).select('_id');
      if (!owner) throw new ApiError(404, 'Seller not found for this order');
      recipientId = owner._id;
    }

    const message = await sendMessage({
      order,
      thread: `${withRole}-delivery`,
      senderId: req.user._id,
      senderRole: 'delivery',
      senderName: req.user.name,
      recipientId,
      recipientRole: withRole,
      text: req.body.text,
    });
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

// ---- Unread counts (the badge on each shell's message icon) ----

export async function getCustomerUnreadMessageCount(req, res, next) {
  try {
    res.json(await unreadCountFor(req.user._id, 'customer'));
  } catch (err) {
    next(err);
  }
}

export async function getSellerUnreadMessageCount(req, res, next) {
  try {
    res.json(await unreadCountFor(req.user._id, 'seller'));
  } catch (err) {
    next(err);
  }
}

export async function getDeliveryUnreadMessageCount(req, res, next) {
  try {
    res.json(await unreadCountFor(req.user._id, 'delivery'));
  } catch (err) {
    next(err);
  }
}
