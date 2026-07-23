import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
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
  limit?: number;
  page?: number;
}

@Injectable({ providedIn: 'root' })
export class FoodService {
  constructor(private http: HttpClient) {}

  list(query: FoodQuery = {}): Promise<FoodListResponse> {
    const params: Record<string, string> = {};
    if (query.q) params['q'] = query.q;
    if (query.veg) params['veg'] = 'true';
    if (query.nonVeg) params['nonVeg'] = 'true';
    if (query.bestseller) params['bestseller'] = 'true';
    if (query.spicy) params['spicy'] = 'true';
    if (query.healthy) params['healthy'] = 'true';
    if (query.fastDelivery) params['fastDelivery'] = 'true';
    if (query.under199) params['under199'] = 'true';
    if (query.offers) params['offers'] = 'true';
    if (query.topRated) params['topRated'] = 'true';
    if (query.newArrival) params['newArrival'] = 'true';
    if (query.minRating) params['minRating'] = String(query.minRating);
    if (query.priceRange) params['priceRange'] = query.priceRange;
    if (query.sort) params['sort'] = query.sort;
    if (query.limit) params['limit'] = String(query.limit);
    if (query.page) params['page'] = String(query.page);
    return firstValueFrom(this.http.get<FoodListResponse>(`${API_URL}/food-items`, { params }));
  }

  async getById(id: string): Promise<FoodItem | undefined> {
    try {
      const res = await firstValueFrom(this.http.get<{ item: FoodItem }>(`${API_URL}/food-items/${id}`));
      return res.item;
    } catch {
      return undefined;
    }
  }
}
