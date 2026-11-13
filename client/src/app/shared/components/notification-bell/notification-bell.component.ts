import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { AppNotification } from '../../../core/models/notification.model';
import { NotificationService } from '../../../core/services/notification.service';
import { NotifRole } from '../../../core/services/realtime.service';
import { iconForNotificationType, timeAgo } from '../../utils/notification-format';
import { IconComponent } from '../icon/icon.component';

// Drop-in notification bell used identically in the customer header, seller
// shell, admin shell and delivery nav — owns only the compact dropdown +
// badge + bell-ring animation; the full grouped/searchable view lives in
// NotificationCenterComponent, opened from "View all".
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="relative" #wrapper>
      <button
        type="button"
        class="relative flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500 dark:hover:bg-ink-700"
        [class]="dark ? 'text-ink-300 hover:bg-ink-700' : 'text-ink-700'"
        (click)="toggle()"
        aria-label="Notifications"
        aria-haspopup="dialog"
        [attr.aria-expanded]="open()"
      >
        <app-icon name="bell" [size]="iconSize" [class.animate-bell-ring]="notif.justArrived()" />
        @if (notif.unreadCount() > 0) {
          <span class="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-white bg-ember-500 px-1 text-[9px] font-extrabold leading-none text-white shadow-sm dark:border-ink-900">
            {{ notif.unreadCount() > 9 ? '9+' : notif.unreadCount() }}
          </span>
        }
      </button>

      @if (open()) {
        <div
          class="fixed inset-x-3 top-[4.5rem] z-[120] overflow-hidden rounded-[1.4rem] border shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[23rem]"
          [class]="dark ? 'border-ink-700 bg-ink-800' : 'border-ink-100 bg-[#fffdfb]'"
          role="dialog"
          aria-label="Recent notifications"
        >
          <div class="border-b px-4 pb-3 pt-4" [class]="dark ? 'border-ink-700 bg-ink-800' : 'border-ink-100 bg-gradient-to-br from-[#fff5eb] to-white'">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ember-600">Your updates</p>
                <h2 class="mt-1 font-display text-lg font-extrabold" [class]="dark ? 'text-white' : 'text-ink-900'">Notifications</h2>
              </div>
              @if (notif.unreadCount() > 0) {
                <span class="rounded-full bg-ember-500 px-2.5 py-1 text-[10px] font-extrabold text-white">
                  {{ notif.unreadCount() }} new
                </span>
              }
            </div>
            @if (notif.unreadCount() > 0) {
              <button
                type="button"
                class="mt-3 text-xs font-bold text-ember-600 transition hover:text-ember-700"
                (click)="notif.markAllRead()"
              >
                Mark all as read
              </button>
            }
          </div>

          <div class="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
            @for (n of recent(); track n._id) {
              <button
                type="button"
                class="group flex w-full items-start gap-3 rounded-xl p-3 text-left transition"
                [class]="dark ? 'hover:bg-ink-700/70' : 'hover:bg-ink-50'"
                [class.bg-ember-50]="!n.isRead && !dark"
                [class.dark:bg-ember-500/10]="!n.isRead && dark"
                (click)="onItemClick(n)"
              >
                <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105" [class]="dark ? 'bg-ink-700 text-ink-300' : 'bg-white text-ember-600 shadow-sm ring-1 ring-ink-100'">
                  <app-icon [name]="iconFor(n.type)" [size]="14" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-[13px] font-extrabold" [class]="dark ? 'text-white' : 'text-ink-900'">{{ n.title }}</span>
                  <span class="mt-0.5 block line-clamp-2 text-xs leading-5" [class]="dark ? 'text-ink-300' : 'text-ink-500'">{{ n.message }}</span>
                  <span class="mt-1 block text-[10px] font-semibold text-ink-400">{{ timeAgo(n.createdAt) }}</span>
                </span>
                @if (!n.isRead) {
                  <span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-ember-500 ring-4 ring-ember-100 dark:ring-ember-500/15"></span>
                }
              </button>
            } @empty {
              <div class="flex flex-col items-center px-5 py-8 text-center">
                <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-50 text-ink-400 dark:bg-ink-700 dark:text-ink-300">
                  <app-icon name="bell" [size]="21" />
                </span>
                <p class="mt-3 text-sm font-bold" [class]="dark ? 'text-white' : 'text-ink-800'">You’re all caught up</p>
                <p class="mt-1 text-xs text-ink-400">New updates will appear here.</p>
              </div>
            }
          </div>

          <button
            type="button"
            class="flex min-h-11 w-full items-center justify-center gap-1 border-t text-xs font-extrabold text-ember-600 transition"
            [class]="dark ? 'border-ink-700 hover:bg-ink-700' : 'border-ink-100 hover:bg-ember-50/60'"
            (click)="openCenter()"
          >
            View all notifications
            <app-icon name="chevron_right" [size]="14" />
          </button>
        </div>
      }
    </div>

  `,
  styles: [
    `
      @keyframes bellRing {
        0%,
        100% {
          transform: rotate(0deg);
        }
        15% {
          transform: rotate(18deg);
        }
        30% {
          transform: rotate(-14deg);
        }
        45% {
          transform: rotate(10deg);
        }
        60% {
          transform: rotate(-6deg);
        }
        75% {
          transform: rotate(3deg);
        }
      }
      .animate-bell-ring {
        animation: bellRing 0.7s ease-in-out;
        transform-origin: top center;
      }
    `,
  ],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  @Input({ required: true }) role!: NotifRole;
  @Input() dark = false;
  @Input() iconSize = 20;

  open = signal(false);

  @ViewChild('wrapper') wrapper?: ElementRef<HTMLElement>;

  constructor(public notif: NotificationService) {}

  ngOnInit() {
    this.notif.init(this.role);
  }

  ngOnDestroy() {
    // Intentionally does not disconnect the socket here — the bell can be
    // torn down/recreated by route changes within the same authenticated
    // session (e.g. Angular re-rendering the shell), and reconnecting on
    // every one of those would drop real-time delivery for no reason.
    // Each shell's own logout() calls notif.disconnect() explicitly instead.
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.open() && !this.wrapper?.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  recent() {
    return this.notif.notifications().slice(0, 8);
  }

  iconFor(type: string) {
    return iconForNotificationType(type);
  }

  timeAgo(iso: string) {
    return timeAgo(iso);
  }

  toggle() {
    this.open.update((v) => !v);
    if (this.open()) this.notif.loadFirstPage();
  }

  onItemClick(n: AppNotification) {
    this.notif.onNotificationClick(n);
    this.open.set(false);
  }

  openCenter() {
    this.open.set(false);
    this.notif.centerOpen.set(true);
  }
}
