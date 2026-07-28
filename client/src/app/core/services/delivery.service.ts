import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { DeliveryOrderDetail, Order } from '../models/order.model';
import { OrderMessage } from '../models/message.model';

export interface DeliveryDashboardStats {
  todayDeliveries: number;
  pendingPickups: number;
  activeDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  rating: { average: number; count: number };
  recentDeliveries: Order[];
}

export interface DeliveryEarningsSummary {
  orderCount: number;
  totalEarnings: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  tipsReceived: number;
  incentives: number;
  pendingPayments: number;
  dailyTarget: number;
}

export interface DeliveryWeeklyPerformanceDay {
  day: string;
  total: number;
}

export interface DeliveryEarningRow {
  _id: string;
  order: { _id: string; restaurantName: string; total: number } | null;
  baseFee: number;
  tip: number;
  bonus: number;
  total: number;
  paid: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  constructor(private http: HttpClient) {}

  listAvailableOrders() {
    return firstValueFrom(this.http.get<{ orders: Order[] }>(`${API_URL}/delivery/orders/available`));
  }

  listMyOrders(status?: string, deliveryStatus?: string) {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    if (deliveryStatus) params['deliveryStatus'] = deliveryStatus;
    return firstValueFrom(this.http.get<{ orders: Order[] }>(`${API_URL}/delivery/orders`, { params }));
  }

  getOrderDetail(id: string) {
    return firstValueFrom(this.http.get<{ order: DeliveryOrderDetail; sellerPhone: string }>(`${API_URL}/delivery/orders/${id}`));
  }

  acceptOrder(id: string) {
    return firstValueFrom(this.http.post<{ order: Order }>(`${API_URL}/delivery/orders/${id}/accept`, {}));
  }

  rejectOrder(id: string, reason: string) {
    return firstValueFrom(this.http.post<{ order: Order }>(`${API_URL}/delivery/orders/${id}/reject`, { reason }));
  }

  updateDeliveryStatus(id: string, status: string, extra: { otp?: string; proofImage?: string; reason?: string } = {}) {
    return firstValueFrom(this.http.patch<{ order: Order }>(`${API_URL}/delivery/orders/${id}/status`, { status, ...extra }));
  }

  updateLocation(lat: number, lng: number) {
    return firstValueFrom(this.http.patch<{ location: { lat: number; lng: number } }>(`${API_URL}/delivery/location`, { lat, lng }));
  }

  getEarnings() {
    return firstValueFrom(this.http.get<DeliveryEarningsSummary>(`${API_URL}/delivery/earnings`));
  }

  getDashboardStats() {
    return firstValueFrom(this.http.get<DeliveryDashboardStats>(`${API_URL}/delivery/dashboard/stats`));
  }

  getWeeklyPerformance() {
    return firstValueFrom(this.http.get<{ days: DeliveryWeeklyPerformanceDay[] }>(`${API_URL}/delivery/dashboard/weekly-performance`));
  }

  listEarningsHistory(page = 1, limit = 20) {
    return firstValueFrom(
      this.http.get<{ earnings: DeliveryEarningRow[]; total: number; page: number; limit: number }>(`${API_URL}/delivery/earnings/history`, {
        params: { page: String(page), limit: String(limit) },
      })
    );
  }

  listMessages(orderId: string, withRole: 'customer' | 'seller') {
    return firstValueFrom(this.http.get<{ messages: OrderMessage[] }>(`${API_URL}/delivery/orders/${orderId}/messages`, { params: { with: withRole } }));
  }

  sendMessage(orderId: string, withRole: 'customer' | 'seller', text: string) {
    return firstValueFrom(this.http.post<{ message: OrderMessage }>(`${API_URL}/delivery/orders/${orderId}/messages`, { text }, { params: { with: withRole } }));
  }
}
