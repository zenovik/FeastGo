import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (confirm.state(); as s) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/50 p-4 animate-fade-in">
        <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-[var(--shadow-pop)] dark:bg-ink-800">
          <h3 class="font-display text-lg font-bold text-ink-900 dark:text-white">{{ s.title }}</h3>
          <p class="mt-2 text-sm text-ink-500 dark:text-ink-300">{{ s.message }}</p>
          <div class="mt-5 flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-ink-200 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50 dark:border-ink-600 dark:text-ink-200 dark:hover:bg-ink-700/50"
              (click)="confirm.respond(false)"
            >
              {{ s.cancelLabel }}
            </button>
            <button
              type="button"
              class="flex-1 rounded-xl bg-ember-500 py-2.5 text-sm font-semibold text-white hover:bg-ember-600"
              (click)="confirm.respond(true)"
            >
              {{ s.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (confirm.reasonState(); as s) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/50 p-4 animate-fade-in">
        <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-[var(--shadow-pop)] dark:bg-ink-800">
          <h3 class="font-display text-lg font-bold text-ink-900 dark:text-white">{{ s.title }}</h3>
          <p class="mt-2 text-sm text-ink-500 dark:text-ink-300">{{ s.message }}</p>

          <label class="mt-4 block text-xs font-semibold text-ink-500 dark:text-ink-400">
            {{ s.reasonLabel }}
            <select
              [ngModel]="selectedReason()"
              (ngModelChange)="selectedReason.set($event)"
              name="reasonSelect"
              class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-600 dark:bg-ink-900 dark:text-white"
            >
              <option value="" disabled>Select a reason…</option>
              @for (r of s.reasons; track r) {
                <option [value]="r">{{ r }}</option>
              }
            </select>
          </label>

          @if (selectedReason() === s.otherLabel) {
            <textarea
              [ngModel]="otherText()"
              (ngModelChange)="otherText.set($event)"
              name="reasonOther"
              rows="2"
              placeholder="Please specify…"
              class="mt-2 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-600 dark:bg-ink-900 dark:text-white"
            ></textarea>
          }

          <div class="mt-5 flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-ink-200 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50 dark:border-ink-600 dark:text-ink-200 dark:hover:bg-ink-700/50"
              (click)="cancelReason()"
            >
              {{ s.cancelLabel }}
            </button>
            <button
              type="button"
              [disabled]="!isReasonValid()"
              class="flex-1 rounded-xl bg-ember-500 py-2.5 text-sm font-semibold text-white hover:bg-ember-600 disabled:opacity-50"
              (click)="confirmReason()"
            >
              {{ s.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  selectedReason = signal('');
  otherText = signal('');

  constructor(public confirm: ConfirmService) {}

  isReasonValid(): boolean {
    const s = this.confirm.reasonState();
    if (!s || !this.selectedReason()) return false;
    if (this.selectedReason() === s.otherLabel) return this.otherText().trim().length > 0;
    return true;
  }

  confirmReason() {
    const s = this.confirm.reasonState();
    if (!s || !this.isReasonValid()) return;
    const reason = this.selectedReason() === s.otherLabel ? this.otherText().trim() : this.selectedReason();
    this.confirm.respondReason({ confirmed: true, reason });
    this.selectedReason.set('');
    this.otherText.set('');
  }

  cancelReason() {
    this.confirm.respondReason({ confirmed: false, reason: null });
    this.selectedReason.set('');
    this.otherText.set('');
  }
}
