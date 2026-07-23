import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SellerAuthService } from '../services/seller-auth.service';

export const sellerGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(SellerAuthService);
  const router = inject(Router);

  if (!auth.initialized()) {
    await new Promise<void>((resolve) => {
      const check = () => (auth.initialized() ? resolve() : setTimeout(check, 25));
      check();
    });
  }

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/seller/login'], { queryParams: { redirect: state.url } });
};
