import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.initialized()) {
    await new Promise<void>((resolve) => {
      const check = () => {
        if (auth.initialized()) resolve();
        else setTimeout(check, 25);
      };
      check();
    });
  }

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};
