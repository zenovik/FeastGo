import { Component, EventEmitter, HostListener, OnInit, Output, signal } from '@angular/core';
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
    <div class="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto bg-ink-950/55 p-3 backdrop-blur-sm sm:p-5" (click)="closed.emit()">
      <div
        class="flex h-[min(88dvh,48rem)] min-h-0 max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl shrink-0 flex-col overflow-hidden rounded-[1.5rem] border border-white/60 bg-[#fffdfb] shadow-2xl dark:border-ink-700 dark:bg-ink-800 sm:rounded-[1.75rem]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-center-title"
        (click)="$event.stopPropagation()"
      >
        <div class="relative isolate shrink-0 overflow-hidden border-b border-ink-100 bg-gradient-to-br from-[#fff3e9] via-[#fffaf6] to-white px-5 pb-4 pt-5 dark:border-ink-700 dark:from-ink-800 dark:via-ink-800 dark:to-ink-800 sm:px-6 sm:pt-6">
          <div class="pointer-events-none absolute -right-10 -top-20 -z-10 h-48 w-48 rounded-full bg-ember-200/40 blur-3xl dark:bg-ember-500/10" aria-hidden="true"></div>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ember-600">Stay in the loop</p>
              <div class="mt-1 flex flex-wrap items-center gap-2">
                <h2 id="notification-center-title" class="font-display text-xl font-extrabold text-ink-900 dark:text-white sm:text-2xl">Notifications</h2>
                @if (notif.unreadCount() > 0) {
                  <span class="rounded-full bg-ember-500 px-2.5 py-1 text-[10px] font-extrabold text-white">{{ notif.unreadCount() }} unread</span>
                }
              </div>
              <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">Order updates and important activity, all in one place.</p>
            </div>
            <button type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white bg-white/80 text-ink-500 shadow-sm transition hover:bg-white hover:text-ember-600 dark:border-ink-700 dark:bg-ink-700 dark:text-ink-300 dark:hover:bg-ink-600" (click)="closed.emit()" aria-label="Close">
            <app-icon name="x" [size]="18" />
            </button>
          </div>
        </div>

        <div class="shrink-0 space-y-3 border-b border-ink-100 bg-white/80 p-4 dark:border-ink-700 dark:bg-ink-800 sm:px-6">
          <div class="relative">
            <input
              [(ngModel)]="searchInput"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Search notifications"
              class="min-h-11 w-full rounded-xl border border-ink-200 bg-ink-50/60 py-2 pl-10 pr-3 text-sm font-medium text-ink-800 outline-none transition placeholder:font-normal placeholder:text-ink-400 focus:border-ember-400 focus:bg-white focus:ring-2 focus:ring-ember-100 dark:border-ink-600 dark:bg-ink-900 dark:text-white dark:focus:bg-ink-900 dark:focus:ring-ember-500/10"
            />
            <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            @for (p of priorities; track p) {
              <button
                type="button"
                class="rounded-full border px-3 py-1.5 text-[10px] font-extrabold capitalize transition sm:text-[11px]"
                [class.border-ember-500]="notif.filters().priority === p"
                [class.text-ember-600]="notif.filters().priority === p"
                [class.bg-ember-50]="notif.filters().priority === p"
                [class.border-ink-200]="notif.filters().priority !== p"
                [class.text-ink-500]="notif.filters().priority !== p"
                [class.dark:border-ink-600]="notif.filters().priority !== p"
                [class.dark:text-ink-300]="notif.filters().priority !== p"
                (click)="togglePriority(p)"
              >
                {{ p }}
              </button>
            }
            <button
              type="button"
              class="ml-auto rounded-full border px-3 py-1.5 text-[10px] font-extrabold transition sm:text-[11px]"
              [class.border-ember-500]="notif.filters().archived"
              [class.text-ember-600]="notif.filters().archived"
              [class.border-ink-200]="!notif.filters().archived"
              [class.text-ink-500]="!notif.filters().archived"
              [class.dark:border-ink-600]="!notif.filters().archived"
              [class.dark:text-ink-300]="!notif.filters().archived"
              (click)="toggleArchived()"
            >
              {{ notif.filters().archived ? 'Showing archived' : 'Archived' }}
            </button>
          </div>

          @if (selectedIds().size > 0) {
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-ember-50/80 px-3 py-2.5 text-xs font-bold text-ink-600 dark:bg-ink-700 dark:text-ink-200">
              <span>{{ selectedIds().size }} selected</span>
              <button type="button" class="text-ember-700 dark:text-ember-300" (click)="bulk('read')">Mark read</button>
              <button type="button" class="text-ember-700 dark:text-ember-300" (click)="bulk('archive')">Archive</button>
              <button type="button" class="text-ember-700 dark:text-ember-300" (click)="bulk('delete')">Delete</button>
              <button type="button" class="ml-auto text-ink-400" (click)="clearSelection()">Cancel</button>
            </div>
          } @else {
            <div class="flex items-center justify-between text-xs font-bold">
              <button type="button" class="text-ember-600 transition hover:text-ember-700 disabled:opacity-40" [disabled]="notif.unreadCount() === 0" (click)="notif.markAllRead()">Mark all as read</button>
              <button type="button" class="text-ink-400 transition hover:text-ember-600" (click)="confirmClearAll()">Clear all</button>
            </div>
          }
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto bg-ink-50/50 p-3 dark:bg-ink-900/40 sm:p-4" (scroll)="onScroll($event)">
          @for (group of groups(); track group.label) {
            <p class="sticky top-0 z-10 mb-2 px-1 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-400 dark:text-ink-500">{{ group.label }}</p>
            @for (n of group.items; track n._id) {
              <div
                class="group mb-2 flex items-start gap-2.5 rounded-2xl border border-transparent bg-white p-3 shadow-sm transition hover:border-ink-100 hover:shadow-md dark:bg-ink-800 dark:hover:border-ink-700 sm:gap-3 sm:p-3.5"
                [class.bg-ember-50]="!n.isRead"
                [class.dark:bg-ember-500/10]="!n.isRead"
              >
                <input
                  type="checkbox"
                  class="mt-3 h-4 w-4 shrink-0 accent-ember-500"
                  [checked]="selectedIds().has(n._id)"
                  (click)="toggleSelect($event, n._id)"
                />
                <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-600 dark:bg-ink-700 dark:text-ink-300">
                  <app-icon [name]="iconFor(n.type)" [size]="15" />
                </span>
                <div class="min-w-0 flex-1 cursor-pointer" (click)="onItemClick(n)">
                  <div class="flex items-center gap-1.5">
                    <p class="truncate text-[13px] font-extrabold text-ink-900 dark:text-white">{{ n.title }}</p>
                    @if (!n.isRead) {
                      <span class="h-2 w-2 shrink-0 rounded-full bg-ember-500"></span>
                    }
                  </div>
                  <p class="mt-0.5 line-clamp-2 text-xs leading-5 text-ink-500 dark:text-ink-400">{{ n.message }}</p>
                  <p class="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-medium text-ink-400 dark:text-ink-500">
                    <span [class]="priorityColor(n.priority)">{{ timeAgo(n.createdAt) }}</span>
                    @if (n.relatedUserName) {
                      <span>· {{ n.relatedUserName }}</span>
                    }
                  </p>
                </div>
                <div class="mt-1 flex shrink-0 gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ember-600 dark:hover:bg-ink-700"
                    (click)="toggleArchiveOne($event, n)"
                    [attr.aria-label]="notif.filters().archived ? 'Restore' : 'Archive'"
                  >
                    <app-icon [name]="notif.filters().archived ? 'download' : 'layers'" [size]="14" />
                  </button>
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ember-600 dark:hover:bg-ink-700"
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
              <div class="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-5 py-12 text-center dark:border-ink-700 dark:bg-ink-800">
                <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50 text-ink-400 dark:bg-ink-700">
                  <app-icon name="bell" [size]="24" />
                </span>
                <p class="mt-4 text-sm font-extrabold text-ink-800 dark:text-white">Nothing to see here yet</p>
                <p class="mt-1 max-w-xs text-xs leading-5 text-ink-400">Try changing your search or filters. New updates will appear here.</p>
              </div>
            }
          }
          @if (notif.loading()) {
            <p class="p-4 text-center text-xs font-semibold text-ink-400">Loading notifications…</p>
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

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closed.emit();
  }

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
    if (n.actionUrl) this.closed.emit();
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
