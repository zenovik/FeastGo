import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Order, OrderStatus } from '../../core/models/order.model';
import { OrderService } from '../../core/services/order.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { cancelledByLabel, orderStatusBadgeClass } from '../../shared/utils/order-status';

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Delivery failed',
  returned: 'Returned to restaurant',
};

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, IconComponent, DatePipe, InrPipe],
  template: `
    <div class="container-shell max-w-2xl py-10">
      <h1 class="font-display text-2xl font-bold text-ink-900">Your orders</h1>

      @if (loading()) {
        <div class="mt-6 space-y-3">
          @for (i of [1, 2, 3]; track i) {
            <div class="card-surface h-24 animate-pulse bg-ink-100"></div>
          }
        </div>
      } @else if (orders().length === 0) {
        <div class="mt-16 flex flex-col items-center gap-3 text-center text-ink-400">
          <app-icon name="package" [size]="40" />
          <p class="text-lg font-semibold text-ink-600">No orders yet</p>
          <a routerLink="/restaurants" class="mt-2 rounded-xl bg-ember-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-ember-600">
            Order something delicious
          </a>
        </div>
      } @else {
        <div class="mt-6 space-y-3">
          @for (o of orders(); track o._id) {
            <a [routerLink]="['/orders', o._id]" class="card-surface flex items-center justify-between gap-3 p-4">
              <div>
                <p class="font-display text-base font-bold text-ink-900">{{ o.restaurantName }}</p>
                <p class="mt-0.5 text-xs text-ink-400">{{ o.createdAt | date: 'medium' }}</p>
                <p class="mt-1 text-sm text-ink-500">{{ o.items.length }} item{{ o.items.length === 1 ? '' : 's' }} · {{ o.total | inr }}</p>
                @if (o.status === 'cancelled') {
                  <p class="mt-1 text-xs text-ink-400">Cancelled by {{ cancelledByLabel(o.cancelledByRole) }}{{ o.cancellationReason ? ' · ' + o.cancellationReason : '' }}</p>
                }
              </div>
              <span
                class="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                [class]="statusClass(o.status)"
              >
                {{ statusLabel(o.status) }}
              </span>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class OrdersComponent implements OnInit {
  loading = signal(true);
  orders = signal<Order[]>([]);
  cancelledByLabel = cancelledByLabel;

  constructor(private orderService: OrderService) {}

  async ngOnInit() {
    try {
      const { orders } = await this.orderService.mine();
      this.orders.set(orders);
    } finally {
      this.loading.set(false);
    }
  }

  statusLabel(status: OrderStatus): string {
    return STATUS_LABEL[status];
  }

  statusClass(status: OrderStatus): string {
    return orderStatusBadgeClass(status);
  }
}
