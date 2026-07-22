import { Component, ElementRef, QueryList, ViewChildren, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type Step = 'phone' | 'otp' | 'name' | 'location';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="container-shell flex min-h-[50vh] max-w-md flex-col justify-center py-10">
      <div class="mb-6 text-center">
        <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-ember-500 text-white">
          <app-icon name="flame" [size]="20" />
        </span>
        <h1 class="mt-3 font-display text-2xl font-bold text-ink-900">
          @if (step() === 'phone') {
            Log in or sign up
          } @else if (step() === 'otp') {
            Verify your number
          } @else if (step() === 'name') {
            What's your name?
          } @else {
            Share your location
          }
        </h1>
        <p class="mt-1 text-sm text-ink-400">
          @if (step() === 'phone') {
            Order in seconds — no password to remember.
          } @else if (step() === 'otp') {
            We've sent a 4-digit code to {{ displayPhone() }}
          } @else if (step() === 'name') {
            One last step to set up your FeastGo account.
          } @else {
            So we can show restaurants near you and estimate delivery time. Totally optional.
          }
        </p>
      </div>

      <div class="card-surface space-y-8 p-5">
        @if (error()) {
          <p class="rounded-lg bg-ember-50 px-3 py-2 text-sm font-medium text-ember-700=">{{ error() }}</p>
        }

        @if (step() === 'phone') {
          <form (submit)="onSubmitPhone($event)">
            <label class="mb-1 block text-xs font-semibold text-ink-500">Phone number</label>
            <div class="flex overflow-hidden rounded-lg border border-ink-200 focus-within:border-ember-400">
              <span class="flex items-center bg-ink-50 px-3 text-sm font-semibold text-ink-600">+1</span>
              <input
                type="tel"
                inputmode="numeric"
                required
                [(ngModel)]="phoneInput"
                name="phone"
                placeholder="10-digit mobile number"
                class="w-full px-3 py-2.5 text-sm outline-none"
              />
            </div>
            <button
              type="submit"
              [disabled]="submitting()"
              class="mt-4 w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white hover:bg-ember-600 disabled:opacity-50"
            >
              {{ submitting() ? 'Sending code…' : 'Continue' }}
            </button>
          </form>
        }

        @if (step() === 'otp') {
          <form (submit)="onSubmitOtp($event)">
            <div class="flex justify-between gap-2">
              @for (i of [0, 1, 2, 3]; track i) {
                <input
                  #otpBox
                  type="text"
                  inputmode="numeric"
                  maxlength="1"
                  [value]="otpDigits()[i]"
                  (input)="onDigitInput(i, $event)"
                  (keydown)="onDigitKeydown(i, $event)"
                  class="h-14 w-14 rounded-lg border border-ink-200 text-center text-xl font-bold outline-none focus:border-ember-400"
                />
              }
            </div>

            @if (devOtp()) {
              <p class="mt-3 rounded-lg bg-gold-400/15 px-3 py-2 text-xs font-medium text-gold-700">
                Demo mode — no SMS provider is wired up, so your code is <strong>{{ devOtp() }}</strong>
              </p>
            }

            <button
              type="submit"
              [disabled]="submitting() || otpDigits().join('').length < 4"
              class="mt-4 w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white hover:bg-ember-600 disabled:opacity-50"
            >
              {{ submitting() ? 'Verifying…' : 'Verify & continue' }}
            </button>

            <div class="mt-3 flex items-center justify-between text-sm">
              <button type="button" class="font-semibold text-ink-500 hover:text-ink-800" (click)="changeNumber()">
                Change number
              </button>
              <button
                type="button"
                class="font-semibold text-ember-600 disabled:text-ink-300"
                [disabled]="resendCooldown() > 0"
                (click)="resendOtp()"
              >
                {{ resendCooldown() > 0 ? 'Resend in ' + resendCooldown() + 's' : 'Resend code' }}
              </button>
            </div>
          </form>
        }

        @if (step() === 'name') {
          <form (submit)="onSubmitName($event)">
            <label class="mb-1 block text-xs font-semibold text-ink-500">Full name</label>
            <input
              required
              [(ngModel)]="nameInput"
              name="name"
              placeholder="Your name"
              class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400"
            />
            <label class="mb-1 mt-3 block text-xs font-semibold text-ink-500">Email (optional)</label>
            <input
              type="email"
              [(ngModel)]="emailInput"
              name="email"
              placeholder="you@example.com"
              class="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-ember-400"
            />
            <button
              type="submit"
              [disabled]="submitting()"
              class="mt-4 w-full rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white hover:bg-ember-600 disabled:opacity-50"
            >
              {{ submitting() ? 'Creating account…' : 'Create account' }}
            </button>
          </form>
        }

        @if (step() === 'location') {
          <div>
            <button
              type="button"
              [disabled]="submitting()"
              (click)="shareLocation()"
              class="flex w-full items-center justify-center gap-2 rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white hover:bg-ember-600 disabled:opacity-50"
            >
              <app-icon name="map-pin" [size]="16" />
              {{ submitting() ? 'Getting location…' : 'Share my location' }}
            </button>
            <button
              type="button"
              [disabled]="submitting()"
              (click)="skipLocation()"
              class="mt-2 w-full rounded-lg border border-ink-200 py-2.5 text-sm font-semibold text-ink-500 hover:text-ink-800 disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class LoginComponent {
  @ViewChildren('otpBox') otpBoxes!: QueryList<ElementRef<HTMLInputElement>>;

  step = signal<Step>('phone');
  phoneInput = '';
  otpDigits = signal(['', '', '', '']);
  nameInput = '';
  emailInput = '';

  submitting = signal(false);
  error = signal<string | null>(null);
  devOtp = signal<string | null>(null);
  resendCooldown = signal(0);

  private normalizedPhone = '';
  private cooldownHandle?: ReturnType<typeof setInterval>;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  displayPhone(): string {
    return `+1 ${this.phoneInput}`;
  }

  async onSubmitPhone(e: Event) {
    e.preventDefault();
    const digits = this.phoneInput.replace(/\D/g, '');
    if (digits.length < 7) {
      this.error.set('Enter a valid phone number');
      return;
    }
    this.normalizedPhone = `+1${digits}`;
    await this.sendOtp();
  }

  private async sendOtp() {
    this.submitting.set(true);
    this.error.set(null);
    try {
      const res = await this.auth.requestOtp(this.normalizedPhone);
      this.devOtp.set(res.devOtp ?? null);
      this.step.set('otp');
      this.otpDigits.set(['', '', '', '']);
      this.startCooldown();
      setTimeout(() => this.otpBoxes?.first?.nativeElement.focus(), 50);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Could not send OTP. Try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  private startCooldown() {
    this.resendCooldown.set(30);
    clearInterval(this.cooldownHandle);
    this.cooldownHandle = setInterval(() => {
      this.resendCooldown.update((s) => {
        if (s <= 1) {
          clearInterval(this.cooldownHandle);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  onDigitInput(index: number, e: Event) {
    const value = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(-1);
    const digits = [...this.otpDigits()];
    digits[index] = value;
    this.otpDigits.set(digits);
    if (value && index < 3) {
      this.otpBoxes.get(index + 1)?.nativeElement.focus();
    }
  }

  onDigitKeydown(index: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !this.otpDigits()[index] && index > 0) {
      this.otpBoxes.get(index - 1)?.nativeElement.focus();
    }
  }

  async onSubmitOtp(e: Event) {
    e.preventDefault();
    const code = this.otpDigits().join('');
    if (code.length < 4) return;

    this.submitting.set(true);
    this.error.set(null);
    try {
      const result = await this.auth.verifyOtp(this.normalizedPhone, code);
      if (result.newUser) {
        this.step.set('name');
      } else {
        this.toast.success(`Welcome back, ${result.user.name.split(' ')[0]}!`);
        if (result.user.location?.lat == null) {
          this.step.set('location');
        } else {
          this.redirectAfterAuth();
        }
      }
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Incorrect OTP');
    } finally {
      this.submitting.set(false);
    }
  }

  async resendOtp() {
    if (this.resendCooldown() > 0) return;
    await this.sendOtp();
    this.toast.success('New code sent');
  }

  changeNumber() {
    this.step.set('phone');
    this.error.set(null);
    this.devOtp.set(null);
    clearInterval(this.cooldownHandle);
    this.resendCooldown.set(0);
  }

  async onSubmitName(e: Event) {
    e.preventDefault();
    if (!this.nameInput.trim()) return;

    this.submitting.set(true);
    this.error.set(null);
    try {
      const user = await this.auth.completeProfile(this.normalizedPhone, this.nameInput.trim(), this.emailInput.trim() || undefined);
      this.toast.success(`Welcome to FeastGo, ${user.name.split(' ')[0]}!`);
      this.step.set('location');
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Could not create your account.');
    } finally {
      this.submitting.set(false);
    }
  }

  shareLocation() {
    if (!navigator.geolocation) {
      this.toast.error('Location is not supported on this browser');
      this.skipLocation();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await this.auth.updateProfile({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
          this.toast.success('Location saved');
        } catch {
          this.toast.error('Could not save your location');
        } finally {
          this.submitting.set(false);
          this.redirectAfterAuth();
        }
      },
      () => {
        this.submitting.set(false);
        this.toast.error('Location permission denied');
      },
      { timeout: 10000 }
    );
  }

  skipLocation() {
    this.redirectAfterAuth();
  }

  private redirectAfterAuth() {
    const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/';
    this.router.navigateByUrl(redirect);
  }
}
