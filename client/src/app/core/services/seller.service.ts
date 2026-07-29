import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { MenuItem } from '../models/menu-item.model';
import { Order, SellerOrderDetail } from '../models/order.model';
import { Restaurant } from '../models/restaurant.model';
import { OrderMessage, UnreadMessageCounts } from '../models/message.model';
import { requestWithProgress } from '../../shared/utils/http-progress';

export interface SellerCoupon {
  _id: string;
  code: string;
  offerType: 'discount' | 'bogo' | 'combo' | 'flash';
  discountType: 'percent' | 'flat';
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  timesUsed: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  buyQty: number;
  getQty: number;
  comboItems: string[];
  comboPrice: number | null;
  applicableItems: string[];
}

export interface SellerReview {
  _id: string;
  userName: string;
  rating: number;
  comment: string;
  sellerReply: { text: string; at: string | null };
  createdAt: string;
}

export interface OrderQuery {
  status?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
}

export interface DashboardStats {
  todayOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  preparingOrders: number;
  readyForPickup: number;
  outForDelivery: number;
  deliveredOrders: number;
  cancelledOrders: number;
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalCustomers: number;
  bestSellingItems: { name: string; qty: number; revenue: number }[];
  recentOrders: Order[];
  orderTrend: { date: string; count: number; revenue: number }[];
}

export interface RevenueReport {
  from: string;
  to: string;
  totalRevenue: number;
  totalOrders: number;
  daily: { date: string; orders: number; revenue: number; cancelled: number }[];
}

@Injectable({ providedIn: 'root' })
export class SellerService {
  // Single shared source of truth for "the current seller's restaurant" —
  // previously the dashboard, settings, and profile-card each held their own
  // independent copy fetched separately, so an edit made through one could
  // sit stale in another until that page's own next fetch. Every page now
  // reads this signal and calls refreshRestaurant()/updateRestaurant() on it
  // instead of keeping a local copy.
  private readonly restaurantSig = signal<Restaurant | null>(null);
  readonly restaurant = this.restaurantSig.asReadonly();

  constructor(private http: HttpClient) {}

  async refreshRestaurant() {
    const res = await firstValueFrom(this.http.get<{ restaurant: Restaurant | null }>(`${API_URL}/seller/restaurant`));
    this.restaurantSig.set(res.restaurant);
    return res.restaurant;
  }

  setRestaurant(restaurant: Restaurant | null) {
    this.restaurantSig.set(restaurant);
  }

  async updateRestaurant(payload: Partial<Restaurant>, onProgress?: (pct: number) => void) {
    const res = await requestWithProgress<{ restaurant: Restaurant }>(
      this.http.patch<{ restaurant: Restaurant }>(`${API_URL}/seller/restaurant`, payload, { reportProgress: true, observe: 'events' }),
      onProgress
    );
    this.restaurantSig.set(res.restaurant);
    return res;
  }

  updateCategoryOrder(categoryOrder: string[]) {
    return firstValueFrom(
      this.http.patch<{ categoryOrder: string[] }>(`${API_URL}/seller/restaurant/category-order`, { categoryOrder })
    );
  }

  listMenu() {
    return firstValueFrom(this.http.get<{ items: MenuItem[] }>(`${API_URL}/seller/menu`));
  }

  createMenuItem(payload: Partial<MenuItem>, onProgress?: (pct: number) => void) {
    return requestWithProgress<{ item: MenuItem }>(
      this.http.post<{ item: MenuItem }>(`${API_URL}/seller/menu`, payload, { reportProgress: true, observe: 'events' }),
      onProgress
    );
  }

  updateMenuItem(id: string, payload: Partial<MenuItem>, onProgress?: (pct: number) => void) {
    return requestWithProgress<{ item: MenuItem }>(
      this.http.patch<{ item: MenuItem }>(`${API_URL}/seller/menu/${id}`, payload, { reportProgress: true, observe: 'events' }),
      onProgress
    );
  }

  deleteMenuItem(id: string) {
    return firstValueFrom(this.http.delete(`${API_URL}/seller/menu/${id}`));
  }

  duplicateMenuItem(id: string) {
    return firstValueFrom(this.http.post<{ item: MenuItem }>(`${API_URL}/seller/menu/${id}/duplicate`, {}));
  }

  reorderMenuItems(items: { id: string; sortOrder: number }[]) {
    return firstValueFrom(this.http.patch<{ message: string }>(`${API_URL}/seller/menu/reorder`, { items }));
  }

  listOrders(query: OrderQuery = {}) {
    const params: Record<string, string> = {};
    if (query.status) params['status'] = query.status;
    if (query.paymentMethod) params['paymentMethod'] = query.paymentMethod;
    if (query.dateFrom) params['dateFrom'] = query.dateFrom;
    if (query.dateTo) params['dateTo'] = query.dateTo;
    if (query.q) params['q'] = query.q;
    return firstValueFrom(this.http.get<{ orders: Order[] }>(`${API_URL}/seller/orders`, { params }));
  }

  getOrderDetail(id: string) {
    return firstValueFrom(this.http.get<{ order: SellerOrderDetail }>(`${API_URL}/seller/orders/${id}`));
  }

  updateOrderStatus(id: string, status: string) {
    return firstValueFrom(this.http.patch<{ order: Order }>(`${API_URL}/seller/orders/${id}/status`, { status }));
  }

  updateOrderNotes(id: string, notes: string) {
    return firstValueFrom(this.http.patch<{ order: Order }>(`${API_URL}/seller/orders/${id}/notes`, { notes }));
  }

  bulkUpdateOrderStatus(orderIds: string[], status: string) {
    return firstValueFrom(
      this.http.post<{ updated: string[]; skipped: string[] }>(`${API_URL}/seller/orders/bulk-status`, { orderIds, status })
    );
  }

  cancelOrder(id: string, reason: string) {
    return firstValueFrom(this.http.post<{ order: Order }>(`${API_URL}/seller/orders/${id}/cancel`, { reason }));
  }

  listCoupons() {
    return firstValueFrom(this.http.get<{ coupons: SellerCoupon[] }>(`${API_URL}/seller/coupons`));
  }

  createCoupon(payload: Partial<SellerCoupon>) {
    return firstValueFrom(this.http.post<{ coupon: SellerCoupon }>(`${API_URL}/seller/coupons`, payload));
  }

  updateCoupon(id: string, payload: Partial<SellerCoupon>) {
    return firstValueFrom(this.http.patch<{ coupon: SellerCoupon }>(`${API_URL}/seller/coupons/${id}`, payload));
  }

  deleteCoupon(id: string) {
    return firstValueFrom(this.http.delete(`${API_URL}/seller/coupons/${id}`));
  }

  listReviews(rating?: number) {
    const params: Record<string, string> = rating ? { rating: String(rating) } : {};
    return firstValueFrom(this.http.get<{ reviews: SellerReview[] }>(`${API_URL}/seller/reviews`, { params }));
  }

  replyToReview(id: string, text: string) {
    return firstValueFrom(this.http.post<{ review: SellerReview }>(`${API_URL}/seller/reviews/${id}/reply`, { text }));
  }

  getReviewAnalytics() {
    return firstValueFrom(
      this.http.get<{ byStar: Record<number, number>; total: number; average: number }>(`${API_URL}/seller/reviews/analytics`)
    );
  }

  getEarnings() {
    return firstValueFrom(this.http.get<{ totalEarnings: number; orderCount: number }>(`${API_URL}/seller/earnings`));
  }

  getDashboardStats() {
    return firstValueFrom(this.http.get<DashboardStats>(`${API_URL}/seller/dashboard/stats`));
  }

  getRevenueReport(dateFrom?: string, dateTo?: string) {
    const params: Record<string, string> = {};
    if (dateFrom) params['dateFrom'] = dateFrom;
    if (dateTo) params['dateTo'] = dateTo;
    return firstValueFrom(this.http.get<RevenueReport>(`${API_URL}/seller/reports/revenue`, { params }));
  }

  getTopItemsReport(limit = 10) {
    return firstValueFrom(
      this.http.get<{ items: { name: string; qty: number; revenue: number; orders: number }[] }>(`${API_URL}/seller/reports/top-items`, {
        params: { limit: String(limit) },
      })
    );
  }

  getPeakHoursReport() {
    return firstValueFrom(this.http.get<{ byHour: { hour: number; count: number }[] }>(`${API_URL}/seller/reports/peak-hours`));
  }

  getCustomerInsights() {
    return firstValueFrom(
      this.http.get<{ topCustomers: { name: string; phone: string; orders: number; spent: number }[]; totalCustomers: number; repeatCustomers: number }>(
        `${API_URL}/seller/reports/customers`
      )
    );
  }

  listMessages(orderId: string) {
    return firstValueFrom(this.http.get<{ messages: OrderMessage[] }>(`${API_URL}/seller/orders/${orderId}/messages`));
  }

  sendMessage(orderId: string, text: string) {
    return firstValueFrom(this.http.post<{ message: OrderMessage }>(`${API_URL}/seller/orders/${orderId}/messages`, { text }));
  }

  getUnreadMessageCount() {
    return firstValueFrom(this.http.get<UnreadMessageCounts>(`${API_URL}/seller/messages/unread-count`));
  }

  reportDeliveryIssue(orderId: string, reason: string) {
    return firstValueFrom(this.http.post<{ issue: unknown }>(`${API_URL}/seller/orders/${orderId}/report-issue`, { reason }));
  }

  changePassword(currentPassword: string, newPassword: string) {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${API_URL}/seller/auth/change-password`, { currentPassword, newPassword })
    );
  }
}
