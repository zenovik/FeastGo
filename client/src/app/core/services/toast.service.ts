import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error' | 'info';
}

let nextId = 1;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSig = signal<Toast[]>([]);
  readonly toasts = this.toastsSig.asReadonly();

  show(message: string, kind: Toast['kind'] = 'info', durationMs = 2800) {
    const id = nextId++;
    this.toastsSig.update((list) => [...list, { id, message, kind }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(message: string) {
    this.show(message, 'success');
  }
  error(message: string) {
    this.show(message, 'error');
  }

  dismiss(id: number) {
    this.toastsSig.update((list) => list.filter((t) => t.id !== id));
  }
}
