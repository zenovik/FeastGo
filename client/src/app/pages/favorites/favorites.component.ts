import { Component, effect, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FoodItem } from '../../core/models/food-item.model';
import { FoodFavoritesService } from '../../core/services/food-favorites.service';
import { FoodService } from '../../core/services/food.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { FoodCardComponent } from '../../shared/components/food-card/food-card.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [RouterLink, IconComponent, FoodCardComponent],
  template: `
    <div class="container-shell py-8">
      <h1 class="font-display text-2xl font-bold text-ink-900">Your bookmarks</h1>
      <p class="mt-1 text-sm text-ink-400">
        {{ items().length }} dish{{ items().length === 1 ? '' : 'es' }} saved
      </p>

      @if (items().length === 0) {
        <div class="mt-16 flex flex-col items-center gap-3 text-center text-ink-400">
          <app-icon name="heart" [size]="40" />
          <p class="text-lg font-semibold text-ink-600">No bookmarks yet</p>
          <p class="text-sm">Tap the heart icon on any dish to save it here.</p>
          <a routerLink="/restaurants" class="mt-2 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white">
            Browse dishes
          </a>
        </div>
      } @else {
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (item of items(); track item.id) {
            <app-food-card [item]="item" />
          }
        </div>
      }
    </div>
  `,
})
export class FavoritesComponent {
  items = signal<FoodItem[]>([]);
  private loadToken = 0;

  constructor(
    private favorites: FoodFavoritesService,
    private foodService: FoodService
  ) {
    effect(() => {
      const ids = [...this.favorites.ids()];
      const token = ++this.loadToken;
      Promise.all(ids.map((id) => this.foodService.getById(id))).then((items) => {
        if (token !== this.loadToken) return;
        this.items.set(items.filter((item): item is FoodItem => !!item));
      });
    });
  }
}
