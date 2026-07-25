import { Address } from './user.model';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'rejected'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'failed'
  | 'returned';

export type DeliveryStatus =
  | 'pending'
  | 'searching'
  | 'assigned'
  | 'accepted'
  | 'reached_restaurant'
  | 'picked_up'
  | 'out_for_delivery'
  | 'reached_customer'
  | 'delivered'
  | 'cancelled'
  | 'failed'
  | 'returned';

export interface DeliveryStatusHistoryEntry {
  status: DeliveryStatus;
  at: string;
}

// Populated shape of `Order.deliveryPartner` on the customer-facing order-detail
// endpoint — everywhere else it's just the bare id string.
export interface OrderDeliveryPartnerSummary {
  _id: string;
  name: string;
  phone: string;
  photo?: string;
  vehicleType: string;
  vehicleNumber: string;
  location: { lat: number | null; lng: number | null };
  rating: { average: number; count: number };
}

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
  deliveryPartner?: string | OrderDeliveryPartnerSummary | null;
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
  tip?: number;
  deliveryStatus: DeliveryStatus;
  deliveryStatusHistory: DeliveryStatusHistoryEntry[];
  deliveryOtp?: string | null;
  deliveryOtpVerified?: boolean;
  deliveryProofImage?: string;
  deliveryFailReason?: string;
  reassignCount?: number;
  pickedUpAt?: string | null;
  reachedCustomerAt?: string | null;
  deliveredAt?: string | null;
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

// Shape returned by the delivery partner order-detail endpoint.
export interface DeliveryOrderDetail extends Omit<Order, 'user' | 'restaurant'> {
  user: { _id: string; name: string; phone: string };
  restaurant: { _id: string; name: string; address: Address; location: { lat: number; lng: number } };
}
