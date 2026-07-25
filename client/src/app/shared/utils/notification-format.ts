import { AppNotification, NotificationPriority } from '../../core/models/notification.model';

const ICON_BY_TYPE: Record<string, string> = {
  new_order: 'receipt',
  cancelled_order: 'alert-triangle',
  order_completed: 'check',
  payment: 'credit-card',
  payment_failed: 'alert-triangle',
  payment_settled: 'banknote',
  refund_processed: 'banknote',
  cashback_received: 'percent',
  low_stock: 'package',
  general: 'bell',
  delivery_assigned: 'bike',
  delivery_accepted: 'bike',
  rider_reached_restaurant: 'map-pin',
  order_picked_up: 'package',
  new_delivery_order: 'bike',
  delivery_cancelled: 'alert-triangle',
  customer_unreachable: 'phone',
  failed_delivery: 'alert-triangle',
  completed_delivery: 'check',
  pickup_reminder: 'clock',
  earnings_updated: 'banknote',
  rating_received: 'star',
  welcome: 'flame',
  profile_updated: 'user',
  address_added: 'map-pin',
  coupon_applied: 'percent',
  coupon_expired: 'clock',
  coupon_approved: 'check',
  coupon_rejected: 'x',
  new_coupon_submitted: 'percent',
  new_offer: 'megaphone',
  festival_offer: 'megaphone',
  new_review: 'star',
  review_reminder: 'star',
  menu_added: 'chef-hat',
  menu_updated: 'chef-hat',
  menu_deleted: 'trash',
  restaurant_approved: 'shield-check',
  restaurant_suspended: 'alert-triangle',
  restaurant_approval_request: 'store',
  new_user_registration: 'user',
  new_seller_registration: 'store',
  new_delivery_registration: 'bike',
  high_order_volume: 'bar-chart',
  user_report: 'alert-triangle',
  system_error: 'alert-triangle',
  security_alert: 'shield-check',
  promotional: 'megaphone',
  maintenance: 'settings',
  festival_greeting: 'megaphone',
  emergency_alert: 'alert-triangle',
};

export function iconForNotificationType(type: string): string {
  return ICON_BY_TYPE[type] ?? 'bell';
}

const PRIORITY_COLOR: Record<NotificationPriority, string> = {
  critical: 'text-ember-600',
  high: 'text-ember-500',
  medium: 'text-ink-500',
  low: 'text-ink-400',
};

export function priorityColorClass(priority: NotificationPriority | undefined): string {
  return PRIORITY_COLOR[priority ?? 'medium'];
}

export function timeAgo(iso: string): string {
  const date = new Date(iso);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export interface NotificationGroup {
  label: string;
  items: AppNotification[];
}

export function groupNotificationsByDate(list: AppNotification[]): NotificationGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const buckets: Record<string, AppNotification[]> = { Today: [], Yesterday: [], 'This Week': [], Earlier: [] };
  for (const n of list) {
    const d = new Date(n.createdAt);
    if (d >= startOfToday) buckets['Today'].push(n);
    else if (d >= startOfYesterday) buckets['Yesterday'].push(n);
    else if (d >= startOfWeek) buckets['This Week'].push(n);
    else buckets['Earlier'].push(n);
  }
  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}
