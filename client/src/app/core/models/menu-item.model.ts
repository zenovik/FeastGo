export interface MenuItem {
  _id: string;
  restaurant: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isVeg: boolean;
  isBestseller: boolean;
  isAvailable: boolean;
  rating: number;
}

export interface MenuCategory {
  category: string;
  items: MenuItem[];
}
