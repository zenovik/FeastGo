import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '../../../core/models/user.model';
import { Order } from '../../../core/models/order.model';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [AdminShellComponent, IconComponent, InrPipe, FormsModule, DatePipe],
  template: `
    <app-admin-shell title="Users">
      <div class="flex flex-wrap items-center gap-2">
        <input
          [(ngModel)]="query"
          (ngModelChange)="scheduleFetch()"
          placeholder="Search name, phone, email…"
          class="w-64 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
        />
        <select
          [(ngModel)]="status"
          (ngModelChange)="fetch()"
          class="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
        >
          <option value="">All users</option>
          <option value="blocked">Blocked</option>
          <option value="active">Active</option>
        </select>
        <button type="button" class="ml-auto flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-bold text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800" (click)="exportCsv()">
          <app-icon name="download" [size]="14" /> Export CSV
        </button>
        <p class="w-full text-sm text-ink-400 sm:w-auto">{{ users().length }} customers</p>
      </div>

      <div class="card-surface mt-3 overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="bg-ink-50 text-xs font-semibold uppercase text-ink-400 dark:bg-ink-900/40 dark:text-ink-500">
            <tr>
              <th class="px-4 py-2.5">Name</th>
              <th class="px-4 py-2.5">Phone</th>
              <th class="px-4 py-2.5">Email</th>
              <th class="px-4 py-2.5">Status</th>
              <th class="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            @for (user of users(); track user.id) {
              <tr class="border-t border-ink-100 dark:border-ink-800">
                <td class="cursor-pointer px-4 py-2.5 font-medium text-ink-900 dark:text-white" (click)="openDetail(user)">{{ user.name }}</td>
                <td class="px-4 py-2.5 text-ink-600 dark:text-ink-300">{{ user.phone }}</td>
                <td class="px-4 py-2.5 text-ink-600 dark:text-ink-300">{{ user.email || '—' }}</td>
                <td class="px-4 py-2.5">
                  @if (user.isBlocked) {
                    <span class="rounded-full bg-ember-100 px-2.5 py-1 text-xs font-bold text-ember-700 dark:bg-ember-500/10 dark:text-ember-400">Blocked</span>
                  } @else {
                    <span class="rounded-full bg-basil-100 px-2.5 py-1 text-xs font-bold text-basil-700 dark:bg-basil-500/10 dark:text-basil-400">Active</span>
                  }
                </td>
                <td class="px-4 py-2.5 text-right">
                  <div class="flex justify-end gap-2">
                    <button type="button" class="text-xs font-bold" [class.text-ember-600]="!user.isBlocked" [class.text-basil-600]="user.isBlocked" (click)="toggleBlock(user)">
                      {{ user.isBlocked ? 'Unblock' : 'Block' }}
                    </button>
                    <button type="button" class="text-ink-300 hover:text-ember-600" (click)="remove(user)">
                      <app-icon name="trash" [size]="15" />
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="px-4 py-8 text-center text-sm text-ink-400">No users found.</td></tr>
            }
          </tbody>
        </table>
      </div>

      @if (detailUser(); as u) {
        <div class="fixed inset-0 z-40 flex justify-end bg-ink-900/40" (click)="detailUser.set(null)">
          <div class="h-full w-full max-w-md overflow-y-auto bg-white p-5 dark:bg-ink-800" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">{{ u.name }}</h2>
              <button type="button" class="text-ink-400" (click)="detailUser.set(null)"><app-icon name="x" [size]="20" /></button>
            </div>
            <div class="mt-3 space-y-1.5 text-sm">
              <p class="text-ink-500 dark:text-ink-400">Phone: <span class="text-ink-900 dark:text-white">{{ u.phone }}</span></p>
              <p class="text-ink-500 dark:text-ink-400">Email: <span class="text-ink-900 dark:text-white">{{ u.email || '—' }}</span></p>
              <p class="text-ink-500 dark:text-ink-400">Joined: <span class="text-ink-900 dark:text-white">{{ u.createdAt | date: 'mediumDate' }}</span></p>
            </div>

            <h3 class="mt-5 font-display text-sm font-bold text-ink-900 dark:text-white">Order history ({{ detailOrders().length }})</h3>
            <div class="mt-2 space-y-2">
              @for (o of detailOrders(); track o._id) {
                <div class="rounded-lg border border-ink-100 p-2.5 text-xs dark:border-ink-700">
                  <div class="flex justify-between font-semibold text-ink-900 dark:text-white">
                    <span>{{ o.restaurantName }}</span>
                    <span>{{ o.total | inr }}</span>
                  </div>
                  <p class="mt-0.5 capitalize text-ink-400">{{ o.status.replaceAll('_', ' ') }} · {{ o.createdAt | date: 'short' }}</p>
                </div>
              } @empty {
                <p class="text-sm text-ink-400">No orders placed yet.</p>
              }
            </div>
          </div>
        </div>
      }
    </app-admin-shell>
  `,
})
export class AdminUsersComponent implements OnInit {
  users = signal<User[]>([]);
  query = '';
  status = '';
  detailUser = signal<User | null>(null);
  detailOrders = signal<Order[]>([]);

  private fetchTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.fetch();
  }

  scheduleFetch() {
    clearTimeout(this.fetchTimer);
    this.fetchTimer = setTimeout(() => this.fetch(), 300);
  }

  async fetch() {
    const res = await this.adminService.listUsers(this.query.trim() || undefined, this.status || undefined);
    this.users.set(res.users);
  }

  async toggleBlock(user: User) {
    const res = await this.adminService.setUserBlocked(user.id, !user.isBlocked);
    this.users.update((list) => list.map((u) => (u.id === user.id ? res.user : u)));
    this.toast.success(res.user.isBlocked ? 'User blocked' : 'User unblocked');
  }

  async remove(user: User) {
    if (!confirm(`Delete ${user.name}'s account? This cannot be undone.`)) return;
    await this.adminService.deleteUser(user.id);
    this.users.update((list) => list.filter((u) => u.id !== user.id));
    this.toast.success('User deleted');
  }

  async openDetail(user: User) {
    this.detailUser.set(user);
    this.detailOrders.set([]);
    const res = await this.adminService.getUserDetail(user.id);
    this.detailOrders.set(res.orders);
  }

  exportCsv() {
    const rows = [['Name', 'Phone', 'Email', 'Status', 'Joined'].join(',')];
    for (const u of this.users()) {
      rows.push([u.name, u.phone, u.email ?? '', u.isBlocked ? 'Blocked' : 'Active', u.createdAt].map((v) => `"${v}"`).join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feastgo-users.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
