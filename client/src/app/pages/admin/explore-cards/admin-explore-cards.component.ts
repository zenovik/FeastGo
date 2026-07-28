import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ExploreCard, ExploreCardFilters } from '../../../core/models/explore-card.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';

const ICON_OPTIONS = [
  'percent', 'bolt', 'star', 'bike', 'banknote', 'leaf', 'map-pin', 'megaphone', 'flame', 'compass', 'clock', 'moon',
  'users', 'heart', 'shield-check', 'truck', 'layers', 'sun', 'package', 'store', 'chef-hat', 'sliders', 'grid',
  'receipt', 'credit-card', 'alert-triangle', 'info', 'calendar',
];

const BOOL_FILTER_KEYS: { key: keyof ExploreCardFilters; label: string }[] = [
  { key: 'veg', label: 'Veg only' },
  { key: 'nonVeg', label: 'Non-veg only' },
  { key: 'bestseller', label: 'Bestsellers' },
  { key: 'spicy', label: 'Spicy' },
  { key: 'healthy', label: 'Healthy' },
  { key: 'fastDelivery', label: 'Fast delivery (≤30 min)' },
  { key: 'under199', label: 'Under ₹199' },
  { key: 'offers', label: 'Has an active offer' },
  { key: 'topRated', label: 'Rating ≥ 4.5' },
  { key: 'newArrival', label: 'New arrivals' },
  { key: 'featured', label: 'Featured/premium restaurants' },
  { key: 'freeDelivery', label: 'Free delivery' },
  { key: 'bogo', label: 'Buy 1 Get 1 offer' },
];

const SORT_OPTIONS = ['', 'popular', 'rating', 'price_low', 'price_high', 'fastest', 'recommended'];
const PRICE_RANGE_OPTIONS = ['', 'under199', '199-399', '399plus'];

interface CardForm {
  title: string;
  subtitle: string;
  icon: string;
  image: string;
  gradientFrom: string;
  gradientTo: string;
  badge: string;
  route: string;
  q: string;
  minRating: number | null;
  priceRange: string;
  sort: string;
  bools: Record<string, boolean>;
}

function emptyForm(): CardForm {
  return {
    title: '',
    subtitle: '',
    icon: 'percent',
    image: '',
    gradientFrom: '#ff5127',
    gradientTo: '#7f2010',
    badge: '',
    route: '/restaurants',
    q: '',
    minRating: null,
    priceRange: '',
    sort: '',
    bools: {},
  };
}

@Component({
  selector: 'app-admin-explore-cards',
  standalone: true,
  imports: [FormsModule, DragDropModule, IconComponent, AdminShellComponent, ImageUploadComponent],
  template: `
    <app-admin-shell title="Explore Cards">
      <p class="text-sm text-ink-500 dark:text-ink-400">
        Manage the "Explore More" rail on the customer home page — each card links to the food listing page with its
        filters pre-applied. Drag to reorder.
      </p>

      @if (!showForm()) {
        <button type="button" class="mt-3 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white" (click)="startCreate()">
          + Add explore card
        </button>
      }

      @if (showForm()) {
        <form class="card-surface mt-3 space-y-3 p-4" (submit)="onSave($event)">
          <h2 class="font-display text-base font-bold text-ink-900 dark:text-white">{{ editingId() ? 'Edit card' : 'New card' }}</h2>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">
              Title
              <input [(ngModel)]="form.title" name="title" required class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
            <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">
              Subtitle
              <input [(ngModel)]="form.subtitle" name="subtitle" placeholder="Short description" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">
              Icon
              <select [(ngModel)]="form.icon" name="icon" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white">
                @for (i of iconOptions; track i) { <option [value]="i">{{ i }}</option> }
              </select>
            </label>
            <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">
              Gradient start
              <input type="color" [(ngModel)]="form.gradientFrom" name="gradientFrom" class="mt-1 h-9 w-full rounded-lg border border-ink-200 dark:border-ink-700" />
            </label>
            <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">
              Gradient end
              <input type="color" [(ngModel)]="form.gradientTo" name="gradientTo" class="mt-1 h-9 w-full rounded-lg border border-ink-200 dark:border-ink-700" />
            </label>
          </div>

          <div class="flex items-center gap-3">
            <app-image-upload
              #imageUpload
              shape="banner"
              [maxBytes]="3000000"
              [value]="form.image || null"
              [uploading]="saving()"
              [progress]="saveProgress()"
              (picked)="onImagePicked($event)"
              (invalidFile)="toast.error($event)"
              label="Card image (optional — falls back to the gradient)"
            />
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">
              Offer badge (optional)
              <input [(ngModel)]="form.badge" name="badge" placeholder="e.g. 50% OFF" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
            <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">
              Navigation route
              <input [(ngModel)]="form.route" name="route" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
          </div>

          <div class="rounded-lg border border-ink-100 p-3 dark:border-ink-700">
            <p class="text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Filters applied on click</p>
            <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">
                Search text
                <input [(ngModel)]="form.q" name="q" placeholder="e.g. breakfast" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
              </label>
              <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">
                Price range
                <select [(ngModel)]="form.priceRange" name="priceRange" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white">
                  @for (p of priceRangeOptions; track p) { <option [value]="p">{{ p || 'Any' }}</option> }
                </select>
              </label>
              <label class="block text-xs font-semibold text-ink-500 dark:text-ink-400">
                Sort
                <select [(ngModel)]="form.sort" name="sortField" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white">
                  @for (s of sortOptions; track s) { <option [value]="s">{{ s || 'Default' }}</option> }
                </select>
              </label>
            </div>

            <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              @for (f of boolFilterKeys; track f.key) {
                <label class="flex items-center gap-1.5 text-xs font-medium text-ink-600 dark:text-ink-300">
                  <input type="checkbox" [(ngModel)]="form.bools[f.key]" [name]="f.key" /> {{ f.label }}
                </label>
              }
            </div>
          </div>

          <div class="flex gap-2">
            <button type="submit" [disabled]="saving()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {{ saving() ? 'Saving…' : editingId() ? 'Update card' : 'Add card' }}
            </button>
            <button type="button" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-500 dark:border-ink-700 dark:text-ink-400" (click)="cancelForm()">Cancel</button>
          </div>
        </form>
      }

      <div class="mt-4 space-y-2" cdkDropList (cdkDropListDropped)="drop($event)">
        @for (card of cards(); track card._id) {
          <div class="card-surface flex items-center gap-3 p-3.5" cdkDrag>
            <span class="cursor-grab text-ink-300" cdkDragHandle>
              <app-icon name="grip" [size]="16" />
            </span>
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
              [style.background]="'linear-gradient(135deg,' + card.gradientFrom + ',' + card.gradientTo + ')'"
            >
              <app-icon [name]="card.icon" [size]="20" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-ink-900 dark:text-white">
                {{ card.title }}
                @if (card.badge) {
                  <span class="ml-1.5 rounded-full bg-ember-100 px-2 py-0.5 text-[10px] font-bold text-ember-700">{{ card.badge }}</span>
                }
              </p>
              <p class="truncate text-xs text-ink-400 dark:text-ink-500">{{ card.subtitle || card.route }}</p>
            </div>
            <label class="flex items-center gap-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">
              <input type="checkbox" [checked]="card.isActive" (change)="toggleActive(card)" /> Active
            </label>
            <button type="button" class="text-ink-300 hover:text-ember-600" (click)="startEdit(card)" aria-label="Edit">
              <app-icon name="edit" [size]="16" />
            </button>
            <button type="button" class="text-ink-300 hover:text-ember-600" (click)="remove(card._id)" aria-label="Delete">
              <app-icon name="trash" [size]="16" />
            </button>
          </div>
        } @empty {
          <p class="text-sm text-ink-400">No explore cards yet.</p>
        }
      </div>
    </app-admin-shell>
  `,
})
export class AdminExploreCardsComponent implements OnInit {
  iconOptions = ICON_OPTIONS;
  boolFilterKeys = BOOL_FILTER_KEYS;
  sortOptions = SORT_OPTIONS;
  priceRangeOptions = PRICE_RANGE_OPTIONS;

  cards = signal<ExploreCard[]>([]);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  saving = signal(false);
  saveProgress = signal<number | null>(null);

  form: CardForm = emptyForm();

  constructor(
    private adminService: AdminService,
    public toast: ToastService
  ) {}

  async ngOnInit() {
    const res = await this.adminService.listExploreCards();
    this.cards.set(res.cards);
  }

  startCreate() {
    this.form = emptyForm();
    this.editingId.set(null);
    this.showForm.set(true);
  }

  startEdit(card: ExploreCard) {
    const bools: Record<string, boolean> = {};
    for (const { key } of BOOL_FILTER_KEYS) bools[key] = !!card.filters?.[key];
    this.form = {
      title: card.title,
      subtitle: card.subtitle,
      icon: card.icon,
      image: card.image,
      gradientFrom: card.gradientFrom,
      gradientTo: card.gradientTo,
      badge: card.badge,
      route: card.route,
      q: card.filters?.q ?? '',
      minRating: card.filters?.minRating ?? null,
      priceRange: card.filters?.priceRange ?? '',
      sort: card.filters?.sort ?? '',
      bools,
    };
    this.editingId.set(card._id);
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  onImagePicked(e: { dataUrl: string; file: File }) {
    this.form.image = e.dataUrl;
  }

  private buildFilters(): ExploreCardFilters {
    const filters: ExploreCardFilters = {};
    if (this.form.q.trim()) filters.q = this.form.q.trim();
    if (this.form.minRating) filters.minRating = this.form.minRating;
    if (this.form.priceRange) filters.priceRange = this.form.priceRange as ExploreCardFilters['priceRange'];
    if (this.form.sort) filters.sort = this.form.sort as ExploreCardFilters['sort'];
    for (const { key } of BOOL_FILTER_KEYS) {
      if (this.form.bools[key]) (filters as Record<string, unknown>)[key] = true;
    }
    return filters;
  }

  async onSave(e: Event) {
    e.preventDefault();
    if (!this.form.title.trim()) {
      this.toast.error('Card title is required');
      return;
    }
    const payload: Partial<ExploreCard> = {
      title: this.form.title.trim(),
      subtitle: this.form.subtitle.trim(),
      icon: this.form.icon,
      image: this.form.image,
      gradientFrom: this.form.gradientFrom,
      gradientTo: this.form.gradientTo,
      badge: this.form.badge.trim(),
      route: this.form.route.trim() || '/restaurants',
      filters: this.buildFilters(),
    };

    this.saving.set(true);
    this.saveProgress.set(0);
    try {
      const editingId = this.editingId();
      if (editingId) {
        const res = await this.adminService.updateExploreCard(editingId, payload, (pct) => this.saveProgress.set(pct));
        this.cards.update((list) => list.map((c) => (c._id === editingId ? res.card : c)));
        this.toast.success('Card updated');
      } else {
        const res = await this.adminService.createExploreCard(payload, (pct) => this.saveProgress.set(pct));
        this.cards.update((list) => [...list, res.card]);
        this.toast.success('Card added');
      }
      this.showForm.set(false);
      this.editingId.set(null);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not save card');
    } finally {
      this.saving.set(false);
      this.saveProgress.set(null);
    }
  }

  async toggleActive(card: ExploreCard) {
    const res = await this.adminService.updateExploreCard(card._id, { isActive: !card.isActive });
    this.cards.update((list) => list.map((c) => (c._id === card._id ? res.card : c)));
  }

  async drop(event: CdkDragDrop<ExploreCard[]>) {
    const list = [...this.cards()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.cards.set(list);
    await this.adminService.reorderExploreCards(list.map((c) => c._id));
  }

  async remove(id: string) {
    if (!confirm('Delete this explore card? This cannot be undone.')) return;
    await this.adminService.deleteExploreCard(id);
    this.cards.update((list) => list.filter((c) => c._id !== id));
    this.toast.success('Card removed');
  }
}
