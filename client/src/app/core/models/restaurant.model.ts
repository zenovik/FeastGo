export interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  description: string;
  cuisines: string[];
  category?: string;
  priceRange: 1 | 2 | 3;
  rating: number;
  ratingCount: number;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  deliveryFee: number;
  minOrder: number;
  coverImage: string;
  logoImage: string;
  images: string[];
  address: { line1: string; area: string; city: string; state?: string; zip?: string };
  isOpen: boolean;
  isFeatured: boolean;
  isPromoted: boolean;
  isSuspended?: boolean;
  tags: string[];
  offer: string;
  owner?: string | null;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  businessHours?: { day: number; open: string; close: string; closed: boolean }[];
  holidays?: { date: string; reason: string }[];
  deliveryRadiusKm?: number;
  openingTime?: string;
  closingTime?: string;
  socialLinks?: { instagram: string; facebook: string; x: string; website: string };
  gstNumber?: string;
  fssaiNumber?: string;
  bankDetails?: { accountHolder: string; accountNumber: string; ifsc: string; bankName: string };
  notificationPrefs?: { newOrder: boolean; cancelledOrder: boolean; payment: boolean; lowStock: boolean };
  categoryOrder?: string[];
}

export interface RestaurantListResponse {
  items: Restaurant[];
  total: number;
  page: number;
  pages: number;
}
