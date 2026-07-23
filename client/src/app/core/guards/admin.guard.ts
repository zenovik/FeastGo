import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);

  if (!auth.initialized()) {
    await new Promise<void>((resolve) => {
      const check = () => (auth.initialized() ? resolve() : setTimeout(check, 25));
      check();
    });
  }

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/admin/login'], { queryParams: { redirect: state.url } });
};
