import { MenuItem } from './menu-item.model';

export interface CartItem {
  menuItem: MenuItem;
  qty: number;
}

export interface CartState {
  restaurantSlug: string | null;
  restaurantName: string | null;
  items: CartItem[];
}
