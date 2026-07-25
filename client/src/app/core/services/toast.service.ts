import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  description?: string;
  actionUrl?: string;
  durationMs?: number;
}

export interface Toast {
  id: number;
  title: string;
  description?: string;
  kind: ToastKind;
  actionUrl?: string;
  durationMs: number;
  remainingMs: number;
  startedAt: number;
  paused: boolean;
}

let nextId = 1;
const MAX_QUEUE = 5;
const DEFAULT_DURATION_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSig = signal<Toast[]>([]);
  readonly toasts = this.toastsSig.asReadonly();

  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(title: string, kind: ToastKind = 'info', options: ToastOptions = {}) {
    const id = nextId++;
    const durationMs = options.durationMs ?? DEFAULT_DURATION_MS;
    const toast: Toast = {
      id,
      title,
      description: options.description,
      kind,
      actionUrl: options.actionUrl,
      durationMs,
      remainingMs: durationMs,
      startedAt: Date.now(),
      paused: false,
    };
    this.toastsSig.update((list) => {
      const next = [...list, toast];
      // Cap the visible queue — oldest overflow toasts are dropped rather than
      // stacking forever, matching how Swiggy/Zomato-style toast queues behave.
      if (next.length <= MAX_QUEUE) return next;
      const overflow = next.slice(0, next.length - MAX_QUEUE);
      overflow.forEach((t) => this.clearTimer(t.id));
      return next.slice(next.length - MAX_QUEUE);
    });
    this.scheduleDismiss(id, durationMs);
    return id;
  }

  success(message: string, options?: ToastOptions) {
    this.show(message, 'success', options);
  }
  error(message: string, options?: ToastOptions) {
    this.show(message, 'error', options);
  }
  warning(message: string, options?: ToastOptions) {
    this.show(message, 'warning', options);
  }
  info(message: string, options?: ToastOptions) {
    this.show(message, 'info', options);
  }

  private scheduleDismiss(id: number, delayMs: number) {
    this.clearTimer(id);
    const handle = setTimeout(() => this.dismiss(id), delayMs);
    this.timers.set(id, handle);
  }

  private clearTimer(id: number) {
    const handle = this.timers.get(id);
    if (handle) clearTimeout(handle);
    this.timers.delete(id);
  }

  pause(id: number) {
    const toast = this.toastsSig().find((t) => t.id === id);
    if (!toast || toast.paused) return;
    const elapsed = Date.now() - toast.startedAt;
    toast.remainingMs = Math.max(0, toast.remainingMs - elapsed);
    toast.paused = true;
    this.clearTimer(id);
    this.toastsSig.update((list) => list.map((t) => (t.id === id ? { ...toast } : t)));
  }

  resume(id: number) {
    const toast = this.toastsSig().find((t) => t.id === id);
    if (!toast || !toast.paused) return;
    toast.startedAt = Date.now();
    toast.paused = false;
    this.scheduleDismiss(id, toast.remainingMs);
    this.toastsSig.update((list) => list.map((t) => (t.id === id ? { ...toast } : t)));
  }

  dismiss(id: number) {
    this.clearTimer(id);
    this.toastsSig.update((list) => list.filter((t) => t.id !== id));
  }
}
