import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { Address } from '../models/user.model';
import { Order } from '../models/order.model';

export interface PlaceOrderPayload {
  restaurantSlug: string;
  items: { menuItemId: string; qty: number }[];
  address: Address;
  paymentMethod: 'card' | 'upi' | 'cod';
  couponCode?: string | null;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private http: HttpClient) {}

  place(payload: PlaceOrderPayload) {
    return firstValueFrom(this.http.post<{ order: Order }>(`${API_URL}/orders`, payload));
  }

  mine() {
    return firstValueFrom(this.http.get<{ orders: Order[] }>(`${API_URL}/orders`));
  }

  get(id: string) {
    return firstValueFrom(this.http.get<{ order: Order }>(`${API_URL}/orders/${id}`));
  }

  cancel(id: string) {
    return firstValueFrom(this.http.post<{ order: Order }>(`${API_URL}/orders/${id}/cancel`, {}));
  }
}
