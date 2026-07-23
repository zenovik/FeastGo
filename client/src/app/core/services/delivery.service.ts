import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { Order } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  constructor(private http: HttpClient) {}

  listAvailableOrders() {
    return firstValueFrom(this.http.get<{ orders: Order[] }>(`${API_URL}/delivery/orders/available`));
  }

  listMyOrders(status?: string) {
    const params: Record<string, string> = status ? { status } : {};
    return firstValueFrom(this.http.get<{ orders: Order[] }>(`${API_URL}/delivery/orders`, { params }));
  }

  acceptOrder(id: string) {
    return firstValueFrom(this.http.post<{ order: Order }>(`${API_URL}/delivery/orders/${id}/accept`, {}));
  }

  updateOrderStatus(id: string, status: string) {
    return firstValueFrom(this.http.patch<{ order: Order }>(`${API_URL}/delivery/orders/${id}/status`, { status }));
  }

  getEarnings() {
    return firstValueFrom(this.http.get<{ totalEarnings: number; orderCount: number }>(`${API_URL}/delivery/earnings`));
  }
}
