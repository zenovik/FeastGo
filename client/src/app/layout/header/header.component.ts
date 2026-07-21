import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, FormsModule],
  template: `
    <header class="sticky top-0 z-50 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div class="container-shell flex h-16 items-center gap-4">
        <a routerLink="/" class="flex shrink-0 items-center gap-2">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-ember-500 text-white">
            <app-icon name="flame" [size]="18" />
          </span>
          <span class="font-display text-xl font-extrabold tracking-tight text-ink-900">FeastGo</span>
        </a>

        <button
          type="button"
          class="hidden shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-50 sm:flex"
        >
          <app-icon name="map-pin" [size]="16" class="text-ember-500" />
          <span class="max-w-[140px] truncate">Downtown, Metro City</span>
          <app-icon name="chevron_down" [size]="14" />
        </button>

        <form class="mx-auto hidden max-w-md flex-1 md:block" (submit)="onSearch($event)">
          <label class="relative block">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
              <app-icon name="search" [size]="17" />
            </span>
            <input
              type="search"
              [(ngModel)]="searchTerm"
              name="search"
              placeholder="Search restaurants or dishes"
              class="w-full rounded-full border border-ink-200 bg-ink-50 py-2.5 pl-10 pr-4 text-sm text-ink-800 outline-none transition focus:border-ember-400 focus:bg-white focus:ring-2 focus:ring-ember-100"
            />
          </label>
        </form>

        <nav class="ml-auto flex items-center gap-1 sm:gap-2">
          <a
            routerLink="/restaurants"
            routerLinkActive="text-ember-600"
            class="hidden rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50 sm:block"
          >
            Restaurants
          </a>

          @if (auth.isAuthenticated()) {
            <a
              routerLink="/orders"
              routerLinkActive="text-ember-600"
              class="hidden rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50 sm:block"
            >
              Orders
            </a>
          }

          <button
            type="button"
            class="relative rounded-lg p-2.5 text-ink-700 hover:bg-ink-50"
            (click)="cart.openDrawer()"
            aria-label="Open cart"
          >
            <app-icon name="cart" [size]="21" />
            @if (cart.itemCount() > 0) {
              <span
                class="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-white"
              >
                {{ cart.itemCount() }}
              </span>
            }
          </button>

          @if (auth.isAuthenticated()) {
            <div class="relative">
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-lg py-1.5 pl-1.5 pr-2 hover:bg-ink-50"
                (click)="menuOpen.set(!menuOpen())"
              >
                <span
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-ink-800 text-xs font-bold text-white"
                >
                  {{ initials() }}
                </span>
                <app-icon name="chevron_down" [size]="14" class="hidden text-ink-500 sm:block" />
              </button>

              @if (menuOpen()) {
                <div
                  class="absolute right-0 top-12 w-52 overflow-hidden rounded-xl border border-ink-100 bg-white py-1.5 shadow-[var(--shadow-pop)]"
                  (click)="menuOpen.set(false)"
                >
                  <div class="border-b border-ink-100 px-4 py-2.5">
                    <p class="truncate text-sm font-semibold text-ink-900">{{ auth.currentUser()?.name }}</p>
                    <p class="truncate text-xs text-ink-400">{{ auth.currentUser()?.phone }}</p>
                  </div>
                  <a routerLink="/profile" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                    <app-icon name="user" [size]="16" /> Profile
                  </a>
                  <a routerLink="/orders" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                    <app-icon name="package" [size]="16" /> Orders
                  </a>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ember-600 hover:bg-ember-50"
                    (click)="logout()"
                  >
                    <app-icon name="log-out" [size]="16" /> Sign out
                  </button>
                </div>
              }
            </div>
          } @else {
            <a
              routerLink="/login"
              class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-700"
            >
              Sign in
            </a>
          }
        </nav>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  searchTerm = '';
  menuOpen = signal(false);

  constructor(
    public auth: AuthService,
    public cart: CartService,
    private router: Router
  ) {}

  initials(): string {
    const name = this.auth.currentUser()?.name ?? '';
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  onSearch(e: Event) {
    e.preventDefault();
    const term = this.searchTerm.trim();
    this.router.navigate(['/restaurants'], term ? { queryParams: { q: term } } : {});
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/']);
  }
}
