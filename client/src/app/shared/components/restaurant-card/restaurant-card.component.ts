import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Restaurant } from '../../../core/models/restaurant.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';
import { RatingBadgeComponent } from '../rating-stars/rating-stars.component';
import { InrPipe } from '../../pipes/inr.pipe';
import { Tilt3dDirective } from '../../directives/tilt-3d.directive';

type CardLayout = 'full' | 'side' | 'grid';

const IMG_CLASSES = 'h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105';

@Component({
  selector: 'app-restaurant-card',
  standalone: true,
  imports: [RouterLink, IconComponent, RatingBadgeComponent, InrPipe, Tilt3dDirective],
  template: `
    <a
      [routerLink]="['/restaurants', restaurant.slug]"
      class="group block overflow-hidden rounded-[20px] bg-white shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]"
    >
      <div class="relative aspect-[5/3] w-full bg-ink-100">
        @switch (layout) {
          @case ('full') {
            <div appTilt3d class="relative h-full w-full overflow-hidden">
              @if (!isSlotLoaded(0)) {
                <div class="absolute inset-0 animate-pulse bg-ink-100"></div>
              }
              <img
                [src]="slotImage(0)"
                [alt]="restaurant.name"
                loading="lazy"
                (load)="onSlotLoad(0)"
                [class]="imgClasses"
                [class.opacity-0]="!isSlotLoaded(0) || transitioning()"
                [class.blur-sm]="!isSlotLoaded(0)"
                [class.scale-110]="!isSlotLoaded(0)"
              />
              @if (images.length > 1) {
                <div class="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                  @for (img of images; track $index) {
                    <span
                      class="h-1.5 w-1.5 rounded-full bg-white transition-opacity"
                      [class.opacity-100]="$index === slotRealIndex(0)"
                      [class.opacity-40]="$index !== slotRealIndex(0)"
                    ></span>
                  }
                </div>
              }
            </div>
          }
          @case ('side') {
            <div class="flex h-full w-full gap-1">
              <button
                type="button"
                class="relative h-full w-[70%] overflow-hidden rounded-lg"
                (click)="openLightbox($event, slotRealIndex(0))"
              >
                @if (!isSlotLoaded(0)) {
                  <div class="absolute inset-0 animate-pulse bg-ink-100"></div>
                }
                <img
                  [src]="slotImage(0)"
                  [alt]="restaurant.name"
                  loading="lazy"
                  (load)="onSlotLoad(0)"
                  [class]="imgClasses"
                  [class.opacity-0]="!isSlotLoaded(0) || transitioning()"
                  [class.blur-sm]="!isSlotLoaded(0)"
                  [class.scale-110]="!isSlotLoaded(0)"
                />
              </button>
              <div class="flex h-full w-[30%] flex-col gap-1">
                @for (slot of [1, 2]; track slot) {
                  <button
                    type="button"
                    class="relative h-1/2 w-full overflow-hidden rounded-lg"
                    (click)="openLightbox($event, slotRealIndex(slot))"
                  >
                    @if (!isSlotLoaded(slot)) {
                      <div class="absolute inset-0 animate-pulse bg-ink-100"></div>
                    }
                    <img
                      [src]="slotImage(slot)"
                      [alt]="restaurant.name"
                      loading="lazy"
                      (load)="onSlotLoad(slot)"
                      [class]="imgClasses"
                      [class.opacity-0]="!isSlotLoaded(slot) || transitioning()"
                      [class.blur-sm]="!isSlotLoaded(slot)"
                      [class.scale-110]="!isSlotLoaded(slot)"
                    />
                  </button>
                }
              </div>
            </div>
          }
          @case ('grid') {
            <div class="grid h-full w-full grid-cols-2 grid-rows-2 gap-1">
              @for (slot of [0, 1, 2, 3]; track slot) {
                <button
                  type="button"
                  class="relative h-full w-full overflow-hidden rounded-lg"
                  (click)="openLightbox($event, slotRealIndex(slot))"
                >
                  @if (!isSlotLoaded(slot)) {
                    <div class="absolute inset-0 animate-pulse bg-ink-100"></div>
                  }
                  <img
                    [src]="slotImage(slot)"
                    [alt]="restaurant.name"
                    loading="lazy"
                    (load)="onSlotLoad(slot)"
                    [class]="imgClasses"
                    [class.opacity-0]="!isSlotLoaded(slot) || transitioning()"
                    [class.blur-sm]="!isSlotLoaded(slot)"
                    [class.scale-110]="!isSlotLoaded(slot)"
                  />
                </button>
              }
            </div>
          }
        }

        <button
          type="button"
          class="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink-500 hover:text-ember-600"
          (click)="onToggleFavorite($event)"
        >
          <app-icon name="heart" [size]="16" [filled]="isFavorite()" [class.text-ember-600]="isFavorite()" />
        </button>
        @if (restaurant.offer) {
          <div class="absolute left-2 top-2 z-20 flex items-center gap-1 rounded-full bg-ink-900/80 px-2.5 py-1 text-xs font-semibold text-gold-400">
            <app-icon name="percent" [size]="12" />
            {{ restaurant.offer }}
          </div>
        }
        @if (!restaurant.isOpen) {
          <div class="absolute inset-0 z-20 flex items-center justify-center bg-ink-900/60">
            <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-800">Closed now</span>
          </div>
        }
      </div>

      <div class="p-3.5">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-display text-[15px] font-bold leading-snug text-ink-900 line-clamp-1">
            {{ restaurant.name }}
          </h3>
          <app-rating-badge [rating]="restaurant.rating" />
        </div>

        <p class="mt-1 truncate text-[13px] text-ink-400">
          {{ restaurant.cuisines.join(', ') }}
        </p>

        <div class="mt-2 flex items-center gap-3 text-[13px] text-ink-500">
          <span class="flex items-center gap-1">
            <app-icon name="clock" [size]="14" />
            {{ restaurant.deliveryTimeMin }}–{{ restaurant.deliveryTimeMax }} min
          </span>
          <span>{{ restaurant.minOrder | inr }} for two</span>
        </div>

        @if (restaurant.tags.length) {
          <div class="mt-2 flex flex-wrap gap-1">
            @for (tag of restaurant.tags.slice(0, 2); track tag) {
              <span class="rounded-md bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-500">{{ tag }}</span>
            }
          </div>
        }
      </div>
    </a>

    @if (lightboxOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/90 p-4"
        (click)="closeLightbox($event)"
      >
        <button
          type="button"
          class="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          (click)="closeLightbox($event)"
        >
          <app-icon name="x" [size]="20" />
        </button>
        @if (images.length > 1) {
          <button
            type="button"
            class="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            (click)="prevImage($event)"
          >
            <app-icon name="chevron_left" [size]="22" />
          </button>
        }
        <img
          [src]="images[lightboxIndex()]"
          [alt]="restaurant.name"
          class="max-h-[85vh] max-w-full rounded-xl object-contain"
          (click)="$event.stopPropagation()"
        />
        @if (images.length > 1) {
          <button
            type="button"
            class="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            (click)="nextImage($event)"
          >
            <app-icon name="chevron_right" [size]="22" />
          </button>
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
            {{ lightboxIndex() + 1 }} / {{ images.length }}
          </div>
        }
      </div>
    }
  `,
})
export class RestaurantCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) restaurant!: Restaurant;

  readonly imgClasses = IMG_CLASSES;

  lightboxOpen = signal(false);
  lightboxIndex = signal(0);

  slideIndex = signal(0);
  transitioning = signal(false);

  private loadedSlots = new Set<number>();
  private slideTimer?: ReturnType<typeof setInterval>;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit() {
    if (this.images.length > 1) {
      this.slideTimer = setInterval(() => this.advanceSlide(), 2200);
    }
  }

  ngOnDestroy() {
    if (this.slideTimer) clearInterval(this.slideTimer);
  }

  get images(): string[] {
    return this.restaurant.images?.length ? this.restaurant.images : [this.restaurant.coverImage];
  }

  get layout(): CardLayout {
    const count = this.images.length;
    if (count < 3) return 'full';

    const bucket = hashString(this.restaurant._id) % 100;
    if (bucket < 50) return 'full';
    if (bucket < 80 || count < 4) return 'side';
    return 'grid';
  }

  // Every slot cycles through the full image set, offset by its own position,
  // so the whole card keeps rotating instead of only the "extra photos" cell.
  slotRealIndex(offset: number): number {
    return (offset + this.slideIndex()) % this.images.length;
  }

  slotImage(offset: number): string {
    return this.images[this.slotRealIndex(offset)];
  }

  isSlotLoaded(slot: number): boolean {
    return this.loadedSlots.has(slot);
  }

  onSlotLoad(slot: number) {
    this.loadedSlots.add(slot);
  }

  private advanceSlide() {
    this.transitioning.set(true);
    setTimeout(() => {
      this.slideIndex.update((i) => (i + 1) % this.images.length);
      this.transitioning.set(false);
    }, 250);
  }

  openLightbox(e: Event, index: number) {
    e.preventDefault();
    e.stopPropagation();
    this.lightboxIndex.set(index);
    this.lightboxOpen.set(true);
  }

  closeLightbox(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.lightboxOpen.set(false);
  }

  nextImage(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.lightboxIndex.update((i) => (i + 1) % this.images.length);
  }

  prevImage(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.lightboxIndex.update((i) => (i - 1 + this.images.length) % this.images.length);
  }

  isFavorite(): boolean {
    return this.auth.isFavorite(this.restaurant._id);
  }

  async onToggleFavorite(e: Event) {
    e.preventDefault();
    e.stopPropagation();

    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
      return;
    }

    const wasFavorite = this.isFavorite();
    try {
      await this.auth.toggleFavorite(this.restaurant._id);
      this.toast.success(wasFavorite ? 'Removed from bookmarks' : 'Added to bookmarks');
    } catch {
      this.toast.error('Could not update bookmark');
    }
  }
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
