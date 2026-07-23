import { Component, OnInit, signal } from '@angular/core';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import { DeliveryService } from '../../../core/services/delivery.service';
import { ToastService } from '../../../core/services/toast.service';
import { Order } from '../../../core/models/order.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeliveryNavComponent } from '../../../shared/components/delivery-shell/delivery-nav.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-delivery-dashboard',
  standalone: true,
  imports: [IconComponent, DeliveryNavComponent, InrPipe],
  template: `
    <app-delivery-nav />
    <div class="container-shell max-w-3xl py-8">
      @if (auth.currentUser(); as partner) {
        @if (partner.isSuspended) {
          <div class="card-surface flex items-center gap-3 bg-ember-50 p-4">
            <app-icon name="alert-triangle" [size]="20" class="shrink-0 text-ember-600" />
            <p class="text-sm font-medium text-ink-700">
              Your account has been suspended by the admin. Contact FeastGo support for help — you can't accept deliveries until it's lifted.
            </p>
          </div>
        } @else if (partner.status !== 'approved') {
          <div class="card-surface flex items-center gap-3 p-4" [class.bg-gold-50]="partner.status === 'pending'" [class.bg-ember-50]="partner.status === 'rejected'">
            <app-icon [name]="partner.status === 'pending' ? 'clock' : 'alert-triangle'" [size]="20" class="shrink-0" [class.text-gold-600]="partner.status === 'pending'" [class.text-ember-600]="partner.status === 'rejected'" />
            <p class="text-sm font-medium text-ink-700">
              @if (partner.status === 'pending') {
                Your account is awaiting admin approval. You'll be able to accept deliveries once approved.
              } @else {
                Your account was rejected. Contact FeastGo support for details.
              }
            </p>
          </div>
        }

        <div class="card-surface mt-4 flex items-center justify-between p-5">
          <div>
            <p class="font-display text-lg font-bold text-ink-900">{{ partner.name }}</p>
            <p class="text-sm text-ink-400">{{ partner.vehicleType }}</p>
          </div>
          <button
            type="button"
            [disabled]="partner.status !== 'approved' || partner.isSuspended"
            class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
            [class.bg-basil-100]="partner.isOnline"
            [class.text-basil-700]="partner.isOnline"
            [class.bg-ink-100]="!partner.isOnline"
            [class.text-ink-600]="!partner.isOnline"
            (click)="toggleOnline()"
          >
            <span class="h-2 w-2 rounded-full" [class.bg-basil-500]="partner.isOnline" [class.bg-ink-400]="!partner.isOnline"></span>
            {{ partner.isOnline ? 'Online' : 'Offline' }}
          </button>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-4">
          <div class="card-surface p-5">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Total earnings</p>
            <p class="mt-1 font-display text-2xl font-bold text-ink-900">{{ earnings().totalEarnings | inr }}</p>
          </div>
          <div class="card-surface p-5">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Deliveries completed</p>
            <p class="mt-1 font-display text-2xl font-bold text-ink-900">{{ earnings().orderCount }}</p>
          </div>
        </div>

        <h2 class="mt-6 font-display text-lg font-bold text-ink-900">Available orders</h2>
        <div class="mt-3 space-y-2">
          @for (order of available(); track order._id) {
            <div class="card-surface flex items-center justify-between p-3.5">
              <div>
                <p class="text-sm font-semibold text-ink-900">{{ order.restaurantName }}</p>
                <p class="text-xs text-ink-400">#{{ order._id.slice(-6) }} · {{ order.total | inr }}</p>
              </div>
              <button
                type="button"
                [disabled]="!partner.isOnline"
                class="rounded-lg bg-ink-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                (click)="accept(order)"
              >
                Accept
              </button>
            </div>
          } @empty {
            <p class="text-sm text-ink-400">No orders available right now.</p>
          }
        </div>
      }
    </div>
  `,
})
export class DeliveryDashboardComponent implements OnInit {
  available = signal<Order[]>([]);
  earnings = signal<{ totalEarnings: number; orderCount: number }>({ totalEarnings: 0, orderCount: 0 });

  constructor(
    public auth: DeliveryAuthService,
    private deliveryService: DeliveryService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    if (this.auth.currentUser()?.isSuspended) return;
    const [availableRes, earningsRes] = await Promise.all([
      this.deliveryService.listAvailableOrders(),
      this.deliveryService.getEarnings(),
    ]);
    this.available.set(availableRes.orders);
    this.earnings.set(earningsRes);
  }

  async toggleOnline() {
    const partner = this.auth.currentUser();
    if (!partner) return;
    await this.auth.setOnline(!partner.isOnline);
  }

  async accept(order: Order) {
    try {
      await this.deliveryService.acceptOrder(order._id);
      this.available.update((orders) => orders.filter((o) => o._id !== order._id));
      this.toast.success('Order accepted — head to pickup');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not accept order');
    }
  }
}
