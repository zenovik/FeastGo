import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { User } from '../models/user.model';
import { Restaurant } from '../models/restaurant.model';
import { MenuItem } from '../models/menu-item.model';
import { Order } from '../models/order.model';
import { SellerAccount, DeliveryAccount, AdminAccount } from '../models/role-account.model';
import { AuditLog } from '../models/audit-log.model';
import { SystemSettings } from '../models/system-settings.model';
import { AppNotification } from '../models/notification.model';

export interface AdminCategory {
  _id: string;
  name: string;
  slug: string;
  image: string;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminCoupon {
  _id: string;
  code: string;
  offerType: 'discount' | 'bogo' | 'combo' | 'flash';
  discountType: 'percent' | 'flat';
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  buyQty: number;
  getQty: number;
  restaurant: string | null;
}

export interface AdminBanner {
  _id: string;
  title: string;
  image: string;
  link: string;
  placement: 'homepage' | 'promotional' | 'carousel';
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  expiresAt: string | null;
}

export interface AdminMenuItem extends MenuItem {
  restaurant: any;
}

export interface AdminReview {
  _id: string;
  restaurant: string;
  userName: string;
  rating: number;
  comment: string;
  isHidden: boolean;
  reportCount: number;
  createdAt: string;
}

export interface AdminReports {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalRestaurants: number;
  totalDeliveryPartners: number;
  ordersByStatus: { status: string; count: number }[];
}

export interface DashboardStats {
  totalUsers: number;
  totalRestaurants: number;
  totalSellers: number;
  totalDeliveryPartners: number;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  growthPercent: number | null;
  bestSellingFoods: { name: string; qty: number; revenue: number }[];
  topRestaurants: { id: string; name: string; revenue: number; orders: number }[];
  recentOrders: Order[];
  orderTrend: { date: string; count: number; revenue: number }[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  getDashboardStats() {
    return firstValueFrom(this.http.get<DashboardStats>(`${API_URL}/admin/dashboard/stats`));
  }

  // ---- Users ----
  listUsers(q?: string, status?: string) {
    const params: Record<string, string> = {};
    if (q) params['q'] = q;
    if (status) params['status'] = status;
    return firstValueFrom(this.http.get<{ users: User[] }>(`${API_URL}/admin/users`, { params }));
  }

  getUserDetail(id: string) {
    return firstValueFrom(this.http.get<{ user: User; orders: Order[] }>(`${API_URL}/admin/users/${id}`));
  }

  updateUser(id: string, payload: Partial<User>) {
    return firstValueFrom(this.http.patch<{ user: User }>(`${API_URL}/admin/users/${id}`, payload));
  }

  setUserBlocked(id: string, isBlocked: boolean) {
    return firstValueFrom(this.http.patch<{ user: User }>(`${API_URL}/admin/users/${id}/block`, { isBlocked }));
  }

  deleteUser(id: string) {
    return firstValueFrom(this.http.delete(`${API_URL}/admin/users/${id}`));
  }

  // ---- Sellers ----
  listRestaurantOwners(status?: string) {
    const params: Record<string, string> = status ? { status } : {};
    return firstValueFrom(this.http.get<{ owners: SellerAccount[] }>(`${API_URL}/admin/restaurant-owners`, { params }));
  }

  setRestaurantOwnerStatus(id: string, status: string) {
    return firstValueFrom(
      this.http.patch<{ owner: SellerAccount }>(`${API_URL}/admin/restaurant-owners/${id}/status`, { status })
    );
  }

  setRestaurantOwnerSuspension(id: string, isSuspended: boolean) {
    return firstValueFrom(
      this.http.patch<{ owner: SellerAccount }>(`${API_URL}/admin/restaurant-owners/${id}/suspend`, { isSuspended })
    );
  }

  getSellerEarnings(id: string) {
    return firstValueFrom(
      this.http.get<{ totalEarnings: number; orderCount: number; monthlyEarnings: number }>(
        `${API_URL}/admin/restaurant-owners/${id}/earnings`
      )
    );
  }

  deleteRestaurantOwner(id: string) {
    return firstValueFrom(this.http.delete(`${API_URL}/admin/restaurant-owners/${id}`));
  }

  // ---- Delivery partners ----
  listDeliveryPartners(status?: string) {
    const params: Record<string, string> = status ? { status } : {};
    return firstValueFrom(this.http.get<{ partners: DeliveryAccount[] }>(`${API_URL}/admin/delivery-partners`, { params }));
  }

  setDeliveryPartnerStatus(id: string, status: string) {
    return firstValueFrom(
      this.http.patch<{ partner: DeliveryAccount }>(`${API_URL}/admin/delivery-partners/${id}/status`, { status })
    );
  }

  setDeliveryPartnerSuspension(id: string, isSuspended: boolean) {
    return firstValueFrom(
      this.http.patch<{ partner: DeliveryAccount }>(`${API_URL}/admin/delivery-partners/${id}/suspend`, { isSuspended })
    );
  }

  getDeliveryPerformance(id: string) {
    return firstValueFrom(
      this.http.get<{ deliveriesCompleted: number; totalEarnings: number; cancelledCount: number }>(
        `${API_URL}/admin/delivery-partners/${id}/performance`
      )
    );
  }

  assignDeliveryPartner(orderId: string, partnerId: string) {
    return firstValueFrom(this.http.post<{ order: Order }>(`${API_URL}/admin/orders/${orderId}/assign-delivery`, { partnerId }));
  }

  // ---- Restaurants ----
  listRestaurants(status?: string, q?: string) {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    if (q) params['q'] = q;
    return firstValueFrom(this.http.get<{ restaurants: Restaurant[] }>(`${API_URL}/admin/restaurants`, { params }));
  }

  setRestaurantStatus(id: string, status: string) {
    return firstValueFrom(this.http.patch<{ restaurant: Restaurant }>(`${API_URL}/admin/restaurants/${id}/status`, { status }));
  }

  setRestaurantSuspension(id: string, isSuspended: boolean) {
    return firstValueFrom(this.http.patch<{ restaurant: Restaurant }>(`${API_URL}/admin/restaurants/${id}/suspend`, { isSuspended }));
  }

  updateRestaurant(id: string, payload: Partial<Restaurant>) {
    return firstValueFrom(this.http.patch<{ restaurant: Restaurant }>(`${API_URL}/admin/restaurants/${id}`, payload));
  }

  getRestaurantPerformance(id: string) {
    return firstValueFrom(
      this.http.get<{
        totalRevenue: number;
        deliveredOrders: number;
        ordersByStatus: { status: string; count: number }[];
        topItems: { name: string; qty: number }[];
      }>(`${API_URL}/admin/restaurants/${id}/performance`)
    );
  }

  deleteRestaurant(id: string) {
    return firstValueFrom(this.http.delete(`${API_URL}/admin/restaurants/${id}`));
  }

  // ---- Foods ----
  listFoods(q?: string) {
    const params: Record<string, string> = q ? { q } : {};
    return firstValueFrom(this.http.get<{ items: AdminMenuItem[] }>(`${API_URL}/admin/foods`, { params }));
  }

  listTrendingFoods() {
    return firstValueFrom(this.http.get<{ items: { name: string; qty: number }[] }>(`${API_URL}/admin/foods/trending`));
  }

  updateFood(id: string, payload: Partial<MenuItem>) {
    return firstValueFrom(this.http.patch<{ item: AdminMenuItem }>(`${API_URL}/admin/foods/${id}`, payload));
  }

  setFoodHidden(id: string, isHiddenByAdmin: boolean) {
    return firstValueFrom(this.http.patch<{ item: AdminMenuItem }>(`${API_URL}/admin/foods/${id}/hide`, { isHiddenByAdmin }));
  }

  deleteFood(id: string) {
    return firstValueFrom(this.http.delete(`${API_URL}/admin/foods/${id}`));
  }

  // ---- Orders ----
  listOrders(query: { status?: string; q?: string; paymentMethod?: string; dateFrom?: string; dateTo?: string } = {}) {
    const params: Record<string, string> = {};
    if (query.status) params['status'] = query.status;
    if (query.q) params['q'] = query.q;
    if (query.paymentMethod) params['paymentMethod'] = query.paymentMethod;
    if (query.dateFrom) params['dateFrom'] = query.dateFrom;
    if (query.dateTo) params['dateTo'] = query.dateTo;
    return firstValueFrom(this.http.get<{ orders: Order[] }>(`${API_URL}/admin/orders`, { params }));
  }

  updateOrderStatus(id: string, status: string) {
    return firstValueFrom(this.http.patch<{ order: Order }>(`${API_URL}/admin/orders/${id}/status`, { status }));
  }

  cancelOrder(id: string) {
    return firstValueFrom(this.http.post<{ order: Order }>(`${API_URL}/admin/orders/${id}/cancel`, {}));
  }

  listRefundRequests(status?: string) {
    const params: Record<string, string> = status ? { status } : {};
    return firstValueFrom(this.http.get<{ orders: Order[] }>(`${API_URL}/admin/refunds`, { params }));
  }

  updateRefundStatus(id: string, refundStatus: string, refundAmount?: number, refundReason?: string) {
    return firstValueFrom(
      this.http.patch<{ order: Order }>(`${API_URL}/admin/orders/${id}/refund`, { refundStatus, refundAmount, refundReason })
    );
  }

  // ---- Reviews ----
  listReviews(filter: { reported?: boolean; hidden?: boolean } = {}) {
    const params: Record<string, string> = {};
    if (filter.reported) params['reported'] = 'true';
    if (filter.hidden) params['hidden'] = 'true';
    return firstValueFrom(this.http.get<{ reviews: AdminReview[] }>(`${API_URL}/admin/reviews`, { params }));
  }

  setReviewHidden(id: string, isHidden: boolean) {
    return firstValueFrom(this.http.patch<{ review: AdminReview }>(`${API_URL}/admin/reviews/${id}/hide`, { isHidden }));
  }

  deleteReview(id: string) {
    return firstValueFrom(this.http.delete(`${API_URL}/admin/reviews/${id}`));
  }

  // ---- Categories ----
  listCategories() {
    return firstValueFrom(this.http.get<{ categories: AdminCategory[] }>(`${API_URL}/admin/categories`));
  }

  createCategory(payload: { name: string; image?: string }) {
    return firstValueFrom(this.http.post<{ category: AdminCategory }>(`${API_URL}/admin/categories`, payload));
  }

  updateCategory(id: string, payload: Partial<AdminCategory>) {
    return firstValueFrom(this.http.patch<{ category: AdminCategory }>(`${API_URL}/admin/categories/${id}`, payload));
  }

  reorderCategories(categoryIds: string[]) {
    return firstValueFrom(this.http.patch<{ message: string }>(`${API_URL}/admin/categories/reorder`, { categoryIds }));
  }

  deleteCategory(id: string) {
    return firstValueFrom(this.http.delete(`${API_URL}/admin/categories/${id}`));
  }

  // ---- Coupons ----
  listCoupons() {
    return firstValueFrom(this.http.get<{ coupons: AdminCoupon[] }>(`${API_URL}/admin/coupons`));
  }

  createCoupon(payload: Partial<AdminCoupon>) {
    return firstValueFrom(this.http.post<{ coupon: AdminCoupon }>(`${API_URL}/admin/coupons`, payload));
  }

  updateCoupon(id: string, payload: Partial<AdminCoupon>) {
    return firstValueFrom(this.http.patch<{ coupon: AdminCoupon }>(`${API_URL}/admin/coupons/${id}`, payload));
  }

  deleteCoupon(id: string) {
    return firstValueFrom(this.http.delete(`${API_URL}/admin/coupons/${id}`));
  }

  // ---- Banners ----
  listBanners() {
    return firstValueFrom(this.http.get<{ banners: AdminBanner[] }>(`${API_URL}/admin/banners`));
  }

  createBanner(payload: Partial<AdminBanner>) {
    return firstValueFrom(this.http.post<{ banner: AdminBanner }>(`${API_URL}/admin/banners`, payload));
  }

  updateBanner(id: string, payload: Partial<AdminBanner>) {
    return firstValueFrom(this.http.patch<{ banner: AdminBanner }>(`${API_URL}/admin/banners/${id}`, payload));
  }

  deleteBanner(id: string) {
    return firstValueFrom(this.http.delete(`${API_URL}/admin/banners/${id}`));
  }

  // ---- Reports ----
  getReports() {
    return firstValueFrom(this.http.get<AdminReports>(`${API_URL}/admin/reports`));
  }

  getSalesReport(dateFrom?: string, dateTo?: string) {
    const params: Record<string, string> = {};
    if (dateFrom) params['dateFrom'] = dateFrom;
    if (dateTo) params['dateTo'] = dateTo;
    return firstValueFrom(
      this.http.get<{
        from: string;
        to: string;
        totalRevenue: number;
        totalOrders: number;
        daily: { date: string; orders: number; revenue: number; cancelled: number }[];
      }>(`${API_URL}/admin/reports/sales`, { params })
    );
  }

  getCustomerReport() {
    return firstValueFrom(
      this.http.get<{
        topCustomers: { name: string; phone: string; orders: number; spent: number }[];
        totalCustomers: number;
        repeatCustomers: number;
      }>(`${API_URL}/admin/reports/customers`)
    );
  }

  getRestaurantReport() {
    return firstValueFrom(
      this.http.get<{ restaurants: { id: string; name: string; revenue: number; orders: number }[] }>(
        `${API_URL}/admin/reports/restaurants`
      )
    );
  }

  getSellerReport() {
    return firstValueFrom(
      this.http.get<{ sellers: { id: string; businessName: string; status: string; revenue: number; orders: number }[] }>(
        `${API_URL}/admin/reports/sellers`
      )
    );
  }

  getDeliveryReport() {
    return firstValueFrom(
      this.http.get<{
        partners: { id: string; name: string; status: string; isOnline: boolean; deliveries: number; earnings: number }[];
      }>(`${API_URL}/admin/reports/delivery`)
    );
  }

  getRevenueBreakdown() {
    return firstValueFrom(
      this.http.get<{
        byPaymentMethod: { method: string; total: number; count: number }[];
        totals: { subtotal: number; deliveryFees: number; taxes: number; discounts: number; total: number };
      }>(`${API_URL}/admin/reports/revenue-breakdown`)
    );
  }

  // ---- Notifications ----
  listNotifications(unreadOnly = false) {
    const params: Record<string, string> = unreadOnly ? { unreadOnly: 'true' } : {};
    return firstValueFrom(
      this.http.get<{ notifications: AppNotification[]; unreadCount: number }>(`${API_URL}/admin/notifications`, { params })
    );
  }

  markNotificationRead(id: string) {
    return firstValueFrom(this.http.patch<{ notification: AppNotification }>(`${API_URL}/admin/notifications/${id}/read`, {}));
  }

  markAllNotificationsRead() {
    return firstValueFrom(this.http.patch<{ message: string }>(`${API_URL}/admin/notifications/read-all`, {}));
  }

  broadcastNotification(audience: 'customer' | 'seller' | 'delivery' | 'all', title: string, message: string) {
    return firstValueFrom(
      this.http.post<{ message: string; recipientCount: number }>(`${API_URL}/admin/notifications/broadcast`, {
        audience,
        title,
        message,
      })
    );
  }

  // ---- System settings ----
  getSettings() {
    return firstValueFrom(this.http.get<{ settings: SystemSettings }>(`${API_URL}/admin/settings`));
  }

  updateSettings(payload: Partial<SystemSettings>) {
    return firstValueFrom(this.http.patch<{ settings: SystemSettings }>(`${API_URL}/admin/settings`, payload));
  }

  // ---- Security ----
  listAdmins() {
    return firstValueFrom(this.http.get<{ admins: AdminAccount[] }>(`${API_URL}/admin/admins`));
  }

  setAdminRole(id: string, adminRole: string) {
    return firstValueFrom(this.http.patch<{ admin: AdminAccount }>(`${API_URL}/admin/admins/${id}/role`, { adminRole }));
  }

  listAuditLogs(action?: string) {
    const params: Record<string, string> = action ? { action } : {};
    return firstValueFrom(this.http.get<{ logs: AuditLog[] }>(`${API_URL}/admin/audit-logs`, { params }));
  }

  listLoginHistory() {
    return firstValueFrom(this.http.get<{ logs: AuditLog[] }>(`${API_URL}/admin/login-history`));
  }
}
