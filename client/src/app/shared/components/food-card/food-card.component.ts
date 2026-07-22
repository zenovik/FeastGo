import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FoodItem, foodItemToMenuItem } from '../../../core/models/food-item.model';
import { CartService } from '../../../core/services/cart.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { FoodFavoritesService } from '../../../core/services/food-favorites.service';
import { ProductModalService } from '../../../core/services/product-modal.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';
import { InrPipe } from '../../pipes/inr.pipe';

export type FoodCardVariant = 'grid' | 'full' | 'horizontal';

@Component({
  selector: 'app-food-card',
  standalone: true,
  imports: [IconComponent, InrPipe, RouterLink],
  // Angular components default to `display: inline` as custom elements, which
  // breaks sizing whenever this card isn't a direct flex/grid child (e.g. our
  // col-span wrapper divs) — force it to behave like a normal block box.
  styles: [':host { display: block; }'],
  template: `
    @switch (variant) {
      @case ('full') {
        <div
          class="card-surface group flex h-full cursor-pointer flex-col overflow-hidden sm:flex-row"
          (click)="openDetails()"
        >
          <div class="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-ink-100 sm:aspect-auto sm:w-2/5">
            <img
              [src]="item.image"
              [alt]="item.name"
              loading="lazy"
              class="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
            />
            @if (discountPercent() > 0) {
              <div class="absolute left-2 top-2 rounded-full bg-ink-900/80 px-2.5 py-1 text-xs font-bold text-gold-400">
                {{ discountPercent() }}% OFF
              </div>
            }
            @if (item.bestseller) {
              <div class="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-bold text-gold-600">
                <app-icon name="flame" [size]="12" /> Bestseller
              </div>
            }
            @if (!item.isAvailable) {
              <div class="absolute inset-0 flex items-center justify-center bg-ink-900/60">
                <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-800">Sold out</span>
              </div>
            }
          </div>

          <div class="flex flex-1 flex-col justify-center p-4 sm:p-5">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span
                    class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border"
                    [class]="item.veg ? 'border-basil-500' : 'border-ember-600'"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" [class]="item.veg ? 'bg-basil-500' : 'bg-ember-600'"></span>
                  </span>
                  <h3 class="font-display text-lg font-bold leading-snug text-ink-900">{{ item.name }}</h3>
                </div>
                <a
                  [routerLink]="['/restaurants', item.restaurantId]"
                  (click)="$event.stopPropagation()"
                  class="mt-0.5 block truncate text-xs text-ink-400 hover:text-ember-600 hover:underline"
                >
                  From {{ item.restaurantName }}
                </a>
              </div>
              <button
                type="button"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-500 hover:text-ember-600"
                (click)="$event.stopPropagation(); onToggleFavorite($event)"
                aria-label="Toggle favorite"
              >
                <app-icon name="heart" [size]="16" [filled]="isFavorite()" [class.text-ember-600]="isFavorite()" />
              </button>
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-500">
              <span class="flex items-center gap-1 font-semibold text-basil-600">
                <app-icon name="star" [size]="12" /> {{ item.rating }}
                <span class="font-normal text-ink-400">({{ item.reviewCount }})</span>
              </span>
              <span class="flex items-center gap-1">
                <app-icon name="clock" [size]="12" /> {{ item.deliveryTime }} mins
              </span>
              @if (item.calories) {
                <span class="text-ink-400">{{ item.calories }} cal</span>
              }
            </div>

            <div class="mt-3 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="text-lg font-bold text-ink-900">{{ item.price | inr }}</span>
                @if (item.originalPrice > item.price) {
                  <span class="text-xs text-ink-300 line-through">{{ item.originalPrice | inr }}</span>
                }
              </div>

              @if (qty() === 0) {
                <button
                  type="button"
                  [disabled]="!item.isAvailable"
                  class="rounded-lg border border-ember-500 bg-white px-5 py-2 text-sm font-bold text-ember-600 shadow-sm hover:bg-ember-50 disabled:cursor-not-allowed disabled:opacity-50"
                  (click)="$event.stopPropagation(); onAdd()"
                >
                  + Add
                </button>
              } @else {
                <div class="flex items-center gap-3 rounded-lg border border-ember-500 bg-white px-3 py-2 shadow-sm">
                  <button type="button" class="text-ember-600" (click)="$event.stopPropagation(); onDecrement()" aria-label="Decrease quantity">
                    <app-icon name="minus" [size]="14" />
                  </button>
                  <span class="text-sm font-bold text-ember-700">{{ qty() }}</span>
                  <button type="button" class="text-ember-600" (click)="$event.stopPropagation(); onAdd()" aria-label="Increase quantity">
                    <app-icon name="plus" [size]="14" />
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }
      @case ('horizontal') {
        <div
          class="card-surface group flex h-full cursor-pointer items-center gap-3 overflow-hidden p-3"
          (click)="openDetails()"
        >
          <div class="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-100">
            <img
              [src]="item.image"
              [alt]="item.name"
              loading="lazy"
              class="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
            />
            @if (discountPercent() > 0) {
              <div class="absolute left-1 top-1 rounded-full bg-ink-900/80 px-1.5 py-0.5 text-[10px] font-bold text-gold-400">
                {{ discountPercent() }}%
              </div>
            }
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span
                class="flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border"
                [class]="item.veg ? 'border-basil-500' : 'border-ember-600'"
              >
                <span class="h-1.5 w-1.5 rounded-full" [class]="item.veg ? 'bg-basil-500' : 'bg-ember-600'"></span>
              </span>
              <h3 class="truncate text-[15px] font-bold text-ink-900">{{ item.name }}</h3>
            </div>
            <a
              [routerLink]="['/restaurants', item.restaurantId]"
              (click)="$event.stopPropagation()"
              class="mt-0.5 block truncate text-xs text-ink-400 hover:text-ember-600 hover:underline"
            >
              {{ item.restaurantName }}
            </a>
            <div class="mt-1 flex items-center gap-2 text-[11px] text-ink-500">
              <span class="flex items-center gap-1 font-semibold text-basil-600">
                <app-icon name="star" [size]="11" /> {{ item.rating }}
              </span>
              <span class="flex items-center gap-1">
                <app-icon name="clock" [size]="11" /> {{ item.deliveryTime }}m
              </span>
            </div>
            <div class="mt-1 flex items-center gap-2">
              <span class="text-sm font-bold text-ink-900">{{ item.price | inr }}</span>
              @if (item.originalPrice > item.price) {
                <span class="text-[11px] text-ink-300 line-through">{{ item.originalPrice | inr }}</span>
              }
            </div>
          </div>

          <div class="flex shrink-0 flex-col items-end gap-2">
            <button
              type="button"
              class="text-ink-400 hover:text-ember-600"
              (click)="$event.stopPropagation(); onToggleFavorite($event)"
              aria-label="Toggle favorite"
            >
              <app-icon name="heart" [size]="16" [filled]="isFavorite()" [class.text-ember-600]="isFavorite()" />
            </button>
            @if (qty() === 0) {
              <button
                type="button"
                [disabled]="!item.isAvailable"
                class="rounded-lg border border-ember-500 bg-white px-3 py-1.5 text-xs font-bold text-ember-600 shadow-sm hover:bg-ember-50 disabled:cursor-not-allowed disabled:opacity-50"
                (click)="$event.stopPropagation(); onAdd()"
              >
                + Add
              </button>
            } @else {
              <div class="flex items-center gap-2 rounded-lg border border-ember-500 bg-white px-2 py-1 shadow-sm">
                <button type="button" class="text-ember-600" (click)="$event.stopPropagation(); onDecrement()" aria-label="Decrease quantity">
                  <app-icon name="minus" [size]="12" />
                </button>
                <span class="text-xs font-bold text-ember-700">{{ qty() }}</span>
                <button type="button" class="text-ember-600" (click)="$event.stopPropagation(); onAdd()" aria-label="Increase quantity">
                  <app-icon name="plus" [size]="12" />
                </button>
              </div>
            }
          </div>
        </div>
      }
      @default {
        <div class="card-surface group flex h-full cursor-pointer flex-col overflow-hidden" (click)="openDetails()">
          <div class="relative aspect-[4/3] w-full overflow-hidden bg-ink-100">
            <img
              [src]="item.image"
              [alt]="item.name"
              loading="lazy"
              class="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
            />

            @if (discountPercent() > 0) {
              <div class="absolute left-2 top-2 rounded-full bg-ink-900/80 px-2.5 py-1 text-xs font-bold text-gold-400">
                {{ discountPercent() }}% OFF
              </div>
            }

            <button
              type="button"
              class="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink-500 hover:text-ember-600"
              (click)="$event.stopPropagation(); onToggleFavorite($event)"
              aria-label="Toggle favorite"
            >
              <app-icon name="heart" [size]="16" [filled]="isFavorite()" [class.text-ember-600]="isFavorite()" />
            </button>

            @if (item.bestseller) {
              <div class="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-bold text-gold-600">
                <app-icon name="flame" [size]="12" /> Bestseller
              </div>
            }

            @if (!item.isAvailable) {
              <div class="absolute inset-0 flex items-center justify-center bg-ink-900/60">
                <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-800">Sold out</span>
              </div>
            }
          </div>

          <div class="flex flex-1 flex-col p-3.5">
            <div class="flex items-start gap-1.5">
              <span
                class="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border"
                [class]="item.veg ? 'border-basil-500' : 'border-ember-600'"
              >
                <span class="h-1.5 w-1.5 rounded-full" [class]="item.veg ? 'bg-basil-500' : 'bg-ember-600'"></span>
              </span>
              <h3 class="font-display text-[15px] font-bold leading-snug text-ink-900 line-clamp-1">{{ item.name }}</h3>
            </div>

            <a
              [routerLink]="['/restaurants', item.restaurantId]"
              (click)="$event.stopPropagation()"
              class="mt-0.5 block truncate text-xs text-ink-400 hover:text-ember-600 hover:underline"
            >
              From {{ item.restaurantName }}
            </a>

            <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-500">
              <span class="flex items-center gap-1 font-semibold text-basil-600">
                <app-icon name="star" [size]="12" /> {{ item.rating }}
              </span>
              <span class="flex items-center gap-1">
                <app-icon name="clock" [size]="12" /> {{ item.deliveryTime }} mins
              </span>
              @if (item.calories) {
                <span class="text-ink-400">{{ item.calories }} cal</span>
              }
            </div>

            <div class="mt-2 flex items-center gap-2">
              <span class="text-base font-bold text-ink-900">{{ item.price | inr }}</span>
              @if (item.originalPrice > item.price) {
                <span class="text-xs text-ink-300 line-through">{{ item.originalPrice | inr }}</span>
              }
            </div>

            <div class="mt-auto pt-3">
              @if (qty() === 0) {
                <button
                  type="button"
                  [disabled]="!item.isAvailable"
                  class="w-full rounded-lg border border-ember-500 bg-white py-2 text-sm font-bold text-ember-600 shadow-sm hover:bg-ember-50 disabled:cursor-not-allowed disabled:opacity-50"
                  (click)="$event.stopPropagation(); onAdd()"
                >
                  + Add
                </button>
              } @else {
                <div class="flex items-center justify-between rounded-lg border border-ember-500 bg-white px-3 py-2 shadow-sm">
                  <button type="button" class="text-ember-600" (click)="$event.stopPropagation(); onDecrement()" aria-label="Decrease quantity">
                    <app-icon name="minus" [size]="14" />
                  </button>
                  <span class="text-sm font-bold text-ember-700">{{ qty() }}</span>
                  <button type="button" class="text-ember-600" (click)="$event.stopPropagation(); onAdd()" aria-label="Increase quantity">
                    <app-icon name="plus" [size]="14" />
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class FoodCardComponent {
  @Input({ required: true }) item!: FoodItem;
  @Input() variant: FoodCardVariant = 'grid';

  constructor(
    private cart: CartService,
    private confirm: ConfirmService,
    private toast: ToastService,
    private favorites: FoodFavoritesService,
    private productModal: ProductModalService
  ) {}

  discountPercent(): number {
    if (!this.item.originalPrice || this.item.originalPrice <= this.item.price) return 0;
    return Math.round((1 - this.item.price / this.item.originalPrice) * 100);
  }

  qty(): number {
    return this.cart.qtyOf(this.item.id);
  }

  isFavorite(): boolean {
    return this.favorites.isFavorite(this.item.id);
  }

  onToggleFavorite(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.favorites.toggle(this.item.id);
  }

  openDetails() {
    if (!this.item.isAvailable) return;
    this.productModal.open({
      item: foodItemToMenuItem(this.item),
      restaurantSlug: this.item.restaurantId,
      restaurantName: this.item.restaurantName,
    });
  }

  async onAdd() {
    if (!this.item.isAvailable) return;

    if (this.cart.wouldConflict(this.item.restaurantId)) {
      const ok = await this.confirm.ask({
        title: 'Start a new cart?',
        message: `Your cart has items from ${this.cart.restaurantName()}. Adding from ${this.item.restaurantName} will clear it.`,
        confirmLabel: 'Start new cart',
        cancelLabel: 'Keep current cart',
      });
      if (!ok) return;
      this.cart.clear();
    }

    this.cart.add(foodItemToMenuItem(this.item), this.item.restaurantId, this.item.restaurantName, 1);
    this.toast.success(`${this.item.name} added`);
  }

  onDecrement() {
    this.cart.setQty(this.item.id, this.qty() - 1);
  }
}
