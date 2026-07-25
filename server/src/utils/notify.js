import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { emitToRecipient } from '../realtime/socket.js';

const PREF_KEY = {
  new_order: 'newOrder',
  cancelled_order: 'cancelledOrder',
  payment: 'payment',
  low_stock: 'lowStock',
};

const PRIORITY_BY_TYPE = {
  security_alert: 'critical',
  system_error: 'critical',
  emergency_alert: 'critical',
  new_order: 'high',
  cancelled_order: 'high',
  delivery_cancelled: 'high',
  payment_failed: 'high',
  failed_delivery: 'high',
  restaurant_suspended: 'high',
  customer_unreachable: 'high',
  new_delivery_order: 'high',
  delivery_assigned: 'high',
  low_stock: 'medium',
  coupon_expired: 'low',
  new_offer: 'low',
  festival_offer: 'low',
};

const MODULE_BY_TYPE = {
  new_order: 'order',
  cancelled_order: 'order',
  order_completed: 'order',
  payment: 'payment',
  payment_failed: 'payment',
  payment_settled: 'payment',
  refund_processed: 'payment',
  cashback_received: 'payment',
  low_stock: 'menu',
  menu_added: 'menu',
  menu_updated: 'menu',
  menu_deleted: 'menu',
  delivery_assigned: 'delivery',
  delivery_accepted: 'delivery',
  rider_reached_restaurant: 'delivery',
  order_picked_up: 'delivery',
  new_delivery_order: 'delivery',
  delivery_cancelled: 'delivery',
  customer_unreachable: 'delivery',
  failed_delivery: 'delivery',
  completed_delivery: 'delivery',
  pickup_reminder: 'delivery',
  earnings_updated: 'delivery',
  rating_received: 'delivery',
  welcome: 'user',
  profile_updated: 'user',
  address_added: 'user',
  coupon_applied: 'coupon',
  coupon_expired: 'coupon',
  coupon_approved: 'coupon',
  coupon_rejected: 'coupon',
  new_coupon_submitted: 'coupon',
  new_offer: 'promotion',
  festival_offer: 'promotion',
  promotional: 'promotion',
  festival_greeting: 'promotion',
  new_review: 'review',
  review_reminder: 'review',
  restaurant_approved: 'restaurant',
  restaurant_suspended: 'restaurant',
  restaurant_approval_request: 'restaurant',
  new_user_registration: 'user',
  new_seller_registration: 'user',
  new_delivery_registration: 'user',
  high_order_volume: 'system',
  user_report: 'system',
  system_error: 'system',
  security_alert: 'system',
  maintenance: 'system',
  emergency_alert: 'system',
};

function defaultActionUrl(recipientRole, relatedModule, relatedOrderId) {
  if (['order', 'delivery', 'payment'].includes(relatedModule)) {
    if (recipientRole === 'customer' && relatedOrderId) return `/orders/${relatedOrderId}`;
    if (recipientRole === 'seller') return '/seller/orders';
    if (recipientRole === 'delivery') return '/delivery/orders';
    if (recipientRole === 'admin') return '/admin/orders';
  }
  if (relatedModule === 'menu' && recipientRole === 'seller') return '/seller/menu';
  if (relatedModule === 'coupon') {
    if (recipientRole === 'seller') return '/seller/offers';
    if (recipientRole === 'admin') return '/admin/coupons';
  }
  if (relatedModule === 'review' && recipientRole === 'seller') return '/seller/reviews';
  if (relatedModule === 'restaurant' && recipientRole === 'admin') return '/admin/restaurants';
  if (relatedModule === 'user' && recipientRole === 'admin') return '/admin/users';
  return null;
}

// Central write path for every notification in the app — writes to Mongo,
// then pushes it over the recipient's Socket.IO room for instant delivery.
// `dedupeKey`, when passed, relies on the sparse unique index on that field
// to silently no-op a second call for the same real-world event instead of
// creating a duplicate.
export async function createNotification(input) {
  const relatedModule = input.relatedModule ?? MODULE_BY_TYPE[input.type] ?? 'system';
  const doc = {
    recipientId: input.recipientId,
    recipientRole: input.recipientRole,
    senderId: input.senderId ?? null,
    senderRole: input.senderRole ?? 'system',
    type: input.type ?? 'general',
    priority: input.priority ?? PRIORITY_BY_TYPE[input.type] ?? 'medium',
    title: input.title,
    message: input.message,
    actionUrl: input.actionUrl ?? defaultActionUrl(input.recipientRole, relatedModule, input.relatedOrder),
    relatedModule,
    relatedOrder: input.relatedOrder ?? null,
    relatedUserId: input.relatedUserId ?? null,
    relatedUserRole: input.relatedUserRole ?? null,
    relatedUserName: input.relatedUserName ?? null,
    expiresAt: input.priority === 'critical' ? null : (input.expiresAt ?? null),
    // Omitted entirely (not set to null) unless provided — see the schema
    // comment on why an explicit null would break the sparse unique index.
    ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
  };

  let created;
  try {
    created = await Notification.create(doc);
  } catch (err) {
    if (err?.code === 11000) return null; // deduped — already notified for this event
    throw err;
  }
  emitToRecipient(doc.recipientRole, doc.recipientId, 'notification:new', created);
  return created;
}

// Bulk variant for fan-out sends (admin broadcasts, "notify every admin").
// Uses insertMany for the write, then emits individually so every open tab
// still gets pushed in real time.
export async function createNotificationsBulk(inputs) {
  if (!inputs.length) return [];
  const docs = inputs.map((input) => {
    const relatedModule = input.relatedModule ?? MODULE_BY_TYPE[input.type] ?? 'system';
    return {
      recipientId: input.recipientId,
      recipientRole: input.recipientRole,
      senderId: input.senderId ?? null,
      senderRole: input.senderRole ?? 'system',
      type: input.type ?? 'general',
      priority: input.priority ?? PRIORITY_BY_TYPE[input.type] ?? 'medium',
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? defaultActionUrl(input.recipientRole, relatedModule, input.relatedOrder),
      relatedModule,
      relatedOrder: input.relatedOrder ?? null,
      relatedUserId: input.relatedUserId ?? null,
      relatedUserRole: input.relatedUserRole ?? null,
      relatedUserName: input.relatedUserName ?? null,
      expiresAt: input.priority === 'critical' ? null : (input.expiresAt ?? null),
      category: input.category ?? null,
      scheduledFor: input.scheduledFor ?? null,
      deliveredAt: input.scheduledFor && input.scheduledFor > new Date() ? null : new Date(),
      // Omitted entirely (not set to null) unless provided — an explicit null
      // would collide against every other null under the sparse unique index.
      ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
    };
  });
  const created = await Notification.insertMany(docs, { ordered: false }).catch((err) => err.insertedDocs ?? []);
  for (const doc of created) {
    if (doc.deliveredAt) emitToRecipient(doc.recipientRole, doc.recipientId, 'notification:new', doc);
  }
  return created;
}

// `restaurant` must be a hydrated Restaurant document (needs .owner and .notificationPrefs).
export async function notifySeller(restaurant, type, title, message, relatedOrder = null) {
  if (!restaurant?.owner) return;
  const prefKey = PREF_KEY[type];
  if (prefKey && restaurant.notificationPrefs && restaurant.notificationPrefs[prefKey] === false) return;

  await createNotification({
    recipientId: restaurant.owner,
    recipientRole: 'seller',
    type,
    title,
    message,
    relatedOrder,
  });
}

// Account-level notifications to a seller (approval/suspension/etc.) aren't
// tied to a specific order, so they skip the per-restaurant notificationPrefs
// gating that notifySeller() applies — those prefs are about order-event
// noise, not "your account was suspended."
export async function notifySellerAccount(ownerId, type, title, message) {
  if (!ownerId) return;
  await createNotification({ recipientId: ownerId, recipientRole: 'seller', type, title, message });
}

// `order` must be a hydrated Order document (needs .user).
export async function notifyCustomer(order, type, title, message) {
  if (!order?.user) return;
  await createNotification({
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

// ---- Delivery notifications ----

export async function notifyDeliveryPartner(partnerId, type, title, message, relatedOrder = null) {
  if (!partnerId) return;
  await createNotification({ recipientId: partnerId, recipientRole: 'delivery', type, title, message, relatedOrder });
}

// Fans out to every admin account — there's no single "the admin", so this
// creates one Notification per admin user.
export async function notifyAdmins(type, title, message, relatedOrder = null) {
  const admins = await User.find({ role: 'admin' }).select('_id');
  if (!admins.length) return;
  await createNotificationsBulk(admins.map((a) => ({ recipientId: a._id, recipientRole: 'admin', type, title, message, relatedOrder })));
}

export async function notifyDeliveryAssigned(order, partner) {
  const shortId = order._id.toString().slice(-6);
  await notifyCustomer(order, 'delivery_assigned', 'Delivery partner assigned', `${partner.name} (${partner.vehicleType}) will deliver order #${shortId}`);
  await notifyDeliveryPartner(partner._id, 'new_delivery_order', 'New order assigned', `Order #${shortId} from ${order.restaurantName} has been assigned to you`, order._id);
  await notifyAdmins('delivery_assigned', 'Delivery assigned', `${partner.name} assigned to order #${shortId}`, order._id);
}

export async function notifySellerRiderReachedRestaurant(restaurant, order, partner) {
  await notifySeller(restaurant, 'rider_reached_restaurant', 'Rider reached restaurant', `${partner.name} has arrived to pick up order #${order._id.toString().slice(-6)}`, order._id);
}

export async function notifySellerOrderPickedUp(restaurant, order, partner) {
  await notifySeller(restaurant, 'order_picked_up', 'Order picked up', `${partner.name} picked up order #${order._id.toString().slice(-6)}`, order._id);
}

export async function notifyDeliveryCancelledToPartner(partnerId, order, reason = '') {
  await notifyDeliveryPartner(partnerId, 'delivery_cancelled', 'Order cancelled', `Order #${order._id.toString().slice(-6)} was cancelled${reason ? `: ${reason}` : ''}`, order._id);
}

export async function notifyCustomerUnreachable(order) {
  const shortId = order._id.toString().slice(-6);
  await notifyAdmins('customer_unreachable', 'Customer unreachable', `Delivery partner could not reach the customer for order #${shortId}`, order._id);
}

export async function notifyFailedDelivery(order, reason = '') {
  const shortId = order._id.toString().slice(-6);
  await notifyAdmins('failed_delivery', 'Failed delivery', `Order #${shortId} delivery failed${reason ? `: ${reason}` : ''}`, order._id);
  await notifyCustomer(order, 'general', 'Delivery attempt failed', `We couldn't complete delivery for order #${shortId} — our team will reach out shortly`);
}

export async function notifyCompletedDelivery(order) {
  await notifyAdmins('completed_delivery', 'Delivery completed', `Order #${order._id.toString().slice(-6)} was delivered successfully`, order._id);
}
