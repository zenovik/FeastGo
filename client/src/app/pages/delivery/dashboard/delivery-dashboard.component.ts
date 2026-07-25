import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import { DeliveryDashboardStats, DeliveryEarningsSummary, DeliveryService } from '../../../core/services/delivery.service';
import { ToastService } from '../../../core/services/toast.service';
import { Order } from '../../../core/models/order.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeliveryNavComponent } from '../../../shared/components/delivery-shell/delivery-nav.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

const EMPTY_STATS: DeliveryDashboardStats = {
  todayDeliveries: 0,
  pendingPickups: 0,
  activeDeliveries: 0,
  completedDeliveries: 0,
  cancelledDeliveries: 0,
  rating: { average: 0, count: 0 },
  recentDeliveries: [],
};

const EMPTY_EARNINGS: DeliveryEarningsSummary = {
  orderCount: 0,
  totalEarnings: 0,
  todayEarnings: 0,
  weeklyEarnings: 0,
  monthlyEarnings: 0,
  dailyTarget: 1000,
};

@Component({
  selector: 'app-delivery-dashboard',
  standalone: true,
  imports: [RouterLink, IconComponent, DeliveryNavComponent, InrPipe],
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
                Your account was rejected{{ partner.rejectionReason ? ': ' + partner.rejectionReason : '' }}. Contact FeastGo support for details.
              }
            </p>
          </div>
        }

        @if (partner.status === 'approved' && !partner.documentsSubmitted) {
          <div class="card-surface mt-3 flex items-center justify-between gap-3 bg-sky-50 p-4">
            <p class="text-sm font-medium text-ink-700">Add your documents to build trust with customers.</p>
            <a routerLink="/delivery/profile" class="shrink-0 rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-bold text-white">Upload now</a>
          </div>
        }

        <div class="card-surface mt-4 flex items-center justify-between p-5">
          <div class="flex items-center gap-3">
            @if (partner.photo) {
              <img [src]="partner.photo" class="h-11 w-11 rounded-full object-cover" alt="" />
            }
            <div>
              <p class="font-display text-lg font-bold text-ink-900">{{ partner.name }}</p>
              <p class="text-sm text-ink-400 capitalize">{{ partner.vehicleType }} · ⭐ {{ partner.rating.average || '—' }} ({{ partner.rating.count }})</p>
            </div>
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

        @if (activeOrder(); as active) {
          <div class="card-surface mt-4 border-2 border-ember-200 p-5">
            <p class="text-xs font-bold uppercase tracking-wide text-ember-600">Active delivery</p>
            <p class="mt-1 text-sm font-semibold text-ink-900">{{ active.restaurantName }} · #{{ active._id.slice(-6) }}</p>
            <p class="mt-0.5 text-xs capitalize text-ink-400">Status: {{ active.deliveryStatus.replaceAll('_', ' ') }}</p>
            <a routerLink="/delivery/orders" class="mt-3 inline-block rounded-lg bg-ink-900 px-4 py-2 text-xs font-bold text-white">Manage delivery</a>
          </div>
        }

        <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div class="card-surface p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Today's deliveries</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900">{{ stats().todayDeliveries }}</p>
          </div>
          <div class="card-surface p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Pending pickups</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900">{{ stats().pendingPickups }}</p>
          </div>
          <div class="card-surface p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Active deliveries</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900">{{ stats().activeDeliveries }}</p>
          </div>
          <div class="card-surface p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Completed</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900">{{ stats().completedDeliveries }}</p>
          </div>
          <div class="card-surface p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Cancelled / failed</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900">{{ stats().cancelledDeliveries }}</p>
          </div>
          <div class="card-surface p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Rating</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900">⭐ {{ stats().rating.average || '—' }}</p>
          </div>
        </div>

        <div class="card-surface mt-4 p-4">
          <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-400">
            <span>Today's target</span>
            <span>{{ earnings().todayEarnings | inr }} / {{ earnings().dailyTarget | inr }}</span>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
            <div class="h-full rounded-full bg-basil-500 transition-all" [style.width.%]="targetProgress()"></div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-3">
          <div class="card-surface p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Total earnings</p>
            <p class="mt-1 font-display text-lg font-bold text-ink-900">{{ earnings().totalEarnings | inr }}</p>
          </div>
          <div class="card-surface p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">This week</p>
            <p class="mt-1 font-display text-lg font-bold text-ink-900">{{ earnings().weeklyEarnings | inr }}</p>
          </div>
          <div class="card-surface p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">This month</p>
            <p class="mt-1 font-display text-lg font-bold text-ink-900">{{ earnings().monthlyEarnings | inr }}</p>
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
                [disabled]="!partner.isOnline || !!activeOrder()"
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

        @if (stats().recentDeliveries.length) {
          <h2 class="mt-6 font-display text-lg font-bold text-ink-900">Recent deliveries</h2>
          <div class="mt-3 space-y-2">
            @for (order of stats().recentDeliveries; track order._id) {
              <div class="card-surface flex items-center justify-between p-3.5">
                <p class="text-sm font-semibold text-ink-900">{{ order.restaurantName }}</p>
                <p class="text-sm font-bold text-ink-900">{{ order.total | inr }}</p>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class DeliveryDashboardComponent implements OnInit {
  available = signal<Order[]>([]);
  stats = signal<DeliveryDashboardStats>(EMPTY_STATS);
  earnings = signal<DeliveryEarningsSummary>(EMPTY_EARNINGS);

  targetProgress(): number {
    const e = this.earnings();
    if (!e.dailyTarget) return 0;
    return Math.min(100, Math.round((e.todayEarnings / e.dailyTarget) * 100));
  }
  activeOrder = signal<Order | null>(null);

  constructor(
    public auth: DeliveryAuthService,
    private deliveryService: DeliveryService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    if (this.auth.currentUser()?.isSuspended) return;
    const [availableRes, earningsRes, statsRes, activeRes] = await Promise.all([
      this.deliveryService.listAvailableOrders(),
      this.deliveryService.getEarnings(),
      this.deliveryService.getDashboardStats(),
      this.deliveryService.listMyOrders(),
    ]);
    this.available.set(availableRes.orders);
    this.earnings.set(earningsRes);
    this.stats.set(statsRes);
    const active = activeRes.orders.find((o) => !['delivered', 'cancelled', 'failed'].includes(o.deliveryStatus));
    this.activeOrder.set(active ?? null);
  }

  async toggleOnline() {
    const partner = this.auth.currentUser();
    if (!partner) return;
    try {
      await this.auth.setOnline(!partner.isOnline);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update status');
    }
  }

  async accept(order: Order) {
    try {
      await this.deliveryService.acceptOrder(order._id);
      this.available.update((orders) => orders.filter((o) => o._id !== order._id));
      this.toast.success('Order accepted — head to pickup');
      this.activeOrder.set(order);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not accept order');
    }
  }
}
