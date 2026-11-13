import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-delivery-login',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="relative z-0 grid min-h-screen grid-cols-1 overflow-hidden bg-ember-50 lg:grid-cols-2">
      <!-- Left: branding panel — hidden below lg, this is a marketing/context panel, not part of the form. -->
      <div class="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div class="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-ember-200/50 blur-3xl"></div>
        <div class="pointer-events-none absolute -bottom-24 -right-16 -z-10 h-72 w-72 rounded-full bg-ember-300/40 blur-3xl"></div>

        <div class="flex items-center gap-2">
          <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-ember-500 text-white">
            <app-icon name="flame" [size]="20" />
          </span>
          <span class="font-display text-2xl font-extrabold text-ink-900">FeastGo</span>
        </div>

        <h1 class="mt-8 font-display text-4xl font-extrabold leading-tight text-ink-900">Welcome back, rider</h1>
        <p class="mt-3 max-w-md text-ink-500">Go online, accept orders and track your earnings — all from one place.</p>

        <div class="mt-8 max-w-md space-y-3">
          <div class="flex items-center gap-3 rounded-xl border border-ink-100 bg-white/70 p-4">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-600">
              <app-icon name="bolt" [size]="18" />
            </span>
            <div>
              <p class="font-bold text-ink-900">Live Order Requests</p>
              <p class="text-sm text-ink-500">Get notified the instant a new delivery is ready.</p>
            </div>
          </div>
          <div class="flex items-center gap-3 rounded-xl border border-ink-100 bg-white/70 p-4">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-basil-100 text-basil-600">
              <app-icon name="banknote" [size]="18" />
            </span>
            <div>
              <p class="font-bold text-ink-900">Real-Time Earnings</p>
              <p class="text-sm text-ink-500">Track today's, weekly and monthly payouts instantly.</p>
            </div>
          </div>
          <div class="flex items-center gap-3 rounded-xl border border-ink-100 bg-white/70 p-4">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ember-100 text-ember-600">
              <app-icon name="compass" [size]="18" />
            </span>
            <div>
              <p class="font-bold text-ink-900">Turn-by-Turn Navigation</p>
              <p class="text-sm text-ink-500">Fastest routes to the restaurant and drop-off.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: sign-in card -->
      <div class="flex items-center justify-center px-4 py-10">
        <div class="w-full max-w-md">
          <div class="mb-6 text-center lg:hidden">
            <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-ember-500 text-white">
              <app-icon name="bike" [size]="20" />
            </span>
            <h1 class="mt-3 font-display text-2xl font-bold text-ink-900">Delivery Partner Login</h1>
          </div>

          <div class="auth-card p-6">
            <h2 class="font-display text-2xl font-bold text-ink-900">Sign in</h2>
            <p class="mt-1 text-sm text-ink-400">Continue to your delivery account.</p>

            @if (error()) {
              <p class="mt-4 rounded-lg bg-ember-50 px-3 py-2 text-sm font-medium text-ember-700">{{ error() }}</p>
            }

            <form class="mt-5 space-y-4" (submit)="onSubmit($event)">
              <div>
                <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-500">Email or mobile number</label>
                <div class="relative">
                  <app-icon name="mail" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    [(ngModel)]="identifier"
                    name="identifier"
                    required
                    placeholder="you@example.com"
                    class="w-full rounded-lg border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-ember-400"
                  />
                </div>
              </div>

              <div>
                <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-500">Password</label>
                <div class="relative">
                  <app-icon name="lock" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    [(ngModel)]="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    class="w-full rounded-lg border border-ink-200 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-ember-400"
                  />
                  <button
                    type="button"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                    [class.text-ember-600]="showPassword()"
                    (click)="showPassword.set(!showPassword())"
                    [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                  >
                    <app-icon name="eye" [size]="16" />
                  </button>
                </div>
              </div>

              <div class="flex items-center justify-end text-sm">
                <a routerLink="/delivery/forgot-password" class="font-semibold text-ember-600 hover:text-ember-700">Forgot password?</a>
              </div>

              <button type="submit" [disabled]="submitting()" class="w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white hover:bg-ember-600 disabled:opacity-50">
                {{ submitting() ? 'Signing in…' : 'Sign in' }}
              </button>
            </form>

            <p class="mt-5 text-center text-sm text-ink-500">
              New here? <a routerLink="/delivery/signup" class="font-semibold text-ember-600 hover:text-ember-700">Sign up as a rider</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DeliveryLoginComponent {
  identifier = '';
  password = '';
  submitting = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);

  constructor(
    private auth: DeliveryAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async onSubmit(e: Event) {
    e.preventDefault();
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.identifier.trim(), this.password);
      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/delivery/dashboard';
      this.router.navigateByUrl(redirect);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Invalid credentials');
    } finally {
      this.submitting.set(false);
    }
  }
}
