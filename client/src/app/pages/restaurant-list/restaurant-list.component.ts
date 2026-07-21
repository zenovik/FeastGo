import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Restaurant } from '../../core/models/restaurant.model';
import { RestaurantQuery, RestaurantService } from '../../core/services/restaurant.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';

const SORT_OPTIONS: { value: RestaurantQuery['sort']; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Rating' },
  { value: 'delivery_time', label: 'Delivery time' },
  { value: 'cost_low', label: 'Cost: Low to High' },
  { value: 'cost_high', label: 'Cost: High to Low' },
];

@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [IconComponent, RestaurantCardComponent],
  template: `
    <div class="container-shell py-8">
      <h1 class="font-display text-2xl font-bold text-ink-900">
        @if (query()) {
          Results for "{{ query() }}"
        } @else if (cuisine()) {
          {{ cuisine() }} restaurants
        } @else {
          All restaurants
        }
      </h1>
      <p class="mt-1 text-sm text-ink-400">{{ total() }} restaurant{{ total() === 1 ? '' : 's' }} found</p>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold"
          [class]="veg() ? 'border-basil-500 bg-basil-50 text-basil-600' : 'border-ink-200 text-ink-600'"
          (click)="toggleVeg()"
        >
          <app-icon name="leaf" [size]="15" />
          Pure Veg
        </button>

        @for (c of cuisineOptions; track c) {
          <button
            type="button"
            class="rounded-full border px-3.5 py-2 text-sm font-semibold"
            [class]="cuisine() === c ? 'border-ember-500 bg-ember-50 text-ember-600' : 'border-ink-200 text-ink-600'"
            (click)="toggleCuisine(c)"
          >
            {{ c }}
          </button>
        }

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
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="card-surface h-72 animate-pulse bg-ink-100"></div>
          }
        </div>
      } @else if (restaurants().length === 0) {
        <div class="mt-16 flex flex-col items-center gap-3 text-center text-ink-400">
          <app-icon name="search" [size]="40" />
          <p class="text-lg font-semibold text-ink-600">No restaurants match your filters</p>
          <p class="text-sm">Try a different search term or clear your filters.</p>
        </div>
      } @else {
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (r of restaurants(); track r._id) {
            <app-restaurant-card [restaurant]="r" />
          }
        </div>
      }
    </div>
  `,
})
export class RestaurantListComponent implements OnInit {
  cuisineOptions = ['Italian', 'Japanese', 'Mexican', 'American', 'Indian', 'Chinese', 'Mediterranean', 'Thai', 'Desserts', 'Cafe'];
  sortOptions = SORT_OPTIONS;

  query = signal<string | null>(null);
  cuisine = signal<string | null>(null);
  sort = signal<RestaurantQuery['sort']>('relevance');
  veg = signal(false);

  loading = signal(true);
  restaurants = signal<Restaurant[]>([]);
  total = signal(0);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private restaurantService: RestaurantService
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.query.set(params.get('q'));
      this.cuisine.set(params.get('cuisine'));
      this.sort.set((params.get('sort') as RestaurantQuery['sort']) ?? 'relevance');
      this.veg.set(params.get('veg') === 'true');
      this.fetch();
    });
  }

  private async fetch() {
    this.loading.set(true);
    try {
      const res = await this.restaurantService.list({
        q: this.query() ?? undefined,
        cuisine: this.cuisine() ?? undefined,
        sort: this.sort(),
        veg: this.veg(),
        limit: 30,
      });
      this.restaurants.set(res.items);
      this.total.set(res.total);
    } finally {
      this.loading.set(false);
    }
  }

  private updateParams(patch: Record<string, string | null>) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: patch,
      queryParamsHandling: 'merge',
    });
  }

  toggleCuisine(c: string) {
    this.updateParams({ cuisine: this.cuisine() === c ? null : c });
  }

  toggleVeg() {
    this.updateParams({ veg: this.veg() ? null : 'true' });
  }

  onSortChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    this.updateParams({ sort: value || null });
  }
}
