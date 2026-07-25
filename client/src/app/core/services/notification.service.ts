import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { AppNotification, NotificationListResponse } from '../models/notification.model';
import { NotifRole, RealtimeService } from './realtime.service';
import { ToastService } from './toast.service';

export interface NotificationFilters {
  q: string;
  type: string;
  priority: string;
  archived: boolean;
}

const BASE_PATH_BY_ROLE: Record<NotifRole, string> = {
  customer: `${API_URL}/auth/me`,
  seller: `${API_URL}/seller`,
  delivery: `${API_URL}/delivery`,
  admin: `${API_URL}/admin`,
};

const EMPTY_FILTERS: NotificationFilters = { q: '', type: '', priority: '', archived: false };

// Single shared brain behind the notification bell + notification center for
// all four roles — which role's REST endpoints and socket room to use is
// decided by whichever shell calls init() when it mounts (only one shell is
// ever active per tab, so this being a root-provided singleton is fine).
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private role: NotifRole | null = null;
  private basePath = '';

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly loading = signal(false);
  readonly hasMore = signal(false);
  readonly page = signal(1);
  readonly filters = signal<NotificationFilters>(EMPTY_FILTERS);
  // Flips true for ~1s whenever a real-time notification lands, so the bell
  // icon can play its "ring" animation off it.
  readonly justArrived = signal(false);
  readonly connected = signal(false);

  constructor(
    private http: HttpClient,
    private realtime: RealtimeService,
    private toast: ToastService,
    private router: Router
  ) {}

  init(role: NotifRole) {
    if (this.role === role && this.connected()) {
      this.refreshUnreadCount();
      return;
    }
    this.role = role;
    this.basePath = BASE_PATH_BY_ROLE[role];
    this.notifications.set([]);
    this.unreadCount.set(0);
    this.page.set(1);
    this.filters.set(EMPTY_FILTERS);

    const socket = this.realtime.connect(role);
    if (socket) {
      this.connected.set(true);
      socket.off('notification:new');
      socket.on('notification:new', (n: AppNotification) => this.handleIncoming(n));
    }
    this.refreshUnreadCount();
    // Ask once, quietly, a moment after the shell settles — never on first
    // paint, so it doesn't compete with the page's own load.
    setTimeout(() => this.requestBrowserPermission(), 4000);
  }

  disconnect() {
    this.realtime.disconnect();
    this.connected.set(false);
    this.role = null;
    this.notifications.set([]);
    this.unreadCount.set(0);
  }

  requestBrowserPermission() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    Notification.requestPermission();
  }

  private handleIncoming(n: AppNotification) {
    this.notifications.update((list) => [n, ...list]);
    this.unreadCount.update((c) => c + 1);
    this.justArrived.set(true);
    setTimeout(() => this.justArrived.set(false), 1200);

    const toastKind = n.priority === 'critical' ? 'error' : n.priority === 'high' ? 'warning' : 'info';
    this.toast.show(n.title, toastKind, { description: n.message, actionUrl: n.actionUrl ?? undefined });

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const isHidden = typeof document !== 'undefined' && document.hidden;
      if (isHidden) {
        const browserNotif = new Notification(n.title, { body: n.message, icon: '/favicon.ico', tag: n._id });
        browserNotif.onclick = () => {
          window.focus();
          if (n.actionUrl) this.router.navigateByUrl(n.actionUrl);
        };
      }
    }
  }

  private queryParams(page: number): Record<string, string> {
    const f = this.filters();
    const params: Record<string, string> = { page: String(page), limit: '20' };
    if (f.q.trim()) params['q'] = f.q.trim();
    if (f.type) params['type'] = f.type;
    if (f.priority) params['priority'] = f.priority;
    if (f.archived) params['archived'] = 'true';
    return params;
  }

  async refreshUnreadCount() {
    if (!this.basePath) return;
    try {
      const res = await firstValueFrom(
        this.http.get<NotificationListResponse>(`${this.basePath}/notifications`, { params: { page: '1', limit: '1', unreadOnly: 'true' } })
      );
      this.unreadCount.set(res.unreadCount);
    } catch {
      // silent — notifications are a non-critical enhancement
    }
  }

  async loadFirstPage() {
    this.page.set(1);
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<NotificationListResponse>(`${this.basePath}/notifications`, { params: this.queryParams(1) }));
      this.notifications.set(res.notifications);
      this.unreadCount.set(res.unreadCount);
      this.hasMore.set(res.hasMore);
    } catch {
      // silent
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore() {
    if (this.loading() || !this.hasMore()) return;
    const nextPage = this.page() + 1;
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<NotificationListResponse>(`${this.basePath}/notifications`, { params: this.queryParams(nextPage) }));
      this.notifications.update((list) => [...list, ...res.notifications]);
      this.hasMore.set(res.hasMore);
      this.page.set(nextPage);
    } catch {
      // silent
    } finally {
      this.loading.set(false);
    }
  }

  setFilters(patch: Partial<NotificationFilters>) {
    this.filters.update((f) => ({ ...f, ...patch }));
    this.loadFirstPage();
  }

  async markRead(id: string) {
    await firstValueFrom(this.http.patch(`${this.basePath}/notifications/${id}/read`, {}));
    this.notifications.update((list) => list.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    this.unreadCount.update((c) => Math.max(0, c - 1));
  }

  async markAllRead() {
    await firstValueFrom(this.http.patch(`${this.basePath}/notifications/read-all`, {}));
    this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
    this.unreadCount.set(0);
  }

  async remove(id: string) {
    const wasUnread = this.notifications().find((n) => n._id === id)?.isRead === false;
    await firstValueFrom(this.http.delete(`${this.basePath}/notifications/${id}`));
    this.notifications.update((list) => list.filter((n) => n._id !== id));
    if (wasUnread) this.unreadCount.update((c) => Math.max(0, c - 1));
  }

  async clearAll() {
    await firstValueFrom(this.http.delete(`${this.basePath}/notifications/clear-all`));
    this.notifications.set([]);
    this.unreadCount.set(0);
  }

  async archive(id: string) {
    await firstValueFrom(this.http.patch(`${this.basePath}/notifications/${id}/archive`, {}));
    this.notifications.update((list) => list.filter((n) => n._id !== id));
  }

  async restore(id: string) {
    await firstValueFrom(this.http.patch(`${this.basePath}/notifications/${id}/restore`, {}));
    this.notifications.update((list) => list.filter((n) => n._id !== id));
  }

  async bulkAction(action: 'read' | 'unread' | 'archive' | 'restore' | 'delete', ids: string[]) {
    if (!ids.length) return;
    await firstValueFrom(this.http.patch(`${this.basePath}/notifications/bulk`, { action, ids }));
    if (action === 'delete' || action === 'archive') {
      this.notifications.update((list) => list.filter((n) => !ids.includes(n._id)));
    } else if (action === 'read') {
      this.notifications.update((list) => list.map((n) => (ids.includes(n._id) ? { ...n, isRead: true } : n)));
    } else if (action === 'unread') {
      this.notifications.update((list) => list.map((n) => (ids.includes(n._id) ? { ...n, isRead: false } : n)));
    }
    await this.refreshUnreadCount();
  }

  onNotificationClick(n: AppNotification) {
    if (!n.isRead) this.markRead(n._id);
    if (n.actionUrl) this.router.navigateByUrl(n.actionUrl);
  }
}
