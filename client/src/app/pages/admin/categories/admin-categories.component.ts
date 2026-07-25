import { Component, OnInit, QueryList, ViewChild, ViewChildren, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { AdminCategory, AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [FormsModule, DragDropModule, IconComponent, AdminShellComponent, ImageUploadComponent],
  template: `
    <app-admin-shell title="Categories">
      <form class="card-surface flex flex-wrap items-center gap-2 p-4" (submit)="onCreate($event)">
        <app-image-upload
          #createUpload
          shape="square"
          size="sm"
          [maxBytes]="2000000"
          [value]="image || null"
          [uploading]="creating()"
          [progress]="createProgress()"
          (picked)="onCreateImagePicked($event)"
          (invalidFile)="toast.error($event)"
          label=""
        />
        <input [(ngModel)]="name" name="name" required placeholder="Category name" class="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
        <button type="submit" [disabled]="!name.trim() || !image || creating()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
          {{ creating() ? 'Adding…' : 'Add' }}
        </button>
      </form>
      <p class="mt-2 text-xs text-ink-400">Name and an image are both required to add a category. Drag to reorder how categories appear to customers.</p>

      <div class="mt-3 space-y-2" cdkDropList (cdkDropListDropped)="drop($event)">
        @for (category of categories(); track category._id; let i = $index) {
          <div class="card-surface flex items-center gap-3 p-3.5" cdkDrag>
            <span class="cursor-grab text-ink-300" cdkDragHandle>
              <app-icon name="grip" [size]="16" />
            </span>
            <app-image-upload
              #rowUpload
              shape="square"
              size="sm"
              [maxBytes]="2000000"
              [value]="category.image || null"
              [uploading]="replacingId() === category._id"
              [progress]="replacingId() === category._id ? replaceProgress() : null"
              (picked)="onImageReplace($event, category, i)"
              (invalidFile)="toast.error($event)"
              label=""
            />
            <p class="flex-1 text-sm font-semibold text-ink-900 dark:text-white">{{ category.name }}</p>
            <label class="flex items-center gap-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">
              <input type="checkbox" [checked]="category.isActive" (change)="toggleActive(category)" /> Active
            </label>
            <button type="button" class="text-ink-300 hover:text-ember-600" (click)="remove(category._id)">
              <app-icon name="trash" [size]="16" />
            </button>
          </div>
        } @empty {
          <p class="text-sm text-ink-400">No categories yet.</p>
        }
      </div>
    </app-admin-shell>
  `,
})
export class AdminCategoriesComponent implements OnInit {
  categories = signal<AdminCategory[]>([]);
  name = '';
  image = '';
  creating = signal(false);
  createProgress = signal<number | null>(null);
  replacingId = signal<string | null>(null);
  replaceProgress = signal<number | null>(null);

  @ViewChild('createUpload') createUpload?: ImageUploadComponent;
  @ViewChildren('rowUpload') rowUploads!: QueryList<ImageUploadComponent>;

  constructor(
    private adminService: AdminService,
    public toast: ToastService
  ) {}

  async ngOnInit() {
    const res = await this.adminService.listCategories();
    this.categories.set(res.categories);
  }

  onCreateImagePicked(e: { dataUrl: string; file: File }) {
    this.image = e.dataUrl;
  }

  async onImageReplace(e: { dataUrl: string; file: File }, category: AdminCategory, index: number) {
    this.replacingId.set(category._id);
    this.replaceProgress.set(0);
    try {
      const res = await this.adminService.updateCategory(category._id, { image: e.dataUrl }, (pct) => this.replaceProgress.set(pct));
      this.categories.update((list) => list.map((c) => (c._id === category._id ? res.category : c)));
      this.toast.success('Category image updated');
    } catch (err: any) {
      this.rowUploads.get(index)?.discardPending();
      this.toast.error(err?.error?.message ?? 'Could not update category image');
    } finally {
      this.replacingId.set(null);
      this.replaceProgress.set(null);
    }
  }

  async onCreate(e: Event) {
    e.preventDefault();
    if (!this.name.trim()) {
      this.toast.error('Category name is required');
      return;
    }
    if (!this.image) {
      this.toast.error('Category image is required');
      return;
    }
    this.creating.set(true);
    this.createProgress.set(0);
    try {
      const res = await this.adminService.createCategory({ name: this.name.trim(), image: this.image }, (pct) => this.createProgress.set(pct));
      this.categories.update((categories) => [...categories, res.category]);
      this.name = '';
      this.image = '';
      this.toast.success('Category added');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not add category');
    } finally {
      this.creating.set(false);
      this.createProgress.set(null);
    }
  }

  async toggleActive(category: AdminCategory) {
    const res = await this.adminService.updateCategory(category._id, { isActive: !category.isActive });
    this.categories.update((list) => list.map((c) => (c._id === category._id ? res.category : c)));
  }

  async drop(event: CdkDragDrop<AdminCategory[]>) {
    const list = [...this.categories()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.categories.set(list);
    await this.adminService.reorderCategories(list.map((c) => c._id));
  }

  async remove(id: string) {
    if (!confirm('Delete this category? This cannot be undone.')) return;
    await this.adminService.deleteCategory(id);
    this.categories.update((categories) => categories.filter((c) => c._id !== id));
    this.toast.success('Category removed');
  }
}
