import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FoodItem } from '../../core/models/food-item.model';
import { FoodPriceRange, FoodQuery, FoodService, FoodSort } from '../../core/services/food.service';
import { ScrollRestorationService } from '../../core/services/scroll-restoration.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { FoodCardComponent } from '../../shared/components/food-card/food-card.component';

interface FilterChip {
  key: 'veg' | 'nonVeg' | 'bestseller' | 'spicy' | 'healthy' | 'fastDelivery' | 'under199' | 'offers' | 'topRated';
  label: string;
  icon?: string;
}

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
    <div class="container-shell py-8">
      <h1 class="flex flex-wrap items-center gap-2 font-display text-2xl font-bold text-ink-900">
        @if (query()) {
          <span>Results for "{{ query() }}"</span>
          <button
            type="button"
            class="flex items-center gap-1 rounded-full border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-500 hover:border-ember-400 hover:text-ember-600"
            (click)="clearSearch()"
          >
            <app-icon name="x" [size]="13" /> Clear search
          </button>
        } @else {
          Food Feed
        }
      </h1>
      <p class="mt-1 text-sm text-ink-400">{{ total() }} dish{{ total() === 1 ? '' : 'es' }} found</p>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        @for (chip of filterChips; track chip.key) {
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold"
            [class]="active(chip.key) ? 'border-ember-500 bg-ember-50 text-ember-600' : 'border-ink-200 text-ink-600'"
            (click)="toggleFilter(chip.key)"
          >
            @if (chip.icon) {
              <app-icon [name]="chip.icon" [size]="15" />
            }
            {{ chip.label }}
          </button>
        }

        <select
          class="rounded-full border border-ink-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink-600 outline-none focus:border-ember-400"
          [value]="priceRange()"
          (change)="onPriceRangeChange($event)"
        >
          @for (opt of priceRanges; track opt.value) {
            <option [value]="opt.value">{{ opt.label }}</option>
          }
        </select>

        <div class="ml-auto flex items-center gap-2">
          <label class="text-sm text-ink-500" for="sort">Sort by</label>
          <select
            id="sort"
            class="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 outline-none focus:border-ember-400"
            [value]="sort()"
            (change)="onSortChange($event)"
          >
            @for (opt of sortOptions; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>
      </div>

      @if (loading()) {
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
            <div class="card-surface h-72 animate-pulse bg-ink-100"></div>
          }
        </div>
      } @else if (items().length === 0) {
        <div class="mt-16 flex flex-col items-center gap-3 text-center text-ink-400">
          <app-icon name="search" [size]="40" />
          <p class="text-lg font-semibold text-ink-600">No dishes match your filters</p>
          <p class="text-sm">Try a different search term or clear your filters.</p>
        </div>
      } @else {
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (item of items(); track item.id) {
            <app-food-card [item]="item" />
          }
        </div>

        @if (items().length < total()) {
          <div class="mt-6 flex justify-center">
            <button
              type="button"
              [disabled]="loadingMore()"
              class="rounded-lg border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:border-ember-400 disabled:opacity-50"
              (click)="loadMore()"
            >
              {{ loadingMore() ? 'Loading…' : 'Load more' }}
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class FoodListComponent implements OnInit {
  filterChips = FILTER_CHIPS;
  sortOptions = SORT_OPTIONS;
  priceRanges = PRICE_RANGES;

  query = signal<string | null>(null);
  sort = signal<FoodSort>('popular');
  priceRange = signal<FoodPriceRange | ''>('');
  activeFilters = signal<Set<FilterChip['key']>>(new Set());

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
    private scrollRestoration: ScrollRestorationService
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(async (params) => {
      this.query.set(params.get('q'));
      await this.fetch();
      if (this.initialLoad) {
        this.initialLoad = false;
        this.scrollRestoration.restore();
      }
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
      veg: filters.has('veg'),
      nonVeg: filters.has('nonVeg'),
      bestseller: filters.has('bestseller'),
      spicy: filters.has('spicy'),
      healthy: filters.has('healthy'),
      fastDelivery: filters.has('fastDelivery'),
      under199: filters.has('under199'),
      offers: filters.has('offers'),
      topRated: filters.has('topRated'),
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
