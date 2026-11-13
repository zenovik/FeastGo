import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { InrPipe } from '../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, IconComponent, InrPipe],
  template: `
    <main class="container-shell-full max-w-6xl pb-12 pt-6 sm:pb-16 sm:pt-10">
      <header class="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#fff3e9] via-[#fffaf6] to-[#ffe9df] px-5 py-6 sm:rounded-[2rem] sm:px-8 sm:py-8">
        <div class="pointer-events-none absolute -right-14 -top-20 -z-10 h-56 w-56 rounded-full bg-ember-200/50 blur-3xl" aria-hidden="true"></div>
        <div class="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ember-700">
          <app-icon name="cart" [size]="14" /> Your basket
        </div>
        <div class="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Your cart</h1>
            @if (!cart.isEmpty()) {
              <p class="mt-1.5 text-sm text-ink-600">A delicious order from <span class="font-bold text-ink-800">{{ cart.restaurantName() }}</span></p>
            } @else {
              <p class="mt-1.5 text-sm text-ink-600">Your next favorite meal starts here.</p>
            }
          </div>
          @if (!cart.isEmpty()) {
            <span class="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-bold text-ink-600 shadow-sm">
              <app-icon name="package" [size]="14" class="text-ember-600" />
              {{ cart.itemCount() }} {{ cart.itemCount() === 1 ? 'item' : 'items' }}
            </span>
          }
        </div>
      </header>

      @if (cart.isEmpty()) {
        <section class="mt-6 flex flex-col items-center rounded-[1.75rem] border border-ink-100 bg-white px-5 py-14 text-center shadow-sm sm:mt-8 sm:py-20">
          <span class="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-ember-50 to-[#fff0e6] text-ember-500 ring-1 ring-ember-100">
            <app-icon name="cart" [size]="34" />
          </span>
          <h2 class="mt-5 font-display text-xl font-extrabold text-ink-900 sm:text-2xl">Your cart is empty</h2>
          <p class="mt-2 max-w-sm text-sm leading-6 text-ink-500">Take a look around and add something delicious. Your selected dishes will be waiting here.</p>
          <a
            routerLink="/restaurants"
            class="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-ember-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-ember-500/20 transition hover:-translate-y-0.5 hover:bg-ember-600"
          >
            Browse restaurants
            <app-icon name="chevron_right" [size]="16" />
          </a>
        </section>
      } @else {
        <div class="mt-6 grid items-start gap-5 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
          <section class="min-w-0 overflow-hidden rounded-[1.5rem] border border-ink-100 bg-white shadow-sm sm:rounded-[1.75rem]" aria-label="Items in your cart">
            <div class="flex items-center justify-between border-b border-ink-100 px-4 py-4 sm:px-6">
              <div>
                <h2 class="font-display text-base font-extrabold text-ink-900 sm:text-lg">Your picks</h2>
                <p class="mt-0.5 text-xs text-ink-400">Adjust quantities before you check out</p>
              </div>
            </div>

            <div class="divide-y divide-ink-100/80 px-4 sm:px-6">
              @for (line of cart.items(); track line.menuItem._id) {
                <article class="flex gap-3 py-4 sm:gap-4 sm:py-5">
                  <div class="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-ink-100 ring-1 ring-black/5 sm:h-24 sm:w-24">
                    <img [src]="line.menuItem.image" class="h-full w-full object-cover" [alt]="line.menuItem.name" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <h3 class="line-clamp-2 text-sm font-extrabold leading-snug text-ink-900 sm:text-base">{{ line.menuItem.name }}</h3>
                        <p class="mt-1 text-xs font-medium text-ink-400">{{ line.menuItem.price | inr }} each</p>
                      </div>
                      <button
                        type="button"
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-300 transition hover:bg-ember-50 hover:text-ember-600"
                        (click)="cart.remove(line.menuItem._id)"
                        [attr.aria-label]="'Remove ' + line.menuItem.name + ' from cart'"
                      >
                        <app-icon name="trash" [size]="15" />
                      </button>
                    </div>
                    <div class="mt-3 flex items-center justify-between gap-2">
                      <div class="inline-flex items-center gap-3 rounded-full border border-ink-200 bg-white px-2 py-1">
                        <button
                          type="button"
                          class="flex h-7 w-7 items-center justify-center rounded-full text-ink-500 transition hover:bg-ember-50 hover:text-ember-600"
                          (click)="cart.setQty(line.menuItem._id, line.qty - 1)"
                          [attr.aria-label]="'Decrease ' + line.menuItem.name"
                        >
                          <app-icon name="minus" [size]="13" />
                        </button>
                        <span class="min-w-3 text-center text-sm font-extrabold text-ink-800">{{ line.qty }}</span>
                        <button
                          type="button"
                          class="flex h-7 w-7 items-center justify-center rounded-full text-ink-500 transition hover:bg-ember-50 hover:text-ember-600"
                          (click)="cart.setQty(line.menuItem._id, line.qty + 1)"
                          [attr.aria-label]="'Increase ' + line.menuItem.name"
                        >
                          <app-icon name="plus" [size]="13" />
                        </button>
                      </div>
                      <span class="text-sm font-extrabold text-ink-900">{{ line.menuItem.price * line.qty | inr }}</span>
                    </div>
                  </div>
                </article>
              }
            </div>

            <a routerLink="/restaurants" class="flex items-center gap-2 border-t border-ink-100 px-4 py-4 text-sm font-bold text-ember-700 transition hover:bg-ember-50/50 sm:px-6">
              <app-icon name="plus" [size]="15" />
              Add more dishes
            </a>
          </section>

          <aside class="rounded-[1.5rem] border border-ink-100 bg-white p-5 shadow-sm sm:rounded-[1.75rem] sm:p-6 lg:sticky lg:top-24">
            <div class="flex items-center gap-2">
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-ember-50 text-ember-600">
                <app-icon name="receipt" [size]="17" />
              </span>
              <h2 class="font-display text-lg font-extrabold text-ink-900">Order summary</h2>
            </div>
            <div class="mt-5 space-y-3 border-b border-ink-100 pb-4 text-sm">
              <div class="flex justify-between gap-3 text-ink-500">
                <span>Subtotal</span><span class="font-bold text-ink-800">{{ cart.subtotal() | inr }}</span>
              </div>
              <div class="flex justify-between gap-3 text-ink-500">
                <span>Delivery & taxes</span><span class="text-right text-xs text-ink-400">Calculated at checkout</span>
              </div>
            </div>
            <div class="flex items-center justify-between py-4">
              <span class="font-extrabold text-ink-900">Subtotal</span>
              <span class="font-display text-xl font-extrabold text-ink-900">{{ cart.subtotal() | inr }}</span>
            </div>
            <button
              type="button"
              class="flex min-h-12 w-full items-center justify-between rounded-xl bg-ember-500 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-ember-500/20 transition hover:bg-ember-600"
              (click)="proceed()"
            >
              Proceed to checkout
              <app-icon name="chevron_right" [size]="17" />
            </button>
            <p class="mt-3 text-center text-[11px] leading-5 text-ink-400">Delivery fees and applicable taxes will be shown before payment.</p>
          </aside>
        </div>
      }
    </main>
  `,
})
export class CartComponent {
  constructor(
    public cart: CartService,
    private router: Router
  ) {}

  proceed() {
    this.router.navigate(['/checkout']);
  }
}
