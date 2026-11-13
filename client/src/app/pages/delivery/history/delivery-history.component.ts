import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryDashboardStats, DeliveryEarningsSummary, DeliveryService, DeliveryWeeklyPerformanceDay } from '../../../core/services/delivery.service';
import { Order } from '../../../core/models/order.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeliveryShellComponent } from '../../../shared/components/delivery-shell/delivery-shell.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

const EMPTY_EARNINGS: DeliveryEarningsSummary = {
  orderCount: 0,
  totalEarnings: 0,
  todayEarnings: 0,
  weeklyEarnings: 0,
  monthlyEarnings: 0,
  tipsReceived: 0,
  incentives: 0,
  pendingPayments: 0,
  dailyTarget: 1000,
};

const EMPTY_STATS: DeliveryDashboardStats = {
  todayDeliveries: 0,
  pendingPickups: 0,
  activeDeliveries: 0,
  completedDeliveries: 0,
  cancelledDeliveries: 0,
  failedDeliveries: 0,
  successRate: 0,
  rating: { average: 0, count: 0 },
  recentDeliveries: [],
};

type StatusFilter = 'all' | 'delivered' | 'cancelled' | 'failed';

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

@Component({
  selector: 'app-delivery-history',
  standalone: true,
  imports: [FormsModule, IconComponent, DeliveryShellComponent, InrPipe, DatePipe],
  template: `
    <app-delivery-shell title="History">
    <div>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold text-ink-900 dark:text-white">Delivery History</h1>
          <p class="mt-0.5 text-sm text-ink-400">Review your completed service records and earnings performance.</p>
        </div>
        <button type="button" class="flex items-center gap-1.5 rounded-lg bg-ember-500 px-3 py-2 text-xs font-bold text-white hover:bg-ember-600" (click)="exportCsv()">
          <app-icon name="download" [size]="14" /> Export CSV
        </button>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="card-surface p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Today's earnings</p>
          <p class="mt-1 font-display text-lg font-bold text-ink-900 dark:text-white">{{ earnings().todayEarnings | inr }}</p>
        </div>
        <div class="card-surface p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">This week</p>
          <p class="mt-1 font-display text-lg font-bold text-ink-900 dark:text-white">{{ earnings().weeklyEarnings | inr }}</p>
        </div>
        <div class="card-surface p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Total payout</p>
          <p class="mt-1 font-display text-lg font-bold text-ink-900 dark:text-white">{{ earnings().totalEarnings | inr }}</p>
        </div>
        <div class="card-surface p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Completed</p>
          <p class="mt-1 font-display text-lg font-bold text-ink-900 dark:text-white">{{ stats().completedDeliveries }} <span class="text-sm font-medium text-basil-600">· {{ stats().successRate }}%</span></p>
        </div>
      </div>

      <div class="mt-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-4">
        <div class="space-y-4 lg:col-span-2">
          <div class="flex flex-wrap gap-2">
            <div class="relative flex-1 min-w-[200px]">
              <app-icon name="search" [size]="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                [(ngModel)]="searchQuery"
                name="search"
                placeholder="Search order ID or restaurant"
                class="w-full rounded-lg border border-ink-100 py-2 pl-9 pr-3 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
              />
            </div>
            <select [(ngModel)]="statusFilter" name="statusFilter" class="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white">
              <option value="all">Status: All</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div class="space-y-2">
            @for (order of filteredOrders(); track order._id) {
              <div class="card-surface p-3.5">
                <div class="flex items-center justify-between gap-2">
                  <p class="min-w-0 truncate text-sm font-semibold text-ink-900 dark:text-white">{{ order.restaurantName }}</p>
                  <span
                    class="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold capitalize"
                    [class.bg-basil-100]="order.deliveryStatus === 'delivered'"
                    [class.text-basil-700]="order.deliveryStatus === 'delivered'"
                    [class.bg-ember-100]="order.deliveryStatus === 'failed' || order.deliveryStatus === 'cancelled'"
                    [class.text-ember-700]="order.deliveryStatus === 'failed' || order.deliveryStatus === 'cancelled'"
                  >
                    {{ order.deliveryStatus.replaceAll('_', ' ') }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-ink-400">#{{ order._id.slice(-6) }} · {{ order.createdAt | date: 'MMM d, y, h:mm a' }}</p>
                <div class="mt-1 flex items-center justify-between">
                  <p class="text-xs text-ink-400">
                    Delivery fee {{ order.deliveryFee | inr }}
                    @if (order.tip) { + tip {{ order.tip | inr }} }
                  </p>
                  <p class="text-sm font-bold text-ink-900 dark:text-white">{{ (order.deliveryFee + (order.tip || 0)) | inr }}</p>
                </div>
              </div>
            } @empty {
              <p class="mt-6 text-center text-sm text-ink-400">No deliveries match your filters.</p>
            }
          </div>
        </div>

        <div class="mt-4 space-y-4 lg:mt-0 lg:sticky lg:top-20">
          <div class="card-surface p-4">
            <h2 class="font-display text-base font-bold text-ink-900 dark:text-white">Weekly Trend</h2>
            <div class="mt-4 flex h-28 items-end gap-2">
              @for (day of weekly(); track day.day) {
                <div class="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    class="w-full rounded-t"
                    [class.bg-ember-500]="day.total === weeklyMax()"
                    [class.bg-ink-200]="day.total !== weeklyMax()"
                    [class.dark:bg-ink-600]="day.total !== weeklyMax()"
                    [style.height.%]="weeklyBarHeight(day.total)"
                    [attr.title]="day.total | inr"
                  ></div>
                  <span class="text-[11px] font-semibold text-ink-400">{{ day.day }}</span>
                </div>
              }
            </div>
          </div>

          <div class="card-surface p-4">
            <h2 class="font-display text-base font-bold text-ink-900 dark:text-white">Earnings Breakdown</h2>
            <div class="mt-3 space-y-2.5">
              <div class="flex items-center justify-between text-sm">
                <span class="flex items-center gap-2 text-ink-600 dark:text-ink-300"><span class="h-2 w-2 rounded-full bg-ember-500"></span>Base pay</span>
                <span class="font-bold text-ink-900 dark:text-white">{{ basePay() | inr }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="flex items-center gap-2 text-ink-600 dark:text-ink-300"><span class="h-2 w-2 rounded-full bg-basil-500"></span>Tips</span>
                <span class="font-bold text-ink-900 dark:text-white">{{ earnings().tipsReceived | inr }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="flex items-center gap-2 text-ink-600 dark:text-ink-300"><span class="h-2 w-2 rounded-full bg-gold-500"></span>Incentives</span>
                <span class="font-bold text-ink-900 dark:text-white">{{ earnings().incentives | inr }}</span>
              </div>
              <div class="mt-1 flex items-center justify-between border-t border-ink-100 pt-2.5 text-sm dark:border-ink-700">
                <span class="font-semibold text-ink-900 dark:text-white">Total retained</span>
                <span class="font-display font-bold text-ink-900 dark:text-white">{{ earnings().totalEarnings | inr }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </app-delivery-shell>
  `,
})
export class DeliveryHistoryComponent implements OnInit {
  orders = signal<Order[]>([]);
  earnings = signal<DeliveryEarningsSummary>(EMPTY_EARNINGS);
  stats = signal<DeliveryDashboardStats>(EMPTY_STATS);
  weekly = signal<DeliveryWeeklyPerformanceDay[]>([]);

  searchQuery = '';
  statusFilter: StatusFilter = 'all';

  weeklyMax = computed(() => Math.max(1, ...this.weekly().map((d) => d.total)));

  basePay = computed(() => Math.max(0, this.earnings().totalEarnings - this.earnings().tipsReceived - this.earnings().incentives));

  constructor(private deliveryService: DeliveryService) {}

  filteredOrders(): Order[] {
    const query = this.searchQuery.trim().toLowerCase();
    return this.orders().filter((order) => {
      if (this.statusFilter !== 'all' && order.deliveryStatus !== this.statusFilter) return false;
      if (!query) return true;
      return order.restaurantName.toLowerCase().includes(query) || order._id.toLowerCase().includes(query);
    });
  }

  async ngOnInit() {
    const [deliveredRes, cancelledRes, failedRes, earningsRes, statsRes, weeklyRes] = await Promise.all([
      this.deliveryService.listMyOrders(undefined, 'delivered'),
      this.deliveryService.listMyOrders(undefined, 'cancelled'),
      this.deliveryService.listMyOrders(undefined, 'failed'),
      this.deliveryService.getEarnings(),
      this.deliveryService.getDashboardStats(),
      this.deliveryService.getWeeklyPerformance(),
    ]);
    const all = [...deliveredRes.orders, ...cancelledRes.orders, ...failedRes.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    this.orders.set(all);
    this.earnings.set(earningsRes);
    this.stats.set(statsRes);
    this.weekly.set(weeklyRes.days);
  }

  weeklyBarHeight(total: number): number {
    return Math.max(4, Math.round((total / this.weeklyMax()) * 100));
  }

  exportCsv() {
    const rows = [
      ['Order ID', 'Restaurant', 'Date', 'Status', 'Delivery Fee', 'Tip', 'Total'],
      ...this.filteredOrders().map((o) => [
        o._id.slice(-6),
        o.restaurantName,
        new Date(o.createdAt).toLocaleString(),
        o.deliveryStatus,
        o.deliveryFee,
        o.tip || 0,
        o.deliveryFee + (o.tip || 0),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feastgo-delivery-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
