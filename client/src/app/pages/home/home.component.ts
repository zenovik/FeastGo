import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Restaurant } from '../../core/models/restaurant.model';
import { RestaurantService } from '../../core/services/restaurant.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';

interface CuisineTile {
  name: string;
  emoji: string;
}

const CUISINE_TILES: CuisineTile[] = [
  { name: 'Italian', emoji: '🍝' },
  { name: 'Japanese', emoji: '🍣' },
  { name: 'Mexican', emoji: '🌮' },
  { name: 'American', emoji: '🍔' },
  { name: 'Indian', emoji: '🍛' },
  { name: 'Chinese', emoji: '🥡' },
  { name: 'Mediterranean', emoji: '🥙' },
  { name: 'Thai', emoji: '🍜' },
  { name: 'Desserts', emoji: '🍰' },
  { name: 'Cafe', emoji: '🧋' },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, RestaurantCardComponent],
  template: `
    <section class="relative overflow-hidden bg-ink-900">
      <div
        class="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-ember-500/30 blur-3xl"
      ></div>
      <div
        class="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-basil-400/20 blur-3xl"
      ></div>

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

        <form class="mt-8 max-w-lg" (submit)="onSearch($event)">
          <label class="relative block">
            <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">
              <app-icon name="search" [size]="19" />
            </span>
            <input
              type="search"
              [(ngModel)]="searchTerm"
              name="search"
              placeholder="Search 'pasta', 'sushi', 'Casa Marino'…"
              class="w-full rounded-2xl border-0 bg-white py-4 pl-12 pr-32 text-[15px] text-ink-800 shadow-[var(--shadow-pop)] outline-none focus:ring-2 focus:ring-ember-400"
            />
            <button
              type="submit"
              class="absolute right-1.5 top-1.5 rounded-xl bg-ember-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-ember-600"
            >
              Search
            </button>
          </label>
        </form>
      </div>
    </section>

    <section class="container-shell py-10">
      <h2 class="font-display text-xl font-bold text-ink-900">What are you craving?</h2>
      <div class="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        @for (c of cuisineTiles; track c.name) {
          <a
            [routerLink]="['/restaurants']"
            [queryParams]="{ cuisine: c.name }"
            class="card-surface flex w-24 shrink-0 flex-col items-center gap-2 px-3 py-4 text-center hover:-translate-y-0.5"
          >
            <span class="text-3xl">{{ c.emoji }}</span>
            <span class="text-xs font-semibold text-ink-700">{{ c.name }}</span>
          </a>
        }
      </div>
    </section>

    @if (promoted().length) {
      <section class="container-shell py-6">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-xl font-bold text-ink-900">Special offers for you</h2>
        </div>
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (r of promoted(); track r._id) {
            <app-restaurant-card [restaurant]="r" />
          }
        </div>
      </section>
    }

    <section class="container-shell py-6 pb-16">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-xl font-bold text-ink-900">Popular near you</h2>
        <a routerLink="/restaurants" class="text-sm font-semibold text-ember-600 hover:text-ember-700">See all →</a>
      </div>

      @if (loading()) {
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="card-surface h-72 animate-pulse bg-ink-100"></div>
          }
        </div>
      } @else {
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (r of restaurants(); track r._id) {
            <app-restaurant-card [restaurant]="r" />
          }
        </div>
      }
    </section>
  `,
})
export class HomeComponent implements OnInit {
  cuisineTiles = CUISINE_TILES;
  searchTerm = '';
  loading = signal(true);
  restaurants = signal<Restaurant[]>([]);
  promoted = signal<Restaurant[]>([]);

  constructor(
    private restaurantService: RestaurantService,
    private router: Router
  ) {}

  async ngOnInit() {
    try {
      const res = await this.restaurantService.list({ sort: 'rating', limit: 12 });
      this.restaurants.set(res.items);
      this.promoted.set(res.items.filter((r) => r.isPromoted).slice(0, 3));
    } finally {
      this.loading.set(false);
    }
  }

  onSearch(e: Event) {
    e.preventDefault();
    const term = this.searchTerm.trim();
    this.router.navigate(['/restaurants'], term ? { queryParams: { q: term } } : {});
  }
}
