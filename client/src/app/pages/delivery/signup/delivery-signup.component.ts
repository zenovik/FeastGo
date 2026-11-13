import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { MobileFieldComponent } from '../../../shared/components/mobile-field/mobile-field.component';
import { normalizeMobile } from '../../../shared/utils/mobile-validation';

@Component({
  selector: 'app-delivery-signup',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, MobileFieldComponent],
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

        @if (!phoneVerified()) {
          <form class="space-y-3" (submit)="onVerifyPhone($event)">
            <app-mobile-field [value]="phone" (valueChange)="phone = $event" (validityChange)="phoneValid.set($event)" placeholder="Phone number" [disabled]="otpSent()" />

            @if (!otpSent()) {
              <button
                type="button"
                [disabled]="submitting() || !phoneValid()"
                class="w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                (click)="sendOtp()"
              >
                {{ submitting() ? 'Sending…' : 'Send OTP' }}
              </button>
            } @else {
              @if (devOtp()) {
                <div class="flex items-center gap-3 rounded-xl border border-gold-300 bg-gold-50 px-4 py-3">
                  <app-icon name="lock" [size]="18" class="shrink-0 text-gold-600" />
                  <div>
                    <p class="text-[11px] font-bold uppercase tracking-wide text-gold-700">Demo mode — your OTP</p>
                    <p class="mt-0.5 text-2xl font-extrabold tracking-[0.35em] text-gold-800">{{ devOtp() }}</p>
                  </div>
                </div>
              }
              <input [(ngModel)]="otpCode" name="otpCode" required placeholder="Enter 4-digit OTP" maxlength="4" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm tracking-widest outline-none focus:border-ember-400" />
              <button type="submit" [disabled]="submitting() || otpCode.length < 4" class="w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white hover:bg-ember-600 disabled:opacity-50">
                {{ submitting() ? 'Verifying…' : 'Verify OTP' }}
              </button>
              <button type="button" class="w-full text-center text-xs font-semibold text-ink-400" (click)="otpSent.set(false)">Change phone number</button>
            }
          </form>
        } @else {
          <form class="space-y-3" (submit)="onSubmit($event)">
            <p class="rounded-lg bg-basil-50 px-3 py-2 text-xs font-semibold text-basil-700">Phone verified ✓ {{ phone }}</p>
            <input [(ngModel)]="name" name="name" required placeholder="Your name" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            <input type="email" [(ngModel)]="email" name="email" required placeholder="Email address" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            <div class="grid grid-cols-2 gap-2">
              <select [(ngModel)]="vehicleType" name="vehicleType" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400">
                <option value="bike">Motorbike</option>
                <option value="scooter">Scooter</option>
                <option value="bicycle">Bicycle</option>
                <option value="car">Car</option>
              </select>
              <input [(ngModel)]="vehicleNumber" name="vehicleNumber" placeholder="Vehicle number" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            </div>
            <input type="password" [(ngModel)]="password" name="password" required minlength="6" placeholder="Password (min 6 characters)" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required placeholder="Confirm password" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            <button
              type="submit"
              [disabled]="submitting() || !name.trim() || !email.trim() || password.length < 6 || password !== confirmPassword"
              class="w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white hover:bg-ember-600 disabled:opacity-50"
            >
              {{ submitting() ? 'Creating account…' : 'Sign up' }}
            </button>
            <p class="text-center text-xs text-ink-400">You can add your documents (license, ID proof) from your profile after signing up.</p>
          </form>
        }

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
  vehicleNumber = '';
  otpCode = '';
  otpSent = signal(false);
  phoneVerified = signal(false);
  phoneValid = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  devOtp = signal<string | null>(null);

  constructor(
    private auth: DeliveryAuthService,
    private router: Router
  ) {}

  async sendOtp() {
    this.submitting.set(true);
    this.error.set(null);
    try {
      const res = await this.auth.requestOtp(normalizeMobile(this.phone));
      this.otpSent.set(true);
      this.devOtp.set(res.devOtp ?? null);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Could not send OTP');
    } finally {
      this.submitting.set(false);
    }
  }

  async onVerifyPhone(e: Event) {
    e.preventDefault();
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.auth.verifyOtp(normalizeMobile(this.phone), this.otpCode.trim());
      this.phoneVerified.set(true);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Invalid OTP');
    } finally {
      this.submitting.set(false);
    }
  }

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
        phone: normalizeMobile(this.phone),
        password: this.password,
        vehicleType: this.vehicleType,
        vehicleNumber: this.vehicleNumber.trim(),
      });
      this.router.navigate(['/delivery/dashboard']);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Could not create your account');
    } finally {
      this.submitting.set(false);
    }
  }
}
