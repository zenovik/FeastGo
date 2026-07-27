import { DatePipe } from '@angular/common';
import { Component, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Address, Gender, User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';
import { MobileFieldComponent } from '../../shared/components/mobile-field/mobile-field.component';
import { normalizeMobile, validateMobile } from '../../shared/utils/mobile-validation';
import { normalizeName, validateDob, validateEmail, validateGender, validateName } from '../../shared/utils/profile-validation';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const ADDRESS_TYPES = ['Home', 'Work', 'Other'];

interface NewAddressForm {
  label: string;
  line1: string;
  landmark: string;
  area: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

const EMPTY_ADDRESS_FORM: NewAddressForm = { label: 'Home', line1: '', landmark: '', area: '', city: '', state: '', zip: '', phone: '' };

function maxDobIso(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, IconComponent, MobileFieldComponent, ImageUploadComponent, DatePipe],
  template: `
    <div class="container-shell max-w-xl py-10">
      <h1 class="font-display text-2xl font-bold text-ink-900">Your profile</h1>

      @if (auth.currentUser(); as u) {
        <div class="card-surface mt-6 flex items-start gap-4 p-5">
          <div class="relative shrink-0">
            @if (editingProfile()) {
              <app-image-upload
                #photoUpload
                shape="circle"
                size="sm"
                [maxBytes]="5000000"
                [value]="u.photo"
                [uploading]="savingProfile()"
                [progress]="photoProgress()"
                (picked)="onPhotoPicked($event)"
                (invalidFile)="toast.error($event)"
              />
            } @else {
              @if (u.photo) {
                <img [src]="u.photo" class="h-14 w-14 rounded-full object-cover" alt="Profile photo" />
              } @else {
                <span class="flex h-14 w-14 items-center justify-center rounded-full bg-ink-800 text-lg font-bold text-white">
                  {{ initials(u.name) }}
                </span>
              }
            }
          </div>
          <div class="flex-1">
            @if (!editingProfile()) {
              <p class="font-display text-lg font-bold text-ink-900">{{ u.name }}</p>
              <p class="mt-0.5 text-sm text-ink-400">{{ u.phone }}</p>
              @if (u.email) {
                <p class="mt-0.5 text-sm text-ink-400">{{ u.email }}</p>
              }
              @if (u.dob) {
                <p class="mt-0.5 text-sm text-ink-400">DOB: {{ u.dob | date: 'mediumDate' }}</p>
              }
              @if (u.gender) {
                <p class="mt-0.5 text-sm capitalize text-ink-400">{{ genderLabel(u.gender) }}</p>
              }
            } @else {
              <form class="space-y-2" (submit)="saveProfile($event)">
                <div>
                  <input
                    [(ngModel)]="editName"
                    name="editName"
                    (input)="onNameInput($event)"
                    (blur)="touchedName.set(true)"
                    placeholder="Full name"
                    class="w-full rounded-lg border px-3 py-2 text-sm outline-none transition"
                    [class.border-ink-200]="!showNameError()"
                    [class.focus:border-ember-400]="!showNameError()"
                    [class.border-ember-500]="showNameError()"
                  />
                  @if (showNameError()) {
                    <p class="mt-1 text-xs font-medium text-ember-600">{{ nameError() }}</p>
                  }
                </div>

                <div class="flex items-center gap-2">
                  <div class="flex-1">
                    <app-mobile-field [value]="editPhone" (valueChange)="editPhone = $event" (validityChange)="phoneValid.set($event)" placeholder="Phone number" />
                  </div>
                  @if (editPhone.trim() === u.phone) {
                    <span class="flex shrink-0 items-center gap-1 rounded-lg bg-basil-50 px-3 py-2 text-xs font-bold text-basil-600">
                      <app-icon name="shield-check" [size]="14" /> Verified
                    </span>
                  } @else {
                    <button
                      type="button"
                      [disabled]="!phoneValid()"
                      class="shrink-0 rounded-lg border border-ember-500 px-3 py-2 text-xs font-bold text-ember-600 hover:bg-ember-50 disabled:opacity-50"
                      (click)="verifyPhone()"
                    >
                      Verify
                    </button>
                  }
                </div>

                <div>
                  <div class="flex items-center gap-2">
                    <input
                      type="email"
                      [(ngModel)]="editEmail"
                      name="editEmail"
                      (blur)="touchedEmail.set(true)"
                      placeholder="Email address"
                      class="w-full flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition"
                      [class.border-ink-200]="!showEmailError()"
                      [class.focus:border-ember-400]="!showEmailError()"
                      [class.border-ember-500]="showEmailError()"
                    />
                    @if (editEmail.trim() && editEmail.trim().toLowerCase() === (u.email ?? '')) {
                      <span class="flex shrink-0 items-center gap-1 rounded-lg bg-basil-50 px-3 py-2 text-xs font-bold text-basil-600">
                        <app-icon name="shield-check" [size]="14" /> Verified
                      </span>
                    } @else if (editEmail.trim()) {
                      <button
                        type="button"
                        class="shrink-0 rounded-lg border border-ember-500 px-3 py-2 text-xs font-bold text-ember-600 hover:bg-ember-50"
                        (click)="verifyEmail()"
                      >
                        Verify
                      </button>
                    }
                  </div>
                  @if (showEmailError()) {
                    <p class="mt-1 text-xs font-medium text-ember-600">{{ emailError() }}</p>
                  }
                </div>

                @if (changingField(); as field) {
                  <div class="space-y-2 rounded-lg border border-ink-200 bg-ink-50 p-3">
                    <p class="text-xs font-semibold text-ink-600">
                      Enter the code sent to your {{ field === 'phone' ? 'new phone number' : 'new email' }}
                    </p>
                    @if (changeError()) {
                      <p class="rounded-lg bg-ember-50 px-3 py-2 text-xs font-medium text-ember-700">{{ changeError() }}</p>
                    }
                    @if (changeDevOtp()) {
                      <div class="rounded-xl border border-gold-300 bg-gold-50 px-4 py-3">
                        <div class="flex items-center gap-3">
                          <app-icon name="lock" [size]="18" class="shrink-0 text-gold-600" />
                          <div>
                            <p class="text-[11px] font-bold uppercase tracking-wide text-gold-700">Demo mode — no SMS/email is actually sent</p>
                            <p class="mt-0.5 font-display text-lg font-extrabold tracking-wide text-gold-800">
                              Demo OTP: <span class="tracking-[0.25em]">{{ changeDevOtp() }}</span>
                            </p>
                          </div>
                        </div>
                        <p class="mt-2 text-[11px] font-semibold text-gold-700">
                          @if (changeResendCooldown() > 0) {
                            This code expires in {{ changeResendCooldown() }}s
                          } @else {
                            This code has expired — tap resend for a new one
                          }
                        </p>
                      </div>
                    }
                    <div class="flex gap-2">
                      <input
                        type="text"
                        inputmode="numeric"
                        maxlength="4"
                        [(ngModel)]="changeCode"
                        name="changeCode"
                        placeholder="4-digit code"
                        class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400"
                      />
                      <button
                        type="button"
                        [disabled]="changeSubmitting()"
                        class="shrink-0 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        (click)="submitChangeOtp()"
                      >
                        {{ changeSubmitting() ? 'Verifying…' : 'Verify' }}
                      </button>
                      <button
                        type="button"
                        class="shrink-0 rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-500"
                        (click)="cancelChange()"
                      >
                        Cancel
                      </button>
                    </div>
                    <button
                      type="button"
                      class="text-xs font-bold text-ember-600 disabled:text-ink-300"
                      [disabled]="changeResendCooldown() > 0"
                      (click)="resendChangeOtp()"
                    >
                      {{ changeResendCooldown() > 0 ? 'Resend in ' + changeResendCooldown() + 's' : 'Resend code' }}
                    </button>
                  </div>
                }

                <div>
                  <label class="mb-1 block text-xs font-semibold text-ink-500">Date of birth</label>
                  <input
                    type="date"
                    [(ngModel)]="editDob"
                    name="editDob"
                    (blur)="touchedDob.set(true)"
                    [max]="maxDob"
                    class="w-full rounded-lg border px-3 py-2 text-sm outline-none transition"
                    [class.border-ink-200]="!showDobError()"
                    [class.focus:border-ember-400]="!showDobError()"
                    [class.border-ember-500]="showDobError()"
                  />
                  @if (showDobError()) {
                    <p class="mt-1 text-xs font-medium text-ember-600">{{ dobError() }}</p>
                  }
                </div>

                <div>
                  <select
                    [(ngModel)]="editGender"
                    name="editGender"
                    (blur)="touchedGender.set(true)"
                    (change)="touchedGender.set(true)"
                    class="w-full rounded-lg border px-3 py-2 text-sm outline-none transition"
                    [class.border-ink-200]="!showGenderError()"
                    [class.focus:border-ember-400]="!showGenderError()"
                    [class.border-ember-500]="showGenderError()"
                  >
                    <option value="">Select gender</option>
                    @for (g of genderOptions; track g.value) {
                      <option [value]="g.value">{{ g.label }}</option>
                    }
                  </select>
                  @if (showGenderError()) {
                    <p class="mt-1 text-xs font-medium text-ember-600">{{ genderError() }}</p>
                  }
                </div>

                <div class="flex gap-2">
                  <button type="submit" [disabled]="savingProfile()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {{ savingProfile() ? 'Saving…' : 'Save' }}
                  </button>
                  <button type="button" [disabled]="savingProfile()" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-500" (click)="cancelEditProfile()">Cancel</button>
                </div>
              </form>
            }
          </div>
          @if (!editingProfile()) {
            <button type="button" class="text-ink-300 hover:text-ember-600" (click)="startEditProfile(u)">
              <app-icon name="edit" [size]="16" />
            </button>
          }
        </div>

        <div class="mt-6 flex items-center justify-between">
          <h2 class="font-display text-base font-bold text-ink-900">Saved addresses</h2>
          <button type="button" class="text-sm font-semibold text-ember-600" (click)="toggleAddressForm()">
            {{ showForm() ? 'Cancel' : '+ Add address' }}
          </button>
        </div>

        <div class="mt-3 space-y-2">
          @for (addr of u.addresses; track addr._id) {
            <div class="card-surface flex items-start justify-between gap-3 p-3.5">
              <div>
                <p class="text-sm font-semibold text-ink-800">{{ addr.label }} @if (addr.isDefault) { <span class="ml-1 rounded bg-basil-100 px-1.5 py-0.5 text-[10px] font-bold text-basil-600">DEFAULT</span> }</p>
                <p class="text-sm text-ink-500">{{ addr.line1 }}, {{ addr.area ? addr.area + ', ' : '' }}{{ addr.city }}</p>
                @if (addr.landmark) {
                  <p class="text-xs text-ink-400">Landmark: {{ addr.landmark }}</p>
                }
                <p class="text-xs text-ink-400">{{ addr.state }} {{ addr.zip }} @if (addr.phone) { · {{ addr.phone }} }</p>
              </div>
              <button type="button" class="text-ink-300 hover:text-ember-600" (click)="removeAddress(addr._id)">
                <app-icon name="trash" [size]="16" />
              </button>
            </div>
          } @empty {
            <p class="text-sm text-ink-400">No saved addresses yet.</p>
          }
        </div>

        @if (showForm()) {
          <form class="card-surface mt-3 space-y-2 p-4" (submit)="addAddress($event)">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <select [(ngModel)]="newAddress.label" name="label" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400">
                  @for (t of addressTypes; track t) {
                    <option [value]="t">{{ t }}</option>
                  }
                </select>
              </div>
              <div>
                <input
                  [(ngModel)]="newAddress.city"
                  name="city"
                  placeholder="City"
                  class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-ember-400"
                  [class.border-ink-200]="!addressErrors().city"
                  [class.border-ember-500]="addressErrors().city"
                />
                @if (addressErrors().city) {
                  <p class="mt-1 text-xs font-medium text-ember-600">{{ addressErrors().city }}</p>
                }
              </div>
            </div>

            <div>
              <input
                [(ngModel)]="newAddress.line1"
                name="line1"
                placeholder="Address line"
                class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-ember-400"
                [class.border-ink-200]="!addressErrors().line1"
                [class.border-ember-500]="addressErrors().line1"
              />
              @if (addressErrors().line1) {
                <p class="mt-1 text-xs font-medium text-ember-600">{{ addressErrors().line1 }}</p>
              }
            </div>

            <input [(ngModel)]="newAddress.area" name="area" placeholder="Area / neighborhood (optional)" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />

            <div>
              <input
                [(ngModel)]="newAddress.landmark"
                name="landmark"
                placeholder="Landmark"
                class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-ember-400"
                [class.border-ink-200]="!addressErrors().landmark"
                [class.border-ember-500]="addressErrors().landmark"
              />
              @if (addressErrors().landmark) {
                <p class="mt-1 text-xs font-medium text-ember-600">{{ addressErrors().landmark }}</p>
              }
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <input
                  [(ngModel)]="newAddress.state"
                  name="state"
                  placeholder="State"
                  class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-ember-400"
                  [class.border-ink-200]="!addressErrors().state"
                  [class.border-ember-500]="addressErrors().state"
                />
                @if (addressErrors().state) {
                  <p class="mt-1 text-xs font-medium text-ember-600">{{ addressErrors().state }}</p>
                }
              </div>
              <div>
                <input
                  [(ngModel)]="newAddress.zip"
                  name="zip"
                  maxlength="6"
                  inputmode="numeric"
                  placeholder="Pincode"
                  (input)="onZipInput($event)"
                  class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-ember-400"
                  [class.border-ink-200]="!addressErrors().zip"
                  [class.border-ember-500]="addressErrors().zip"
                />
                @if (addressErrors().zip) {
                  <p class="mt-1 text-xs font-medium text-ember-600">{{ addressErrors().zip }}</p>
                }
              </div>
            </div>

            <div>
              <app-mobile-field [value]="newAddress.phone" (valueChange)="newAddress.phone = $event" (validityChange)="addressPhoneValid.set($event)" placeholder="Mobile number" />
              @if (addressErrors().phone) {
                <p class="mt-1 text-xs font-medium text-ember-600">{{ addressErrors().phone }}</p>
              }
            </div>

            <button type="submit" [disabled]="savingAddress()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {{ savingAddress() ? 'Saving…' : 'Save address' }}
            </button>
          </form>
        }

        <button
          type="button"
          class="mt-8 flex items-center gap-2 text-sm font-semibold text-ember-600 hover:text-ember-700"
          (click)="logout()"
        >
          <app-icon name="log-out" [size]="16" /> Sign out
        </button>
      }
    </div>
  `,
})
export class ProfileComponent {
  genderOptions = GENDER_OPTIONS;
  addressTypes = ADDRESS_TYPES;
  maxDob = maxDobIso();

  showForm = signal(false);
  newAddress: NewAddressForm = { ...EMPTY_ADDRESS_FORM };
  addressPhoneValid = signal(false);
  addressErrors = signal<Partial<Record<keyof NewAddressForm, string>>>({});
  savingAddress = signal(false);

  editingProfile = signal(false);
  editName = '';
  editPhone = '';
  phoneValid = signal(true);
  editEmail = '';
  editDob = '';
  editGender: Gender | '' = '';
  editPhoto: string | null = null;
  savingProfile = signal(false);
  photoProgress = signal<number | null>(null);

  touchedName = signal(false);
  touchedEmail = signal(false);
  touchedDob = signal(false);
  touchedGender = signal(false);
  formSubmitted = signal(false);

  @ViewChild('photoUpload') photoUpload?: ImageUploadComponent;

  changingField = signal<'phone' | 'email' | null>(null);
  changeCode = '';
  changeDevOtp = signal<string | null>(null);
  changeSubmitting = signal(false);
  changeError = signal<string | null>(null);
  changeResendCooldown = signal(0);
  private changeCooldownHandle?: ReturnType<typeof setInterval>;
  private pendingChangeValue = '';

  constructor(
    public auth: AuthService,
    public toast: ToastService,
    private router: Router
  ) {}

  initials(name: string): string {
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  genderLabel(g: Gender): string {
    return GENDER_OPTIONS.find((o) => o.value === g)?.label ?? g;
  }

  nameError(): string {
    return validateName(this.editName).message;
  }
  showNameError(): boolean {
    return (this.touchedName() || this.formSubmitted()) && !validateName(this.editName).valid;
  }

  emailError(): string {
    if (!this.editEmail.trim()) return '';
    return validateEmail(this.editEmail).message;
  }
  showEmailError(): boolean {
    if (!this.editEmail.trim()) return false;
    return (this.touchedEmail() || this.formSubmitted()) && !validateEmail(this.editEmail).valid;
  }

  dobError(): string {
    return validateDob(this.editDob).message;
  }
  showDobError(): boolean {
    return (this.touchedDob() || this.formSubmitted()) && !validateDob(this.editDob).valid;
  }

  genderError(): string {
    return validateGender(this.editGender).message;
  }
  showGenderError(): boolean {
    return (this.touchedGender() || this.formSubmitted()) && !validateGender(this.editGender).valid;
  }

  onNameInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const sanitized = input.value.replace(/[^A-Za-z ]/g, '').replace(/ {2,}/g, ' ');
    input.value = sanitized;
    this.editName = sanitized;
  }

  startEditProfile(u: User) {
    this.editName = u.name;
    this.editPhone = u.phone ?? '';
    this.phoneValid.set(!!u.phone);
    this.editEmail = u.email ?? '';
    this.editDob = u.dob ? u.dob.slice(0, 10) : '';
    this.editGender = u.gender ?? '';
    this.editPhoto = u.photo;
    this.touchedName.set(false);
    this.touchedEmail.set(false);
    this.touchedDob.set(false);
    this.touchedGender.set(false);
    this.formSubmitted.set(false);
    this.editingProfile.set(true);
  }

  cancelEditProfile() {
    this.editingProfile.set(false);
  }

  cancelChange() {
    this.changingField.set(null);
    clearInterval(this.changeCooldownHandle);
    this.changeResendCooldown.set(0);
  }

  async verifyPhone() {
    const result = validateMobile(this.editPhone);
    if (!result.valid) {
      this.toast.error(result.message);
      return;
    }
    await this.requestVerification('phone', normalizeMobile(this.editPhone));
  }

  async verifyEmail() {
    const result = validateEmail(this.editEmail);
    if (!result.valid) {
      this.toast.error(result.message);
      return;
    }
    await this.requestVerification('email', this.editEmail.trim().toLowerCase());
  }

  private async requestVerification(field: 'phone' | 'email', value: string) {
    this.changingField.set(field);
    this.pendingChangeValue = value;
    this.changeCode = '';
    this.changeError.set(null);
    this.changeDevOtp.set(null);
    this.changeSubmitting.set(true);
    try {
      const res =
        field === 'phone' ? await this.auth.requestPhoneChangeOtp(value) : await this.auth.requestEmailChangeOtp(value);
      this.changeDevOtp.set(res.devOtp ?? null);
      this.startChangeCooldown();
    } catch (err: any) {
      this.changeError.set(err?.error?.message ?? 'Could not send code. Try again.');
      this.changingField.set(null);
    } finally {
      this.changeSubmitting.set(false);
    }
  }

  private startChangeCooldown() {
    this.changeResendCooldown.set(30);
    clearInterval(this.changeCooldownHandle);
    this.changeCooldownHandle = setInterval(() => {
      this.changeResendCooldown.update((s) => {
        if (s <= 1) {
          clearInterval(this.changeCooldownHandle);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async resendChangeOtp() {
    const field = this.changingField();
    if (!field || this.changeResendCooldown() > 0) return;
    await this.requestVerification(field, this.pendingChangeValue);
    this.toast.success('New code sent');
  }

  async submitChangeOtp() {
    const field = this.changingField();
    if (!field || this.changeCode.trim().length < 4) return;

    this.changeSubmitting.set(true);
    this.changeError.set(null);
    try {
      if (field === 'phone') {
        const updated = await this.auth.verifyPhoneChangeOtp(this.pendingChangeValue, this.changeCode.trim());
        this.editPhone = updated.phone ?? '';
        this.phoneValid.set(true);
      } else {
        const updated = await this.auth.verifyEmailChangeOtp(this.pendingChangeValue, this.changeCode.trim());
        this.editEmail = updated.email ?? '';
      }
      this.toast.success(field === 'phone' ? 'Phone number verified' : 'Email verified');
      this.changingField.set(null);
      clearInterval(this.changeCooldownHandle);
      this.changeResendCooldown.set(0);
    } catch (err: any) {
      this.changeError.set(err?.error?.message ?? 'Incorrect code');
    } finally {
      this.changeSubmitting.set(false);
    }
  }

  onPhotoPicked(e: { dataUrl: string; file: File }) {
    this.editPhoto = e.dataUrl;
  }

  async saveProfile(e: Event) {
    e.preventDefault();
    this.formSubmitted.set(true);

    const nameResult = validateName(this.editName);
    const dobResult = validateDob(this.editDob);
    const genderResult = validateGender(this.editGender);
    const emailResult = this.editEmail.trim() ? validateEmail(this.editEmail) : { valid: true, message: '' };

    const u = this.auth.currentUser();
    const phonePendingVerification = this.editPhone.trim() !== (u?.phone ?? '');
    const emailPendingVerification = !!this.editEmail.trim() && this.editEmail.trim().toLowerCase() !== (u?.email ?? '');

    if (!nameResult.valid || !dobResult.valid || !genderResult.valid || !emailResult.valid) {
      this.toast.error('Please fix the highlighted fields before saving.');
      return;
    }
    if (phonePendingVerification) {
      this.toast.error('Verify your new mobile number before saving.');
      return;
    }
    if (emailPendingVerification) {
      this.toast.error('Verify your new email address before saving.');
      return;
    }

    this.savingProfile.set(true);
    this.photoProgress.set(0);
    try {
      await this.auth.updateProfile(
        {
          name: normalizeName(this.editName),
          gender: this.editGender || null,
          dob: this.editDob || null,
          photo: this.editPhoto,
        },
        (pct) => this.photoProgress.set(pct)
      );
      this.editingProfile.set(false);
      this.toast.success('Profile updated');
    } catch (err: any) {
      this.photoUpload?.discardPending();
      this.toast.error(err?.error?.message ?? 'Could not update profile');
    } finally {
      this.savingProfile.set(false);
      this.photoProgress.set(null);
    }
  }

  toggleAddressForm() {
    if (this.showForm()) {
      this.showForm.set(false);
      return;
    }
    this.newAddress = { ...EMPTY_ADDRESS_FORM };
    this.addressErrors.set({});
    this.showForm.set(true);
  }

  onZipInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const sanitized = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = sanitized;
    this.newAddress.zip = sanitized;
  }

  private isDuplicateAddress(): boolean {
    const u = this.auth.currentUser();
    if (!u) return false;
    const line1 = this.newAddress.line1.trim().toLowerCase();
    const city = this.newAddress.city.trim().toLowerCase();
    const zip = this.newAddress.zip.trim();
    return u.addresses.some(
      (a) => a.line1.trim().toLowerCase() === line1 && a.city.trim().toLowerCase() === city && (a.zip ?? '').trim() === zip
    );
  }

  async addAddress(e: Event) {
    e.preventDefault();
    const errors: Partial<Record<keyof NewAddressForm, string>> = {};
    if (!this.newAddress.line1.trim()) errors.line1 = 'Address line is required.';
    if (!this.newAddress.landmark.trim()) errors.landmark = 'Landmark is required.';
    if (!this.newAddress.city.trim()) errors.city = 'City is required.';
    if (!this.newAddress.state.trim()) errors.state = 'State is required.';
    if (!/^\d{6}$/.test(this.newAddress.zip.trim())) errors.zip = 'Pincode must be exactly 6 digits.';
    const phoneResult = validateMobile(this.newAddress.phone);
    if (!phoneResult.valid) errors.phone = phoneResult.message;

    this.addressErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      this.toast.error('Please fix the highlighted fields before saving.');
      return;
    }
    if (this.isDuplicateAddress()) {
      this.addressErrors.set({ line1: 'This address already exists in your saved addresses.' });
      this.toast.error('This address already exists in your saved addresses.');
      return;
    }

    this.savingAddress.set(true);
    try {
      await this.auth.addAddress({
        label: this.newAddress.label,
        line1: this.newAddress.line1.trim(),
        landmark: this.newAddress.landmark.trim(),
        area: this.newAddress.area.trim(),
        city: this.newAddress.city.trim(),
        state: this.newAddress.state.trim(),
        zip: this.newAddress.zip.trim(),
        phone: normalizeMobile(this.newAddress.phone),
      } as Address);
      this.newAddress = { ...EMPTY_ADDRESS_FORM };
      this.addressErrors.set({});
      this.showForm.set(false);
      this.toast.success('Address added');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not save address');
    } finally {
      this.savingAddress.set(false);
    }
  }

  async removeAddress(id?: string) {
    if (!id) return;
    await this.auth.removeAddress(id);
    this.toast.success('Address removed');
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/']);
  }
}
