import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SellerAuthService } from '../../../core/services/seller-auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { authHeroIllustration } from '../../../core/utils/food-image.util';

@Component({
  selector: 'app-seller-login',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <img [src]="backgroundImage" alt="" class="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div class="container-shell relative flex max-w-md flex-col justify-center py-10">
      <div class="mb-6 text-center">
        <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-ember-500 text-white">
          <app-icon name="chef-hat" [size]="20" />
        </span>
        <h1 class="mt-3 font-display text-2xl font-bold text-ink-900">Restaurant Partner Login</h1>
        <p class="mt-1 text-sm text-ink-400">Manage your menu, orders and earnings.</p>
      </div>

      <div class="auth-card space-y-4 p-5">
        @if (error()) {
          <p class="rounded-lg bg-ember-50 px-3 py-2 text-sm font-medium text-ember-700">{{ error() }}</p>
        }
        <form class="space-y-3" (submit)="onSubmit($event)">
          <input type="email" [(ngModel)]="email" name="email" required placeholder="Email address" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
          <input type="password" [(ngModel)]="password" name="password" required placeholder="Password" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
          <button type="submit" [disabled]="submitting()" class="w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white hover:bg-ember-600 disabled:opacity-50">
            {{ submitting() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
        <p class="text-center text-sm text-ink-500">
          New partner? <a routerLink="/seller/signup" class="font-semibold text-ember-600 hover:text-ember-700">Register your restaurant</a>
        </p>
      </div>
      </div>
    </div>
  `,
})
export class SellerLoginComponent {
  email = '';
  password = '';
  submitting = signal(false);
  error = signal<string | null>(null);
  backgroundImage = authHeroIllustration();

  constructor(
    private auth: SellerAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async onSubmit(e: Event) {
    e.preventDefault();
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.email.trim(), this.password);
      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/seller/dashboard';
      this.router.navigateByUrl(redirect);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Invalid email or password');
    } finally {
      this.submitting.set(false);
    }
  }
}
