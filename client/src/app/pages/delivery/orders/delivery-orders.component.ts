import { Component, OnInit, signal } from '@angular/core';
import { Order } from '../../../core/models/order.model';
import { DeliveryService } from '../../../core/services/delivery.service';
import { ToastService } from '../../../core/services/toast.service';
import { DeliveryNavComponent } from '../../../shared/components/delivery-shell/delivery-nav.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

const NEXT_STATUS: Record<string, { label: string; status: string }> = {
  ready_for_pickup: { label: 'Confirm pickup', status: 'out_for_delivery' },
  out_for_delivery: { label: 'Mark delivered', status: 'delivered' },
};

@Component({
  selector: 'app-delivery-orders',
  standalone: true,
  imports: [DeliveryNavComponent, InrPipe],
  template: `
    <app-delivery-nav />
    <div class="container-shell max-w-3xl py-8">
      <h1 class="font-display text-2xl font-bold text-ink-900">My Deliveries</h1>

      <div class="mt-4 space-y-2">
        @for (order of orders(); track order._id) {
          <div class="card-surface p-4">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-ink-900">{{ order.restaurantName }}</p>
              <span class="rounded-full bg-ink-50 px-2.5 py-1 text-xs font-bold capitalize text-ink-600">{{ order.status.replaceAll('_', ' ') }}</span>
            </div>
            <p class="mt-1 text-xs text-ink-400">#{{ order._id.slice(-6) }} · {{ order.total | inr }}</p>
            <p class="mt-1 text-xs text-ink-400">{{ order.address.line1 }}, {{ order.address.area }}, {{ order.address.city }}</p>
            @if (nextAction(order.status); as action) {
              <button type="button" class="mt-3 rounded-lg bg-ink-900 px-4 py-2 text-xs font-bold text-white" (click)="advance(order, action.status)">
                {{ action.label }}
              </button>
            }
          </div>
        } @empty {
          <p class="mt-6 text-center text-sm text-ink-400">No active deliveries.</p>
        }
      </div>
    </div>
  `,
})
export class DeliveryOrdersComponent implements OnInit {
  orders = signal<Order[]>([]);

  constructor(
    private deliveryService: DeliveryService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.refresh();
  }

  private async refresh() {
    const [pickup, delivering] = await Promise.all([
      this.deliveryService.listMyOrders('ready_for_pickup'),
      this.deliveryService.listMyOrders('out_for_delivery'),
    ]);
    this.orders.set([...pickup.orders, ...delivering.orders]);
  }

  nextAction(status: string) {
    return NEXT_STATUS[status];
  }

  async advance(order: Order, status: string) {
    try {
      await this.deliveryService.updateOrderStatus(order._id, status);
      if (status === 'delivered') {
        this.orders.update((orders) => orders.filter((o) => o._id !== order._id));
      } else {
        await this.refresh();
      }
      this.toast.success(status === 'delivered' ? 'Delivery completed' : 'Marked as picked up');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update order');
    }
  }
}
