import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Order } from '../../../core/models/order.model';
import { DeliveryService } from '../../../core/services/delivery.service';
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

      <div class="mt-4 space-y-2">
        @for (order of orders(); track order._id) {
          <div class="card-surface flex items-center justify-between p-3.5">
            <div>
              <p class="text-sm font-semibold text-ink-900">{{ order.restaurantName }}</p>
              <p class="text-xs text-ink-400">#{{ order._id.slice(-6) }} · {{ order.createdAt | date: 'mediumDate' }}</p>
            </div>
            <p class="text-sm font-bold text-ink-900">{{ order.total | inr }}</p>
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

  constructor(private deliveryService: DeliveryService) {}

  async ngOnInit() {
    const res = await this.deliveryService.listMyOrders('delivered');
    this.orders.set(res.orders);
  }
}
