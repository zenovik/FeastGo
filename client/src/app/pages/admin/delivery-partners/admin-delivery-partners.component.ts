import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryAccount } from '../../../core/models/role-account.model';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

interface Performance {
  deliveriesCompleted: number;
  totalEarnings: number;
  cancelledCount: number;
}

@Component({
  selector: 'app-admin-delivery-partners',
  standalone: true,
  imports: [AdminShellComponent, InrPipe, FormsModule],
  template: `
    <app-admin-shell title="Delivery Partners">
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
        <p class="text-sm text-ink-400">{{ partners().length }} delivery partners</p>
      </div>

      <div class="mt-3 space-y-2">
        @for (p of partners(); track p.id) {
          <div class="card-surface p-3.5">
            <div class="flex flex-wrap items-center gap-3">
              <span class="h-2.5 w-2.5 shrink-0 rounded-full" [class.bg-basil-500]="p.isOnline" [class.bg-ink-200]="!p.isOnline"></span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-ink-900 dark:text-white">{{ p.name }}</p>
                <p class="text-xs text-ink-400">{{ p.email }} · {{ p.phone }} · {{ p.vehicleType }} {{ p.vehicleNumber }}</p>
              </div>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-bold capitalize"
                [class.bg-basil-100]="p.status === 'approved'"
                [class.text-basil-700]="p.status === 'approved'"
                [class.bg-gold-100]="p.status === 'pending'"
                [class.text-gold-700]="p.status === 'pending'"
                [class.bg-ember-100]="p.status === 'rejected'"
                [class.text-ember-700]="p.status === 'rejected'"
              >
                {{ p.status }}
              </span>
              @if (p.isSuspended) {
                <span class="rounded-full bg-ink-800 px-2.5 py-1 text-xs font-bold text-white">Suspended</span>
              }
              <div class="flex flex-wrap gap-2">
                @if (p.status !== 'approved') {
                  <button type="button" class="rounded-lg bg-basil-500 px-3 py-1.5 text-xs font-bold text-white" (click)="setStatus(p, 'approved')">Approve</button>
                }
                @if (p.status !== 'rejected') {
                  <button type="button" class="rounded-lg border border-ember-500 px-3 py-1.5 text-xs font-bold text-ember-600" (click)="setStatus(p, 'rejected')">Reject</button>
                }
                <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 dark:border-ink-700 dark:text-ink-300" (click)="toggleSuspend(p)">
                  {{ p.isSuspended ? 'Unsuspend' : 'Suspend' }}
                </button>
                <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 dark:border-ink-700 dark:text-ink-300" (click)="togglePerf(p)">
                  {{ expandedId() === p.id ? 'Hide' : 'Performance' }}
                </button>
              </div>
            </div>

            @if (expandedId() === p.id) {
              <div class="mt-3 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 dark:border-ink-700">
                @if (perf(); as e) {
                  <div class="rounded-lg bg-ink-50 p-2.5 text-center dark:bg-ink-900/40">
                    <p class="text-[11px] uppercase text-ink-400">Deliveries</p>
                    <p class="font-bold text-ink-900 dark:text-white">{{ e.deliveriesCompleted }}</p>
                  </div>
                  <div class="rounded-lg bg-ink-50 p-2.5 text-center dark:bg-ink-900/40">
                    <p class="text-[11px] uppercase text-ink-400">Earnings</p>
                    <p class="font-bold text-ink-900 dark:text-white">{{ e.totalEarnings | inr }}</p>
                  </div>
                  <div class="rounded-lg bg-ink-50 p-2.5 text-center dark:bg-ink-900/40">
                    <p class="text-[11px] uppercase text-ink-400">Cancelled</p>
                    <p class="font-bold text-ink-900 dark:text-white">{{ e.cancelledCount }}</p>
                  </div>
                } @else {
                  <p class="col-span-3 text-sm text-ink-400">Loading performance…</p>
                }
              </div>
            }
          </div>
        } @empty {
          <p class="text-sm text-ink-400">No delivery partners found.</p>
        }
      </div>
    </app-admin-shell>
  `,
})
export class AdminDeliveryPartnersComponent implements OnInit {
  partners = signal<DeliveryAccount[]>([]);
  status = '';
  expandedId = signal<string | null>(null);
  perf = signal<Performance | null>(null);

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.fetch();
  }

  async fetch() {
    const res = await this.adminService.listDeliveryPartners(this.status || undefined);
    this.partners.set(res.partners);
  }

  async setStatus(p: DeliveryAccount, status: string) {
    const res = await this.adminService.setDeliveryPartnerStatus(p.id, status);
    this.partners.update((list) => list.map((x) => (x.id === p.id ? res.partner : x)));
    this.toast.success(`Delivery partner ${status}`);
  }

  async toggleSuspend(p: DeliveryAccount) {
    const res = await this.adminService.setDeliveryPartnerSuspension(p.id, !p.isSuspended);
    this.partners.update((list) => list.map((x) => (x.id === p.id ? res.partner : x)));
    this.toast.success(res.partner.isSuspended ? 'Partner suspended' : 'Partner unsuspended');
  }

  async togglePerf(p: DeliveryAccount) {
    if (this.expandedId() === p.id) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(p.id);
    this.perf.set(null);
    this.perf.set(await this.adminService.getDeliveryPerformance(p.id));
  }
}
