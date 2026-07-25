import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { AppNotification } from '../../../core/models/notification.model';
import { NotificationService } from '../../../core/services/notification.service';
import { NotifRole } from '../../../core/services/realtime.service';
import { iconForNotificationType, timeAgo } from '../../utils/notification-format';
import { IconComponent } from '../icon/icon.component';
import { NotificationCenterComponent } from '../notification-center/notification-center.component';

// Drop-in notification bell used identically in the customer header, seller
// shell, admin shell and delivery nav — owns only the compact dropdown +
// badge + bell-ring animation; the full grouped/searchable view lives in
// NotificationCenterComponent, opened from "View all".
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [IconComponent, NotificationCenterComponent],
  template: `
    <div class="relative" #wrapper>
      <button
        type="button"
        class="relative rounded-lg p-2 hover:bg-ink-50"
        [class]="dark ? 'text-ink-300 hover:bg-ink-700' : 'text-ink-700'"
        (click)="toggle()"
        aria-label="Notifications"
      >
        <app-icon name="bell" [size]="iconSize" [class.animate-bell-ring]="notif.justArrived()" />
        @if (notif.unreadCount() > 0) {
          <span class="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-white">
            {{ notif.unreadCount() > 9 ? '9+' : notif.unreadCount() }}
          </span>
        }
      </button>

      @if (open()) {
        <div
          class="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border p-2 shadow-[var(--shadow-pop)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-80"
          [class]="dark ? 'border-ink-700 bg-ink-800' : 'border-ink-100 bg-white'"
        >
          <div class="flex items-center justify-between px-2 py-1.5">
            <p class="text-sm font-bold" [class]="dark ? 'text-white' : 'text-ink-900'">Notifications</p>
            @if (notif.unreadCount() > 0) {
              <button type="button" class="text-xs font-semibold text-ember-600" (click)="notif.markAllRead()">Mark all read</button>
            }
          </div>
          <div class="max-h-80 overflow-y-auto">
            @for (n of recent(); track n._id) {
              <button
                type="button"
                class="flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left"
                [class]="dark ? 'hover:bg-ink-700/50' : 'hover:bg-ink-50'"
                [class.bg-ember-50]="!n.isRead && !dark"
                [class.dark:bg-ember-500/10]="!n.isRead && dark"
                (click)="onItemClick(n)"
              >
                <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" [class]="dark ? 'bg-ink-700 text-ink-300' : 'bg-ink-100 text-ink-600'">
                  <app-icon [name]="iconFor(n.type)" [size]="14" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold" [class]="dark ? 'text-white' : 'text-ink-900'">{{ n.title }}</span>
                  <span class="block truncate text-xs" [class]="dark ? 'text-ink-400' : 'text-ink-400'">{{ n.message }}</span>
                  <span class="mt-0.5 block text-[11px] text-ink-400">{{ timeAgo(n.createdAt) }}</span>
                </span>
                @if (!n.isRead) {
                  <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500"></span>
                }
              </button>
            } @empty {
              <p class="p-4 text-center text-sm text-ink-400">No notifications yet.</p>
            }
          </div>
          <button
            type="button"
            class="mt-1 w-full rounded-lg py-2 text-center text-xs font-bold text-ember-600"
            [class]="dark ? 'hover:bg-ink-700' : 'hover:bg-ink-50'"
            (click)="openCenter()"
          >
            View all
          </button>
        </div>
      }
    </div>

    @if (centerOpen()) {
      <app-notification-center (closed)="centerOpen.set(false)" />
    }
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
  centerOpen = signal(false);

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
    this.centerOpen.set(true);
  }
}
