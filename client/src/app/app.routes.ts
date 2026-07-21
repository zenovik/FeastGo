import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'FeastGo — Great food, delivered fast',
  },
  {
    path: 'restaurants',
    loadComponent: () =>
      import('./pages/restaurant-list/restaurant-list.component').then((m) => m.RestaurantListComponent),
    title: 'Restaurants — FeastGo',
  },
  {
    path: 'restaurants/:slug',
    loadComponent: () =>
      import('./pages/restaurant-detail/restaurant-detail.component').then((m) => m.RestaurantDetailComponent),
    title: 'FeastGo',
  },
  {
    path: 'cart',
    loadComponent: () => import('./pages/cart/cart.component').then((m) => m.CartComponent),
    title: 'Your cart — FeastGo',
  },
  {
    path: 'checkout',
    loadComponent: () => import('./pages/checkout/checkout.component').then((m) => m.CheckoutComponent),
    title: 'Checkout — FeastGo',
    canActivate: [authGuard],
  },
  {
    path: 'orders',
    loadComponent: () => import('./pages/orders/orders.component').then((m) => m.OrdersComponent),
    title: 'Your orders — FeastGo',
    canActivate: [authGuard],
  },
  {
    path: 'orders/:id',
    loadComponent: () =>
      import('./pages/order-tracking/order-tracking.component').then((m) => m.OrderTrackingComponent),
    title: 'Track order — FeastGo',
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
    title: 'Your profile — FeastGo',
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
    title: 'Log in — FeastGo',
  },
  {
    path: 'register',
    redirectTo: 'login',
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Not found — FeastGo',
  },
];
