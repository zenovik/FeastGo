import { Component, OnInit, QueryList, ViewChildren, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminMenuItem, AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-admin-foods',
  standalone: true,
  imports: [AdminShellComponent, IconComponent, InrPipe, FormsModule, ImageUploadComponent],
  template: `
    <app-admin-shell title="Foods">
      <div class="flex flex-wrap items-center gap-2">
        <input
          [(ngModel)]="query"
          (ngModelChange)="scheduleFetch()"
          placeholder="Search foods…"
          class="w-64 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
        />
        <button type="button" class="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-bold text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800" (click)="toggleTrending()">
          <app-icon name="bar-chart" [size]="14" /> {{ showTrending() ? 'Hide trending' : 'Trending' }}
        </button>
        <p class="text-sm text-ink-400">{{ items().length }} menu items</p>
      </div>

      @if (showTrending()) {
        <div class="card-surface mt-3 flex flex-wrap gap-1.5 p-3">
          @for (t of trending(); track t.name) {
            <span class="rounded-full bg-ember-50 px-2.5 py-1 text-xs font-bold text-ember-700 dark:bg-ember-500/10 dark:text-ember-400">{{ t.name }} × {{ t.qty }}</span>
          } @empty {
            <p class="text-sm text-ink-400">No trending data yet.</p>
          }
        </div>
      }

      <div class="card-surface mt-3 overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="bg-ink-50 text-xs font-semibold uppercase text-ink-400 dark:bg-ink-900/40 dark:text-ink-500">
            <tr>
              <th class="px-4 py-2.5">Photo</th>
              <th class="px-4 py-2.5">Name</th>
              <th class="px-4 py-2.5">Restaurant</th>
              <th class="px-4 py-2.5">Category</th>
              <th class="px-4 py-2.5">Price</th>
              <th class="px-4 py-2.5">Flags</th>
              <th class="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item._id; let i = $index) {
              <tr class="border-t border-ink-100 dark:border-ink-800">
                <td class="px-4 py-2.5">
                  <app-image-upload
                    #imageUpload
                    shape="square"
                    size="sm"
                    [maxBytes]="2000000"
                    [value]="item.image || null"
                    [uploading]="replacingId() === item._id"
                    [progress]="replacingId() === item._id ? replaceProgress() : null"
                    (picked)="onImagePicked($event, item, i)"
                    (invalidFile)="toast.error($event)"
                    label=""
                  />
                </td>
                <td class="px-4 py-2.5 font-medium text-ink-900 dark:text-white">{{ item.name }}</td>
                <td class="px-4 py-2.5 text-ink-600 dark:text-ink-300">{{ item.restaurant?.name ?? '—' }}</td>
                <td class="px-4 py-2.5 text-ink-600 dark:text-ink-300">{{ item.category }}</td>
                <td class="px-4 py-2.5 text-ink-600 dark:text-ink-300">{{ item.price | inr }}</td>
                <td class="px-4 py-2.5">
                  <div class="flex flex-wrap gap-1">
                    @if (item.isFeatured) { <span class="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-bold text-gold-700">Featured</span> }
                    @if (item.isBestseller) { <span class="rounded-full bg-ember-100 px-2 py-0.5 text-[10px] font-bold text-ember-700">Bestseller</span> }
                    @if (item.isHiddenByAdmin) { <span class="rounded-full bg-ink-800 px-2 py-0.5 text-[10px] font-bold text-white">Hidden</span> }
                  </div>
                </td>
                <td class="px-4 py-2.5 text-right">
                  <div class="flex justify-end gap-2">
                    <button type="button" class="text-xs font-bold text-ink-600 dark:text-ink-300" (click)="toggleFeatured(item)">
                      {{ item.isFeatured ? 'Unfeature' : 'Feature' }}
                    </button>
                    <button type="button" class="text-xs font-bold" [class.text-ember-600]="!item.isHiddenByAdmin" [class.text-basil-600]="item.isHiddenByAdmin" (click)="toggleHidden(item)">
                      {{ item.isHiddenByAdmin ? 'Unhide' : 'Hide' }}
                    </button>
                    <button type="button" class="text-ink-300 hover:text-ember-600" (click)="remove(item)">
                      <app-icon name="trash" [size]="15" />
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="px-4 py-8 text-center text-sm text-ink-400">No menu items found.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </app-admin-shell>
  `,
})
export class AdminFoodsComponent implements OnInit {
  items = signal<AdminMenuItem[]>([]);
  query = '';
  showTrending = signal(false);
  trending = signal<{ name: string; qty: number }[]>([]);
  replacingId = signal<string | null>(null);
  replaceProgress = signal<number | null>(null);

  @ViewChildren('imageUpload') imageUploads!: QueryList<ImageUploadComponent>;

  private fetchTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private adminService: AdminService,
    public toast: ToastService
  ) {}

  async ngOnInit() {
    await this.fetch();
  }

  scheduleFetch() {
    clearTimeout(this.fetchTimer);
    this.fetchTimer = setTimeout(() => this.fetch(), 300);
  }

  async fetch() {
    const res = await this.adminService.listFoods(this.query.trim() || undefined);
    this.items.set(res.items);
  }

  async toggleTrending() {
    this.showTrending.update((v) => !v);
    if (this.showTrending() && this.trending().length === 0) {
      const res = await this.adminService.listTrendingFoods();
      this.trending.set(res.items);
    }
  }

  async onImagePicked(e: { dataUrl: string; file: File }, item: AdminMenuItem, index: number) {
    this.replacingId.set(item._id);
    this.replaceProgress.set(0);
    try {
      const res = await this.adminService.updateFood(item._id, { image: e.dataUrl }, (pct) => this.replaceProgress.set(pct));
      this.items.update((list) => list.map((x) => (x._id === item._id ? res.item : x)));
      this.toast.success('Food image updated');
    } catch (err: any) {
      this.imageUploads.get(index)?.discardPending();
      this.toast.error(err?.error?.message ?? 'Could not update food image');
    } finally {
      this.replacingId.set(null);
      this.replaceProgress.set(null);
    }
  }

  async toggleFeatured(item: AdminMenuItem) {
    const res = await this.adminService.updateFood(item._id, { isFeatured: !item.isFeatured });
    this.items.update((list) => list.map((x) => (x._id === item._id ? res.item : x)));
  }

  async toggleHidden(item: AdminMenuItem) {
    const res = await this.adminService.setFoodHidden(item._id, !item.isHiddenByAdmin);
    this.items.update((list) => list.map((x) => (x._id === item._id ? res.item : x)));
    this.toast.success(res.item.isHiddenByAdmin ? 'Item hidden from customers' : 'Item visible to customers');
  }

  async remove(item: AdminMenuItem) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await this.adminService.deleteFood(item._id);
    this.items.update((list) => list.filter((x) => x._id !== item._id));
    this.toast.success('Food item deleted');
  }
}
