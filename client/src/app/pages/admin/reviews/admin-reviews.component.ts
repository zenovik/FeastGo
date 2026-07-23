import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminReview, AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [FormsModule, DatePipe, IconComponent, AdminShellComponent],
  template: `
    <app-admin-shell title="Reviews">
      <div class="flex flex-wrap items-center gap-2">
        <select [(ngModel)]="filter" (ngModelChange)="fetch()" class="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white">
          <option value="">All reviews</option>
          <option value="reported">Reported</option>
          <option value="hidden">Hidden</option>
        </select>
        <p class="text-sm text-ink-400">{{ reviews().length }} reviews</p>
      </div>

      <div class="mt-3 space-y-2">
        @for (r of reviews(); track r._id) {
          <div class="card-surface p-3.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold text-ink-900 dark:text-white">{{ r.userName }}</p>
                <span class="flex items-center gap-0.5 text-xs font-bold text-gold-600">
                  <app-icon name="star" [size]="12" /> {{ r.rating }}
                </span>
                @if (r.reportCount > 0) {
                  <span class="rounded-full bg-ember-100 px-2 py-0.5 text-[10px] font-bold text-ember-700 dark:bg-ember-500/10 dark:text-ember-400">{{ r.reportCount }} reports</span>
                }
                @if (r.isHidden) {
                  <span class="rounded-full bg-ink-800 px-2 py-0.5 text-[10px] font-bold text-white">Hidden</span>
                }
              </div>
              <p class="text-xs text-ink-400">{{ r.createdAt | date: 'MMM d, y' }}</p>
            </div>
            <p class="mt-1.5 text-sm text-ink-600 dark:text-ink-300">{{ r.comment }}</p>
            <div class="mt-2 flex gap-2">
              <button type="button" class="text-xs font-bold" [class.text-ember-600]="!r.isHidden" [class.text-basil-600]="r.isHidden" (click)="toggleHidden(r)">
                {{ r.isHidden ? 'Unhide' : 'Hide' }}
              </button>
              <button type="button" class="text-ink-300 hover:text-ember-600" (click)="remove(r)">
                <app-icon name="trash" [size]="15" />
              </button>
            </div>
          </div>
        } @empty {
          <p class="text-sm text-ink-400">No reviews found.</p>
        }
      </div>
    </app-admin-shell>
  `,
})
export class AdminReviewsComponent implements OnInit {
  reviews = signal<AdminReview[]>([]);
  filter = '';

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.fetch();
  }

  async fetch() {
    const res = await this.adminService.listReviews({ reported: this.filter === 'reported', hidden: this.filter === 'hidden' });
    this.reviews.set(res.reviews);
  }

  async toggleHidden(r: AdminReview) {
    const res = await this.adminService.setReviewHidden(r._id, !r.isHidden);
    this.reviews.update((list) => list.map((x) => (x._id === r._id ? res.review : x)));
    this.toast.success(res.review.isHidden ? 'Review hidden' : 'Review visible');
  }

  async remove(r: AdminReview) {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    await this.adminService.deleteReview(r._id);
    this.reviews.update((list) => list.filter((x) => x._id !== r._id));
    this.toast.success('Review deleted');
  }
}
