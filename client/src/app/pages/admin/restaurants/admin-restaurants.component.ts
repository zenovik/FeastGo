import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Restaurant } from '../../../core/models/restaurant.model';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminShellComponent } from '../../../shared/components/admin-shell/admin-shell.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

interface Performance {
  totalRevenue: number;
  deliveredOrders: number;
  ordersByStatus: { status: string; count: number }[];
  topItems: { name: string; qty: number }[];
}

interface EditForm {
  name: string;
  description: string;
  priceRange: 1 | 2 | 3;
  deliveryFee: number;
  minOrder: number;
  offer: string;
  isOpen: boolean;
  isFeatured: boolean;
  isPromoted: boolean;
}

@Component({
  selector: 'app-admin-restaurants',
  standalone: true,
  imports: [AdminShellComponent, InrPipe, FormsModule],
  template: `
    <app-admin-shell title="Restaurants">
      <div class="flex flex-wrap items-center gap-2">
        <input
          [(ngModel)]="query"
          (ngModelChange)="scheduleFetch()"
          placeholder="Search restaurants…"
          class="w-64 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
        />
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
        <p class="text-sm text-ink-400">{{ restaurants().length }} restaurants</p>
      </div>

      <div class="mt-3 space-y-2">
        @for (r of restaurants(); track r._id) {
          <div class="card-surface p-3.5">
            <div class="flex flex-wrap items-center gap-3">
              <img [src]="r.coverImage" [alt]="r.name" class="h-12 w-12 rounded-lg object-cover" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-ink-900 dark:text-white">{{ r.name }}</p>
                <p class="text-xs text-ink-400">{{ r.address.city }}</p>
              </div>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-bold capitalize"
                [class.bg-basil-100]="r.verificationStatus === 'approved'"
                [class.text-basil-700]="r.verificationStatus === 'approved'"
                [class.bg-gold-100]="r.verificationStatus === 'pending'"
                [class.text-gold-700]="r.verificationStatus === 'pending'"
                [class.bg-ember-100]="r.verificationStatus === 'rejected'"
                [class.text-ember-700]="r.verificationStatus === 'rejected'"
              >
                {{ r.verificationStatus }}
              </span>
              @if (r.isSuspended) {
                <span class="rounded-full bg-ink-800 px-2.5 py-1 text-xs font-bold text-white">Suspended</span>
              }
              <div class="flex flex-wrap gap-2">
                @if (r.verificationStatus !== 'approved') {
                  <button type="button" class="rounded-lg bg-basil-500 px-3 py-1.5 text-xs font-bold text-white" (click)="setStatus(r, 'approved')">Approve</button>
                }
                @if (r.verificationStatus !== 'rejected') {
                  <button type="button" class="rounded-lg border border-ember-500 px-3 py-1.5 text-xs font-bold text-ember-600" (click)="setStatus(r, 'rejected')">Reject</button>
                }
                <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 dark:border-ink-700 dark:text-ink-300" (click)="toggleSuspend(r)">
                  {{ r.isSuspended ? 'Unsuspend' : 'Suspend' }}
                </button>
                <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 dark:border-ink-700 dark:text-ink-300" (click)="toggleEdit(r)">
                  {{ editId() === r._id ? 'Close' : 'Edit' }}
                </button>
                <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 dark:border-ink-700 dark:text-ink-300" (click)="togglePerf(r)">
                  {{ perfId() === r._id ? 'Hide' : 'Performance' }}
                </button>
                <button type="button" class="rounded-lg border border-ember-500 px-3 py-1.5 text-xs font-bold text-ember-600" (click)="remove(r)">
                  Delete
                </button>
              </div>
            </div>

            @if (editId() === r._id) {
              <form class="mt-3 grid gap-2 border-t border-ink-100 pt-3 sm:grid-cols-2 dark:border-ink-700" (submit)="saveEdit($event, r)">
                <input [(ngModel)]="editForm.name" name="name" placeholder="Name" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                <input [(ngModel)]="editForm.offer" name="offer" placeholder="Offer text" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                <textarea [(ngModel)]="editForm.description" name="description" placeholder="Description" rows="2" class="sm:col-span-2 rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"></textarea>
                <input type="number" [(ngModel)]="editForm.deliveryFee" name="deliveryFee" placeholder="Delivery fee" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                <input type="number" [(ngModel)]="editForm.minOrder" name="minOrder" placeholder="Min order" class="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                <label class="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300"><input type="checkbox" [(ngModel)]="editForm.isOpen" name="isOpen" /> Open</label>
                <label class="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300"><input type="checkbox" [(ngModel)]="editForm.isFeatured" name="isFeatured" /> Featured</label>
                <label class="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300"><input type="checkbox" [(ngModel)]="editForm.isPromoted" name="isPromoted" /> Promoted</label>
                <button type="submit" class="sm:col-span-2 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white">Save changes</button>
              </form>
            }

            @if (perfId() === r._id) {
              <div class="mt-3 border-t border-ink-100 pt-3 dark:border-ink-700">
                @if (perf(); as p) {
                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div class="rounded-lg bg-ink-50 p-2.5 text-center dark:bg-ink-900/40">
                      <p class="text-[11px] uppercase text-ink-400">Revenue</p>
                      <p class="font-bold text-ink-900 dark:text-white">{{ p.totalRevenue | inr }}</p>
                    </div>
                    <div class="rounded-lg bg-ink-50 p-2.5 text-center dark:bg-ink-900/40">
                      <p class="text-[11px] uppercase text-ink-400">Delivered</p>
                      <p class="font-bold text-ink-900 dark:text-white">{{ p.deliveredOrders }}</p>
                    </div>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    @for (item of p.topItems; track item.name) {
                      <span class="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-600 dark:bg-ink-700 dark:text-ink-300">{{ item.name }} × {{ item.qty }}</span>
                    }
                  </div>
                } @else {
                  <p class="text-sm text-ink-400">Loading performance…</p>
                }
              </div>
            }
          </div>
        } @empty {
          <p class="text-sm text-ink-400">No restaurants found.</p>
        }
      </div>
    </app-admin-shell>
  `,
})
export class AdminRestaurantsComponent implements OnInit {
  restaurants = signal<Restaurant[]>([]);
  query = '';
  status = '';
  editId = signal<string | null>(null);
  perfId = signal<string | null>(null);
  perf = signal<Performance | null>(null);
  editForm: EditForm = this.emptyForm();

  private fetchTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.fetch();
  }

  private emptyForm(): EditForm {
    return { name: '', description: '', priceRange: 2, deliveryFee: 0, minOrder: 0, offer: '', isOpen: true, isFeatured: false, isPromoted: false };
  }

  scheduleFetch() {
    clearTimeout(this.fetchTimer);
    this.fetchTimer = setTimeout(() => this.fetch(), 300);
  }

  async fetch() {
    const res = await this.adminService.listRestaurants(this.status || undefined, this.query.trim() || undefined);
    this.restaurants.set(res.restaurants);
  }

  async setStatus(r: Restaurant, status: string) {
    const res = await this.adminService.setRestaurantStatus(r._id, status);
    this.restaurants.update((list) => list.map((x) => (x._id === r._id ? res.restaurant : x)));
    this.toast.success(`Restaurant ${status}`);
  }

  async toggleSuspend(r: Restaurant) {
    const res = await this.adminService.setRestaurantSuspension(r._id, !r.isSuspended);
    this.restaurants.update((list) => list.map((x) => (x._id === r._id ? res.restaurant : x)));
    this.toast.success(res.restaurant.isSuspended ? 'Restaurant suspended' : 'Restaurant unsuspended');
  }

  toggleEdit(r: Restaurant) {
    if (this.editId() === r._id) {
      this.editId.set(null);
      return;
    }
    this.editId.set(r._id);
    this.editForm = {
      name: r.name,
      description: r.description,
      priceRange: r.priceRange,
      deliveryFee: r.deliveryFee,
      minOrder: r.minOrder,
      offer: r.offer,
      isOpen: r.isOpen,
      isFeatured: r.isFeatured,
      isPromoted: r.isPromoted,
    };
  }

  async saveEdit(e: Event, r: Restaurant) {
    e.preventDefault();
    const res = await this.adminService.updateRestaurant(r._id, this.editForm);
    this.restaurants.update((list) => list.map((x) => (x._id === r._id ? res.restaurant : x)));
    this.editId.set(null);
    this.toast.success('Restaurant updated');
  }

  async togglePerf(r: Restaurant) {
    if (this.perfId() === r._id) {
      this.perfId.set(null);
      return;
    }
    this.perfId.set(r._id);
    this.perf.set(null);
    this.perf.set(await this.adminService.getRestaurantPerformance(r._id));
  }

  async remove(r: Restaurant) {
    if (!confirm(`Delete "${r.name}"? This also deletes its menu, and cannot be undone.`)) return;
    await this.adminService.deleteRestaurant(r._id);
    this.restaurants.update((list) => list.filter((x) => x._id !== r._id));
    this.toast.success('Restaurant deleted');
  }
}
