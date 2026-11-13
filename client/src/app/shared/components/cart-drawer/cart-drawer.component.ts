import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { IconComponent } from '../icon/icon.component';
import { InrPipe } from '../../pipes/inr.pipe';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [IconComponent, InrPipe],
  template: `
    @if (cart.isDrawerOpen()) {
      <button
        type="button"
        class="fixed inset-0 z-[90] animate-fade-in cursor-default bg-ink-950/55 backdrop-blur-[2px]"
        (click)="cart.closeDrawer()"
        aria-label="Close cart"
      ></button>
      <aside
        class="fixed inset-y-0 right-0 z-[91] flex h-full w-full max-w-[28rem] flex-col overflow-hidden rounded-l-[1.75rem] border-l border-white/60 bg-[#fffdfb] shadow-2xl sm:rounded-l-[2rem]"
        aria-label="Shopping cart"
      >
        <div class="border-b border-ink-100 bg-gradient-to-br from-[#fff3e9] via-[#fffaf6] to-white px-5 pb-5 pt-5 sm:px-7 sm:pt-7">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-ember-100 bg-white/80 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ember-700">
                <app-icon name="cart" [size]="12" />
                Your basket
              </span>
              <h2 class="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-[1.7rem]">
                Your order
                @if (!cart.isEmpty()) {
                  <span class="ml-1 text-base font-bold text-ink-400">({{ cart.itemCount() }})</span>
                }
              </h2>
              @if (cart.restaurantName()) {
                <p class="mt-1 truncate text-sm font-medium text-ink-500">Fresh from {{ cart.restaurantName() }}</p>
              } @else {
                <p class="mt-1 text-sm text-ink-500">A few delicious choices away.</p>
              }
            </div>
            <button
              type="button"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white bg-white/90 text-ink-500 shadow-sm transition hover:border-ember-100 hover:bg-ember-50 hover:text-ember-600"
              (click)="cart.closeDrawer()"
              aria-label="Close cart"
            >
              <app-icon name="x" [size]="19" />
            </button>
          </div>
          @if (!cart.isEmpty()) {
            <div class="mt-4 flex items-center gap-2 text-xs font-semibold text-basil-700">
              <span class="flex h-6 w-6 items-center justify-center rounded-full bg-basil-100">
                <app-icon name="check" [size]="13" />
              </span>
              <span>Your picks are saved in this cart</span>
            </div>
          }
          </div>

        <div class="flex-1 overflow-y-auto px-5 py-4 sm:px-7">
          @if (cart.isEmpty()) {
            <div class="flex h-full min-h-72 flex-col items-center justify-center px-4 text-center">
              <span class="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-ember-50 to-[#fff0e6] text-ember-500 ring-1 ring-ember-100">
                <app-icon name="cart" [size]="34" />
              </span>
              <h3 class="mt-5 font-display text-xl font-extrabold text-ink-900">Your cart is waiting</h3>
              <p class="mt-2 max-w-xs text-sm leading-6 text-ink-500">Find a favorite dish and it will show up here, ready for checkout.</p>
              <button
                type="button"
                class="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-ember-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-ember-500/20 transition hover:-translate-y-0.5 hover:bg-ember-600"
                (click)="cart.closeDrawer(); router.navigate(['/restaurants'])"
              >
                Explore restaurants
                <app-icon name="chevron_right" [size]="16" />
              </button>
            </div>
          } @else {
            @for (line of cart.items(); track line.menuItem._id) {
              <div class="flex items-center gap-3 border-b border-ink-100/80 py-4 last:border-0 sm:gap-4">
                <div class="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl bg-ink-100 ring-1 ring-black/5">
                  <img [src]="line.menuItem.image" class="h-full w-full object-cover" [alt]="line.menuItem.name" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-2 text-sm font-extrabold leading-snug text-ink-900">{{ line.menuItem.name }}</p>
                  <p class="mt-1 text-xs font-medium text-ink-400">{{ line.menuItem.price | inr }} each</p>
                  <div class="mt-2.5 flex items-center justify-between gap-2">
                    <div class="inline-flex items-center gap-3 rounded-full border border-ink-200 bg-white px-2 py-1">
                      <button
                        type="button"
                        class="flex h-6 w-6 items-center justify-center rounded-full text-ink-500 transition hover:bg-ember-50 hover:text-ember-600"
                        (click)="cart.setQty(line.menuItem._id, line.qty - 1)"
                        [attr.aria-label]="'Decrease ' + line.menuItem.name"
                      >
                        <app-icon name="minus" [size]="12" />
                      </button>
                      <span class="min-w-3 text-center text-xs font-extrabold text-ink-800">{{ line.qty }}</span>
                      <button
                        type="button"
                        class="flex h-6 w-6 items-center justify-center rounded-full text-ink-500 transition hover:bg-ember-50 hover:text-ember-600"
                        (click)="cart.setQty(line.menuItem._id, line.qty + 1)"
                        [attr.aria-label]="'Increase ' + line.menuItem.name"
                      >
                        <app-icon name="plus" [size]="12" />
                      </button>
                    </div>
                    <span class="shrink-0 text-sm font-extrabold text-ink-900">{{ line.menuItem.price * line.qty | inr }}</span>
                  </div>
                </div>
              </div>
            }
          }
        </div>

        @if (!cart.isEmpty()) {
          <div class="border-t border-ink-100 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-7">
            <div class="mb-4 rounded-2xl bg-ink-50/80 p-4">
              <div class="flex items-center justify-between text-sm">
                <span class="font-semibold text-ink-500">Subtotal</span>
                <span class="font-extrabold text-ink-900">{{ cart.subtotal() | inr }}</span>
              </div>
              <p class="mt-1.5 text-xs leading-5 text-ink-400">Delivery fees and taxes are calculated at checkout.</p>
            </div>
            <button
              type="button"
              class="flex min-h-12 w-full items-center justify-between rounded-xl bg-ember-500 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-ember-500/20 transition hover:bg-ember-600"
              (click)="goToCart()"
            >
              <span>View cart & checkout</span>
              <span class="flex items-center gap-1.5">
                {{ cart.subtotal() | inr }}
                <app-icon name="chevron_right" [size]="17" />
              </span>
            </button>
          </div>
        }
      </aside>
    }
  `,
})
export class CartDrawerComponent {
  constructor(
    public cart: CartService,
    public router: Router
  ) {}

  goToCart() {
    this.cart.closeDrawer();
    this.router.navigate(['/cart']);
  }
}
