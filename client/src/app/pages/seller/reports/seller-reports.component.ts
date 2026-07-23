import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RevenueReport, SellerService } from '../../../core/services/seller.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SellerShellComponent } from '../../../shared/components/seller-shell/seller-shell.component';
import { MiniChartComponent } from '../../../shared/components/mini-chart/mini-chart.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

interface TopItem {
  name: string;
  qty: number;
  revenue: number;
  orders: number;
}

interface CustomerInsights {
  topCustomers: { name: string; phone: string; orders: number; spent: number }[];
  totalCustomers: number;
  repeatCustomers: number;
}

@Component({
  selector: 'app-seller-reports',
  standalone: true,
  imports: [FormsModule, IconComponent, SellerShellComponent, MiniChartComponent, InrPipe],
  template: `
    <app-seller-shell title="Reports &amp; Analytics">
      <div class="card-surface flex flex-wrap items-center gap-2 p-3">
        <input type="date" [(ngModel)]="dateFrom" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
        <span class="text-sm text-ink-400">to</span>
        <input type="date" [(ngModel)]="dateTo" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
        <button type="button" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-bold text-white" (click)="loadRevenue()">Apply</button>
        <button type="button" class="ml-auto flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-sm font-bold text-ink-700 dark:border-ink-700 dark:text-ink-200" (click)="downloadCsv()">
          <app-icon name="download" [size]="14" /> Download CSV
        </button>
        <button type="button" class="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-sm font-bold text-ink-700 dark:border-ink-700 dark:text-ink-200" (click)="print()">
          <app-icon name="printer" [size]="14" /> Print / PDF
        </button>
      </div>

      @if (revenue(); as r) {
        <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="card-surface p-4">
            <p class="text-xs font-semibold text-ink-400">Total revenue</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ r.totalRevenue | inr }}</p>
          </div>
          <div class="card-surface p-4">
            <p class="text-xs font-semibold text-ink-400">Total orders</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ r.totalOrders }}</p>
          </div>
          <div class="card-surface p-4">
            <p class="text-xs font-semibold text-ink-400">Total customers</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ customers()?.totalCustomers ?? 0 }}</p>
          </div>
          <div class="card-surface p-4">
            <p class="text-xs font-semibold text-ink-400">Repeat customers</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ customers()?.repeatCustomers ?? 0 }}</p>
          </div>
        </div>

        <div class="card-surface mt-4 p-5">
          <h3 class="font-display text-sm font-bold text-ink-900 dark:text-white">Daily revenue</h3>
          <div class="mt-4">
            <app-mini-chart [points]="revenuePoints(r)" kind="bar" color="#1a9f86" [width]="700" [height]="160" />
          </div>
        </div>
      }

      @if (peakHours(); as hours) {
        <div class="card-surface mt-4 p-5">
          <h3 class="font-display text-sm font-bold text-ink-900 dark:text-white">Peak order hours</h3>
          <div class="mt-4">
            <app-mini-chart [points]="hourPoints(hours)" kind="bar" color="#ff5127" [width]="700" [height]="140" [showLabels]="false" />
          </div>
        </div>
      }

      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="card-surface p-5">
          <h3 class="font-display text-sm font-bold text-ink-900 dark:text-white">Top selling foods</h3>
          <table class="mt-3 w-full text-sm">
            <thead>
              <tr class="text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                <th class="pb-2">Item</th>
                <th class="pb-2 text-right">Qty sold</th>
                <th class="pb-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              @for (item of topItems(); track item.name) {
                <tr class="border-t border-ink-100 dark:border-ink-700">
                  <td class="py-2 text-ink-900 dark:text-white">{{ item.name }}</td>
                  <td class="py-2 text-right text-ink-500">{{ item.qty }}</td>
                  <td class="py-2 text-right font-semibold text-ink-900 dark:text-white">{{ item.revenue | inr }}</td>
                </tr>
              } @empty {
                <tr><td colspan="3" class="py-4 text-center text-ink-400">No sales yet.</td></tr>
              }
            </tbody>
          </table>
        </div>

        <div class="card-surface p-5">
          <h3 class="font-display text-sm font-bold text-ink-900 dark:text-white">Top customers</h3>
          <table class="mt-3 w-full text-sm">
            <thead>
              <tr class="text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                <th class="pb-2">Customer</th>
                <th class="pb-2 text-right">Orders</th>
                <th class="pb-2 text-right">Spent</th>
              </tr>
            </thead>
            <tbody>
              @for (c of customers()?.topCustomers ?? []; track c.phone) {
                <tr class="border-t border-ink-100 dark:border-ink-700">
                  <td class="py-2 text-ink-900 dark:text-white">{{ c.name }}</td>
                  <td class="py-2 text-right text-ink-500">{{ c.orders }}</td>
                  <td class="py-2 text-right font-semibold text-ink-900 dark:text-white">{{ c.spent | inr }}</td>
                </tr>
              } @empty {
                <tr><td colspan="3" class="py-4 text-center text-ink-400">No customers yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-seller-shell>
  `,
})
export class SellerReportsComponent implements OnInit {
  revenue = signal<RevenueReport | null>(null);
  topItems = signal<TopItem[]>([]);
  peakHours = signal<{ hour: number; count: number }[] | null>(null);
  customers = signal<CustomerInsights | null>(null);

  dateFrom = '';
  dateTo = '';

  constructor(private sellerService: SellerService) {}

  async ngOnInit() {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    this.dateFrom = from.toISOString().slice(0, 10);
    this.dateTo = to.toISOString().slice(0, 10);

    await Promise.all([this.loadRevenue(), this.loadTopItems(), this.loadPeakHours(), this.loadCustomers()]);
  }

  async loadRevenue() {
    this.revenue.set(await this.sellerService.getRevenueReport(this.dateFrom, this.dateTo));
  }

  private async loadTopItems() {
    const res = await this.sellerService.getTopItemsReport(10);
    this.topItems.set(res.items);
  }

  private async loadPeakHours() {
    const res = await this.sellerService.getPeakHoursReport();
    this.peakHours.set(res.byHour);
  }

  private async loadCustomers() {
    this.customers.set(await this.sellerService.getCustomerInsights());
  }

  revenuePoints(r: RevenueReport) {
    return r.daily.map((d) => ({
      label: new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      value: d.revenue,
    }));
  }

  hourPoints(hours: { hour: number; count: number }[]) {
    return hours.map((h) => ({ label: `${h.hour}:00`, value: h.count }));
  }

  downloadCsv() {
    const r = this.revenue();
    if (!r) return;
    const rows = [
      ['Date', 'Orders', 'Revenue', 'Cancelled'],
      ...r.daily.map((d) => [d.date, String(d.orders), String(d.revenue), String(d.cancelled)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${this.dateFrom}-to-${this.dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  print() {
    window.print();
  }
}
