import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardStats, AdminService } from '../../../core/services/admin.service';
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

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [AdminShellComponent, IconComponent, MiniChartComponent, InrPipe, RouterLink],
  template: `
    <app-admin-shell title="Dashboard">
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
})
export class AdminDashboardComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);

  constructor(private adminService: AdminService) {}

  async ngOnInit() {
    this.stats.set(await this.adminService.getDashboardStats());
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
