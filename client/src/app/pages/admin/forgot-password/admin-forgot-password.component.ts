import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { authHeroIllustration } from '../../../core/utils/food-image.util';

@Component({
  selector: 'app-admin-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <img [src]="backgroundImage" alt="" class="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div class="container-shell relative flex max-w-md flex-col justify-center py-10">
        <div class="mb-6 text-center">
          <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-ember-500 text-white">
            <app-icon name="lock" [size]="20" />
          </span>
          <h1 class="mt-3 font-display text-2xl font-bold text-ink-900">Reset your password</h1>
        </div>

        <div class="auth-card space-y-4 p-5">
          @if (error()) {
            <p class="rounded-lg bg-ember-50 px-3 py-2 text-sm font-medium text-ember-700">{{ error() }}</p>
          }

          @if (!otpSent()) {
            <form class="space-y-3" (submit)="requestOtp($event)">
              <input [(ngModel)]="identifier" name="identifier" required placeholder="Your admin email or mobile number" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
              <button type="submit" [disabled]="submitting()" class="w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {{ submitting() ? 'Sending…' : 'Send reset code' }}
              </button>
            </form>
          } @else {
            <form class="space-y-3" (submit)="resetPassword($event)">
              <p class="rounded-lg bg-basil-50 px-3 py-2 text-xs font-semibold text-basil-700">Code sent to {{ identifier }}</p>
              <input [(ngModel)]="code" name="code" required placeholder="Enter code" maxlength="4" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm tracking-widest outline-none focus:border-ember-400" />
              <input type="password" [(ngModel)]="newPassword" name="newPassword" required minlength="6" placeholder="New password (min 6 characters)" class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400" />
              <button type="submit" [disabled]="submitting()" class="w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white hover:bg-ember-600 disabled:opacity-50">
                {{ submitting() ? 'Resetting…' : 'Reset password' }}
              </button>
            </form>
          }

          <p class="text-center text-sm text-ink-500">
            <a routerLink="/admin/login" class="font-semibold text-ember-600 hover:text-ember-700">Back to sign in</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class AdminForgotPasswordComponent {
  identifier = '';
  code = '';
  newPassword = '';
  otpSent = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  backgroundImage = authHeroIllustration();

  constructor(
    private auth: AdminAuthService,
    private toast: ToastService,
    private router: Router
  ) {}

  async requestOtp(e: Event) {
    e.preventDefault();
    this.submitting.set(true);
    this.error.set(null);
    try {
      const res = await this.auth.requestPasswordReset(this.identifier.trim());
      this.otpSent.set(true);
      this.toast.success(res.devOtp ? `Code sent — for this demo it's ${res.devOtp}` : 'Code sent');
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Could not send reset code');
    } finally {
      this.submitting.set(false);
    }
  }

  async resetPassword(e: Event) {
    e.preventDefault();
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.auth.resetPassword(this.identifier.trim(), this.code.trim(), this.newPassword);
      this.toast.success('Password reset — sign in with your new password');
      this.router.navigate(['/admin/login']);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Could not reset password');
    } finally {
      this.submitting.set(false);
    }
  }
}
