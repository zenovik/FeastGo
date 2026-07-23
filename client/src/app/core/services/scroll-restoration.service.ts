import { Injectable } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { Router, Scroll } from '@angular/router';
import { filter } from 'rxjs';

// scrollPositionRestoration is set to 'manual' in app.config.ts and handled here
// instead, because the router's automatic restoration fires as soon as navigation
// completes — before pages that fetch their content asynchronously (home, food
// feed) have actually rendered anything to scroll to, so it silently fails on them.
//
// This service covers every route with the same default the router would have
// (scroll to top on forward navigation, restore the saved position on back/forward)
// the moment navigation completes. Pages with async content additionally call
// `restore()` again once their data is on screen, to retry a restoration that the
// first (too-early) attempt may have come up short on.
@Injectable({ providedIn: 'root' })
export class ScrollRestorationService {
  private pendingPosition: [number, number] | null = null;

  constructor(
    private router: Router,
    private viewportScroller: ViewportScroller
  ) {
    this.router.events.pipe(filter((e): e is Scroll => e instanceof Scroll)).subscribe((e) => {
      this.pendingPosition = e.position;
      this.applyPosition(e.position);
    });
  }

  /** Call once a page's async content has rendered, to retry restoring the
   * position saved for this navigation (a no-op if there wasn't one). */
  restore() {
    if (!this.pendingPosition) return;
    this.applyPosition(this.pendingPosition);
    this.pendingPosition = null;
  }

  private applyPosition(position: [number, number] | null) {
    requestAnimationFrame(() => {
      this.viewportScroller.scrollToPosition(position ?? [0, 0]);
    });
  }
}
