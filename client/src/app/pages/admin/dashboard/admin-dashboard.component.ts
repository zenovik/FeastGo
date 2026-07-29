import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardStats, AdminService } from '../../../core/services/admin.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { AppNotification } from '../../../core/models/notification.model';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { MiniChartComponent, ChartPoint } from '../../../shared/components/mini-chart/mini-chart.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

interface StatCard {
  label: string;
  value: string;
  icon: string;
  link?: string;
}

interface IssueAlert {
  id: string;
  title: string;
  message: string;
}

// Exact title sent by sellerController's reportDeliveryIssue — see the same
// constant/comment in admin-shell.component.ts for why title (not type) is
// what isolates this specific event.
const DELIVERY_ISSUE_TITLE = 'Delivery issue reported';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [AdminShellComponent, IconComponent, MiniChartComponent, InrPipe, RouterLink],
  template: `
    <app-admin-shell title="Dashboard">
      @if (issueAlerts().length) {
        <div class="mb-4 space-y-2">
          @for (alert of issueAlerts(); track alert.id) {
            <div class="new-issue-alert card-surface flex items-center gap-3 border-2 border-ember-300 bg-ember-50 p-4 dark:border-ember-500/40 dark:bg-ember-500/10">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ember-500 text-white">
                <app-icon name="alert-triangle" [size]="18" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-bold text-ink-900 dark:text-white">{{ alert.title }}</p>
                <p class="truncate text-xs text-ink-600 dark:text-ink-300">{{ alert.message }}</p>
              </div>
              <a routerLink="/admin/orders" class="shrink-0 rounded-lg bg-ember-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-ember-600" (click)="dismissAlert(alert.id)">
                View
              </a>
              <button type="button" class="shrink-0 text-ink-400 hover:text-ink-700" (click)="dismissAlert(alert.id)" aria-label="Dismiss">
                <app-icon name="x" [size]="14" />
              </button>
            </div>
          }
        </div>
      }
      @if (stats(); as s) {
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          @for (card of statCards(s); track card.label) {
            <a [routerLink]="card.link ?? null" class="card-surface p-4" [class.cursor-pointer]="card.link">
              <div class="flex items-center gap-2 text-ink-400 dark:text-ink-500">
                <app-icon [name]="card.icon" [size]="16" />
                <p class="text-xs font-semibold uppercase tracking-wide">{{ card.label }}</p>
              </div>
              <p class="mt-2 font-display text-xl font-bold text-ink-900 dark:text-white">{{ card.value }}</p>
            </a>
          }
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-3">
          <div class="card-surface p-4 lg:col-span-2">
            <div class="flex items-center justify-between">
              <h2 class="font-display text-base font-bold text-ink-900 dark:text-white">Order trend (14 days)</h2>
              @if (s.growthPercent !== null) {
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-bold"
                  [class.bg-basil-100]="s.growthPercent >= 0"
                  [class.text-basil-700]="s.growthPercent >= 0"
                  [class.bg-ember-100]="s.growthPercent < 0"
                  [class.text-ember-700]="s.growthPercent < 0"
                >
                  {{ s.growthPercent >= 0 ? '+' : '' }}{{ s.growthPercent }}% vs prior 30d
                </span>
              }
            </div>
            <div class="mt-3 text-ember-500 dark:text-ember-400">
              <app-mini-chart [points]="trendPoints(s)" kind="line" color="currentColor" [height]="180" />
            </div>
          </div>

          <div class="card-surface p-4">
            <h2 class="font-display text-base font-bold text-ink-900 dark:text-white">Revenue</h2>
            <div class="mt-3 space-y-2.5 text-sm">
              <div class="flex justify-between"><span class="text-ink-500 dark:text-ink-400">Today</span><span class="font-bold text-ink-900 dark:text-white">{{ s.todayRevenue | inr }}</span></div>
              <div class="flex justify-between"><span class="text-ink-500 dark:text-ink-400">Last 7 days</span><span class="font-bold text-ink-900 dark:text-white">{{ s.weeklyRevenue | inr }}</span></div>
              <div class="flex justify-between"><span class="text-ink-500 dark:text-ink-400">Last 30 days</span><span class="font-bold text-ink-900 dark:text-white">{{ s.monthlyRevenue | inr }}</span></div>
              <div class="flex justify-between border-t border-ink-100 pt-2.5 dark:border-ink-700"><span class="text-ink-500 dark:text-ink-400">All-time</span><span class="font-bold text-ink-900 dark:text-white">{{ s.totalRevenue | inr }}</span></div>
            </div>
          </div>
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <div class="card-surface p-4">
            <h2 class="font-display text-base font-bold text-ink-900 dark:text-white">Top restaurants</h2>
            <div class="mt-3 divide-y divide-ink-100 dark:divide-ink-700">
              @for (r of s.topRestaurants; track r.id) {
                <a [routerLink]="['/admin/restaurants']" class="flex items-center justify-between py-2.5 text-sm">
                  <span class="truncate font-semibold text-ink-800 dark:text-ink-200">{{ r.name }}</span>
                  <span class="shrink-0 text-ink-500 dark:text-ink-400">{{ r.orders }} orders · {{ r.revenue | inr }}</span>
                </a>
              } @empty {
                <p class="py-3 text-sm text-ink-400">No revenue yet.</p>
              }
            </div>
          </div>

          <div class="card-surface p-4">
            <h2 class="font-display text-base font-bold text-ink-900 dark:text-white">Best-selling foods</h2>
            <div class="mt-3 divide-y divide-ink-100 dark:divide-ink-700">
              @for (f of s.bestSellingFoods; track f.name) {
                <div class="flex items-center justify-between py-2.5 text-sm">
                  <span class="truncate font-semibold text-ink-800 dark:text-ink-200">{{ f.name }}</span>
                  <span class="shrink-0 text-ink-500 dark:text-ink-400">{{ f.qty }}× · {{ f.revenue | inr }}</span>
                </div>
              } @empty {
                <p class="py-3 text-sm text-ink-400">No sales yet.</p>
              }
            </div>
          </div>
        </div>

        <div class="card-surface mt-4 overflow-hidden">
          <div class="flex items-center justify-between p-4 pb-0">
            <h2 class="font-display text-base font-bold text-ink-900 dark:text-white">Recent orders</h2>
            <a routerLink="/admin/orders" class="text-xs font-bold text-ember-600">View all</a>
          </div>
          <div class="mt-3 overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-ink-50 text-xs font-semibold uppercase text-ink-400 dark:bg-ink-900/40 dark:text-ink-500">
                <tr>
                  <th class="px-4 py-2.5">Customer</th>
                  <th class="px-4 py-2.5">Restaurant</th>
                  <th class="px-4 py-2.5">Total</th>
                  <th class="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                @for (order of s.recentOrders; track order._id) {
                  <tr class="border-t border-ink-100 dark:border-ink-800">
                    <td class="px-4 py-2.5 font-medium text-ink-900 dark:text-white">{{ order.customerName || 'Customer' }}</td>
                    <td class="px-4 py-2.5 text-ink-600 dark:text-ink-300">{{ order.restaurantName }}</td>
                    <td class="px-4 py-2.5 text-ink-600 dark:text-ink-300">{{ order.total | inr }}</td>
                    <td class="px-4 py-2.5 capitalize text-ink-600 dark:text-ink-300">{{ order.status.replaceAll('_', ' ') }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <p class="text-sm text-ink-400">Loading dashboard…</p>
      }
    </app-admin-shell>
  `,
  styles: [
    `
      @keyframes newIssuePulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(230, 96, 40, 0.25);
        }
        50% {
          box-shadow: 0 0 0 8px rgba(230, 96, 40, 0);
        }
      }
      .new-issue-alert {
        animation: newIssuePulse 1.8s ease-in-out 3;
      }
    `,
  ],
})
export class AdminDashboardComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);
  issueAlerts = signal<IssueAlert[]>([]);

  constructor(
    private adminService: AdminService,
    private realtime: RealtimeService
  ) {}

  async ngOnInit() {
    this.stats.set(await this.adminService.getDashboardStats());

    this.realtime.on<AppNotification>('notification:new', (n) => {
      if (n.title === DELIVERY_ISSUE_TITLE) {
        this.issueAlerts.update((list) => [{ id: n._id, title: n.title, message: n.message }, ...list].slice(0, 5));
      }
    });
  }

  dismissAlert(id: string) {
    this.issueAlerts.update((list) => list.filter((a) => a.id !== id));
  }

  statCards(s: DashboardStats): StatCard[] {
    return [
      { label: 'Users', value: s.totalUsers.toLocaleString(), icon: 'users', link: '/admin/users' },
      { label: 'Restaurants', value: s.totalRestaurants.toLocaleString(), icon: 'store', link: '/admin/restaurants' },
      { label: 'Sellers', value: s.totalSellers.toLocaleString(), icon: 'chef-hat', link: '/admin/sellers' },
      { label: 'Delivery partners', value: s.totalDeliveryPartners.toLocaleString(), icon: 'bike', link: '/admin/delivery-partners' },
      { label: 'Total orders', value: s.totalOrders.toLocaleString(), icon: 'receipt', link: '/admin/orders' },
      { label: 'Active orders', value: s.activeOrders.toLocaleString(), icon: 'clock' },
      { label: 'Completed', value: s.completedOrders.toLocaleString(), icon: 'check' },
      { label: 'Cancelled', value: s.cancelledOrders.toLocaleString(), icon: 'alert-triangle' },
    ];
  }

  trendPoints(s: DashboardStats): ChartPoint[] {
    return s.orderTrend.map((d) => ({ label: d.date.slice(5), value: d.count }));
  }
}
