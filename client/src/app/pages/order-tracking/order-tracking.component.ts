import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DeliveryStatus, Order, OrderStatus } from '../../core/models/order.model';
import { OrderMessage } from '../../core/models/message.model';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { OrderService } from '../../core/services/order.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { ToastService } from '../../core/services/toast.service';
import { ChatPanelComponent } from '../../shared/components/chat-panel/chat-panel.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { QrCodeComponent } from '../../shared/components/qr-code/qr-code.component';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { cancelledByLabel, refundStatusClass, refundStatusLabel } from '../../shared/utils/order-status';

// Customer may cancel a freshly placed order outright, or briefly after the
// restaurant accepts it (see graceMinutes, fetched from the server-configured
// policy) — never once it's preparing or further along.
const NOT_YET_PREPARING_STATUSES: OrderStatus[] = ['placed', 'confirmed'];
const BLOCKED_CANCEL_MESSAGE = 'This order can no longer be cancelled because the restaurant has already started preparing your food.';
const CUSTOMER_CANCEL_REASONS = ['Changed my mind', 'Ordered by mistake', 'Found a better option elsewhere', 'Order is taking too long', 'Other'];

// Two parallel state machines — Order.status (seller-driven, coarse) and
// Order.deliveryStatus (delivery-partner-driven, fine-grained) — merged into
// one customer-facing timeline. Each step reads whichever machine actually
// tracks it; ordinal position within that machine's own sequence (below)
// determines "reached", so a step is never marked complete/current from the
// wrong source.
type StepSource = 'order' | 'delivery';
interface UnifiedStep {
  key: string;
  label: string;
  icon: string;
  source: StepSource;
}

const ORDER_SEQUENCE: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered'];
const DELIVERY_SEQUENCE: DeliveryStatus[] = ['pending', 'searching', 'assigned', 'accepted', 'reached_restaurant', 'picked_up', 'out_for_delivery', 'reached_customer', 'delivered'];

const STEPS: UnifiedStep[] = [
  { key: 'placed', label: 'Order Placed', icon: 'check', source: 'order' },
  { key: 'confirmed', label: 'Seller Accepted', icon: 'check', source: 'order' },
  { key: 'preparing', label: 'Preparing Food', icon: 'chef-hat', source: 'order' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: 'package', source: 'order' },
  { key: 'assigned', label: 'Delivery Partner Assigned', icon: 'bike', source: 'delivery' },
  { key: 'reached_restaurant', label: 'Rider Reached Restaurant', icon: 'map-pin', source: 'delivery' },
  { key: 'picked_up', label: 'Picked Up', icon: 'package', source: 'delivery' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'bike', source: 'delivery' },
  { key: 'reached_customer', label: 'Reached Your Location', icon: 'map-pin', source: 'delivery' },
  { key: 'delivered', label: 'Delivered', icon: 'check', source: 'order' },
];

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [RouterLink, FormsModule, IconComponent, DatePipe, InrPipe, QrCodeComponent, ChatPanelComponent],
  template: `
    <div class="container-shell max-w-xl py-10 print:hidden">
      @if (loading()) {
        <div class="h-64 animate-pulse rounded-2xl bg-ink-100"></div>
      } @else if (order(); as o) {
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Order #{{ o._id.slice(-6) }} · {{ o.createdAt | date: 'MMM d, h:mm a' }}</p>
            <h1 class="font-display text-xl font-bold text-ink-900">{{ o.restaurantName }}</h1>
          </div>
          <a routerLink="/orders" class="text-sm font-semibold text-ember-600 hover:text-ember-700">All orders</a>
        </div>

        @if (o.status === 'cancelled') {
          <div class="card-surface mt-6 p-4 text-ember-700">
            <div class="flex items-center gap-3">
              <app-icon name="alert-triangle" [size]="20" />
              <p class="text-sm font-semibold">This order was cancelled.</p>
            </div>
            <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-500">
              <dt class="font-semibold">Cancelled by</dt>
              <dd>{{ cancelledByLabel(o.cancelledByRole) }}</dd>
              @if (o.cancellationReason) {
                <dt class="font-semibold">Reason</dt>
                <dd>{{ o.cancellationReason }}</dd>
              }
              @if (o.cancelledAt) {
                <dt class="font-semibold">Cancelled at</dt>
                <dd>{{ o.cancelledAt | date: 'medium' }}</dd>
              }
            </dl>
            @if (refundLabel(o); as label) {
              <span class="mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-bold" [class]="refundClass(o)">{{ label }}</span>
            }
          </div>
        } @else if (o.status === 'rejected') {
          <div class="card-surface mt-6 flex items-center gap-3 p-4 text-ember-700">
            <app-icon name="alert-triangle" [size]="20" />
            <p class="text-sm font-semibold">The restaurant was unable to accept this order.</p>
          </div>
        } @else if (o.status === 'failed') {
          <div class="card-surface mt-6 flex items-center gap-3 p-4 text-ember-700">
            <app-icon name="alert-triangle" [size]="20" />
            <p class="text-sm font-semibold">Delivery attempt failed{{ o.deliveryFailReason ? ': ' + o.deliveryFailReason : '' }} — our team will reach out shortly.</p>
          </div>
        } @else if (o.status === 'returned') {
          <div class="card-surface mt-6 flex items-center gap-3 p-4 text-ember-700">
            <app-icon name="alert-triangle" [size]="20" />
            <p class="text-sm font-semibold">This order was returned to the restaurant after a failed delivery attempt.</p>
          </div>
        } @else {
          @if (o.deliveryStatus === 'searching') {
            <div class="card-surface mt-6 flex items-center gap-3 bg-gold-50 p-4">
              <app-icon name="search" [size]="20" class="shrink-0 animate-pulse text-gold-600" />
              <p class="text-sm font-semibold text-gold-800">Searching for another delivery partner — your order is safe and will still be delivered.</p>
            </div>
          }
          <div class="card-surface mt-4 p-5">
            <div class="flex items-center justify-between">
              <p class="text-sm text-ink-500">
                @if (o.status === 'delivered') {
                  Delivered — enjoy your meal!
                } @else {
                  Estimated delivery in ~{{ o.etaMinutes }} minutes
                }
              </p>
              <span class="shrink-0 rounded-full bg-basil-50 px-2.5 py-1 text-xs font-bold capitalize text-basil-700">{{ currentStatusLabel() }}</span>
            </div>

            <ol class="mt-5 space-y-0">
              @for (step of steps; track step.key; let i = $index; let last = $last) {
                <li class="relative flex gap-3 pb-7 last:pb-0">
                  @if (!last) {
                    <span
                      class="absolute left-[15px] top-8 h-full w-0.5"
                      [class]="i < currentStepIndex() ? 'bg-basil-500' : 'bg-ink-100'"
                    ></span>
                  }
                  <span
                    class="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
                    [class.bg-basil-500]="i <= currentStepIndex()"
                    [class.text-white]="i <= currentStepIndex()"
                    [class.bg-ink-100]="i > currentStepIndex()"
                    [class.text-ink-400]="i > currentStepIndex()"
                    [class.step-pulse]="i === currentStepIndex() + 1"
                  >
                    @if (i < currentStepIndex()) {
                      <app-icon name="check" [size]="16" />
                    } @else {
                      <app-icon [name]="step.icon" [size]="16" />
                    }
                  </span>
                  <div class="pt-1">
                    <p
                      class="text-sm font-semibold"
                      [class.text-ink-900]="i <= currentStepIndex()"
                      [class.text-ember-600]="i === currentStepIndex() + 1"
                      [class.text-ink-400]="i > currentStepIndex() + 1"
                    >
                      {{ step.label }}
                      @if (i === currentStepIndex() + 1) {
                        <span class="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ember-500 align-middle"></span>
                      }
                    </p>
                    @if (timeForStep(step); as t) {
                      <p class="text-xs text-ink-400">{{ t | date: 'shortTime' }}</p>
                    }
                  </div>
                </li>
              }
            </ol>
          </div>
        }

        @if (partner(); as p) {
          <div class="card-surface mt-4 p-4">
            <h2 class="font-display text-sm font-bold text-ink-900">Delivery partner</h2>
            <div class="mt-2 flex items-center justify-between">
              <div class="flex items-center gap-3">
                @if (p.photo) {
                  <img [src]="p.photo" alt="" class="h-10 w-10 shrink-0 rounded-full object-cover" />
                } @else {
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-400">
                    <app-icon name="user" [size]="18" />
                  </span>
                }
                <div>
                  <p class="text-sm font-semibold text-ink-800">{{ p.name }}</p>
                  <p class="text-xs text-ink-400">{{ p.phone }}</p>
                  <p class="text-xs capitalize text-ink-400">{{ p.vehicleType }} · {{ p.vehicleNumber }} · ⭐ {{ p.rating.average || '—' }}</p>
                </div>
              </div>
              <div class="flex gap-1.5">
                <a [href]="'tel:' + p.phone" class="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-700">
                  <app-icon name="phone" [size]="13" /> Call
                </a>
                <button type="button" class="relative flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-700" (click)="openChat()">
                  <app-icon name="mail" [size]="13" /> Chat
                  @if (unreadChatCount() > 0) {
                    <span class="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-white">
                      {{ unreadChatCount() > 9 ? '9+' : unreadChatCount() }}
                    </span>
                  }
                </button>
              </div>
            </div>
            @if (o.deliveryOtp && o.status !== 'delivered') {
              <div class="mt-3 flex items-center gap-4 rounded-lg bg-basil-50 p-3">
                <app-qr-code [value]="o.deliveryOtp" [size]="88" />
                <div>
                  <p class="text-xs font-semibold text-basil-700">Share this OTP or let your delivery partner scan the QR code at drop-off</p>
                  <p class="mt-1 font-display text-2xl font-extrabold tracking-[0.3em] text-basil-800">{{ o.deliveryOtp }}</p>
                </div>
              </div>
            }
          </div>
        }

        <div class="card-surface mt-4 p-4">
          <h2 class="font-display text-sm font-bold text-ink-900">Delivering to</h2>
          <p class="mt-1 text-sm text-ink-500">{{ o.address.line1 }}, {{ o.address.area }}, {{ o.address.city }}</p>
          @if (o.address.instructions) {
            <p class="mt-1 text-xs text-ink-400"><strong>Instructions:</strong> {{ o.address.instructions }}</p>
          }
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
          <div class="mt-2 flex justify-between text-xs text-ink-400">
            <span>Payment</span>
            <span class="font-semibold" [class.text-basil-600]="isPaid(o)">{{ paymentStatusLabel(o) }}</span>
          </div>
        </div>

        <button
          type="button"
          class="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink-200 py-2.5 text-sm font-bold text-ink-600 hover:bg-ink-50"
          (click)="printInvoice()"
        >
          <app-icon name="download" [size]="14" /> Download invoice
        </button>

        @if (isCancellable(o)) {
          <button
            type="button"
            [disabled]="cancelling()"
            class="mt-4 w-full rounded-lg border border-ember-200 py-2.5 text-sm font-bold text-ember-600 hover:bg-ember-50 disabled:opacity-50"
            (click)="cancelOrder(o._id)"
          >
            {{ cancelling() ? 'Cancelling…' : 'Cancel order' }}
          </button>
        } @else if (!['delivered', 'cancelled', 'rejected', 'failed', 'returned'].includes(o.status)) {
          <div class="card-surface mt-4 p-4">
            <div class="flex items-start gap-3">
              <app-icon name="info" [size]="18" class="mt-0.5 shrink-0 text-ink-400" />
              <p class="text-sm font-semibold text-ink-700">{{ blockedCancelMessage }}</p>
            </div>
            <button
              type="button"
              [disabled]="submittingSupport()"
              class="mt-3 flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-50 disabled:opacity-50"
              (click)="contactSupport(o)"
            >
              <app-icon name="headset" [size]="13" /> {{ submittingSupport() ? 'Sending…' : 'Contact Support' }}
            </button>
          </div>
        }

        @if (o.status === 'delivered' && partner() && !rated()) {
          <div class="card-surface mt-4 p-4">
            <h2 class="font-display text-sm font-bold text-ink-900">Rate your delivery partner</h2>
            <div class="mt-2 flex gap-1.5">
              @for (star of [1, 2, 3, 4, 5]; track star) {
                <button type="button" (click)="ratingValue.set(star)">
                  <app-icon name="star" [size]="24" [filled]="star <= ratingValue()" [class]="star <= ratingValue() ? 'text-gold-500' : 'text-ink-200'" />
                </button>
              }
            </div>
            <textarea [(ngModel)]="ratingComment" name="ratingComment" rows="2" placeholder="Leave a comment (optional)" class="mt-2 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400"></textarea>
            <label class="mt-2 block text-xs font-semibold text-ink-500">
              Add a tip (optional)
              <input type="number" [(ngModel)]="tipAmount" name="tipAmount" min="0" placeholder="₹0" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            </label>
            <button type="button" [disabled]="!ratingValue() || submittingRating()" class="mt-3 w-full rounded-lg bg-ink-900 py-2.5 text-sm font-bold text-white disabled:opacity-50" (click)="submitRating(o._id)">
              {{ submittingRating() ? 'Submitting…' : 'Submit' }}
            </button>
          </div>
        }

        @if (chatOpen()) {
          <div class="fixed bottom-4 right-4 z-50">
            <app-chat-panel title="Chat with rider" [messages]="chatMessages()" myRole="customer" (sendMessage)="sendChat($event)" (closed)="chatOpen.set(false)" />
          </div>
        }

        <div class="hidden print:block">
          <h1 class="text-xl font-bold">FeastGo — Invoice</h1>
          <p class="mt-1 text-sm">Order #{{ o._id.slice(-6) }} · {{ o.createdAt | date: 'medium' }}</p>
          <p class="mt-1 text-sm">{{ o.restaurantName }}</p>
          <p class="mt-3 text-sm font-semibold">Delivered to</p>
          <p class="text-sm">{{ o.address.line1 }}, {{ o.address.area }}, {{ o.address.city }}</p>
          <table class="mt-4 w-full text-sm">
            <thead>
              <tr class="border-b border-black text-left">
                <th class="py-1">Item</th>
                <th class="py-1 text-right">Qty</th>
                <th class="py-1 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              @for (item of o.items; track item.name) {
                <tr class="border-b border-ink-200">
                  <td class="py-1">{{ item.name }}</td>
                  <td class="py-1 text-right">{{ item.qty }}</td>
                  <td class="py-1 text-right">{{ item.price * item.qty | inr }}</td>
                </tr>
              }
            </tbody>
          </table>
          <div class="mt-2 space-y-0.5 text-sm">
            <div class="flex justify-between"><span>Subtotal</span><span>{{ o.subtotal | inr }}</span></div>
            <div class="flex justify-between"><span>Delivery fee</span><span>{{ o.deliveryFee | inr }}</span></div>
            <div class="flex justify-between"><span>Taxes</span><span>{{ o.taxes | inr }}</span></div>
            @if (o.discount) {
              <div class="flex justify-between"><span>Discount</span><span>-{{ o.discount | inr }}</span></div>
            }
            <div class="mt-1 flex justify-between border-t border-black pt-1 font-bold"><span>Total</span><span>{{ o.total | inr }}</span></div>
          </div>
          <p class="mt-3 text-xs">Payment method: {{ o.paymentMethod.toUpperCase() }}</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      @keyframes stepPulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(230, 96, 40, 0.35);
        }
        50% {
          box-shadow: 0 0 0 6px rgba(230, 96, 40, 0);
        }
      }
      .step-pulse {
        animation: stepPulse 1.6s ease-in-out infinite;
      }
    `,
  ],
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
  steps = STEPS;
  loading = signal(true);
  order = signal<Order | null>(null);
  cancelling = signal(false);
  ratingValue = signal(0);
  ratingComment = '';
  tipAmount: number | null = null;
  submittingRating = signal(false);
  rated = signal(false);
  chatOpen = signal(false);
  chatMessages = signal<OrderMessage[]>([]);
  unreadChatCount = signal(0);
  submittingSupport = signal(false);
  blockedCancelMessage = BLOCKED_CANCEL_MESSAGE;
  cancelledByLabel = cancelledByLabel;
  private graceMinutes = 5;
  private pollHandle?: ReturnType<typeof setInterval>;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private toast: ToastService,
    private realtime: RealtimeService,
    private confirmService: ConfirmService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    await this.fetch(id);
    this.loading.set(false);
    this.orderService.getCancellationPolicy().then((p) => (this.graceMinutes = p.graceMinutes)).catch(() => {});
    // 3s poll is a safety net; the notification listener below is what makes
    // seller/delivery-partner status changes show up effectively instantly.
    this.pollHandle = setInterval(() => this.fetch(id), 3000);
    this.orderService
      .getUnreadMessageCount()
      .then((res) => this.unreadChatCount.set(res.byOrder[id]?.['customer-delivery'] ?? 0))
      .catch(() => {});
    this.realtime.on<OrderMessage>('message:new', (m) => {
      if (m.order !== this.order()?._id) return;
      if (this.chatOpen()) {
        this.chatMessages.update((msgs) => [...msgs, m]);
      } else {
        this.unreadChatCount.update((c) => c + 1);
      }
    });
    this.realtime.on<{ relatedOrder?: string | null }>('notification:new', (n) => {
      if (n.relatedOrder === this.order()?._id) this.fetch(id);
    });
  }

  ngOnDestroy() {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }

  private async fetch(id: string) {
    try {
      const { order } = await this.orderService.get(id);
      this.order.set(order);
      if (order.status === 'delivered' || order.status === 'cancelled' || order.status === 'rejected') {
        if (this.pollHandle) clearInterval(this.pollHandle);
      }
    } catch {
      // keep last known state
    }
  }

  partner() {
    const dp = this.order()?.deliveryPartner;
    return dp && typeof dp !== 'string' ? dp : null;
  }

  // "Reached" = this step's checkpoint has been passed in its own state
  // machine's ordinal sequence. Using each step's own machine (rather than
  // a single merged index) keeps e.g. "Reached Your Location" correctly
  // marked complete even when a delivery skips straight from
  // out_for_delivery to delivered (that stage is optional — see
  // deliveryController's DELIVERY_TRANSITIONS comment).
  private reachedStep(step: UnifiedStep, o: Order): boolean {
    if (step.source === 'order') {
      return ORDER_SEQUENCE.indexOf(o.status) >= ORDER_SEQUENCE.indexOf(step.key as OrderStatus);
    }
    const ordinal = DELIVERY_SEQUENCE.indexOf(o.deliveryStatus);
    if (ordinal < 0) return false;
    return ordinal >= DELIVERY_SEQUENCE.indexOf(step.key as DeliveryStatus);
  }

  currentStepIndex(): number {
    const o = this.order();
    if (!o) return -1;
    let last = -1;
    for (let i = 0; i < STEPS.length; i++) {
      if (this.reachedStep(STEPS[i], o)) last = i;
    }
    return last;
  }

  currentStatusLabel(): string {
    const i = this.currentStepIndex();
    return i >= 0 ? STEPS[i].label : 'Placed';
  }

  timeForStep(step: UnifiedStep): string | null {
    const o = this.order();
    if (!o) return null;
    if (step.source === 'order') {
      return o.statusHistory.find((h) => h.status === step.key)?.at ?? null;
    }
    return o.deliveryStatusHistory.find((h) => h.status === step.key)?.at ?? null;
  }

  isPaid(o: Order): boolean {
    return o.paymentMethod !== 'cod' || o.status === 'delivered';
  }

  paymentStatusLabel(o: Order): string {
    if (o.paymentMethod !== 'cod') return `Paid via ${o.paymentMethod.toUpperCase()}`;
    return o.status === 'delivered' ? 'Paid (Cash on delivery)' : 'Pay on delivery (Cash)';
  }

  isCancellable(o: Order): boolean {
    if (!NOT_YET_PREPARING_STATUSES.includes(o.status)) return false;
    if (o.status === 'placed') return true;
    // 'confirmed' — only within the grace period after the restaurant accepted.
    const confirmedAt = o.statusHistory.find((h) => h.status === 'confirmed')?.at;
    if (!confirmedAt) return true;
    const elapsedMs = Date.now() - new Date(confirmedAt).getTime();
    return elapsedMs <= this.graceMinutes * 60 * 1000;
  }

  refundLabel(o: Order): string {
    return refundStatusLabel(o.refundStatus);
  }

  refundClass(o: Order): string {
    return refundStatusClass(o.refundStatus);
  }

  async cancelOrder(id: string) {
    const { confirmed, reason } = await this.confirmService.askWithReason({
      title: 'Cancel Order?',
      message: 'Are you sure you want to cancel this order?',
      confirmLabel: 'Cancel Order',
      cancelLabel: 'Keep Order',
      reasonLabel: 'Cancellation Reason',
      reasons: CUSTOMER_CANCEL_REASONS,
    });
    if (!confirmed || !reason) return;

    this.cancelling.set(true);
    try {
      const { order } = await this.orderService.cancel(id, reason);
      this.order.set(order);
      if (this.pollHandle) clearInterval(this.pollHandle);
      this.toast.success('Order cancelled');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not cancel order');
    } finally {
      this.cancelling.set(false);
    }
  }

  async contactSupport(o: Order) {
    this.submittingSupport.set(true);
    try {
      const shortId = o._id.slice(-6);
      await this.authService.submitSupportRequest(
        `Cancellation request for order #${shortId}`,
        `I'd like help cancelling order #${shortId} at ${o.restaurantName} — it's already past the point I can cancel it myself.`
      );
      this.toast.success("Support has been notified — we'll reach out shortly");
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not reach support');
    } finally {
      this.submittingSupport.set(false);
    }
  }

  async submitRating(id: string) {
    this.submittingRating.set(true);
    try {
      await this.orderService.rateDelivery(id, this.ratingValue(), this.ratingComment.trim(), this.tipAmount || 0);
      this.rated.set(true);
      this.toast.success('Thanks for your feedback!');
    } catch (err: any) {
      if (err?.status === 409) this.rated.set(true);
      this.toast.error(err?.error?.message ?? 'Could not submit rating');
    } finally {
      this.submittingRating.set(false);
    }
  }

  async openChat() {
    const id = this.order()?._id;
    if (!id) return;
    this.chatOpen.set(true);
    this.unreadChatCount.set(0);
    try {
      const { messages } = await this.orderService.listMessages(id);
      this.chatMessages.set(messages);
    } catch {
      // keep whatever we have
    }
  }

  async sendChat(text: string) {
    const id = this.order()?._id;
    if (!id) return;
    try {
      const { message } = await this.orderService.sendMessage(id, text);
      this.chatMessages.update((msgs) => [...msgs, message]);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not send message');
    }
  }

  printInvoice() {
    window.print();
  }
}
