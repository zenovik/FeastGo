import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Order, OrderStatus } from '../../core/models/order.model';
import { OrderService } from '../../core/services/order.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { InrPipe } from '../../shared/pipes/inr.pipe';

const STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'placed', label: 'Order placed', icon: 'check' },
  { status: 'confirmed', label: 'Confirmed by restaurant', icon: 'chef-hat' },
  { status: 'preparing', label: 'Preparing your food', icon: 'flame' },
  { status: 'out_for_delivery', label: 'Out for delivery', icon: 'bike' },
  { status: 'delivered', label: 'Delivered', icon: 'package' },
];

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [RouterLink, IconComponent, DatePipe, InrPipe],
  template: `
    <div class="container-shell max-w-xl py-10">
      @if (loading()) {
        <div class="h-64 animate-pulse rounded-2xl bg-ink-100"></div>
      } @else if (order(); as o) {
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Order #{{ o._id.slice(-6) }}</p>
            <h1 class="font-display text-xl font-bold text-ink-900">{{ o.restaurantName }}</h1>
          </div>
          <a routerLink="/orders" class="text-sm font-semibold text-ember-600 hover:text-ember-700">All orders</a>
        </div>

        @if (o.status === 'cancelled') {
          <div class="card-surface mt-6 flex items-center gap-3 p-4 text-ember-700">
            <app-icon name="alert-triangle" [size]="20" />
            <p class="text-sm font-semibold">This order was cancelled.</p>
          </div>
        } @else {
          <div class="card-surface mt-6 p-5">
            <p class="text-sm text-ink-500">
              @if (o.status === 'delivered') {
                Delivered — enjoy your meal!
              } @else {
                Estimated delivery in ~{{ o.etaMinutes }} minutes
              }
            </p>

            <ol class="mt-5 space-y-0">
              @for (step of steps; track step.status; let last = $last) {
                <li class="relative flex gap-3 pb-7 last:pb-0">
                  @if (!last) {
                    <span
                      class="absolute left-[15px] top-8 h-full w-0.5"
                      [class]="stepIndex(step.status) < currentIndex() ? 'bg-basil-500' : 'bg-ink-100'"
                    ></span>
                  }
                  <span
                    class="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    [class]="
                      stepIndex(step.status) <= currentIndex()
                        ? 'bg-basil-500 text-white'
                        : 'bg-ink-100 text-ink-400'
                    "
                  >
                    <app-icon [name]="step.icon" [size]="16" />
                  </span>
                  <div class="pt-1">
                    <p
                      class="text-sm font-semibold"
                      [class]="stepIndex(step.status) <= currentIndex() ? 'text-ink-900' : 'text-ink-400'"
                    >
                      {{ step.label }}
                    </p>
                    @if (timeFor(step.status); as t) {
                      <p class="text-xs text-ink-400">{{ t | date: 'shortTime' }}</p>
                    }
                  </div>
                </li>
              }
            </ol>
          </div>
        }

        <div class="card-surface mt-4 p-4">
          <h2 class="font-display text-sm font-bold text-ink-900">Delivering to</h2>
          <p class="mt-1 text-sm text-ink-500">{{ o.address.line1 }}, {{ o.address.area }}, {{ o.address.city }}</p>
        </div>

        <div class="card-surface mt-4 p-4">
          <h2 class="font-display text-sm font-bold text-ink-900">Order summary</h2>
          <div class="mt-2 space-y-1 text-sm text-ink-500">
            @for (item of o.items; track item.name) {
              <div class="flex justify-between">
                <span>{{ item.qty }} × {{ item.name }}</span>
                <span>{{ item.price * item.qty | inr }}</span>
              </div>
            }
          </div>
          <div class="mt-3 flex justify-between border-t border-ink-100 pt-3 text-sm font-bold text-ink-900">
            <span>Total</span><span>{{ o.total | inr }}</span>
          </div>
        </div>
      }
    </div>
  `,
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
  steps = STEPS;
  loading = signal(true);
  order = signal<Order | null>(null);
  private pollHandle?: ReturnType<typeof setInterval>;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    await this.fetch(id);
    this.loading.set(false);
    this.pollHandle = setInterval(() => this.fetch(id), 3000);
  }

  ngOnDestroy() {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }

  private async fetch(id: string) {
    try {
      const { order } = await this.orderService.get(id);
      this.order.set(order);
      if (order.status === 'delivered' || order.status === 'cancelled') {
        if (this.pollHandle) clearInterval(this.pollHandle);
      }
    } catch {
      // keep last known state
    }
  }

  stepIndex(status: OrderStatus): number {
    return STEPS.findIndex((s) => s.status === status);
  }

  currentIndex(): number {
    const status = this.order()?.status;
    return status ? this.stepIndex(status) : -1;
  }

  timeFor(status: OrderStatus): string | null {
    return this.order()?.statusHistory.find((h) => h.status === status)?.at ?? null;
  }
}
