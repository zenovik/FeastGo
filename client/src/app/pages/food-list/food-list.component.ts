import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FoodItem } from '../../core/models/food-item.model';
import { CategoryService } from '../../core/services/category.service';
import { FoodPriceRange, FoodQuery, FoodService, FoodSort } from '../../core/services/food.service';
import { ScrollRestorationService } from '../../core/services/scroll-restoration.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { FoodCardComponent } from '../../shared/components/food-card/food-card.component';

type FilterChipKey =
  | 'veg'
  | 'nonVeg'
  | 'bestseller'
  | 'spicy'
  | 'healthy'
  | 'fastDelivery'
  | 'under199'
  | 'offers'
  | 'topRated'
  | 'newArrival'
  | 'featured'
  | 'freeDelivery'
  | 'bogo';

interface FilterChip {
  key: FilterChipKey;
  label: string;
  icon?: string;
}

// Every boolean filter key the food-items API understands — read straight off
// the URL on load so an Explore More card's pre-applied filters (e.g.
// ?topRated=true) land in the same activeFilters set toggling a chip would
// produce, instead of needing separate "came from a link" handling.
const FILTER_KEYS: FilterChipKey[] = [
  'veg',
  'nonVeg',
  'bestseller',
  'spicy',
  'healthy',
  'fastDelivery',
  'under199',
  'offers',
  'topRated',
  'newArrival',
  'featured',
  'freeDelivery',
  'bogo',
];

interface CategoryTile {
  name: string;
  image: string;
  isAll?: boolean;
}

const ALL_CATEGORY_TILE: CategoryTile = {
  name: 'All',
  image: '/images/food-real/dishes/margherita-pizza.webp',
  isAll: true,
};

const CATEGORY_FALLBACKS = [
  '/images/food-real/dishes/double-smash-burger.webp',
  '/images/food-real/dishes/chocolate-fudge-cake.webp',
  '/images/food-real/dishes/butter-chicken-bowl.webp',
  '/images/food-real/dishes/truffle-mushroom-pasta.webp',
  '/images/food-real/dishes/spicy-tonkotsu-ramen.webp',
  '/images/food-real/dishes/street-style-chicken-tacos.webp',
  '/images/food-real/dishes/chilli-garlic-noodles.webp',
  '/images/food-real/dishes/margherita-pizza.webp',
  '/images/food-real/dishes/grilled-halloumi-salad.webp',
  '/images/food-real/dishes/loaded-veggie-burrito.webp',
];

const FILTER_CHIPS: FilterChip[] = [
  { key: 'veg', label: 'Veg', icon: 'leaf' },
  { key: 'nonVeg', label: 'Non-Veg' },
  { key: 'bestseller', label: 'Best Seller', icon: 'flame' },
  { key: 'spicy', label: 'Spicy' },
  { key: 'healthy', label: 'Healthy' },
  { key: 'fastDelivery', label: 'Fast Delivery', icon: 'clock' },
  { key: 'under199', label: 'Under ₹199' },
  { key: 'offers', label: 'Offers', icon: 'percent' },
  { key: 'topRated', label: 'Top Rated', icon: 'star' },
  { key: 'newArrival', label: 'New', icon: 'bolt' },
  { key: 'featured', label: 'Premium', icon: 'shield-check' },
  { key: 'freeDelivery', label: 'Free Delivery', icon: 'truck' },
  { key: 'bogo', label: 'Buy 1 Get 1', icon: 'percent' },
];

const SORT_OPTIONS: { value: FoodSort; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Rating' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'fastest', label: 'Fastest Delivery' },
  { value: 'recommended', label: 'Recommended' },
];

const PRICE_RANGES: { value: FoodPriceRange | ''; label: string }[] = [
  { value: '', label: 'Any price' },
  { value: 'under199', label: 'Under ₹199' },
  { value: '199-399', label: '₹199 – ₹399' },
  { value: '399plus', label: '₹399+' },
];

@Component({
  selector: 'app-food-list',
  standalone: true,
  imports: [IconComponent, FoodCardComponent],
  template: `
    <main class="container-shell-full pb-12 pt-5 sm:pb-16 sm:pt-8">
      <section class="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#fff5eb] via-[#fffaf6] to-[#ffe8dc] p-5 shadow-sm sm:rounded-[2rem] sm:p-8 lg:grid lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:gap-8 lg:p-10">
        <div class="pointer-events-none absolute -right-20 -top-24 -z-10 h-64 w-64 rounded-full bg-ember-200/50 blur-3xl" aria-hidden="true"></div>
        <div class="relative z-10">
          <div class="inline-flex items-center gap-2 rounded-full border border-ember-100 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ember-700 shadow-sm sm:text-xs">
            <app-icon name="map-pin" [size]="14" />
            Local favorites, delivered fresh
          </div>
          @if (query()) {
            <h1 class="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl">
              Results for <span class="text-ember-600">"{{ query() }}"</span>
            </h1>
            <button
              type="button"
              class="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-ink-600 transition hover:border-ember-400 hover:text-ember-600"
              (click)="clearSearch()"
            >
              <app-icon name="x" [size]="13" /> Clear search
            </button>
          } @else {
            <h1 class="mt-4 max-w-xl font-display text-3xl font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-4xl lg:text-[2.75rem]">
              Discover your next
              <span class="text-ember-600">favorite bite.</span>
            </h1>
            <p class="mt-3 max-w-lg text-sm leading-6 text-ink-600 sm:text-base sm:leading-7">
              From neighborhood kitchens to beloved classics, find something delicious for every craving.
            </p>
          }
          <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-ink-600 sm:text-sm">
            <span class="inline-flex items-center gap-1.5"><app-icon name="star" [size]="15" class="text-gold-500" /> Top-rated picks</span>
            <span class="inline-flex items-center gap-1.5"><app-icon name="clock" [size]="15" class="text-ember-600" /> Fast delivery</span>
          </div>
        </div>

        <div class="relative mt-6 overflow-hidden rounded-2xl bg-ink-200 shadow-lg sm:rounded-[1.5rem] lg:mt-0">
          <img
            src="/images/food-real/restaurants/basil-and-thyme.webp"
            alt="Freshly prepared meal from Basil & Thyme"
            class="aspect-[16/9] w-full object-cover sm:aspect-[16/8] lg:aspect-[5/4]"
            fetchpriority="high"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-ink-900/75 via-transparent to-ink-900/10"></div>
          <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white sm:p-5">
            <div class="min-w-0">
              <span class="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur sm:text-[11px]">
                <app-icon name="flame" [size]="12" /> Local favorite
              </span>
              <p class="mt-2 truncate font-display text-lg font-extrabold sm:text-xl">Good food, close to home</p>
            </div>
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <app-icon name="chevron_right" [size]="19" />
            </span>
          </div>
        </div>
      </section>

      @if (categoryTiles().length) {
        <section class="mt-8 sm:mt-10" aria-labelledby="category-heading">
          <div class="mb-4 flex items-end justify-between gap-4">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-ember-600">A little inspiration</p>
              <h2 id="category-heading" class="mt-1 font-display text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
                Browse by craving
              </h2>
            </div>
            <span class="hidden text-xs font-medium text-ink-400 sm:inline">Swipe to explore</span>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-3 scrollbar-none sm:gap-4">
            @for (c of categoryTiles(); track c.name) {
              <button
                type="button"
                class="group relative h-28 w-32 shrink-0 overflow-hidden rounded-2xl bg-ink-200 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500 sm:h-32 sm:w-40"
                [attr.aria-pressed]="isTileActive(c)"
                (click)="selectTile(c)"
              >
                <img
                  [src]="c.image"
                  alt=""
                  class="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <span class="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/10 to-transparent"></span>
                <span
                  class="absolute inset-0 rounded-2xl ring-inset transition"
                  [class.ring-2]="isTileActive(c)"
                  [class.ring-ember-400]="isTileActive(c)"
                ></span>
                <span class="absolute inset-x-0 bottom-0 truncate px-3 pb-3 font-display text-sm font-extrabold text-white sm:text-base">
                  {{ c.name }}
                </span>
              </button>
            }
          </div>
        </section>
      }

      <section class="mt-6 rounded-[1.5rem] border border-ink-100 bg-white p-4 shadow-sm sm:mt-8 sm:rounded-[1.75rem] sm:p-5" aria-labelledby="filter-heading">
        <div class="mb-3 flex items-center gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-ember-50 text-ember-600">
            <app-icon name="sliders" [size]="16" />
          </span>
          <div>
            <h2 id="filter-heading" class="text-sm font-extrabold text-ink-900">Make it your kind of meal</h2>
            <p class="text-xs text-ink-400">Quick filters for the things you love</p>
          </div>
        </div>

        <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-none sm:flex-wrap sm:overflow-visible">
          @for (chip of filterChips; track chip.key) {
            <button
              type="button"
              class="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition sm:text-sm"
              [class]="active(chip.key) ? 'border-ember-500 bg-ember-50 text-ember-700 shadow-sm' : 'border-ink-200 bg-white text-ink-600 hover:border-ember-300 hover:bg-ember-50/50'"
              [attr.aria-pressed]="active(chip.key)"
              (click)="toggleFilter(chip.key)"
            >
              @if (chip.icon) {
                <app-icon [name]="chip.icon" [size]="14" />
              }
              {{ chip.label }}
            </button>
          }
        </div>

        <div class="mt-3 flex flex-col gap-3 border-t border-ink-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label for="price-range" class="flex items-center gap-2 text-xs font-semibold text-ink-500">
            Price
            <select
              id="price-range"
              class="rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2 text-xs font-bold text-ink-700 outline-none transition focus:border-ember-400 focus:ring-2 focus:ring-ember-100 sm:text-sm"
              [value]="priceRange()"
              (change)="onPriceRangeChange($event)"
            >
              @for (opt of priceRanges; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </label>

          <label for="sort" class="flex items-center gap-2 text-xs font-semibold text-ink-500">
            Sort by
            <select
              id="sort"
              class="min-w-40 rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2 text-xs font-bold text-ink-700 outline-none transition focus:border-ember-400 focus:ring-2 focus:ring-ember-100 sm:text-sm"
              [value]="sort()"
              (change)="onSortChange($event)"
            >
              @for (opt of sortOptions; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </label>
        </div>
      </section>

      <section class="mt-8 sm:mt-10" aria-labelledby="results-heading">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-ember-600">Made for your cravings</p>
            <h2 id="results-heading" class="mt-1 font-display text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
              {{ query() ? 'Search results' : 'Popular near you' }}
            </h2>
          </div>
          <p class="text-xs font-semibold text-ink-400 sm:text-sm" aria-live="polite">
            {{ total() }} dish{{ total() === 1 ? '' : 'es' }} found
          </p>
        </div>

        @if (loading()) {
          <div class="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
            @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
              <div class="card-surface h-72 animate-pulse bg-ink-100"></div>
            }
          </div>
        } @else if (items().length === 0) {
          <div class="mt-5 flex flex-col items-center rounded-[1.5rem] border border-dashed border-ink-200 bg-white px-5 py-12 text-center shadow-sm">
            <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50 text-ink-400">
              <app-icon name="search" [size]="25" />
            </span>
            <p class="mt-4 font-display text-lg font-extrabold text-ink-800">No dishes found this time</p>
            <p class="mt-1 max-w-sm text-sm leading-6 text-ink-500">Try another search or loosen a filter to discover more local favorites.</p>
          </div>
        } @else {
          <div class="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
            @for (item of items(); track item.id) {
              <app-food-card [item]="item" />
            }
          </div>

          @if (items().length < total()) {
            <div class="mt-7 flex justify-center">
              <button
                type="button"
                [disabled]="loadingMore()"
                class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-5 py-2.5 text-sm font-bold text-ink-700 shadow-sm transition hover:border-ember-300 hover:bg-ember-50 hover:text-ember-700 disabled:cursor-wait disabled:opacity-50"
                (click)="loadMore()"
              >
                {{ loadingMore() ? 'Loading…' : 'Load more dishes' }}
                @if (!loadingMore()) {
                  <app-icon name="chevron_down" [size]="15" />
                }
              </button>
            </div>
          }
        }
      </section>
    </main>
  `,
})
export class FoodListComponent implements OnInit {
  filterChips = FILTER_CHIPS;
  sortOptions = SORT_OPTIONS;
  priceRanges = PRICE_RANGES;

  categoryTiles = signal<CategoryTile[]>([ALL_CATEGORY_TILE]);
  query = signal<string | null>(null);
  sort = signal<FoodSort>('popular');
  priceRange = signal<FoodPriceRange | ''>('');
  activeFilters = signal<Set<FilterChipKey>>(new Set());
  minRating = signal<number | undefined>(undefined);

  loading = signal(true);
  loadingMore = signal(false);
  items = signal<FoodItem[]>([]);
  total = signal(0);
  page = signal(1);

  private initialLoad = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private foodService: FoodService,
    private categoryService: CategoryService,
    private scrollRestoration: ScrollRestorationService
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.route.queryParamMap.subscribe(async (params) => {
      this.query.set(params.get('q'));

      // Lets an Explore More card (or any other link) land here with its
      // filter combination already applied — same activeFilters shape a
      // manual chip click would produce.
      const filters = new Set<FilterChipKey>();
      for (const key of FILTER_KEYS) {
        if (params.get(key) === 'true') filters.add(key);
      }
      this.activeFilters.set(filters);

      const price = params.get('priceRange');
      this.priceRange.set(price === 'under199' || price === '199-399' || price === '399plus' ? price : '');

      const sortParam = params.get('sort') as FoodSort | null;
      if (sortParam) this.sort.set(sortParam);

      const minRatingParam = params.get('minRating');
      this.minRating.set(minRatingParam ? Number(minRatingParam) : undefined);

      await this.fetch();
      if (this.initialLoad) {
        this.initialLoad = false;
        this.scrollRestoration.restore();
      }
    });
  }

  private async loadCategories() {
    try {
      const { categories } = await this.categoryService.list();
      this.categoryTiles.set([
        ALL_CATEGORY_TILE,
        ...categories.map((c, i) => {
          const fallback = CATEGORY_FALLBACKS[i % CATEGORY_FALLBACKS.length];
          return { name: c.name, image: c.image || fallback };
        }),
      ]);
    } catch {
      // Category strip is a non-critical enhancement — keep just "All" on failure.
    }
  }

  isTileActive(tile: CategoryTile): boolean {
    return tile.isAll ? !this.query() : this.query() === tile.name;
  }

  selectTile(tile: CategoryTile) {
    if (tile.isAll) {
      this.clearSearch();
      return;
    }
    this.selectCategory(tile.name);
  }

  private selectCategory(name: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: this.query() === name ? null : name },
      queryParamsHandling: 'merge',
    });
  }

  clearSearch() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null },
      queryParamsHandling: 'merge',
    });
  }

  active(key: FilterChip['key']): boolean {
    return this.activeFilters().has(key);
  }

  toggleFilter(key: FilterChip['key']) {
    const next = new Set(this.activeFilters());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      if (key === 'veg') next.delete('nonVeg');
      if (key === 'nonVeg') next.delete('veg');
    }
    this.activeFilters.set(next);
    this.fetch();
  }

  onPriceRangeChange(e: Event) {
    this.priceRange.set((e.target as HTMLSelectElement).value as FoodPriceRange | '');
    this.fetch();
  }

  onSortChange(e: Event) {
    this.sort.set((e.target as HTMLSelectElement).value as FoodSort);
    this.fetch();
  }

  private buildQuery(): FoodQuery {
    const filters = this.activeFilters();
    return {
      q: this.query() ?? undefined,
      sort: this.sort(),
      priceRange: this.priceRange() || undefined,
      minRating: this.minRating(),
      veg: filters.has('veg'),
      nonVeg: filters.has('nonVeg'),
      bestseller: filters.has('bestseller'),
      spicy: filters.has('spicy'),
      healthy: filters.has('healthy'),
      fastDelivery: filters.has('fastDelivery'),
      under199: filters.has('under199'),
      offers: filters.has('offers'),
      topRated: filters.has('topRated'),
      newArrival: filters.has('newArrival'),
      featured: filters.has('featured'),
      freeDelivery: filters.has('freeDelivery'),
      bogo: filters.has('bogo'),
    };
  }

  private async fetch() {
    this.loading.set(true);
    try {
      const res = await this.foodService.list(this.buildQuery());
      this.items.set(res.items);
      this.total.set(res.total);
      this.page.set(1);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore() {
    if (this.loadingMore() || this.items().length >= this.total()) return;
    this.loadingMore.set(true);
    try {
      const nextPage = this.page() + 1;
      const res = await this.foodService.list({ ...this.buildQuery(), page: nextPage });
      this.items.update((cur) => [...cur, ...res.items]);
      this.page.set(nextPage);
    } finally {
      this.loadingMore.set(false);
    }
  }
}
