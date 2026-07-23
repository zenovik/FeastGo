import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-delivery-signup',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="container-shell flex min-h-[70vh] max-w-md flex-col justify-center py-10">
      <div class="mb-6 text-center">
        <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-ember-500 text-white">
          <app-icon name="bike" [size]="20" />
        </span>
        <h1 class="mt-3 font-display text-2xl font-bold text-ink-900">Become a Delivery Partner</h1>
        <p class="mt-1 text-sm text-ink-400">Flexible hours, earn on every delivery.</p>
      </div>

      <div class="card-surface space-y-4 p-5">
        @if (error()) {
          <p class="rounded-lg bg-ember-50 px-3 py-2 text-sm font-medium text-ember-700">{{ error() }}</p>
        }
        <form class="space-y-3" (submit)="onSubmit($event)">
          <input [(ngModel)]="name" name="name" required placeholder="Your name" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
          <input type="email" [(ngModel)]="email" name="email" required placeholder="Email address" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
          <input type="tel" [(ngModel)]="phone" name="phone" required placeholder="Phone number" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
          <select [(ngModel)]="vehicleType" name="vehicleType" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400">
            <option value="bike">Motorbike</option>
            <option value="scooter">Scooter</option>
            <option value="bicycle">Bicycle</option>
            <option value="car">Car</option>
          </select>
          <input type="password" [(ngModel)]="password" name="password" required minlength="6" placeholder="Password (min 6 characters)" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
          <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required placeholder="Confirm password" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
          <button
            type="submit"
            [disabled]="submitting() || !name.trim() || !email.trim() || !phone.trim() || password.length < 6 || password !== confirmPassword"
            class="w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white hover:bg-ember-600 disabled:opacity-50"
          >
            {{ submitting() ? 'Creating account…' : 'Sign up' }}
          </button>
        </form>
        <p class="text-center text-sm text-ink-500">
          Already a partner? <a routerLink="/delivery/login" class="font-semibold text-ember-600 hover:text-ember-700">Sign in</a>
        </p>
      </div>
    </div>
  `,
})
export class DeliverySignupComponent {
  name = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  vehicleType = 'bike';
  submitting = signal(false);
  error = signal<string | null>(null);

  constructor(
    private auth: DeliveryAuthService,
    private router: Router
  ) {}

  async onSubmit(e: Event) {
    e.preventDefault();
    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.auth.signup({
        name: this.name.trim(),
        email: this.email.trim(),
        phone: this.phone.trim(),
        password: this.password,
        vehicleType: this.vehicleType,
      });
      this.router.navigate(['/delivery/dashboard']);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Could not create your account');
    } finally {
      this.submitting.set(false);
    }
  }
}
