import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem } from '../../../core/models/menu-item.model';
import { SellerCoupon, SellerService } from '../../../core/services/seller.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SellerShellComponent } from '../../../shared/components/seller-shell/seller-shell.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

interface CouponForm {
  code: string;
  offerType: 'discount' | 'bogo' | 'combo' | 'flash';
  discountType: 'percent' | 'flat';
  value: number | null;
  minOrder: number | null;
  buyQty: number;
  getQty: number;
  comboItems: string[];
  comboPrice: number | null;
  startsAt: string;
  expiresAt: string;
}

const EMPTY_FORM = (): CouponForm => ({
  code: '',
  offerType: 'discount',
  discountType: 'percent',
  value: null,
  minOrder: null,
  buyQty: 1,
  getQty: 1,
  comboItems: [],
  comboPrice: null,
  startsAt: '',
  expiresAt: '',
});

const OFFER_LABELS: Record<string, string> = { discount: 'Discount', bogo: 'Buy 1 Get 1', combo: 'Combo', flash: 'Flash sale' };

@Component({
  selector: 'app-seller-offers',
  standalone: true,
  imports: [FormsModule, DatePipe, IconComponent, SellerShellComponent, InrPipe],
  template: `
    <app-seller-shell title="Offers &amp; Coupons">
      <div class="flex items-center justify-between">
        <p class="text-sm text-ink-400">Discounts, BOGO, combos and flash sales for your restaurant.</p>
        <button type="button" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white" (click)="openAddForm()">
          {{ showForm() && !editingId() ? 'Cancel' : '+ New offer' }}
        </button>
      </div>

      @if (showForm()) {
        <form class="card-surface mt-4 space-y-3 p-4" (submit)="onSubmit($event)">
          <div class="flex flex-wrap gap-1.5">
            @for (type of offerTypes; track type) {
              <button
                type="button"
                class="rounded-full border px-3 py-1.5 text-xs font-bold"
                [class.border-ember-500]="form.offerType === type"
                [class.text-ember-600]="form.offerType === type"
                [class.bg-ember-50]="form.offerType === type"
                [class.border-ink-200]="form.offerType !== type"
                [class.text-ink-500]="form.offerType !== type"
                (click)="form.offerType = type"
              >
                {{ offerLabel(type) }}
              </button>
            }
          </div>

          <input [(ngModel)]="form.code" name="code" required placeholder="Coupon code (e.g. FEAST20)" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm uppercase outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />

          @if (form.offerType === 'discount' || form.offerType === 'flash') {
            <div class="grid grid-cols-2 gap-2">
              <select [(ngModel)]="form.discountType" name="discountType" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900">
                <option value="percent">Percent off</option>
                <option value="flat">Flat amount off</option>
              </select>
              <input type="number" [(ngModel)]="form.value" name="value" required placeholder="Value" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
            </div>
          }

          @if (form.offerType === 'bogo') {
            <div class="grid grid-cols-2 gap-2">
              <label class="text-xs font-semibold text-ink-500">
                Buy qty
                <input type="number" [(ngModel)]="form.buyQty" name="buyQty" min="1" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
              </label>
              <label class="text-xs font-semibold text-ink-500">
                Get qty free
                <input type="number" [(ngModel)]="form.getQty" name="getQty" min="1" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
              </label>
            </div>
          }

          @if (form.offerType === 'combo') {
            <div>
              <p class="mb-1 text-xs font-semibold text-ink-500">Combo items</p>
              <div class="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-ink-100 p-2 dark:border-ink-700">
                @for (item of menuItems(); track item._id) {
                  <label class="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
                    <input type="checkbox" [checked]="form.comboItems.includes(item._id)" (change)="toggleComboItem(item._id)" />
                    {{ item.name }} ({{ item.price | inr }})
                  </label>
                }
              </div>
              <input type="number" [(ngModel)]="form.comboPrice" name="comboPrice" placeholder="Combo bundle price" class="mt-2 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
            </div>
          }

          <input type="number" [(ngModel)]="form.minOrder" name="minOrder" placeholder="Minimum order value (optional)" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />

          <div class="grid grid-cols-2 gap-2">
            <label class="text-xs font-semibold text-ink-500">
              Starts
              <input type="datetime-local" [(ngModel)]="form.startsAt" name="startsAt" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
            </label>
            <label class="text-xs font-semibold text-ink-500">
              Expires
              <input type="datetime-local" [(ngModel)]="form.expiresAt" name="expiresAt" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
            </label>
          </div>

          <button type="submit" [disabled]="submitting()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {{ submitting() ? 'Saving…' : editingId() ? 'Save changes' : 'Create offer' }}
          </button>
        </form>
      }

      <div class="mt-4 space-y-2">
        @for (coupon of coupons(); track coupon._id) {
          <div class="card-surface flex items-center justify-between p-3.5">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-bold text-ink-900 dark:text-white">{{ coupon.code }}</p>
                <span class="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-500 dark:bg-ink-700 dark:text-ink-300">{{ offerLabel(coupon.offerType) }}</span>
                @if (!coupon.isActive) {
                  <span class="rounded-full bg-ember-50 px-2 py-0.5 text-[10px] font-bold uppercase text-ember-600">Inactive</span>
                }
              </div>
              <p class="mt-0.5 text-xs text-ink-400">
                @if (coupon.offerType === 'bogo') {
                  Buy {{ coupon.buyQty }} get {{ coupon.getQty }} free
                } @else if (coupon.offerType === 'combo') {
                  Combo bundle @ {{ coupon.comboPrice | inr }}
                } @else {
                  {{ coupon.discountType === 'percent' ? coupon.value + '% off' : (coupon.value | inr) + ' off' }}
                }
                @if (coupon.minOrder) { · Min order {{ coupon.minOrder | inr }} }
                @if (coupon.expiresAt) { · Expires {{ coupon.expiresAt | date: 'MMM d' }} }
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <button type="button" class="text-xs font-bold" [class.text-basil-600]="coupon.isActive" [class.text-ink-400]="!coupon.isActive" (click)="toggleActive(coupon)">
                {{ coupon.isActive ? 'Active' : 'Paused' }}
              </button>
              <button type="button" class="text-ink-300 hover:text-ink-700" (click)="edit(coupon)"><app-icon name="edit" [size]="16" /></button>
              <button type="button" class="text-ink-300 hover:text-ember-600" (click)="remove(coupon._id)"><app-icon name="trash" [size]="16" /></button>
            </div>
          </div>
        } @empty {
          <p class="mt-6 text-center text-sm text-ink-400">No coupons yet.</p>
        }
      </div>
    </app-seller-shell>
  `,
})
export class SellerOffersComponent implements OnInit {
  coupons = signal<SellerCoupon[]>([]);
  menuItems = signal<MenuItem[]>([]);
  showForm = signal(false);
  submitting = signal(false);
  editingId = signal<string | null>(null);
  offerTypes: CouponForm['offerType'][] = ['discount', 'bogo', 'combo', 'flash'];
  form: CouponForm = EMPTY_FORM();

  constructor(
    private sellerService: SellerService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    const [couponsRes, menuRes] = await Promise.all([this.sellerService.listCoupons(), this.sellerService.listMenu()]);
    this.coupons.set(couponsRes.coupons);
    this.menuItems.set(menuRes.items);
  }

  offerLabel(type: string): string {
    return OFFER_LABELS[type] ?? type;
  }

  openAddForm() {
    if (this.showForm() && !this.editingId()) {
      this.showForm.set(false);
      return;
    }
    this.editingId.set(null);
    this.form = EMPTY_FORM();
    this.showForm.set(true);
  }

  edit(coupon: SellerCoupon) {
    this.editingId.set(coupon._id);
    this.form = {
      code: coupon.code,
      offerType: coupon.offerType,
      discountType: coupon.discountType,
      value: coupon.value,
      minOrder: coupon.minOrder || null,
      buyQty: coupon.buyQty ?? 1,
      getQty: coupon.getQty ?? 1,
      comboItems: coupon.comboItems ?? [],
      comboPrice: coupon.comboPrice,
      startsAt: coupon.startsAt ? coupon.startsAt.slice(0, 16) : '',
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : '',
    };
    this.showForm.set(true);
  }

  toggleComboItem(id: string) {
    const idx = this.form.comboItems.indexOf(id);
    if (idx === -1) this.form.comboItems.push(id);
    else this.form.comboItems.splice(idx, 1);
  }

  async onSubmit(e: Event) {
    e.preventDefault();
    if (!this.form.code.trim()) {
      this.toast.error('Enter a coupon code');
      return;
    }
    if (this.form.offerType === 'combo' && !this.form.comboItems.length) {
      this.toast.error('Select at least one item for the combo');
      return;
    }
    if ((this.form.offerType === 'discount' || this.form.offerType === 'flash') && !this.form.value) {
      this.toast.error('Enter a discount value');
      return;
    }
    this.submitting.set(true);
    try {
      const payload = {
        code: this.form.code.trim(),
        offerType: this.form.offerType,
        discountType: this.form.discountType,
        value: this.form.value ?? 0,
        minOrder: this.form.minOrder ?? 0,
        buyQty: this.form.buyQty,
        getQty: this.form.getQty,
        comboItems: this.form.comboItems,
        comboPrice: this.form.comboPrice,
        startsAt: this.form.startsAt || null,
        expiresAt: this.form.expiresAt || null,
      };

      if (this.editingId()) {
        const res = await this.sellerService.updateCoupon(this.editingId()!, payload);
        this.coupons.update((coupons) => coupons.map((c) => (c._id === res.coupon._id ? res.coupon : c)));
        this.toast.success('Offer updated');
      } else {
        const res = await this.sellerService.createCoupon(payload);
        this.coupons.update((coupons) => [res.coupon, ...coupons]);
        this.toast.success('Offer created');
      }
      this.showForm.set(false);
      this.editingId.set(null);
      this.form = EMPTY_FORM();
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not save offer');
    } finally {
      this.submitting.set(false);
    }
  }

  async toggleActive(coupon: SellerCoupon) {
    const res = await this.sellerService.updateCoupon(coupon._id, { isActive: !coupon.isActive });
    this.coupons.update((coupons) => coupons.map((c) => (c._id === res.coupon._id ? res.coupon : c)));
  }

  async remove(id: string) {
    if (!confirm('Delete this offer? This cannot be undone.')) return;
    await this.sellerService.deleteCoupon(id);
    this.coupons.update((coupons) => coupons.filter((c) => c._id !== id));
    this.toast.success('Coupon removed');
  }
}
