import { HttpInterceptorFn } from '@angular/common/http';
import { getStoredToken } from '../utils/token-storage';

// Each role authenticates against a separate collection/token, so the
// storage key — and therefore which token gets attached — depends on which
// role-scoped API the request is actually going to.
function tokenKeyFor(url: string): string {
  if (url.includes('/api/seller/')) return 'feastgo_seller_token';
  if (url.includes('/api/delivery/')) return 'feastgo_delivery_token';
  if (url.includes('/api/admin/')) return 'feastgo_admin_token';
  return 'feastgo_token';
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getStoredToken(tokenKeyFor(req.url));
  if (!token) return next(req);
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    })
  );
};
