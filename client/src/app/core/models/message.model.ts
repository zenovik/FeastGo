export type MessageRole = 'customer' | 'seller' | 'delivery';

export interface OrderMessage {
  _id: string;
  order: string;
  thread: 'customer-delivery' | 'seller-delivery';
  senderId: string;
  senderRole: MessageRole;
  senderName: string;
  recipientId: string;
  recipientRole: MessageRole;
  text: string;
  readAt: string | null;
  createdAt: string;
}
