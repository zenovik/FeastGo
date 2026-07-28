import { Component, OnDestroy, OnInit, effect } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemeService } from '../../../core/services/theme.service';
import { IconComponent } from '../icon/icon.component';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

@Component({
  selector: 'app-delivery-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, NotificationBellComponent],
  template: `
    <header class="border-b border-ink-100 bg-white dark:border-ink-700 dark:bg-ink-900">
      <div class="container-shell flex h-16 items-center gap-6">
        <a routerLink="/delivery/dashboard" class="flex items-center gap-2 font-display text-lg font-extrabold text-ink-900 dark:text-white">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-500 text-white">
            <app-icon name="bike" [size]="16" />
          </span>
          Delivery Panel
        </a>
        <nav class="ml-auto flex items-center gap-1 text-sm font-semibold">
          <a routerLink="/delivery/dashboard" routerLinkActive="text-ember-600 bg-ember-50 dark:bg-ember-500/10" class="rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800">Dashboard</a>
          <a routerLink="/delivery/orders" routerLinkActive="text-ember-600 bg-ember-50 dark:bg-ember-500/10" class="rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800">Orders</a>
          <a routerLink="/delivery/history" routerLinkActive="text-ember-600 bg-ember-50 dark:bg-ember-500/10" class="rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800">History</a>
          <a routerLink="/delivery/profile" routerLinkActive="text-ember-600 bg-ember-50 dark:bg-ember-500/10" class="rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800">Profile</a>
          <a routerLink="/delivery/settings" routerLinkActive="text-ember-600 bg-ember-50 dark:bg-ember-500/10" class="rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800">Settings</a>
          <button
            type="button"
            class="rounded-lg p-2 text-ink-500 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800"
            (click)="theme.toggle()"
            [attr.aria-label]="theme.dark() ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <app-icon [name]="theme.dark() ? 'sun' : 'moon'" [size]="18" />
          </button>
          <app-notification-bell role="delivery" [dark]="theme.dark()" [iconSize]="18" />
          <button type="button" class="ml-2 rounded-lg px-3 py-2 text-ember-600 hover:bg-ember-50 dark:hover:bg-ember-500/10" (click)="logout()">Sign out</button>
        </nav>
      </div>
    </header>
  `,
})
export class DeliveryNavComponent implements OnInit, OnDestroy {
  private accountPollHandle?: ReturnType<typeof setInterval>;

  constructor(
    public auth: DeliveryAuthService,
    public notif: NotificationService,
    public theme: ThemeService,
    private router: Router
  ) {
    // No shared root wrapper exists for the delivery portal (unlike the
    // seller/admin shells), so this nav — present on every delivery page —
    // is the closest thing to one: it toggles `.dark` on <html> itself so
    // the class cascades to whatever page template sits below it, and clears
    // it on destroy so it can't leak into the customer/seller portals.
    effect(() => {
      document.documentElement.classList.toggle('dark', this.theme.dark());
    });
    effect(() => {
      const serverTheme = this.auth.currentUser()?.theme;
      if (serverTheme) this.theme.syncFromServer(serverTheme);
    });
  }

  ngOnInit() {
    this.notif.init('delivery');
    // While pending/rejected/suspended, an admin can change that status at
    // any moment from their own session — keep this tab's own account fresh
    // so the banner clears itself instead of needing a manual reload.
    this.accountPollHandle = setInterval(async () => {
      const partner = this.auth.currentUser();
      if (!partner || (partner.status === 'approved' && !partner.isSuspended)) {
        if (this.accountPollHandle) clearInterval(this.accountPollHandle);
        return;
      }
      await this.auth.refreshMe();
    }, 15000);
  }

  ngOnDestroy() {
    if (this.accountPollHandle) clearInterval(this.accountPollHandle);
    document.documentElement.classList.remove('dark');
  }

  async logout() {
    await this.auth.logout();
    this.notif.disconnect();
    this.router.navigate(['/delivery/login']);
  }
}
