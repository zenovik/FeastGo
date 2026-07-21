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
    <div class="container-shell max-w-2xl py-10">
      <h1 class="font-display text-2xl font-bold text-ink-900">Your cart</h1>

      @if (cart.isEmpty()) {
        <div class="mt-16 flex flex-col items-center gap-3 text-center text-ink-400">
          <app-icon name="cart" [size]="44" />
          <p class="text-lg font-semibold text-ink-600">Your cart is empty</p>
          <a routerLink="/restaurants" class="mt-2 rounded-xl bg-ember-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-ember-600">
            Browse restaurants
          </a>
        </div>
      } @else {
        <p class="mt-1 text-sm text-ink-400">from {{ cart.restaurantName() }}</p>

        <div class="card-surface mt-5 divide-y divide-ink-100 p-2">
          @for (line of cart.items(); track line.menuItem._id) {
            <div class="flex items-center gap-3 p-3">
              <img [src]="line.menuItem.image" class="h-16 w-16 rounded-xl object-cover" [alt]="line.menuItem.name" />
              <div class="flex-1">
                <p class="text-sm font-semibold text-ink-900">{{ line.menuItem.name }}</p>
                <p class="text-sm text-ink-400">{{ line.menuItem.price | inr }}</p>
              </div>
              <div class="flex items-center gap-3 rounded-lg border border-ink-200 px-2 py-1.5">
                <button type="button" class="text-ink-500" (click)="cart.setQty(line.menuItem._id, line.qty - 1)">
                  <app-icon name="minus" [size]="14" />
                </button>
                <span class="w-4 text-center text-sm font-semibold">{{ line.qty }}</span>
                <button type="button" class="text-ink-500" (click)="cart.setQty(line.menuItem._id, line.qty + 1)">
                  <app-icon name="plus" [size]="14" />
                </button>
              </div>
              <p class="w-16 text-right text-sm font-semibold text-ink-800">
                {{ line.menuItem.price * line.qty | inr }}
              </p>
              <button type="button" class="text-ink-300 hover:text-ember-600" (click)="cart.remove(line.menuItem._id)">
                <app-icon name="trash" [size]="16" />
              </button>
            </div>
          }
        </div>

        <div class="card-surface mt-5 p-4">
          <div class="flex justify-between py-1 text-sm text-ink-500">
            <span>Subtotal</span><span>{{ cart.subtotal() | inr }}</span>
          </div>
          <div class="flex justify-between py-1 text-sm text-ink-500">
            <span>Delivery & taxes</span><span>calculated at checkout</span>
          </div>
          <div class="mt-2 flex justify-between border-t border-ink-100 pt-3 text-base font-bold text-ink-900">
            <span>Subtotal</span><span>{{ cart.subtotal() | inr }}</span>
          </div>
        </div>

        <button
          type="button"
          class="mt-5 w-full rounded-xl bg-ember-500 py-3.5 text-sm font-bold text-white hover:bg-ember-600"
          (click)="proceed()"
        >
          Proceed to checkout
        </button>
      }
    </div>
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
