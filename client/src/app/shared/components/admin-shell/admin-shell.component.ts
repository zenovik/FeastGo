import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { ThemeService } from '../../../core/services/theme.service';
import { AppNotification } from '../../../core/models/notification.model';
import { IconComponent } from '../icon/icon.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ path: '/admin/dashboard', label: 'Dashboard', icon: 'grid' }],
  },
  {
    label: 'People',
    items: [
      { path: '/admin/users', label: 'Users', icon: 'users' },
      { path: '/admin/sellers', label: 'Sellers', icon: 'chef-hat' },
      { path: '/admin/delivery-partners', label: 'Delivery Partners', icon: 'bike' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { path: '/admin/restaurants', label: 'Restaurants', icon: 'store' },
      { path: '/admin/foods', label: 'Foods', icon: 'package' },
      { path: '/admin/categories', label: 'Categories', icon: 'layers' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { path: '/admin/orders', label: 'Orders', icon: 'receipt' },
      { path: '/admin/refunds', label: 'Payments & Refunds', icon: 'credit-card' },
      { path: '/admin/coupons', label: 'Coupons & Offers', icon: 'percent' },
      { path: '/admin/banners', label: 'Banners', icon: 'image' },
      { path: '/admin/reviews', label: 'Reviews', icon: 'star' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { path: '/admin/reports', label: 'Reports & Analytics', icon: 'bar-chart' },
      { path: '/admin/notifications', label: 'Notifications', icon: 'megaphone' },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/admin/settings', label: 'Settings', icon: 'settings' },
      { path: '/admin/security', label: 'Security', icon: 'shield-check' },
    ],
  },
];

const NOTIFICATION_ICON: Record<string, string> = {
  new_order: 'receipt',
  cancelled_order: 'alert-triangle',
  payment: 'credit-card',
  low_stock: 'package',
  general: 'bell',
};

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="flex min-h-screen bg-ink-50 text-ink-800 dark:bg-ink-900 dark:text-ink-100" [class.dark]="theme.dark()">
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto border-r border-ink-100 bg-white transition-transform dark:border-ink-800 dark:bg-ink-800 lg:static lg:translate-x-0"
        [class.-translate-x-full]="!sidebarOpen()"
      >
        <div class="flex h-16 items-center gap-2 border-b border-ink-100 px-5 dark:border-ink-800">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-500 text-white">
            <app-icon name="shield-check" [size]="16" />
          </span>
          <span class="font-display text-lg font-extrabold text-ink-900 dark:text-white">Admin Panel</span>
        </div>

        <nav class="space-y-4 p-3">
          @for (group of navGroups; track group.label) {
            <div>
              <p class="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">{{ group.label }}</p>
              @for (item of group.items; track item.path) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="bg-ember-50 text-ember-600 dark:bg-ember-500/10 dark:text-ember-400"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-700/50"
                  (click)="sidebarOpen.set(false)"
                >
                  <app-icon [name]="item.icon" [size]="18" />
                  {{ item.label }}
                </a>
              }
            </div>
          }
        </nav>

        <div class="border-t border-ink-100 p-3 dark:border-ink-800">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-ember-600 hover:bg-ember-50 dark:hover:bg-ember-500/10"
            (click)="logout()"
          >
            <app-icon name="log-out" [size]="18" />
            Sign out
          </button>
        </div>
      </aside>

      @if (sidebarOpen()) {
        <div class="fixed inset-0 z-30 bg-ink-900/40 lg:hidden" (click)="sidebarOpen.set(false)"></div>
      }

      <!-- Main column -->
      <div class="flex min-w-0 flex-1 flex-col">
        <!-- Sticky header -->
        <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-100 bg-white/90 px-4 backdrop-blur dark:border-ink-800 dark:bg-ink-800/90 sm:px-6">
          <button type="button" class="rounded-lg p-2 text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-700 lg:hidden" (click)="sidebarOpen.set(true)">
            <app-icon name="menu" [size]="20" />
          </button>

          <div class="min-w-0">
            <p class="truncate text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Admin Panel</p>
            <h1 class="truncate font-display text-lg font-bold text-ink-900 dark:text-white">{{ title }}</h1>
          </div>

          <div class="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              class="rounded-lg p-2 text-ink-500 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-700"
              (click)="theme.toggle()"
              [attr.aria-label]="theme.dark() ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              <app-icon [name]="theme.dark() ? 'sun' : 'moon'" [size]="18" />
            </button>

            <div class="relative" #notifWrapper>
              <button
                type="button"
                class="relative rounded-lg p-2 text-ink-500 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-700"
                (click)="toggleNotifications()"
                aria-label="Notifications"
              >
                <app-icon name="bell" [size]="18" />
                @if (unreadCount() > 0) {
                  <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-white">
                    {{ unreadCount() > 9 ? '9+' : unreadCount() }}
                  </span>
                }
              </button>

              @if (notifOpen()) {
                <div class="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-ink-100 bg-white p-2 shadow-[var(--shadow-pop)] dark:border-ink-700 dark:bg-ink-800">
                  <div class="flex items-center justify-between px-2 py-1.5">
                    <p class="text-sm font-bold text-ink-900 dark:text-white">Notifications</p>
                    @if (unreadCount() > 0) {
                      <button type="button" class="text-xs font-semibold text-ember-600" (click)="markAllRead()">Mark all read</button>
                    }
                  </div>
                  <div class="max-h-80 overflow-y-auto">
                    @for (n of notifications(); track n._id) {
                      <button
                        type="button"
                        class="flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left hover:bg-ink-50 dark:hover:bg-ink-700/50"
                        [class.bg-ember-50]="!n.isRead"
                        [class.dark:bg-ember-500/10]="!n.isRead"
                        (click)="markRead(n)"
                      >
                        <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600 dark:bg-ink-700 dark:text-ink-300">
                          <app-icon [name]="notifIcon(n.type)" [size]="14" />
                        </span>
                        <span class="min-w-0">
                          <span class="block truncate text-sm font-semibold text-ink-900 dark:text-white">{{ n.title }}</span>
                          <span class="block truncate text-xs text-ink-400 dark:text-ink-500">{{ n.message }}</span>
                        </span>
                      </button>
                    } @empty {
                      <p class="p-4 text-center text-sm text-ink-400 dark:text-ink-500">No notifications yet.</p>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </header>

        <main class="flex-1 p-4 sm:p-6">
          <ng-content />
        </main>
      </div>
    </div>
  `,
})
export class AdminShellComponent implements OnInit, OnDestroy {
  @Input() title = '';

  navGroups = NAV_GROUPS;
  sidebarOpen = signal(false);
  notifOpen = signal(false);
  notifications = signal<AppNotification[]>([]);
  unreadCount = signal(0);

  @ViewChild('notifWrapper') notifWrapper?: ElementRef<HTMLElement>;

  private pollHandle?: ReturnType<typeof setInterval>;

  constructor(
    public auth: AdminAuthService,
    public theme: ThemeService,
    private adminService: AdminService,
    private router: Router
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.notifOpen() && !this.notifWrapper?.nativeElement.contains(event.target as Node)) {
      this.notifOpen.set(false);
    }
  }

  ngOnInit() {
    this.refreshNotifications();
    this.pollHandle = setInterval(() => this.refreshNotifications(), 20000);
  }

  ngOnDestroy() {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }

  notifIcon(type: string): string {
    return NOTIFICATION_ICON[type] ?? 'bell';
  }

  private async refreshNotifications() {
    try {
      const res = await this.adminService.listNotifications();
      this.notifications.set(res.notifications.slice(0, 15));
      this.unreadCount.set(res.unreadCount);
    } catch {
      // silent — notifications are a non-critical enhancement
    }
  }

  toggleNotifications() {
    this.notifOpen.update((v) => !v);
    if (this.notifOpen()) this.refreshNotifications();
  }

  async markRead(n: AppNotification) {
    if (n.isRead) return;
    await this.adminService.markNotificationRead(n._id);
    n.isRead = true;
    this.unreadCount.update((c) => Math.max(0, c - 1));
  }

  async markAllRead() {
    await this.adminService.markAllNotificationsRead();
    this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
    this.unreadCount.set(0);
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}
