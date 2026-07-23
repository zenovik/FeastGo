import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAccount } from '../../../core/models/role-account.model';
import { AuditLog } from '../../../core/models/audit-log.model';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';

type Tab = 'admins' | 'audit' | 'logins';

@Component({
  selector: 'app-admin-security',
  standalone: true,
  imports: [AdminShellComponent, DatePipe, FormsModule],
  template: `
    <app-admin-shell title="Security">
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
            (click)="setTab(t.id)"
          >
            {{ t.label }}
          </button>
        }
      </div>

      @if (tab() === 'admins') {
        <div class="card-surface mt-4 divide-y divide-ink-100 dark:divide-ink-700">
          @for (a of admins(); track a.id) {
            <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p class="text-sm font-semibold text-ink-900 dark:text-white">{{ a.name }}</p>
                <p class="text-xs text-ink-400">{{ a.email }}</p>
              </div>
              @if (isSuperAdmin()) {
                <select [ngModel]="a.adminRole ?? 'super_admin'" (ngModelChange)="setRole(a, $event)" class="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs dark:border-ink-700 dark:bg-ink-900 dark:text-white">
                  <option value="super_admin">Super admin</option>
                  <option value="manager">Manager</option>
                  <option value="support">Support</option>
                </select>
              } @else {
                <span class="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-bold capitalize text-ink-600 dark:bg-ink-700 dark:text-ink-300">{{ (a.adminRole ?? 'super_admin').replaceAll('_', ' ') }}</span>
              }
            </div>
          } @empty {
            <p class="px-4 py-6 text-center text-sm text-ink-400">No admin accounts found.</p>
          }
        </div>
        @if (!isSuperAdmin()) {
          <p class="mt-2 text-xs text-ink-400">Only super admins can change admin roles.</p>
        }
      }

      @if (tab() === 'audit') {
        <div class="mt-4 flex items-center gap-2">
          <input [(ngModel)]="auditFilter" (ngModelChange)="loadAudit()" placeholder="Filter by action (e.g. user.block)" class="w-72 rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-white" />
        </div>
        <div class="card-surface mt-3 divide-y divide-ink-100 dark:divide-ink-700">
          @for (log of auditLogs(); track log._id) {
            <div class="px-4 py-2.5 text-sm">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-ink-900 dark:text-white">{{ log.adminName }}</span>
                <span class="text-xs text-ink-400">{{ log.createdAt | date: 'medium' }}</span>
              </div>
              <p class="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{{ log.action }} @if (log.targetType) { · {{ log.targetType }} } @if (log.details) { — {{ log.details }} }</p>
            </div>
          } @empty {
            <p class="px-4 py-6 text-center text-sm text-ink-400">No audit log entries found.</p>
          }
        </div>
      }

      @if (tab() === 'logins') {
        <div class="card-surface mt-4 divide-y divide-ink-100 dark:divide-ink-700">
          @for (log of loginHistory(); track log._id) {
            <div class="flex items-center justify-between px-4 py-2.5 text-sm">
              <span class="font-semibold text-ink-900 dark:text-white">{{ log.adminName }}</span>
              <span class="text-xs text-ink-400">{{ log.details }} · {{ log.createdAt | date: 'medium' }}</span>
            </div>
          } @empty {
            <p class="px-4 py-6 text-center text-sm text-ink-400">No login history yet.</p>
          }
        </div>
      }
    </app-admin-shell>
  `,
})
export class AdminSecurityComponent implements OnInit {
  tab = signal<Tab>('admins');
  tabs: { id: Tab; label: string }[] = [
    { id: 'admins', label: 'Admin roles' },
    { id: 'audit', label: 'Audit logs' },
    { id: 'logins', label: 'Login history' },
  ];

  admins = signal<AdminAccount[]>([]);
  auditLogs = signal<AuditLog[]>([]);
  loginHistory = signal<AuditLog[]>([]);
  auditFilter = '';

  constructor(
    public auth: AdminAuthService,
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  isSuperAdmin(): boolean {
    const role = this.auth.currentUser()?.adminRole;
    return !role || role === 'super_admin';
  }

  async ngOnInit() {
    const res = await this.adminService.listAdmins();
    this.admins.set(res.admins);
  }

  async setTab(t: Tab) {
    this.tab.set(t);
    if (t === 'audit' && this.auditLogs().length === 0) await this.loadAudit();
    if (t === 'logins' && this.loginHistory().length === 0) {
      const res = await this.adminService.listLoginHistory();
      this.loginHistory.set(res.logs);
    }
  }

  async loadAudit() {
    const res = await this.adminService.listAuditLogs(this.auditFilter.trim() || undefined);
    this.auditLogs.set(res.logs);
  }

  async setRole(a: AdminAccount, adminRole: string) {
    const res = await this.adminService.setAdminRole(a.id, adminRole);
    this.admins.update((list) => list.map((x) => (x.id === a.id ? res.admin : x)));
    this.toast.success('Admin role updated');
  }
}
