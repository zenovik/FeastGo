import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SystemSettings } from '../../../core/models/system-settings.model';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';

type Tab = 'general' | 'commerce' | 'payment' | 'email' | 'sms';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [AdminShellComponent, FormsModule],
  template: `
    <app-admin-shell title="Settings">
      @if (form(); as f) {
        <div class="flex flex-wrap gap-1.5">
          @for (t of tabs; track t.id) {
            <button
              type="button"
              class="rounded-full border px-3 py-1.5 text-xs font-bold"
              [class.border-ember-500]="tab() === t.id"
              [class.text-ember-600]="tab() === t.id"
              [class.bg-ember-50]="tab() === t.id"
              [class.border-ink-200]="tab() !== t.id"
              [class.text-ink-500]="tab() !== t.id"
              (click)="tab.set(t.id)"
            >
              {{ t.label }}
            </button>
          }
        </div>

        <form class="card-surface mt-4 max-w-xl space-y-3 p-4" (submit)="save($event)">
          @if (tab() === 'general') {
            <label class="block text-xs font-semibold text-ink-500">
              App name
              <input [(ngModel)]="f.appName" name="appName" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
            <label class="block text-xs font-semibold text-ink-500">
              Support email
              <input [(ngModel)]="f.supportEmail" name="supportEmail" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
            <label class="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
              <input type="checkbox" [(ngModel)]="f.maintenanceMode" name="maintenanceMode" /> Maintenance mode
            </label>
          }

          @if (tab() === 'commerce') {
            <label class="block text-xs font-semibold text-ink-500">
              Commission (%)
              <input type="number" [(ngModel)]="f.commissionPercent" name="commissionPercent" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
            <label class="block text-xs font-semibold text-ink-500">
              Default delivery fee
              <input type="number" [(ngModel)]="f.defaultDeliveryFee" name="defaultDeliveryFee" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
            <label class="block text-xs font-semibold text-ink-500">
              Tax (%)
              <input type="number" [(ngModel)]="f.taxPercent" name="taxPercent" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
          }

          @if (tab() === 'payment') {
            <p class="rounded-lg bg-gold-50 p-2.5 text-xs text-gold-700 dark:bg-gold-500/10 dark:text-gold-400">
              These fields store configuration only — FeastGo does not integrate a live payment gateway, so no charge is ever processed through them.
            </p>
            <label class="block text-xs font-semibold text-ink-500">
              Provider
              <input [(ngModel)]="f.paymentGateway.provider" name="pgProvider" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
            <label class="block text-xs font-semibold text-ink-500">
              API key
              <input [(ngModel)]="f.paymentGateway.apiKey" name="pgApiKey" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
            <label class="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
              <input type="checkbox" [(ngModel)]="f.paymentGateway.enabled" name="pgEnabled" /> Enabled
            </label>
          }

          @if (tab() === 'email') {
            <p class="rounded-lg bg-gold-50 p-2.5 text-xs text-gold-700 dark:bg-gold-500/10 dark:text-gold-400">
              Stores SMTP configuration only — no real email provider is wired up, so no email is ever actually sent.
            </p>
            <label class="block text-xs font-semibold text-ink-500">
              SMTP host
              <input [(ngModel)]="f.email.smtpHost" name="smtpHost" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
            <label class="block text-xs font-semibold text-ink-500">
              SMTP port
              <input type="number" [(ngModel)]="f.email.smtpPort" name="smtpPort" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
            <label class="block text-xs font-semibold text-ink-500">
              From address
              <input [(ngModel)]="f.email.fromAddress" name="fromAddress" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
            <label class="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
              <input type="checkbox" [(ngModel)]="f.email.enabled" name="emailEnabled" /> Enabled
            </label>
          }

          @if (tab() === 'sms') {
            <p class="rounded-lg bg-gold-50 p-2.5 text-xs text-gold-700 dark:bg-gold-500/10 dark:text-gold-400">
              Stores SMS provider configuration only — no real SMS is ever actually sent.
            </p>
            <label class="block text-xs font-semibold text-ink-500">
              Provider
              <input [(ngModel)]="f.sms.provider" name="smsProvider" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
            <label class="block text-xs font-semibold text-ink-500">
              API key
              <input [(ngModel)]="f.sms.apiKey" name="smsApiKey" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
            </label>
            <label class="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
              <input type="checkbox" [(ngModel)]="f.sms.enabled" name="smsEnabled" /> Enabled
            </label>
          }

          <button type="submit" [disabled]="saving()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {{ saving() ? 'Saving…' : 'Save settings' }}
          </button>
        </form>
      }
    </app-admin-shell>
  `,
})
export class AdminSettingsComponent implements OnInit {
  tab = signal<Tab>('general');
  tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'commerce', label: 'Commission & Delivery' },
    { id: 'payment', label: 'Payment gateway' },
    { id: 'email', label: 'Email' },
    { id: 'sms', label: 'SMS' },
  ];

  form = signal<SystemSettings | null>(null);
  saving = signal(false);

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    const res = await this.adminService.getSettings();
    this.form.set(res.settings);
  }

  async save(e: Event) {
    e.preventDefault();
    const f = this.form();
    if (!f) return;
    this.saving.set(true);
    try {
      const res = await this.adminService.updateSettings(f);
      this.form.set(res.settings);
      this.toast.success('Settings saved');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not save settings');
    } finally {
      this.saving.set(false);
    }
  }
}
