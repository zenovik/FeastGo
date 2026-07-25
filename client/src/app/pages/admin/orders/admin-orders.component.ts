import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Order, OrderStatus } from '../../../core/models/order.model';
import { DeliveryAccount } from '../../../core/models/role-account.model';
import { AdminService } from '../../../core/services/admin.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

const STATUSES: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'rejected', 'cancelled', 'failed', 'returned'];

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [AdminShellComponent, InrPipe, FormsModule],
  template: `
    <app-admin-shell title="Orders">
      <div class="card-surface p-3.5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-bold text-ink-900 dark:text-white">Live deliveries</p>
          <button type="button" class="text-xs font-bold text-ember-600" (click)="loadLiveDeliveries()">Refresh</button>
        </div>
        <div class="mt-2 space-y-1.5">
          @for (o of liveDeliveries(); track o._id) {
            <div class="flex items-center justify-between text-sm">
              <span class="font-semibold text-ink-800 dark:text-ink-200">#{{ o._id.slice(-6) }} · {{ o.restaurantName }}</span>
              <span class="text-xs text-ink-500 dark:text-ink-400 capitalize">
                {{ partnerName(o) }} · {{ o.deliveryStatus.replaceAll('_', ' ') }}
                @if (partnerLocation(o); as loc) {
                  · <a [href]="'https://www.google.com/maps/search/?api=1&query=' + loc.lat + ',' + loc.lng" target="_blank" rel="noopener" class="text-ember-600 underline">map</a>
                }
              </span>
            </div>
          } @empty {
            <p class="text-sm text-ink-400">No active deliveries right now.</p>
          }
        </div>
      </div>

      <div class="card-surface mt-4 p-3.5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-bold text-ink-900 dark:text-white">Delivery disputes</p>
          <div class="flex items-center gap-2">
            <select [(ngModel)]="issueFilter" (ngModelChange)="loadIssues()" class="rounded-lg border border-ink-200 px-2 py-1 text-xs dark:border-ink-700 dark:bg-ink-800 dark:text-white">
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="">All</option>
            </select>
            <button type="button" class="text-xs font-bold text-ember-600" (click)="loadIssues()">Refresh</button>
          </div>
        </div>
        <div class="mt-2 space-y-2">
          @for (issue of issues(); track issue._id) {
            <div class="rounded-lg border border-ink-100 p-2.5 dark:border-ink-800">
              <div class="flex items-center justify-between text-sm">
                <span class="font-semibold text-ink-800 dark:text-ink-200">
                  {{ issue.restaurant?.name || 'Restaurant' }} · Order #{{ (issue.order?._id || '').slice(-6) }}
                </span>
                <span class="rounded-full px-2 py-0.5 text-xs font-bold" [class.bg-gold-400/15]="issue.status === 'open'" [class.text-gold-600]="issue.status === 'open'" [class.bg-basil-100]="issue.status === 'resolved'" [class.text-basil-700]="issue.status === 'resolved'">
                  {{ issue.status }}
                </span>
              </div>
              <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">{{ issue.reason }}</p>
              @if (issue.partner) {
                <p class="mt-0.5 text-xs text-ink-400">Rider: {{ issue.partner.name }} · {{ issue.partner.phone }}</p>
              }
              @if (issue.status === 'resolved') {
                <p class="mt-1 text-xs text-basil-700">Resolved: {{ issue.resolution }}</p>
              } @else if (resolvingId() === issue._id) {
                <div class="mt-2">
                  <textarea [(ngModel)]="resolutionDraft" rows="2" placeholder="How was this resolved?" class="w-full rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900"></textarea>
                  <div class="mt-1.5 flex gap-2">
                    <button type="button" [disabled]="!resolutionDraft.trim()" class="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50" (click)="resolveIssue(issue)">Mark resolved</button>
                    <button type="button" class="text-xs font-semibold text-ink-400" (click)="resolvingId.set(null)">Cancel</button>
                  </div>
                </div>
              } @else {
                <button type="button" class="mt-1.5 text-xs font-bold text-ember-600" (click)="resolvingId.set(issue._id); resolutionDraft = ''">Resolve</button>
              }
            </div>
          } @empty {
            <p class="text-sm text-ink-400">No disputes.</p>
          }
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2">
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
                        <option value="">{{ order.deliveryPartner ? 'Reassign delivery partner…' : 'Assign delivery partner…' }}</option>
                        @for (p of onlinePartners(); track p.id) {
                          <option [value]="p.id">{{ p.name }}</option>
                        }
                      </select>
                      <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 dark:border-ink-700 dark:text-ink-300" (click)="assign(order, partnerSel.value)">
                        {{ order.deliveryPartner ? 'Reassign' : 'Assign' }}
                      </button>
                    </div>
                    <p class="mt-2 text-xs text-ink-500 dark:text-ink-400">
                      Items: {{ itemSummary(order) }}
                      @if (order.deliveryPartner) {
                        · Delivery status: <span class="font-semibold capitalize">{{ order.deliveryStatus.replaceAll('_', ' ') }}</span>
                      }
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
  liveDeliveries = signal<Awaited<ReturnType<AdminService['listLiveDeliveries']>>['orders']>([]);

  issues = signal<Awaited<ReturnType<AdminService['listDeliveryIssues']>>['issues']>([]);
  issueFilter = 'open';
  resolvingId = signal<string | null>(null);
  resolutionDraft = '';

  private fetchTimer?: ReturnType<typeof setTimeout>;
  private refreshTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private adminService: AdminService,
    private toast: ToastService,
    private realtime: RealtimeService
  ) {}

  async ngOnInit() {
    await this.fetch();
    await this.loadLiveDeliveries();
    await this.loadIssues();
    const res = await this.adminService.listDeliveryPartners('approved');
    this.onlinePartners.set(res.partners.filter((p) => p.isOnline && !p.isSuspended));

    this.realtime.on<{ relatedOrder?: string | null }>('notification:new', (n) => {
      if (!n.relatedOrder) return;
      clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => {
        this.fetch();
        this.loadLiveDeliveries();
      }, 400);
    });
  }

  async loadLiveDeliveries() {
    const res = await this.adminService.listLiveDeliveries();
    this.liveDeliveries.set(res.orders);
  }

  async loadIssues() {
    const res = await this.adminService.listDeliveryIssues(this.issueFilter || undefined);
    this.issues.set(res.issues);
  }

  async resolveIssue(issue: { _id: string }) {
    const resolution = this.resolutionDraft.trim();
    if (!resolution) return;
    try {
      await this.adminService.resolveDeliveryIssue(issue._id, resolution);
      this.toast.success('Dispute resolved');
      this.resolvingId.set(null);
      await this.loadIssues();
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not resolve dispute');
    }
  }

  partnerName(o: any): string {
    return o.deliveryPartner?.name ?? 'Unassigned';
  }

  partnerLocation(o: any): { lat: number; lng: number } | null {
    const loc = o.deliveryPartner?.location;
    return loc?.lat != null && loc?.lng != null ? loc : null;
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
