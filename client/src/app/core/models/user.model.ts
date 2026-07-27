export interface Address {
  _id?: string;
  label: string;
  line1: string;
  area?: string;
  landmark?: string;
  city: string;
  state?: string;
  zip?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
  /** Free-text delivery instructions ("Leave at door", "Call on arrival"), order-scoped. */
  instructions?: string;
}

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface NotificationPrefs {
  orderUpdates: boolean;
  promotional: boolean;
  offers: boolean;
  email: boolean;
  push: boolean;
}

export interface SavedCard {
  _id: string;
  label: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
}

export interface SavedUpi {
  _id: string;
  label: string;
  upiId: string;
}

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  gender: Gender | null;
  photo: string | null;
  location: { lat: number | null; lng: number | null };
  role: 'user' | 'admin';
  adminRole?: 'super_admin' | 'manager' | 'support' | null;
  addresses: Address[];
  favoriteRestaurants: string[];
  isBlocked?: boolean;
  notificationPrefs: NotificationPrefs;
  theme: ThemeMode;
  language: string;
  savedCards: SavedCard[];
  savedUpi: SavedUpi[];
  createdAt: string;
}
