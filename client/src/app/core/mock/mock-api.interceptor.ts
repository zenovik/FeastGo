import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { defer, from, map } from 'rxjs';

export const mockApiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/mock-api/')) return next(request);
  return defer(() =>
    from(import('./mock-api')).pipe(
      map(({ mockResponse }) => new HttpResponse({ status: 200, body: mockResponse(request) }))
    )
  );
};
