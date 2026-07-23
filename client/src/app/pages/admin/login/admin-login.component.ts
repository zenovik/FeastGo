import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-ink-900 px-4">
      <div class="w-full max-w-sm">
        <div class="mb-6 text-center">
          <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-ember-500 text-white">
            <app-icon name="shield-check" [size]="20" />
          </span>
          <h1 class="mt-3 font-display text-2xl font-bold text-white">Admin Login</h1>
        </div>

        <div class="rounded-2xl bg-white p-5 shadow-[var(--shadow-pop)]">
          @if (error()) {
            <p class="mb-3 rounded-lg bg-ember-50 px-3 py-2 text-sm font-medium text-ember-700">{{ error() }}</p>
          }
          <form class="space-y-3" (submit)="onSubmit($event)">
            <input type="email" [(ngModel)]="email" name="email" required placeholder="Email address" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            <input type="password" [(ngModel)]="password" name="password" required placeholder="Password" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
            <button type="submit" [disabled]="submitting()" class="w-full rounded-lg bg-ink-900 py-2.5 text-sm font-bold text-white hover:bg-ink-700 disabled:opacity-50">
              {{ submitting() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class AdminLoginComponent {
  email = '';
  password = '';
  submitting = signal(false);
  error = signal<string | null>(null);

  constructor(
    private auth: AdminAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async onSubmit(e: Event) {
    e.preventDefault();
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.email.trim(), this.password);
      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/admin/dashboard';
      this.router.navigateByUrl(redirect);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Invalid email or password');
    } finally {
      this.submitting.set(false);
    }
  }
}
