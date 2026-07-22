import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FOOD_ITEMS } from '../../core/data/food-items.data';
import { FoodItem, foodItemToMenuItem } from '../../core/models/food-item.model';
import { FoodQuery, FoodService, FoodSort } from '../../core/services/food.service';
import { ProductModalService } from '../../core/services/product-modal.service';
import { foodCollageBackground, foodImage } from '../../core/utils/food-image.util';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { FoodCardComponent } from '../../shared/components/food-card/food-card.component';
import { InrPipe } from '../../shared/pipes/inr.pipe';

interface CategoryTile {
  name: string;
  emoji: string;
  gradient: [string, string];
}

type FilterKey = 'nearFast' | 'rating4' | 'pureVeg' | 'under199' | 'offers' | 'bestSeller' | 'newArrivals' | 'healthy';

interface FilterChip {
  key: FilterKey;
  label: string;
  icon?: string;
}

interface ExploreTile {
  label: string;
  icon: string;
  gradient: [string, string];
  category?: string;
  filters?: FilterKey[];
}

const CATEGORY_TILES: CategoryTile[] = [
  { name: 'Pizza', emoji: '🍕', gradient: ['#f2764f', '#b8321f'] },
  { name: 'Burger', emoji: '🍔', gradient: ['#c17a3f', '#5c3a21'] },
  { name: 'Biryani', emoji: '🍛', gradient: ['#f3722c', '#7a1a1a'] },
  { name: 'Chinese', emoji: '🥡', gradient: ['#e63946', '#7b1113'] },
  { name: 'North Indian', emoji: '🧈', gradient: ['#ee9b00', '#9b2226'] },
  { name: 'South Indian', emoji: '🫓', gradient: ['#e9c46a', '#6a4c1e'] },
  { name: 'Momos', emoji: '🥟', gradient: ['#e56b6f', '#6d1a36'] },
  { name: 'Sandwich', emoji: '🥪', gradient: ['#74c69d', '#1b4332'] },
  { name: 'Pasta', emoji: '🍝', gradient: ['#e07a5f', '#5c1a1b'] },
  { name: 'Ice Cream', emoji: '🍨', gradient: ['#ff8fd6', '#8e3b8e'] },
  { name: 'Coffee', emoji: '☕', gradient: ['#56cfe1', '#12505a'] },
  { name: 'Desserts', emoji: '🍰', gradient: ['#c2489c', '#8e3b8e'] },
];

const FILTER_CHIPS: FilterChip[] = [
  { key: 'nearFast', label: 'Near & Fast', icon: 'bike' },
  { key: 'rating4', label: 'Rating 4.0+', icon: 'star' },
  { key: 'pureVeg', label: 'Pure Veg', icon: 'leaf' },
  { key: 'under199', label: 'Under ₹199' },
  { key: 'offers', label: 'Offers', icon: 'percent' },
  { key: 'bestSeller', label: 'Best Seller', icon: 'flame' },
  { key: 'newArrivals', label: 'New Arrivals', icon: 'bolt' },
];

const EXPLORE_TILES: ExploreTile[] = [
  { label: 'Offers', icon: 'percent', gradient: ['#3B5BDB', '#1E2A5E'], filters: ['offers'] },
  { label: 'Top Rated', icon: 'star', gradient: ['#4C6EF5', '#22307A'], filters: ['rating4'] },
  { label: 'Healthy Food', icon: 'leaf', gradient: ['#3B5BDB', '#2A3F8F'], filters: ['healthy'] },
  { label: 'Budget Meals', icon: 'banknote', gradient: ['#4C6EF5', '#1E2A5E'], filters: ['under199'] },
  { label: 'Desserts', icon: 'flame', gradient: ['#5C6FE0', '#22307A'], category: 'Desserts' },
  { label: 'Breakfast', icon: 'compass', gradient: ['#3B5BDB', '#1E2A5E'], category: 'Breakfast' },
  { label: 'Fast Delivery', icon: 'bike', gradient: ['#4C6EF5', '#2A3F8F'], filters: ['nearFast'] },
  { label: 'Trending', icon: 'bolt', gradient: ['#3B5BDB', '#22307A'], filters: ['bestSeller'] },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, IconComponent, FoodCardComponent, InrPipe],
  template: `
    <section class="relative bg-ink-900">
      <div class="pointer-events-none absolute inset-0 overflow-hidden">
        <div class="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-ember-500/30 blur-3xl"></div>
        <div class="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-[#3B5BDB]/25 blur-3xl"></div>
      </div>

      <div class="container-shell relative py-16 sm:py-24">
        <p class="font-display text-sm font-bold uppercase tracking-[0.2em] text-ember-400">
          Delivering happiness, one order at a time
        </p>
        <h1 class="mt-3 max-w-xl font-display text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl">
          Great food,<br />
          delivered <span class="text-ember-400">fast</span> & fresh.
        </h1>
        <p class="mt-4 max-w-md text-ink-300">
          Order from FeastGo's curated local restaurants — real menus, real ratings, real-time tracking.
        </p>
      </div>
    </section>

    <section class="container-shell py-8">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-xl font-bold text-ink-900">Food Categories</h2>
      </div>
      <div class="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        @for (c of categoryTiles; track c.name) {
          <button
            type="button"
            class="flex w-20 shrink-0 flex-col items-center gap-2 text-center"
            (click)="selectCategory(c.name)"
          >
            <span
              class="h-16 w-16 overflow-hidden rounded-full transition"
              [class]="selectedCategory() === c.name ? 'ring-3 ring-[#3B5BDB] ring-offset-2' : 'ring-1 ring-ink-100'"
            >
              <img [src]="c.image" alt="" class="h-full w-full object-cover" loading="lazy" />
            </span>
            <span class="text-xs font-semibold" [class]="selectedCategory() === c.name ? 'text-[#3B5BDB]' : 'text-ink-700'">
              {{ c.name }}
            </span>
          </button>
        }
        <a routerLink="/restaurants" class="flex w-20 shrink-0 flex-col items-center gap-2 text-center">
          <span class="flex h-16 w-16 items-center justify-center rounded-full bg-ink-50 text-ink-500 ring-1 ring-ink-100">
            <app-icon name="chevron_right" [size]="22" />
          </span>
          <span class="text-xs font-semibold text-ink-700">See All</span>
        </a>
      </div>
    </section>

    <section class="sticky top-16 z-30 border-y border-white/40 bg-white/70 py-3 backdrop-blur-md">
      <div class="container-shell flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold"
          [class]="showMoreFilters() ? 'border-[#3B5BDB] bg-[#3B5BDB] text-white' : 'border-ink-200 bg-white/70 text-ink-600'"
          (click)="showMoreFilters.set(!showMoreFilters())"
        >
          <app-icon name="sliders" [size]="15" /> Filters
        </button>

        @for (chip of filterChips; track chip.key) {
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold"
            [class]="active(chip.key) ? 'border-[#3B5BDB] bg-[#3B5BDB] text-white' : 'border-ink-200 bg-white/70 text-ink-600'"
            (click)="toggleFilter(chip.key)"
          >
            @if (chip.icon) {
              <app-icon [name]="chip.icon" [size]="15" />
            }
            {{ chip.label }}
          </button>
        }

        @if (showMoreFilters()) {
          <select
            class="rounded-full border border-ink-200 bg-white/70 px-3.5 py-2 text-sm font-semibold text-ink-600 outline-none focus:border-[#3B5BDB]"
            [value]="sort()"
            (change)="onSortChange($event)"
          >
            <option value="popular">Popular</option>
            <option value="rating">Rating</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="fastest">Fastest Delivery</option>
            <option value="recommended">Recommended</option>
          </select>
        }
      </div>
    </section>

    <section id="food-grid" class="container-shell py-8">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-xl font-bold text-ink-900">
          @if (selectedCategory()) {
            {{ selectedCategory() }}
          } @else {
            Made for you
          }
        </h2>
        <p class="text-sm text-ink-400">{{ feedItems().length }} dishes</p>
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

        @if (visibleCount() < feedItems().length) {
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
      <h2 class="font-display text-xl font-bold text-ink-900">Explore More</h2>
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        @for (tile of exploreTiles; track tile.label) {
          <button
            type="button"
            class="flex flex-col items-start gap-3 rounded-2xl p-4 text-left text-white shadow-[var(--shadow-card)] transition hover:-translate-y-1"
            [style.background]="'linear-gradient(135deg,' + tile.gradient[0] + ',' + tile.gradient[1] + ')'"
            (click)="applyExplore(tile)"
          >
            <app-icon [name]="tile.icon" [size]="22" />
            <span class="text-sm font-bold">{{ tile.label }}</span>
          </button>
        }
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

  categoryTiles = CATEGORY_TILES.map((c) => ({ ...c, image: foodImage(c.emoji, c.gradient[0], c.gradient[1]) }));
  filterChips = FILTER_CHIPS;
  exploreTiles = EXPLORE_TILES;
  specialsBackground = foodCollageBackground(['🍕', '🍔', '🍛', '🍜', '🍰', '☕', '🌯', '🍝']);

  selectedCategory = signal<string | null>(null);
  activeFilters = signal<Set<FilterKey>>(new Set());
  showMoreFilters = signal(false);
  sort = signal<FoodSort>('popular');

  loading = signal(true);
  feedItems = signal<FoodItem[]>([]);
  visibleCount = signal(8);

  todaysSpecials = signal<FoodItem[]>([]);
  popularNearYou = signal<FoodItem[]>([]);
  recentlyOrdered = signal<FoodItem[]>([]);
  recommended = signal<FoodItem[]>([]);

  private readonly observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      this.visibleCount.update((c) => Math.min(c + 8, this.feedItems().length));
    }
  });
  private observedEl: Element | null = null;

  constructor(
    private foodService: FoodService,
    private productModal: ProductModalService
  ) {}

  async ngOnInit() {
    await this.fetchFeed();

    const [specials, popular] = await Promise.all([
      this.foodService.list({ bestseller: true, sort: 'rating' }),
      this.foodService.list({ sort: 'rating' }),
    ]);
    this.todaysSpecials.set(specials.items.slice(0, 4));
    this.popularNearYou.set(popular.items.slice(0, 4));
    this.recentlyOrdered.set(FOOD_ITEMS.slice(4, 8));
    this.recommended.set([...FOOD_ITEMS].reverse().slice(0, 4));
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

  active(key: FilterKey): boolean {
    return this.activeFilters().has(key);
  }

  toggleFilter(key: FilterKey) {
    const next = new Set(this.activeFilters());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.activeFilters.set(next);
    this.fetchFeed();
  }

  selectCategory(name: string) {
    this.selectedCategory.set(this.selectedCategory() === name ? null : name);
    this.fetchFeed();
  }

  onSortChange(e: Event) {
    this.sort.set((e.target as HTMLSelectElement).value as FoodSort);
    this.fetchFeed();
  }

  applyExplore(tile: ExploreTile) {
    this.selectedCategory.set(tile.category ?? null);
    this.activeFilters.set(new Set(tile.filters ?? []));
    this.fetchFeed();
    document.getElementById('food-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openFoodDetails(item: FoodItem) {
    if (!item.isAvailable) return;
    this.productModal.open({
      item: foodItemToMenuItem(item),
      restaurantSlug: item.restaurantId,
      restaurantName: item.restaurantName,
    });
  }

  private async fetchFeed() {
    this.loading.set(true);
    try {
      const filters = this.activeFilters();
      const query: FoodQuery = {
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
      const res = await this.foodService.list(query);
      this.feedItems.set(res.items);
      this.visibleCount.set(8);
    } finally {
      this.loading.set(false);
    }
  }

}
