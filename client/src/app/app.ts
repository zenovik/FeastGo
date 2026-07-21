import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { CartDrawerComponent } from './shared/components/cart-drawer/cart-drawer.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { ProductModalComponent } from './shared/components/product-modal/product-modal.component';

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
    <div class="flex min-h-screen flex-col">
      <app-header />
      <main class="flex-1">
        <router-outlet />
      </main>
      <app-footer />
    </div>
    <app-cart-drawer />
    <app-toast-container />
    <app-confirm-dialog />
    <app-product-modal />
  `,
})
export class App {}
