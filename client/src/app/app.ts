import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { CartDrawerComponent } from './shared/components/cart-drawer/cart-drawer.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { ProductModalComponent } from './shared/components/product-modal/product-modal.component';
import { ScrollRestorationService } from './core/services/scroll-restoration.service';

// Seller/delivery/admin panels are separate applications with their own nav
// (or none, for their login/signup screens) — they should never show the
// customer-facing header/cart/footer chrome.
const ROLE_PANEL_PREFIXES = ['/seller', '/delivery', '/admin'];

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
      <div class="flex min-h-screen flex-col">
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
  }
}
