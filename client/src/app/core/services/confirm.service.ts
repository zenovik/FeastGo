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

export interface ReasonConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  reasonLabel: string;
  reasons: string[];
  /** The option (last in the list, by convention) that reveals a free-text field. */
  otherLabel: string;
}

interface ReasonConfirmState extends ReasonConfirmRequest {
  resolve: (value: { confirmed: boolean; reason: string | null }) => void;
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

  // Separate signal/method from ask()/respond() above — kept fully additive so
  // every existing `if (!(await confirmService.ask(...))) return;` caller is
  // untouched. Used wherever a destructive action also needs a mandatory
  // reason picked from a fixed list (order cancellation across every role).
  private readonly reasonStateSig = signal<ReasonConfirmState | null>(null);
  readonly reasonState = this.reasonStateSig.asReadonly();

  askWithReason(req: Partial<ReasonConfirmRequest> & { message: string; reasons: string[] }): Promise<{ confirmed: boolean; reason: string | null }> {
    return new Promise((resolve) => {
      this.reasonStateSig.set({
        title: req.title ?? 'Are you sure?',
        message: req.message,
        confirmLabel: req.confirmLabel ?? 'Confirm',
        cancelLabel: req.cancelLabel ?? 'Cancel',
        reasonLabel: req.reasonLabel ?? 'Reason',
        reasons: req.reasons,
        otherLabel: req.otherLabel ?? 'Other',
        resolve,
      });
    });
  }

  respondReason(value: { confirmed: boolean; reason: string | null }) {
    this.reasonStateSig()?.resolve(value);
    this.reasonStateSig.set(null);
  }
}
