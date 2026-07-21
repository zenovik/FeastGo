import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Restaurant } from '../../../core/models/restaurant.model';
import { IconComponent } from '../icon/icon.component';
import { RatingBadgeComponent } from '../rating-stars/rating-stars.component';
import { InrPipe } from '../../pipes/inr.pipe';
import { Tilt3dDirective } from '../../directives/tilt-3d.directive';

@Component({
  selector: 'app-restaurant-card',
  standalone: true,
  imports: [RouterLink, IconComponent, RatingBadgeComponent, InrPipe, Tilt3dDirective],
  template: `
    <a
      [routerLink]="['/restaurants', restaurant.slug]"
      class="card-surface group block overflow-hidden"
    >
      <div appTilt3d class="relative aspect-[5/3] w-full overflow-hidden bg-ink-100">
        <img
          [src]="restaurant.coverImage"
          [alt]="restaurant.name"
          class="h-full w-full object-cover"
          loading="lazy"
        />
        @if (restaurant.offer) {
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink-900/85 to-transparent px-3 py-2">
            <span class="flex items-center gap-1 text-xs font-semibold text-gold-400">
              <app-icon name="percent" [size]="12" />
              {{ restaurant.offer }}
            </span>
          </div>
        }
        @if (!restaurant.isOpen) {
          <div class="absolute inset-0 flex items-center justify-center bg-ink-900/60">
            <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-800">Closed now</span>
          </div>
        }
      </div>

      <div class="p-3.5">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-display text-[15px] font-bold leading-snug text-ink-900 line-clamp-1">
            {{ restaurant.name }}
          </h3>
          <app-rating-badge [rating]="restaurant.rating" />
        </div>

        <p class="mt-1 truncate text-[13px] text-ink-400">
          {{ restaurant.cuisines.join(', ') }}
        </p>

        <div class="mt-2 flex items-center gap-3 text-[13px] text-ink-500">
          <span class="flex items-center gap-1">
            <app-icon name="clock" [size]="14" />
            {{ restaurant.deliveryTimeMin }}–{{ restaurant.deliveryTimeMax }} min
          </span>
          <span>{{ restaurant.minOrder | inr }} for two</span>
        </div>

        @if (restaurant.tags.length) {
          <div class="mt-2 flex flex-wrap gap-1">
            @for (tag of restaurant.tags.slice(0, 2); track tag) {
              <span class="rounded-md bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-500">{{ tag }}</span>
            }
          </div>
        }
      </div>
    </a>
  `,
})
export class RestaurantCardComponent {
  @Input({ required: true }) restaurant!: Restaurant;
}
