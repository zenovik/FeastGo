import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SellerAuthService } from '../../../core/services/seller-auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

const PHONE_PATTERN = /^\d{10}$/;

@Component({
  selector: 'app-seller-signup',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="container-shell flex min-h-[70vh] max-w-md flex-col justify-center py-10">
      <div class="mb-6 text-center">
        <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-ember-500 text-white">
          <app-icon name="chef-hat" [size]="20" />
        </span>
        <h1 class="mt-3 font-display text-2xl font-bold text-ink-900">Become a FeastGo Partner</h1>
        <p class="mt-1 text-sm text-ink-400">Register your restaurant and start receiving orders.</p>
      </div>

      <div class="card-surface space-y-4 p-5">
        @if (error()) {
          <p class="rounded-lg bg-ember-50 px-3 py-2 text-sm font-medium text-ember-700">{{ error() }}</p>
        }
        <form class="space-y-5" (submit)="onSubmit($event)">
          <div class="space-y-3">
            <p class="text-xs font-bold uppercase tracking-wide text-ink-400">Your details</p>
            <input [(ngModel)]="name" name="name" required placeholder="Your name" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            <input type="email" [(ngModel)]="email" name="email" required placeholder="Email address" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            <div>
              <input
                type="tel"
                [(ngModel)]="phone"
                name="phone"
                required
                maxlength="10"
                placeholder="Phone number (10 digits)"
                class="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-ember-400"
                [class.border-ember-400]="phoneTouched() && !phoneValid()"
                [class.border-ink-200]="!(phoneTouched() && !phoneValid())"
                (blur)="phoneTouched.set(true)"
              />
              @if (phoneTouched() && phone.trim() && !phoneValid()) {
                <p class="mt-1 text-xs font-medium text-ember-600">Enter a valid 10-digit phone number</p>
              }
            </div>
            <input type="password" [(ngModel)]="password" name="password" required minlength="6" placeholder="Password (min 6 characters)" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required placeholder="Confirm password" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
          </div>

          <div class="space-y-3 border-t border-ink-100 pt-4">
            <p class="text-xs font-bold uppercase tracking-wide text-ink-400">Your restaurant</p>
            <input [(ngModel)]="businessName" name="businessName" required placeholder="Restaurant name" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            <input [(ngModel)]="line1" name="line1" required placeholder="Street address" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            <div class="grid grid-cols-2 gap-2">
              <input [(ngModel)]="area" name="area" placeholder="Area / locality" class="rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
              <input [(ngModel)]="city" name="city" required placeholder="City" class="rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <input [(ngModel)]="state" name="state" placeholder="State" class="rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
              <input [(ngModel)]="zip" name="zip" placeholder="Pincode" class="rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            </div>
          </div>

          <button
            type="submit"
            [disabled]="submitting() || !formValid()"
            class="w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white hover:bg-ember-600 disabled:opacity-50"
          >
            {{ submitting() ? 'Creating account…' : 'Create account' }}
          </button>
        </form>
        <p class="text-center text-sm text-ink-500">
          Already registered? <a routerLink="/seller/login" class="font-semibold text-ember-600 hover:text-ember-700">Sign in</a>
        </p>
      </div>
    </div>
  `,
})
export class SellerSignupComponent {
  name = '';
  businessName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  line1 = '';
  area = '';
  city = '';
  state = '';
  zip = '';

  submitting = signal(false);
  error = signal<string | null>(null);
  phoneTouched = signal(false);

  constructor(
    private auth: SellerAuthService,
    private router: Router
  ) {}

  phoneValid(): boolean {
    return PHONE_PATTERN.test(this.phone.trim());
  }

  formValid(): boolean {
    return (
      !!this.name.trim() &&
      !!this.email.trim() &&
      this.phoneValid() &&
      this.password.length >= 6 &&
      this.password === this.confirmPassword &&
      !!this.businessName.trim() &&
      !!this.line1.trim() &&
      !!this.city.trim()
    );
  }

  async onSubmit(e: Event) {
    e.preventDefault();
    this.phoneTouched.set(true);
    if (!this.phoneValid()) {
      this.error.set('Enter a valid phone number');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.auth.signup({
        name: this.name.trim(),
        businessName: this.businessName.trim(),
        email: this.email.trim(),
        phone: this.phone.trim(),
        password: this.password,
      });

      // No cover image is collected at signup — left blank until the seller
      // uploads a real one from their profile card or Settings.
      await this.auth.registerRestaurant({
        name: this.businessName.trim(),
        coverImage: '',
        address: {
          line1: this.line1.trim(),
          area: this.area.trim(),
          city: this.city.trim(),
          state: this.state.trim(),
          zip: this.zip.trim(),
        } as any,
      });

      this.router.navigate(['/seller/dashboard']);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Could not create your account');
    } finally {
      this.submitting.set(false);
    }
  }
}
