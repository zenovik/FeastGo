import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { sellerGuard } from './core/guards/seller.guard';
import { deliveryGuard } from './core/guards/delivery.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'FeastGo — Great food, delivered fast',
  },
  {
    path: 'restaurants',
    loadComponent: () => import('./pages/food-list/food-list.component').then((m) => m.FoodListComponent),
    title: 'Food — FeastGo',
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
    path: 'favorites',
    loadComponent: () => import('./pages/favorites/favorites.component').then((m) => m.FavoritesComponent),
    title: 'Your bookmarks — FeastGo',
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

  // ---- Restaurant Owner (Seller) ----
  {
    path: 'seller/login',
    loadComponent: () => import('./pages/seller/login/seller-login.component').then((m) => m.SellerLoginComponent),
    title: 'Partner login — FeastGo',
  },
  {
    path: 'seller/signup',
    loadComponent: () => import('./pages/seller/signup/seller-signup.component').then((m) => m.SellerSignupComponent),
    title: 'Partner signup — FeastGo',
  },
  {
    path: 'seller/dashboard',
    loadComponent: () =>
      import('./pages/seller/dashboard/seller-dashboard.component').then((m) => m.SellerDashboardComponent),
    title: 'Seller dashboard — FeastGo',
    canActivate: [sellerGuard],
  },
  {
    path: 'seller/menu',
    loadComponent: () => import('./pages/seller/menu/seller-menu.component').then((m) => m.SellerMenuComponent),
    title: 'Menu — FeastGo',
    canActivate: [sellerGuard],
  },
  {
    path: 'seller/orders',
    loadComponent: () => import('./pages/seller/orders/seller-orders.component').then((m) => m.SellerOrdersComponent),
    title: 'Orders — FeastGo',
    canActivate: [sellerGuard],
  },
  {
    path: 'seller/offers',
    loadComponent: () => import('./pages/seller/offers/seller-offers.component').then((m) => m.SellerOffersComponent),
    title: 'Offers — FeastGo',
    canActivate: [sellerGuard],
  },
  {
    path: 'seller/reviews',
    loadComponent: () => import('./pages/seller/reviews/seller-reviews.component').then((m) => m.SellerReviewsComponent),
    title: 'Reviews — FeastGo',
    canActivate: [sellerGuard],
  },
  {
    path: 'seller/reports',
    loadComponent: () => import('./pages/seller/reports/seller-reports.component').then((m) => m.SellerReportsComponent),
    title: 'Reports — FeastGo',
    canActivate: [sellerGuard],
  },
  {
    path: 'seller/settings',
    loadComponent: () =>
      import('./pages/seller/settings/seller-settings.component').then((m) => m.SellerSettingsComponent),
    title: 'Settings — FeastGo',
    canActivate: [sellerGuard],
  },

  // ---- Delivery Partner ----
  {
    path: 'delivery/login',
    loadComponent: () =>
      import('./pages/delivery/login/delivery-login.component').then((m) => m.DeliveryLoginComponent),
    title: 'Delivery login — FeastGo',
  },
  {
    path: 'delivery/signup',
    loadComponent: () =>
      import('./pages/delivery/signup/delivery-signup.component').then((m) => m.DeliverySignupComponent),
    title: 'Delivery signup — FeastGo',
  },
  {
    path: 'delivery/dashboard',
    loadComponent: () =>
      import('./pages/delivery/dashboard/delivery-dashboard.component').then((m) => m.DeliveryDashboardComponent),
    title: 'Delivery dashboard — FeastGo',
    canActivate: [deliveryGuard],
  },
  {
    path: 'delivery/orders',
    loadComponent: () =>
      import('./pages/delivery/orders/delivery-orders.component').then((m) => m.DeliveryOrdersComponent),
    title: 'Deliveries — FeastGo',
    canActivate: [deliveryGuard],
  },
  {
    path: 'delivery/history',
    loadComponent: () =>
      import('./pages/delivery/history/delivery-history.component').then((m) => m.DeliveryHistoryComponent),
    title: 'Delivery history — FeastGo',
    canActivate: [deliveryGuard],
  },
  {
    path: 'delivery/profile',
    loadComponent: () =>
      import('./pages/delivery/profile/delivery-profile.component').then((m) => m.DeliveryProfileComponent),
    title: 'Delivery profile — FeastGo',
    canActivate: [deliveryGuard],
  },

  // ---- Admin ----
  {
    path: 'admin/login',
    loadComponent: () => import('./pages/admin/login/admin-login.component').then((m) => m.AdminLoginComponent),
    title: 'Admin login — FeastGo',
  },
  {
    path: 'admin/dashboard',
    loadComponent: () =>
      import('./pages/admin/dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
    title: 'Admin dashboard — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./pages/admin/users/admin-users.component').then((m) => m.AdminUsersComponent),
    title: 'Users — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/sellers',
    loadComponent: () => import('./pages/admin/sellers/admin-sellers.component').then((m) => m.AdminSellersComponent),
    title: 'Sellers — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/delivery-partners',
    loadComponent: () =>
      import('./pages/admin/delivery-partners/admin-delivery-partners.component').then((m) => m.AdminDeliveryPartnersComponent),
    title: 'Delivery partners — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/restaurants',
    loadComponent: () =>
      import('./pages/admin/restaurants/admin-restaurants.component').then((m) => m.AdminRestaurantsComponent),
    title: 'Restaurants — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/foods',
    loadComponent: () => import('./pages/admin/foods/admin-foods.component').then((m) => m.AdminFoodsComponent),
    title: 'Foods — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/categories',
    loadComponent: () =>
      import('./pages/admin/categories/admin-categories.component').then((m) => m.AdminCategoriesComponent),
    title: 'Categories — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/orders',
    loadComponent: () => import('./pages/admin/orders/admin-orders.component').then((m) => m.AdminOrdersComponent),
    title: 'Orders — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/refunds',
    loadComponent: () => import('./pages/admin/refunds/admin-refunds.component').then((m) => m.AdminRefundsComponent),
    title: 'Payments & Refunds — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/coupons',
    loadComponent: () => import('./pages/admin/coupons/admin-coupons.component').then((m) => m.AdminCouponsComponent),
    title: 'Coupons — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/banners',
    loadComponent: () => import('./pages/admin/banners/admin-banners.component').then((m) => m.AdminBannersComponent),
    title: 'Banners — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/reviews',
    loadComponent: () => import('./pages/admin/reviews/admin-reviews.component').then((m) => m.AdminReviewsComponent),
    title: 'Reviews — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/reports',
    loadComponent: () => import('./pages/admin/reports/admin-reports.component').then((m) => m.AdminReportsComponent),
    title: 'Reports — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/notifications',
    loadComponent: () =>
      import('./pages/admin/notifications/admin-notifications.component').then((m) => m.AdminNotificationsComponent),
    title: 'Notifications — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/settings',
    loadComponent: () => import('./pages/admin/settings/admin-settings.component').then((m) => m.AdminSettingsComponent),
    title: 'Settings — FeastGo',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/security',
    loadComponent: () => import('./pages/admin/security/admin-security.component').then((m) => m.AdminSecurityComponent),
    title: 'Security — FeastGo',
    canActivate: [adminGuard],
  },

  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Not found — FeastGo',
  },
];
