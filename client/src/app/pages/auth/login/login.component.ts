import { Component, ElementRef, QueryList, ViewChildren, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthMethod, AuthMode, AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { MobileFieldComponent } from '../../../shared/components/mobile-field/mobile-field.component';

type Step = 'identity' | 'otp' | 'location';
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IconComponent, MobileFieldComponent],
  template: `
    <div class="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-10">
      <!-- Glassmorphism backdrop -->
      <div class="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-ember-50 via-white to-basil-50"></div>
      <div class="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-ember-200/40 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 -right-24 -z-10 h-72 w-72 rounded-full bg-basil-200/40 blur-3xl"></div>

      <div class="w-full max-w-md">
        <div class="mb-6 text-center">
          <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-500 text-white shadow-lg shadow-ember-500/30">
            <app-icon name="flame" [size]="22" />
          </span>
          <h1 class="mt-3 font-display text-2xl font-bold text-ink-900">
            @if (step() === 'identity') {
              {{ mode() === 'login' ? 'Welcome back' : 'Create your account' }}
            } @else if (step() === 'otp') {
              Enter verification code
            } @else {
              Share your location
            }
          </h1>
          <p class="mt-1 text-sm text-ink-500">
            @if (step() === 'identity') {
              Passwordless &amp; secure — verified with a one-time code.
            } @else if (step() === 'otp') {
              We've sent a {{ OTP_LENGTH }}-digit code to {{ identityValue() }}
            } @else {
              So we can show restaurants near you and estimate delivery time. Totally optional.
            }
          </p>
        </div>

        <div class="auth-card-enter rounded-3xl border border-white/60 bg-white/70 p-6 shadow-[0_8px_40px_-8px_rgba(20,10,5,0.18)] backdrop-blur-xl">
          @if (step() === 'identity') {
            <div class="mb-5 flex rounded-xl bg-ink-100/70 p-1 text-sm font-bold">
              <button type="button" class="flex-1 rounded-lg py-2 transition" [class]="mode() === 'login' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400'" (click)="setMode('login')">
                Log in
              </button>
              <button type="button" class="flex-1 rounded-lg py-2 transition" [class]="mode() === 'signup' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400'" (click)="setMode('signup')">
                Sign up
              </button>
            </div>
          }

          @if (error()) {
            <div class="mb-4 rounded-lg bg-ember-50 px-3 py-2.5 text-sm font-medium text-ember-700">
              <p>{{ error() }}</p>
              @if (suggestSwitch()) {
                <button type="button" class="mt-1 font-bold underline underline-offset-2" (click)="setMode(suggestSwitch()!)">
                  {{ suggestSwitch() === 'signup' ? 'Sign up instead' : 'Log in instead' }}
                </button>
              }
            </div>
          }

          @if (step() === 'identity') {
            <form (submit)="onSubmitIdentity($event)" class="space-y-4">
              <div class="flex rounded-lg border border-ink-200 p-0.5 text-xs font-bold">
                <button type="button" class="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5" [class]="method() === 'phone' ? 'bg-ember-50 text-ember-600' : 'text-ink-400'" (click)="setMethod('phone')">
                  <app-icon name="phone" [size]="13" /> Mobile number
                </button>
                <button type="button" class="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5" [class]="method() === 'email' ? 'bg-ember-50 text-ember-600' : 'text-ink-400'" (click)="setMethod('email')">
                  <app-icon name="mail" [size]="13" /> Email address
                </button>
              </div>

              @if (mode() === 'signup') {
                <div>
                  <label class="mb-1 block text-xs font-semibold text-ink-500">Full name</label>
                  <input
                    [(ngModel)]="nameInput"
                    name="name"
                    (blur)="nameTouched.set(true)"
                    placeholder="Your name"
                    class="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition"
                    [class.border-ink-200]="!nameTouched() || nameValid()"
                    [class.focus:border-ember-400]="!nameTouched() || nameValid()"
                    [class.border-ember-500]="nameTouched() && !nameValid()"
                  />
                  @if (nameTouched() && !nameValid()) {
                    <p class="mt-1 text-xs font-medium text-ember-600">Name must be between 3 and 50 characters</p>
                  }
                </div>
              }

              <div>
                <label class="mb-1 block text-xs font-semibold text-ink-500">{{ method() === 'phone' ? 'Mobile number' : 'Email address' }}</label>
                @if (method() === 'phone') {
                  <app-mobile-field [value]="phoneInput" (valueChange)="phoneInput = $event" (validityChange)="phoneValid.set($event)" placeholder="10-digit mobile number" />
                } @else {
                  <div class="relative">
                    <input
                      type="email"
                      [(ngModel)]="emailInput"
                      name="email"
                      (blur)="emailTouched.set(true)"
                      (input)="emailTouched.set(true)"
                      placeholder="you@example.com"
                      autocomplete="email"
                      class="w-full rounded-lg border px-3 py-2.5 pr-9 text-sm outline-none transition"
                      [class.border-ink-200]="!emailTouched()"
                      [class.focus:border-ember-400]="!emailTouched()"
                      [class.border-basil-500]="emailTouched() && emailValid()"
                      [class.border-ember-500]="emailTouched() && !emailValid()"
                    />
                    @if (emailTouched()) {
                      <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                        <app-icon [name]="emailValid() ? 'check' : 'x'" [size]="15" [class]="emailValid() ? 'text-basil-600' : 'text-ember-600'" />
                      </span>
                    }
                  </div>
                  @if (emailTouched() && !emailValid()) {
                    <p class="mt-1 text-xs font-medium text-ember-600">Enter a valid email address</p>
                  }
                }
              </div>

              @if (mode() === 'signup') {
                <label class="flex items-start gap-2 text-xs text-ink-600">
                  <input type="checkbox" class="mt-0.5" [(ngModel)]="termsAccepted" name="termsAccepted" />
                  <span>I agree to the <span class="font-semibold text-ink-800">Terms &amp; Conditions</span> and <span class="font-semibold text-ink-800">Privacy Policy</span></span>
                </label>
              }

              <label class="flex items-center gap-2 text-xs font-semibold text-ink-600">
                <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" />
                Keep me signed in on this device
              </label>

              <button
                type="submit"
                [disabled]="submitting() || !identityValid()"
                class="flex w-full items-center justify-center gap-2 rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white transition hover:bg-ember-600 disabled:opacity-50"
              >
                @if (submitting()) {
                  <app-icon name="clock" [size]="15" class="animate-spin" />
                }
                {{ submitting() ? 'Sending code…' : mode() === 'login' ? 'Send OTP' : 'Continue' }}
              </button>
            </form>
          }

          @if (step() === 'otp') {
            <form (submit)="onSubmitOtp($event)">
              <div class="relative">
                <div class="flex justify-between gap-1.5" [class.opacity-0]="verified()">
                  @for (i of otpIndexes; track i) {
                    <input
                      #otpBox
                      type="text"
                      inputmode="numeric"
                      maxlength="1"
                      [value]="otpDigits()[i]"
                      (input)="onDigitInput(i, $event)"
                      (keydown)="onDigitKeydown(i, $event)"
                      (paste)="onDigitPaste($event)"
                      class="h-12 w-11 rounded-lg border text-center text-lg font-bold outline-none transition focus:border-ember-400 sm:h-14 sm:w-12"
                      [class.border-ink-200]="!error()"
                      [class.border-ember-500]="!!error()"
                    />
                  }
                </div>
                @if (verified()) {
                  <div class="otp-verified-pop absolute inset-0 flex items-center justify-center">
                    <span class="flex h-12 w-12 items-center justify-center rounded-full bg-basil-500 text-white shadow-lg">
                      <app-icon name="check" [size]="24" />
                    </span>
                  </div>
                }
              </div>

              @if (devOtp()) {
                <div class="mt-3 rounded-xl border border-gold-300 bg-gold-50 px-4 py-3">
                  <div class="flex items-center gap-3">
                    <app-icon name="lock" [size]="18" class="shrink-0 text-gold-600" />
                    <div>
                      <p class="text-[11px] font-bold uppercase tracking-wide text-gold-700">Demo mode — no SMS/email is actually sent</p>
                      <p class="mt-0.5 font-display text-lg font-extrabold tracking-wide text-gold-800">
                        Demo OTP: <span class="tracking-[0.25em]">{{ devOtp() }}</span>
                      </p>
                    </div>
                  </div>
                  <p class="mt-2 text-[11px] font-semibold text-gold-700">
                    @if (resendCooldown() > 0) {
                      This code expires in {{ resendCooldown() }}s
                    } @else {
                      This code has expired — tap resend for a new one
                    }
                  </p>
                </div>
              }

              <button
                type="submit"
                [disabled]="submitting() || otpDigits().join('').length < OTP_LENGTH"
                class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-ember-500 py-2.5 text-sm font-bold text-white hover:bg-ember-600 disabled:opacity-50"
              >
                {{ submitting() ? 'Verifying…' : 'Verify & continue' }}
              </button>

              <div class="mt-3 flex items-center justify-between text-sm">
                <button type="button" class="font-semibold text-ink-500 hover:text-ink-800" (click)="changeIdentity()">
                  Change {{ method() === 'phone' ? 'number' : 'email' }}
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
    </div>
  `,
  styles: [
    `
      @keyframes authCardIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .auth-card-enter {
        animation: authCardIn 0.28s ease-out;
      }
      @keyframes otpVerifiedPop {
        from {
          opacity: 0;
          transform: scale(0.6);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      .otp-verified-pop {
        animation: otpVerifiedPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
    `,
  ],
})
export class LoginComponent {
  @ViewChildren('otpBox') otpBoxes!: QueryList<ElementRef<HTMLInputElement>>;

  readonly OTP_LENGTH = OTP_LENGTH;
  readonly otpIndexes = Array.from({ length: OTP_LENGTH }, (_, i) => i);

  mode = signal<AuthMode>('login');
  method = signal<AuthMethod>('phone');
  step = signal<Step>('identity');

  phoneInput = '';
  phoneValid = signal(false);
  emailInput = '';
  emailTouched = signal(false);
  nameInput = '';
  nameTouched = signal(false);
  termsAccepted = false;
  rememberMe = true;

  otpDigits = signal<string[]>(Array(OTP_LENGTH).fill(''));
  verified = signal(false);

  submitting = signal(false);
  error = signal<string | null>(null);
  suggestSwitch = signal<AuthMode | null>(null);
  devOtp = signal<string | null>(null);
  resendCooldown = signal(0);

  private normalizedValue = '';
  private cooldownHandle?: ReturnType<typeof setInterval>;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  emailValid(): boolean {
    return isValidEmail(this.emailInput);
  }

  nameValid(): boolean {
    const len = this.nameInput.trim().length;
    return len >= 3 && len <= 50;
  }

  identityValue(): string {
    return this.method() === 'phone' ? this.phoneInput : this.emailInput.trim();
  }

  identityValid(): boolean {
    const identityOk = this.method() === 'phone' ? this.phoneValid() : this.emailValid();
    if (this.mode() === 'login') return identityOk;
    return identityOk && this.nameValid() && this.termsAccepted;
  }

  setMode(mode: AuthMode) {
    this.mode.set(mode);
    this.error.set(null);
    this.suggestSwitch.set(null);
  }

  setMethod(method: AuthMethod) {
    this.method.set(method);
    this.error.set(null);
    this.suggestSwitch.set(null);
  }

  async onSubmitIdentity(e: Event) {
    e.preventDefault();
    this.nameTouched.set(true);
    this.emailTouched.set(true);
    if (!this.identityValid()) return;

    this.normalizedValue = this.method() === 'phone' ? this.phoneInput.replace(/\D/g, '') : this.emailInput.trim().toLowerCase();
    await this.sendOtp();
  }

  private async sendOtp() {
    this.submitting.set(true);
    this.error.set(null);
    this.suggestSwitch.set(null);
    try {
      const res = await this.auth.requestOtp(this.method(), this.normalizedValue, this.mode());
      this.devOtp.set(res.devOtp ?? null);
      this.step.set('otp');
      this.verified.set(false);
      this.otpDigits.set(Array(OTP_LENGTH).fill(''));
      this.startCooldown();
      setTimeout(() => this.otpBoxes?.first?.nativeElement.focus(), 50);
    } catch (err: any) {
      this.applyRequestError(err);
    } finally {
      this.submitting.set(false);
    }
  }

  private applyRequestError(err: any) {
    const status = err?.status;
    const message = err?.error?.message ?? 'Something went wrong. Try again.';
    this.error.set(message);
    if (status === 404) this.suggestSwitch.set('signup');
    else if (status === 409) this.suggestSwitch.set('login');
    else this.suggestSwitch.set(null);
  }

  private startCooldown() {
    this.resendCooldown.set(RESEND_SECONDS);
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
    if (value && index < OTP_LENGTH - 1) {
      this.otpBoxes.get(index + 1)?.nativeElement.focus();
    }
    if (value && index === OTP_LENGTH - 1 && digits.every((d) => d)) {
      this.submitOtp();
    }
  }

  onDigitKeydown(index: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !this.otpDigits()[index] && index > 0) {
      this.otpBoxes.get(index - 1)?.nativeElement.focus();
    }
  }

  onDigitPaste(e: ClipboardEvent) {
    const pasted = e.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const digits = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) digits[i] = pasted[i];
    this.otpDigits.set(digits);
    const lastIndex = Math.min(pasted.length, OTP_LENGTH) - 1;
    this.otpBoxes.get(Math.max(lastIndex, 0))?.nativeElement.focus();
    if (pasted.length === OTP_LENGTH) this.submitOtp();
  }

  async onSubmitOtp(e: Event) {
    e.preventDefault();
    await this.submitOtp();
  }

  private async submitOtp() {
    const code = this.otpDigits().join('');
    if (code.length < OTP_LENGTH || this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);
    try {
      if (this.mode() === 'login') {
        const user = await this.auth.verifyLoginOtp(this.method(), this.normalizedValue, code, this.rememberMe);
        this.verified.set(true);
        this.toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
        setTimeout(() => {
          if (user.location?.lat == null) this.step.set('location');
          else this.redirectAfterAuth();
        }, 500);
      } else {
        await this.auth.verifySignupOtp(this.method(), this.normalizedValue, code);
        const user = await this.auth.completeSignup(this.method(), this.normalizedValue, this.nameInput.trim(), this.termsAccepted, this.rememberMe);
        this.verified.set(true);
        this.toast.success(`Welcome to FeastGo, ${user.name.split(' ')[0]}!`);
        setTimeout(() => this.step.set('location'), 500);
      }
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Incorrect OTP');
      this.otpDigits.set(Array(OTP_LENGTH).fill(''));
      this.otpBoxes?.first?.nativeElement.focus();
    } finally {
      this.submitting.set(false);
    }
  }

  async resendOtp() {
    if (this.resendCooldown() > 0) return;
    await this.sendOtp();
    this.toast.success('New code sent');
  }

  changeIdentity() {
    this.step.set('identity');
    this.error.set(null);
    this.suggestSwitch.set(null);
    this.devOtp.set(null);
    this.verified.set(false);
    clearInterval(this.cooldownHandle);
    this.resendCooldown.set(0);
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

