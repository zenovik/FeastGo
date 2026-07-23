import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DeliveryAuthService } from '../services/delivery-auth.service';

export const deliveryGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(DeliveryAuthService);
  const router = inject(Router);

  if (!auth.initialized()) {
    await new Promise<void>((resolve) => {
      const check = () => (auth.initialized() ? resolve() : setTimeout(check, 25));
      check();
    });
  }

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/delivery/login'], { queryParams: { redirect: state.url } });
};
