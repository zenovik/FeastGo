import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';

export interface FoodCategory {
  _id: string;
  name: string;
  slug: string;
  image: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  constructor(private http: HttpClient) {}

  list() {
    return firstValueFrom(this.http.get<{ categories: FoodCategory[] }>(`${API_URL}/categories`));
  }
}
