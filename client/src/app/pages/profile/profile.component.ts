import { Component, ElementRef, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Address, Gender, User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';
import { MobileFieldComponent } from '../../shared/components/mobile-field/mobile-field.component';
import { normalizeMobile, validateMobile } from '../../shared/utils/mobile-validation';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, IconComponent, MobileFieldComponent, ImageUploadComponent],
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
                [maxBytes]="2000000"
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
              @if (u.gender) {
                <p class="mt-0.5 text-sm capitalize text-ink-400">{{ u.gender }}</p>
              }
            } @else {
              <form class="space-y-2" (submit)="saveProfile($event)">
                <input [(ngModel)]="editName" name="editName" placeholder="Name" required class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />

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

                <div class="flex items-center gap-2">
                  <input
                    type="email"
                    [(ngModel)]="editEmail"
                    name="editEmail"
                    placeholder="Email address"
                    class="w-full flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400"
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

                @if (changingField(); as field) {
                  <div class="space-y-2 rounded-lg border border-ink-200 bg-ink-50 p-3">
                    <p class="text-xs font-semibold text-ink-600">
                      Enter the code sent to your {{ field === 'phone' ? 'new phone number' : 'new email' }}
                    </p>
                    @if (changeError()) {
                      <p class="rounded-lg bg-ember-50 px-3 py-2 text-xs font-medium text-ember-700">{{ changeError() }}</p>
                    }
                    @if (changeDevOtp()) {
                      <div class="flex items-center gap-3 rounded-xl border border-gold-300 bg-gold-50 px-4 py-3">
                        <app-icon name="lock" [size]="18" class="shrink-0 text-gold-600" />
                        <div>
                          <p class="text-[11px] font-bold uppercase tracking-wide text-gold-700">Demo mode — your OTP</p>
                          <p class="mt-0.5 text-2xl font-extrabold tracking-[0.35em] text-gold-800">{{ changeDevOtp() }}</p>
                        </div>
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
                  </div>
                }

                <select [(ngModel)]="editGender" name="editGender" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400">
                  <option value="">Gender (optional)</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
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
          <button type="button" class="text-sm font-semibold text-ember-600" (click)="showForm.set(!showForm())">
            {{ showForm() ? 'Cancel' : '+ Add address' }}
          </button>
        </div>

        <div class="mt-3 space-y-2">
          @for (addr of u.addresses; track addr._id) {
            <div class="card-surface flex items-start justify-between gap-3 p-3.5">
              <div>
                <p class="text-sm font-semibold text-ink-800">{{ addr.label }} @if (addr.isDefault) { <span class="ml-1 rounded bg-basil-100 px-1.5 py-0.5 text-[10px] font-bold text-basil-600">DEFAULT</span> }</p>
                <p class="text-sm text-ink-500">{{ addr.line1 }}, {{ addr.area }}, {{ addr.city }}</p>
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
              <input [(ngModel)]="newAddress.label" name="label" placeholder="Label (Home, Work)" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
              <input [(ngModel)]="newAddress.city" name="city" placeholder="City" required class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            </div>
            <input [(ngModel)]="newAddress.line1" name="line1" placeholder="Street address" required class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            <input [(ngModel)]="newAddress.area" name="area" placeholder="Area / neighborhood" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            <button type="submit" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white">Save address</button>
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
  showForm = signal(false);
  newAddress: Partial<Address> = { label: 'Home', line1: '', area: '', city: '' };

  editingProfile = signal(false);
  editName = '';
  editPhone = '';
  phoneValid = signal(true);
  editEmail = '';
  editGender: Gender | '' = '';
  editPhoto: string | null = null;
  savingProfile = signal(false);
  photoProgress = signal<number | null>(null);

  @ViewChild('photoUpload') photoUpload?: ImageUploadComponent;

  changingField = signal<'phone' | 'email' | null>(null);
  changeCode = '';
  changeDevOtp = signal<string | null>(null);
  changeSubmitting = signal(false);
  changeError = signal<string | null>(null);
  private pendingChangeValue = '';

  constructor(
    public auth: AuthService,
    public toast: ToastService,
    private router: Router
  ) {}

  initials(name: string): string {
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  startEditProfile(u: User) {
    this.editName = u.name;
    this.editPhone = u.phone ?? '';
    this.phoneValid.set(!!u.phone);
    this.editEmail = u.email ?? '';
    this.editGender = u.gender ?? '';
    this.editPhoto = u.photo;
    this.editingProfile.set(true);
  }

  cancelEditProfile() {
    this.editingProfile.set(false);
  }

  cancelChange() {
    this.changingField.set(null);
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
    const value = this.editEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      this.toast.error('Enter a valid email address');
      return;
    }
    await this.requestVerification('email', value);
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
    } catch (err: any) {
      this.changeError.set(err?.error?.message ?? 'Could not send code. Try again.');
      this.changingField.set(null);
    } finally {
      this.changeSubmitting.set(false);
    }
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
    if (!this.editName.trim()) return;
    this.savingProfile.set(true);
    this.photoProgress.set(0);
    try {
      await this.auth.updateProfile(
        {
          name: this.editName.trim(),
          gender: this.editGender || null,
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

  async addAddress(e: Event) {
    e.preventDefault();
    if (!this.newAddress.line1 || !this.newAddress.city) return;
    await this.auth.addAddress(this.newAddress as Address);
    this.newAddress = { label: 'Home', line1: '', area: '', city: '' };
    this.showForm.set(false);
    this.toast.success('Address added');
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
