import { Component, OnInit, QueryList, ViewChild, ViewChildren, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { DeliveryNavComponent } from '../../../shared/components/delivery-shell/delivery-nav.component';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';
import { MobileFieldComponent } from '../../../shared/components/mobile-field/mobile-field.component';

type Tab = 'profile' | 'documents' | 'bank' | 'security';

const DOC_LABELS: Record<string, string> = { license: 'Driving license', aadhaar: 'Aadhaar card', pan: 'PAN card', rc: 'Vehicle RC' };

@Component({
  selector: 'app-delivery-profile',
  standalone: true,
  imports: [FormsModule, DeliveryNavComponent, MobileFieldComponent, ImageUploadComponent],
  template: `
    <app-delivery-nav />
    <div class="container-shell max-w-xl py-8">
      <h1 class="font-display text-2xl font-bold text-ink-900">Your Profile</h1>

      @if (auth.currentUser(); as partner) {
        <div class="mt-4 flex gap-1.5">
          @for (t of tabs; track t.id) {
            <button
              type="button"
              class="rounded-full border px-3 py-1.5 text-xs font-bold"
              [class.border-ember-500]="tab() === t.id"
              [class.text-ember-600]="tab() === t.id"
              [class.bg-ember-50]="tab() === t.id"
              [class.border-ink-200]="tab() !== t.id"
              [class.text-ink-500]="tab() !== t.id"
              (click)="tab.set(t.id)"
            >
              {{ t.label }}
            </button>
          }
        </div>

        @if (tab() === 'profile') {
          <div class="card-surface mt-4 space-y-3 p-5">
            <app-image-upload
              #photoUpload
              shape="circle"
              size="sm"
              [maxBytes]="2000000"
              [value]="auth.currentUser()?.photo || null"
              [uploading]="saving()"
              [progress]="photoProgress()"
              (picked)="onPhotoPicked($event)"
              (invalidFile)="toast.error($event)"
              label=""
            />

            <label class="block text-xs font-semibold text-ink-500">Full name
              <input [(ngModel)]="form.name" name="name" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            </label>
            <p class="text-xs font-semibold text-ink-500">Email <span class="ml-1 font-normal text-ink-400">{{ partner.email }} (cannot be changed)</span></p>
            <label class="block text-xs font-semibold text-ink-500">Mobile number
              <div class="mt-1">
                <app-mobile-field [value]="form.phone" (valueChange)="form.phone = $event" (validityChange)="phoneValid.set($event)" placeholder="Mobile number" />
              </div>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label class="block text-xs font-semibold text-ink-500">Vehicle type
                <select [(ngModel)]="form.vehicleType" name="vehicleType" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none">
                  <option value="bike">Motorbike</option>
                  <option value="scooter">Scooter</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="car">Car</option>
                </select>
              </label>
              <label class="block text-xs font-semibold text-ink-500">Vehicle number
                <input [(ngModel)]="form.vehicleNumber" name="vehicleNumber" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
              </label>
            </div>

            <p class="text-xs font-bold uppercase tracking-wide text-ink-400">Emergency contact</p>
            <div class="grid grid-cols-2 gap-2">
              <input [(ngModel)]="form.emergencyContact.name" name="emName" placeholder="Contact name" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
              <app-mobile-field [value]="form.emergencyContact.phone" (valueChange)="form.emergencyContact.phone = $event" placeholder="Contact phone" />
            </div>

            <button type="button" [disabled]="saving() || !phoneValid()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" (click)="saveProfile()">
              {{ saving() ? 'Saving…' : 'Save changes' }}
            </button>
          </div>
        }

        @if (tab() === 'documents') {
          <div class="card-surface mt-4 space-y-3 p-5">
            <p class="text-xs text-ink-400">Upload clear photos of your documents for admin verification.</p>
            @for (key of docKeys; track key; let i = $index) {
              <div class="flex items-center gap-3 rounded-lg border border-dashed border-ink-200 p-3">
                <app-image-upload
                  #docUpload
                  shape="square"
                  size="sm"
                  [maxBytes]="3000000"
                  [value]="auth.currentUser()?.documents?.[key] || null"
                  [uploading]="saving()"
                  [progress]="docsProgress()"
                  (picked)="onDocPicked($event, key)"
                  (invalidFile)="toast.error($event)"
                  label=""
                />
                <span class="text-sm font-semibold text-ink-700">{{ docLabel(key) }}</span>
              </div>
            }
            <button type="button" [disabled]="saving()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" (click)="saveDocuments()">
              {{ saving() ? 'Saving…' : 'Save documents' }}
            </button>
          </div>
        }

        @if (tab() === 'bank') {
          <div class="card-surface mt-4 space-y-3 p-5">
            <input [(ngModel)]="form.bankDetails.accountHolder" name="accountHolder" placeholder="Account holder name" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            <input [(ngModel)]="form.bankDetails.accountNumber" name="accountNumber" placeholder="Account number" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            <input [(ngModel)]="form.bankDetails.ifsc" name="ifsc" placeholder="IFSC code" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            <input [(ngModel)]="form.bankDetails.upiId" name="upiId" placeholder="UPI ID" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            <button type="button" [disabled]="saving()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" (click)="saveProfile()">
              {{ saving() ? 'Saving…' : 'Save bank details' }}
            </button>
          </div>
        }

        @if (tab() === 'security') {
          <div class="card-surface mt-4 space-y-3 p-5">
            <p class="text-xs font-bold uppercase tracking-wide text-ink-400">Change password</p>
            <input type="password" [(ngModel)]="currentPassword" name="currentPassword" placeholder="Current password" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            <input type="password" [(ngModel)]="newPassword" name="newPassword" placeholder="New password (min 6 characters)" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            <button type="button" [disabled]="saving() || !currentPassword || newPassword.length < 6" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" (click)="changePassword()">
              {{ saving() ? 'Updating…' : 'Update password' }}
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class DeliveryProfileComponent implements OnInit {
  tab = signal<Tab>('profile');
  tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'documents', label: 'Documents' },
    { id: 'bank', label: 'Bank & UPI' },
    { id: 'security', label: 'Security' },
  ];
  docKeys = ['license', 'aadhaar', 'pan', 'rc'] as const;

  form = {
    name: '',
    phone: '',
    photo: '',
    vehicleType: 'bike',
    vehicleNumber: '',
    bankDetails: { accountHolder: '', accountNumber: '', ifsc: '', upiId: '' },
    emergencyContact: { name: '', phone: '' },
  };
  docForm: Record<string, string> = { license: '', aadhaar: '', pan: '', rc: '' };

  currentPassword = '';
  newPassword = '';
  saving = signal(false);
  phoneValid = signal(true);
  photoProgress = signal<number | null>(null);
  docsProgress = signal<number | null>(null);

  @ViewChild('photoUpload') photoUpload?: ImageUploadComponent;
  @ViewChildren('docUpload') docUploads!: QueryList<ImageUploadComponent>;

  constructor(
    public auth: DeliveryAuthService,
    public toast: ToastService
  ) {}

  ngOnInit() {
    const partner = this.auth.currentUser();
    if (!partner) return;
    this.form = {
      name: partner.name,
      phone: partner.phone,
      photo: partner.photo,
      vehicleType: partner.vehicleType,
      vehicleNumber: partner.vehicleNumber,
      bankDetails: { ...partner.bankDetails },
      emergencyContact: { ...partner.emergencyContact },
    };
    this.docForm = { ...partner.documents };
  }

  docLabel(key: string): string {
    return DOC_LABELS[key] ?? key;
  }

  onPhotoPicked(e: { dataUrl: string; file: File }) {
    this.form.photo = e.dataUrl;
  }

  onDocPicked(e: { dataUrl: string; file: File }, key: string) {
    this.docForm[key] = e.dataUrl;
  }

  async saveProfile() {
    this.saving.set(true);
    this.photoProgress.set(0);
    try {
      await this.auth.updateProfile(this.form as any, (pct) => this.photoProgress.set(pct));
      this.toast.success('Profile updated');
    } catch (err: any) {
      this.photoUpload?.discardPending();
      this.toast.error(err?.error?.message ?? 'Could not update profile');
    } finally {
      this.saving.set(false);
      this.photoProgress.set(null);
    }
  }

  async saveDocuments() {
    this.saving.set(true);
    this.docsProgress.set(0);
    try {
      await this.auth.updateDocuments(this.docForm as any, (pct) => this.docsProgress.set(pct));
      this.toast.success('Documents saved — awaiting verification');
    } catch (err: any) {
      this.docUploads.forEach((u) => u.discardPending());
      this.toast.error(err?.error?.message ?? 'Could not save documents');
    } finally {
      this.saving.set(false);
      this.docsProgress.set(null);
    }
  }

  async changePassword() {
    this.saving.set(true);
    try {
      await this.auth.changePassword(this.currentPassword, this.newPassword);
      this.toast.success('Password updated');
      this.currentPassword = '';
      this.newPassword = '';
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update password');
    } finally {
      this.saving.set(false);
    }
  }
}
