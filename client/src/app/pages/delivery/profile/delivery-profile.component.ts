import { DecimalPipe, DatePipe } from '@angular/common';
import { Component, OnInit, QueryList, ViewChild, ViewChildren, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import { DeliveryDashboardStats, DeliveryEarningsSummary, DeliveryService } from '../../../core/services/delivery.service';
import { ToastService } from '../../../core/services/toast.service';
import { DeliveryShellComponent } from '../../../shared/components/delivery-shell/delivery-shell.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

type Tab = 'profile' | 'documents' | 'bank';

const DOC_LABELS: Record<string, string> = {
  license: 'Driving license',
  aadhaar: 'Aadhaar card',
  pan: 'PAN card',
  rc: 'Vehicle RC',
  insurance: 'Vehicle insurance',
};

function maskTail(value: string, visible = 4): string {
  if (!value) return '—';
  if (value.length <= visible) return value;
  return `${'•'.repeat(value.length - visible)}${value.slice(-visible)}`;
}

@Component({
  selector: 'app-delivery-profile',
  standalone: true,
  imports: [FormsModule, RouterLink, DeliveryShellComponent, IconComponent, ImageUploadComponent, InrPipe, DecimalPipe, DatePipe],
  template: `
    <app-delivery-shell title="Profile">
    <div>
      <h1 class="font-display text-2xl font-bold text-ink-900 dark:text-white">Your Profile</h1>

      @if (auth.currentUser(); as partner) {
        <!-- Overview -->
        <div class="mt-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-4">
          <div class="card-surface p-5 text-center lg:col-span-1">
            @if (partner.photo) {
              <img [src]="partner.photo" alt="" class="mx-auto h-20 w-20 rounded-full object-cover" />
            } @else {
              <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ember-100 text-2xl font-bold text-ember-600 dark:bg-ember-500/10">
                {{ partner.name?.charAt(0) || '?' }}
              </div>
            }
            <p class="mt-3 truncate font-display text-lg font-bold text-ink-900 dark:text-white">{{ partner.name }}</p>
            <p class="text-xs text-ink-400 dark:text-ink-500">Partner ID {{ partner.id.slice(-8).toUpperCase() }}</p>
            <p class="text-xs text-ink-400 dark:text-ink-500">Joined {{ partner.createdAt | date: 'MMM d, y' }}</p>
            <div class="mt-3 flex flex-wrap justify-center gap-1.5">
              <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" [class.bg-basil-100]="partner.isOnline" [class.text-basil-700]="partner.isOnline" [class.bg-ink-100]="!partner.isOnline" [class.text-ink-500]="!partner.isOnline" [class.dark:bg-ink-700]="!partner.isOnline" [class.dark:text-ink-300]="!partner.isOnline">
                {{ partner.isOnline ? 'Online' : 'Offline' }}
              </span>
              <span class="rounded-full px-2 py-0.5 text-[11px] font-bold capitalize" [class.bg-basil-100]="partner.status === 'approved'" [class.text-basil-700]="partner.status === 'approved'" [class.bg-gold-100]="partner.status === 'pending'" [class.text-gold-700]="partner.status === 'pending'" [class.bg-ember-100]="partner.status === 'rejected'" [class.text-ember-700]="partner.status === 'rejected'">
                {{ partner.status }}
              </span>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3 lg:col-span-2 lg:mt-0">
            <div class="card-surface flex items-center gap-3 p-4">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-600 dark:bg-gold-400/10"><app-icon name="star" [size]="18" /></span>
              <div class="min-w-0">
                <p class="text-[11px] font-bold uppercase tracking-wide text-ink-400">Avg. rating</p>
                <p class="font-display text-lg font-bold text-ink-900 dark:text-white">{{ partner.rating.average | number: '1.1-1' }}</p>
              </div>
            </div>
            <div class="card-surface flex items-center gap-3 p-4">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ember-100 text-ember-600 dark:bg-ember-500/10"><app-icon name="bike" [size]="18" /></span>
              <div class="min-w-0">
                <p class="text-[11px] font-bold uppercase tracking-wide text-ink-400">Deliveries</p>
                <p class="font-display text-lg font-bold text-ink-900 dark:text-white">{{ stats().completedDeliveries }}</p>
              </div>
            </div>
            <div class="card-surface flex items-center gap-3 p-4">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-basil-100 text-basil-600 dark:bg-basil-400/10"><app-icon name="banknote" [size]="18" /></span>
              <div class="min-w-0">
                <p class="text-[11px] font-bold uppercase tracking-wide text-ink-400">Total earnings</p>
                <p class="font-display text-lg font-bold text-ink-900 dark:text-white">{{ earnings().totalEarnings | inr }}</p>
              </div>
            </div>
            <div class="card-surface flex items-center gap-3 p-4">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info-100 text-info-600 dark:bg-info-500/10"><app-icon name="check" [size]="18" /></span>
              <div class="min-w-0">
                <p class="text-[11px] font-bold uppercase tracking-wide text-ink-400">Success rate</p>
                <p class="font-display text-lg font-bold text-ink-900 dark:text-white">{{ stats().successRate }}%</p>
              </div>
            </div>
          </div>
        </div>

        <div class="card-surface mt-4 p-5">
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <p><span class="text-ink-400">Mobile</span><br /><span class="font-semibold text-ink-800 dark:text-ink-100">{{ partner.phone }}</span></p>
            <p><span class="text-ink-400">Email</span><br /><span class="font-semibold text-ink-800 dark:text-ink-100">{{ partner.email }}</span></p>
            <p><span class="text-ink-400">Vehicle</span><br /><span class="font-semibold capitalize text-ink-800 dark:text-ink-100">{{ partner.vehicleType }} · {{ partner.vehicleNumber || '—' }}</span></p>
            <p><span class="text-ink-400">Aadhaar</span><br /><span class="font-semibold text-ink-800 dark:text-ink-100">{{ maskTail(partner.aadhaarNumber) }}</span></p>
            <p><span class="text-ink-400">PAN</span><br /><span class="font-semibold text-ink-800 dark:text-ink-100">{{ maskTail(partner.panNumber) }}</span></p>
            <p><span class="text-ink-400">License no.</span><br /><span class="font-semibold text-ink-800 dark:text-ink-100">{{ partner.licenseNumber || '—' }}</span></p>
          </div>

          <p class="mt-3 text-xs text-ink-400 dark:text-ink-500">
            To change your mobile number, email, or password, go to
            <a routerLink="/delivery/settings/security" class="font-semibold text-ember-600">Settings → Security</a>.
          </p>
        </div>

        <div class="mt-4 flex gap-1.5">
          @for (t of tabs; track t.id) {
            <button
              type="button"
              class="rounded-full border px-3 py-1.5 text-xs font-bold"
              [class.border-ember-500]="tab() === t.id"
              [class.text-ember-600]="tab() === t.id"
              [class.bg-ember-50]="tab() === t.id"
              [class.dark:bg-ember-500/10]="tab() === t.id"
              [class.border-ink-200]="tab() !== t.id"
              [class.dark:border-ink-700]="tab() !== t.id"
              [class.text-ink-500]="tab() !== t.id"
              [class.dark:text-ink-400]="tab() !== t.id"
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
              [value]="partner.photo || null"
              [uploading]="saving()"
              [progress]="photoProgress()"
              (picked)="onPhotoPicked($event)"
              (invalidFile)="toast.error($event)"
              label=""
            />

            <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">Full name
              <input [(ngModel)]="form.name" name="name" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>

            <div class="grid grid-cols-2 gap-2">
              <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">Date of birth
                <input type="date" [(ngModel)]="form.dob" name="dob" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
              </label>
              <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">Gender
                <select [(ngModel)]="form.gender" name="gender" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-white">
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">Vehicle type
                <select [(ngModel)]="form.vehicleType" name="vehicleType" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-white">
                  <option value="bike">Motorbike</option>
                  <option value="scooter">Scooter</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="car">Car</option>
                </select>
              </label>
              <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">Vehicle number
                <input [(ngModel)]="form.vehicleNumber" name="vehicleNumber" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
              </label>
            </div>

            <p class="text-xs font-bold uppercase tracking-wide text-ink-400">Identity numbers</p>
            <div class="grid grid-cols-2 gap-2">
              <input [(ngModel)]="form.licenseNumber" name="licenseNumber" placeholder="License number" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
              <input [(ngModel)]="form.aadhaarNumber" name="aadhaarNumber" maxlength="12" inputmode="numeric" placeholder="Aadhaar number" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </div>
            <input [(ngModel)]="form.panNumber" name="panNumber" maxlength="10" placeholder="PAN number" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm uppercase outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />

            <p class="text-xs font-bold uppercase tracking-wide text-ink-400">Emergency contact</p>
            <div class="grid grid-cols-2 gap-2">
              <input [(ngModel)]="form.emergencyContact.name" name="emName" placeholder="Contact name" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
              <input [(ngModel)]="form.emergencyContact.phone" name="emPhone" placeholder="Contact phone" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </div>

            <button type="button" [disabled]="saving()" class="rounded-lg bg-ember-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" (click)="saveProfile()">
              {{ saving() ? 'Saving…' : 'Save changes' }}
            </button>
          </div>
        }

        @if (tab() === 'documents') {
          <div class="card-surface mt-4 space-y-3 p-5">
            <p class="text-xs text-ink-400 dark:text-ink-500">Upload clear photos or PDFs of your documents for admin verification — JPG, PNG, or PDF, up to 5MB.</p>
            @for (key of docKeys; track key) {
              <div class="flex items-center gap-3 rounded-lg border border-dashed border-ink-200 p-3 dark:border-ink-700">
                <app-image-upload
                  #docUpload
                  shape="square"
                  size="sm"
                  [maxBytes]="5000000"
                  [allowPdf]="true"
                  [value]="partner.documents?.[key] || null"
                  [uploading]="saving()"
                  [progress]="docsProgress()"
                  (picked)="onDocPicked($event, key)"
                  (invalidFile)="toast.error($event)"
                  label=""
                />
                <div class="min-w-0 flex-1">
                  <span class="block text-sm font-semibold text-ink-700 dark:text-ink-200">{{ docLabel(key) }}</span>
                  @if (partner.documents?.[key]) {
                    <button type="button" class="text-xs font-semibold text-ember-600" (click)="removeDocument(key)">Remove</button>
                  }
                </div>
              </div>
            }
            <button type="button" [disabled]="saving()" class="rounded-lg bg-ember-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" (click)="saveDocuments()">
              {{ saving() ? 'Saving…' : 'Save documents' }}
            </button>
          </div>
        }

        @if (tab() === 'bank') {
          <div class="card-surface mt-4 space-y-3 p-5">
            <input [(ngModel)]="form.bankDetails.accountHolder" name="accountHolder" placeholder="Account holder name" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            <input [(ngModel)]="form.bankDetails.accountNumber" name="accountNumber" placeholder="Account number" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            <input [(ngModel)]="form.bankDetails.ifsc" name="ifsc" placeholder="IFSC code" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm uppercase outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            <input [(ngModel)]="form.bankDetails.upiId" name="upiId" placeholder="UPI ID" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            <button type="button" [disabled]="saving()" class="rounded-lg bg-ember-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" (click)="saveProfile()">
              {{ saving() ? 'Saving…' : 'Save bank details' }}
            </button>
          </div>
        }
      }
    </div>
    </app-delivery-shell>
  `,
})
export class DeliveryProfileComponent implements OnInit {
  tab = signal<Tab>('profile');
  tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'documents', label: 'Documents' },
    { id: 'bank', label: 'Bank & UPI' },
  ];
  docKeys = ['license', 'aadhaar', 'pan', 'rc', 'insurance'] as const;

  form = {
    name: '',
    photo: '',
    dob: '' as string | null,
    gender: '' as string,
    vehicleType: 'bike',
    vehicleNumber: '',
    licenseNumber: '',
    aadhaarNumber: '',
    panNumber: '',
    bankDetails: { accountHolder: '', accountNumber: '', ifsc: '', upiId: '' },
    emergencyContact: { name: '', phone: '' },
  };
  docForm: Record<string, string> = { license: '', aadhaar: '', pan: '', rc: '', insurance: '' };

  saving = signal(false);
  photoProgress = signal<number | null>(null);
  docsProgress = signal<number | null>(null);

  stats = signal<DeliveryDashboardStats>({
    todayDeliveries: 0,
    pendingPickups: 0,
    activeDeliveries: 0,
    completedDeliveries: 0,
    cancelledDeliveries: 0,
    failedDeliveries: 0,
    successRate: 0,
    rating: { average: 0, count: 0 },
    recentDeliveries: [],
  });
  earnings = signal<DeliveryEarningsSummary>({
    orderCount: 0,
    totalEarnings: 0,
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    tipsReceived: 0,
    incentives: 0,
    pendingPayments: 0,
    dailyTarget: 1000,
  });

  @ViewChild('photoUpload') photoUpload?: ImageUploadComponent;
  @ViewChildren('docUpload') docUploads!: QueryList<ImageUploadComponent>;

  maskTail = maskTail;

  constructor(
    public auth: DeliveryAuthService,
    private deliveryService: DeliveryService,
    public toast: ToastService
  ) {}

  async ngOnInit() {
    const partner = this.auth.currentUser();
    if (partner) {
      this.form = {
        name: partner.name,
        photo: partner.photo,
        dob: partner.dob ? partner.dob.slice(0, 10) : '',
        gender: partner.gender ?? '',
        vehicleType: partner.vehicleType,
        vehicleNumber: partner.vehicleNumber,
        licenseNumber: partner.licenseNumber,
        aadhaarNumber: partner.aadhaarNumber,
        panNumber: partner.panNumber,
        bankDetails: { ...partner.bankDetails },
        emergencyContact: { ...partner.emergencyContact },
      };
      this.docForm = { ...partner.documents };
    }

    const [stats, earnings] = await Promise.all([this.deliveryService.getDashboardStats(), this.deliveryService.getEarnings()]);
    this.stats.set(stats);
    this.earnings.set(earnings);
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
      await this.auth.updateProfile(
        {
          name: this.form.name,
          photo: this.form.photo,
          dob: this.form.dob || null,
          gender: (this.form.gender || null) as any,
          vehicleType: this.form.vehicleType as any,
          vehicleNumber: this.form.vehicleNumber,
          licenseNumber: this.form.licenseNumber,
          aadhaarNumber: this.form.aadhaarNumber,
          panNumber: this.form.panNumber,
          bankDetails: this.form.bankDetails,
          emergencyContact: this.form.emergencyContact,
        } as any,
        (pct) => this.photoProgress.set(pct)
      );
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

  async removeDocument(field: string) {
    try {
      await this.auth.deleteDocument(field as any);
      this.docForm[field] = '';
      this.toast.success('Document removed');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not remove document');
    }
  }
}
