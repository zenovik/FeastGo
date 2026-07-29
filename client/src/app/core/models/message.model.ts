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

// Response shape of each role's "unread messages" endpoint — broken down by
// order and thread so a per-order "Chat" button can show its own badge
// instead of one lump total with nowhere specific to put it.
export interface UnreadMessageCounts {
  count: number;
  byOrder: Record<string, Partial<Record<'customer-delivery' | 'seller-delivery', number>>>;
}
