export interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  description: string;
  cuisines: string[];
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
  address: { line1: string; area: string; city: string };
  isOpen: boolean;
  isFeatured: boolean;
  isPromoted: boolean;
  tags: string[];
  offer: string;
}

export interface RestaurantListResponse {
  items: Restaurant[];
  total: number;
  page: number;
  pages: number;
}
