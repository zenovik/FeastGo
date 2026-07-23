import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Restaurant } from '../../core/models/restaurant.model';
import { Address } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { InrPipe } from '../../shared/pipes/inr.pipe';

type PaymentMethod = 'card' | 'upi' | 'cod';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, InrPipe],
  template: `
    <div class="container-shell max-w-2xl py-10">
      <a routerLink="/cart" class="flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800">
        <app-icon name="arrow-left" [size]="16" /> Back to cart
      </a>
      <h1 class="mt-2 font-display text-2xl font-bold text-ink-900">Checkout</h1>

      @if (cart.isEmpty()) {
        <p class="mt-8 text-ink-400">Your cart is empty.</p>
      } @else {
        <section class="card-surface mt-6 p-4">
          <div class="flex items-center justify-between">
            <h2 class="font-display text-base font-bold text-ink-900">Delivery address</h2>
            <button type="button" class="text-sm font-semibold text-ember-600" (click)="showAddressForm.set(!showAddressForm())">
              {{ showAddressForm() ? 'Cancel' : '+ Add new' }}
            </button>
          </div>

          <div class="mt-3 space-y-2">
            @for (addr of auth.currentUser()?.addresses ?? []; track addr._id) {
              <label
                class="flex cursor-pointer items-start gap-3 rounded-xl border p-3"
                [class]="selectedAddressId() === addr._id ? 'border-ember-500 bg-ember-50' : 'border-ink-200'"
              >
                <input
                  type="radio"
                  class="mt-1 accent-ember-500"
                  name="address"
                  [checked]="selectedAddressId() === addr._id"
                  (change)="selectedAddressId.set(addr._id ?? null)"
                />
                <span>
                  <span class="block text-sm font-semibold text-ink-800">{{ addr.label }}</span>
                  <span class="block text-sm text-ink-500">{{ addr.line1 }}, {{ addr.area }}, {{ addr.city }}</span>
                </span>
              </label>
            }
          </div>

          @if (showAddressForm()) {
            <form class="mt-3 space-y-2 rounded-xl border border-dashed border-ink-200 p-3" (submit)="saveAddress($event)">
              <div class="grid grid-cols-2 gap-2">
                <input [(ngModel)]="newAddress.label" name="label" placeholder="Label (Home, Work)" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
                <input [(ngModel)]="newAddress.city" name="city" placeholder="City" required class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
              </div>
              <input [(ngModel)]="newAddress.line1" name="line1" placeholder="Street address" required class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
              <input [(ngModel)]="newAddress.area" name="area" placeholder="Area / neighborhood" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
              <button type="submit" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white">Save address</button>
            </form>
          }
        </section>

        <section class="card-surface mt-4 p-4">
          <h2 class="font-display text-base font-bold text-ink-900">Payment method</h2>
          <div class="mt-3 grid grid-cols-3 gap-2">
            @for (m of paymentMethods; track m.value) {
              <button
                type="button"
                class="flex flex-col items-center gap-1.5 rounded-xl border py-3 text-sm font-semibold"
                [class]="paymentMethod() === m.value ? 'border-ember-500 bg-ember-50 text-ember-600' : 'border-ink-200 text-ink-600'"
                (click)="paymentMethod.set(m.value)"
              >
                <app-icon [name]="m.icon" [size]="18" />
                {{ m.label }}
              </button>
            }
          </div>
        </section>

        <section class="card-surface mt-4 p-4">
          <h2 class="font-display text-base font-bold text-ink-900">Coupon</h2>
          @if (appliedCoupon(); as c) {
            <div class="mt-2 flex items-center justify-between rounded-lg bg-basil-50 px-3 py-2 text-sm">
              <span class="font-semibold text-basil-700">{{ c.code }} applied — you saved {{ c.discount | inr }}</span>
              <button type="button" class="text-xs font-bold text-ink-500 hover:text-ink-800" (click)="removeCoupon()">Remove</button>
            </div>
          } @else {
            <div class="mt-2 flex gap-2">
              <input
                [(ngModel)]="couponInput"
                name="couponCode"
                placeholder="Enter coupon code"
                class="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm uppercase outline-none focus:border-ember-400"
              />
              <button
                type="button"
                [disabled]="!couponInput.trim() || applyingCoupon()"
                class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                (click)="applyCoupon()"
              >
                {{ applyingCoupon() ? 'Checking…' : 'Apply' }}
              </button>
            </div>
            @if (couponError()) {
              <p class="mt-1.5 text-xs font-medium text-ember-600">{{ couponError() }}</p>
            }
          }
        </section>

        <section class="card-surface mt-4 p-4">
          <h2 class="font-display text-base font-bold text-ink-900">Order summary</h2>
          <div class="mt-2 space-y-1 text-sm">
            @for (line of cart.items(); track line.menuItem._id) {
              <div class="flex justify-between text-ink-500">
                <span>{{ line.qty }} × {{ line.menuItem.name }}</span>
                <span>{{ line.menuItem.price * line.qty | inr }}</span>
              </div>
            }
          </div>
          <div class="mt-3 space-y-1 border-t border-ink-100 pt-3 text-sm text-ink-500">
            <div class="flex justify-between"><span>Subtotal</span><span>{{ subtotal() | inr }}</span></div>
            <div class="flex justify-between"><span>Delivery fee</span><span>{{ deliveryFee() | inr }}</span></div>
            <div class="flex justify-between"><span>Taxes</span><span>{{ taxes() | inr }}</span></div>
            @if (discount() > 0) {
              <div class="flex justify-between text-basil-600"><span>Discount</span><span>-{{ discount() | inr }}</span></div>
            }
          </div>
          <div class="mt-2 flex justify-between border-t border-ink-100 pt-3 text-base font-bold text-ink-900">
            <span>Total</span><span>{{ total() | inr }}</span>
          </div>
        </section>

        <button
          type="button"
          class="mt-5 w-full rounded-xl bg-ember-500 py-3.5 text-sm font-bold text-white hover:bg-ember-600 disabled:opacity-40"
          [disabled]="!selectedAddressId() || placing()"
          (click)="placeOrder()"
        >
          {{ placing() ? 'Placing order…' : 'Place order · ' + (total() | inr) }}
        </button>
      }
    </div>
  `,
})
export class CheckoutComponent implements OnInit {
  restaurant = signal<Restaurant | null>(null);
  showAddressForm = signal(false);
  selectedAddressId = signal<string | null>(null);
  paymentMethod = signal<PaymentMethod>('cod');
  placing = signal(false);
  couponInput = '';
  applyingCoupon = signal(false);
  couponError = signal<string | null>(null);
  appliedCoupon = signal<{ code: string; discount: number } | null>(null);

  newAddress: Partial<Address> = { label: 'Home', line1: '', area: '', city: '' };

  paymentMethods: { value: PaymentMethod; label: string; icon: string }[] = [
    { value: 'card', label: 'Card', icon: 'credit-card' },
    { value: 'upi', label: 'UPI', icon: 'phone' },
    { value: 'cod', label: 'Cash', icon: 'banknote' },
  ];

  constructor(
    public cart: CartService,
    public auth: AuthService,
    private restaurantService: RestaurantService,
    private orderService: OrderService,
    private toast: ToastService,
    private router: Router
  ) {}

  async ngOnInit() {
    const slug = this.cart.restaurantSlug();
    if (slug) {
      const { restaurant } = await this.restaurantService.getBySlug(slug);
      this.restaurant.set(restaurant);
    }
    const defaultAddr = this.auth.currentUser()?.addresses.find((a) => a.isDefault) ?? this.auth.currentUser()?.addresses[0];
    if (defaultAddr?._id) this.selectedAddressId.set(defaultAddr._id);
  }

  subtotal(): number {
    return this.cart.subtotal();
  }
  deliveryFee(): number {
    return this.restaurant()?.deliveryFee ?? 0;
  }
  taxes(): number {
    return Math.round(this.subtotal() * 0.05);
  }
  discount(): number {
    return this.appliedCoupon()?.discount ?? 0;
  }
  total(): number {
    return Math.round(this.subtotal() + this.deliveryFee() + this.taxes() - this.discount());
  }

  async applyCoupon() {
    const slug = this.cart.restaurantSlug();
    if (!slug || !this.couponInput.trim()) return;
    this.applyingCoupon.set(true);
    this.couponError.set(null);
    try {
      const res = await this.restaurantService.validateCoupon(slug, this.couponInput.trim(), this.subtotal());
      this.appliedCoupon.set(res);
      this.toast.success(`Coupon ${res.code} applied`);
    } catch (err: any) {
      this.couponError.set(err?.error?.message ?? 'Could not apply this coupon');
    } finally {
      this.applyingCoupon.set(false);
    }
  }

  removeCoupon() {
    this.appliedCoupon.set(null);
    this.couponInput = '';
    this.couponError.set(null);
  }

  async saveAddress(e: Event) {
    e.preventDefault();
    if (!this.newAddress.line1 || !this.newAddress.city) return;
    const user = await this.auth.addAddress(this.newAddress as Address);
    const added = user.addresses[user.addresses.length - 1];
    if (added?._id) this.selectedAddressId.set(added._id);
    this.showAddressForm.set(false);
    this.newAddress = { label: 'Home', line1: '', area: '', city: '' };
  }

  async placeOrder() {
    const address = this.auth.currentUser()?.addresses.find((a) => a._id === this.selectedAddressId());
    const slug = this.cart.restaurantSlug();
    if (!address || !slug) return;

    this.placing.set(true);
    try {
      const { order } = await this.orderService.place({
        restaurantSlug: slug,
        items: this.cart.items().map((i) => ({ menuItemId: i.menuItem._id, qty: i.qty })),
        address,
        paymentMethod: this.paymentMethod(),
        couponCode: this.appliedCoupon()?.code ?? null,
      });
      this.cart.clear();
      this.toast.success('Order placed!');
      this.router.navigate(['/orders', order._id]);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not place your order. Please try again.');
    } finally {
      this.placing.set(false);
    }
  }
}
