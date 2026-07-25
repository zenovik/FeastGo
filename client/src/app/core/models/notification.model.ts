export type NotificationType =
  | 'new_order'
  | 'cancelled_order'
  | 'order_completed'
  | 'payment'
  | 'payment_failed'
  | 'payment_settled'
  | 'refund_processed'
  | 'cashback_received'
  | 'low_stock'
  | 'general'
  | 'delivery_assigned'
  | 'delivery_accepted'
  | 'rider_reached_restaurant'
  | 'order_picked_up'
  | 'new_delivery_order'
  | 'delivery_cancelled'
  | 'customer_unreachable'
  | 'failed_delivery'
  | 'completed_delivery'
  | 'pickup_reminder'
  | 'earnings_updated'
  | 'rating_received'
  | 'welcome'
  | 'profile_updated'
  | 'address_added'
  | 'coupon_applied'
  | 'coupon_expired'
  | 'coupon_approved'
  | 'coupon_rejected'
  | 'new_coupon_submitted'
  | 'new_offer'
  | 'festival_offer'
  | 'new_review'
  | 'review_reminder'
  | 'menu_added'
  | 'menu_updated'
  | 'menu_deleted'
  | 'restaurant_approved'
  | 'restaurant_suspended'
  | 'restaurant_approval_request'
  | 'new_user_registration'
  | 'new_seller_registration'
  | 'new_delivery_registration'
  | 'high_order_volume'
  | 'user_report'
  | 'system_error'
  | 'security_alert'
  | 'promotional'
  | 'maintenance'
  | 'festival_greeting'
  | 'emergency_alert';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type NotificationModule = 'order' | 'payment' | 'delivery' | 'menu' | 'coupon' | 'restaurant' | 'review' | 'user' | 'system' | 'promotion';

export interface AppNotification {
  _id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string | null;
  relatedModule?: NotificationModule;
  relatedOrder?: string | null;
  relatedUserId?: string | null;
  relatedUserRole?: string | null;
  relatedUserName?: string | null;
  senderRole?: string;
  isRead: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
