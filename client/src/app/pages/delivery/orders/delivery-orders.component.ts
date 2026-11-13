import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryOrderDetail, Order } from '../../../core/models/order.model';
import { OrderMessage } from '../../../core/models/message.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import { DeliveryService } from '../../../core/services/delivery.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { ToastService } from '../../../core/services/toast.service';
import { ChatPanelComponent } from '../../../shared/components/chat-panel/chat-panel.component';
import { DeliveryShellComponent } from '../../../shared/components/delivery-shell/delivery-shell.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

declare const BarcodeDetector: { new (options: { formats: string[] }): { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> } };

const ACTIVE_STATUSES = ['assigned', 'accepted', 'reached_restaurant', 'picked_up', 'out_for_delivery', 'reached_customer'];
const POST_PICKUP_STATUSES = ['picked_up', 'out_for_delivery', 'reached_customer'];
type ChatWith = 'customer' | 'seller' | null;

const REJECT_REASONS = ['Vehicle Issue', 'Emergency', 'Unable to Reach Restaurant', 'Heavy Traffic', 'Personal Emergency', 'Other'];
const CANCEL_REASONS = ['Vehicle Issue', 'Emergency', 'Unable to Reach Restaurant', 'Heavy Traffic', 'Personal Emergency', 'Other'];

function mapsLink(lat: number | null | undefined, lng: number | null | undefined, fallbackAddress: string): string {
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fallbackAddress)}`;
}

@Component({
  selector: 'app-delivery-orders',
  standalone: true,
  imports: [FormsModule, DeliveryShellComponent, InrPipe, IconComponent, ImageUploadComponent, ChatPanelComponent],
  template: `
    <app-delivery-shell title="Orders">
    <div class="max-w-2xl">
      <h1 class="font-display text-2xl font-bold text-ink-900">My Deliveries</h1>

      @if (loading()) {
        <div class="mt-4 h-40 animate-pulse rounded-2xl bg-ink-100"></div>
      } @else if (order(); as o) {
        <div class="card-surface mt-4 p-5">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-ink-900">{{ o.restaurantName }}</p>
            <span class="rounded-full bg-ink-50 px-2.5 py-1 text-xs font-bold capitalize text-ink-600">{{ o.deliveryStatus.replaceAll('_', ' ') }}</span>
          </div>
          <p class="mt-1 text-xs text-ink-400">#{{ o._id.slice(-6) }} · {{ o.total | inr }}</p>

          @if (detail()?.address?.instructions) {
            <div class="mt-3 flex items-start gap-2 rounded-lg bg-gold-400/15 px-3 py-2 text-xs text-gold-700">
              <app-icon name="info" [size]="14" class="mt-0.5 shrink-0" />
              <span><strong>Delivery instructions:</strong> {{ detail()!.address.instructions }}</span>
            </div>
          }

          @if (detail(); as d) {
            <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="rounded-lg bg-ink-50 p-3">
                <p class="text-xs font-bold uppercase text-ink-400">Restaurant</p>
                <p class="mt-1 text-sm font-semibold text-ink-800">{{ d.restaurant.name }}</p>
                <p class="text-xs text-ink-500">{{ d.restaurant.address?.line1 }}, {{ d.restaurant.address?.area }}, {{ d.restaurant.address?.city }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <a [href]="restaurantMapsLink(d)" target="_blank" rel="noopener" class="flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-bold text-ink-700">
                    <app-icon name="compass" [size]="13" /> Navigate
                  </a>
                  @if (sellerPhone()) {
                    <a [href]="'tel:' + sellerPhone()" class="flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-bold text-ink-700">
                      <app-icon name="phone" [size]="13" /> Call seller
                    </a>
                  }
                  <button type="button" class="relative flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-bold text-ink-700" (click)="openChat('seller')">
                    <app-icon name="mail" [size]="13" /> Chat
                    @if (unreadFromSeller() > 0) {
                      <span class="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-white">
                        {{ unreadFromSeller() > 9 ? '9+' : unreadFromSeller() }}
                      </span>
                    }
                  </button>
                </div>
              </div>
              <div class="rounded-lg bg-ink-50 p-3">
                <p class="text-xs font-bold uppercase text-ink-400">Customer</p>
                <p class="mt-1 text-sm font-semibold text-ink-800">{{ d.user.name }}</p>
                <p class="text-xs text-ink-500">{{ d.address.line1 }}, {{ d.address.area }}, {{ d.address.city }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <a [href]="customerMapsLink(d)" target="_blank" rel="noopener" class="flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-bold text-ink-700">
                    <app-icon name="compass" [size]="13" /> Navigate
                  </a>
                  <a [href]="'tel:' + d.user.phone" class="flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-bold text-ink-700">
                    <app-icon name="phone" [size]="13" /> Call customer
                  </a>
                  <button type="button" class="relative flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-bold text-ink-700" (click)="openChat('customer')">
                    <app-icon name="mail" [size]="13" /> Chat
                    @if (unreadFromCustomer() > 0) {
                      <span class="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-white">
                        {{ unreadFromCustomer() > 9 ? '9+' : unreadFromCustomer() }}
                      </span>
                    }
                  </button>
                </div>
              </div>
            </div>
          }

          <div class="mt-4 space-y-2">
            @if (o.deliveryStatus === 'assigned') {
              <div class="flex gap-2">
                <button type="button" class="flex-1 rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white" (click)="accept()">Accept order</button>
                <button type="button" class="flex-1 rounded-lg border border-ember-500 py-2.5 text-sm font-bold text-ember-600" (click)="reject()">Reject</button>
              </div>
            }
            @if (o.deliveryStatus === 'accepted') {
              <button type="button" class="w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white" (click)="advance('reached_restaurant')">Reached restaurant</button>
            }
            @if (o.deliveryStatus === 'reached_restaurant') {
              <button type="button" class="w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white" (click)="advance('picked_up')">Mark picked up</button>
            }
            @if (o.deliveryStatus === 'picked_up') {
              <button type="button" class="w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white" (click)="advance('out_for_delivery')">Start delivery (out for delivery)</button>
            }
            @if (o.deliveryStatus === 'out_for_delivery') {
              <button type="button" class="w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white" (click)="advance('reached_customer')">Reached customer</button>
            }
            @if (o.deliveryStatus === 'out_for_delivery' || o.deliveryStatus === 'reached_customer') {
              <div class="rounded-lg border border-dashed border-ink-200 p-3">
                <p class="text-xs font-semibold text-ink-500">Enter the customer's delivery OTP or scan their QR code — required to confirm delivery</p>
                <input
                  [(ngModel)]="otpInput"
                  name="otpInput"
                  maxlength="4"
                  inputmode="numeric"
                  placeholder="4-digit OTP"
                  class="mt-2 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm tracking-widest outline-none focus:border-ember-400"
                />
                @if (!scanning()) {
                  <button type="button" class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink-200 py-2 text-xs font-bold text-ink-600" (click)="startScan()">
                    <app-icon name="compass" [size]="13" /> Scan QR code instead
                  </button>
                } @else {
                  <div class="relative mt-2 overflow-hidden rounded-lg bg-black">
                    <video #video autoplay playsinline muted class="h-40 w-full object-cover"></video>
                    <button type="button" class="absolute right-2 top-2 rounded-full bg-white/80 p-1.5" (click)="stopScan()">
                      <app-icon name="x" [size]="13" />
                    </button>
                  </div>
                }
              </div>
              <div class="flex items-center gap-3 rounded-lg border border-dashed border-ink-200 p-3">
                <app-image-upload
                  shape="square"
                  size="sm"
                  [maxBytes]="3000000"
                  [value]="proofImage"
                  (picked)="onProofPicked($event)"
                  (invalidFile)="toast.error($event)"
                  label=""
                />
                <span class="text-sm text-ink-500">{{ proofImage ? 'Proof photo attached ✓' : 'Attach delivery proof photo (optional)' }}</span>
              </div>
              <button type="button" [disabled]="otpInput.trim().length < 4" class="w-full rounded-lg bg-basil-500 py-2.5 text-sm font-bold text-white disabled:opacity-50" (click)="markDelivered()">
                Mark delivered
              </button>
            }
            @if (o.deliveryStatus === 'accepted' || o.deliveryStatus === 'reached_restaurant') {
              <button type="button" class="w-full text-xs font-semibold text-ink-400" (click)="cancelDelivery()">Can't complete this delivery</button>
            }
            @if (isPostPickup(o)) {
              <div class="flex gap-2">
                <button type="button" class="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-ink-200 py-2 text-xs font-bold text-ink-600" (click)="reportFailed()">
                  <app-icon name="alert-triangle" [size]="13" /> Report Issue
                </button>
                <button type="button" [disabled]="submittingSupport()" class="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-ink-200 py-2 text-xs font-bold text-ink-600 disabled:opacity-50" (click)="contactSupport(o)">
                  <app-icon name="headset" [size]="13" /> {{ submittingSupport() ? 'Sending…' : 'Contact Support' }}
                </button>
              </div>
            }
          </div>
        </div>
      } @else {
        <p class="mt-6 text-center text-sm text-ink-400">No active deliveries. Head to the dashboard to accept one.</p>
      }
    </div>

    @if (chatWith()) {
      <div class="fixed bottom-4 right-4 z-50">
        <app-chat-panel
          [title]="chatWith() === 'customer' ? 'Chat with customer' : 'Chat with seller'"
          [messages]="chatMessages()"
          myRole="delivery"
          (sendMessage)="sendChat($event)"
          (closed)="chatWith.set(null)"
        />
      </div>
    }
    </app-delivery-shell>
  `,
})
export class DeliveryOrdersComponent implements OnInit, OnDestroy {
  order = signal<Order | null>(null);
  detail = signal<DeliveryOrderDetail | null>(null);
  sellerPhone = signal('');
  loading = signal(true);
  otpInput = '';
  proofImage: string | null = null;

  scanning = signal(false);
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  private stream?: MediaStream;
  private scanRunning = false;

  chatWith = signal<ChatWith>(null);
  chatMessages = signal<OrderMessage[]>([]);
  unreadFromCustomer = signal(0);
  unreadFromSeller = signal(0);
  submittingSupport = signal(false);
  private messageListenerAttached = false;

  constructor(
    private deliveryService: DeliveryService,
    private realtime: RealtimeService,
    private confirmService: ConfirmService,
    private deliveryAuth: DeliveryAuthService,
    public toast: ToastService
  ) {}

  isPostPickup(o: Order): boolean {
    return POST_PICKUP_STATUSES.includes(o.deliveryStatus);
  }

  async contactSupport(o: Order) {
    this.submittingSupport.set(true);
    try {
      const shortId = o._id.slice(-6);
      await this.deliveryAuth.submitSupportRequest(
        `Help needed with delivery #${shortId}`,
        `I need support with an active delivery — order #${shortId} from ${o.restaurantName}.`
      );
      this.toast.success("Support has been notified — we'll reach out shortly");
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not reach support');
    } finally {
      this.submittingSupport.set(false);
    }
  }

  private refreshTimer?: ReturnType<typeof setTimeout>;

  async ngOnInit() {
    await this.refresh();
    if (!this.messageListenerAttached) {
      this.messageListenerAttached = true;
      this.realtime.on<OrderMessage>('message:new', (m) => {
        const o = this.order();
        if (!o || m.order !== o._id) return;
        if (this.chatWith() && m.thread === `${this.chatWith()}-delivery`) {
          this.chatMessages.update((list) => [...list, m]);
        } else {
          this.toast.info(`New message from ${m.senderName}`, { description: m.text });
          if (m.thread === 'customer-delivery') this.unreadFromCustomer.update((c) => c + 1);
          else this.unreadFromSeller.update((c) => c + 1);
        }
      });
      this.realtime.on<{ relatedOrder?: string | null }>('notification:new', (n) => {
        if (!n.relatedOrder) return;
        clearTimeout(this.refreshTimer);
        this.refreshTimer = setTimeout(() => this.refresh(), 400);
      });
    }
  }

  ngOnDestroy() {
    this.stopScan();
  }

  private async refresh() {
    this.loading.set(true);
    try {
      const res = await this.deliveryService.listMyOrders();
      const active = res.orders.find((o) => ACTIVE_STATUSES.includes(o.deliveryStatus)) ?? null;
      this.order.set(active);
      if (active) {
        const detailRes = await this.deliveryService.getOrderDetail(active._id);
        this.detail.set(detailRes.order);
        this.sellerPhone.set(detailRes.sellerPhone);
        this.deliveryService
          .getUnreadMessageCount()
          .then((r) => {
            const threads = r.byOrder[active._id] ?? {};
            this.unreadFromCustomer.set(threads['customer-delivery'] ?? 0);
            this.unreadFromSeller.set(threads['seller-delivery'] ?? 0);
          })
          .catch(() => {});
      } else {
        this.detail.set(null);
        this.unreadFromCustomer.set(0);
        this.unreadFromSeller.set(0);
      }
    } finally {
      this.loading.set(false);
    }
  }

  restaurantMapsLink(d: DeliveryOrderDetail): string {
    const addr = d.restaurant.address;
    return mapsLink(d.restaurant.location?.lat, d.restaurant.location?.lng, `${addr?.line1 ?? ''}, ${addr?.area ?? ''}, ${addr?.city ?? ''}`);
  }

  customerMapsLink(d: DeliveryOrderDetail): string {
    return mapsLink(null, null, `${d.address.line1}, ${d.address.area}, ${d.address.city}`);
  }

  async accept() {
    const o = this.order();
    if (!o) return;
    try {
      await this.deliveryService.acceptOrder(o._id);
      this.toast.success('Order accepted');
      await this.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not accept order');
    }
  }

  async reject() {
    const o = this.order();
    if (!o) return;
    const { confirmed, reason } = await this.confirmService.askWithReason({
      title: 'Reject this order?',
      message: "It'll be reassigned to another delivery partner.",
      confirmLabel: 'Reject Order',
      cancelLabel: 'Keep Order',
      reasonLabel: 'Reason for rejecting',
      reasons: REJECT_REASONS,
    });
    if (!confirmed || !reason) return;
    try {
      await this.deliveryService.rejectOrder(o._id, reason);
      this.toast.success('Order rejected');
      await this.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not reject order');
    }
  }

  async advance(status: string) {
    const o = this.order();
    if (!o) return;
    try {
      await this.deliveryService.updateDeliveryStatus(o._id, status);
      this.toast.success(`Marked as ${status.replaceAll('_', ' ')}`);
      await this.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update status');
    }
  }

  onProofPicked(e: { dataUrl: string; file: File }) {
    this.proofImage = e.dataUrl;
  }

  startScan() {
    if (typeof BarcodeDetector === 'undefined') {
      this.toast.error('QR scanning is not supported on this browser — enter the code manually');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        this.stream = stream;
        this.scanning.set(true);
        this.scanRunning = true;
        setTimeout(() => {
          if (!this.videoRef) return;
          this.videoRef.nativeElement.srcObject = stream;
          this.detectLoop();
        });
      })
      .catch(() => this.toast.error('Camera access denied'));
  }

  private detectLoop() {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const tick = async () => {
      if (!this.scanRunning || !this.videoRef) return;
      try {
        const codes = await detector.detect(this.videoRef.nativeElement);
        if (codes.length) {
          this.otpInput = codes[0].rawValue.trim();
          this.toast.success('QR code scanned');
          this.stopScan();
          return;
        }
      } catch {
        // keep trying — a frame occasionally fails to decode, that's normal
      }
      if (this.scanRunning) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  stopScan() {
    this.scanning.set(false);
    this.scanRunning = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
  }

  async markDelivered() {
    const o = this.order();
    if (!o) return;
    if (this.otpInput.trim().length < 4) {
      this.toast.error('Enter the delivery OTP or scan the QR code first');
      return;
    }
    try {
      await this.deliveryService.updateDeliveryStatus(o._id, 'delivered', {
        otp: this.otpInput.trim(),
        proofImage: this.proofImage || undefined,
      });
      this.toast.success('Delivery completed!');
      this.otpInput = '';
      this.proofImage = null;
      await this.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not mark delivered');
    }
  }

  async reportFailed() {
    const o = this.order();
    if (!o) return;
    const reason = prompt('Why did the delivery fail? (e.g. customer unreachable)') ?? '';
    try {
      await this.deliveryService.updateDeliveryStatus(o._id, 'failed', { reason });
      this.toast.success('Reported — our team will follow up');
      await this.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not report failure');
    }
  }

  async cancelDelivery() {
    const o = this.order();
    if (!o) return;
    const { confirmed, reason } = await this.confirmService.askWithReason({
      title: 'Cancel this delivery?',
      message: "It'll be unassigned from you and reassigned to another delivery partner.",
      confirmLabel: 'Cancel Delivery',
      cancelLabel: 'Keep Delivery',
      reasonLabel: 'Reason',
      reasons: CANCEL_REASONS,
    });
    if (!confirmed || !reason) return;
    try {
      await this.deliveryService.updateDeliveryStatus(o._id, 'cancelled', { reason });
      this.toast.success('Delivery cancelled');
      await this.refresh();
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not cancel delivery');
    }
  }

  async openChat(withRole: 'customer' | 'seller') {
    const o = this.order();
    if (!o) return;
    this.chatWith.set(withRole);
    if (withRole === 'customer') this.unreadFromCustomer.set(0);
    else this.unreadFromSeller.set(0);
    try {
      const res = await this.deliveryService.listMessages(o._id, withRole);
      this.chatMessages.set(res.messages);
    } catch {
      this.chatMessages.set([]);
    }
  }

  async sendChat(text: string) {
    const o = this.order();
    const withRole = this.chatWith();
    if (!o || !withRole) return;
    try {
      const res = await this.deliveryService.sendMessage(o._id, withRole, text);
      this.chatMessages.update((list) => [...list, res.message]);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not send message');
    }
  }
}
