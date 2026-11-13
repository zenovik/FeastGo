import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FoodItem, foodItemToMenuItem } from '../../core/models/food-item.model';
import { FoodQuery, FoodService, FoodSort } from '../../core/services/food.service';
import { ProductModalService } from '../../core/services/product-modal.service';
import { ScrollRestorationService } from '../../core/services/scroll-restoration.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { FoodCardComponent } from '../../shared/components/food-card/food-card.component';
import { InrPipe } from '../../shared/pipes/inr.pipe';

type FilterKey = 'nearFast' | 'rating4' | 'pureVeg' | 'under199' | 'offers' | 'bestSeller' | 'newArrivals' | 'healthy';

interface ExploreTile {
  label: string;
  icon: string;
  category?: string;
  filters?: FilterKey[];
}

const EXPLORE_TILES: ExploreTile[] = [
  { label: 'Offers', icon: 'percent', filters: ['offers'] },
  { label: 'Top Rated', icon: 'star', filters: ['rating4'] },
  { label: 'Healthy', icon: 'leaf', filters: ['healthy'] },
  { label: 'Under ₹199', icon: 'banknote', filters: ['under199'] },
  { label: 'Desserts', icon: 'flame', category: 'Desserts' },
  { label: 'Breakfast', icon: 'compass', category: 'Breakfast' },
  { label: 'Fast delivery', icon: 'bike', filters: ['nearFast'] },
  { label: 'Bestsellers', icon: 'bolt', filters: ['bestSeller'] },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, IconComponent, FoodCardComponent, InrPipe],
  template: `
    <section class="relative isolate overflow-hidden bg-[#fff8f3]">
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div class="absolute -right-32 -top-24 h-80 w-80 rounded-full bg-ember-200/50 blur-3xl sm:h-[30rem] sm:w-[30rem]"></div>
        <div class="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-[#f7e8d9]/80 blur-3xl"></div>
      </div>

      <div class="container-shell relative grid items-center gap-10 py-10 sm:py-14 lg:min-h-[560px] lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:py-16">
        <div class="max-w-2xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-ember-100 bg-white/80 px-3.5 py-2 text-xs font-bold text-ember-700 shadow-sm sm:text-sm">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-ember-500 text-white">
              <app-icon name="flame" [size]="13" />
            </span>
            Good food, closer than ever
          </div>

          <h1 class="mt-5 font-display text-[2.6rem] font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:mt-6 sm:text-5xl lg:text-[3.75rem]">
            Find your next
            <span class="text-ember-600">favorite meal.</span>
          </h1>
          <p class="mt-5 max-w-xl text-base leading-7 text-ink-500 sm:text-lg sm:leading-8">
            Discover local kitchens, find something delicious, and follow every order right to your door.
          </p>

          <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              routerLink="/restaurants"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ember-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-ember-500/20 transition hover:-translate-y-0.5 hover:bg-ember-600"
            >
              Explore restaurants
              <app-icon name="chevron_right" [size]="17" />
            </a>
            <a
              href="#food-grid"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white/80 px-5 py-3 text-sm font-bold text-ink-700 transition hover:border-ember-200 hover:bg-white hover:text-ember-700"
            >
              Browse popular dishes
            </a>
          </div>

          <div class="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-ink-500 sm:text-sm">
            <span class="inline-flex items-center gap-2">
              <app-icon name="map-pin" [size]="16" class="text-ember-600" />
              Local kitchens
            </span>
            <span class="inline-flex items-center gap-2">
              <app-icon name="clock" [size]="16" class="text-ember-600" />
              Live order updates
            </span>
            <span class="inline-flex items-center gap-2">
              <app-icon name="heart" [size]="16" class="text-ember-600" />
              Made for your cravings
            </span>
          </div>
        </div>

        <div class="relative mx-auto w-full max-w-[520px] lg:justify-self-end">
          <div class="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-ember-200/70 via-white/20 to-[#f3dfce] blur-xl sm:-inset-6" aria-hidden="true"></div>
          @if (todaysSpecials()[0]; as featured) {
            <button
              type="button"
              class="group relative block w-full overflow-hidden rounded-[1.75rem] bg-ink-900 text-left shadow-[var(--shadow-card-hover)] ring-1 ring-black/5"
              (click)="openFoodDetails(featured)"
              [disabled]="!featured.isAvailable"
              [attr.aria-label]="'View ' + featured.name + ' from ' + featured.restaurantName"
            >
              <img
                [src]="featured.image"
                [alt]="featured.name"
                class="aspect-[16/10] w-full object-cover object-top transition duration-700 group-hover:scale-105"
              />
              <span class="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/10 to-ink-900/5"></span>
              <span class="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-ink-800 shadow-sm backdrop-blur">
                <app-icon name="flame" [size]="14" class="text-ember-600" />
                Today's pick
              </span>
              <span class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-6">
                <span class="block min-w-0">
                  <span class="block truncate text-xs font-semibold text-white/75">{{ featured.restaurantName }}</span>
                  <span class="mt-1 block truncate font-display text-xl font-extrabold sm:text-2xl">{{ featured.name }}</span>
                </span>
                <span class="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-right backdrop-blur-md">
                  <span class="flex items-center justify-end gap-1 text-sm font-extrabold">
                    <app-icon name="star" [size]="14" class="text-gold-400" /> {{ formatRating(featured.rating) }}
                  </span>
                  <span class="mt-0.5 block text-[11px] font-semibold text-white/75">{{ featured.deliveryTime }} min</span>
                </span>
              </span>
            </button>
          } @else {
            <div class="relative overflow-hidden rounded-[1.75rem] bg-ink-900 shadow-[var(--shadow-card-hover)] ring-1 ring-black/5">
              <img [src]="specialsBackground" alt="" class="aspect-[16/10] w-full object-cover object-top" />
              <div class="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-transparent to-transparent"></div>
              <p class="absolute bottom-5 left-5 font-display text-xl font-extrabold text-white sm:bottom-6 sm:left-6 sm:text-2xl">
                Something delicious is waiting.
              </p>
            </div>
          }
          <div class="relative mx-auto mt-4 flex max-w-[92%] items-center gap-3 rounded-2xl border border-white/80 bg-white/95 p-3.5 shadow-[var(--shadow-card)] sm:absolute sm:-right-4 sm:-top-5 sm:mx-0 sm:mt-0 sm:max-w-none">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-basil-50 text-basil-600">
              <app-icon name="truck" [size]="21" />
            </span>
            <span>
              <span class="block text-sm font-bold text-ink-800">From kitchen to doorstep</span>
              <span class="mt-0.5 block text-xs text-ink-400">Follow your order as it moves</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="container-shell py-12 sm:py-16">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-ember-600">Find your next favorite</p>
          <h2 class="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">What are you craving?</h2>
        </div>
        <p class="max-w-md text-sm leading-6 text-ink-400">A quick shortcut to the kind of good you're in the mood for.</p>
      </div>
      <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        @for (tile of exploreTiles; track tile.label) {
          <button
            type="button"
            class="group flex min-h-28 items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-ember-200 hover:shadow-[var(--shadow-card)] sm:min-h-32 sm:flex-col sm:items-start sm:justify-between sm:p-4"
            (click)="applyExplore(tile)"
            [attr.aria-label]="'Explore ' + tile.label"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ember-50 text-ember-600 transition group-hover:bg-ember-500 group-hover:text-white">
              <app-icon [name]="tile.icon" [size]="19" />
            </span>
            <span class="text-xs font-bold leading-snug text-ink-700 sm:text-sm">{{ tile.label }}</span>
          </button>
        }
      </div>
    </section>

    <section id="food-grid" class="container-shell scroll-mt-24 py-10 sm:py-14">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-ember-600">
            @if (selectedCategory() || activeFilters().size) {
              Your selection
            } @else {
              Picked for you
            }
          </p>
          <h2 class="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            @if (selectedCategory()) {
              {{ selectedCategory() }}
            } @else {
              Made for you
            }
          </h2>
        </div>
        <div class="flex items-center justify-between gap-3 sm:justify-end">
          <p class="text-sm font-medium text-ink-400">{{ total() }} dishes</p>
          @if (selectedCategory() || activeFilters().size) {
            <button type="button" class="rounded-lg px-3 py-2 text-sm font-bold text-ember-700 hover:bg-ember-50" (click)="clearExplore()">
              Clear filters
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="mt-6 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
          @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
            <div class="card-surface h-80 animate-pulse bg-ink-100"></div>
          }
        </div>
      } @else if (feedItems().length === 0) {
        <div class="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-ink-200 bg-white px-5 py-14 text-center">
          <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-ember-50 text-ember-600">
            <app-icon name="search" [size]="25" />
          </span>
          <p class="mt-4 font-display text-lg font-bold text-ink-800">No dishes match this selection</p>
          <p class="mt-1 max-w-sm text-sm leading-6 text-ink-400">Try another category or clear your filters to see all available dishes.</p>
          <button type="button" class="mt-5 rounded-xl bg-ember-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-ember-600" (click)="clearExplore()">
            Show all dishes
          </button>
        </div>
      } @else {
        <div class="mt-6 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
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

    <section class="relative isolate overflow-hidden bg-ink-900 py-12 sm:py-16">
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div class="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-ember-500/20 blur-3xl"></div>
        <div class="absolute -bottom-48 left-1/4 h-96 w-96 rounded-full bg-ember-800/30 blur-3xl"></div>
      </div>
      <div class="container-shell relative">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-ember-300">Worth a closer look</p>
            <h2 class="mt-2 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Today's specials</h2>
            <p class="mt-2 max-w-lg text-sm leading-6 text-white/65">A few standout dishes from kitchens worth knowing.</p>
          </div>
          <a routerLink="/restaurants" class="inline-flex items-center gap-1.5 text-sm font-bold text-white transition hover:text-ember-300">
            Explore all
            <app-icon name="chevron_right" [size]="16" />
          </a>
        </div>
        @if (todaysSpecials().length) {
          <div class="mt-7 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
            @for (item of todaysSpecials(); track item.id) {
              <button
                type="button"
                class="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] text-left shadow-lg transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10"
                (click)="openFoodDetails(item)"
                [disabled]="!item.isAvailable"
                [attr.aria-label]="'View ' + item.name + ' from ' + item.restaurantName"
              >
                <span class="relative block aspect-[4/3] overflow-hidden bg-ink-800">
                  <img [src]="item.image" [alt]="item.name" class="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105" loading="lazy" />
                  @if (item.offer) {
                    <span class="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold text-ember-700 shadow-sm">
                      {{ item.offer }}
                    </span>
                  }
                  <span class="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-ink-900/75 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                    <app-icon name="star" [size]="12" class="text-gold-400" /> {{ formatRating(item.rating) }}
                  </span>
                </span>
                <span class="block p-4">
                  <span class="block truncate text-base font-bold text-white">{{ item.name }}</span>
                  <span class="mt-1 block truncate text-xs text-white/55">{{ item.restaurantName }}</span>
                  <span class="mt-4 flex items-center justify-between gap-3">
                    <span class="text-base font-extrabold text-white">{{ item.price | inr }}</span>
                    <span class="inline-flex items-center gap-1 text-xs font-bold text-ember-300">
                      View dish <app-icon name="chevron_right" [size]="14" />
                    </span>
                  </span>
                </span>
              </button>
            }
          </div>
        } @else {
          <div class="mt-7 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4" aria-label="Loading specials">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="h-72 animate-pulse rounded-2xl bg-white/10"></div>
            }
          </div>
        }
      </div>
    </section>

    <section class="container-shell py-10 sm:py-14">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-ember-600">Loved by local diners</p>
          <h2 class="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Popular near you</h2>
        </div>
        <a routerLink="/restaurants" class="inline-flex items-center gap-1.5 text-sm font-bold text-ember-700 hover:text-ember-800">
          See all restaurants
          <app-icon name="chevron_right" [size]="16" />
        </a>
      </div>
      <div class="mt-6 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
        @for (item of popularNearYou(); track item.id) {
          <app-food-card [item]="item" />
        }
      </div>
    </section>

    @if (recentlyOrdered().length) {
      <section class="container-shell py-8 sm:py-10">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-ember-600">Pick up where you left off</p>
            <h2 class="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink-900">Recently ordered</h2>
          </div>
          <span class="hidden text-xs font-medium text-ink-400 sm:block">Swipe to browse</span>
        </div>
        <div class="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 scrollbar-none">
          @for (item of recentlyOrdered(); track item.id) {
            <div class="w-[min(18rem,85vw)] shrink-0 snap-start">
              <app-food-card [item]="item" variant="horizontal" />
            </div>
          }
        </div>
      </section>
    }

    <section class="container-shell py-10 pb-16 sm:py-14">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-ember-600">A little more inspiration</p>
        <h2 class="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Recommended for you</h2>
      </div>
      <div class="mt-6 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
        @for (item of recommended(); track item.id) {
          <app-food-card [item]="item" />
        }
      </div>
    </section>
  `,
})
export class HomeComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLDivElement>;

  exploreTiles = EXPLORE_TILES;
  specialsBackground = '/images/food-real/dishes/margherita-pizza.webp';

  selectedCategory = signal<string | null>(null);
  activeFilters = signal<Set<FilterKey>>(new Set());
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
    private productModal: ProductModalService,
    private scrollRestoration: ScrollRestorationService
  ) {}

  async ngOnInit() {
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

  formatRating(rating: number): string {
    return rating.toFixed(1);
  }

  applyExplore(tile: ExploreTile) {
    this.selectedCategory.set(tile.category ?? null);
    this.activeFilters.set(new Set(tile.filters ?? []));
    this.fetchFeed();
    document.getElementById('food-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  clearExplore() {
    this.selectedCategory.set(null);
    this.activeFilters.set(new Set());
    this.fetchFeed();
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
    const filters = this.activeFilters();
    return {
      q: this.selectedCategory() ?? undefined,
      sort: this.sort(),
      healthy: filters.has('healthy'),
      veg: filters.has('pureVeg'),
      minRating: filters.has('rating4') ? 4.0 : undefined,
      under199: filters.has('under199'),
      offers: filters.has('offers'),
      bestseller: filters.has('bestSeller'),
      fastDelivery: filters.has('nearFast'),
      newArrival: filters.has('newArrivals'),
    };
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
