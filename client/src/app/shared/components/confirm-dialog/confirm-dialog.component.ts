import { Component } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (confirm.state(); as s) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/50 p-4 animate-fade-in">
        <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-[var(--shadow-pop)]">
          <h3 class="font-display text-lg font-bold text-ink-900">{{ s.title }}</h3>
          <p class="mt-2 text-sm text-ink-500">{{ s.message }}</p>
          <div class="mt-5 flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-ink-200 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50"
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
  `,
})
export class ConfirmDialogComponent {
  constructor(public confirm: ConfirmService) {}
}
