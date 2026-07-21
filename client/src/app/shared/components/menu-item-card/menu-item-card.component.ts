import { Component, Input } from '@angular/core';
import { MenuItem } from '../../../core/models/menu-item.model';
import { CartService } from '../../../core/services/cart.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ProductModalService } from '../../../core/services/product-modal.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';
import { InrPipe } from '../../pipes/inr.pipe';
import { Tilt3dDirective } from '../../directives/tilt-3d.directive';

@Component({
  selector: 'app-menu-item-card',
  standalone: true,
  imports: [IconComponent, InrPipe, Tilt3dDirective],
  template: `
    <div class="flex gap-3 border-b border-ink-100 py-4 last:border-0">
      <div class="flex-1">
        <div class="flex items-center gap-1.5">
          <span
            class="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border"
            [class]="item.isVeg ? 'border-basil-500' : 'border-ember-600'"
          >
            <span class="h-1.5 w-1.5 rounded-full" [class]="item.isVeg ? 'bg-basil-500' : 'bg-ember-600'"></span>
          </span>
          @if (item.isBestseller) {
            <span class="flex items-center gap-0.5 text-[11px] font-semibold text-gold-600">
              <app-icon name="flame" [size]="11" /> Bestseller
            </span>
          }
        </div>

        <h4 class="mt-1 text-[15px] font-semibold text-ink-900">{{ item.name }}</h4>
        <p class="mt-0.5 text-sm font-medium text-ink-700">{{ item.price | inr }}</p>
        @if (item.description) {
          <p class="mt-1 text-[13px] leading-snug text-ink-400 line-clamp-2">{{ item.description }}</p>
        }
      </div>

      <div class="relative w-32 shrink-0">
        <button
          type="button"
          appTilt3d
          [tiltMax]="8"
          class="block h-28 w-32 overflow-hidden rounded-xl"
          (click)="openFullImage()"
          aria-label="View full-size photo of {{ item.name }}"
        >
          <img [src]="item.image" [alt]="item.name" class="h-full w-full object-cover" loading="lazy" />
        </button>
        <div class="absolute -bottom-3 left-1/2 -translate-x-1/2">
          @if (qty() === 0) {
            <button
              type="button"
              class="rounded-lg border border-ember-500 bg-white px-4 py-1.5 text-sm font-bold text-ember-600 shadow-sm hover:bg-ember-50"
              (click)="onAdd()"
            >
              ADD
            </button>
          } @else {
            <div class="flex items-center gap-3 rounded-lg border border-ember-500 bg-white px-2 py-1.5 shadow-sm">
              <button type="button" class="text-ember-600" (click)="onDecrement()" aria-label="Decrease quantity">
                <app-icon name="minus" [size]="14" />
              </button>
              <span class="w-3 text-center text-sm font-bold text-ember-700">{{ qty() }}</span>
              <button type="button" class="text-ember-600" (click)="onAdd()" aria-label="Increase quantity">
                <app-icon name="plus" [size]="14" />
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class MenuItemCardComponent {
  @Input({ required: true }) item!: MenuItem;
  @Input({ required: true }) restaurantSlug!: string;
  @Input({ required: true }) restaurantName!: string;

  constructor(
    private cart: CartService,
    private confirm: ConfirmService,
    private toast: ToastService,
    private productModal: ProductModalService
  ) {}

  qty(): number {
    return this.cart.qtyOf(this.item._id);
  }

  openFullImage() {
    this.productModal.open({
      item: this.item,
      restaurantSlug: this.restaurantSlug,
      restaurantName: this.restaurantName,
    });
  }

  async onAdd() {
    if (this.cart.wouldConflict(this.restaurantSlug)) {
      const ok = await this.confirm.ask({
        title: 'Start a new cart?',
        message: `Your cart has items from ${this.cart.restaurantName()}. Adding from ${this.restaurantName} will clear it.`,
        confirmLabel: 'Start new cart',
        cancelLabel: 'Keep current cart',
      });
      if (!ok) return;
      this.cart.clear();
    }
    this.cart.add(this.item, this.restaurantSlug, this.restaurantName, 1);
    this.toast.success(`${this.item.name} added`);
  }

  onDecrement() {
    this.cart.setQty(this.item._id, this.qty() - 1);
  }
}
