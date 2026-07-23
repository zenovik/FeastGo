import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SellerReview, SellerService } from '../../../core/services/seller.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SellerShellComponent } from '../../../shared/components/seller-shell/seller-shell.component';

@Component({
  selector: 'app-seller-reviews',
  standalone: true,
  imports: [FormsModule, DatePipe, IconComponent, SellerShellComponent],
  template: `
    <app-seller-shell title="Reviews">
      @if (analytics(); as a) {
        <div class="card-surface flex flex-wrap items-center gap-6 p-5">
          <div>
            <p class="font-display text-3xl font-bold text-ink-900 dark:text-white">{{ a.average || '—' }}</p>
            <p class="text-xs text-ink-400">{{ a.total }} review{{ a.total === 1 ? '' : 's' }}</p>
          </div>
          <div class="min-w-[200px] flex-1 space-y-1">
            @for (star of [5, 4, 3, 2, 1]; track star) {
              <div class="flex items-center gap-2 text-xs">
                <span class="w-3 text-ink-500">{{ star }}</span>
                <app-icon name="star" [size]="11" class="text-gold-500" />
                <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-700">
                  <div class="h-full bg-gold-400" [style.width.%]="barWidth(a, star)"></div>
                </div>
                <span class="w-6 text-right text-ink-400">{{ a.byStar[star] ?? 0 }}</span>
              </div>
            }
          </div>
        </div>
      }

      <div class="mt-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          class="rounded-full border px-3 py-1.5 text-xs font-bold"
          [class.border-ember-500]="ratingFilter() === null"
          [class.text-ember-600]="ratingFilter() === null"
          [class.border-ink-200]="ratingFilter() !== null"
          [class.text-ink-500]="ratingFilter() !== null"
          (click)="setFilter(null)"
        >
          All
        </button>
        @for (star of [5, 4, 3, 2, 1]; track star) {
          <button
            type="button"
            class="rounded-full border px-3 py-1.5 text-xs font-bold"
            [class.border-ember-500]="ratingFilter() === star"
            [class.text-ember-600]="ratingFilter() === star"
            [class.border-ink-200]="ratingFilter() !== star"
            [class.text-ink-500]="ratingFilter() !== star"
            (click)="setFilter(star)"
          >
            {{ star }}★
          </button>
        }
      </div>

      <div class="mt-3 space-y-2">
        @if (loading()) {
          @for (i of [1, 2, 3]; track i) {
            <div class="card-surface h-24 animate-pulse bg-ink-100"></div>
          }
        } @else {
          @for (review of reviews(); track review._id) {
            <div class="card-surface p-4">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-ink-900 dark:text-white">{{ review.userName }}</p>
                <span class="flex items-center gap-1 text-xs font-bold text-gold-600">
                  <app-icon name="star" [size]="12" /> {{ review.rating }}
                </span>
              </div>
              <p class="mt-1 text-xs text-ink-400">{{ review.createdAt | date: 'MMM d, y' }}</p>
              @if (review.comment) {
                <p class="mt-2 text-sm text-ink-600 dark:text-ink-300">{{ review.comment }}</p>
              }

              @if (review.sellerReply.text) {
                <div class="mt-3 rounded-lg bg-ink-50 p-3 dark:bg-ink-700">
                  <p class="text-xs font-bold text-ink-500">Your reply</p>
                  <p class="mt-0.5 text-sm text-ink-700 dark:text-ink-200">{{ review.sellerReply.text }}</p>
                </div>
              } @else if (replyingTo() === review._id) {
                <div class="mt-3 flex gap-2">
                  <input
                    [(ngModel)]="replyDraft"
                    placeholder="Write a reply…"
                    class="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900"
                  />
                  <button type="button" class="rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white" (click)="sendReply(review)">Send</button>
                </div>
              } @else {
                <button type="button" class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ember-600" (click)="startReply(review)">
                  <app-icon name="send" [size]="12" /> Reply
                </button>
              }
            </div>
          } @empty {
            <p class="mt-6 text-center text-sm text-ink-400">No reviews yet.</p>
          }
        }
      </div>
    </app-seller-shell>
  `,
})
export class SellerReviewsComponent implements OnInit {
  reviews = signal<SellerReview[]>([]);
  analytics = signal<{ byStar: Record<number, number>; total: number; average: number } | null>(null);
  loading = signal(true);
  ratingFilter = signal<number | null>(null);
  replyingTo = signal<string | null>(null);
  replyDraft = '';

  constructor(
    private sellerService: SellerService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    this.analytics.set(await this.sellerService.getReviewAnalytics());
    await this.fetch();
  }

  barWidth(a: { total: number; byStar: Record<number, number> }, star: number): number {
    if (!a.total) return 0;
    return Math.round(((a.byStar[star] ?? 0) / a.total) * 100);
  }

  async setFilter(star: number | null) {
    this.ratingFilter.set(star);
    await this.fetch();
  }

  private async fetch() {
    this.loading.set(true);
    try {
      const res = await this.sellerService.listReviews(this.ratingFilter() ?? undefined);
      this.reviews.set(res.reviews);
    } finally {
      this.loading.set(false);
    }
  }

  startReply(review: SellerReview) {
    this.replyingTo.set(review._id);
    this.replyDraft = '';
  }

  async sendReply(review: SellerReview) {
    if (!this.replyDraft.trim()) return;
    try {
      const res = await this.sellerService.replyToReview(review._id, this.replyDraft.trim());
      this.reviews.update((list) => list.map((r) => (r._id === res.review._id ? res.review : r)));
      this.replyingTo.set(null);
      this.toast.success('Reply posted');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not post reply');
    }
  }
}
