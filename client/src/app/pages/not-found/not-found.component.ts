import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="container-shell-full flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-ember-50 text-ember-500">
        <app-icon name="alert-triangle" [size]="26" />
      </span>
      <h1 class="font-display text-2xl font-bold text-ink-900">Page not found</h1>
      <p class="text-sm text-ink-400">The page you're looking for doesn't exist.</p>
      <a routerLink="/" class="mt-2 rounded-xl bg-ember-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-ember-600">
        Back to home
      </a>
    </div>
  `,
})
export class NotFoundComponent {}
