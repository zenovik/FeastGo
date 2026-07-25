import { HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';

// Turns an HttpClient call made with `{ reportProgress: true, observe: 'events' }`
// into a plain Promise of the response body, while reporting real upload
// percentage as the browser actually sends bytes — not a simulated/fake bar.
// Callers that don't care about progress just omit `onProgress`.
export function requestWithProgress<T>(event$: Observable<HttpEvent<T>>, onProgress?: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const sub = event$.subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          if (onProgress) onProgress(event.total ? Math.round((100 * event.loaded) / event.total) : 0);
        } else if (event.type === HttpEventType.Response) {
          onProgress?.(100);
          resolve(event.body as T);
        }
      },
      error: (err) => reject(err),
      complete: () => sub.unsubscribe(),
    });
  });
}
