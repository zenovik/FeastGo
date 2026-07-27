import { Component, effect, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { CartDrawerComponent } from './shared/components/cart-drawer/cart-drawer.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { ProductModalComponent } from './shared/components/product-modal/product-modal.component';
import { AuthService } from './core/services/auth.service';
import { ScrollRestorationService } from './core/services/scroll-restoration.service';
import { ThemeService } from './core/services/theme.service';

// Seller/delivery/admin panels are separate applications with their own nav
// (or none, for their login/signup screens) — they should never show the
// customer-facing header/cart/footer chrome.
const ROLE_PANEL_PREFIXES = ['/seller', '/delivery', '/admin'];

// Matches Tailwind's `md` breakpoint — below this, the customer app opens
// straight to login for a signed-out visitor instead of the home page.
const MOBILE_BREAKPOINT_PX = 768;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    ToastContainerComponent,
    CartDrawerComponent,
    ConfirmDialogComponent,
    ProductModalComponent,
  ],
  template: `
    @if (showCustomerChrome()) {
      <div class="flex min-h-screen flex-col bg-ink-50 text-ink-800 dark:bg-ink-900 dark:text-ink-100" [class.dark]="theme.dark()">
        <app-header />
        <main class="flex-1">
          <router-outlet />
        </main>
        <app-footer />
      </div>
      <app-cart-drawer />
      <app-confirm-dialog />
      <app-product-modal />
    } @else {
      <router-outlet />
    }
    <app-toast-container />
  `,
})
export class App {
  showCustomerChrome = signal(true);

  constructor(
    router: Router,
    auth: AuthService,
    public theme: ThemeService,
    // Injected only to instantiate it eagerly at bootstrap — its constructor
    // wires up the global scroll-restoration listener (see the service for why
    // this replaces the router's own automatic restoration).
    _scrollRestoration: ScrollRestorationService
  ) {
    router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.showCustomerChrome.set(!ROLE_PANEL_PREFIXES.some((prefix) => event.urlAfterRedirects.startsWith(prefix)));
      }
    });

    effect(() => {
      const serverTheme = auth.currentUser()?.theme;
      if (serverTheme) theme.syncFromServer(serverTheme);
    });

    this.redirectMobileToLoginOnOpen(router, auth);
  }

  // On a mobile-width screen, a signed-out visitor opening the app lands on
  // /login instead of the home page. Runs once at bootstrap only — it never
  // interrupts in-app navigation, and never applies to the seller/delivery/admin
  // panels (they have their own login screens).
  private async redirectMobileToLoginOnOpen(router: Router, auth: AuthService) {
    if (typeof window === 'undefined' || window.innerWidth >= MOBILE_BREAKPOINT_PX) return;

    const path = window.location.pathname;
    if (ROLE_PANEL_PREFIXES.some((prefix) => path.startsWith(prefix)) || path.startsWith('/login')) return;

    if (!auth.initialized()) {
      await new Promise<void>((resolve) => {
        const check = () => (auth.initialized() ? resolve() : setTimeout(check, 25));
        check();
      });
    }

    if (!auth.isAuthenticated()) router.navigate(['/login']);
  }
}
