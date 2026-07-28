import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FoodItem, foodItemToMenuItem } from '../../core/models/food-item.model';
import { ExploreCard } from '../../core/models/explore-card.model';
import { ExploreCardService } from '../../core/services/explore-card.service';
import { FoodQuery, FoodService, FoodSort } from '../../core/services/food.service';
import { ProductModalService } from '../../core/services/product-modal.service';
import { ScrollRestorationService } from '../../core/services/scroll-restoration.service';
import { foodCollageBackground } from '../../core/utils/food-image.util';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { FoodCardComponent } from '../../shared/components/food-card/food-card.component';
import { InrPipe } from '../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, IconComponent, FoodCardComponent, InrPipe],
  template: `
    <section class="relative bg-ink-900">
      <div class="pointer-events-none absolute inset-0 overflow-hidden">
        <div class="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-ember-500/30 blur-3xl sm:-right-24 sm:-top-24 sm:h-[28rem] sm:w-[28rem]"></div>
        <div class="absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-[#3B5BDB]/25 blur-3xl sm:-bottom-40 sm:-left-20 sm:h-96 sm:w-96"></div>
      </div>

      <div class="container-shell relative py-16 sm:py-24 lg:py-36">
        <p class="font-display text-xs font-bold uppercase tracking-[0.15em] text-ember-400 sm:text-sm sm:tracking-[0.2em]">
          Delivering happiness, one order at a time
        </p>
        <h1 class="mt-3 max-w-2xl font-display text-3xl font-extrabold leading-[1.15] text-white sm:mt-4 sm:text-5xl lg:text-7xl">
          Great food,<br />
          delivered <span class="text-ember-400">fast</span> & fresh.
        </h1>
        <p class="mt-4 max-w-lg text-sm text-ink-300 sm:mt-5 sm:text-lg">
          Order from FeastGo's curated local restaurants — real menus, real ratings, real-time tracking.
        </p>
      </div>
    </section>

    <section class="container-shell py-8">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-xl font-bold text-ink-900">Explore More</h2>
        @if (!exploreLoading() && !exploreError()) {
          <p class="text-sm text-ink-400">{{ exploreCards().length }} ways to discover</p>
        }
      </div>

      @if (exploreLoading()) {
        <div class="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <div class="h-44 w-60 shrink-0 animate-pulse rounded-2xl bg-ink-100 sm:w-64"></div>
          }
        </div>
      } @else if (exploreError()) {
        <div class="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 py-10 text-center text-ink-400">
          <app-icon name="alert-triangle" [size]="28" />
          <p class="text-sm font-semibold text-ink-600">Couldn't load Explore More right now</p>
          <button type="button" class="text-sm font-bold text-ember-600" (click)="loadExploreCards()">Try again</button>
        </div>
      } @else if (exploreCards().length === 0) {
        <p class="mt-4 text-sm text-ink-400">Nothing to explore yet — check back soon.</p>
      } @else {
        <div class="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 scrollbar-none">
          @for (card of exploreCards(); track card._id) {
            <button
              type="button"
              class="group relative h-44 w-60 shrink-0 snap-start overflow-hidden rounded-2xl text-left text-white shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-card-hover)] sm:w-64"
              (click)="openExplore(card)"
            >
              <span
                class="absolute inset-0"
                [style.background]="'linear-gradient(135deg,' + card.gradientFrom + ',' + card.gradientTo + ')'"
              ></span>
              @if (card.image) {
                <img [src]="card.image" [alt]="card.title" loading="lazy" class="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <span class="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/25 to-transparent"></span>
              }

              @if (card.badge) {
                <span class="absolute right-3 top-3 rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-md ring-1 ring-white/40">
                  {{ card.badge }}
                </span>
              }

              <span class="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md ring-1 ring-white/30">
                <app-icon [name]="card.icon" [size]="20" />
              </span>

              <span class="absolute inset-x-0 bottom-0 p-4">
                <span class="block text-base font-bold leading-tight">{{ card.title }}</span>
                @if (card.subtitle) {
                  <span class="mt-0.5 block truncate text-xs text-white/80">{{ card.subtitle }}</span>
                }
              </span>
            </button>
          }
        </div>
      }
    </section>

    <section id="food-grid" class="container-shell py-8">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-xl font-bold text-ink-900">Made for you</h2>
        <p class="text-sm text-ink-400">{{ total() }} dishes</p>
      </div>

      @if (loading()) {
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
            <div class="card-surface h-72 animate-pulse bg-ink-100"></div>
          }
        </div>
      } @else if (feedItems().length === 0) {
        <div class="mt-16 flex flex-col items-center gap-3 text-center text-ink-400">
          <app-icon name="search" [size]="40" />
          <p class="text-lg font-semibold text-ink-600">No dishes match your filters</p>
        </div>
      } @else {
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (item of visibleFeedItems(); track item.id) {
            <app-food-card [item]="item" />
          }
        </div>

        @if (visibleCount() < feedItems().length || feedItems().length < total()) {
          <div #scrollSentinel class="mt-6 flex justify-center py-4">
            <div class="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-[#3B5BDB]"></div>
          </div>
        }
      }
    </section>

    <section class="relative overflow-hidden py-16 sm:py-20">
      <img [src]="specialsBackground" alt="" class="absolute inset-0 h-full w-full object-cover" />
      <div class="container-shell relative">
        <h2 class="font-display text-2xl font-bold text-white">Today's Specials</h2>
        <p class="mt-1 text-sm text-white/60">Hand-picked dishes, fresh off the grill.</p>
        <div class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          @for (item of todaysSpecials(); track item.id) {
            <div
              class="cursor-pointer overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-lg transition hover:-translate-y-1"
              (click)="openFoodDetails(item)"
            >
              <div class="relative aspect-square w-full overflow-hidden">
                <img [src]="item.image" [alt]="item.name" class="h-full w-full object-cover" loading="lazy" />
                @if (item.offer) {
                  <div class="absolute left-2 top-2 rounded-full bg-ember-500 px-2.5 py-1 text-xs font-bold text-white">
                    {{ item.offer }}
                  </div>
                }
              </div>
              <div class="p-4">
                <h3 class="truncate text-base font-bold text-white">{{ item.name }}</h3>
                <p class="mt-0.5 truncate text-xs text-white/60">{{ item.restaurantName }}</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-base font-bold text-white">{{ item.price | inr }}</span>
                  <span class="flex items-center gap-1 text-xs font-semibold text-gold-400">
                    <app-icon name="star" [size]="12" /> {{ item.rating }}
                  </span>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="container-shell py-8">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-xl font-bold text-ink-900">Popular Near You</h2>
        <a routerLink="/restaurants" class="text-sm font-semibold text-ember-600 hover:text-ember-700">See all →</a>
      </div>
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (item of popularNearYou(); track item.id) {
          <app-food-card [item]="item" />
        }
      </div>
    </section>

    @if (recentlyOrdered().length) {
      <section class="container-shell py-8">
        <h2 class="font-display text-xl font-bold text-ink-900">Recently Ordered</h2>
        <div class="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          @for (item of recentlyOrdered(); track item.id) {
            <div class="w-72 shrink-0">
              <app-food-card [item]="item" variant="horizontal" />
            </div>
          }
        </div>
      </section>
    }

    <section class="container-shell py-8 pb-16">
      <h2 class="font-display text-xl font-bold text-ink-900">Recommended For You</h2>
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (item of recommended(); track item.id) {
          <app-food-card [item]="item" />
        }
      </div>
    </section>
  `,
})
export class HomeComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLDivElement>;

  specialsBackground = foodCollageBackground(['🍕', '🍔', '🍛', '🍜', '🍰', '☕', '🌯', '🍝']);

  exploreCards = signal<ExploreCard[]>([]);
  exploreLoading = signal(true);
  exploreError = signal(false);

  sort = signal<FoodSort>('popular');

  loading = signal(true);
  loadingMore = signal(false);
  feedItems = signal<FoodItem[]>([]);
  visibleCount = signal(8);
  total = signal(0);
  page = signal(1);

  todaysSpecials = signal<FoodItem[]>([]);
  popularNearYou = signal<FoodItem[]>([]);
  recentlyOrdered = signal<FoodItem[]>([]);
  recommended = signal<FoodItem[]>([]);

  private readonly observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) this.loadMore();
  });
  private observedEl: Element | null = null;

  constructor(
    private foodService: FoodService,
    private exploreCardService: ExploreCardService,
    private productModal: ProductModalService,
    private scrollRestoration: ScrollRestorationService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.loadExploreCards();
    await this.fetchFeed();
    this.scrollRestoration.restore();

    const [specials, popular, recent, recommended] = await Promise.all([
      this.foodService.list({ bestseller: true, sort: 'rating' }),
      this.foodService.list({ sort: 'rating' }),
      this.foodService.list({ sort: 'popular' }),
      this.foodService.list({ sort: 'recommended' }),
    ]);
    this.todaysSpecials.set(specials.items.slice(0, 4));
    this.popularNearYou.set(popular.items.slice(0, 4));
    this.recentlyOrdered.set(recent.items.slice(0, 4));
    this.recommended.set(recommended.items.slice(0, 4));
  }

  // Re-attaches the observer whenever the sentinel div appears/disappears
  // (it's only rendered while there are more items left to reveal).
  ngAfterViewChecked() {
    const el = this.scrollSentinel?.nativeElement ?? null;
    if (el !== this.observedEl) {
      this.observer.disconnect();
      if (el) this.observer.observe(el);
      this.observedEl = el;
    }
  }

  ngOnDestroy() {
    this.observer.disconnect();
  }

  visibleFeedItems(): FoodItem[] {
    return this.feedItems().slice(0, this.visibleCount());
  }

  async loadExploreCards() {
    this.exploreLoading.set(true);
    this.exploreError.set(false);
    try {
      const res = await this.exploreCardService.list();
      this.exploreCards.set(res.cards);
    } catch {
      this.exploreError.set(true);
    } finally {
      this.exploreLoading.set(false);
    }
  }

  // Navigates to the card's listing page with its filter combination applied
  // as query params — e.g. { topRated: true } becomes ?topRated=true, which
  // FoodListComponent reads on load and applies the same way a manual chip
  // click would.
  openExplore(card: ExploreCard) {
    this.router.navigate([card.route], { queryParams: card.filters as Record<string, unknown> });
  }

  openFoodDetails(item: FoodItem) {
    if (!item.isAvailable) return;
    this.productModal.open({
      item: foodItemToMenuItem(item),
      restaurantSlug: item.restaurantId,
      restaurantName: item.restaurantName,
    });
  }

  private buildFeedQuery(): FoodQuery {
    return { sort: this.sort() };
  }

  private async fetchFeed() {
    this.loading.set(true);
    try {
      const res = await this.foodService.list(this.buildFeedQuery());
      this.feedItems.set(res.items);
      this.total.set(res.total);
      this.page.set(1);
      this.visibleCount.set(8);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore() {
    const items = this.feedItems();
    if (this.visibleCount() < items.length) {
      this.visibleCount.update((c) => Math.min(c + 8, items.length));
      return;
    }
    if (this.loadingMore() || items.length >= this.total()) return;

    this.loadingMore.set(true);
    try {
      const nextPage = this.page() + 1;
      const res = await this.foodService.list({ ...this.buildFeedQuery(), page: nextPage });
      this.feedItems.update((cur) => [...cur, ...res.items]);
      this.page.set(nextPage);
      this.visibleCount.update((c) => Math.min(c + 8, items.length + res.items.length));
    } finally {
      this.loadingMore.set(false);
    }
  }

}
