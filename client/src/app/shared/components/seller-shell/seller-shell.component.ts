import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SellerAuthService } from '../../../core/services/seller-auth.service';
import { SellerService } from '../../../core/services/seller.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { AppNotification } from '../../../core/models/notification.model';
import { ThemeService } from '../../../core/services/theme.service';
import { Restaurant } from '../../../core/models/restaurant.model';
import { IconComponent } from '../icon/icon.component';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/seller/dashboard', label: 'Dashboard', icon: 'grid' },
  { path: '/seller/orders', label: 'Orders', icon: 'receipt' },
  { path: '/seller/menu', label: 'Menu', icon: 'chef-hat' },
  { path: '/seller/offers', label: 'Offers', icon: 'percent' },
  { path: '/seller/reviews', label: 'Reviews', icon: 'star' },
  { path: '/seller/reports', label: 'Reports', icon: 'bar-chart' },
  { path: '/seller/settings', label: 'Settings', icon: 'settings' },
];

@Component({
  selector: 'app-seller-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, NotificationBellComponent],
  template: `
    <div class="flex min-h-screen bg-ink-50 text-ink-800 dark:bg-ink-900 dark:text-ink-100" [class.dark]="theme.dark()">
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-ink-100 bg-white transition-transform dark:border-ink-800 dark:bg-ink-800 lg:static lg:translate-x-0"
        [class.-translate-x-full]="!sidebarOpen()"
      >
        <div class="flex h-16 items-center gap-2 border-b border-ink-100 px-5 dark:border-ink-800">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-500 text-white">
            <app-icon name="chef-hat" [size]="16" />
          </span>
          <span class="truncate font-display text-lg font-extrabold text-ink-900 dark:text-white">{{ restaurant()?.name || 'Seller Panel' }}</span>
        </div>

        <nav class="space-y-1 p-3">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-ember-50 text-ember-600 dark:bg-ember-500/10 dark:text-ember-400"
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-700/50"
              (click)="sidebarOpen.set(false)"
            >
              <app-icon [name]="item.icon" [size]="18" />
              {{ item.label }}
              @if (item.label === 'Orders' && pendingOrdersCount() > 0) {
                <span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-ember-500 px-1.5 text-[11px] font-bold text-white">
                  {{ pendingOrdersCount() > 99 ? '99+' : pendingOrdersCount() }}
                </span>
              }
            </a>
          }
        </nav>

        <div class="absolute bottom-0 left-0 right-0 border-t border-ink-100 p-3 dark:border-ink-800">
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
            <p class="truncate text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">{{ auth.currentUser()?.name || 'Seller Panel' }}</p>
            <h1 class="truncate font-display text-lg font-bold text-ink-900 dark:text-white">{{ title }}</h1>
          </div>

          <div class="ml-auto flex items-center gap-1.5 sm:gap-2">
            <app-notification-bell role="seller" [dark]="theme.dark()" [iconSize]="18" />
          </div>
        </header>

        <main class="flex-1 p-4 sm:p-6">
          <ng-content />
        </main>
      </div>
    </div>
  `,
})
export class SellerShellComponent implements OnInit, OnDestroy {
  @Input() title = '';

  navItems = NAV_ITEMS;
  sidebarOpen = signal(false);
  restaurant = signal<Restaurant | null>(null);
  pendingOrdersCount = signal(0);

  private accountPollHandle?: ReturnType<typeof setInterval>;
  private pendingCountPollHandle?: ReturnType<typeof setInterval>;
  private pendingCountRefreshTimer?: ReturnType<typeof setTimeout>;

  constructor(
    public auth: SellerAuthService,
    private sellerService: SellerService,
    public notif: NotificationService,
    private realtime: RealtimeService,
    public theme: ThemeService,
    private router: Router
  ) {}

  ngOnInit() {
    this.notif.init('seller');
    if (!this.auth.currentUser()?.isSuspended) {
      this.refreshRestaurant();
      this.refreshPendingOrdersCount();
    }

    // Rendered on every seller page (not just the dashboard), so the "Orders"
    // nav badge needs its own live refresh here rather than relying on the
    // dashboard component's own listener. This covers a new order arriving
    // instantly; it does NOT cover the seller resolving one themselves (that
    // only notifies the customer, not the seller) — the periodic poll below
    // is what self-corrects the badge in that case.
    this.realtime.on<AppNotification>('notification:new', (n) => {
      if (!n.relatedOrder) return;
      clearTimeout(this.pendingCountRefreshTimer);
      this.pendingCountRefreshTimer = setTimeout(() => this.refreshPendingOrdersCount(), 400);
    });
    this.pendingCountPollHandle = setInterval(() => this.refreshPendingOrdersCount(), 20000);

    // While pending/rejected/suspended (owner) or the restaurant is still
    // awaiting review, an admin can change that from their own session at any
    // moment — keep this tab's own account + restaurant fresh so the banner
    // and status badge clear themselves instead of needing a manual reload.
    this.accountPollHandle = setInterval(async () => {
      const owner = this.auth.currentUser();
      const restaurant = this.restaurant();
      const settled = owner && owner.status === 'approved' && !owner.isSuspended && (!restaurant || restaurant.verificationStatus === 'approved');
      if (settled) {
        if (this.accountPollHandle) clearInterval(this.accountPollHandle);
        return;
      }
      await this.auth.refreshMe();
      await this.refreshRestaurant();
    }, 15000);
  }

  private async refreshRestaurant() {
    try {
      const res = await this.auth.getMyRestaurant();
      this.restaurant.set(res.restaurant);
    } catch {
      // silent — sidebar falls back to "Seller Panel" if this fails
    }
  }

  private async refreshPendingOrdersCount() {
    try {
      const stats = await this.sellerService.getDashboardStats();
      this.pendingOrdersCount.set(stats.pendingOrders);
    } catch {
      // silent — the badge just stays at its last known value
    }
  }

  ngOnDestroy() {
    if (this.accountPollHandle) clearInterval(this.accountPollHandle);
    if (this.pendingCountPollHandle) clearInterval(this.pendingCountPollHandle);
  }

  async logout() {
    await this.auth.logout();
    this.notif.disconnect();
    this.router.navigate(['/seller/login']);
  }
}
