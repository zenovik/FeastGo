import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminBanner, AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';

interface BannerForm {
  title: string;
  image: string;
  link: string;
  placement: 'homepage' | 'promotional' | 'carousel';
  sortOrder: number;
  startsAt: string;
  expiresAt: string;
}

const EMPTY_FORM = (): BannerForm => ({ title: '', image: '', link: '', placement: 'homepage', sortOrder: 0, startsAt: '', expiresAt: '' });

@Component({
  selector: 'app-admin-banners',
  standalone: true,
  imports: [FormsModule, DatePipe, IconComponent, AdminShellComponent, ImageUploadComponent],
  template: `
    <app-admin-shell title="Banners">
      <div class="flex items-center justify-between">
        <p class="text-sm text-ink-400">Homepage, promotional and carousel banners.</p>
        <button type="button" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white" (click)="openAddForm()">
          {{ showForm() && !editingId() ? 'Cancel' : '+ New banner' }}
        </button>
      </div>

      @if (showForm()) {
        <form class="card-surface mt-4 space-y-3 p-4" (submit)="onSubmit($event)">
          <input [(ngModel)]="form.title" name="title" required placeholder="Banner title" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900" />

          <app-image-upload
            shape="banner"
            [maxBytes]="3000000"
            [value]="form.image || null"
            [uploading]="submitting()"
            [progress]="imageProgress()"
            (picked)="onImagePicked($event)"
            (invalidFile)="toast.error($event)"
            label="Upload banner image"
          />

          <input [(ngModel)]="form.link" name="link" placeholder="Link (e.g. /restaurants)" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900" />

          <select [(ngModel)]="form.placement" name="placement" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900">
            <option value="homepage">Homepage</option>
            <option value="promotional">Promotional</option>
            <option value="carousel">Carousel</option>
          </select>

          <div class="grid grid-cols-3 gap-2">
            <input type="number" [(ngModel)]="form.sortOrder" name="sortOrder" placeholder="Sort order" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
            <input type="datetime-local" [(ngModel)]="form.startsAt" name="startsAt" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
            <input type="datetime-local" [(ngModel)]="form.expiresAt" name="expiresAt" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
          </div>

          <button type="submit" [disabled]="submitting()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {{ submitting() ? 'Saving…' : editingId() ? 'Save changes' : 'Create banner' }}
          </button>
        </form>
      }

      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        @for (b of banners(); track b._id) {
          <div class="card-surface overflow-hidden">
            <img [src]="b.image" [alt]="b.title" class="h-32 w-full object-cover" />
            <div class="p-3">
              <div class="flex items-center justify-between">
                <p class="truncate text-sm font-bold text-ink-900 dark:text-white">{{ b.title }}</p>
                <span class="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-500 dark:bg-ink-700 dark:text-ink-300">{{ b.placement }}</span>
              </div>
              @if (b.expiresAt) {
                <p class="mt-0.5 text-xs text-ink-400">Expires {{ b.expiresAt | date: 'MMM d, y' }}</p>
              }
              <div class="mt-2 flex items-center gap-2">
                <button type="button" class="text-xs font-bold" [class.text-basil-600]="b.isActive" [class.text-ink-400]="!b.isActive" (click)="toggleActive(b)">
                  {{ b.isActive ? 'Active' : 'Paused' }}
                </button>
                <button type="button" class="text-ink-300 hover:text-ink-700" (click)="edit(b)"><app-icon name="edit" [size]="15" /></button>
                <button type="button" class="text-ink-300 hover:text-ember-600" (click)="remove(b._id)"><app-icon name="trash" [size]="15" /></button>
              </div>
            </div>
          </div>
        } @empty {
          <p class="text-sm text-ink-400">No banners yet.</p>
        }
      </div>
    </app-admin-shell>
  `,
})
export class AdminBannersComponent implements OnInit {
  banners = signal<AdminBanner[]>([]);
  showForm = signal(false);
  submitting = signal(false);
  imageProgress = signal<number | null>(null);
  editingId = signal<string | null>(null);
  form: BannerForm = EMPTY_FORM();

  constructor(
    private adminService: AdminService,
    public toast: ToastService
  ) {}

  async ngOnInit() {
    const res = await this.adminService.listBanners();
    this.banners.set(res.banners);
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

  edit(b: AdminBanner) {
    this.editingId.set(b._id);
    this.form = {
      title: b.title,
      image: b.image,
      link: b.link,
      placement: b.placement,
      sortOrder: b.sortOrder,
      startsAt: b.startsAt ? b.startsAt.slice(0, 16) : '',
      expiresAt: b.expiresAt ? b.expiresAt.slice(0, 16) : '',
    };
    this.showForm.set(true);
  }

  onImagePicked(e: { dataUrl: string; file: File }) {
    this.form.image = e.dataUrl;
  }

  async onSubmit(e: Event) {
    e.preventDefault();
    if (!this.form.title.trim()) return;
    this.submitting.set(true);
    this.imageProgress.set(0);
    try {
      const payload = {
        title: this.form.title.trim(),
        image: this.form.image,
        link: this.form.link,
        placement: this.form.placement,
        sortOrder: this.form.sortOrder,
        startsAt: this.form.startsAt || null,
        expiresAt: this.form.expiresAt || null,
      };

      if (this.editingId()) {
        const res = await this.adminService.updateBanner(this.editingId()!, payload, (pct) => this.imageProgress.set(pct));
        this.banners.update((list) => list.map((b) => (b._id === res.banner._id ? res.banner : b)));
        this.toast.success('Banner updated');
      } else {
        const res = await this.adminService.createBanner(payload, (pct) => this.imageProgress.set(pct));
        this.banners.update((list) => [res.banner, ...list]);
        this.toast.success('Banner created');
      }
      this.showForm.set(false);
      this.editingId.set(null);
      this.form = EMPTY_FORM();
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not save banner');
    } finally {
      this.submitting.set(false);
      this.imageProgress.set(null);
    }
  }

  async toggleActive(b: AdminBanner) {
    const res = await this.adminService.updateBanner(b._id, { isActive: !b.isActive });
    this.banners.update((list) => list.map((x) => (x._id === b._id ? res.banner : x)));
  }

  async remove(id: string) {
    if (!confirm('Delete this banner? This cannot be undone.')) return;
    await this.adminService.deleteBanner(id);
    this.banners.update((list) => list.filter((b) => b._id !== id));
    this.toast.success('Banner removed');
  }
}
