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
      <div class="fixed inset-0 z-[90] animate-fade-in bg-ink-900/50" (click)="cart.closeDrawer()"></div>
      <aside
        class="fixed right-0 top-0 z-[91] flex h-full w-full max-w-md flex-col bg-white shadow-[var(--shadow-pop)]"
      >
        <div class="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <h2 class="font-display text-lg font-bold text-ink-900">Your order</h2>
            @if (cart.restaurantName()) {
              <p class="text-sm text-ink-400">from {{ cart.restaurantName() }}</p>
            }
          </div>
          <button type="button" class="rounded-full p-2 text-ink-500 hover:bg-ink-50" (click)="cart.closeDrawer()">
            <app-icon name="x" [size]="20" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-3">
          @if (cart.isEmpty()) {
            <div class="flex h-full flex-col items-center justify-center gap-3 text-center text-ink-400">
              <app-icon name="cart" [size]="32" />
              <p>Your cart is empty</p>
            </div>
          } @else {
            @for (line of cart.items(); track line.menuItem._id) {
              <div class="flex items-center gap-3 border-b border-ink-100 py-3 last:border-0">
                <img [src]="line.menuItem.image" class="h-14 w-14 rounded-lg object-cover" [alt]="line.menuItem.name" />
                <div class="flex-1">
                  <p class="text-sm font-semibold text-ink-900">{{ line.menuItem.name }}</p>
                  <p class="text-sm text-ink-400">{{ line.menuItem.price | inr }}</p>
                </div>
                <div class="flex items-center gap-2 rounded-lg border border-ink-200 px-1.5 py-1">
                  <button type="button" class="text-ink-500" (click)="cart.setQty(line.menuItem._id, line.qty - 1)">
                    <app-icon name="minus" [size]="13" />
                  </button>
                  <span class="w-3 text-center text-sm font-semibold">{{ line.qty }}</span>
                  <button type="button" class="text-ink-500" (click)="cart.setQty(line.menuItem._id, line.qty + 1)">
                    <app-icon name="plus" [size]="13" />
                  </button>
                </div>
              </div>
            }
          }
        </div>

        @if (!cart.isEmpty()) {
          <div class="border-t border-ink-100 px-5 py-4">
            <div class="mb-3 flex items-center justify-between text-sm text-ink-500">
              <span>Subtotal</span>
              <span class="font-semibold text-ink-900">{{ cart.subtotal() | inr }}</span>
            </div>
            <button
              type="button"
              class="w-full rounded-xl bg-ember-500 py-3 text-sm font-bold text-white hover:bg-ember-600"
              (click)="goToCart()"
            >
              View cart & checkout
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
    private router: Router
  ) {}

  goToCart() {
    this.cart.closeDrawer();
    this.router.navigate(['/cart']);
  }
}
