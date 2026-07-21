export interface Address {
  _id?: string;
  label: string;
  line1: string;
  area?: string;
  city: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: 'user' | 'admin';
  addresses: Address[];
  favoriteRestaurants: string[];
  createdAt: string;
}
