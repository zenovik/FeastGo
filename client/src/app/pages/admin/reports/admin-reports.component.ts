import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { MiniChartComponent, ChartPoint } from '../../../shared/components/mini-chart/mini-chart.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

type Tab = 'sales' | 'customers' | 'restaurants' | 'sellers' | 'delivery' | 'revenue';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [AdminShellComponent, IconComponent, MiniChartComponent, InrPipe, FormsModule],
  template: `
    <app-admin-shell title="Reports &amp; Analytics">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap gap-1.5">
          @for (t of tabs; track t.id) {
            <button
              type="button"
              class="rounded-full border px-3 py-1.5 text-xs font-bold"
              [class.border-ember-500]="tab() === t.id"
              [class.text-ember-600]="tab() === t.id"
              [class.bg-ember-50]="tab() === t.id"
              [class.border-ink-200]="tab() !== t.id"
              [class.text-ink-500]="tab() !== t.id"
              (click)="tab.set(t.id)"
            >
              {{ t.label }}
            </button>
          }
        </div>
        <button type="button" class="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-bold text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800" (click)="exportCsv()">
          <app-icon name="download" [size]="14" /> Export CSV
        </button>
      </div>

      @if (tab() === 'sales') {
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <input type="date" [(ngModel)]="dateFrom" (ngModelChange)="loadSales()" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-white" />
          <input type="date" [(ngModel)]="dateTo" (ngModelChange)="loadSales()" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-white" />
        </div>
        @if (sales(); as s) {
          <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-2">
            <div class="card-surface p-4"><p class="text-xs font-semibold uppercase text-ink-400">Total revenue</p><p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ s.totalRevenue | inr }}</p></div>
            <div class="card-surface p-4"><p class="text-xs font-semibold uppercase text-ink-400">Total orders</p><p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ s.totalOrders }}</p></div>
          </div>
          <div class="card-surface mt-3 p-4 text-ember-500 dark:text-ember-400">
            <app-mini-chart [points]="salesPoints(s)" kind="bar" color="currentColor" [height]="180" />
          </div>
        }
      }

      @if (tab() === 'customers') {
        @if (customers(); as c) {
          <div class="mt-4 grid grid-cols-2 gap-3">
            <div class="card-surface p-4"><p class="text-xs font-semibold uppercase text-ink-400">Total customers</p><p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ c.totalCustomers }}</p></div>
            <div class="card-surface p-4"><p class="text-xs font-semibold uppercase text-ink-400">Repeat customers</p><p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ c.repeatCustomers }}</p></div>
          </div>
          <div class="card-surface mt-3 divide-y divide-ink-100 dark:divide-ink-700">
            @for (row of c.topCustomers; track row.phone) {
              <div class="flex items-center justify-between px-4 py-2.5 text-sm">
                <span class="font-semibold text-ink-800 dark:text-ink-200">{{ row.name }}</span>
                <span class="text-ink-500 dark:text-ink-400">{{ row.orders }} orders · {{ row.spent | inr }}</span>
              </div>
            }
          </div>
        }
      }

      @if (tab() === 'restaurants') {
        <div class="card-surface mt-4 divide-y divide-ink-100 dark:divide-ink-700">
          @for (r of restaurants(); track r.id) {
            <div class="flex items-center justify-between px-4 py-2.5 text-sm">
              <span class="font-semibold text-ink-800 dark:text-ink-200">{{ r.name }}</span>
              <span class="text-ink-500 dark:text-ink-400">{{ r.orders }} orders · {{ r.revenue | inr }}</span>
            </div>
          } @empty {
            <p class="px-4 py-6 text-center text-sm text-ink-400">No data yet.</p>
          }
        </div>
      }

      @if (tab() === 'sellers') {
        <div class="card-surface mt-4 divide-y divide-ink-100 dark:divide-ink-700">
          @for (s of sellers(); track s.id) {
            <div class="flex items-center justify-between px-4 py-2.5 text-sm">
              <span class="font-semibold text-ink-800 dark:text-ink-200">{{ s.businessName }} <span class="text-xs capitalize text-ink-400">({{ s.status }})</span></span>
              <span class="text-ink-500 dark:text-ink-400">{{ s.orders }} orders · {{ s.revenue | inr }}</span>
            </div>
          } @empty {
            <p class="px-4 py-6 text-center text-sm text-ink-400">No data yet.</p>
          }
        </div>
      }

      @if (tab() === 'delivery') {
        <div class="card-surface mt-4 divide-y divide-ink-100 dark:divide-ink-700">
          @for (p of deliveryPartners(); track p.id) {
            <div class="flex items-center justify-between px-4 py-2.5 text-sm">
              <span class="font-semibold text-ink-800 dark:text-ink-200">{{ p.name }} <span class="h-2 w-2 inline-block rounded-full" [class.bg-basil-500]="p.isOnline" [class.bg-ink-200]="!p.isOnline"></span></span>
              <span class="text-ink-500 dark:text-ink-400">{{ p.deliveries }} deliveries · {{ p.earnings | inr }}</span>
            </div>
          } @empty {
            <p class="px-4 py-6 text-center text-sm text-ink-400">No data yet.</p>
          }
        </div>
      }

      @if (tab() === 'revenue') {
        @if (revenue(); as r) {
          <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="card-surface p-4"><p class="text-xs font-semibold uppercase text-ink-400">Subtotal</p><p class="mt-1 font-bold text-ink-900 dark:text-white">{{ r.totals.subtotal | inr }}</p></div>
            <div class="card-surface p-4"><p class="text-xs font-semibold uppercase text-ink-400">Delivery fees</p><p class="mt-1 font-bold text-ink-900 dark:text-white">{{ r.totals.deliveryFees | inr }}</p></div>
            <div class="card-surface p-4"><p class="text-xs font-semibold uppercase text-ink-400">Taxes</p><p class="mt-1 font-bold text-ink-900 dark:text-white">{{ r.totals.taxes | inr }}</p></div>
            <div class="card-surface p-4"><p class="text-xs font-semibold uppercase text-ink-400">Discounts</p><p class="mt-1 font-bold text-ink-900 dark:text-white">{{ r.totals.discounts | inr }}</p></div>
          </div>
          <div class="card-surface mt-3 divide-y divide-ink-100 dark:divide-ink-700">
            @for (m of r.byPaymentMethod; track m.method) {
              <div class="flex items-center justify-between px-4 py-2.5 text-sm">
                <span class="uppercase font-semibold text-ink-800 dark:text-ink-200">{{ m.method }}</span>
                <span class="text-ink-500 dark:text-ink-400">{{ m.count }} orders · {{ m.total | inr }}</span>
              </div>
            }
          </div>
        }
      }
    </app-admin-shell>
  `,
})
export class AdminReportsComponent implements OnInit {
  tab = signal<Tab>('sales');
  tabs: { id: Tab; label: string }[] = [
    { id: 'sales', label: 'Sales' },
    { id: 'customers', label: 'Customers' },
    { id: 'restaurants', label: 'Restaurants' },
    { id: 'sellers', label: 'Sellers' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'revenue', label: 'Revenue breakdown' },
  ];

  dateFrom = '';
  dateTo = '';

  sales = signal<Awaited<ReturnType<AdminService['getSalesReport']>> | null>(null);
  customers = signal<Awaited<ReturnType<AdminService['getCustomerReport']>> | null>(null);
  restaurants = signal<{ id: string; name: string; revenue: number; orders: number }[]>([]);
  sellers = signal<{ id: string; businessName: string; status: string; revenue: number; orders: number }[]>([]);
  deliveryPartners = signal<{ id: string; name: string; status: string; isOnline: boolean; deliveries: number; earnings: number }[]>([]);
  revenue = signal<Awaited<ReturnType<AdminService['getRevenueBreakdown']>> | null>(null);

  constructor(private adminService: AdminService) {}

  async ngOnInit() {
    const [sales, customers, restaurants, sellers, delivery, revenue] = await Promise.all([
      this.adminService.getSalesReport(),
      this.adminService.getCustomerReport(),
      this.adminService.getRestaurantReport(),
      this.adminService.getSellerReport(),
      this.adminService.getDeliveryReport(),
      this.adminService.getRevenueBreakdown(),
    ]);
    this.sales.set(sales);
    this.customers.set(customers);
    this.restaurants.set(restaurants.restaurants);
    this.sellers.set(sellers.sellers);
    this.deliveryPartners.set(delivery.partners);
    this.revenue.set(revenue);
  }

  async loadSales() {
    this.sales.set(await this.adminService.getSalesReport(this.dateFrom || undefined, this.dateTo || undefined));
  }

  salesPoints(s: { daily: { date: string; revenue: number }[] }): ChartPoint[] {
    return s.daily.map((d) => ({ label: d.date.slice(5), value: d.revenue }));
  }

  exportCsv() {
    let rows: string[] = [];
    if (this.tab() === 'sales' && this.sales()) {
      rows = ['Date,Orders,Revenue,Cancelled', ...this.sales()!.daily.map((d) => `${d.date},${d.orders},${d.revenue},${d.cancelled}`)];
    } else if (this.tab() === 'customers' && this.customers()) {
      rows = ['Name,Phone,Orders,Spent', ...this.customers()!.topCustomers.map((c) => `"${c.name}",${c.phone},${c.orders},${c.spent}`)];
    } else if (this.tab() === 'restaurants') {
      rows = ['Restaurant,Orders,Revenue', ...this.restaurants().map((r) => `"${r.name}",${r.orders},${r.revenue}`)];
    } else if (this.tab() === 'sellers') {
      rows = ['Business,Status,Orders,Revenue', ...this.sellers().map((s) => `"${s.businessName}",${s.status},${s.orders},${s.revenue}`)];
    } else if (this.tab() === 'delivery') {
      rows = ['Partner,Status,Online,Deliveries,Earnings', ...this.deliveryPartners().map((p) => `"${p.name}",${p.status},${p.isOnline},${p.deliveries},${p.earnings}`)];
    } else if (this.tab() === 'revenue' && this.revenue()) {
      rows = ['Method,Orders,Total', ...this.revenue()!.byPaymentMethod.map((m) => `${m.method},${m.count},${m.total}`)];
    }
    if (!rows.length) return;
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feastgo-${this.tab()}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
