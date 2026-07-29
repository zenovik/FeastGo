import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MenuItem, ScheduledAvailability } from '../../../core/models/menu-item.model';
import { SellerAuthService } from '../../../core/services/seller-auth.service';
import { SellerCoupon, SellerService } from '../../../core/services/seller.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { CategoryService, FoodCategory } from '../../../core/services/category.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';
import { SellerShellComponent } from '../../../shared/components/seller-shell/seller-shell.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

interface ItemForm {
  name: string;
  description: string;
  price: number | null;
  category: string;
  image: string;
  images: string[];
  isVeg: boolean;
  isBestseller: boolean;
  isFeatured: boolean;
  isRecommended: boolean;
  spiceLevel: number;
  stockCount: number | null;
  lowStockThreshold: number;
  scheduledAvailability: ScheduledAvailability;
}

const EMPTY_FORM = (): ItemForm => ({
  name: '',
  description: '',
  price: null,
  category: '',
  image: '',
  images: [],
  isVeg: true,
  isBestseller: false,
  isFeatured: false,
  isRecommended: false,
  spiceLevel: 0,
  stockCount: null,
  lowStockThreshold: 5,
  scheduledAvailability: { enabled: false, days: [0, 1, 2, 3, 4, 5, 6], startTime: '00:00', endTime: '23:59' },
});

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type StatusFilter = 'all' | 'available' | 'outofstock' | 'hidden';
type TagFilter = 'all' | 'recommended' | 'featured' | 'bestseller';
type SortOption = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'az';
type FormTab = 'details' | 'offers';
type OfferType = 'discount' | 'bogo' | 'combo' | 'flash';

interface OfferForm {
  offerType: OfferType;
  discountType: 'percent' | 'flat';
  value: number | null;
  buyQty: number;
  getQty: number;
  comboPrice: number | null;
  expiresAt: string;
}

const EMPTY_OFFER_FORM = (): OfferForm => ({
  offerType: 'discount',
  discountType: 'percent',
  value: null,
  buyQty: 1,
  getQty: 1,
  comboPrice: null,
  expiresAt: '',
});

function timeAgo(iso: string | undefined): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function csvEscape(value: string | number | boolean): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Minimal CSV line parser — handles quoted fields containing commas ("a, b").
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

@Component({
  selector: 'app-seller-menu',
  standalone: true,
  imports: [FormsModule, DragDropModule, NgTemplateOutlet, DatePipe, IconComponent, SellerShellComponent, InrPipe, ImageUploadComponent],
  template: `
    <app-seller-shell title="Menu">
      <!-- Page header -->
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold text-ink-900 dark:text-white">Menu Management</h1>
          <p class="mt-0.5 text-sm text-ink-400">Manage your restaurant menu, categories and availability.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-700/50" (click)="triggerImport()">
            <app-icon name="upload" [size]="14" /> Import Menu
          </button>
          <button type="button" class="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-700/50" (click)="exportCsv()">
            <app-icon name="download" [size]="14" /> Export Menu
          </button>
          <input #csvInput type="file" accept=".csv" class="hidden" (change)="onImportFile($event)" />
          <button type="button" class="rounded-lg bg-ember-500 px-4 py-2 text-sm font-bold text-white hover:bg-ember-600" (click)="openAddForm()">
            + Add Item
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div class="card-surface p-3.5">
          <p class="text-[11px] font-bold uppercase tracking-wide text-ink-400">Total items</p>
          <p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ stats().total }}</p>
        </div>
        <div class="card-surface p-3.5">
          <p class="text-[11px] font-bold uppercase tracking-wide text-ink-400">Available</p>
          <p class="mt-1 font-display text-xl font-bold text-basil-600">{{ stats().available }}</p>
        </div>
        <div class="card-surface p-3.5">
          <p class="text-[11px] font-bold uppercase tracking-wide text-ink-400">Out of stock</p>
          <p class="mt-1 font-display text-xl font-bold text-ember-600">{{ stats().outOfStock }}</p>
        </div>
        <div class="card-surface p-3.5">
          <p class="text-[11px] font-bold uppercase tracking-wide text-ink-400">Hidden</p>
          <p class="mt-1 font-display text-xl font-bold text-ink-500">{{ stats().hidden }}</p>
        </div>
        <div class="card-surface p-3.5">
          <p class="text-[11px] font-bold uppercase tracking-wide text-ink-400">Categories</p>
          <p class="mt-1 font-display text-xl font-bold text-ink-900 dark:text-white">{{ stats().categories }}</p>
        </div>
        <div class="card-surface p-3.5">
          <p class="text-[11px] font-bold uppercase tracking-wide text-ink-400">Best sellers</p>
          <p class="mt-1 font-display text-xl font-bold text-gold-600">{{ stats().bestsellers }}</p>
        </div>
      </div>

      <!-- Search & filters -->
      <div class="card-surface mt-4 flex flex-wrap items-center gap-2 p-3">
        <div class="relative min-w-[200px] flex-1">
          <app-icon name="search" [size]="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            name="search"
            placeholder="Search by item name"
            class="w-full rounded-lg border border-ink-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />
        </div>
        <select [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)" name="categoryFilter" class="rounded-lg border border-ink-200 px-2.5 py-2 text-xs font-semibold outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-white">
          <option value="all">All categories</option>
          @for (c of distinctCategories(); track c) {
            <option [value]="c">{{ c }}</option>
          }
        </select>
        <select [ngModel]="vegFilter()" (ngModelChange)="vegFilter.set($event)" name="vegFilter" class="rounded-lg border border-ink-200 px-2.5 py-2 text-xs font-semibold outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-white">
          <option value="all">Veg &amp; Non-Veg</option>
          <option value="veg">Veg only</option>
          <option value="nonveg">Non-Veg only</option>
        </select>
        <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" name="statusFilter" class="rounded-lg border border-ink-200 px-2.5 py-2 text-xs font-semibold outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-white">
          <option value="all">Any status</option>
          <option value="available">Available</option>
          <option value="outofstock">Out of stock</option>
          <option value="hidden">Hidden</option>
        </select>
        <select [ngModel]="tagFilter()" (ngModelChange)="tagFilter.set($event)" name="tagFilter" class="rounded-lg border border-ink-200 px-2.5 py-2 text-xs font-semibold outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-white">
          <option value="all">Any tag</option>
          <option value="recommended">Recommended</option>
          <option value="featured">Featured</option>
          <option value="bestseller">Bestseller</option>
        </select>
        <select [ngModel]="sortBy()" (ngModelChange)="sortBy.set($event)" name="sortBy" class="rounded-lg border border-ink-200 px-2.5 py-2 text-xs font-semibold outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-white">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
          <option value="az">A → Z</option>
        </select>
        <div class="ml-auto flex items-center gap-2">
          <button type="button" class="flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-700/50" (click)="showCategoryManager.set(true)">
            <app-icon name="layers" [size]="14" /> Categories
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold"
            [class.border-ember-500]="bulkMode()"
            [class.text-ember-600]="bulkMode()"
            [class.border-ink-200]="!bulkMode()"
            [class.text-ink-700]="!bulkMode()"
            [class.dark:border-ink-700]="!bulkMode()"
            [class.dark:text-ink-200]="!bulkMode()"
            (click)="toggleBulkMode()"
          >
            <app-icon name="square-check" [size]="14" /> {{ bulkMode() ? 'Cancel select' : 'Select' }}
          </button>
        </div>
      </div>

      <!-- Bulk actions bar -->
      @if (bulkMode() && selectedIds().size > 0) {
        <div class="card-surface mt-3 flex flex-wrap items-center gap-2 border-ember-200 bg-ember-50 p-3 dark:bg-ember-500/10">
          <p class="text-sm font-bold text-ink-900 dark:text-white">{{ selectedIds().size }} selected</p>
          <button type="button" class="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200" (click)="bulkSetAvailable(true)">Enable</button>
          <button type="button" class="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200" (click)="bulkSetAvailable(false)">Disable</button>
          <button type="button" class="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200" (click)="bulkSetAvailable(false)">Hide</button>
          <select (change)="bulkMoveCategory($event)" class="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-bold text-ink-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200">
            <option value="">Move to category…</option>
            @for (c of distinctCategories(); track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
          <button type="button" class="ml-auto rounded-lg bg-ember-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-ember-700" (click)="bulkDelete()">Delete</button>
        </div>
      }

      @if (showForm()) {
        <div class="card-surface mt-4 p-4">
          @if (editingId()) {
            <div class="flex gap-1.5 border-b border-ink-100 pb-3 dark:border-ink-700">
              <button type="button" class="rounded-full px-3 py-1.5 text-xs font-bold" [class.bg-ember-50]="formTab() === 'details'" [class.text-ember-600]="formTab() === 'details'" [class.text-ink-500]="formTab() !== 'details'" (click)="formTab.set('details')">Details</button>
              <button type="button" class="rounded-full px-3 py-1.5 text-xs font-bold" [class.bg-ember-50]="formTab() === 'offers'" [class.text-ember-600]="formTab() === 'offers'" [class.text-ink-500]="formTab() !== 'offers'" (click)="formTab.set('offers')">Offers ({{ itemOffers().length }})</button>
            </div>
          }

          @if (formTab() === 'details') {
            <form class="mt-3 space-y-3" (submit)="onSubmit($event)">
              <div>
                <input
                  [(ngModel)]="form.name"
                  name="name"
                  maxlength="80"
                  placeholder="Item name"
                  class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-ember-400 dark:bg-ink-900"
                  [class.border-ink-200]="!formErrors().name"
                  [class.dark:border-ink-700]="!formErrors().name"
                  [class.border-ember-500]="formErrors().name"
                />
                @if (formErrors().name) {
                  <p class="mt-1 text-xs font-medium text-ember-600">{{ formErrors().name }}</p>
                }
              </div>

              <div>
                <textarea
                  [(ngModel)]="form.description"
                  name="description"
                  maxlength="500"
                  rows="2"
                  placeholder="Description (optional, max 500 characters)"
                  class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900"
                ></textarea>
                <p class="mt-0.5 text-right text-[11px] text-ink-400">{{ form.description.length }}/500</p>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    [(ngModel)]="form.price"
                    name="price"
                    placeholder="Price"
                    class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-ember-400 dark:bg-ink-900"
                    [class.border-ink-200]="!formErrors().price"
                    [class.dark:border-ink-700]="!formErrors().price"
                    [class.border-ember-500]="formErrors().price"
                  />
                  @if (formErrors().price) {
                    <p class="mt-1 text-xs font-medium text-ember-600">{{ formErrors().price }}</p>
                  }
                </div>
                <div>
                  <input
                    [(ngModel)]="form.category"
                    name="category"
                    list="categoryOptions"
                    placeholder="Category (pick or type new)"
                    class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-ember-400 dark:bg-ink-900"
                    [class.border-ink-200]="!formErrors().category"
                    [class.dark:border-ink-700]="!formErrors().category"
                    [class.border-ember-500]="formErrors().category"
                  />
                  <datalist id="categoryOptions">
                    @for (c of allCategoryOptions(); track c) {
                      <option [value]="c"></option>
                    }
                  </datalist>
                  @if (formErrors().category) {
                    <p class="mt-1 text-xs font-medium text-ember-600">{{ formErrors().category }}</p>
                  }
                </div>
              </div>

              <div>
                <p class="mb-1 text-xs font-semibold text-ink-500">Images (first is the primary image)</p>
                <div class="flex flex-wrap items-center gap-2">
                  @for (img of form.images; track $index) {
                    <div class="group relative">
                      <img [src]="img" alt="Preview" class="h-14 w-14 rounded-lg object-cover" />
                      @if ($index === 0) {
                        <span class="absolute bottom-0 left-0 right-0 rounded-b-lg bg-ink-900/70 py-0.5 text-center text-[9px] font-bold text-white">Primary</span>
                      }
                      <button type="button" class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-white" (click)="removeImage($index)" aria-label="Delete image">
                        <app-icon name="x" [size]="10" />
                      </button>
                    </div>
                  }
                  <app-image-upload
                    shape="square"
                    size="sm"
                    [multiple]="true"
                    [maxBytes]="2000000"
                    [uploading]="submitting()"
                    [progress]="saveProgress()"
                    label=""
                    (picked)="onImagePicked($event)"
                    (invalidFile)="toast.error($event)"
                  />
                </div>
                @if (formErrors().image) {
                  <p class="mt-1 text-xs font-medium text-ember-600">{{ formErrors().image }}</p>
                }
              </div>

              <div>
                <p class="mb-1 text-xs font-semibold text-ink-500">Spice level</p>
                <div class="flex gap-1.5">
                  @for (lvl of [0, 1, 2, 3]; track lvl) {
                    <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full border" [class.border-ember-500]="form.spiceLevel >= lvl && lvl > 0" [class.text-ember-600]="form.spiceLevel >= lvl && lvl > 0" [class.border-ink-200]="!(form.spiceLevel >= lvl && lvl > 0)" [class.text-ink-300]="!(form.spiceLevel >= lvl && lvl > 0)" (click)="form.spiceLevel = lvl" [attr.aria-label]="'Spice level ' + lvl">
                      <app-icon name="flame" [size]="14" />
                    </button>
                  }
                </div>
              </div>

              <div class="flex flex-wrap gap-4">
                <label class="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
                  <input type="checkbox" [(ngModel)]="form.isVeg" name="isVeg" /> Vegetarian
                </label>
                <label class="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
                  <input type="checkbox" [(ngModel)]="form.isBestseller" name="isBestseller" /> Bestseller
                </label>
                <label class="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
                  <input type="checkbox" [(ngModel)]="form.isFeatured" name="isFeatured" /> Featured
                </label>
                <label class="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
                  <input type="checkbox" [(ngModel)]="form.isRecommended" name="isRecommended" /> Recommended
                </label>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <label class="text-xs font-semibold text-ink-500">
                  Stock count (blank = unlimited)
                  <input type="number" [(ngModel)]="form.stockCount" name="stockCount" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
                </label>
                <label class="text-xs font-semibold text-ink-500">
                  Low stock alert threshold
                  <input type="number" [(ngModel)]="form.lowStockThreshold" name="lowStockThreshold" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />
                </label>
              </div>

              <div class="rounded-lg border border-ink-100 p-3 dark:border-ink-700">
                <label class="flex items-center gap-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
                  <input type="checkbox" [(ngModel)]="form.scheduledAvailability.enabled" name="scheduleEnabled" /> Schedule availability
                </label>
                @if (form.scheduledAvailability.enabled) {
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    @for (day of weekdays; track $index) {
                      <button
                        type="button"
                        class="rounded-full border px-2.5 py-1 text-xs font-bold"
                        [class.border-ember-500]="form.scheduledAvailability.days.includes($index)"
                        [class.text-ember-600]="form.scheduledAvailability.days.includes($index)"
                        [class.border-ink-200]="!form.scheduledAvailability.days.includes($index)"
                        [class.text-ink-400]="!form.scheduledAvailability.days.includes($index)"
                        (click)="toggleDay($index)"
                      >
                        {{ day }}
                      </button>
                    }
                  </div>
                  <div class="mt-2 grid grid-cols-2 gap-2">
                    <input type="time" [(ngModel)]="form.scheduledAvailability.startTime" name="startTime" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
                    <input type="time" [(ngModel)]="form.scheduledAvailability.endTime" name="endTime" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
                  </div>
                }
              </div>

              <div class="flex gap-2">
                <button type="submit" [disabled]="submitting()" class="rounded-lg bg-ember-500 px-4 py-2 text-sm font-semibold text-white hover:bg-ember-600 disabled:opacity-50">
                  {{ submitting() ? 'Saving…' : editingId() ? 'Save changes' : 'Add item' }}
                </button>
                <button type="button" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-600 dark:border-ink-700 dark:text-ink-300" (click)="closeForm()">Cancel</button>
              </div>
            </form>
          } @else {
            <!-- Offers tab -->
            <div class="mt-3 space-y-2">
              @for (offer of itemOffers(); track offer._id) {
                <div class="flex items-center justify-between rounded-lg border border-ink-100 p-3 dark:border-ink-700">
                  <div>
                    <p class="text-sm font-bold capitalize text-ink-900 dark:text-white">{{ offer.offerType }} · {{ offer.discountType === 'percent' ? offer.value + '% off' : (offer.value | inr) + ' off' }}</p>
                    <p class="text-xs text-ink-400">Code {{ offer.code }} @if (offer.expiresAt) { · Expires {{ offer.expiresAt | date: 'mediumDate' }} }</p>
                  </div>
                  <button type="button" class="text-ink-300 hover:text-ember-600" (click)="removeOffer(offer._id)" aria-label="Remove offer">
                    <app-icon name="trash" [size]="14" />
                  </button>
                </div>
              } @empty {
                <p class="text-sm text-ink-400">No offers attached to this item yet.</p>
              }

              @if (showOfferForm()) {
                <form class="space-y-2 rounded-lg border border-dashed border-ink-200 p-3 dark:border-ink-700" (submit)="saveOffer($event)">
                  <div class="grid grid-cols-2 gap-2">
                    <select [(ngModel)]="offerForm.offerType" name="offerType" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900">
                      <option value="discount">Flat / Percentage Discount</option>
                      <option value="bogo">Buy One Get One</option>
                      <option value="combo">Combo</option>
                      <option value="flash">Flash Sale</option>
                    </select>
                    <select [(ngModel)]="offerForm.discountType" name="discountType" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900">
                      <option value="percent">Percentage</option>
                      <option value="flat">Flat amount</option>
                    </select>
                  </div>
                  <input type="number" [(ngModel)]="offerForm.value" name="value" placeholder="Discount value" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
                  @if (offerForm.offerType === 'bogo') {
                    <div class="grid grid-cols-2 gap-2">
                      <input type="number" min="1" [(ngModel)]="offerForm.buyQty" name="buyQty" placeholder="Buy qty" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
                      <input type="number" min="1" [(ngModel)]="offerForm.getQty" name="getQty" placeholder="Get qty" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
                    </div>
                  }
                  @if (offerForm.offerType === 'combo') {
                    <input type="number" [(ngModel)]="offerForm.comboPrice" name="comboPrice" placeholder="Combo price" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
                  }
                  <input type="date" [(ngModel)]="offerForm.expiresAt" name="expiresAt" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
                  <div class="flex gap-2">
                    <button type="submit" [disabled]="savingOffer()" class="rounded-lg bg-ember-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ savingOffer() ? 'Saving…' : 'Save offer' }}</button>
                    <button type="button" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-600 dark:border-ink-700 dark:text-ink-300" (click)="showOfferForm.set(false)">Cancel</button>
                  </div>
                </form>
              } @else {
                <button type="button" class="rounded-lg border border-dashed border-ink-300 px-4 py-2 text-sm font-semibold text-ink-600 dark:border-ink-600 dark:text-ink-300" (click)="showOfferForm.set(true); offerForm = emptyOfferForm()">+ Add offer</button>
              }
            </div>
          }
        </div>
      }

      <!-- Empty state: no items at all -->
      @if (!loading() && items().length === 0) {
        <div class="card-surface mt-4 flex flex-col items-center gap-3 p-12 text-center">
          <span class="flex h-20 w-20 items-center justify-center rounded-full bg-ink-50 text-ink-300 dark:bg-ink-700 dark:text-ink-500">
            <app-icon name="package" [size]="36" />
          </span>
          <p class="font-display text-lg font-bold text-ink-900 dark:text-white">No menu items added yet.</p>
          <p class="max-w-xs text-sm text-ink-400">Start building your menu so customers can discover and order your dishes.</p>
          <button type="button" class="rounded-lg bg-ember-500 px-4 py-2 text-sm font-bold text-white hover:bg-ember-600" (click)="openAddForm()">Add Your First Item</button>
        </div>
      }

      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          @for (n of [1, 2, 3, 4, 5, 6]; track n) {
            <div class="card-surface animate-pulse p-3">
              <div class="h-32 w-full rounded-lg bg-ink-100 dark:bg-ink-700"></div>
              <div class="mt-3 h-4 w-3/4 rounded bg-ink-100 dark:bg-ink-700"></div>
              <div class="mt-2 h-3 w-1/2 rounded bg-ink-100 dark:bg-ink-700"></div>
            </div>
          }
        </div>
      }

      <!-- Menu items -->
      @if (!loading() && items().length > 0) {
        @if (hasActiveFilters()) {
          <div class="mt-4">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              @for (item of filteredItems(); track item._id) {
                <ng-container [ngTemplateOutlet]="itemCard" [ngTemplateOutletContext]="{ item }" />
              } @empty {
                <div class="card-surface col-span-full flex flex-col items-center gap-2 p-10 text-center">
                  <app-icon name="search" [size]="28" class="text-ink-300" />
                  <p class="text-sm font-semibold text-ink-700 dark:text-ink-200">No items match your filters.</p>
                  <button type="button" class="text-xs font-bold text-ember-600" (click)="clearFilters()">Clear filters</button>
                </div>
              }
            </div>
          </div>
        } @else if (view() === 'grid') {
          <div cdkDropList (cdkDropListDropped)="dropCategory($event)" class="mt-4 space-y-5">
            @for (group of groupedItems(); track group.category) {
              <div cdkDrag [cdkDragData]="group.category" class="card-surface p-4">
                <div class="flex cursor-move items-center gap-2" cdkDragHandle>
                  <app-icon name="grip" [size]="14" class="text-ink-300" />
                  <h3 class="font-display text-sm font-bold text-ink-900 dark:text-white">{{ group.category }}</h3>
                  <span class="text-xs text-ink-400">({{ group.items.length }})</span>
                </div>
                <div cdkDropList [cdkDropListData]="group.items" (cdkDropListDropped)="dropItem($event, group.items)" class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  @for (item of group.items; track item._id) {
                    <div cdkDrag>
                      <ng-container [ngTemplateOutlet]="itemCard" [ngTemplateOutletContext]="{ item }" />
                    </div>
                  }
                </div>
              </div>
            } @empty {
              <p class="mt-6 text-center text-sm text-ink-400">No menu items yet.</p>
            }
          </div>
        } @else {
          <div class="card-surface mt-4 overflow-x-auto">
            <table class="w-full min-w-[640px] text-sm">
              <thead>
                <tr class="border-b border-ink-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-400 dark:border-ink-700">
                  <th class="p-3">Item</th>
                  <th class="p-3">Category</th>
                  <th class="p-3">Price</th>
                  <th class="p-3">Stock</th>
                  <th class="p-3">Available</th>
                  <th class="p-3"></th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredItems(); track item._id) {
                  <tr class="border-b border-ink-50 dark:border-ink-700">
                    <td class="p-3 font-semibold text-ink-900 dark:text-white">{{ item.name }}</td>
                    <td class="p-3 text-ink-500">{{ item.category }}</td>
                    <td class="p-3 text-ink-500">{{ item.price | inr }}</td>
                    <td class="p-3 text-ink-500">{{ item.stockCount ?? '∞' }}</td>
                    <td class="p-3">
                      <button
                        type="button"
                        class="rounded-lg border px-2.5 py-1 text-xs font-bold"
                        [class.border-basil-500]="item.isAvailable"
                        [class.text-basil-600]="item.isAvailable"
                        [class.border-ink-200]="!item.isAvailable"
                        [class.text-ink-400]="!item.isAvailable"
                        (click)="toggleAvailability(item)"
                      >
                        {{ item.isAvailable ? 'Available' : 'Unavailable' }}
                      </button>
                    </td>
                    <td class="p-3">
                      <div class="flex items-center gap-2 text-ink-300">
                        <button type="button" class="hover:text-ink-700" (click)="preview(item)" aria-label="View"><app-icon name="eye" [size]="14" /></button>
                        <button type="button" class="hover:text-ember-600" (click)="edit(item)" aria-label="Edit"><app-icon name="edit" [size]="14" /></button>
                        <button type="button" class="hover:text-ink-700" (click)="duplicate(item)" aria-label="Duplicate"><app-icon name="copy" [size]="14" /></button>
                        <button type="button" class="hover:text-ember-600" (click)="remove(item._id)" aria-label="Delete"><app-icon name="trash" [size]="14" /></button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="p-6 text-center text-ink-400">No menu items yet.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }

        <div class="mt-3 flex items-center gap-1 rounded-lg border border-ink-200 p-1 dark:border-ink-700 w-fit">
          <button type="button" class="rounded-md px-2.5 py-1.5 text-xs font-bold" [class.bg-ink-900]="view() === 'grid'" [class.text-white]="view() === 'grid'" [class.text-ink-500]="view() !== 'grid'" (click)="view.set('grid')">
            <app-icon name="grid" [size]="14" />
          </button>
          <button type="button" class="rounded-md px-2.5 py-1.5 text-xs font-bold" [class.bg-ink-900]="view() === 'table'" [class.text-white]="view() === 'table'" [class.text-ink-500]="view() !== 'table'" (click)="view.set('table')">
            <app-icon name="list" [size]="14" />
          </button>
        </div>
      }
    </app-seller-shell>

    <!-- Reusable card template -->
    <ng-template #itemCard let-item="item">
      <div class="card-surface flex flex-col p-2.5" [class.opacity-60]="!item.isAvailable">
        <div class="group relative">
          @if (item.image) {
            <img [src]="item.image" [alt]="item.name" class="h-32 w-full rounded-lg object-cover transition-transform duration-200 group-hover:scale-105" />
          } @else {
            <div class="flex h-32 w-full items-center justify-center rounded-lg bg-ink-50 text-ink-300 dark:bg-ink-700"><app-icon name="image" [size]="24" /></div>
          }
          @if (bulkMode()) {
            <button type="button" class="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ember-600 shadow" (click)="toggleSelect(item._id)">
              <app-icon [name]="selectedIds().has(item._id) ? 'square-check' : 'square'" [size]="15" />
            </button>
          }
          @if (item.stockCount === 0) {
            <span class="absolute right-1.5 top-1.5 rounded bg-ink-900/80 px-1.5 py-0.5 text-[10px] font-bold text-white">Out of stock</span>
          } @else if (offerFor(item._id)) {
            <span class="absolute right-1.5 top-1.5 rounded bg-ember-600 px-1.5 py-0.5 text-[10px] font-bold text-white">On offer</span>
          }
        </div>

        <div class="mt-2 flex min-w-0 items-start justify-between gap-1">
          <p class="min-w-0 truncate text-sm font-semibold text-ink-900 dark:text-white">{{ item.name }}</p>
          <p class="shrink-0 text-sm font-bold text-ink-900 dark:text-white">{{ item.price | inr }}</p>
        </div>
        @if (item.description) {
          <p class="mt-0.5 line-clamp-2 text-xs text-ink-400">{{ item.description }}</p>
        }
        <p class="mt-1 text-[11px] font-semibold text-ink-400">{{ item.category }}</p>

        <div class="mt-1.5 flex flex-wrap gap-1">
          <span class="h-2.5 w-2.5 self-center rounded-[2px] border" [class.border-basil-500]="item.isVeg" [class.border-ember-600]="!item.isVeg"></span>
          @if (item.isBestseller) {
            <span class="rounded bg-gold-100 px-1.5 py-0.5 text-[10px] font-bold text-gold-700">Bestseller</span>
          }
          @if (item.isFeatured) {
            <span class="rounded bg-ember-100 px-1.5 py-0.5 text-[10px] font-bold text-ember-700">Featured</span>
          }
          @if (item.isRecommended) {
            <span class="rounded bg-basil-100 px-1.5 py-0.5 text-[10px] font-bold text-basil-600">Recommended</span>
          }
          @if (item.stockCount != null && item.stockCount > 0 && item.stockCount <= (item.lowStockThreshold ?? 5)) {
            <span class="rounded bg-ember-100 px-1.5 py-0.5 text-[10px] font-bold text-ember-700">Low stock</span>
          }
        </div>

        <div class="mt-2 flex items-center justify-between border-t border-ink-100 pt-2 text-[11px] text-ink-400 dark:border-ink-700">
          <span>{{ item.stockCount == null ? 'Unlimited stock' : item.stockCount + ' in stock' }}</span>
          <span>Updated {{ timeAgo(item.updatedAt ?? item.createdAt) }}</span>
        </div>

        <div class="mt-2 flex items-center justify-between">
          <button
            type="button"
            class="rounded-full border px-2.5 py-1 text-[11px] font-bold"
            [class.border-basil-500]="item.isAvailable"
            [class.text-basil-600]="item.isAvailable"
            [class.border-ink-200]="!item.isAvailable"
            [class.text-ink-400]="!item.isAvailable"
            (click)="toggleAvailability(item)"
          >
            {{ item.isAvailable ? 'Available' : 'Hidden' }}
          </button>
          <div class="flex items-center gap-2.5 text-ink-300">
            <button type="button" class="hover:text-ink-700" (click)="preview(item)" aria-label="View"><app-icon name="eye" [size]="14" /></button>
            <button type="button" class="hover:text-ember-600" (click)="edit(item)" aria-label="Edit"><app-icon name="edit" [size]="14" /></button>
            <button type="button" class="hover:text-ink-700" (click)="duplicate(item)" aria-label="Duplicate"><app-icon name="copy" [size]="14" /></button>
            <button type="button" class="hover:text-ember-600" (click)="remove(item._id)" aria-label="Delete"><app-icon name="trash" [size]="14" /></button>
          </div>
        </div>
      </div>
    </ng-template>

    @if (previewItem(); as p) {
      <div class="fixed inset-0 z-[95] flex items-center justify-center bg-ink-900/60 p-4" (click)="previewItem.set(null)">
        <div class="w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-ink-800" (click)="$event.stopPropagation()">
          @if (p.image) {
            <img [src]="p.image" [alt]="p.name" class="h-48 w-full object-cover" />
          }
          <div class="p-4">
            <h3 class="font-display text-lg font-bold text-ink-900 dark:text-white">{{ p.name }}</h3>
            <p class="mt-1 text-sm text-ink-500">{{ p.description || 'No description' }}</p>
            <p class="mt-2 font-bold text-ink-900 dark:text-white">{{ p.price | inr }}</p>
          </div>
        </div>
      </div>
    }

    <!-- Category manager -->
    @if (showCategoryManager()) {
      <div class="fixed inset-0 z-[95] flex items-center justify-center bg-ink-900/60 p-4" (click)="showCategoryManager.set(false)">
        <div class="w-full max-w-sm rounded-2xl bg-white p-4 dark:bg-ink-800" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="font-display text-lg font-bold text-ink-900 dark:text-white">Categories</h3>
            <button type="button" class="text-ink-400" (click)="showCategoryManager.set(false)"><app-icon name="x" [size]="16" /></button>
          </div>

          <div class="mt-3 flex gap-2">
            <input [(ngModel)]="newCategoryName" name="newCategoryName" placeholder="New category name" class="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
            <button type="button" class="rounded-lg bg-ember-500 px-3 py-2 text-xs font-bold text-white hover:bg-ember-600" (click)="createCategory()">Add</button>
          </div>

          <div class="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
            @for (c of categoryCounts(); track c.name) {
              <div class="flex items-center justify-between rounded-lg border border-ink-100 p-2.5 dark:border-ink-700">
                @if (editingCategoryOldName() === c.name) {
                  <input [(ngModel)]="editingCategoryName" name="editingCategoryName" class="mr-2 flex-1 rounded-lg border border-ink-200 px-2 py-1 text-sm dark:border-ink-700 dark:bg-ink-900" />
                  <button type="button" class="mr-1 text-xs font-bold text-basil-600" (click)="renameCategory(c.name)">Save</button>
                  <button type="button" class="text-xs font-bold text-ink-400" (click)="editingCategoryOldName.set(null)">Cancel</button>
                } @else {
                  <div>
                    <p class="text-sm font-semibold text-ink-800 dark:text-ink-100">{{ c.name }}</p>
                    <p class="text-xs text-ink-400">{{ c.count }} item(s)</p>
                  </div>
                  <div class="flex items-center gap-2 text-ink-300">
                    <button type="button" class="hover:text-ember-600" (click)="startRenameCategory(c.name)" aria-label="Edit category"><app-icon name="edit" [size]="14" /></button>
                    <button type="button" class="hover:text-ember-600" (click)="deleteCategory(c.name, c.count)" aria-label="Delete category"><app-icon name="trash" [size]="14" /></button>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class SellerMenuComponent implements OnInit {
  @ViewChild('csvInput') csvInput?: ElementRef<HTMLInputElement>;

  items = signal<MenuItem[]>([]);
  categories = signal<FoodCategory[]>([]);
  categoryOrder = signal<string[]>([]);
  coupons = signal<SellerCoupon[]>([]);
  loading = signal(true);

  view = signal<'grid' | 'table'>('grid');
  showForm = signal(false);
  formTab = signal<FormTab>('details');
  submitting = signal(false);
  saveProgress = signal<number | null>(null);
  editingId = signal<string | null>(null);
  previewItem = signal<MenuItem | null>(null);
  weekdays = WEEKDAYS;
  form: ItemForm = EMPTY_FORM();
  formErrors = signal<Partial<Record<'name' | 'price' | 'category' | 'image', string>>>({});
  timeAgo = timeAgo;

  // Search / filter / sort
  searchQuery = signal('');
  categoryFilter = signal('all');
  vegFilter = signal<'all' | 'veg' | 'nonveg'>('all');
  statusFilter = signal<StatusFilter>('all');
  tagFilter = signal<TagFilter>('all');
  sortBy = signal<SortOption>('newest');

  // Bulk selection
  bulkMode = signal(false);
  selectedIds = signal<Set<string>>(new Set());

  // Offers
  showOfferForm = signal(false);
  savingOffer = signal(false);
  offerForm: OfferForm = EMPTY_OFFER_FORM();
  emptyOfferForm = EMPTY_OFFER_FORM;

  // Category manager
  showCategoryManager = signal(false);
  newCategoryName = '';
  editingCategoryOldName = signal<string | null>(null);
  editingCategoryName = '';

  distinctCategories = computed(() => {
    const names = new Set(this.items().map((i) => i.category));
    for (const name of this.categoryOrder()) names.add(name);
    return [...names].sort((a, b) => a.localeCompare(b));
  });

  allCategoryOptions = computed(() => {
    const names = new Set(this.distinctCategories());
    for (const c of this.categories()) names.add(c.name);
    return [...names].sort((a, b) => a.localeCompare(b));
  });

  categoryCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const name of this.distinctCategories()) counts.set(name, 0);
    for (const item of this.items()) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    return this.distinctCategories().map((name) => ({ name, count: counts.get(name) ?? 0 }));
  });

  stats = computed(() => {
    const all = this.items();
    return {
      total: all.length,
      available: all.filter((i) => i.isAvailable && i.stockCount !== 0).length,
      outOfStock: all.filter((i) => i.stockCount === 0).length,
      hidden: all.filter((i) => !i.isAvailable).length,
      categories: this.distinctCategories().length,
      bestsellers: all.filter((i) => i.isBestseller).length,
    };
  });

  hasActiveFilters = computed(
    () =>
      this.searchQuery().trim() !== '' ||
      this.categoryFilter() !== 'all' ||
      this.vegFilter() !== 'all' ||
      this.statusFilter() !== 'all' ||
      this.tagFilter() !== 'all'
  );

  filteredItems = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.categoryFilter();
    const veg = this.vegFilter();
    const status = this.statusFilter();
    const tag = this.tagFilter();

    let result = this.items().filter((item) => {
      if (query && !item.name.toLowerCase().includes(query)) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (veg === 'veg' && !item.isVeg) return false;
      if (veg === 'nonveg' && item.isVeg) return false;
      if (status === 'available' && (!item.isAvailable || item.stockCount === 0)) return false;
      if (status === 'outofstock' && item.stockCount !== 0) return false;
      if (status === 'hidden' && item.isAvailable) return false;
      if (tag === 'recommended' && !item.isRecommended) return false;
      if (tag === 'featured' && !item.isFeatured) return false;
      if (tag === 'bestseller' && !item.isBestseller) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (this.sortBy()) {
        case 'oldest':
          return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'az':
          return a.name.localeCompare(b.name);
        case 'newest':
        default:
          return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      }
    });
    return result;
  });

  groupedItems = computed(() => {
    const byCategory = new Map<string, MenuItem[]>();
    for (const item of this.items()) {
      if (!byCategory.has(item.category)) byCategory.set(item.category, []);
      byCategory.get(item.category)!.push(item);
    }
    for (const groupItems of byCategory.values()) {
      groupItems.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    const order = this.categoryOrder();
    const names = [...byCategory.keys()].sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return names.map((category) => ({ category, items: byCategory.get(category)! }));
  });

  itemOffers = computed(() => {
    const id = this.editingId();
    if (!id) return [];
    return this.coupons().filter((c) => c.applicableItems?.includes(id) || c.comboItems?.includes(id));
  });

  constructor(
    private sellerService: SellerService,
    private categoryService: CategoryService,
    private auth: SellerAuthService,
    private confirmService: ConfirmService,
    public toast: ToastService
  ) {}

  async ngOnInit() {
    this.loading.set(true);
    try {
      const [menuRes, categoryRes, restaurantRes, couponsRes] = await Promise.all([
        this.sellerService.listMenu(),
        this.categoryService.list(),
        this.auth.getMyRestaurant(),
        this.sellerService.listCoupons(),
      ]);
      this.items.set(menuRes.items);
      this.categories.set(categoryRes.categories);
      this.categoryOrder.set(restaurantRes.restaurant?.categoryOrder ?? []);
      this.coupons.set(couponsRes.coupons);
    } finally {
      this.loading.set(false);
    }
  }

  offerFor(itemId: string) {
    return this.coupons().find((c) => c.isActive && (c.applicableItems?.includes(itemId) || c.comboItems?.includes(itemId)));
  }

  clearFilters() {
    this.searchQuery.set('');
    this.categoryFilter.set('all');
    this.vegFilter.set('all');
    this.statusFilter.set('all');
    this.tagFilter.set('all');
  }

  openAddForm() {
    if (this.showForm() && !this.editingId()) {
      this.showForm.set(false);
      return;
    }
    this.editingId.set(null);
    this.form = EMPTY_FORM();
    this.formErrors.set({});
    this.formTab.set('details');
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  edit(item: MenuItem) {
    this.editingId.set(item._id);
    this.form = {
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      category: item.category,
      image: item.image,
      images: item.images?.length ? item.images : item.image ? [item.image] : [],
      isVeg: item.isVeg,
      isBestseller: item.isBestseller,
      isFeatured: item.isFeatured ?? false,
      isRecommended: item.isRecommended ?? false,
      spiceLevel: item.spiceLevel ?? 0,
      stockCount: item.stockCount ?? null,
      lowStockThreshold: item.lowStockThreshold ?? 5,
      scheduledAvailability: item.scheduledAvailability ?? EMPTY_FORM().scheduledAvailability,
    };
    this.formErrors.set({});
    this.formTab.set('details');
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleDay(day: number) {
    const days = this.form.scheduledAvailability.days;
    const idx = days.indexOf(day);
    if (idx === -1) days.push(day);
    else days.splice(idx, 1);
  }

  onImagePicked(e: { dataUrl: string; file: File }) {
    this.form.images.push(e.dataUrl);
  }

  removeImage(index: number) {
    this.form.images.splice(index, 1);
  }

  private validateForm(): boolean {
    const errors: Partial<Record<'name' | 'price' | 'category' | 'image', string>> = {};
    const name = this.form.name.trim();
    if (!name) errors.name = 'Item name is required.';
    else if (name.length > 80) errors.name = 'Item name must be 80 characters or fewer.';
    else {
      const clash = this.items().some((i) => i._id !== this.editingId() && i.name.trim().toLowerCase() === name.toLowerCase());
      if (clash) errors.name = 'You already have an item with this name.';
    }
    if (!this.form.price || this.form.price <= 0) errors.price = 'Price must be greater than 0.';
    if (!this.form.category.trim()) errors.category = 'Category is required.';
    if (this.form.images.length === 0) errors.image = 'At least one image is required.';

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  async onSubmit(e: Event) {
    e.preventDefault();
    if (!this.validateForm()) {
      this.toast.error('Please fix the highlighted fields before saving.');
      return;
    }
    this.submitting.set(true);
    try {
      const payload = {
        name: this.form.name.trim(),
        description: this.form.description.trim(),
        price: this.form.price as number,
        category: this.form.category.trim(),
        image: this.form.images[0] ?? '',
        images: this.form.images,
        isVeg: this.form.isVeg,
        isBestseller: this.form.isBestseller,
        isFeatured: this.form.isFeatured,
        isRecommended: this.form.isRecommended,
        spiceLevel: this.form.spiceLevel,
        stockCount: this.form.stockCount,
        lowStockThreshold: this.form.lowStockThreshold,
        scheduledAvailability: this.form.scheduledAvailability,
      };

      if (this.editingId()) {
        const res = await this.sellerService.updateMenuItem(this.editingId()!, payload, (pct) => this.saveProgress.set(pct));
        this.items.update((items) => items.map((i) => (i._id === res.item._id ? res.item : i)));
        this.toast.success('Menu item updated');
        this.showForm.set(false);
        this.editingId.set(null);
      } else {
        const res = await this.sellerService.createMenuItem(payload, (pct) => this.saveProgress.set(pct));
        this.items.update((items) => [res.item, ...items]);
        this.toast.success('Menu item added');
        this.showForm.set(false);
      }
      this.form = EMPTY_FORM();
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not save item');
    } finally {
      this.submitting.set(false);
      this.saveProgress.set(null);
    }
  }

  async toggleAvailability(item: MenuItem) {
    const res = await this.sellerService.updateMenuItem(item._id, { isAvailable: !item.isAvailable });
    this.items.update((items) => items.map((i) => (i._id === item._id ? res.item : i)));
  }

  async duplicate(item: MenuItem) {
    const res = await this.sellerService.duplicateMenuItem(item._id);
    this.items.update((items) => [res.item, ...items]);
    this.toast.success('Item duplicated');
  }

  preview(item: MenuItem) {
    this.previewItem.set(item);
  }

  async remove(id: string) {
    const ok = await this.confirmService.ask({
      title: 'Delete menu item',
      message: 'Delete this menu item? This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await this.sellerService.deleteMenuItem(id);
    this.items.update((items) => items.filter((i) => i._id !== id));
    this.selectedIds.update((set) => {
      set.delete(id);
      return new Set(set);
    });
    this.toast.success('Menu item removed');
  }

  dropCategory(event: CdkDragDrop<unknown>) {
    const names = this.groupedItems().map((g) => g.category);
    moveItemInArray(names, event.previousIndex, event.currentIndex);
    this.categoryOrder.set(names);
    this.sellerService.updateCategoryOrder(names);
  }

  dropItem(event: CdkDragDrop<MenuItem[]>, groupItems: MenuItem[]) {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(groupItems, event.previousIndex, event.currentIndex);
    groupItems.forEach((item, index) => (item.sortOrder = index));
    // Same object references as in `items()` — reassign to trigger recompute
    // with the new sortOrder values now baked in, so grouping stays stable.
    this.items.set([...this.items()]);
    this.sellerService.reorderMenuItems(groupItems.map((item, index) => ({ id: item._id, sortOrder: index })));
  }

  // ---- Bulk actions ----
  toggleBulkMode() {
    this.bulkMode.update((v) => !v);
    this.selectedIds.set(new Set());
  }

  toggleSelect(id: string) {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  private async withSelected(fn: (id: string) => Promise<void>, successMessage: string) {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;
    for (const id of ids) {
      try {
        await fn(id);
      } catch (err: any) {
        this.toast.error(err?.error?.message ?? `Could not update item ${id}`);
      }
    }
    this.toast.success(successMessage);
    this.selectedIds.set(new Set());
    this.bulkMode.set(false);
  }

  async bulkSetAvailable(available: boolean) {
    await this.withSelected(async (id) => {
      const res = await this.sellerService.updateMenuItem(id, { isAvailable: available });
      this.items.update((items) => items.map((i) => (i._id === id ? res.item : i)));
    }, available ? 'Selected items enabled' : 'Selected items hidden');
  }

  async bulkMoveCategory(e: Event) {
    const category = (e.target as HTMLSelectElement).value;
    if (!category) return;
    await this.withSelected(async (id) => {
      const res = await this.sellerService.updateMenuItem(id, { category });
      this.items.update((items) => items.map((i) => (i._id === id ? res.item : i)));
    }, `Moved to "${category}"`);
    (e.target as HTMLSelectElement).value = '';
  }

  async bulkDelete() {
    const count = this.selectedIds().size;
    const ok = await this.confirmService.ask({
      title: 'Delete selected items',
      message: `Delete ${count} selected item(s)? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await this.withSelected(async (id) => {
      await this.sellerService.deleteMenuItem(id);
      this.items.update((items) => items.filter((i) => i._id !== id));
    }, 'Selected items deleted');
  }

  // ---- Category management ----
  async createCategory() {
    const name = this.newCategoryName.trim();
    if (!name) return;
    if (this.distinctCategories().some((c) => c.toLowerCase() === name.toLowerCase())) {
      this.toast.error('That category already exists');
      return;
    }
    const order = [...this.categoryOrder(), name];
    this.categoryOrder.set(order);
    await this.sellerService.updateCategoryOrder(order);
    this.newCategoryName = '';
    this.toast.success('Category added');
  }

  startRenameCategory(name: string) {
    this.editingCategoryOldName.set(name);
    this.editingCategoryName = name;
  }

  async renameCategory(oldName: string) {
    const newName = this.editingCategoryName.trim();
    if (!newName || newName === oldName) {
      this.editingCategoryOldName.set(null);
      return;
    }
    const affected = this.items().filter((i) => i.category === oldName);
    try {
      await Promise.all(affected.map((item) => this.sellerService.updateMenuItem(item._id, { category: newName })));
      this.items.update((items) => items.map((i) => (i.category === oldName ? { ...i, category: newName } : i)));
      const order = this.categoryOrder().map((c) => (c === oldName ? newName : c));
      this.categoryOrder.set(order);
      await this.sellerService.updateCategoryOrder(order);
      this.toast.success('Category renamed');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not rename category');
    } finally {
      this.editingCategoryOldName.set(null);
    }
  }

  async deleteCategory(name: string, count: number) {
    if (count > 0) {
      this.toast.error(`Move or delete the ${count} item(s) in "${name}" first.`);
      return;
    }
    const ok = await this.confirmService.ask({
      title: 'Delete category',
      message: `Delete the empty category "${name}"?`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    const order = this.categoryOrder().filter((c) => c !== name);
    this.categoryOrder.set(order);
    await this.sellerService.updateCategoryOrder(order);
    this.toast.success('Category deleted');
  }

  // ---- Offers ----
  async saveOffer(e: Event) {
    e.preventDefault();
    const itemId = this.editingId();
    if (!itemId) return;
    if (!this.offerForm.value || this.offerForm.value <= 0) {
      this.toast.error('Enter a discount value greater than 0');
      return;
    }
    this.savingOffer.set(true);
    try {
      const code = `OFFER-${Date.now().toString(36).toUpperCase()}`;
      const payload: Partial<SellerCoupon> = {
        code,
        offerType: this.offerForm.offerType,
        discountType: this.offerForm.discountType,
        value: this.offerForm.value,
        expiresAt: this.offerForm.expiresAt || null,
      } as Partial<SellerCoupon>;
      if (this.offerForm.offerType === 'bogo') {
        payload.buyQty = this.offerForm.buyQty;
        payload.getQty = this.offerForm.getQty;
      }
      if (this.offerForm.offerType === 'combo') {
        payload.comboPrice = this.offerForm.comboPrice ?? undefined;
        (payload as any).comboItems = [itemId];
      } else {
        (payload as any).applicableItems = [itemId];
      }
      const res = await this.sellerService.createCoupon(payload);
      this.coupons.update((list) => [res.coupon, ...list]);
      this.toast.success('Offer added');
      this.showOfferForm.set(false);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not save offer');
    } finally {
      this.savingOffer.set(false);
    }
  }

  async removeOffer(id: string) {
    const ok = await this.confirmService.ask({
      title: 'Remove offer',
      message: 'Remove this offer?',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    await this.sellerService.deleteCoupon(id);
    this.coupons.update((list) => list.filter((c) => c._id !== id));
    this.toast.success('Offer removed');
  }

  // ---- Import / Export ----
  triggerImport() {
    this.csvInput?.nativeElement.click();
  }

  exportCsv() {
    const rows = [
      ['Name', 'Description', 'Price', 'Category', 'Veg', 'Bestseller', 'Featured', 'Recommended', 'Available', 'StockCount', 'LowStockThreshold'],
      ...this.items().map((i) => [
        i.name,
        i.description ?? '',
        i.price,
        i.category,
        i.isVeg ? 'yes' : 'no',
        i.isBestseller ? 'yes' : 'no',
        i.isFeatured ? 'yes' : 'no',
        i.isRecommended ? 'yes' : 'no',
        i.isAvailable ? 'yes' : 'no',
        i.stockCount ?? '',
        i.lowStockThreshold ?? '',
      ]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feastgo-menu-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async onImportFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      this.toast.error('That CSV file has no data rows');
      input.value = '';
      return;
    }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (col: string) => header.indexOf(col);
    const nameIdx = idx('name');
    const priceIdx = idx('price');
    const categoryIdx = idx('category');
    if (nameIdx === -1 || priceIdx === -1 || categoryIdx === -1) {
      this.toast.error('CSV must include Name, Price and Category columns');
      input.value = '';
      return;
    }
    const descIdx = idx('description');
    const vegIdx = idx('veg');

    let imported = 0;
    let failed = 0;
    for (const row of rows.slice(1)) {
      const name = row[nameIdx]?.trim();
      const price = Number(row[priceIdx]);
      const category = row[categoryIdx]?.trim();
      if (!name || !category || !Number.isFinite(price) || price <= 0) {
        failed++;
        continue;
      }
      try {
        const res = await this.sellerService.createMenuItem({
          name,
          price,
          category,
          description: descIdx !== -1 ? row[descIdx]?.trim() : '',
          isVeg: vegIdx !== -1 ? /^y/i.test(row[vegIdx] ?? 'y') : true,
        });
        this.items.update((items) => [res.item, ...items]);
        imported++;
      } catch {
        failed++;
      }
    }
    input.value = '';
    if (imported > 0) this.toast.success(`Imported ${imported} item(s)${failed ? `, ${failed} skipped` : ''}`);
    else this.toast.error('No items could be imported — check the file format');
  }
}
