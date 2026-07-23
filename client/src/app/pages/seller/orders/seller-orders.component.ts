import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Order, SellerOrderDetail } from '../../../core/models/order.model';
import { SellerService } from '../../../core/services/seller.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SellerShellComponent } from '../../../shared/components/seller-shell/seller-shell.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

const NEXT_ACTION: Record<string, { label: string; status: string }[]> = {
  placed: [
    { label: 'Accept', status: 'confirmed' },
    { label: 'Reject', status: 'rejected' },
  ],
  confirmed: [{ label: 'Start preparing', status: 'preparing' }],
  preparing: [{ label: 'Ready for pickup', status: 'ready_for_pickup' }],
};

const STATUS_OPTIONS = ['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'rejected', 'cancelled'];

const TIMELINE_STEPS = [
  { status: 'placed', label: 'Order placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'preparing', label: 'Preparing' },
  { status: 'ready_for_pickup', label: 'Ready for pickup' },
  { status: 'out_for_delivery', label: 'Out for delivery' },
  { status: 'delivered', label: 'Delivered' },
];

@Component({
  selector: 'app-seller-orders',
  standalone: true,
  imports: [FormsModule, DatePipe, UpperCasePipe, IconComponent, SellerShellComponent, InrPipe],
  template: `
    <app-seller-shell title="Orders">
      <!-- Search + filters -->
      <div class="card-surface flex flex-wrap items-center gap-2 p-3">
        <div class="relative min-w-[200px] flex-1">
          <app-icon name="search" [size]="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            [(ngModel)]="query.q"
            (ngModelChange)="scheduleFetch()"
            placeholder="Search by order # or address"
            class="w-full rounded-lg border border-ink-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900"
          />
        </div>
        <select [(ngModel)]="query.status" (ngModelChange)="fetch()" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900">
          <option value="">All statuses</option>
          @for (s of statusOptions; track s) {
            <option [value]="s">{{ s.replaceAll('_', ' ') }}</option>
          }
        </select>
        <select [(ngModel)]="query.paymentMethod" (ngModelChange)="fetch()" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900">
          <option value="">All payments</option>
          <option value="cod">Cash on delivery</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
        </select>
        <input type="date" [(ngModel)]="query.dateFrom" (ngModelChange)="fetch()" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
        <input type="date" [(ngModel)]="query.dateTo" (ngModelChange)="fetch()" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
      </div>

      <!-- Bulk actions -->
      @if (selectedIds().size > 0) {
        <div class="card-surface mt-3 flex items-center gap-3 p-3">
          <p class="text-sm font-semibold text-ink-700 dark:text-ink-200">{{ selectedIds().size }} selected</p>
          <button type="button" class="rounded-lg border border-ink-900 px-3 py-1.5 text-xs font-bold text-ink-900 dark:border-white dark:text-white" (click)="bulkUpdate('confirmed')">
            Accept
          </button>
          <button type="button" class="rounded-lg border border-ember-500 px-3 py-1.5 text-xs font-bold text-ember-600" (click)="bulkUpdate('rejected')">
            Reject
          </button>
          <button type="button" class="ml-auto text-xs font-semibold text-ink-400" (click)="clearSelection()">Clear</button>
        </div>
      }

      <div class="mt-3 space-y-2">
        @if (loading()) {
          @for (i of [1, 2, 3]; track i) {
            <div class="card-surface h-20 animate-pulse bg-ink-100"></div>
          }
        } @else {
          @for (order of orders(); track order._id) {
            <div class="card-surface overflow-hidden">
              <div class="flex items-center gap-3 p-4">
                @if (isSelectable(order.status)) {
                  <input type="checkbox" [checked]="selectedIds().has(order._id)" (change)="toggleSelect(order._id)" class="h-4 w-4 shrink-0" />
                }
                <button type="button" class="min-w-0 flex-1 text-left" (click)="toggleExpand(order)">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-semibold text-ink-900 dark:text-white">{{ order.customerName }}</p>
                    <span class="rounded-full bg-ink-50 px-2.5 py-1 text-xs font-bold capitalize text-ink-600 dark:bg-ink-700 dark:text-ink-300">
                      {{ order.status.replaceAll('_', ' ') }}
                    </span>
                  </div>
                  <p class="mt-0.5 truncate text-sm text-ink-600 dark:text-ink-300">{{ itemSummary(order) }}</p>
                  <p class="mt-1 text-xs text-ink-400">
                    {{ order.total | inr }} · {{ order.paymentMethod | uppercase }} · {{ order.createdAt | date: 'MMM d, h:mm a' }}
                  </p>
                </button>
                <app-icon [name]="expandedId() === order._id ? 'chevron_down' : 'chevron_right'" [size]="16" class="shrink-0 text-ink-400" />
              </div>

              @if (actionsFor(order.status).length) {
                <div class="flex gap-2 px-4 pb-4">
                  @for (action of actionsFor(order.status); track action.status) {
                    <button
                      type="button"
                      class="rounded-lg border px-3 py-1.5 text-xs font-bold"
                      [class.border-ember-500]="action.status === 'rejected'"
                      [class.text-ember-600]="action.status === 'rejected'"
                      [class.border-ink-900]="action.status !== 'rejected'"
                      [class.text-ink-900]="action.status !== 'rejected'"
                      [class.dark:border-white]="action.status !== 'rejected'"
                      [class.dark:text-white]="action.status !== 'rejected'"
                      (click)="updateStatus(order, action.status)"
                    >
                      {{ action.label }}
                    </button>
                  }
                </div>
              }

              @if (expandedId() === order._id) {
                <div class="border-t border-ink-100 p-4 dark:border-ink-700">
                  @if (detailLoading()) {
                    <div class="h-24 animate-pulse rounded-lg bg-ink-100 dark:bg-ink-700"></div>
                  } @else if (detail(); as d) {
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <!-- Timeline -->
                      <div>
                        <h4 class="text-xs font-bold uppercase tracking-wide text-ink-400">Order timeline</h4>
                        <ol class="mt-2 space-y-2">
                          @for (step of timelineSteps; track step.status) {
                            <li class="flex items-center gap-2 text-sm">
                              <span
                                class="h-2 w-2 shrink-0 rounded-full"
                                [class.bg-basil-500]="timeFor(d, step.status)"
                                [class.bg-ink-200]="!timeFor(d, step.status)"
                              ></span>
                              <span [class.text-ink-900]="timeFor(d, step.status)" [class.dark:text-white]="timeFor(d, step.status)" [class.text-ink-400]="!timeFor(d, step.status)">
                                {{ step.label }}
                              </span>
                              @if (timeFor(d, step.status); as t) {
                                <span class="ml-auto text-xs text-ink-400">{{ t | date: 'h:mm a' }}</span>
                              }
                            </li>
                          }
                        </ol>
                      </div>

                      <!-- Customer + delivery -->
                      <div class="space-y-3">
                        <div>
                          <h4 class="text-xs font-bold uppercase tracking-wide text-ink-400">Customer</h4>
                          <p class="mt-1 text-sm font-semibold text-ink-900 dark:text-white">{{ d.user.name }}</p>
                          <p class="text-xs text-ink-400">{{ d.user.phone }}</p>
                          <p class="mt-1 text-xs text-ink-500">{{ d.address.line1 }}, {{ d.address.area }}, {{ d.address.city }}</p>
                        </div>
                        @if (d.deliveryPartner) {
                          <div>
                            <h4 class="text-xs font-bold uppercase tracking-wide text-ink-400">Delivery partner</h4>
                            <p class="mt-1 text-sm font-semibold text-ink-900 dark:text-white">{{ d.deliveryPartner.name }}</p>
                            <p class="text-xs text-ink-400">{{ d.deliveryPartner.phone }} · {{ d.deliveryPartner.vehicleType }}</p>
                          </div>
                        }
                      </div>
                    </div>

                    <div class="mt-4">
                      <h4 class="text-xs font-bold uppercase tracking-wide text-ink-400">Order notes</h4>
                      <textarea
                        [(ngModel)]="notesDraft"
                        rows="2"
                        placeholder="Internal note for this order…"
                        class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900"
                      ></textarea>
                      <button type="button" class="mt-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-700 dark:border-ink-700 dark:text-ink-200" (click)="saveNotes(d)">
                        Save note
                      </button>
                    </div>

                    <div class="mt-4 flex gap-2">
                      <button type="button" class="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-700 dark:border-ink-700 dark:text-ink-200" (click)="printInvoice(d)">
                        <app-icon name="printer" [size]="14" /> Print / Download Invoice
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          } @empty {
            <p class="mt-6 text-center text-sm text-ink-400">No orders match your filters.</p>
          }
        }
      </div>
    </app-seller-shell>

    <!-- Printable invoice (hidden on screen, shown only in print) -->
    @if (detail(); as d) {
      <div class="hidden print:block" id="invoice-print-area">
        <h1>FeastGo — Invoice</h1>
        <p>Order #{{ d._id.slice(-6) }} · {{ d.createdAt | date: 'medium' }}</p>
        <p>Customer: {{ d.user.name }} ({{ d.user.phone }})</p>
        <p>Delivering to: {{ d.address.line1 }}, {{ d.address.area }}, {{ d.address.city }}</p>
        <table style="width: 100%; margin-top: 16px; border-collapse: collapse;">
          <thead>
            <tr><th style="text-align:left; border-bottom: 1px solid #000;">Item</th><th style="text-align:right; border-bottom: 1px solid #000;">Qty</th><th style="text-align:right; border-bottom: 1px solid #000;">Price</th></tr>
          </thead>
          <tbody>
            @for (item of d.items; track item.name) {
              <tr><td>{{ item.name }}</td><td style="text-align:right;">{{ item.qty }}</td><td style="text-align:right;">{{ item.price * item.qty | inr }}</td></tr>
            }
          </tbody>
        </table>
        <p style="margin-top: 12px; font-weight: bold;">Total: {{ d.total | inr }}</p>
      </div>
    }
  `,
})
export class SellerOrdersComponent implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal(true);
  statusOptions = STATUS_OPTIONS;
  timelineSteps = TIMELINE_STEPS;

  query = { q: '', status: '', paymentMethod: '', dateFrom: '', dateTo: '' };
  selectedIds = signal<Set<string>>(new Set());

  expandedId = signal<string | null>(null);
  detail = signal<SellerOrderDetail | null>(null);
  detailLoading = signal(false);
  notesDraft = '';

  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private sellerService: SellerService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.fetch();
  }

  scheduleFetch() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.fetch(), 300);
  }

  async fetch() {
    this.loading.set(true);
    try {
      const res = await this.sellerService.listOrders({
        q: this.query.q || undefined,
        status: this.query.status || undefined,
        paymentMethod: this.query.paymentMethod || undefined,
        dateFrom: this.query.dateFrom || undefined,
        dateTo: this.query.dateTo || undefined,
      });
      this.orders.set(res.orders);
    } finally {
      this.loading.set(false);
    }
  }

  actionsFor(status: string) {
    return NEXT_ACTION[status] ?? [];
  }

  itemSummary(order: Order): string {
    return order.items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.name}` : i.name)).join(', ');
  }

  isSelectable(status: string): boolean {
    return status in NEXT_ACTION;
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  toggleSelect(id: string) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  async bulkUpdate(status: string) {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    try {
      const res = await this.sellerService.bulkUpdateOrderStatus(ids, status);
      this.toast.success(`Updated ${res.updated.length} order${res.updated.length === 1 ? '' : 's'}`);
      if (res.skipped.length) this.toast.error(`${res.skipped.length} order(s) couldn't be updated`);
      this.selectedIds.set(new Set());
      await this.fetch();
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Bulk update failed');
    }
  }

  async updateStatus(order: Order, status: string) {
    try {
      const res = await this.sellerService.updateOrderStatus(order._id, status);
      this.orders.update((orders) => orders.map((o) => (o._id === order._id ? res.order : o)));
      this.toast.success(`Order marked as ${status.replaceAll('_', ' ')}`);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update order');
    }
  }

  async toggleExpand(order: Order) {
    if (this.expandedId() === order._id) {
      this.expandedId.set(null);
      this.detail.set(null);
      return;
    }
    this.expandedId.set(order._id);
    this.detail.set(null);
    this.detailLoading.set(true);
    try {
      const res = await this.sellerService.getOrderDetail(order._id);
      this.detail.set(res.order);
      this.notesDraft = res.order.sellerNotes ?? '';
    } finally {
      this.detailLoading.set(false);
    }
  }

  timeFor(d: SellerOrderDetail, status: string): string | null {
    return d.statusHistory.find((h) => h.status === status)?.at ?? null;
  }

  async saveNotes(d: SellerOrderDetail) {
    try {
      await this.sellerService.updateOrderNotes(d._id, this.notesDraft);
      this.toast.success('Note saved');
    } catch {
      this.toast.error('Could not save note');
    }
  }

  printInvoice(_d: SellerOrderDetail) {
    window.print();
  }
}
