import { Component, EventEmitter, Input, Output, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Restaurant } from '../../../core/models/restaurant.model';
import { SellerAccount } from '../../../core/models/role-account.model';
import { SellerAuthService } from '../../../core/services/seller-auth.service';
import { SellerService } from '../../../core/services/seller.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';
import { ImageUploadComponent } from '../image-upload/image-upload.component';
import { MobileFieldComponent } from '../mobile-field/mobile-field.component';
import { validateMobile } from '../../utils/mobile-validation';

interface ProfileForm {
  name: string;
  category: string;
  ownerName: string;
  email: string;
  phone: string;
  line1: string;
  area: string;
  city: string;
  state: string;
  zip: string;
  openingTime: string;
  closingTime: string;
  deliveryRadiusKm: number;
  fssaiNumber: string;
  gstNumber: string;
  logoImage: string;
  coverImage: string;
  isOpen: boolean;
}

@Component({
  selector: 'app-seller-profile-card',
  standalone: true,
  imports: [FormsModule, IconComponent, MobileFieldComponent, ImageUploadComponent],
  template: `
    <div class="seller-profile-card relative overflow-hidden rounded-3xl border border-white/40 bg-white/70 shadow-[0_8px_40px_-8px_rgba(20,10,5,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-ink-800/60">
      <!-- Cover -->
      <div class="relative h-36 w-full overflow-hidden bg-gradient-to-br from-ink-200 to-ink-300 dark:from-ink-700 dark:to-ink-900 sm:h-44">
        @if (!editing()) {
          @if (restaurant.coverImage) {
            <img [src]="restaurant.coverImage" alt="Cover" class="h-full w-full object-cover" />
          } @else {
            <div class="flex h-full w-full items-center justify-center text-ink-400 dark:text-ink-500">
              <app-icon name="image" [size]="28" />
            </div>
          }
          <div class="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/10 to-transparent"></div>
          <div class="absolute right-3 top-3 flex gap-2">
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-bold text-ink-800 shadow backdrop-blur transition hover:bg-white"
              (click)="startEdit()"
            >
              <app-icon name="edit" [size]="13" /> Edit Profile
            </button>
          </div>
        } @else {
          <app-image-upload
            #coverUpload
            shape="banner"
            [maxBytes]="3000000"
            [value]="restaurant.coverImage || null"
            [uploading]="saving()"
            [progress]="coverProgress()"
            (picked)="onCoverPicked($event)"
            (invalidFile)="toast.error($event)"
            label="Change cover photo"
          />
        }
      </div>

      <!-- Logo + identity -->
      <div class="relative px-5 pb-5 sm:px-7">
        <div class="-mt-10 flex items-end gap-4 sm:-mt-12">
          <div class="relative shrink-0">
            @if (!editing()) {
              @if (logoSrc()) {
                <img
                  [src]="logoSrc()"
                  alt="Logo"
                  class="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-lg dark:border-ink-800 sm:h-24 sm:w-24"
                />
              } @else {
                <div class="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-ink-100 text-ink-400 shadow-lg dark:border-ink-800 dark:bg-ink-700 dark:text-ink-500 sm:h-24 sm:w-24">
                  <app-icon name="chef-hat" [size]="26" />
                </div>
              }
            } @else {
              <div class="rounded-2xl border-4 border-white shadow-lg dark:border-ink-800">
                <app-image-upload
                  #logoUpload
                  shape="square"
                  size="md"
                  [maxBytes]="2000000"
                  [value]="restaurant.logoImage || null"
                  [uploading]="saving()"
                  [progress]="logoProgress()"
                  (picked)="onLogoPicked($event)"
                  (invalidFile)="toast.error($event)"
                  label="Logo"
                />
              </div>
            }
          </div>

          <div class="min-w-0 flex-1 pb-1">
            @if (!editing()) {
              <h2 class="truncate font-display text-xl font-extrabold text-ink-900 dark:text-white sm:text-2xl">{{ restaurant.name }}</h2>
              <p class="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{{ restaurant.category || 'Restaurant' }}</p>
            } @else {
              <input [(ngModel)]="form.name" name="name" required placeholder="Restaurant name" class="w-full rounded-lg border border-ink-200 bg-white/90 px-3 py-1.5 text-base font-bold outline-none focus:border-ember-400 dark:border-ink-600 dark:bg-ink-900" />
            }
          </div>

          <div class="hidden shrink-0 items-center gap-2 pb-1 sm:flex">
            @if (!editing()) {
              <span class="rounded-full px-3 py-1 text-xs font-bold" [class.bg-basil-100]="restaurant.isOpen" [class.text-basil-700]="restaurant.isOpen" [class.bg-ink-100]="!restaurant.isOpen" [class.text-ink-500]="!restaurant.isOpen">
                {{ restaurant.isOpen ? 'Open' : 'Closed' }}
              </span>
              <span
                class="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold capitalize"
                [class.bg-basil-100]="restaurant.verificationStatus === 'approved'"
                [class.text-basil-700]="restaurant.verificationStatus === 'approved'"
                [class.bg-gold-100]="restaurant.verificationStatus === 'pending'"
                [class.text-gold-700]="restaurant.verificationStatus === 'pending'"
                [class.bg-ember-100]="restaurant.verificationStatus === 'rejected'"
                [class.text-ember-700]="restaurant.verificationStatus === 'rejected'"
              >
                @if (restaurant.verificationStatus === 'approved') { <app-icon name="shield-check" [size]="12" /> }
                {{ restaurant.verificationStatus === 'approved' ? 'Verified' : restaurant.verificationStatus }}
              </span>
            }
          </div>
        </div>

        @if (editing()) {
          <div class="profile-edit-enter mt-5 space-y-5">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-ink-500">Restaurant category</span>
                <input [(ngModel)]="form.category" name="category" placeholder="e.g. Cafe, Fine Dining" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
              </label>
              <label class="flex items-center justify-between gap-2 rounded-lg border border-ink-200 px-3 py-2.5 dark:border-ink-700">
                <span class="text-sm font-medium text-ink-700 dark:text-ink-200">Open for orders</span>
                <input type="checkbox" [(ngModel)]="form.isOpen" name="isOpen" />
              </label>
            </div>

            <div>
              <p class="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400"><app-icon name="user" [size]="13" /> Owner details</p>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input [(ngModel)]="form.ownerName" name="ownerName" required placeholder="Owner name" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
                <input type="email" [(ngModel)]="form.email" name="email" required placeholder="Email address" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
                <app-mobile-field [value]="form.phone" (valueChange)="form.phone = $event" placeholder="Mobile number" />
              </div>
            </div>

            <div>
              <p class="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400"><app-icon name="map-pin" [size]="13" /> Address</p>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input [(ngModel)]="form.line1" name="line1" required placeholder="Street address" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 sm:col-span-2" />
                <input [(ngModel)]="form.area" name="area" placeholder="Area / locality" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
                <input [(ngModel)]="form.city" name="city" required placeholder="City" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
                <input [(ngModel)]="form.state" name="state" required placeholder="State" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
                <input [(ngModel)]="form.zip" name="zip" required placeholder="Pincode" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
              </div>
            </div>

            <div>
              <p class="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400"><app-icon name="clock" [size]="13" /> Hours &amp; delivery</p>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label class="block">
                  <span class="mb-1 block text-[11px] text-ink-400">Opening hours</span>
                  <input type="time" [(ngModel)]="form.openingTime" name="openingTime" required class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
                </label>
                <label class="block">
                  <span class="mb-1 block text-[11px] text-ink-400">Closing hours</span>
                  <input type="time" [(ngModel)]="form.closingTime" name="closingTime" required class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
                </label>
                <label class="block">
                  <span class="mb-1 block text-[11px] text-ink-400">Delivery radius (km)</span>
                  <input type="number" min="0" [(ngModel)]="form.deliveryRadiusKm" name="deliveryRadiusKm" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
                </label>
              </div>
            </div>

            <div>
              <p class="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400"><app-icon name="receipt" [size]="13" /> Compliance</p>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input [(ngModel)]="form.fssaiNumber" name="fssaiNumber" placeholder="FSSAI license number" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
                <input [(ngModel)]="form.gstNumber" name="gstNumber" placeholder="GST number" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
              </div>
            </div>

            @if (formError()) {
              <p class="rounded-lg bg-ember-50 px-3 py-2 text-sm font-medium text-ember-700 dark:bg-ember-500/10 dark:text-ember-400">{{ formError() }}</p>
            }

            <div class="flex items-center gap-2 border-t border-ink-100 pt-4 dark:border-ink-700">
              <button type="button" [disabled]="saving()" class="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50" (click)="save()">
                {{ saving() ? 'Saving…' : 'Save' }}
              </button>
              <button type="button" [disabled]="saving()" class="rounded-lg border border-ink-200 px-5 py-2.5 text-sm font-bold text-ink-600 hover:bg-ink-50 disabled:opacity-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-700/50" (click)="cancelEdit()">
                Cancel
              </button>
            </div>
          </div>
        } @else {
          <div class="profile-view-enter mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-ink-100/70 pt-4 text-sm dark:border-white/10 sm:grid-cols-2 lg:grid-cols-3">
            <div class="flex items-start gap-2.5">
              <app-icon name="user" [size]="15" class="mt-0.5 shrink-0 text-ink-400" />
              <div class="min-w-0">
                <p class="text-[11px] font-semibold uppercase text-ink-400">Owner</p>
                <p class="truncate font-medium text-ink-800 dark:text-ink-100">{{ owner.name }}</p>
              </div>
            </div>
            <div class="flex items-start gap-2.5">
              <app-icon name="mail" [size]="15" class="mt-0.5 shrink-0 text-ink-400" />
              <div class="min-w-0">
                <p class="text-[11px] font-semibold uppercase text-ink-400">Email</p>
                <p class="truncate font-medium text-ink-800 dark:text-ink-100">{{ owner.email }}</p>
              </div>
            </div>
            <div class="flex items-start gap-2.5">
              <app-icon name="phone" [size]="15" class="mt-0.5 shrink-0 text-ink-400" />
              <div class="min-w-0">
                <p class="text-[11px] font-semibold uppercase text-ink-400">Mobile</p>
                <p class="truncate font-medium text-ink-800 dark:text-ink-100">{{ owner.phone }}</p>
              </div>
            </div>
            <div class="flex items-start gap-2.5 sm:col-span-2 lg:col-span-1">
              <app-icon name="map-pin" [size]="15" class="mt-0.5 shrink-0 text-ink-400" />
              <div class="min-w-0">
                <p class="text-[11px] font-semibold uppercase text-ink-400">Address</p>
                <p class="font-medium text-ink-800 dark:text-ink-100">{{ fullAddress() }}</p>
              </div>
            </div>
            <div class="flex items-start gap-2.5">
              <app-icon name="clock" [size]="15" class="mt-0.5 shrink-0 text-ink-400" />
              <div class="min-w-0">
                <p class="text-[11px] font-semibold uppercase text-ink-400">Hours</p>
                <p class="font-medium text-ink-800 dark:text-ink-100">{{ restaurant.openingTime || '—' }} – {{ restaurant.closingTime || '—' }}</p>
              </div>
            </div>
            <div class="flex items-start gap-2.5">
              <app-icon name="compass" [size]="15" class="mt-0.5 shrink-0 text-ink-400" />
              <div class="min-w-0">
                <p class="text-[11px] font-semibold uppercase text-ink-400">Delivery radius</p>
                <p class="font-medium text-ink-800 dark:text-ink-100">{{ restaurant.deliveryRadiusKm ?? '—' }} km</p>
              </div>
            </div>
            <div class="flex items-start gap-2.5">
              <app-icon name="receipt" [size]="15" class="mt-0.5 shrink-0 text-ink-400" />
              <div class="min-w-0">
                <p class="text-[11px] font-semibold uppercase text-ink-400">FSSAI license</p>
                <p class="font-medium text-ink-800 dark:text-ink-100">{{ restaurant.fssaiNumber || '—' }}</p>
              </div>
            </div>
            <div class="flex items-start gap-2.5">
              <app-icon name="receipt" [size]="15" class="mt-0.5 shrink-0 text-ink-400" />
              <div class="min-w-0">
                <p class="text-[11px] font-semibold uppercase text-ink-400">GST number</p>
                <p class="font-medium text-ink-800 dark:text-ink-100">{{ restaurant.gstNumber || '—' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 sm:hidden">
              <span class="rounded-full px-3 py-1 text-xs font-bold" [class.bg-basil-100]="restaurant.isOpen" [class.text-basil-700]="restaurant.isOpen" [class.bg-ink-100]="!restaurant.isOpen" [class.text-ink-500]="!restaurant.isOpen">
                {{ restaurant.isOpen ? 'Open' : 'Closed' }}
              </span>
              <span
                class="rounded-full px-3 py-1 text-xs font-bold capitalize"
                [class.bg-basil-100]="restaurant.verificationStatus === 'approved'"
                [class.text-basil-700]="restaurant.verificationStatus === 'approved'"
                [class.bg-gold-100]="restaurant.verificationStatus === 'pending'"
                [class.text-gold-700]="restaurant.verificationStatus === 'pending'"
                [class.bg-ember-100]="restaurant.verificationStatus === 'rejected'"
                [class.text-ember-700]="restaurant.verificationStatus === 'rejected'"
              >
                {{ restaurant.verificationStatus === 'approved' ? 'Verified' : restaurant.verificationStatus }}
              </span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes profileFadeSlide {
        from {
          opacity: 0;
          transform: translateY(-6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .profile-edit-enter,
      .profile-view-enter {
        animation: profileFadeSlide 0.22s ease-out;
      }
      .seller-profile-card {
        transition:
          box-shadow 0.25s ease,
          transform 0.25s ease;
      }
    `,
  ],
})
export class SellerProfileCardComponent {
  @Input({ required: true }) restaurant!: Restaurant;
  @Input({ required: true }) owner!: SellerAccount;
  @Output() restaurantChange = new EventEmitter<Restaurant>();

  editing = signal(false);
  saving = signal(false);
  formError = signal<string | null>(null);
  coverProgress = signal<number | null>(null);
  logoProgress = signal<number | null>(null);

  @ViewChild('coverUpload') coverUpload?: ImageUploadComponent;
  @ViewChild('logoUpload') logoUpload?: ImageUploadComponent;

  form: ProfileForm = this.blankForm();

  constructor(
    private sellerAuth: SellerAuthService,
    private sellerService: SellerService,
    public toast: ToastService
  ) {}

  private blankForm(): ProfileForm {
    return {
      name: '',
      category: '',
      ownerName: '',
      email: '',
      phone: '',
      line1: '',
      area: '',
      city: '',
      state: '',
      zip: '',
      openingTime: '09:00',
      closingTime: '22:00',
      deliveryRadiusKm: 5,
      fssaiNumber: '',
      gstNumber: '',
      logoImage: '',
      coverImage: '',
      isOpen: true,
    };
  }

  fullAddress(): string {
    const a = this.restaurant.address;
    return [a.line1, a.area, a.city, a.state, a.zip].filter(Boolean).join(', ') || '—';
  }

  coverSrc(): string {
    return this.editing() ? this.form.coverImage : this.restaurant.coverImage;
  }

  logoSrc(): string {
    const logo = this.editing() ? this.form.logoImage : this.restaurant.logoImage;
    return logo || this.coverSrc();
  }

  startEdit() {
    const r = this.restaurant;
    this.form = {
      name: r.name,
      category: r.category ?? '',
      ownerName: this.owner.name,
      email: this.owner.email,
      phone: this.owner.phone,
      line1: r.address.line1 ?? '',
      area: r.address.area ?? '',
      city: r.address.city ?? '',
      state: r.address.state ?? '',
      zip: r.address.zip ?? '',
      openingTime: r.openingTime ?? '09:00',
      closingTime: r.closingTime ?? '22:00',
      deliveryRadiusKm: r.deliveryRadiusKm ?? 5,
      fssaiNumber: r.fssaiNumber ?? '',
      gstNumber: r.gstNumber ?? '',
      logoImage: r.logoImage ?? '',
      coverImage: r.coverImage,
      isOpen: r.isOpen,
    };
    this.formError.set(null);
    this.editing.set(true);
  }

  cancelEdit() {
    this.editing.set(false);
    this.formError.set(null);
  }

  onLogoPicked(e: { dataUrl: string; file: File }) {
    this.form.logoImage = e.dataUrl;
  }

  onCoverPicked(e: { dataUrl: string; file: File }) {
    this.form.coverImage = e.dataUrl;
  }

  private validate(): string | null {
    const f = this.form;
    if (!f.name.trim()) return 'Restaurant name is required';
    if (!f.ownerName.trim()) return 'Owner name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return 'Enter a valid email address';
    const phoneResult = validateMobile(f.phone);
    if (!phoneResult.valid) return phoneResult.message;
    if (!f.line1.trim()) return 'Street address is required';
    if (!f.city.trim()) return 'City is required';
    if (!f.state.trim()) return 'State is required';
    if (!f.zip.trim()) return 'Pincode is required';
    if (!f.openingTime || !f.closingTime) return 'Opening and closing hours are required';
    return null;
  }

  async save() {
    const error = this.validate();
    if (error) {
      this.formError.set(error);
      return;
    }
    this.formError.set(null);
    this.saving.set(true);
    this.coverProgress.set(0);
    this.logoProgress.set(0);
    try {
      const [restaurantRes] = await Promise.all([
        this.sellerService.updateRestaurant(
          {
            name: this.form.name.trim(),
            category: this.form.category.trim(),
            logoImage: this.form.logoImage,
            coverImage: this.form.coverImage,
            address: {
              line1: this.form.line1.trim(),
              area: this.form.area.trim(),
              city: this.form.city.trim(),
              state: this.form.state.trim(),
              zip: this.form.zip.trim(),
            } as any,
            openingTime: this.form.openingTime,
            closingTime: this.form.closingTime,
            deliveryRadiusKm: this.form.deliveryRadiusKm,
            fssaiNumber: this.form.fssaiNumber.trim(),
            gstNumber: this.form.gstNumber.trim(),
            isOpen: this.form.isOpen,
          },
          (pct) => {
            this.coverProgress.set(pct);
            this.logoProgress.set(pct);
          }
        ),
        this.sellerAuth.updateMyProfile({
          name: this.form.ownerName.trim(),
          email: this.form.email.trim(),
          phone: this.form.phone.trim(),
        }),
      ]);
      this.restaurantChange.emit(restaurantRes.restaurant);
      this.editing.set(false);
      this.toast.success('Profile updated successfully');
    } catch (err: any) {
      this.coverUpload?.discardPending();
      this.logoUpload?.discardPending();
      this.toast.error(err?.error?.message ?? 'Could not update profile');
    } finally {
      this.saving.set(false);
      this.coverProgress.set(null);
      this.logoProgress.set(null);
    }
  }
}
