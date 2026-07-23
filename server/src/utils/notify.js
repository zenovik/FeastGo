import Notification from '../models/Notification.js';

const PREF_KEY = {
  new_order: 'newOrder',
  cancelled_order: 'cancelledOrder',
  payment: 'payment',
  low_stock: 'lowStock',
};

// `restaurant` must be a hydrated Restaurant document (needs .owner and .notificationPrefs).
export async function notifySeller(restaurant, type, title, message, relatedOrder = null) {
  if (!restaurant?.owner) return;
  const prefKey = PREF_KEY[type];
  if (prefKey && restaurant.notificationPrefs && restaurant.notificationPrefs[prefKey] === false) return;

  await Notification.create({
    recipientId: restaurant.owner,
    recipientRole: 'seller',
    type,
    title,
    message,
    relatedOrder,
  });
}

// `order` must be a hydrated Order document (needs .user).
export async function notifyCustomer(order, type, title, message) {
  if (!order?.user) return;
  await Notification.create({
    recipientId: order.user,
    recipientRole: 'customer',
    type,
    title,
    message,
    relatedOrder: order._id,
  });
}

const ORDER_STATUS_MESSAGES = {
  confirmed: ['Order confirmed', (o) => `${o.restaurantName} has confirmed order #${o._id.toString().slice(-6)}`],
  rejected: ['Order rejected', (o) => `${o.restaurantName} was unable to accept order #${o._id.toString().slice(-6)}`],
  preparing: ['Order is being prepared', (o) => `${o.restaurantName} is preparing your order #${o._id.toString().slice(-6)}`],
  ready_for_pickup: ['Ready for pickup', (o) => `Order #${o._id.toString().slice(-6)} is ready and waiting for a delivery partner`],
  out_for_delivery: ['Out for delivery', (o) => `Your order #${o._id.toString().slice(-6)} is on its way`],
  delivered: ['Order delivered', (o) => `Order #${o._id.toString().slice(-6)} has been delivered — enjoy!`],
  cancelled: ['Order cancelled', (o) => `Order #${o._id.toString().slice(-6)} has been cancelled`],
};

// Convenience wrapper for the common case of "order's status just changed, tell the customer".
export async function notifyCustomerOrderStatus(order, status) {
  const entry = ORDER_STATUS_MESSAGES[status];
  if (!entry) return;
  const [title, messageFn] = entry;
  const type = status === 'cancelled' || status === 'rejected' ? 'cancelled_order' : 'general';
  await notifyCustomer(order, type, title, messageFn(order));
}
