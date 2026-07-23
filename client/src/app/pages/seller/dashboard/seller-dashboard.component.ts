import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SellerAuthService } from '../../../core/services/seller-auth.service';
import { DashboardStats, SellerService } from '../../../core/services/seller.service';
import { ToastService } from '../../../core/services/toast.service';
import { Restaurant } from '../../../core/models/restaurant.model';
import { Order } from '../../../core/models/order.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SellerShellComponent } from '../../../shared/components/seller-shell/seller-shell.component';
import { MiniChartComponent } from '../../../shared/components/mini-chart/mini-chart.component';
import { SellerProfileCardComponent } from '../../../shared/components/seller-profile-card/seller-profile-card.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  accent: string;
  isCurrency?: boolean;
}

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, IconComponent, SellerShellComponent, MiniChartComponent, SellerProfileCardComponent, InrPipe],
  template: `
    <app-seller-shell title="Dashboard">
      @if (auth.currentUser(); as owner) {
        @if (owner.isSuspended) {
          <div class="card-surface mb-4 flex items-center gap-3 bg-ember-50 p-4">
            <app-icon name="alert-triangle" [size]="20" class="shrink-0 text-ember-600" />
            <p class="text-sm font-medium text-ink-700">
              Your partner account has been suspended by the admin. Contact FeastGo support for help — your restaurant is hidden from customers until it's lifted.
            </p>
          </div>
        } @else if (owner.status !== 'approved') {
          <div
            class="card-surface mb-4 flex items-center gap-3 p-4"
            [class.bg-gold-50]="owner.status === 'pending'"
            [class.bg-ember-50]="owner.status === 'rejected'"
          >
            <app-icon
              [name]="owner.status === 'pending' ? 'clock' : 'alert-triangle'"
              [size]="20"
              class="shrink-0"
              [class.text-gold-600]="owner.status === 'pending'"
              [class.text-ember-600]="owner.status === 'rejected'"
            />
            <p class="text-sm font-medium text-ink-700">
              @if (owner.status === 'pending') {
                Your partner account is awaiting admin approval. You can still set up your restaurant and menu in the meantime.
              } @else {
                Your partner account was rejected. Contact FeastGo support for details.
              }
            </p>
          </div>
        }

        @if (!owner.isSuspended) {
        @if (loading()) {
          <div class="card-surface h-40 animate-pulse bg-ink-100"></div>
        } @else if (!restaurant()) {
          <div class="card-surface max-w-xl p-5">
            <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Register your restaurant</h2>
            <p class="mt-1 text-sm text-ink-400">This creates your storefront — an admin will review it before it goes live.</p>
            @if (formError()) {
              <p class="mt-3 rounded-lg bg-ember-50 px-3 py-2 text-sm font-medium text-ember-700">{{ formError() }}</p>
            }
            <form class="mt-4 space-y-3" (submit)="onRegister($event)">
              <input [(ngModel)]="form.name" name="name" required placeholder="Restaurant name" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
              <input [(ngModel)]="form.coverImage" name="coverImage" required placeholder="Cover image URL" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
              <input [(ngModel)]="form.cuisines" name="cuisines" placeholder="Cuisines (comma separated)" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
              <div class="grid grid-cols-2 gap-3">
                <input [(ngModel)]="form.line1" name="line1" required placeholder="Street address" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
                <input [(ngModel)]="form.city" name="city" required placeholder="City" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
              </div>
              <button type="submit" [disabled]="submitting()" class="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {{ submitting() ? 'Registering…' : 'Register restaurant' }}
              </button>
            </form>
          </div>
        } @else {
          <app-seller-profile-card
            class="mb-5 block"
            [restaurant]="restaurant()!"
            [owner]="owner"
            (restaurantChange)="restaurant.set($event)"
          />

          @if (statsLoading()) {
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              @for (i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; track i) {
                <div class="card-surface h-24 animate-pulse bg-ink-100"></div>
              }
            </div>
          } @else if (stats(); as s) {
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              @for (card of statCards(s); track card.label) {
                <div class="card-surface p-4">
                  <div class="flex items-center gap-2">
                    <span class="flex h-8 w-8 items-center justify-center rounded-lg" [style.background]="card.accent + '22'" [style.color]="card.accent">
                      <app-icon [name]="card.icon" [size]="15" />
                    </span>
                    <p class="text-xs font-semibold text-ink-400 dark:text-ink-500">{{ card.label }}</p>
                  </div>
                  <p class="mt-2 font-display text-xl font-bold text-ink-900 dark:text-white">
                    {{ card.isCurrency ? (card.value | inr) : card.value }}
                  </p>
                </div>
              }
            </div>

            <div class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div class="card-surface p-5 lg:col-span-2">
                <h3 class="font-display text-sm font-bold text-ink-900 dark:text-white">Order trend (last 14 days)</h3>
                <div class="mt-4">
                  <app-mini-chart [points]="trendPoints(s)" kind="line" color="#ff5127" [width]="600" [height]="160" />
                </div>
              </div>

              <div class="card-surface p-5">
                <h3 class="font-display text-sm font-bold text-ink-900 dark:text-white">Best sellers</h3>
                <div class="mt-3 space-y-2.5">
                  @for (item of s.bestSellingItems; track item.name) {
                    <div class="flex items-center justify-between text-sm">
                      <span class="truncate text-ink-700 dark:text-ink-200">{{ item.name }}</span>
                      <span class="shrink-0 font-semibold text-ink-900 dark:text-white">{{ item.qty }}×</span>
                    </div>
                  } @empty {
                    <p class="text-sm text-ink-400">No sales yet.</p>
                  }
                </div>
              </div>
            </div>

            <div class="card-surface mt-4 p-5">
              <div class="flex items-center justify-between">
                <h3 class="font-display text-sm font-bold text-ink-900 dark:text-white">Recent orders</h3>
                <a routerLink="/seller/orders" class="text-xs font-semibold text-ember-600 hover:text-ember-700">View all</a>
              </div>
              <div class="mt-3 overflow-x-auto">
                <table class="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr class="text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                      <th class="pb-2">Customer</th>
                      <th class="pb-2">Placed</th>
                      <th class="pb-2">Items</th>
                      <th class="pb-2">Total</th>
                      <th class="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (o of s.recentOrders; track o._id) {
                      <tr class="border-t border-ink-100 dark:border-ink-700">
                        <td class="py-2 font-semibold text-ink-900 dark:text-white">{{ o.customerName }}</td>
                        <td class="py-2 text-ink-500">{{ o.createdAt | date: 'MMM d, h:mm a' }}</td>
                        <td class="max-w-[220px] truncate py-2 text-ink-500">{{ itemSummary(o) }}</td>
                        <td class="py-2 font-semibold text-ink-900 dark:text-white">{{ o.total | inr }}</td>
                        <td class="py-2">
                          <span class="rounded-full bg-ink-50 px-2 py-1 text-xs font-bold capitalize text-ink-600 dark:bg-ink-700 dark:text-ink-300">
                            {{ o.status.replaceAll('_', ' ') }}
                          </span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" class="py-6 text-center text-ink-400">No orders yet.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }
        }
      }
    </app-seller-shell>
  `,
})
export class SellerDashboardComponent implements OnInit, OnDestroy {
  loading = signal(true);
  statsLoading = signal(true);
  submitting = signal(false);
  formError = signal<string | null>(null);
  restaurant = signal<Restaurant | null>(null);
  stats = signal<DashboardStats | null>(null);

  form = { name: '', coverImage: '', cuisines: '', line1: '', city: '' };

  private statusPollHandle?: ReturnType<typeof setInterval>;

  constructor(
    public auth: SellerAuthService,
    private sellerService: SellerService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    if (this.auth.currentUser()?.isSuspended) return;
    this.loading.set(true);
    try {
      const res = await this.auth.getMyRestaurant();
      this.restaurant.set(res.restaurant);
      if (res.restaurant) {
        this.loadStats();
      }
    } finally {
      this.loading.set(false);
    }

    // An admin can approve/reject this restaurant from their own session at
    // any moment — keep polling until it's settled so the "Pending" badge
    // clears itself instead of needing a manual reload.
    this.statusPollHandle = setInterval(async () => {
      const owner = this.auth.currentUser();
      const restaurant = this.restaurant();
      const settled = owner && owner.status === 'approved' && !owner.isSuspended && (!restaurant || restaurant.verificationStatus === 'approved');
      if (settled) {
        if (this.statusPollHandle) clearInterval(this.statusPollHandle);
        return;
      }
      await this.auth.refreshMe();
      const res = await this.auth.getMyRestaurant();
      this.restaurant.set(res.restaurant);
    }, 15000);
  }

  ngOnDestroy() {
    if (this.statusPollHandle) clearInterval(this.statusPollHandle);
  }

  private async loadStats() {
    this.statsLoading.set(true);
    try {
      this.stats.set(await this.sellerService.getDashboardStats());
    } finally {
      this.statsLoading.set(false);
    }
  }

  statCards(s: DashboardStats): StatCard[] {
    return [
      { label: "Today's Orders", value: s.todayOrders, icon: 'receipt', accent: '#ff5127' },
      { label: 'Pending', value: s.pendingOrders, icon: 'clock', accent: '#f5ab1c' },
      { label: 'Preparing', value: s.preparingOrders, icon: 'flame', accent: '#f13911' },
      { label: 'Ready for Pickup', value: s.readyForPickup, icon: 'package', accent: '#1a9f86' },
      { label: 'Delivered', value: s.deliveredOrders, icon: 'check', accent: '#1a9f86' },
      { label: 'Cancelled', value: s.cancelledOrders, icon: 'alert-triangle', accent: '#c72b0c' },
      { label: "Today's Revenue", value: s.todayRevenue, icon: 'banknote', accent: '#ff5127', isCurrency: true },
      { label: 'Weekly Revenue', value: s.weeklyRevenue, icon: 'bar-chart', accent: '#ff5127', isCurrency: true },
      { label: 'Monthly Revenue', value: s.monthlyRevenue, icon: 'bar-chart', accent: '#ff5127', isCurrency: true },
      { label: 'Total Customers', value: s.totalCustomers, icon: 'users', accent: '#1a9f86' },
    ];
  }

  trendPoints(s: DashboardStats) {
    return s.orderTrend.map((d) => ({
      label: new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      value: d.count,
    }));
  }

  itemSummary(order: Order): string {
    return order.items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.name}` : i.name)).join(', ');
  }

  async onRegister(e: Event) {
    e.preventDefault();
    this.submitting.set(true);
    this.formError.set(null);
    try {
      const restaurant = await this.auth.registerRestaurant({
        name: this.form.name.trim(),
        coverImage: this.form.coverImage.trim(),
        cuisines: this.form.cuisines
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        address: { line1: this.form.line1.trim(), city: this.form.city.trim() } as any,
      });
      this.restaurant.set(restaurant);
      this.toast.success('Restaurant registered — awaiting admin approval');
      this.loadStats();
    } catch (err: any) {
      this.formError.set(err?.error?.message ?? 'Could not register restaurant');
    } finally {
      this.submitting.set(false);
    }
  }
}
