import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    recipientRole: { type: String, enum: ['customer', 'seller', 'delivery', 'admin'], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, default: null },
    senderRole: { type: String, enum: ['customer', 'seller', 'delivery', 'admin', 'system'], default: 'system' },
    type: {
      type: String,
      enum: [
        // Order lifecycle
        'new_order',
        'cancelled_order',
        'order_completed',
        'payment',
        'payment_failed',
        'payment_settled',
        'refund_processed',
        'cashback_received',
        'low_stock',
        'general',
        // Delivery lifecycle
        'delivery_assigned',
        'delivery_accepted',
        'rider_reached_restaurant',
        'order_picked_up',
        'new_delivery_order',
        'delivery_cancelled',
        'customer_unreachable',
        'failed_delivery',
        'completed_delivery',
        'pickup_reminder',
        'earnings_updated',
        'rating_received',
        // Account / profile
        'welcome',
        'profile_updated',
        'address_added',
        // Coupons / offers
        'coupon_applied',
        'coupon_expired',
        'coupon_approved',
        'coupon_rejected',
        'new_coupon_submitted',
        'new_offer',
        'festival_offer',
        // Seller / restaurant
        'new_review',
        'review_reminder',
        'menu_added',
        'menu_updated',
        'menu_deleted',
        'restaurant_approved',
        'restaurant_suspended',
        'restaurant_approval_request',
        // Admin / platform
        'new_user_registration',
        'new_seller_registration',
        'new_delivery_registration',
        'high_order_volume',
        'user_report',
        'system_error',
        'security_alert',
        // Admin-authored campaigns
        'promotional',
        'maintenance',
        'festival_greeting',
        'emergency_alert',
      ],
      default: 'general',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    actionUrl: { type: String, default: null },
    relatedModule: {
      type: String,
      enum: ['order', 'payment', 'delivery', 'menu', 'coupon', 'restaurant', 'review', 'user', 'system', 'promotion'],
      default: 'system',
    },
    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    relatedUserId: { type: mongoose.Schema.Types.ObjectId, default: null },
    relatedUserRole: { type: String, enum: ['customer', 'seller', 'delivery', 'admin', null], default: null },
    relatedUserName: { type: String, default: null },
    isRead: { type: Boolean, default: false, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
    // Only set for non-critical categories — critical notifications have no
    // expiresAt and so are exempt from the TTL index, matching "critical
    // notifications should stay until manually dismissed."
    expiresAt: { type: Date, default: null },
    // Lets a caller opt a notification out of being created twice for the
    // same real-world event (e.g. the same order status transition firing
    // more than once). Enforced via the sparse unique index below.
    // Deliberately has no `default` — a sparse unique index only excludes
    // documents where this field is genuinely absent, not ones storing an
    // explicit null, so callers must OMIT this key entirely (not set it to
    // null) when they don't want deduping. See notify.js's createNotification.
    dedupeKey: { type: String },
    // Admin-authored campaigns only — classifies broadcast/scheduled sends.
    category: { type: String, enum: ['promotional', 'maintenance', 'festival', 'emergency', null], default: null },
    // When set and in the future, the notification row exists but is hidden
    // from lists and not yet pushed over the socket — the scheduler sweep in
    // notificationScheduler.js emits it and stamps deliveredAt once due.
    scheduledFor: { type: Date, default: null },
    deliveredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
notificationSchema.index({ recipientId: 1, recipientRole: 1, isArchived: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Notification', notificationSchema);
