export interface ExploreCardFilters {
  q?: string;
  veg?: boolean;
  nonVeg?: boolean;
  bestseller?: boolean;
  spicy?: boolean;
  healthy?: boolean;
  fastDelivery?: boolean;
  under199?: boolean;
  offers?: boolean;
  topRated?: boolean;
  newArrival?: boolean;
  featured?: boolean;
  freeDelivery?: boolean;
  bogo?: boolean;
  minRating?: number;
  priceRange?: 'under199' | '199-399' | '399plus';
  sort?: 'popular' | 'rating' | 'price_low' | 'price_high' | 'fastest' | 'recommended';
}

export interface ExploreCard {
  _id: string;
  title: string;
  subtitle: string;
  icon: string;
  image: string;
  gradientFrom: string;
  gradientTo: string;
  badge: string;
  route: string;
  filters: ExploreCardFilters;
  isActive: boolean;
  sortOrder: number;
}
