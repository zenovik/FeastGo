import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type Audience = 'customer' | 'seller' | 'delivery' | 'all';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [AdminShellComponent, IconComponent, FormsModule],
  template: `
    <app-admin-shell title="Notifications">
      <p class="text-sm text-ink-400">
        Send an in-app broadcast notification to customers, sellers, delivery partners, or everyone. This delivers instantly inside FeastGo —
        it does not send external push, SMS or email.
      </p>

      <form class="card-surface mt-4 max-w-xl space-y-3 p-4" (submit)="send($event)">
        <div>
          <p class="mb-1.5 text-xs font-semibold text-ink-500">Audience</p>
          <div class="flex flex-wrap gap-1.5">
            @for (a of audiences; track a.id) {
              <button
                type="button"
                class="rounded-full border px-3 py-1.5 text-xs font-bold"
                [class.border-ember-500]="audience === a.id"
                [class.text-ember-600]="audience === a.id"
                [class.bg-ember-50]="audience === a.id"
                [class.border-ink-200]="audience !== a.id"
                [class.text-ink-500]="audience !== a.id"
                (click)="audience = a.id"
              >
                {{ a.label }}
              </button>
            }
          </div>
        </div>

        <input [(ngModel)]="title" name="title" required placeholder="Notification title" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
        <textarea [(ngModel)]="message" name="message" required rows="3" placeholder="Message" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white"></textarea>

        <button type="submit" [disabled]="sending()" class="flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          <app-icon name="send" [size]="14" /> {{ sending() ? 'Sending…' : 'Send broadcast' }}
        </button>

        @if (lastResult(); as r) {
          <p class="text-xs font-semibold text-basil-600">Delivered to {{ r }} recipient(s).</p>
        }
      </form>
    </app-admin-shell>
  `,
})
export class AdminNotificationsComponent {
  audiences: { id: Audience; label: string }[] = [
    { id: 'all', label: 'Everyone' },
    { id: 'customer', label: 'Customers' },
    { id: 'seller', label: 'Sellers' },
    { id: 'delivery', label: 'Delivery partners' },
  ];

  audience: Audience = 'all';
  title = '';
  message = '';
  sending = signal(false);
  lastResult = signal<number | null>(null);

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  async send(e: Event) {
    e.preventDefault();
    if (!this.title.trim() || !this.message.trim()) return;
    this.sending.set(true);
    try {
      const res = await this.adminService.broadcastNotification(this.audience, this.title.trim(), this.message.trim());
      this.lastResult.set(res.recipientCount);
      this.toast.success(`Broadcast sent to ${res.recipientCount} recipient(s)`);
      this.title = '';
      this.message = '';
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not send broadcast');
    } finally {
      this.sending.set(false);
    }
  }
}
