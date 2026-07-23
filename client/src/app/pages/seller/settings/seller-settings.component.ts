import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SellerAuthService } from '../../../core/services/seller-auth.service';
import { SellerService } from '../../../core/services/seller.service';
import { ToastService } from '../../../core/services/toast.service';
import { Restaurant } from '../../../core/models/restaurant.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SellerShellComponent } from '../../../shared/components/seller-shell/seller-shell.component';
import { validateImageFile, readImageFileAsDataUrl } from '../../../shared/utils/image-file';

type Tab = 'profile' | 'hours' | 'bank' | 'notifications' | 'security';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface SettingsForm {
  name: string;
  isOpen: boolean;
  description: string;
  cuisines: string;
  coverImage: string;
  images: string[];
  deliveryFee: number;
  minOrder: number;
  deliveryRadiusKm: number;
  offer: string;
  socialLinks: { instagram: string; facebook: string; x: string; website: string };
  businessHours: { day: number; open: string; close: string; closed: boolean }[];
  holidays: { date: string; reason: string }[];
  gstNumber: string;
  bankDetails: { accountHolder: string; accountNumber: string; ifsc: string; bankName: string };
  notificationPrefs: { newOrder: boolean; cancelledOrder: boolean; payment: boolean; lowStock: boolean };
}

function defaultBusinessHours() {
  return Array.from({ length: 7 }, (_, day) => ({ day, open: '09:00', close: '22:00', closed: false }));
}

@Component({
  selector: 'app-seller-settings',
  standalone: true,
  imports: [FormsModule, IconComponent, SellerShellComponent],
  template: `
    <app-seller-shell title="Settings">
      @if (restaurant(); as r) {
        <div class="flex flex-wrap gap-1.5 border-b border-ink-100 pb-3 dark:border-ink-700">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              class="rounded-lg px-3.5 py-2 text-sm font-semibold"
              [class.bg-ink-900]="activeTab() === tab.id"
              [class.text-white]="activeTab() === tab.id"
              [class.text-ink-600]="activeTab() !== tab.id"
              (click)="activeTab.set(tab.id)"
            >
              {{ tab.label }}
            </button>
          }
        </div>

        <div class="card-surface mt-4 max-w-2xl p-5">
          @if (activeTab() === 'profile') {
            <form class="space-y-3" (submit)="onSaveProfile($event)">
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-ink-500">Restaurant name</span>
                <input [(ngModel)]="form.name" name="name" required placeholder="Restaurant name" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
              </label>

              <label class="flex items-center justify-between gap-2 rounded-lg border border-ink-200 px-3 py-2.5 dark:border-ink-700">
                <span class="text-sm font-medium text-ink-700 dark:text-ink-200">Restaurant open for orders</span>
                <input type="checkbox" [(ngModel)]="form.isOpen" name="isOpen" />
              </label>

              <div>
                <p class="mb-1 text-xs font-semibold text-ink-500">Cover image</p>
                <div class="flex items-center gap-3">
                  @if (form.coverImage) {
                    <img [src]="form.coverImage" alt="Cover" class="h-16 w-24 rounded-lg object-cover" />
                  }
                  <label class="flex-1 cursor-pointer rounded-lg border border-dashed border-ink-200 px-3 py-2 text-center text-sm text-ink-500 hover:border-ember-400 dark:border-ink-700">
                    {{ form.coverImage ? 'Change cover' : 'Upload cover image' }}
                    <input type="file" accept="image/*" class="hidden" (change)="onCoverSelected($event)" />
                  </label>
                </div>
              </div>

              <div>
                <p class="mb-1 text-xs font-semibold text-ink-500">Gallery</p>
                <div class="flex flex-wrap items-center gap-2">
                  @for (img of form.images; track $index) {
                    <div class="relative">
                      <img [src]="img" alt="Gallery" class="h-14 w-14 rounded-lg object-cover" />
                      <button type="button" class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-white" (click)="form.images.splice($index, 1)">
                        <app-icon name="x" [size]="10" />
                      </button>
                    </div>
                  }
                  <label class="flex h-14 w-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-ink-200 text-ink-400 hover:border-ember-400 dark:border-ink-700">
                    <app-icon name="camera" [size]="16" />
                    <input type="file" accept="image/*" multiple class="hidden" (change)="onGallerySelected($event)" />
                  </label>
                </div>
              </div>

              <textarea [(ngModel)]="form.description" name="description" rows="2" placeholder="Restaurant description" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900"></textarea>
              <input [(ngModel)]="form.cuisines" name="cuisines" placeholder="Cuisines (comma separated)" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />

              <div class="grid grid-cols-3 gap-3">
                <input type="number" [(ngModel)]="form.deliveryFee" name="deliveryFee" placeholder="Delivery fee" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
                <input type="number" [(ngModel)]="form.minOrder" name="minOrder" placeholder="Minimum order" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
                <input type="number" [(ngModel)]="form.deliveryRadiusKm" name="deliveryRadiusKm" placeholder="Delivery radius (km)" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
              </div>

              <input [(ngModel)]="form.offer" name="offer" placeholder="Current offer text (optional)" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />

              <div>
                <p class="mb-1 text-xs font-semibold text-ink-500">Social links</p>
                <div class="grid grid-cols-2 gap-2">
                  <input [(ngModel)]="form.socialLinks.instagram" name="instagram" placeholder="Instagram URL" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
                  <input [(ngModel)]="form.socialLinks.facebook" name="facebook" placeholder="Facebook URL" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
                  <input [(ngModel)]="form.socialLinks.x" name="x" placeholder="X / Twitter URL" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
                  <input [(ngModel)]="form.socialLinks.website" name="website" placeholder="Website URL" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
                </div>
              </div>

              <button type="submit" [disabled]="submitting()" class="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {{ submitting() ? 'Saving…' : 'Save profile' }}
              </button>
            </form>
          }

          @if (activeTab() === 'hours') {
            <div class="space-y-4">
              <div>
                <h3 class="font-display text-sm font-bold text-ink-900 dark:text-white">Business hours</h3>
                <div class="mt-2 space-y-1.5">
                  @for (row of form.businessHours; track row.day) {
                    <div class="flex items-center gap-2 text-sm">
                      <span class="w-24 shrink-0 text-ink-600 dark:text-ink-300">{{ dayName(row.day) }}</span>
                      <input type="time" [(ngModel)]="row.open" [name]="'open' + row.day" [disabled]="row.closed" class="rounded-lg border border-ink-200 px-2 py-1.5 text-sm disabled:opacity-40 dark:border-ink-700 dark:bg-ink-900" />
                      <span class="text-ink-400">to</span>
                      <input type="time" [(ngModel)]="row.close" [name]="'close' + row.day" [disabled]="row.closed" class="rounded-lg border border-ink-200 px-2 py-1.5 text-sm disabled:opacity-40 dark:border-ink-700 dark:bg-ink-900" />
                      <label class="ml-auto flex items-center gap-1.5 text-xs text-ink-500">
                        <input type="checkbox" [(ngModel)]="row.closed" [name]="'closed' + row.day" /> Closed
                      </label>
                    </div>
                  }
                </div>
                <button type="button" class="mt-3 rounded-lg bg-ink-900 px-4 py-2 text-sm font-bold text-white" (click)="saveHours()">Save hours</button>
              </div>

              <div class="border-t border-ink-100 pt-4 dark:border-ink-700">
                <h3 class="font-display text-sm font-bold text-ink-900 dark:text-white">Holidays</h3>
                <div class="mt-2 space-y-1.5">
                  @for (h of form.holidays; track $index) {
                    <div class="flex items-center gap-2 text-sm">
                      <span class="text-ink-700 dark:text-ink-200">{{ h.date }}</span>
                      <span class="text-ink-400">— {{ h.reason || 'Holiday' }}</span>
                      <button type="button" class="ml-auto text-ink-300 hover:text-ember-600" (click)="removeHoliday($index)"><app-icon name="trash" [size]="14" /></button>
                    </div>
                  } @empty {
                    <p class="text-sm text-ink-400">No holidays scheduled.</p>
                  }
                </div>
                <div class="mt-2 flex gap-2">
                  <input type="date" [(ngModel)]="newHoliday.date" name="holidayDate" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
                  <input [(ngModel)]="newHoliday.reason" name="holidayReason" placeholder="Reason" class="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
                  <button type="button" class="rounded-lg border border-ink-200 px-3 py-2 text-sm font-bold dark:border-ink-700" (click)="addHoliday()">Add</button>
                </div>
              </div>
            </div>
          }

          @if (activeTab() === 'bank') {
            <form class="space-y-3" (submit)="onSaveBank($event)">
              <input [(ngModel)]="form.gstNumber" name="gstNumber" placeholder="GST number" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
              <input [(ngModel)]="form.bankDetails.accountHolder" name="accountHolder" placeholder="Account holder name" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
              <input [(ngModel)]="form.bankDetails.accountNumber" name="accountNumber" placeholder="Account number" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
              <div class="grid grid-cols-2 gap-2">
                <input [(ngModel)]="form.bankDetails.ifsc" name="ifsc" placeholder="IFSC code" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
                <input [(ngModel)]="form.bankDetails.bankName" name="bankName" placeholder="Bank name" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
              </div>
              <button type="submit" [disabled]="submitting()" class="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {{ submitting() ? 'Saving…' : 'Save bank details' }}
              </button>
            </form>
          }

          @if (activeTab() === 'notifications') {
            <div class="space-y-2">
              <label class="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2.5 text-sm dark:border-ink-700">
                New orders <input type="checkbox" [(ngModel)]="form.notificationPrefs.newOrder" name="prefNewOrder" (change)="onSaveNotificationPrefs()" />
              </label>
              <label class="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2.5 text-sm dark:border-ink-700">
                Cancelled orders <input type="checkbox" [(ngModel)]="form.notificationPrefs.cancelledOrder" name="prefCancelled" (change)="onSaveNotificationPrefs()" />
              </label>
              <label class="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2.5 text-sm dark:border-ink-700">
                Payment notifications <input type="checkbox" [(ngModel)]="form.notificationPrefs.payment" name="prefPayment" (change)="onSaveNotificationPrefs()" />
              </label>
              <label class="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2.5 text-sm dark:border-ink-700">
                Low stock alerts <input type="checkbox" [(ngModel)]="form.notificationPrefs.lowStock" name="prefLowStock" (change)="onSaveNotificationPrefs()" />
              </label>
            </div>
          }

          @if (activeTab() === 'security') {
            <form class="max-w-sm space-y-3" (submit)="onChangePassword($event)">
              <input type="password" [(ngModel)]="passwordForm.currentPassword" name="currentPassword" required placeholder="Current password" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
              <input type="password" [(ngModel)]="passwordForm.newPassword" name="newPassword" required placeholder="New password (min 6 characters)" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
              <button type="submit" [disabled]="submitting()" class="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {{ submitting() ? 'Updating…' : 'Change password' }}
              </button>
            </form>
          }
        </div>
      } @else {
        <p class="mt-6 text-sm text-ink-400">Register a restaurant from the Dashboard first.</p>
      }
    </app-seller-shell>
  `,
})
export class SellerSettingsComponent implements OnInit {
  restaurant = signal<Restaurant | null>(null);
  submitting = signal(false);
  activeTab = signal<Tab>('profile');
  tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'hours', label: 'Hours & Holidays' },
    { id: 'bank', label: 'Bank & GST' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
  ];

  form: SettingsForm = {
    name: '',
    isOpen: false,
    description: '',
    cuisines: '',
    coverImage: '',
    images: [],
    deliveryFee: 0,
    minOrder: 0,
    deliveryRadiusKm: 5,
    offer: '',
    socialLinks: { instagram: '', facebook: '', x: '', website: '' },
    businessHours: defaultBusinessHours(),
    holidays: [],
    gstNumber: '',
    bankDetails: { accountHolder: '', accountNumber: '', ifsc: '', bankName: '' },
    notificationPrefs: { newOrder: true, cancelledOrder: true, payment: true, lowStock: true },
  };

  newHoliday = { date: '', reason: '' };
  passwordForm = { currentPassword: '', newPassword: '' };

  constructor(
    private auth: SellerAuthService,
    private sellerService: SellerService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    const res = await this.auth.getMyRestaurant();
    this.restaurant.set(res.restaurant);
    if (res.restaurant) this.hydrateForm(res.restaurant);
  }

  private hydrateForm(r: Restaurant) {
    this.form = {
      name: r.name,
      isOpen: r.isOpen,
      description: r.description,
      cuisines: r.cuisines.join(', '),
      coverImage: r.coverImage,
      images: r.images ?? [],
      deliveryFee: r.deliveryFee,
      minOrder: r.minOrder,
      deliveryRadiusKm: r.deliveryRadiusKm ?? 5,
      offer: r.offer,
      socialLinks: r.socialLinks ?? { instagram: '', facebook: '', x: '', website: '' },
      businessHours: r.businessHours?.length ? r.businessHours : defaultBusinessHours(),
      holidays: (r.holidays ?? []).map((h) => ({ date: h.date.slice(0, 10), reason: h.reason })),
      gstNumber: r.gstNumber ?? '',
      bankDetails: r.bankDetails ?? { accountHolder: '', accountNumber: '', ifsc: '', bankName: '' },
      notificationPrefs: r.notificationPrefs ?? { newOrder: true, cancelledOrder: true, payment: true, lowStock: true },
    };
  }

  dayName(day: number): string {
    return DAY_NAMES[day];
  }

  async onCoverSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const error = validateImageFile(file, 3_000_000);
    if (error) {
      this.toast.error(error);
      return;
    }
    this.form.coverImage = await readImageFileAsDataUrl(file);
  }

  async onGallerySelected(e: Event) {
    const input = e.target as HTMLInputElement;
    for (const file of Array.from(input.files ?? [])) {
      const error = validateImageFile(file, 2_000_000);
      if (error) {
        this.toast.error(error);
        continue;
      }
      this.form.images.push(await readImageFileAsDataUrl(file));
    }
    input.value = '';
  }

  async onSaveProfile(e: Event) {
    e.preventDefault();
    this.submitting.set(true);
    try {
      const res = await this.sellerService.updateRestaurant({
        name: this.form.name.trim(),
        isOpen: this.form.isOpen,
        description: this.form.description,
        cuisines: this.form.cuisines.split(',').map((c) => c.trim()).filter(Boolean),
        coverImage: this.form.coverImage,
        images: this.form.images,
        deliveryFee: this.form.deliveryFee,
        minOrder: this.form.minOrder,
        deliveryRadiusKm: this.form.deliveryRadiusKm,
        offer: this.form.offer,
        socialLinks: this.form.socialLinks,
      });
      this.restaurant.set(res.restaurant);
      this.toast.success('Profile saved');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not save profile');
    } finally {
      this.submitting.set(false);
    }
  }

  async saveHours() {
    this.submitting.set(true);
    try {
      const res = await this.sellerService.updateRestaurant({ businessHours: this.form.businessHours });
      this.restaurant.set(res.restaurant);
      this.toast.success('Hours saved');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not save hours');
    } finally {
      this.submitting.set(false);
    }
  }

  addHoliday() {
    if (!this.newHoliday.date) return;
    this.form.holidays.push({ ...this.newHoliday });
    this.newHoliday = { date: '', reason: '' };
    this.saveHolidays();
  }

  removeHoliday(index: number) {
    this.form.holidays.splice(index, 1);
    this.saveHolidays();
  }

  private async saveHolidays() {
    try {
      const res = await this.sellerService.updateRestaurant({ holidays: this.form.holidays as any });
      this.restaurant.set(res.restaurant);
      this.toast.success('Holidays updated');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update holidays');
    }
  }

  async onSaveBank(e: Event) {
    e.preventDefault();
    this.submitting.set(true);
    try {
      const res = await this.sellerService.updateRestaurant({ gstNumber: this.form.gstNumber, bankDetails: this.form.bankDetails });
      this.restaurant.set(res.restaurant);
      this.toast.success('Bank details saved');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not save bank details');
    } finally {
      this.submitting.set(false);
    }
  }

  async onSaveNotificationPrefs() {
    try {
      const res = await this.sellerService.updateRestaurant({ notificationPrefs: this.form.notificationPrefs });
      this.restaurant.set(res.restaurant);
      this.toast.success('Notification preferences saved');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not save preferences');
    }
  }

  async onChangePassword(e: Event) {
    e.preventDefault();
    if (this.passwordForm.newPassword.length < 6) {
      this.toast.error('New password must be at least 6 characters');
      return;
    }
    this.submitting.set(true);
    try {
      await this.sellerService.changePassword(this.passwordForm.currentPassword, this.passwordForm.newPassword);
      this.toast.success('Password updated');
      this.passwordForm = { currentPassword: '', newPassword: '' };
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not change password');
    } finally {
      this.submitting.set(false);
    }
  }
}
