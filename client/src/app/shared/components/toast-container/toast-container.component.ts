import { Component } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      @for (t of toast.toasts(); track t.id) {
        <div
          class="animate-toast-in pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-pop)]"
          [class]="
            t.kind === 'success'
              ? 'bg-ink-900 text-white'
              : t.kind === 'error'
                ? 'bg-ember-600 text-white'
                : 'bg-white text-ink-800 border border-ink-200'
          "
        >
          @if (t.kind === 'success') {
            <app-icon name="check" [size]="16" />
          } @else if (t.kind === 'error') {
            <app-icon name="alert-triangle" [size]="16" />
          }
          {{ t.message }}
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  constructor(public toast: ToastService) {}
}
