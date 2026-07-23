import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { MenuCategory } from '../models/menu-item.model';
import { Restaurant, RestaurantListResponse } from '../models/restaurant.model';

export interface RestaurantQuery {
  q?: string;
  cuisine?: string;
  sort?: 'rating' | 'delivery_time' | 'cost_low' | 'cost_high' | 'relevance';
  veg?: boolean;
  page?: number;
  limit?: number;
}

export interface Review {
  _id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  constructor(private http: HttpClient) {}

  list(query: RestaurantQuery = {}) {
    const params: Record<string, string> = {};
    if (query.q) params['q'] = query.q;
    if (query.cuisine) params['cuisine'] = query.cuisine;
    if (query.sort) params['sort'] = query.sort;
    if (query.veg) params['veg'] = 'true';
    if (query.page) params['page'] = String(query.page);
    if (query.limit) params['limit'] = String(query.limit);
    return firstValueFrom(this.http.get<RestaurantListResponse>(`${API_URL}/restaurants`, { params }));
  }

  getBySlug(slug: string) {
    return firstValueFrom(this.http.get<{ restaurant: Restaurant }>(`${API_URL}/restaurants/${slug}`));
  }

  getMenu(slug: string) {
    return firstValueFrom(this.http.get<{ categories: MenuCategory[] }>(`${API_URL}/restaurants/${slug}/menu`));
  }

  getReviews(slug: string) {
    return firstValueFrom(this.http.get<{ reviews: Review[] }>(`${API_URL}/restaurants/${slug}/reviews`));
  }

  addReview(slug: string, rating: number, comment: string) {
    return firstValueFrom(
      this.http.post<{ review: Review }>(`${API_URL}/restaurants/${slug}/reviews`, { rating, comment })
    );
  }

  cuisines() {
    return firstValueFrom(this.http.get<{ cuisines: string[] }>(`${API_URL}/restaurants/cuisines`));
  }

  validateCoupon(slug: string, code: string, subtotal: number) {
    return firstValueFrom(
      this.http.post<{ code: string; discount: number }>(`${API_URL}/restaurants/${slug}/coupons/validate`, { code, subtotal })
    );
  }
}
