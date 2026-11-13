import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
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
    <div class="container-shell py-8 sm:py-10">
      <section class="relative isolate overflow-hidden rounded-[28px] bg-ink-900 text-white shadow-[var(--shadow-pop)]">
        <div class="pointer-events-none absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full bg-ember-500/25 blur-3xl"></div>
        <div class="pointer-events-none absolute -bottom-36 left-1/3 -z-10 h-72 w-72 rounded-full bg-ember-700/20 blur-3xl"></div>
        <div class="relative flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-end md:justify-between md:p-10">
          <div class="max-w-xl">
            <span class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ember-300">
              <app-icon name="receipt" [size]="14" /> Order history
            </span>
            <h1 class="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Your orders</h1>
            <p class="mt-2 max-w-lg text-sm leading-6 text-white/65 sm:text-base">
              Follow every meal from the kitchen to your door, and find your past favorites in one place.
            </p>
          </div>
          <a
            routerLink="/restaurants"
            class="inline-flex w-fit items-center gap-2 rounded-xl bg-ember-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-ember-950/20 transition hover:-translate-y-0.5 hover:bg-ember-400"
          >
            Explore restaurants <app-icon name="chevron_right" [size]="16" />
          </a>
        </div>
      </section>

      <section class="mt-4 grid grid-cols-3 gap-2.5 sm:mt-5 sm:gap-4" aria-label="Order summary">
        <div class="card-surface flex min-w-0 flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ember-50 text-ember-600">
            <app-icon name="receipt" [size]="18" />
          </span>
          <div class="min-w-0">
            <p class="text-[11px] font-semibold leading-tight text-ink-400 sm:text-xs">All orders</p>
            <p class="font-display text-lg font-extrabold text-ink-900 sm:text-xl">{{ loading() ? '—' : orders().length }}</p>
          </div>
        </div>
        <div class="card-surface flex min-w-0 flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-400/15 text-gold-600">
            <app-icon name="clock" [size]="18" />
          </span>
          <div class="min-w-0">
            <p class="text-[11px] font-semibold leading-tight text-ink-400 sm:text-xs">In progress</p>
            <p class="font-display text-lg font-extrabold text-ink-900 sm:text-xl">{{ loading() ? '—' : activeOrders().length }}</p>
          </div>
        </div>
        <div class="card-surface flex min-w-0 flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-basil-100 text-basil-600">
            <app-icon name="check" [size]="18" />
          </span>
          <div class="min-w-0">
            <p class="text-[11px] font-semibold leading-tight text-ink-400 sm:text-xs">Delivered</p>
            <p class="font-display text-lg font-extrabold text-ink-900 sm:text-xl">{{ loading() ? '—' : deliveredOrders().length }}</p>
          </div>
        </div>
      </section>

      @if (loading()) {
        <div class="mt-6 space-y-3.5" aria-label="Loading orders">
          @for (i of [1, 2, 3]; track i) {
            <div class="card-surface flex h-28 animate-pulse items-center gap-4 p-5">
              <div class="h-12 w-12 rounded-2xl bg-ink-100"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 w-1/3 rounded bg-ink-100"></div>
                <div class="h-3 w-1/2 rounded bg-ink-100"></div>
                <div class="h-3 w-1/4 rounded bg-ink-100"></div>
              </div>
            </div>
          }
        </div>
      } @else if (orders().length === 0) {
        <div class="card-surface mt-6 flex flex-col items-center px-5 py-12 text-center sm:py-16">
          <span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-ember-50 text-ember-500">
            <app-icon name="package" [size]="30" />
          </span>
          <h2 class="mt-5 font-display text-xl font-bold text-ink-900">Your next favorite meal is waiting</h2>
          <p class="mt-2 max-w-md text-sm leading-6 text-ink-500">
            Once you place an order, its live progress and delivery details will show up here.
          </p>
          <a routerLink="/restaurants" class="mt-5 inline-flex items-center gap-2 rounded-xl bg-ember-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-ember-600">
            Browse restaurants <app-icon name="chevron_right" [size]="16" />
          </a>
        </div>
      } @else {
        <div class="mt-6 flex items-end justify-between gap-3">
          <div>
            <h2 class="font-display text-lg font-bold text-ink-900">Recent orders</h2>
            <p class="mt-0.5 text-sm text-ink-400">Select an order to view its details.</p>
          </div>
          <span class="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-500 shadow-sm">
            {{ orders().length }} total
          </span>
        </div>
        <div class="mt-3 space-y-3">
          @for (o of orders(); track o._id) {
            <a
              [routerLink]="['/orders', o._id]"
              class="card-surface group flex min-w-0 flex-col gap-4 p-4 transition hover:border-ember-100 sm:flex-row sm:items-center sm:gap-5 sm:p-5"
            >
              <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ember-50 text-ember-600 transition group-hover:bg-ember-500 group-hover:text-white">
                <app-icon name="store" [size]="21" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-900 sm:text-lg">{{ o.restaurantName }}</p>
                  <span class="shrink-0 rounded-full px-3 py-1 text-xs font-bold" [class]="statusClass(o.status)">
                    {{ statusLabel(o.status) }}
                  </span>
                </div>
                <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400 sm:text-sm">
                  <span>Order #{{ shortOrderId(o._id) }}</span>
                  <span aria-hidden="true">·</span>
                  <span>{{ o.createdAt | date: 'medium' }}</span>
                </p>
                <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-500">
                  <span>{{ o.items.length }} item{{ o.items.length === 1 ? '' : 's' }}</span>
                  <span aria-hidden="true">·</span>
                  <span class="font-bold text-ink-800">{{ o.total | inr }}</span>
                </div>
                @if (o.status === 'cancelled') {
                  <p class="mt-2 text-xs text-ink-400">Cancelled by {{ cancelledByLabel(o.cancelledByRole) }}{{ o.cancellationReason ? ' · ' + o.cancellationReason : '' }}</p>
                }
              </div>
              <span class="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-ember-600 sm:pl-3">
                {{ isActive(o.status) ? 'Track order' : 'View details' }}
                <app-icon name="chevron_right" [size]="16" class="transition-transform group-hover:translate-x-1" />
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
  activeOrders = computed(() => this.orders().filter((order) => this.isActive(order.status)));
  deliveredOrders = computed(() => this.orders().filter((order) => order.status === 'delivered'));
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

  isActive(status: OrderStatus): boolean {
    return ['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(status);
  }

  shortOrderId(id: string): string {
    return id.slice(-6).toUpperCase();
  }
}
