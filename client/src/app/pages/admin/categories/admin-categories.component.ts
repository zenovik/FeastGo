import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { AdminCategory, AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { validateImageFile, readImageFileAsDataUrl } from '../../../shared/utils/image-file';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [FormsModule, DragDropModule, IconComponent, AdminShellComponent],
  template: `
    <app-admin-shell title="Categories">
      <form class="card-surface flex flex-wrap items-center gap-2 p-4" (submit)="onCreate($event)">
        <label class="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-ink-200 text-ink-400 hover:border-ember-400 dark:border-ink-700">
          @if (image) {
            <img [src]="image" alt="" class="h-full w-full object-cover" />
          } @else {
            <app-icon name="camera" [size]="16" />
          }
          <input type="file" accept="image/*" class="hidden" (change)="onImagePick($event)" />
        </label>
        <input [(ngModel)]="name" name="name" required placeholder="Category name" class="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
        <button type="submit" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white">Add</button>
      </form>

      <p class="mt-2 text-xs text-ink-400">Drag to reorder how categories appear to customers.</p>

      <div class="mt-3 space-y-2" cdkDropList (cdkDropListDropped)="drop($event)">
        @for (category of categories(); track category._id) {
          <div class="card-surface flex items-center gap-3 p-3.5" cdkDrag>
            <span class="cursor-grab text-ink-300" cdkDragHandle>
              <app-icon name="grip" [size]="16" />
            </span>
            <label class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-ink-100 text-ink-400 hover:opacity-80 dark:bg-ink-700">
              @if (category.image) {
                <img [src]="category.image" alt="" class="h-full w-full object-cover" />
              } @else {
                <app-icon name="image" [size]="15" />
              }
              <input type="file" accept="image/*" class="hidden" (change)="onImageReplace($event, category)" />
            </label>
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

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    const res = await this.adminService.listCategories();
    this.categories.set(res.categories);
  }

  async onImagePick(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const error = validateImageFile(file, 2_000_000);
    if (error) {
      this.toast.error(error);
      return;
    }
    this.image = await readImageFileAsDataUrl(file);
  }

  async onImageReplace(e: Event, category: AdminCategory) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const error = validateImageFile(file, 2_000_000);
    if (error) {
      this.toast.error(error);
      input.value = '';
      return;
    }
    const image = await readImageFileAsDataUrl(file);
    const res = await this.adminService.updateCategory(category._id, { image });
    this.categories.update((list) => list.map((c) => (c._id === category._id ? res.category : c)));
    this.toast.success('Category image updated');
  }

  async onCreate(e: Event) {
    e.preventDefault();
    if (!this.name.trim()) return;
    const res = await this.adminService.createCategory({ name: this.name.trim(), image: this.image || undefined });
    this.categories.update((categories) => [...categories, res.category]);
    this.name = '';
    this.image = '';
    this.toast.success('Category added');
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
