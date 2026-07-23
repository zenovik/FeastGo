import { Location } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuCategory } from '../../core/models/menu-item.model';
import { Restaurant } from '../../core/models/restaurant.model';
import { AuthService } from '../../core/services/auth.service';
import { RestaurantService, Review } from '../../core/services/restaurant.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { MenuItemCardComponent } from '../../shared/components/menu-item-card/menu-item-card.component';
import { RatingBadgeComponent } from '../../shared/components/rating-stars/rating-stars.component';
import { InrPipe } from '../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [FormsModule, IconComponent, MenuItemCardComponent, RatingBadgeComponent, InrPipe],
  template: `
    @if (loading()) {
      <div class="h-64 animate-pulse bg-ink-100"></div>
    } @else if (restaurant(); as r) {
      <div class="relative h-56 w-full overflow-hidden bg-ink-800 sm:h-72">
        <img [src]="r.coverImage" [alt]="r.name" class="h-full w-full object-cover opacity-80" />
        <div class="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/20 to-transparent"></div>
        <button
          type="button"
          class="absolute left-4 top-4 rounded-full bg-white/90 p-2 text-ink-800 hover:bg-white"
          (click)="goBack()"
          aria-label="Back"
        >
          <app-icon name="arrow-left" [size]="18" />
        </button>
        <button
          type="button"
          class="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-ink-800 hover:bg-white"
          (click)="onToggleFavorite(r)"
        >
          <app-icon name="heart" [size]="18" [filled]="isFavorite(r)" [class.text-ember-600]="isFavorite(r)" />
        </button>
        <div class="container-shell absolute bottom-4 left-0 right-0">
          <h1 class="font-display text-2xl font-extrabold text-white sm:text-3xl">{{ r.name }}</h1>
          <p class="mt-1 text-sm text-ink-200">{{ r.cuisines.join(', ') }}</p>
        </div>
      </div>

      <div class="container-shell -mt-6 relative z-10">
        <div class="card-surface flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
          <app-rating-badge [rating]="r.rating" />
          <span class="text-sm text-ink-500">{{ r.ratingCount }} ratings</span>
          <span class="flex items-center gap-1 text-sm text-ink-600">
            <app-icon name="clock" [size]="15" /> {{ r.deliveryTimeMin }}–{{ r.deliveryTimeMax }} min
          </span>
          <span class="text-sm text-ink-600">{{ '₹'.repeat(r.priceRange) }} · Min {{ r.minOrder | inr }}</span>
          <span class="flex items-center gap-1 text-sm text-ink-600">
            <app-icon name="map-pin" [size]="15" /> {{ r.address.area }}, {{ r.address.city }}
          </span>
          @if (r.offer) {
            <span class="flex items-center gap-1 rounded-lg bg-gold-400/15 px-2.5 py-1 text-sm font-semibold text-gold-600">
              <app-icon name="percent" [size]="14" /> {{ r.offer }}
            </span>
          }
        </div>
      </div>

      <div class="container-shell mt-6 grid grid-cols-1 gap-8 pb-16 lg:grid-cols-[220px_1fr]">
        <nav class="hidden self-start lg:sticky lg:top-20 lg:block">
          <p class="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Menu</p>
          <ul class="space-y-1">
            @for (cat of menu(); track cat.category) {
              <li>
                <a
                  [href]="'#cat-' + slugify(cat.category)"
                  class="block rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50"
                >
                  {{ cat.category }} <span class="text-ink-300">({{ cat.items.length }})</span>
                </a>
              </li>
            }
          </ul>
        </nav>

        <div>
          @if (r.description) {
            <p class="mb-6 text-sm leading-relaxed text-ink-500">{{ r.description }}</p>
          }

          @for (cat of menu(); track cat.category) {
            <section [id]="'cat-' + slugify(cat.category)" class="mb-6 scroll-mt-24">
              <h2 class="font-display text-lg font-bold text-ink-900">
                {{ cat.category }} <span class="text-sm font-medium text-ink-400">({{ cat.items.length }})</span>
              </h2>
              <div>
                @for (item of cat.items; track item._id) {
                  <app-menu-item-card [item]="item" [restaurantSlug]="r.slug" [restaurantName]="r.name" />
                }
              </div>
            </section>
          }

          <section class="mt-10 border-t border-ink-100 pt-8">
            <div class="flex items-center justify-between">
              <h2 class="font-display text-lg font-bold text-ink-900">Ratings & reviews</h2>
              <app-rating-badge [rating]="r.rating" />
            </div>

            @if (auth.isAuthenticated()) {
              <form class="card-surface mt-4 p-4" (submit)="submitReview($event)">
                <p class="text-sm font-semibold text-ink-700">Leave a review</p>
                <div class="mt-2 flex gap-1">
                  @for (n of [1, 2, 3, 4, 5]; track n) {
                    <button type="button" (click)="reviewRating.set(n)" class="text-gold-500">
                      <app-icon [name]="n <= reviewRating() ? 'star' : 'star-outline'" [size]="22" />
                    </button>
                  }
                </div>
                <textarea
                  [(ngModel)]="reviewComment"
                  name="comment"
                  rows="2"
                  placeholder="How was the food and delivery?"
                  class="mt-3 w-full rounded-lg border border-ink-200 p-2.5 text-sm outline-none focus:border-ember-400"
                ></textarea>
                <button
                  type="submit"
                  [disabled]="reviewRating() === 0 || submittingReview()"
                  class="mt-3 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Submit review
                </button>
              </form>
            }

            <div class="mt-4 space-y-4">
              @for (rev of reviews(); track rev._id) {
                <div class="border-b border-ink-100 pb-4">
                  <div class="flex items-center gap-2">
                    <app-rating-badge [rating]="rev.rating" />
                    <span class="text-sm font-semibold text-ink-800">{{ rev.userName }}</span>
                  </div>
                  @if (rev.comment) {
                    <p class="mt-1.5 text-sm text-ink-500">{{ rev.comment }}</p>
                  }
                </div>
              } @empty {
                <p class="text-sm text-ink-400">No reviews yet — be the first to share your experience.</p>
              }
            </div>
          </section>
        </div>
      </div>
    }
  `,
})
export class RestaurantDetailComponent implements OnInit {
  loading = signal(true);
  restaurant = signal<Restaurant | null>(null);
  menu = signal<MenuCategory[]>([]);
  reviews = signal<Review[]>([]);

  reviewRating = signal(0);
  reviewComment = '';
  submittingReview = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private restaurantService: RestaurantService,
    public auth: AuthService,
    private toast: ToastService
  ) {}

  goBack() {
    // history.state.navigationId is 1 only on the very first navigation of this
    // app session (e.g. a direct link) — nothing in-app to go back to then.
    const navigationId = (window.history.state as { navigationId?: number } | null)?.navigationId;
    if (navigationId && navigationId > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/restaurants');
    }
  }

  isFavorite(r: Restaurant): boolean {
    return this.auth.isFavorite(r._id);
  }

  async onToggleFavorite(r: Restaurant) {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
      return;
    }

    const wasFavorite = this.isFavorite(r);
    try {
      await this.auth.toggleFavorite(r._id);
      this.toast.success(wasFavorite ? 'Removed from bookmarks' : 'Added to bookmarks');
    } catch {
      this.toast.error('Could not update bookmark');
    }
  }

  async ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.loading.set(true);
    try {
      const [{ restaurant }, { categories }, { reviews }] = await Promise.all([
        this.restaurantService.getBySlug(slug),
        this.restaurantService.getMenu(slug),
        this.restaurantService.getReviews(slug),
      ]);
      this.restaurant.set(restaurant);
      this.menu.set(categories);
      this.reviews.set(reviews);
    } catch {
      this.restaurant.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  async submitReview(e: Event) {
    e.preventDefault();
    const slug = this.restaurant()?.slug;
    if (!slug || this.reviewRating() === 0) return;
    this.submittingReview.set(true);
    try {
      const { review } = await this.restaurantService.addReview(slug, this.reviewRating(), this.reviewComment.trim());
      this.reviews.update((list) => [review, ...list]);
      this.reviewRating.set(0);
      this.reviewComment = '';
      this.toast.success('Thanks for your review!');
    } catch {
      this.toast.error('Could not submit your review');
    } finally {
      this.submittingReview.set(false);
    }
  }
}
