import { Injectable } from '@angular/core';
import { FoodItem } from '../models/food-item.model';
import { FoodService } from './food.service';

// Backs every search bar in the app so they all share one matching algorithm
// and result set.
@Injectable({ providedIn: 'root' })
export class SearchService {
  readonly popularSearches = ['Pizza', 'Biryani', 'Burger', 'Coffee', 'Momos', 'Dosa', 'Ice Cream'];

  constructor(private foodService: FoodService) {}

  async search(query: string, limit = 8): Promise<FoodItem[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const res = await this.foodService.list({ q, limit });
    return res.items;
  }
}
