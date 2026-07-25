import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { IconComponent } from '../icon/icon.component';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

@Component({
  selector: 'app-delivery-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, NotificationBellComponent],
  template: `
    <header class="border-b border-ink-100 bg-white">
      <div class="container-shell flex h-16 items-center gap-6">
        <a routerLink="/delivery/dashboard" class="flex items-center gap-2 font-display text-lg font-extrabold text-ink-900">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-500 text-white">
            <app-icon name="bike" [size]="16" />
          </span>
          Delivery Panel
        </a>
        <nav class="ml-auto flex items-center gap-1 text-sm font-semibold">
          <a routerLink="/delivery/dashboard" routerLinkActive="text-ember-600 bg-ember-50" class="rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-50">Dashboard</a>
          <a routerLink="/delivery/orders" routerLinkActive="text-ember-600 bg-ember-50" class="rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-50">Orders</a>
          <a routerLink="/delivery/history" routerLinkActive="text-ember-600 bg-ember-50" class="rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-50">History</a>
          <a routerLink="/delivery/profile" routerLinkActive="text-ember-600 bg-ember-50" class="rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-50">Profile</a>
          <app-notification-bell role="delivery" [iconSize]="18" />
          <button type="button" class="ml-2 rounded-lg px-3 py-2 text-ember-600 hover:bg-ember-50" (click)="logout()">Sign out</button>
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
    private router: Router
  ) {}

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
  }

  async logout() {
    await this.auth.logout();
    this.notif.disconnect();
    this.router.navigate(['/delivery/login']);
  }
}
