import { Injectable } from '@angular/core';
import { FOOD_ITEMS } from '../data/food-items.data';
import { FoodItem, FoodListResponse } from '../models/food-item.model';

export type FoodSort = 'popular' | 'rating' | 'price_low' | 'price_high' | 'fastest' | 'recommended';
export type FoodPriceRange = 'under199' | '199-399' | '399plus';

export interface FoodQuery {
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
  minRating?: number;
  priceRange?: FoodPriceRange;
  sort?: FoodSort;
}

// Dummy-data-backed for now — same async, query-object shape a real
// `GET /api/food-items` call would have, so swapping in HttpClient later
// (mirroring RestaurantService) won't require touching any consumer.
@Injectable({ providedIn: 'root' })
export class FoodService {
  private readonly items = FOOD_ITEMS;

  async list(query: FoodQuery = {}): Promise<FoodListResponse> {
    let results = [...this.items];

    if (query.q) {
      const q = query.q.trim().toLowerCase();
      results = results.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.cuisine.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          f.restaurantName.toLowerCase().includes(q)
      );
    }

    if (query.veg) results = results.filter((f) => f.veg);
    if (query.nonVeg) results = results.filter((f) => !f.veg);
    if (query.bestseller) results = results.filter((f) => f.bestseller);
    if (query.spicy) results = results.filter((f) => f.tags?.includes('spicy'));
    if (query.healthy) results = results.filter((f) => f.tags?.includes('healthy'));
    if (query.fastDelivery) results = results.filter((f) => f.deliveryTime <= 20);
    if (query.under199) results = results.filter((f) => f.price < 199);
    if (query.offers) results = results.filter((f) => !!f.offer);
    if (query.topRated) results = results.filter((f) => f.rating >= 4.5);
    if (query.newArrival) results = results.filter((f) => f.tags?.includes('new'));
    if (query.minRating) results = results.filter((f) => f.rating >= query.minRating!);

    if (query.priceRange === 'under199') results = results.filter((f) => f.price < 199);
    else if (query.priceRange === '199-399') results = results.filter((f) => f.price >= 199 && f.price <= 399);
    else if (query.priceRange === '399plus') results = results.filter((f) => f.price > 399);

    switch (query.sort) {
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'price_low':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'fastest':
        results.sort((a, b) => a.deliveryTime - b.deliveryTime);
        break;
      case 'recommended':
        results.sort((a, b) => Number(b.bestseller) - Number(a.bestseller) || b.rating - a.rating);
        break;
      case 'popular':
      default:
        results.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
    }

    return { items: results, total: results.length };
  }

  getById(id: string): FoodItem | undefined {
    return this.items.find((f) => f.id === id);
  }
}
