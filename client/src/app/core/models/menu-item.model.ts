export interface ScheduledAvailability {
  enabled: boolean;
  days: number[]; // 0=Sunday
  startTime: string;
  endTime: string;
}

export interface MenuItem {
  _id: string;
  restaurant: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  category: string;
  isVeg: boolean;
  isBestseller: boolean;
  isFeatured?: boolean;
  isRecommended?: boolean;
  isAvailable: boolean;
  isHiddenByAdmin?: boolean;
  spiceLevel?: number;
  rating: number;
  stockCount?: number | null;
  lowStockThreshold?: number;
  sortOrder?: number;
  scheduledAvailability?: ScheduledAvailability;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuCategory {
  category: string;
  items: MenuItem[];
}
