import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SellerAccount } from '../../../core/models/role-account.model';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

interface Earnings {
  totalEarnings: number;
  orderCount: number;
  monthlyEarnings: number;
}

@Component({
  selector: 'app-admin-sellers',
  standalone: true,
  imports: [AdminShellComponent, InrPipe, FormsModule],
  template: `
    <app-admin-shell title="Sellers">
      <div class="flex flex-wrap items-center gap-2">
        <select
          [(ngModel)]="status"
          (ngModelChange)="fetch()"
          class="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <p class="text-sm text-ink-400">{{ sellers().length }} restaurant partners</p>
      </div>

      <div class="mt-3 space-y-2">
        @for (s of sellers(); track s.id) {
          <div class="card-surface p-3.5">
            <div class="flex flex-wrap items-center gap-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-ink-900 dark:text-white">{{ s.businessName }}</p>
                <p class="text-xs text-ink-400">{{ s.name }} · {{ s.email }} · {{ s.phone }}</p>
              </div>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-bold capitalize"
                [class.bg-basil-100]="s.status === 'approved'"
                [class.text-basil-700]="s.status === 'approved'"
                [class.bg-gold-100]="s.status === 'pending'"
                [class.text-gold-700]="s.status === 'pending'"
                [class.bg-ember-100]="s.status === 'rejected'"
                [class.text-ember-700]="s.status === 'rejected'"
              >
                {{ s.status }}
              </span>
              @if (s.isSuspended) {
                <span class="rounded-full bg-ink-800 px-2.5 py-1 text-xs font-bold text-white">Suspended</span>
              }
              <div class="flex flex-wrap gap-2">
                @if (s.status !== 'approved') {
                  <button type="button" class="rounded-lg bg-basil-500 px-3 py-1.5 text-xs font-bold text-white" (click)="setStatus(s, 'approved')">Approve</button>
                }
                @if (s.status !== 'rejected') {
                  <button type="button" class="rounded-lg border border-ember-500 px-3 py-1.5 text-xs font-bold text-ember-600" (click)="setStatus(s, 'rejected')">Reject</button>
                }
                <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 dark:border-ink-700 dark:text-ink-300" (click)="toggleSuspend(s)">
                  {{ s.isSuspended ? 'Unsuspend' : 'Suspend' }}
                </button>
                <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 dark:border-ink-700 dark:text-ink-300" (click)="toggleEarnings(s)">
                  {{ expandedId() === s.id ? 'Hide' : 'Earnings' }}
                </button>
                <button type="button" class="rounded-lg border border-ember-500 px-3 py-1.5 text-xs font-bold text-ember-600" (click)="remove(s)">
                  Delete
                </button>
              </div>
            </div>

            @if (expandedId() === s.id) {
              <div class="mt-3 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 dark:border-ink-700">
                @if (earnings(); as e) {
                  <div class="rounded-lg bg-ink-50 p-2.5 text-center dark:bg-ink-900/40">
                    <p class="text-[11px] uppercase text-ink-400">Total earnings</p>
                    <p class="font-bold text-ink-900 dark:text-white">{{ e.totalEarnings | inr }}</p>
                  </div>
                  <div class="rounded-lg bg-ink-50 p-2.5 text-center dark:bg-ink-900/40">
                    <p class="text-[11px] uppercase text-ink-400">Orders</p>
                    <p class="font-bold text-ink-900 dark:text-white">{{ e.orderCount }}</p>
                  </div>
                  <div class="rounded-lg bg-ink-50 p-2.5 text-center dark:bg-ink-900/40">
                    <p class="text-[11px] uppercase text-ink-400">This month</p>
                    <p class="font-bold text-ink-900 dark:text-white">{{ e.monthlyEarnings | inr }}</p>
                  </div>
                } @else {
                  <p class="col-span-3 text-sm text-ink-400">Loading earnings…</p>
                }
              </div>
            }
          </div>
        } @empty {
          <p class="text-sm text-ink-400">No sellers found.</p>
        }
      </div>
    </app-admin-shell>
  `,
})
export class AdminSellersComponent implements OnInit {
  sellers = signal<SellerAccount[]>([]);
  status = '';
  expandedId = signal<string | null>(null);
  earnings = signal<Earnings | null>(null);

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.fetch();
  }

  async fetch() {
    const res = await this.adminService.listRestaurantOwners(this.status || undefined);
    this.sellers.set(res.owners);
  }

  async setStatus(s: SellerAccount, status: string) {
    const res = await this.adminService.setRestaurantOwnerStatus(s.id, status);
    this.sellers.update((list) => list.map((x) => (x.id === s.id ? res.owner : x)));
    this.toast.success(`Seller ${status}`);
  }

  async toggleSuspend(s: SellerAccount) {
    const res = await this.adminService.setRestaurantOwnerSuspension(s.id, !s.isSuspended);
    this.sellers.update((list) => list.map((x) => (x.id === s.id ? res.owner : x)));
    this.toast.success(res.owner.isSuspended ? 'Seller suspended' : 'Seller unsuspended');
  }

  async toggleEarnings(s: SellerAccount) {
    if (this.expandedId() === s.id) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(s.id);
    this.earnings.set(null);
    this.earnings.set(await this.adminService.getSellerEarnings(s.id));
  }

  async remove(s: SellerAccount) {
    if (!confirm(`Delete ${s.businessName}? This also deletes their restaurant and menu, and cannot be undone.`)) return;
    await this.adminService.deleteRestaurantOwner(s.id);
    this.sellers.update((list) => list.filter((x) => x.id !== s.id));
    this.toast.success('Seller deleted');
  }
}
