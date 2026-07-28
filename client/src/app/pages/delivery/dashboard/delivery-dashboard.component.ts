import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import {
  DeliveryDashboardStats,
  DeliveryEarningsSummary,
  DeliveryService,
  DeliveryWeeklyPerformanceDay,
} from '../../../core/services/delivery.service';
import { ToastService } from '../../../core/services/toast.service';
import { DeliveryOrderDetail, Order } from '../../../core/models/order.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeliveryShellComponent } from '../../../shared/components/delivery-shell/delivery-shell.component';
import { DeliveryRouteMapComponent, MapPoint } from '../../../shared/components/delivery-route-map/delivery-route-map.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

const EMPTY_STATS: DeliveryDashboardStats = {
  todayDeliveries: 0,
  pendingPickups: 0,
  activeDeliveries: 0,
  completedDeliveries: 0,
  cancelledDeliveries: 0,
  failedDeliveries: 0,
  successRate: 0,
  rating: { average: 0, count: 0 },
  recentDeliveries: [],
};

const EMPTY_EARNINGS: DeliveryEarningsSummary = {
  orderCount: 0,
  totalEarnings: 0,
  todayEarnings: 0,
  weeklyEarnings: 0,
  monthlyEarnings: 0,
  tipsReceived: 0,
  incentives: 0,
  pendingPayments: 0,
  dailyTarget: 1000,
};

// A purely cosmetic, non-enforced milestone — same spirit as the self-set
// dailyTarget earnings goal, just keyed off delivery count instead of ₹.
const BONUS_MILESTONE_DELIVERIES = 10;
const BONUS_MILESTONE_AMOUNT = 300;

const PICKUP_STAGE_STATUSES = ['assigned', 'accepted', 'reached_restaurant', 'picked_up'];

interface Badge {
  icon: string;
  label: string;
  hint: string;
  achieved: boolean;
}

function mapsLink(lat: number | null | undefined, lng: number | null | undefined, fallbackAddress: string): string {
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fallbackAddress)}`;
}

@Component({
  selector: 'app-delivery-dashboard',
  standalone: true,
  imports: [RouterLink, IconComponent, DeliveryShellComponent, DeliveryRouteMapComponent, InrPipe],
  template: `
    <app-delivery-shell title="Dashboard">
    <div>
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
            <a routerLink="/delivery/profile" class="shrink-0 rounded-lg bg-ember-500 px-3 py-1.5 text-xs font-bold text-white">Upload now</a>
          </div>
        }

        <!-- Greeting + online toggle -->
        <div class="card-surface mt-4 p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-display text-lg font-bold text-ink-900 dark:text-white">{{ greeting() }}, {{ firstName(partner.name) }}!</p>
              <p class="mt-0.5 text-sm text-ink-400">Ready for another high-performance delivery day?</p>
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
          <div class="mt-4 grid grid-cols-3 gap-2 border-t border-ink-100 pt-4 dark:border-ink-700">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Rating</p>
              <p class="mt-0.5 font-display text-base font-bold text-ink-900 dark:text-white">⭐ {{ stats().rating.average || '—' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Vehicle</p>
              <p class="mt-0.5 font-display text-base font-bold capitalize text-ink-900 dark:text-white">🏍️ {{ partner.vehicleType }}</p>
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Today's earnings</p>
              <p class="mt-0.5 font-display text-base font-bold text-ink-900 dark:text-white">{{ earnings().todayEarnings | inr }}</p>
            </div>
          </div>
        </div>

        <!-- Bonus milestone banner -->
        <div class="card-surface mt-3 flex items-center gap-3 bg-gold-50 p-4 dark:bg-gold-400/10">
          <app-icon name="gift" [size]="20" class="shrink-0 text-gold-600" />
          @if (bonusRemaining() > 0) {
            <p class="text-sm font-medium text-ink-700 dark:text-ink-200">
              Complete <strong>{{ bonusRemaining() }}</strong> more {{ bonusRemaining() === 1 ? 'delivery' : 'deliveries' }} today to earn a
              <strong>{{ bonusAmount | inr }}</strong> bonus.
            </p>
          } @else {
            <p class="text-sm font-medium text-ink-700 dark:text-ink-200">You've hit today's bonus milestone — nice work! 🎉</p>
          }
        </div>

        <!-- Quick actions -->
        <div class="mt-4 grid grid-cols-5 gap-2">
          <a [href]="navigationLink()" target="_blank" rel="noopener" class="flex flex-col items-center gap-1.5 rounded-lg py-2.5 text-center" [class.opacity-40]="!navigationLink()" [class.pointer-events-none]="!navigationLink()">
            <span class="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-700 dark:bg-ink-700 dark:text-ink-200">
              <app-icon name="compass" [size]="18" />
            </span>
            <span class="text-[11px] font-semibold text-ink-600 dark:text-ink-300">Navigate</span>
          </a>
          <a routerLink="/delivery/settings/payments" class="flex flex-col items-center gap-1.5 rounded-lg py-2.5 text-center">
            <span class="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-700 dark:bg-ink-700 dark:text-ink-200">
              <app-icon name="banknote" [size]="18" />
            </span>
            <span class="text-[11px] font-semibold text-ink-600 dark:text-ink-300">Wallet</span>
          </a>
          <a routerLink="/delivery/settings/support" class="flex flex-col items-center gap-1.5 rounded-lg py-2.5 text-center">
            <span class="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-700 dark:bg-ink-700 dark:text-ink-200">
              <app-icon name="headset" [size]="18" />
            </span>
            <span class="text-[11px] font-semibold text-ink-600 dark:text-ink-300">Support</span>
          </a>
          <a routerLink="/delivery/history" class="flex flex-col items-center gap-1.5 rounded-lg py-2.5 text-center">
            <span class="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-700 dark:bg-ink-700 dark:text-ink-200">
              <app-icon name="history" [size]="18" />
            </span>
            <span class="text-[11px] font-semibold text-ink-600 dark:text-ink-300">History</span>
          </a>
          <button type="button" class="flex flex-col items-center gap-1.5 rounded-lg py-2.5 text-center" (click)="rewardsOpen.set(true)">
            <span class="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-700 dark:bg-ink-700 dark:text-ink-200">
              <app-icon name="gift" [size]="18" />
            </span>
            <span class="text-[11px] font-semibold text-ink-600 dark:text-ink-300">Rewards</span>
          </button>
        </div>

        <!-- Stats grid -->
        <div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div class="card-surface p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Today's deliveries</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ stats().todayDeliveries }}</p>
          </div>
          <div class="card-surface p-4" [class.border-2]="activeOrder()" [class.border-basil-300]="activeOrder()">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Active order</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ activeOrder() ? 1 : 0 }}</p>
          </div>
          <div class="card-surface p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Pending tasks</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ stats().pendingPickups }}</p>
          </div>
          <div class="card-surface p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Success rate</p>
            <p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ stats().successRate }}%</p>
          </div>
        </div>

        <!-- Main column (left on desktop) + aside (right on desktop: achievements + live route) -->
        <div class="mt-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-4">
          <div class="space-y-4 lg:col-span-2">
            <!-- Weekly performance -->
            <div class="card-surface p-4">
              <h2 class="font-display text-base font-bold text-ink-900 dark:text-white">Weekly Performance</h2>
              <div class="mt-4 flex h-28 items-end gap-2">
                @for (day of weekly(); track day.day) {
                  <div class="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      class="w-full rounded-t"
                      [class.bg-ember-500]="day.total === weeklyMax()"
                      [class.bg-ink-200]="day.total !== weeklyMax()"
                      [class.dark:bg-ink-600]="day.total !== weeklyMax()"
                      [style.height.%]="weeklyBarHeight(day.total)"
                      [attr.title]="day.total | inr"
                    ></div>
                    <span class="text-[11px] font-semibold text-ink-400">{{ day.day }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Daily target -->
            <div class="card-surface flex items-center gap-4 p-4">
              <div
                class="relative h-16 w-16 shrink-0 rounded-full"
                [style.background]="'conic-gradient(#f97316 ' + targetProgress() + '%, rgb(229 231 235) ' + targetProgress() + '% 100%)'"
              >
                <div class="absolute inset-1 flex items-center justify-center rounded-full bg-white text-xs font-bold text-ink-800 dark:bg-ink-800 dark:text-white">{{ targetProgress() }}%</div>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Daily target</p>
                <p class="mt-0.5 font-display text-lg font-bold text-ink-900 dark:text-white">{{ earnings().todayEarnings | inr }} <span class="text-sm font-medium text-ink-400">/ {{ earnings().dailyTarget | inr }}</span></p>
              </div>
            </div>

            <div>
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Available orders</h2>
              <div class="mt-3 grid gap-3 lg:grid-cols-2">
                @for (order of available(); track order._id) {
                  <div class="card-surface p-3.5">
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="text-sm font-semibold text-ink-900 dark:text-white">{{ order.restaurantName }}</p>
                        <p class="text-xs text-ink-400">#{{ order._id.slice(-6) }} · {{ minutesAgo(order.createdAt) }} mins ago</p>
                      </div>
                      <p class="font-display text-base font-bold text-ink-900 dark:text-white">{{ order.total | inr }}</p>
                    </div>
                    <div class="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        [disabled]="!partner.isOnline || !!activeOrder()"
                        class="flex-1 rounded-lg bg-ember-500 py-2 text-xs font-bold text-white disabled:opacity-50"
                        (click)="accept(order)"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                } @empty {
                  <p class="text-sm text-ink-400">No orders available right now.</p>
                }
              </div>
            </div>

            @if (stats().recentDeliveries.length) {
              <div>
                <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Recent deliveries</h2>
                <div class="mt-3 space-y-2">
                  @for (order of stats().recentDeliveries; track order._id) {
                    <div class="card-surface flex items-center justify-between p-3.5">
                      <p class="text-sm font-semibold text-ink-900 dark:text-white">{{ order.restaurantName }}</p>
                      <p class="text-sm font-bold text-ink-900 dark:text-white">{{ order.total | inr }}</p>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Aside (right column on desktop, stacks below on mobile) -->
          <div class="mt-4 space-y-4 lg:sticky lg:top-20 lg:mt-0">
            <div class="card-surface p-4">
              <div class="flex items-center justify-between">
                <h2 class="font-display text-base font-bold text-ink-900 dark:text-white">Achievements</h2>
                <button type="button" class="text-xs font-bold text-ember-600" (click)="rewardsOpen.set(true)">View Trophy Room →</button>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2">
                @for (badge of previewBadges(); track badge.label) {
                  <div class="flex flex-col items-center gap-1 rounded-lg border p-3 text-center" [class.border-gold-300]="badge.achieved" [class.bg-gold-50]="badge.achieved" [class.dark:bg-gold-400/10]="badge.achieved" [class.border-ink-100]="!badge.achieved" [class.dark:border-ink-700]="!badge.achieved" [class.opacity-50]="!badge.achieved">
                    <app-icon [name]="badge.icon" [size]="20" [class]="badge.achieved ? 'text-gold-600' : 'text-ink-400'" />
                    <p class="text-xs font-bold text-ink-900 dark:text-white">{{ badge.label }}</p>
                  </div>
                }
              </div>
            </div>

            @if (activeOrder(); as active) {
              <div class="card-surface overflow-hidden p-0">
                <div class="p-4 pb-0">
                  <h2 class="font-display text-base font-bold text-ink-900 dark:text-white">Live Route Preview</h2>
                </div>
                <div class="mt-3 h-52 w-full">
                  <app-delivery-route-map [partner]="partnerPoint()" [destination]="destinationPoint()" />
                </div>
                <div class="flex items-center justify-between p-3.5">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-ink-900 dark:text-white">{{ active.restaurantName }} · #{{ active._id.slice(-6) }}</p>
                    <p class="mt-0.5 text-xs capitalize text-ink-400">{{ active.deliveryStatus.replaceAll('_', ' ') }}</p>
                  </div>
                  <a routerLink="/delivery/orders" class="shrink-0 rounded-lg bg-ember-500 px-3 py-1.5 text-xs font-bold text-white">Manage</a>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>

    @if (rewardsOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" (click)="rewardsOpen.set(false)">
        <div class="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-ink-800" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Trophy Room</h2>
            <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700" (click)="rewardsOpen.set(false)">
              <app-icon name="x" [size]="18" />
            </button>
          </div>
          <div class="mt-3 space-y-2">
            @for (badge of badges(); track badge.label) {
              <div class="flex items-center gap-3 rounded-lg border p-3" [class.border-gold-300]="badge.achieved" [class.bg-gold-50]="badge.achieved" [class.dark:bg-gold-400/10]="badge.achieved" [class.border-ink-100]="!badge.achieved" [class.dark:border-ink-700]="!badge.achieved" [class.opacity-50]="!badge.achieved">
                <app-icon [name]="badge.icon" [size]="20" [class]="badge.achieved ? 'text-gold-600' : 'text-ink-400'" />
                <div class="min-w-0">
                  <p class="text-sm font-bold text-ink-900 dark:text-white">{{ badge.label }}</p>
                  <p class="text-xs text-ink-400">{{ badge.hint }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
    </app-delivery-shell>
  `,
})
export class DeliveryDashboardComponent implements OnInit, OnDestroy {
  available = signal<Order[]>([]);
  stats = signal<DeliveryDashboardStats>(EMPTY_STATS);
  earnings = signal<DeliveryEarningsSummary>(EMPTY_EARNINGS);
  weekly = signal<DeliveryWeeklyPerformanceDay[]>([]);
  activeOrder = signal<Order | null>(null);
  activeOrderDetail = signal<DeliveryOrderDetail | null>(null);
  partnerPoint = signal<MapPoint | null>(null);
  rewardsOpen = signal(false);

  bonusAmount = BONUS_MILESTONE_AMOUNT;

  weeklyMax = computed(() => Math.max(1, ...this.weekly().map((d) => d.total)));

  destinationPoint = computed<MapPoint | null>(() => {
    const detail = this.activeOrderDetail();
    const order = this.activeOrder();
    if (!detail || !order || !PICKUP_STAGE_STATUSES.includes(order.deliveryStatus)) return null;
    return { lat: detail.restaurant.location.lat, lng: detail.restaurant.location.lng, label: detail.restaurant.name };
  });

  bonusRemaining = computed(() => Math.max(0, BONUS_MILESTONE_DELIVERIES - this.stats().todayDeliveries));

  badges = computed<Badge[]>(() => {
    const completed = this.stats().completedDeliveries;
    const rating = this.auth.currentUser()?.rating?.average ?? 0;
    const tips = this.earnings().tipsReceived;
    return [
      { icon: 'award', label: 'First Delivery', hint: 'Complete your first delivery', achieved: completed >= 1 },
      { icon: 'award', label: '10 Deliveries', hint: 'Complete 10 deliveries', achieved: completed >= 10 },
      { icon: 'award', label: '50 Deliveries', hint: 'Complete 50 deliveries', achieved: completed >= 50 },
      { icon: 'award', label: '100 Deliveries', hint: 'Complete 100 deliveries', achieved: completed >= 100 },
      { icon: 'award', label: '500 Deliveries', hint: 'Complete 500 deliveries', achieved: completed >= 500 },
      { icon: 'star', label: 'Trusted Partner', hint: 'Maintain a 4.5+ average rating', achieved: rating >= 4.5 },
      { icon: 'star', label: 'Top Rated', hint: 'Maintain a 4.8+ average rating', achieved: rating >= 4.8 },
      { icon: 'gift', label: 'First Tip', hint: 'Earn your first customer tip', achieved: tips > 0 },
    ];
  });
  badgesUnlockedCount = computed(() => this.badges().filter((b) => b.achieved).length);
  previewBadges = computed(() => this.badges().slice(0, 4));

  private locationPollHandle?: ReturnType<typeof setInterval>;

  targetProgress(): number {
    const e = this.earnings();
    if (!e.dailyTarget) return 0;
    return Math.min(100, Math.round((e.todayEarnings / e.dailyTarget) * 100));
  }

  weeklyBarHeight(total: number): number {
    return Math.max(4, Math.round((total / this.weeklyMax()) * 100));
  }

  minutesAgo(iso: string): number {
    return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  }

  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  firstName(name: string): string {
    return name?.split(' ')[0] || name;
  }

  navigationLink(): string | null {
    const detail = this.activeOrderDetail();
    const order = this.activeOrder();
    if (!detail || !order) return null;
    if (PICKUP_STAGE_STATUSES.includes(order.deliveryStatus)) {
      return mapsLink(detail.restaurant.location?.lat, detail.restaurant.location?.lng, `${detail.restaurant.address?.line1 ?? ''}, ${detail.restaurant.address?.area ?? ''}, ${detail.restaurant.address?.city ?? ''}`);
    }
    return mapsLink(null, null, `${detail.address.line1}, ${detail.address.area}, ${detail.address.city}`);
  }

  constructor(
    public auth: DeliveryAuthService,
    private deliveryService: DeliveryService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    if (this.auth.currentUser()?.isSuspended) return;
    const [availableRes, earningsRes, statsRes, activeRes, weeklyRes] = await Promise.all([
      this.deliveryService.listAvailableOrders(),
      this.deliveryService.getEarnings(),
      this.deliveryService.getDashboardStats(),
      this.deliveryService.listMyOrders(),
      this.deliveryService.getWeeklyPerformance(),
    ]);
    this.available.set(availableRes.orders);
    this.earnings.set(earningsRes);
    this.stats.set(statsRes);
    this.weekly.set(weeklyRes.days);
    const active = activeRes.orders.find((o) => !['delivered', 'cancelled', 'failed'].includes(o.deliveryStatus));
    this.activeOrder.set(active ?? null);
    if (active) this.refreshActiveOrderDetail(active._id);

    this.refreshLocation();
    this.locationPollHandle = setInterval(() => this.refreshLocation(), 30000);
  }

  ngOnDestroy() {
    if (this.locationPollHandle) clearInterval(this.locationPollHandle);
  }

  private async refreshActiveOrderDetail(orderId: string) {
    try {
      const res = await this.deliveryService.getOrderDetail(orderId);
      this.activeOrderDetail.set(res.order);
    } catch {
      this.activeOrderDetail.set(null);
    }
  }

  private refreshLocation() {
    const fallbackToStoredLocation = () => {
      const loc = this.auth.currentUser()?.location;
      if (loc?.lat != null && loc?.lng != null) this.partnerPoint.set({ lat: loc.lat, lng: loc.lng, label: 'You' });
    };

    if (!('geolocation' in navigator)) {
      fallbackToStoredLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        this.partnerPoint.set({ lat: latitude, lng: longitude, label: 'You' });
        this.deliveryService.updateLocation(latitude, longitude).catch(() => {
          // best effort — the map still works locally even if the ping fails
        });
      },
      fallbackToStoredLocation,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
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
      this.refreshActiveOrderDetail(order._id);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not accept order');
    }
  }
}
