export interface AppNotification {
  _id: string;
  type: 'new_order' | 'cancelled_order' | 'payment' | 'low_stock' | 'general';
  title: string;
  message: string;
  relatedOrder?: string | null;
  isRead: boolean;
  createdAt: string;
}
