import Notification from '../models/Notification.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { emitToRecipient } from '../realtime/socket.js';
import { createNotification, createNotificationsBulk } from '../utils/notify.js';

const REVIEW_REMINDER_DELAY_MS = 60 * 60 * 1000; // 1h after delivery
const PICKUP_REMINDER_DELAY_MS = 15 * 60 * 1000; // 15m sitting ready-for-pickup
const HIGH_ORDER_VOLUME_WINDOW_MS = 60 * 60 * 1000;
const HIGH_ORDER_VOLUME_THRESHOLD = Number(process.env.HIGH_ORDER_VOLUME_THRESHOLD) || 50;

// Delivers any admin broadcast whose scheduledFor time has arrived — the row
// already exists in Mongo (created by broadcastNotification), it's just been
// invisible to lists and not yet pushed over the socket until now.
async function deliverScheduledNotifications() {
  const due = await Notification.find({ scheduledFor: { $lte: new Date(), $ne: null }, deliveredAt: null }).limit(500);
  if (!due.length) return;
  const ids = [];
  for (const doc of due) {
    doc.deliveredAt = new Date();
    ids.push(doc._id);
    emitToRecipient(doc.recipientRole, doc.recipientId, 'notification:new', doc);
  }
  await Notification.updateMany({ _id: { $in: ids } }, { deliveredAt: new Date() });
}

// Nudges a delivery partner if an order has been sitting ready-for-pickup,
// already assigned to them, for longer than the reminder window.
async function sendPickupReminders() {
  const cutoff = new Date(Date.now() - PICKUP_REMINDER_DELAY_MS);
  const orders = await Order.find({
    status: 'ready_for_pickup',
    deliveryPartner: { $ne: null },
    pickedUpAt: null,
    updatedAt: { $lte: cutoff },
  }).limit(200);

  for (const order of orders) {
    // dedupeKey (sparse unique index) makes this safe to call every sweep —
    // only the first attempt per order actually writes/emits a notification.
    await createNotification({
      recipientId: order.deliveryPartner,
      recipientRole: 'delivery',
      type: 'pickup_reminder',
      title: 'Pickup reminder',
      message: `Order #${order._id.toString().slice(-6)} from ${order.restaurantName} is still waiting to be picked up`,
      relatedOrder: order._id,
      dedupeKey: `pickup-reminder:${order._id}`,
    });
  }
}

// Nudges a customer to review their order a while after delivery, unless
// they've already reviewed that restaurant since it was delivered.
async function sendReviewReminders() {
  const cutoff = new Date(Date.now() - REVIEW_REMINDER_DELAY_MS);
  const recentCutoff = new Date(Date.now() - REVIEW_REMINDER_DELAY_MS - 24 * 60 * 60 * 1000);
  const orders = await Order.find({
    status: 'delivered',
    deliveredAt: { $lte: cutoff, $gte: recentCutoff },
  }).limit(200);

  for (const order of orders) {
    const alreadyReviewed = await Review.exists({ restaurant: order.restaurant, user: order.user, createdAt: { $gte: order.deliveredAt } });
    if (alreadyReviewed) continue;
    await createNotification({
      recipientId: order.user,
      recipientRole: 'customer',
      type: 'review_reminder',
      title: 'How was your order?',
      message: `Rate your experience with ${order.restaurantName} — it only takes a moment.`,
      relatedOrder: order._id,
      dedupeKey: `review-reminder:${order._id}`,
    });
  }
}

// Fires once per rolling hour bucket if order volume crosses the threshold —
// dedupeKey scopes it to the current hour so it can't spam every sweep tick.
async function checkHighOrderVolume() {
  const since = new Date(Date.now() - HIGH_ORDER_VOLUME_WINDOW_MS);
  const count = await Order.countDocuments({ createdAt: { $gte: since } });
  if (count < HIGH_ORDER_VOLUME_THRESHOLD) return;

  const hourBucket = new Date().toISOString().slice(0, 13);
  const admins = await User.find({ role: 'admin' }).select('_id');
  if (!admins.length) return;
  await createNotificationsBulk(
    admins.map((a) => ({
      recipientId: a._id,
      recipientRole: 'admin',
      type: 'high_order_volume',
      priority: 'high',
      title: 'High order volume',
      message: `${count} orders placed in the last hour — above the ${HIGH_ORDER_VOLUME_THRESHOLD} order alert threshold`,
      dedupeKey: `high-order-volume:${hourBucket}:${a._id}`,
    }))
  );
}

export function startNotificationScheduler() {
  const tick = async () => {
    try {
      await deliverScheduledNotifications();
      await sendPickupReminders();
      await sendReviewReminders();
      await checkHighOrderVolume();
    } catch (err) {
      console.error('[notificationScheduler] sweep failed', err);
    }
  };
  tick();
  return setInterval(tick, 60_000);
}
