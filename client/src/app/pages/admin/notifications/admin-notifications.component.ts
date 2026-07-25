import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type Audience = 'customer' | 'seller' | 'delivery' | 'all';
type Category = 'promotional' | 'maintenance' | 'festival' | 'emergency';
type Priority = 'low' | 'medium' | 'high' | 'critical';

interface RecipientOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [AdminShellComponent, IconComponent, FormsModule],
  template: `
    <app-admin-shell title="Notifications">
      <p class="text-sm text-ink-400">
        Send an in-app notification to customers, sellers, delivery partners, or one specific person. This delivers instantly inside
        FeastGo — it does not send external push, SMS or email.
      </p>

      <form class="card-surface mt-4 max-w-xl space-y-4 p-4" (submit)="send($event)">
        <div>
          <p class="mb-1.5 text-xs font-semibold text-ink-500">Send to</p>
          <div class="flex flex-wrap gap-1.5">
            @for (t of targetTypes; track t.id) {
              <button type="button" class="rounded-full border px-3 py-1.5 text-xs font-bold" [class]="chipClass(targetType === t.id)" (click)="setTargetType(t.id)">
                {{ t.label }}
              </button>
            }
          </div>
        </div>

        <div>
          <p class="mb-1.5 text-xs font-semibold text-ink-500">{{ targetType === 'individual' ? 'Role' : 'Audience' }}</p>
          <div class="flex flex-wrap gap-1.5">
            @for (a of audienceOptions(); track a.id) {
              <button type="button" class="rounded-full border px-3 py-1.5 text-xs font-bold" [class]="chipClass(audience === a.id)" (click)="setAudience(a.id)">
                {{ a.label }}
              </button>
            }
          </div>
        </div>

        @if (targetType === 'individual') {
          <div>
            <p class="mb-1.5 text-xs font-semibold text-ink-500">Recipient</p>
            @if (selectedRecipient(); as r) {
              <div class="flex items-center justify-between rounded-lg border border-ember-200 bg-ember-50 px-3 py-2 text-sm">
                <div>
                  <p class="font-semibold text-ink-900">{{ r.name }}</p>
                  <p class="text-xs text-ink-500">{{ r.email || r.phone }}</p>
                </div>
                <button type="button" class="text-xs font-bold text-ember-600" (click)="selectedRecipient.set(null)">Change</button>
              </div>
            } @else {
              <input
                [(ngModel)]="recipientQuery"
                name="recipientQuery"
                (ngModelChange)="onRecipientSearch($event)"
                placeholder="Search by name, email or phone"
                class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400"
              />
              @if (recipientResults().length) {
                <div class="mt-1 max-h-40 overflow-y-auto rounded-lg border border-ink-200">
                  @for (r of recipientResults(); track r.id) {
                    <button type="button" class="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-ink-50" (click)="pickRecipient(r)">
                      <span class="font-semibold text-ink-900">{{ r.name }}</span>
                      <span class="text-xs text-ink-500">{{ r.email || r.phone }}</span>
                    </button>
                  }
                </div>
              }
            }
          </div>
        }

        <div>
          <p class="mb-1.5 text-xs font-semibold text-ink-500">Category (optional)</p>
          <div class="flex flex-wrap gap-1.5">
            <button type="button" class="rounded-full border px-3 py-1.5 text-xs font-bold" [class]="chipClass(category === null)" (click)="setCategory(null)">General</button>
            @for (c of categories; track c.id) {
              <button type="button" class="rounded-full border px-3 py-1.5 text-xs font-bold" [class]="chipClass(category === c.id)" (click)="setCategory(c.id)">
                {{ c.label }}
              </button>
            }
          </div>
        </div>

        <div>
          <p class="mb-1.5 text-xs font-semibold text-ink-500">Priority</p>
          <div class="flex flex-wrap gap-1.5">
            @for (p of priorities; track p) {
              <button type="button" class="rounded-full border px-3 py-1.5 text-xs font-bold capitalize" [class]="chipClass(priority === p)" (click)="priority = p">
                {{ p }}
              </button>
            }
          </div>
          @if (priority === 'critical') {
            <p class="mt-1 text-[11px] text-ember-600">Critical notifications stay until the recipient manually dismisses them.</p>
          }
        </div>

        <input [(ngModel)]="title" name="title" required placeholder="Notification title" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
        <textarea [(ngModel)]="message" name="message" required rows="3" placeholder="Message" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white"></textarea>

        <label class="flex items-center gap-2 text-xs font-semibold text-ink-600">
          <input type="checkbox" [(ngModel)]="scheduleEnabled" name="scheduleEnabled" />
          Schedule for later
        </label>
        @if (scheduleEnabled) {
          <input type="datetime-local" [(ngModel)]="scheduledFor" name="scheduledFor" [min]="minDateTime" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
        }

        <button
          type="submit"
          [disabled]="sending() || (targetType === 'individual' && !selectedRecipient())"
          class="flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <app-icon name="send" [size]="14" /> {{ sending() ? 'Sending…' : scheduleEnabled ? 'Schedule notification' : 'Send now' }}
        </button>

        @if (lastResult(); as r) {
          <p class="text-xs font-semibold text-basil-600">{{ r }}</p>
        }
      </form>
    </app-admin-shell>
  `,
})
export class AdminNotificationsComponent {
  targetTypes: { id: 'audience' | 'individual'; label: string }[] = [
    { id: 'audience', label: 'Audience' },
    { id: 'individual', label: 'One person' },
  ];
  categories: { id: Category; label: string }[] = [
    { id: 'promotional', label: 'Promotional' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'festival', label: 'Festival Greeting' },
    { id: 'emergency', label: 'Emergency Alert' },
  ];
  priorities: Priority[] = ['low', 'medium', 'high', 'critical'];

  targetType: 'audience' | 'individual' = 'audience';
  audience: Audience = 'all';
  category: Category | null = null;
  priority: Priority = 'medium';
  title = '';
  message = '';
  scheduleEnabled = false;
  scheduledFor = '';
  minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  recipientQuery = '';
  recipientResults = signal<RecipientOption[]>([]);
  selectedRecipient = signal<RecipientOption | null>(null);
  private searchDebounce?: ReturnType<typeof setTimeout>;

  sending = signal(false);
  lastResult = signal<string | null>(null);

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  audienceOptions(): { id: Audience; label: string }[] {
    if (this.targetType === 'individual') {
      return [
        { id: 'customer', label: 'Customer' },
        { id: 'seller', label: 'Seller' },
        { id: 'delivery', label: 'Delivery partner' },
      ];
    }
    return [
      { id: 'all', label: 'Everyone' },
      { id: 'customer', label: 'Customers' },
      { id: 'seller', label: 'Sellers' },
      { id: 'delivery', label: 'Delivery partners' },
    ];
  }

  chipClass(active: boolean): string {
    return active ? 'border-ember-500 text-ember-600 bg-ember-50' : 'border-ink-200 text-ink-500';
  }

  setTargetType(t: 'audience' | 'individual') {
    this.targetType = t;
    this.selectedRecipient.set(null);
    this.recipientResults.set([]);
    this.recipientQuery = '';
    if (t === 'individual' && this.audience === 'all') this.audience = 'customer';
  }

  setAudience(a: Audience) {
    this.audience = a;
    this.selectedRecipient.set(null);
    this.recipientResults.set([]);
    this.recipientQuery = '';
  }

  setCategory(c: Category | null) {
    this.category = c;
    if (c === 'emergency') this.priority = 'critical';
  }

  onRecipientSearch(q: string) {
    clearTimeout(this.searchDebounce);
    if (!q.trim() || this.audience === 'all') {
      this.recipientResults.set([]);
      return;
    }
    this.searchDebounce = setTimeout(async () => {
      try {
        const res = await this.adminService.searchNotificationRecipients(this.audience as 'customer' | 'seller' | 'delivery', q.trim());
        this.recipientResults.set(res.accounts);
      } catch {
        this.recipientResults.set([]);
      }
    }, 300);
  }

  pickRecipient(r: RecipientOption) {
    this.selectedRecipient.set(r);
    this.recipientResults.set([]);
  }

  async send(e: Event) {
    e.preventDefault();
    if (!this.title.trim() || !this.message.trim()) return;
    if (this.targetType === 'individual' && !this.selectedRecipient()) return;

    this.sending.set(true);
    try {
      const res = await this.adminService.broadcastNotification({
        audience: this.audience,
        title: this.title.trim(),
        message: this.message.trim(),
        targetType: this.targetType,
        targetId: this.targetType === 'individual' ? this.selectedRecipient()?.id : undefined,
        category: this.category,
        priority: this.priority,
        scheduledFor: this.scheduleEnabled && this.scheduledFor ? new Date(this.scheduledFor).toISOString() : null,
      });
      this.lastResult.set(res.scheduled ? `Scheduled for ${res.recipientCount} recipient(s).` : `Delivered to ${res.recipientCount} recipient(s).`);
      this.toast.success(res.scheduled ? 'Notification scheduled' : `Sent to ${res.recipientCount} recipient(s)`);
      this.title = '';
      this.message = '';
      this.scheduleEnabled = false;
      this.scheduledFor = '';
      this.selectedRecipient.set(null);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not send notification');
    } finally {
      this.sending.set(false);
    }
  }
}
