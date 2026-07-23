import { UpperCasePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Order } from '../../../core/models/order.model';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-admin-refunds',
  standalone: true,
  imports: [AdminShellComponent, InrPipe, FormsModule, UpperCasePipe],
  template: `
    <app-admin-shell title="Payments & Refunds">
      <div class="flex flex-wrap items-center gap-2">
        <select [(ngModel)]="status" (ngModelChange)="fetch()" class="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white">
          <option value="">All refund requests</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="refunded">Refunded</option>
        </select>
        <p class="text-sm text-ink-400">{{ orders().length }} orders</p>
      </div>

      <div class="mt-3 space-y-2">
        @for (o of orders(); track o._id) {
          <div class="card-surface p-3.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-sm font-semibold text-ink-900 dark:text-white">{{ o.customerName || 'Customer' }} · {{ o.restaurantName }}</p>
                <p class="text-xs text-ink-400">Order total {{ o.total | inr }} · Paid via {{ o.paymentMethod | uppercase }}</p>
              </div>
              <span class="rounded-full px-2.5 py-1 text-xs font-bold capitalize" [class.bg-gold-100]="o.refundStatus === 'requested'" [class.text-gold-700]="o.refundStatus === 'requested'"
                [class.bg-basil-100]="o.refundStatus === 'approved' || o.refundStatus === 'refunded'" [class.text-basil-700]="o.refundStatus === 'approved' || o.refundStatus === 'refunded'"
                [class.bg-ember-100]="o.refundStatus === 'rejected'" [class.text-ember-700]="o.refundStatus === 'rejected'">
                {{ o.refundStatus }}
              </span>
            </div>
            @if (o.refundReason) {
              <p class="mt-1.5 text-xs text-ink-500 dark:text-ink-400">Reason: {{ o.refundReason }}</p>
            }
            <form class="mt-2.5 flex flex-wrap items-center gap-2" (submit)="onUpdate($event, o)">
              <select [(ngModel)]="drafts[o._id].status" name="status-{{ o._id }}" class="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs dark:border-ink-700 dark:bg-ink-900 dark:text-white">
                <option value="none">None</option>
                <option value="requested">Requested</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="refunded">Refunded</option>
              </select>
              <input type="number" [(ngModel)]="drafts[o._id].amount" name="amount-{{ o._id }}" placeholder="Refund amount" class="w-32 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
              <input [(ngModel)]="drafts[o._id].reason" name="reason-{{ o._id }}" placeholder="Note" class="flex-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
              <button type="submit" class="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-bold text-white">Save</button>
            </form>
          </div>
        } @empty {
          <p class="text-sm text-ink-400">No refund requests found.</p>
        }
      </div>
    </app-admin-shell>
  `,
})
export class AdminRefundsComponent implements OnInit {
  orders = signal<Order[]>([]);
  status = '';
  drafts: Record<string, { status: string; amount: number | null; reason: string }> = {};

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.fetch();
  }

  async fetch() {
    const res = await this.adminService.listRefundRequests(this.status || undefined);
    this.orders.set(res.orders);
    for (const o of res.orders) {
      this.drafts[o._id] = { status: o.refundStatus ?? 'none', amount: o.refundAmount || o.total, reason: o.refundReason ?? '' };
    }
  }

  async onUpdate(e: Event, o: Order) {
    e.preventDefault();
    const draft = this.drafts[o._id];
    const res = await this.adminService.updateRefundStatus(o._id, draft.status, draft.amount ?? undefined, draft.reason || undefined);
    this.orders.update((list) => list.map((x) => (x._id === o._id ? res.order : x)));
    this.toast.success('Refund updated');
  }
}
