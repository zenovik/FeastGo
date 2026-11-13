import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // 'disabled' — Angular still emits Scroll router events with the saved
      // position, it just skips auto-applying them; ScrollRestorationService
      // (see app.ts) handles that itself instead. The router's own auto-apply
      // fires too early for pages that load content asynchronously (home, food
      // feed) — before the fetch resolves — and silently fails on them.
      withInMemoryScrolling({ scrollPositionRestoration: 'disabled', anchorScrolling: 'enabled' })
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
  ],
};
