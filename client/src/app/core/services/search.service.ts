import { Injectable } from '@angular/core';
import { FOOD_ITEMS } from '../data/food-items.data';
import { FoodItem } from '../models/food-item.model';

// Backs every search bar in the app so they all share one matching algorithm
// and result set. Dummy-data-backed for now — same sync shape a real
// `GET /api/search?q=` call would return, so swapping this for an HTTP call
// later won't require touching any consumer.
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly items = FOOD_ITEMS;

  readonly popularSearches = ['Pizza', 'Biryani', 'Burger', 'Coffee', 'Momos', 'Dosa', 'Ice Cream'];

  search(query: string, limit = 8): FoodItem[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    return this.items
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.restaurantName.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          f.cuisine.toLowerCase().includes(q)
      )
      .slice(0, limit);
  }
}
