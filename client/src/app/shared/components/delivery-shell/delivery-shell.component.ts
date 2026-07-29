import { Component, Input, OnDestroy, OnInit, effect, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import { DeliveryService } from '../../../core/services/delivery.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { AppNotification } from '../../../core/models/notification.model';
import { ThemeService } from '../../../core/services/theme.service';
import { IconComponent } from '../icon/icon.component';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/delivery/dashboard', label: 'Dashboard', icon: 'grid' },
  { path: '/delivery/orders', label: 'Orders', icon: 'receipt' },
  { path: '/delivery/history', label: 'History', icon: 'history' },
  { path: '/delivery/profile', label: 'Profile', icon: 'user' },
  { path: '/delivery/settings', label: 'Settings', icon: 'settings' },
];

@Component({
  selector: 'app-delivery-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, NotificationBellComponent],
  template: `
    <div class="flex min-h-screen bg-ink-50 text-ink-800 dark:bg-ink-900 dark:text-ink-100" [class.dark]="theme.dark()">
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto border-r border-ink-100 bg-white transition-transform dark:border-ink-800 dark:bg-ink-800 lg:static lg:translate-x-0"
        [class.-translate-x-full]="!sidebarOpen()"
      >
        <div class="flex h-16 items-center gap-2 border-b border-ink-100 px-5 dark:border-ink-800">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-500 text-white">
            <app-icon name="bike" [size]="16" />
          </span>
          <span class="font-display text-lg font-extrabold text-ink-900 dark:text-white">Delivery Panel</span>
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
            <p class="truncate text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">{{ auth.currentUser()?.name || 'Delivery Panel' }}</p>
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

            <app-notification-bell role="delivery" [dark]="theme.dark()" [iconSize]="18" />
          </div>
        </header>

        <main class="flex-1 p-4 sm:p-6">
          <ng-content />
        </main>
      </div>
    </div>
  `,
})
export class DeliveryShellComponent implements OnInit, OnDestroy {
  @Input() title = '';

  navItems = NAV_ITEMS;
  sidebarOpen = signal(false);
  pendingOrdersCount = signal(0);

  private accountPollHandle?: ReturnType<typeof setInterval>;
  private pendingCountPollHandle?: ReturnType<typeof setInterval>;
  private pendingCountRefreshTimer?: ReturnType<typeof setTimeout>;

  constructor(
    public auth: DeliveryAuthService,
    private deliveryService: DeliveryService,
    public notif: NotificationService,
    private realtime: RealtimeService,
    public theme: ThemeService,
    private router: Router
  ) {
    effect(() => {
      const serverTheme = this.auth.currentUser()?.theme;
      if (serverTheme) this.theme.syncFromServer(serverTheme);
    });
  }

  ngOnInit() {
    this.notif.init('delivery');
    if (!this.auth.currentUser()?.isSuspended) {
      this.refreshPendingOrdersCount();
    }

    // Rendered on every delivery page (not just the dashboard), so the
    // "Orders" nav badge needs its own live refresh here rather than relying
    // on the dashboard component's own listener. This covers a new
    // assignment arriving instantly; it does NOT cover the partner resolving
    // one themselves (accept/pickup/etc. only notify the customer/seller,
    // not the partner) — the periodic poll below is what self-corrects the
    // badge in that case.
    this.realtime.on<AppNotification>('notification:new', (n) => {
      if (!n.relatedOrder) return;
      clearTimeout(this.pendingCountRefreshTimer);
      this.pendingCountRefreshTimer = setTimeout(() => this.refreshPendingOrdersCount(), 400);
    });
    this.pendingCountPollHandle = setInterval(() => this.refreshPendingOrdersCount(), 20000);

    // While pending/rejected/suspended, an admin can change that status at
    // any moment from their own session — keep this tab's own account fresh
    // so the banner clears itself instead of needing a manual reload.
    this.accountPollHandle = setInterval(async () => {
      const partner = this.auth.currentUser();
      if (!partner || (partner.status === 'approved' && !partner.isSuspended)) {
        if (this.accountPollHandle) clearInterval(this.accountPollHandle);
        return;
      }
      await this.auth.refreshMe();
    }, 15000);
  }

  ngOnDestroy() {
    if (this.accountPollHandle) clearInterval(this.accountPollHandle);
    if (this.pendingCountPollHandle) clearInterval(this.pendingCountPollHandle);
  }

  private async refreshPendingOrdersCount() {
    try {
      const stats = await this.deliveryService.getDashboardStats();
      this.pendingOrdersCount.set(stats.pendingPickups);
    } catch {
      // silent — the badge just stays at its last known value
    }
  }

  async logout() {
    await this.auth.logout();
    this.notif.disconnect();
    this.router.navigate(['/delivery/login']);
  }
}
