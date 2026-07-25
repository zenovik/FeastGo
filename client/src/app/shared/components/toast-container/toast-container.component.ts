import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Toast, ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

const KIND_CLASSES: Record<Toast['kind'], string> = {
  success: 'bg-ink-900 text-white border-ink-900',
  error: 'bg-ember-600 text-white border-ember-600',
  warning: 'bg-gold-500 text-ink-900 border-gold-500',
  info: 'bg-white text-ink-800 border-ink-200',
};

const PROGRESS_CLASSES: Record<Toast['kind'], string> = {
  success: 'bg-white/40',
  error: 'bg-white/40',
  warning: 'bg-ink-900/25',
  info: 'bg-ink-900/15',
};

const KIND_ICON: Record<Toast['kind'], string> = {
  success: 'check',
  error: 'alert-triangle',
  warning: 'alert-triangle',
  info: 'info',
};

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="pointer-events-none fixed right-3 top-4 z-[200] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-5 sm:top-5">
      @for (t of toast.toasts(); track t.id) {
        <div
          class="toast-slide-in pointer-events-auto relative overflow-hidden rounded-xl border shadow-[var(--shadow-pop)]"
          [class]="kindClass(t.kind)"
          [class.cursor-pointer]="!!t.actionUrl"
          (mouseenter)="toast.pause(t.id)"
          (mouseleave)="toast.resume(t.id)"
          (click)="onClick(t)"
        >
          <div class="flex items-start gap-2.5 p-3.5 pr-8">
            <app-icon [name]="iconFor(t.kind)" [size]="17" class="mt-0.5 shrink-0" />
            <div class="min-w-0">
              <p class="text-sm font-bold leading-snug">{{ t.title }}</p>
              @if (t.description) {
                <p class="mt-0.5 text-xs leading-snug opacity-90">{{ t.description }}</p>
              }
            </div>
          </div>
          <button type="button" class="absolute right-1.5 top-1.5 rounded-full p-1 opacity-70 hover:bg-black/10 hover:opacity-100" (click)="close($event, t.id)" aria-label="Dismiss">
            <app-icon name="x" [size]="13" />
          </button>
          <div
            class="toast-progress absolute bottom-0 left-0 h-1"
            [class]="progressClass(t.kind)"
            [style.animation-duration.ms]="t.durationMs"
            [style.animation-play-state]="t.paused ? 'paused' : 'running'"
          ></div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      @keyframes toastSlideIn {
        from {
          opacity: 0;
          transform: translateX(24px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes toastProgress {
        from {
          width: 100%;
        }
        to {
          width: 0%;
        }
      }
      .toast-slide-in {
        animation: toastSlideIn 0.22s ease-out;
      }
      .toast-progress {
        animation-name: toastProgress;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
      }
    `,
  ],
})
export class ToastContainerComponent {
  constructor(
    public toast: ToastService,
    private router: Router
  ) {}

  kindClass(kind: Toast['kind']): string {
    return KIND_CLASSES[kind];
  }

  progressClass(kind: Toast['kind']): string {
    return PROGRESS_CLASSES[kind];
  }

  iconFor(kind: Toast['kind']): string {
    return KIND_ICON[kind];
  }

  onClick(t: Toast) {
    if (t.actionUrl) this.router.navigateByUrl(t.actionUrl);
    this.toast.dismiss(t.id);
  }

  close(e: Event, id: number) {
    e.stopPropagation();
    this.toast.dismiss(id);
  }
}
