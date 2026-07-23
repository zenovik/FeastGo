import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Order, OrderStatus } from '../../../core/models/order.model';
import { DeliveryAccount } from '../../../core/models/role-account.model';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

const STATUSES: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'rejected', 'cancelled'];

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [AdminShellComponent, InrPipe, FormsModule],
  template: `
    <app-admin-shell title="Orders">
      <div class="flex flex-wrap items-center gap-2">
        <input
          [(ngModel)]="query.q"
          (ngModelChange)="scheduleFetch()"
          placeholder="Search order id, customer, restaurant…"
          class="w-64 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
        />
        <select [(ngModel)]="query.status" (ngModelChange)="fetch()" class="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white">
          <option value="">All statuses</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ s.replaceAll('_', ' ') }}</option>
          }
        </select>
        <select [(ngModel)]="query.paymentMethod" (ngModelChange)="fetch()" class="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white">
          <option value="">All payments</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
          <option value="cod">COD</option>
        </select>
        <input type="date" [(ngModel)]="query.dateFrom" (ngModelChange)="fetch()" class="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white" />
        <input type="date" [(ngModel)]="query.dateTo" (ngModelChange)="fetch()" class="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white" />
        <p class="text-sm text-ink-400">{{ orders().length }} orders</p>
      </div>

      <div class="card-surface mt-3 overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="bg-ink-50 text-xs font-semibold uppercase text-ink-400 dark:bg-ink-900/40 dark:text-ink-500">
            <tr>
              <th class="px-4 py-2.5">Customer</th>
              <th class="px-4 py-2.5">Restaurant</th>
              <th class="px-4 py-2.5">Total</th>
              <th class="px-4 py-2.5">Payment</th>
              <th class="px-4 py-2.5">Status</th>
              <th class="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            @for (order of orders(); track order._id) {
              <tr class="border-t border-ink-100 dark:border-ink-800">
                <td class="cursor-pointer px-4 py-2.5 font-medium text-ink-900 dark:text-white" (click)="toggleExpand(order)">{{ order.customerName || 'Customer' }}</td>
                <td class="px-4 py-2.5 text-ink-600 dark:text-ink-300">{{ order.restaurantName }}</td>
                <td class="px-4 py-2.5 text-ink-600 dark:text-ink-300">{{ order.total | inr }}</td>
                <td class="px-4 py-2.5 uppercase text-ink-600 dark:text-ink-300">{{ order.paymentMethod }}</td>
                <td class="px-4 py-2.5 capitalize text-ink-600 dark:text-ink-300">{{ order.status.replaceAll('_', ' ') }}</td>
                <td class="px-4 py-2.5 text-right">
                  <button type="button" class="text-xs font-bold text-ember-600" (click)="toggleExpand(order)">{{ expandedId() === order._id ? 'Close' : 'Manage' }}</button>
                </td>
              </tr>
              @if (expandedId() === order._id) {
                <tr class="border-t border-ink-100 bg-ink-50/60 dark:border-ink-800 dark:bg-ink-900/40">
                  <td colspan="6" class="px-4 py-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <select #statusSel class="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs dark:border-ink-700 dark:bg-ink-800 dark:text-white" [value]="order.status">
                        @for (s of statuses; track s) {
                          <option [value]="s">{{ s.replaceAll('_', ' ') }}</option>
                        }
                      </select>
                      <button type="button" class="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-bold text-white" (click)="updateStatus(order, statusSel.value)">Update status</button>
                      @if (order.status !== 'cancelled' && order.status !== 'delivered') {
                        <button type="button" class="rounded-lg border border-ember-500 px-3 py-1.5 text-xs font-bold text-ember-600" (click)="cancelOrder(order)">Cancel order</button>
                      }
                      <select #partnerSel class="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs dark:border-ink-700 dark:bg-ink-800 dark:text-white">
                        <option value="">Assign delivery partner…</option>
                        @for (p of onlinePartners(); track p.id) {
                          <option [value]="p.id">{{ p.name }}</option>
                        }
                      </select>
                      <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 dark:border-ink-700 dark:text-ink-300" (click)="assign(order, partnerSel.value)">Assign</button>
                    </div>
                    <p class="mt-2 text-xs text-ink-500 dark:text-ink-400">
                      Items: {{ itemSummary(order) }}
                    </p>
                  </td>
                </tr>
              }
            } @empty {
              <tr><td colspan="6" class="px-4 py-8 text-center text-sm text-ink-400">No orders found.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </app-admin-shell>
  `,
})
export class AdminOrdersComponent implements OnInit {
  orders = signal<Order[]>([]);
  statuses = STATUSES;
  query = { q: '', status: '', paymentMethod: '', dateFrom: '', dateTo: '' };
  expandedId = signal<string | null>(null);
  onlinePartners = signal<DeliveryAccount[]>([]);

  private fetchTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.fetch();
    const res = await this.adminService.listDeliveryPartners('approved');
    this.onlinePartners.set(res.partners.filter((p) => p.isOnline && !p.isSuspended));
  }

  scheduleFetch() {
    clearTimeout(this.fetchTimer);
    this.fetchTimer = setTimeout(() => this.fetch(), 300);
  }

  async fetch() {
    const res = await this.adminService.listOrders({
      q: this.query.q.trim() || undefined,
      status: this.query.status || undefined,
      paymentMethod: this.query.paymentMethod || undefined,
      dateFrom: this.query.dateFrom || undefined,
      dateTo: this.query.dateTo || undefined,
    });
    this.orders.set(res.orders);
  }

  toggleExpand(order: Order) {
    this.expandedId.set(this.expandedId() === order._id ? null : order._id);
  }

  itemSummary(order: Order): string {
    return order.items.map((i) => `${i.qty}× ${i.name}`).join(', ');
  }

  async updateStatus(order: Order, status: string) {
    const res = await this.adminService.updateOrderStatus(order._id, status);
    this.orders.update((list) => list.map((o) => (o._id === order._id ? res.order : o)));
    this.toast.success('Order status updated');
  }

  async cancelOrder(order: Order) {
    const res = await this.adminService.cancelOrder(order._id);
    this.orders.update((list) => list.map((o) => (o._id === order._id ? res.order : o)));
    this.toast.success('Order cancelled');
  }

  async assign(order: Order, partnerId: string) {
    if (!partnerId) return;
    const res = await this.adminService.assignDeliveryPartner(order._id, partnerId);
    this.orders.update((list) => list.map((o) => (o._id === order._id ? res.order : o)));
    this.toast.success('Delivery partner assigned');
  }
}
