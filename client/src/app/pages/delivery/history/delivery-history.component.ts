import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Order } from '../../../core/models/order.model';
import { DeliveryEarningsSummary, DeliveryService } from '../../../core/services/delivery.service';
import { DeliveryNavComponent } from '../../../shared/components/delivery-shell/delivery-nav.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-delivery-history',
  standalone: true,
  imports: [CommonModule, DeliveryNavComponent, InrPipe],
  template: `
    <app-delivery-nav />
    <div class="container-shell max-w-3xl py-8">
      <h1 class="font-display text-2xl font-bold text-ink-900">Delivery History</h1>

      <div class="mt-4 grid grid-cols-3 gap-3">
        <div class="card-surface p-4">
          <p class="text-xs font-semibold uppercase text-ink-400">Total earnings</p>
          <p class="mt-1 font-display text-lg font-bold text-ink-900">{{ earnings().totalEarnings | inr }}</p>
        </div>
        <div class="card-surface p-4">
          <p class="text-xs font-semibold uppercase text-ink-400">This week</p>
          <p class="mt-1 font-display text-lg font-bold text-ink-900">{{ earnings().weeklyEarnings | inr }}</p>
        </div>
        <div class="card-surface p-4">
          <p class="text-xs font-semibold uppercase text-ink-400">This month</p>
          <p class="mt-1 font-display text-lg font-bold text-ink-900">{{ earnings().monthlyEarnings | inr }}</p>
        </div>
      </div>

      <div class="mt-4 space-y-2">
        @for (order of orders(); track order._id) {
          <div class="card-surface p-3.5">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-ink-900">{{ order.restaurantName }}</p>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-bold capitalize"
                [class.bg-basil-100]="order.deliveryStatus === 'delivered'"
                [class.text-basil-700]="order.deliveryStatus === 'delivered'"
                [class.bg-ember-100]="order.deliveryStatus === 'failed' || order.deliveryStatus === 'cancelled'"
                [class.text-ember-700]="order.deliveryStatus === 'failed' || order.deliveryStatus === 'cancelled'"
              >
                {{ order.deliveryStatus.replaceAll('_', ' ') }}
              </span>
            </div>
            <p class="mt-1 text-xs text-ink-400">#{{ order._id.slice(-6) }} · {{ order.createdAt | date: 'mediumDate' }}</p>
            <div class="mt-1 flex items-center justify-between">
              <p class="text-xs text-ink-400">
                Delivery fee {{ order.deliveryFee | inr }}
                @if (order.tip) { + tip {{ order.tip | inr }} }
              </p>
              <p class="text-sm font-bold text-ink-900">{{ (order.deliveryFee + (order.tip || 0)) | inr }}</p>
            </div>
          </div>
        } @empty {
          <p class="mt-6 text-center text-sm text-ink-400">No completed deliveries yet.</p>
        }
      </div>
    </div>
  `,
})
export class DeliveryHistoryComponent implements OnInit {
  orders = signal<Order[]>([]);
  earnings = signal<DeliveryEarningsSummary>({ orderCount: 0, totalEarnings: 0, todayEarnings: 0, weeklyEarnings: 0, monthlyEarnings: 0, dailyTarget: 1000 });

  constructor(private deliveryService: DeliveryService) {}

  async ngOnInit() {
    const [ordersRes, earningsRes] = await Promise.all([
      this.deliveryService.listMyOrders('delivered'),
      this.deliveryService.getEarnings(),
    ]);
    this.orders.set(ordersRes.orders);
    this.earnings.set(earningsRes);
  }
}
