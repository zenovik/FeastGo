import { Component } from '@angular/core';
import { CartService } from '../../../core/services/cart.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ProductModalContext, ProductModalService } from '../../../core/services/product-modal.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';
import { InrPipe } from '../../pipes/inr.pipe';
import { Tilt3dDirective } from '../../directives/tilt-3d.directive';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [IconComponent, InrPipe, Tilt3dDirective],
  template: `
    @if (modal.context(); as ctx) {
      <div class="fixed inset-0 z-[95] flex items-center justify-center bg-ink-900/60 p-4 animate-fade-in" (click)="modal.close()">
        <div
          class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-pop)]"
          (click)="$event.stopPropagation()"
        >
          <div appTilt3d [tiltMax]="6" [tiltScale]="1.02" class="relative aspect-square w-full bg-ink-100">
            <img [src]="ctx.item.image" [alt]="ctx.item.name" class="h-full w-full object-cover" />
            <button
              type="button"
              class="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-700 hover:bg-white"
              (click)="modal.close()"
              aria-label="Close"
            >
              <app-icon name="x" [size]="18" />
            </button>
            @if (ctx.item.isBestseller) {
              <span class="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gold-500 px-2.5 py-1 text-xs font-bold text-white">
                <app-icon name="flame" [size]="12" /> Bestseller
              </span>
            }
          </div>

          <div class="p-5">
            <div class="flex items-center gap-1.5">
              <span
                class="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border"
                [class]="ctx.item.isVeg ? 'border-basil-500' : 'border-ember-600'"
              >
                <span class="h-1.5 w-1.5 rounded-full" [class]="ctx.item.isVeg ? 'bg-basil-500' : 'bg-ember-600'"></span>
              </span>
              <span class="text-xs font-medium text-ink-400">{{ ctx.item.isVeg ? 'Veg' : 'Non-veg' }}</span>
            </div>

            <h2 class="mt-1.5 font-display text-xl font-bold text-ink-900">{{ ctx.item.name }}</h2>
            <p class="mt-1 text-base font-semibold text-ink-700">{{ ctx.item.price | inr }}</p>
            @if (ctx.item.description) {
              <p class="mt-2 text-sm leading-relaxed text-ink-500">{{ ctx.item.description }}</p>
            }

            <div class="mt-5">
              @if (qty() === 0) {
                <button
                  type="button"
                  class="w-full rounded-xl bg-ember-500 py-3 text-sm font-bold text-white hover:bg-ember-600"
                  (click)="onAdd(ctx)"
                >
                  Add to cart
                </button>
              } @else {
                <div class="flex items-center justify-between rounded-xl border border-ember-500 px-4 py-2.5">
                  <button type="button" class="text-ember-600" (click)="onDecrement(ctx)" aria-label="Decrease quantity">
                    <app-icon name="minus" [size]="16" />
                  </button>
                  <span class="text-base font-bold text-ember-700">{{ qty() }} in cart</span>
                  <button type="button" class="text-ember-600" (click)="onAdd(ctx)" aria-label="Increase quantity">
                    <app-icon name="plus" [size]="16" />
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProductModalComponent {
  constructor(
    public modal: ProductModalService,
    private cart: CartService,
    private confirm: ConfirmService,
    private toast: ToastService
  ) {}

  qty(): number {
    const ctx = this.modal.context();
    return ctx ? this.cart.qtyOf(ctx.item._id) : 0;
  }

  async onAdd(ctx: ProductModalContext) {
    if (this.cart.wouldConflict(ctx.restaurantSlug)) {
      const ok = await this.confirm.ask({
        title: 'Start a new cart?',
        message: `Your cart has items from ${this.cart.restaurantName()}. Adding from ${ctx.restaurantName} will clear it.`,
        confirmLabel: 'Start new cart',
        cancelLabel: 'Keep current cart',
      });
      if (!ok) return;
      this.cart.clear();
    }
    this.cart.add(ctx.item, ctx.restaurantSlug, ctx.restaurantName, 1);
    this.toast.success(`${ctx.item.name} added`);
  }

  onDecrement(ctx: ProductModalContext) {
    this.cart.setQty(ctx.item._id, this.qty() - 1);
  }
}
