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

export type Gender = 'male' | 'female' | 'other';

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  gender: Gender | null;
  photo: string | null;
  location: { lat: number | null; lng: number | null };
  role: 'user' | 'admin';
  adminRole?: 'super_admin' | 'manager' | 'support' | null;
  addresses: Address[];
  favoriteRestaurants: string[];
  isBlocked?: boolean;
  createdAt: string;
}
