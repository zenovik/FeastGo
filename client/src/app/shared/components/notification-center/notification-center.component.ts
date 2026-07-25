import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppNotification, NotificationPriority } from '../../../core/models/notification.model';
import { NotificationService } from '../../../core/services/notification.service';
import { groupNotificationsByDate, iconForNotificationType, priorityColorClass, timeAgo } from '../../utils/notification-format';
import { IconComponent } from '../icon/icon.component';

type BulkAction = 'read' | 'archive' | 'delete';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [IconComponent, FormsModule],
  template: `
    <div class="fixed inset-0 z-[300] flex items-start justify-center bg-ink-900/40 p-3 sm:items-center sm:p-6" (click)="closed.emit()">
      <div class="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-ink-800" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between border-b border-ink-100 p-4 dark:border-ink-700">
          <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Notifications</h2>
          <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700" (click)="closed.emit()" aria-label="Close">
            <app-icon name="x" [size]="18" />
          </button>
        </div>

        <div class="space-y-2 border-b border-ink-100 p-3 dark:border-ink-700">
          <div class="relative">
            <input
              [(ngModel)]="searchInput"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Search notifications"
              class="w-full rounded-lg border border-ink-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-ember-400 dark:border-ink-600 dark:bg-ink-900 dark:text-white"
            />
            <app-icon name="search" [size]="14" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            @for (p of priorities; track p) {
              <button
                type="button"
                class="rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize"
                [class.border-ember-500]="notif.filters().priority === p"
                [class.text-ember-600]="notif.filters().priority === p"
                [class.bg-ember-50]="notif.filters().priority === p"
                [class.border-ink-200]="notif.filters().priority !== p"
                [class.text-ink-500]="notif.filters().priority !== p"
                (click)="togglePriority(p)"
              >
                {{ p }}
              </button>
            }
            <button
              type="button"
              class="ml-auto rounded-full border px-2.5 py-1 text-[11px] font-bold"
              [class.border-ember-500]="notif.filters().archived"
              [class.text-ember-600]="notif.filters().archived"
              [class.border-ink-200]="!notif.filters().archived"
              [class.text-ink-500]="!notif.filters().archived"
              (click)="toggleArchived()"
            >
              {{ notif.filters().archived ? 'Showing archived' : 'Archived' }}
            </button>
          </div>

          @if (selectedIds().size > 0) {
            <div class="flex items-center gap-2 text-xs font-semibold text-ink-600 dark:text-ink-300">
              <span>{{ selectedIds().size }} selected</span>
              <button type="button" class="text-ember-600" (click)="bulk('read')">Mark read</button>
              <button type="button" class="text-ember-600" (click)="bulk('archive')">Archive</button>
              <button type="button" class="text-ember-600" (click)="bulk('delete')">Delete</button>
              <button type="button" class="ml-auto text-ink-400" (click)="clearSelection()">Cancel</button>
            </div>
          } @else {
            <div class="flex items-center justify-between text-xs font-semibold">
              <button type="button" class="text-ember-600 disabled:opacity-40" [disabled]="notif.unreadCount() === 0" (click)="notif.markAllRead()">Mark all read</button>
              <button type="button" class="text-ink-400 hover:text-ember-600" (click)="confirmClearAll()">Clear all</button>
            </div>
          }
        </div>

        <div class="flex-1 overflow-y-auto p-2" (scroll)="onScroll($event)">
          @for (group of groups(); track group.label) {
            <p class="sticky top-0 z-10 bg-white px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:bg-ink-800 dark:text-ink-500">{{ group.label }}</p>
            @for (n of group.items; track n._id) {
              <div
                class="group flex items-start gap-2.5 rounded-lg p-2.5 hover:bg-ink-50 dark:hover:bg-ink-700/50"
                [class.bg-ember-50]="!n.isRead"
                [class.dark:bg-ember-500/10]="!n.isRead"
              >
                <input
                  type="checkbox"
                  class="mt-3 shrink-0 accent-ember-500"
                  [checked]="selectedIds().has(n._id)"
                  (click)="toggleSelect($event, n._id)"
                />
                <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600 dark:bg-ink-700 dark:text-ink-300">
                  <app-icon [name]="iconFor(n.type)" [size]="15" />
                </span>
                <div class="min-w-0 flex-1 cursor-pointer" (click)="onItemClick(n)">
                  <div class="flex items-center gap-1.5">
                    <p class="truncate text-sm font-semibold text-ink-900 dark:text-white">{{ n.title }}</p>
                    @if (!n.isRead) {
                      <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500"></span>
                    }
                  </div>
                  <p class="truncate text-xs text-ink-500 dark:text-ink-400">{{ n.message }}</p>
                  <p class="mt-0.5 flex items-center gap-1 text-[11px] text-ink-400 dark:text-ink-500">
                    <span [class]="priorityColor(n.priority)">{{ timeAgo(n.createdAt) }}</span>
                    @if (n.relatedUserName) {
                      <span>· {{ n.relatedUserName }}</span>
                    }
                  </p>
                </div>
                <div class="mt-1 flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-ink-300 hover:bg-ink-100 hover:text-ember-600 dark:hover:bg-ink-700"
                    (click)="toggleArchiveOne($event, n)"
                    [attr.aria-label]="notif.filters().archived ? 'Restore' : 'Archive'"
                  >
                    <app-icon [name]="notif.filters().archived ? 'download' : 'layers'" [size]="14" />
                  </button>
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-ink-300 hover:bg-ink-100 hover:text-ember-600 dark:hover:bg-ink-700"
                    (click)="deleteItem($event, n)"
                    aria-label="Delete"
                  >
                    <app-icon name="trash" [size]="14" />
                  </button>
                </div>
              </div>
            }
          } @empty {
            @if (!notif.loading()) {
              <p class="p-8 text-center text-sm text-ink-400">No notifications yet.</p>
            }
          }
          @if (notif.loading()) {
            <p class="p-3 text-center text-xs text-ink-400">Loading…</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class NotificationCenterComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  priorities: NotificationPriority[] = ['critical', 'high', 'medium', 'low'];
  searchInput = '';
  selectedIds = signal<Set<string>>(new Set());

  private searchDebounce?: ReturnType<typeof setTimeout>;

  constructor(public notif: NotificationService) {}

  ngOnInit() {
    this.searchInput = this.notif.filters().q;
    this.notif.loadFirstPage();
  }

  groups() {
    return groupNotificationsByDate(this.notif.notifications());
  }

  iconFor(type: string) {
    return iconForNotificationType(type);
  }

  priorityColor(priority: NotificationPriority | undefined) {
    return priorityColorClass(priority);
  }

  timeAgo(iso: string) {
    return timeAgo(iso);
  }

  onSearchChange(value: string) {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.notif.setFilters({ q: value }), 300);
  }

  togglePriority(p: NotificationPriority) {
    this.notif.setFilters({ priority: this.notif.filters().priority === p ? '' : p });
  }

  toggleArchived() {
    this.selectedIds.set(new Set());
    this.notif.setFilters({ archived: !this.notif.filters().archived });
  }

  onScroll(e: Event) {
    const el = e.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      this.notif.loadMore();
    }
  }

  toggleSelect(e: Event, id: string) {
    e.stopPropagation();
    this.selectedIds.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  async bulk(action: BulkAction) {
    await this.notif.bulkAction(action, [...this.selectedIds()]);
    this.clearSelection();
  }

  onItemClick(n: AppNotification) {
    this.notif.onNotificationClick(n);
  }

  toggleArchiveOne(e: Event, n: AppNotification) {
    e.stopPropagation();
    if (this.notif.filters().archived) {
      this.notif.restore(n._id);
    } else {
      this.notif.archive(n._id);
    }
  }

  deleteItem(e: Event, n: AppNotification) {
    e.stopPropagation();
    this.notif.remove(n._id);
  }

  confirmClearAll() {
    if (!this.notif.notifications().length) return;
    if (confirm('Clear all notifications? This cannot be undone.')) {
      this.notif.clearAll();
    }
  }
}
