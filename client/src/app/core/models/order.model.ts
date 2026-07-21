import { Address } from './user.model';

export type OrderStatus = 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

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
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  taxes: number;
  discount: number;
  total: number;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  address: Address;
  paymentMethod: 'card' | 'upi' | 'cod';
  etaMinutes: number;
  createdAt: string;
}
