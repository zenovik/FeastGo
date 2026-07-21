import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

interface ConfirmState extends ConfirmRequest {
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly stateSig = signal<ConfirmState | null>(null);
  readonly state = this.stateSig.asReadonly();

  ask(req: Partial<ConfirmRequest> & { message: string }): Promise<boolean> {
    return new Promise((resolve) => {
      this.stateSig.set({
        title: req.title ?? 'Are you sure?',
        message: req.message,
        confirmLabel: req.confirmLabel ?? 'Confirm',
        cancelLabel: req.cancelLabel ?? 'Cancel',
        resolve,
      });
    });
  }

  respond(value: boolean) {
    this.stateSig()?.resolve(value);
    this.stateSig.set(null);
  }
}
