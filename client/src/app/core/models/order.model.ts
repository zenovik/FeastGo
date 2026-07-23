import { Address } from './user.model';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'rejected'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  menuItem: string;
  name: string;
  price: number;
  qty: number;
  isVeg: boolean;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  at: string;
}

export interface Order {
  _id: string;
  user: string;
  restaurant: string;
  restaurantName: string;
  deliveryPartner?: string | null;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  taxes: number;
  discount: number;
  couponCode?: string | null;
  total: number;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  address: Address;
  paymentMethod: 'card' | 'upi' | 'cod';
  etaMinutes: number;
  sellerNotes?: string;
  refundStatus?: 'none' | 'requested' | 'approved' | 'rejected' | 'refunded';
  refundAmount?: number;
  refundReason?: string;
  /** Only present on seller/admin-facing endpoints (order list, dashboard recent orders). */
  customerName?: string;
  createdAt: string;
}

// Shape returned by the seller order-detail endpoint, which populates the
// customer and delivery partner refs instead of leaving them as bare ids.
export interface SellerOrderDetail extends Omit<Order, 'user' | 'deliveryPartner'> {
  user: { _id: string; name: string; phone: string; email: string | null };
  deliveryPartner: { _id: string; name: string; phone: string; vehicleType: string; vehicleNumber: string } | null;
}
