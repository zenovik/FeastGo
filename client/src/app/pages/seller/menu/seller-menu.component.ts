import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MenuItem, ScheduledAvailability } from '../../../core/models/menu-item.model';
import { SellerAuthService } from '../../../core/services/seller-auth.service';
import { SellerService } from '../../../core/services/seller.service';
import { ToastService } from '../../../core/services/toast.service';
import { CategoryService, FoodCategory } from '../../../core/services/category.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';
import { SellerShellComponent } from '../../../shared/components/seller-shell/seller-shell.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

interface ItemForm {
  name: string;
  price: number | null;
  category: string;
  image: string;
  images: string[];
  isVeg: boolean;
  isBestseller: boolean;
  isFeatured: boolean;
  isRecommended: boolean;
  stockCount: number | null;
  lowStockThreshold: number;
  scheduledAvailability: ScheduledAvailability;
}

const EMPTY_FORM = (): ItemForm => ({
  name: '',
  price: null,
  category: '',
  image: '',
  images: [],
  isVeg: true,
  isBestseller: false,
  isFeatured: false,
  isRecommended: false,
  stockCount: null,
  lowStockThreshold: 5,
  scheduledAvailability: { enabled: false, days: [0, 1, 2, 3, 4, 5, 6], startTime: '00:00', endTime: '23:59' },
});

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-seller-menu',
  standalone: true,
  imports: [FormsModule, DragDropModule, IconComponent, SellerShellComponent, InrPipe, ImageUploadComponent],
  template: `
    <app-seller-shell title="Menu">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-1 rounded-lg border border-ink-200 p-1 dark:border-ink-700">
          <button
            type="button"
            class="rounded-md px-2.5 py-1.5 text-xs font-bold"
            [class.bg-ink-900]="view() === 'grid'"
            [class.text-white]="view() === 'grid'"
            [class.text-ink-500]="view() !== 'grid'"
            (click)="view.set('grid')"
          >
            <app-icon name="grid" [size]="14" />
          </button>
          <button
            type="button"
            class="rounded-md px-2.5 py-1.5 text-xs font-bold"
            [class.bg-ink-900]="view() === 'table'"
            [class.text-white]="view() === 'table'"
            [class.text-ink-500]="view() !== 'table'"
            (click)="view.set('table')"
          >
            <app-icon name="list" [size]="14" />
          </button>
        </div>
        <button type="button" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white" (click)="openAddForm()">
          {{ showForm() ? 'Cancel' : '+ Add item' }}
        </button>
      </div>

      @if (showForm()) {
        <form class="card-surface mt-4 space-y-3 p-4" (submit)="onSubmit($event)">
          <input [(ngModel)]="form.name" name="name" required placeholder="Item name" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
          <div class="grid grid-cols-2 gap-2">
            <input type="number" [(ngModel)]="form.price" name="price" required placeholder="Price" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />
            <select [(ngModel)]="form.category" name="category" required class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900">
              <option value="" disabled>Select category</option>
              @for (c of categories(); track c._id) {
                <option [value]="c.name">{{ c.name }}</option>
              }
            </select>
          </div>

          <div>
            <p class="mb-1 text-xs font-semibold text-ink-500">Images (first is the primary image)</p>
            <div class="flex flex-wrap items-center gap-2">
              @for (img of form.images; track $index) {
                <div class="relative">
                  <img [src]="img" alt="Preview" class="h-14 w-14 rounded-lg object-cover" />
                  <button type="button" class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-white" (click)="removeImage($index)">
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

          <button type="submit" [disabled]="submitting()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {{ submitting() ? 'Saving…' : editingId() ? 'Save changes' : 'Add item' }}
          </button>
        </form>
      }

      @if (view() === 'grid') {
        <div cdkDropList (cdkDropListDropped)="dropCategory($event)" class="mt-4 space-y-5">
          @for (group of groupedItems(); track group.category) {
            <div cdkDrag [cdkDragData]="group.category" class="card-surface p-4">
              <div class="flex cursor-move items-center gap-2" cdkDragHandle>
                <app-icon name="grip" [size]="14" class="text-ink-300" />
                <h3 class="font-display text-sm font-bold text-ink-900 dark:text-white">{{ group.category }}</h3>
                <span class="text-xs text-ink-400">({{ group.items.length }})</span>
              </div>
              <div cdkDropList [cdkDropListData]="group.items" (cdkDropListDropped)="dropItem($event, group.items)" class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                @for (item of group.items; track item._id) {
                  <div cdkDrag class="flex items-center gap-3 rounded-lg border border-ink-100 p-2.5 dark:border-ink-700">
                    @if (item.image) {
                      <img [src]="item.image" [alt]="item.name" class="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    }
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-semibold text-ink-900 dark:text-white">{{ item.name }}</p>
                      <p class="text-xs text-ink-400">{{ item.price | inr }}</p>
                      <div class="mt-1 flex flex-wrap gap-1">
                        <span class="h-2.5 w-2.5 rounded-[2px] border" [class.border-basil-500]="item.isVeg" [class.border-ember-600]="!item.isVeg"></span>
                        @if (item.isBestseller) {
                          <span class="rounded bg-gold-100 px-1.5 py-0.5 text-[10px] font-bold text-gold-700">Bestseller</span>
                        }
                        @if (item.isFeatured) {
                          <span class="rounded bg-ember-100 px-1.5 py-0.5 text-[10px] font-bold text-ember-700">Featured</span>
                        }
                        @if (item.isRecommended) {
                          <span class="rounded bg-basil-100 px-1.5 py-0.5 text-[10px] font-bold text-basil-600">Recommended</span>
                        }
                        @if (item.stockCount != null && item.stockCount <= (item.lowStockThreshold ?? 5)) {
                          <span class="rounded bg-ember-100 px-1.5 py-0.5 text-[10px] font-bold text-ember-700">Low stock</span>
                        }
                      </div>
                    </div>
                    <div class="flex shrink-0 flex-col items-end gap-1">
                      <button type="button" class="text-ink-300 hover:text-ink-700" (click)="preview(item)" aria-label="Preview">
                        <app-icon name="image" [size]="14" />
                      </button>
                      <button type="button" class="text-ink-300 hover:text-ember-600" (click)="edit(item)" aria-label="Edit">
                        <app-icon name="edit" [size]="14" />
                      </button>
                      <button type="button" class="text-ink-300 hover:text-ink-700" (click)="duplicate(item)" aria-label="Duplicate">
                        <app-icon name="copy" [size]="14" />
                      </button>
                      <button type="button" class="text-ink-300 hover:text-ember-600" (click)="remove(item._id)" aria-label="Delete">
                        <app-icon name="trash" [size]="14" />
                      </button>
                    </div>
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
              @for (item of items(); track item._id) {
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
                      <button type="button" class="hover:text-ember-600" (click)="edit(item)"><app-icon name="edit" [size]="14" /></button>
                      <button type="button" class="hover:text-ink-700" (click)="duplicate(item)"><app-icon name="copy" [size]="14" /></button>
                      <button type="button" class="hover:text-ember-600" (click)="remove(item._id)"><app-icon name="trash" [size]="14" /></button>
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
    </app-seller-shell>

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
  `,
})
export class SellerMenuComponent implements OnInit {
  items = signal<MenuItem[]>([]);
  categories = signal<FoodCategory[]>([]);
  categoryOrder = signal<string[]>([]);
  view = signal<'grid' | 'table'>('grid');
  showForm = signal(false);
  submitting = signal(false);
  saveProgress = signal<number | null>(null);
  editingId = signal<string | null>(null);
  previewItem = signal<MenuItem | null>(null);
  weekdays = WEEKDAYS;
  form: ItemForm = EMPTY_FORM();

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

  constructor(
    private sellerService: SellerService,
    private categoryService: CategoryService,
    private auth: SellerAuthService,
    public toast: ToastService
  ) {}

  async ngOnInit() {
    const [menuRes, categoryRes, restaurantRes] = await Promise.all([
      this.sellerService.listMenu(),
      this.categoryService.list(),
      this.auth.getMyRestaurant(),
    ]);
    this.items.set(menuRes.items);
    this.categories.set(categoryRes.categories);
    this.categoryOrder.set(restaurantRes.restaurant?.categoryOrder ?? []);
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

  edit(item: MenuItem) {
    this.editingId.set(item._id);
    this.form = {
      name: item.name,
      price: item.price,
      category: item.category,
      image: item.image,
      images: item.images?.length ? item.images : item.image ? [item.image] : [],
      isVeg: item.isVeg,
      isBestseller: item.isBestseller,
      isFeatured: item.isFeatured ?? false,
      isRecommended: item.isRecommended ?? false,
      stockCount: item.stockCount ?? null,
      lowStockThreshold: item.lowStockThreshold ?? 5,
      scheduledAvailability: item.scheduledAvailability ?? EMPTY_FORM().scheduledAvailability,
    };
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

  async onSubmit(e: Event) {
    e.preventDefault();
    if (!this.form.name.trim() || !this.form.price || !this.form.category.trim()) return;
    this.submitting.set(true);
    try {
      const payload = {
        name: this.form.name.trim(),
        price: this.form.price,
        category: this.form.category.trim(),
        image: this.form.images[0] ?? '',
        images: this.form.images,
        isVeg: this.form.isVeg,
        isBestseller: this.form.isBestseller,
        isFeatured: this.form.isFeatured,
        isRecommended: this.form.isRecommended,
        stockCount: this.form.stockCount,
        lowStockThreshold: this.form.lowStockThreshold,
        scheduledAvailability: this.form.scheduledAvailability,
      };

      if (this.editingId()) {
        const res = await this.sellerService.updateMenuItem(this.editingId()!, payload, (pct) => this.saveProgress.set(pct));
        this.items.update((items) => items.map((i) => (i._id === res.item._id ? res.item : i)));
        this.toast.success('Menu item updated');
      } else {
        const res = await this.sellerService.createMenuItem(payload, (pct) => this.saveProgress.set(pct));
        this.items.update((items) => [res.item, ...items]);
        this.toast.success('Menu item added');
      }
      this.showForm.set(false);
      this.editingId.set(null);
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
    if (!confirm('Delete this menu item? This cannot be undone.')) return;
    await this.sellerService.deleteMenuItem(id);
    this.items.update((items) => items.filter((i) => i._id !== id));
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
}
