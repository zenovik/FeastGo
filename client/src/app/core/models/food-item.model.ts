import { MenuItem } from './menu-item.model';

export interface FoodItem {
  id: string;
  name: string;
  image: string;
  restaurantName: string;
  restaurantId: string;
  category: string;
  cuisine: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  deliveryTime: number;
  calories?: number;
  veg: boolean;
  bestseller: boolean;
  offer: string;
  description: string;
  ingredients: string[];
  isAvailable: boolean;
  /** Extra facets used to power the Spicy / Healthy / New Arrivals quick filters. */
  tags?: ('spicy' | 'healthy' | 'new')[];
}

export interface FoodListResponse {
  items: FoodItem[];
  total: number;
}

// CartService (and checkout) operate on the existing MenuItem shape — this
// keeps the Food Feed compatible with the current cart/order flow without
// touching CartService itself.
export function foodItemToMenuItem(item: FoodItem): MenuItem {
  return {
    _id: item.id,
    restaurant: item.restaurantId,
    name: item.name,
    description: item.description,
    price: item.price,
    image: item.image,
    category: item.category,
    isVeg: item.veg,
    isBestseller: item.bestseller,
    isAvailable: item.isAvailable,
    rating: item.rating,
  };
}
