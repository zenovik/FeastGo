import { Component } from '@angular/core';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import { DeliveryNavComponent } from '../../../shared/components/delivery-shell/delivery-nav.component';

@Component({
  selector: 'app-delivery-profile',
  standalone: true,
  imports: [DeliveryNavComponent],
  template: `
    <app-delivery-nav />
    <div class="container-shell max-w-xl py-8">
      <h1 class="font-display text-2xl font-bold text-ink-900">Your Profile</h1>

      @if (auth.currentUser(); as partner) {
        <div class="card-surface mt-4 space-y-3 p-5">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Name</p>
            <p class="text-sm font-semibold text-ink-900">{{ partner.name }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Email</p>
            <p class="text-sm text-ink-700">{{ partner.email }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Phone</p>
            <p class="text-sm text-ink-700">{{ partner.phone }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Vehicle</p>
            <p class="text-sm capitalize text-ink-700">{{ partner.vehicleType }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Status</p>
            <p class="text-sm capitalize text-ink-700">{{ partner.status }}</p>
          </div>
        </div>
      }
    </div>
  `,
})
export class DeliveryProfileComponent {
  constructor(public auth: DeliveryAuthService) {}
}
