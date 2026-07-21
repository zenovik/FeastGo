import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <footer class="mt-20 border-t border-ink-100 bg-ink-900 text-ink-200">
      <div class="container-shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-ember-500 text-white">
              <app-icon name="flame" [size]="18" />
            </span>
            <span class="font-display text-xl font-extrabold text-white">FeastGo</span>
          </div>
          <p class="mt-3 max-w-xs text-sm text-ink-400">
            Great food from the best local kitchens, delivered fast — with a menu experience worth savoring.
          </p>
        </div>

        <div>
          <h4 class="font-display text-sm font-bold text-white">Company</h4>
          <ul class="mt-3 space-y-2 text-sm text-ink-400">
            <li><a class="hover:text-white" routerLink="/">About FeastGo</a></li>
            <li><a class="hover:text-white" routerLink="/">Careers</a></li>
            <li><a class="hover:text-white" routerLink="/">Press</a></li>
          </ul>
        </div>

        <div>
          <h4 class="font-display text-sm font-bold text-white">For restaurants</h4>
          <ul class="mt-3 space-y-2 text-sm text-ink-400">
            <li><a class="hover:text-white" routerLink="/">Partner with us</a></li>
            <li><a class="hover:text-white" routerLink="/">Apps for you</a></li>
          </ul>
        </div>

        <div>
          <h4 class="font-display text-sm font-bold text-white">Get help</h4>
          <ul class="mt-3 space-y-2 text-sm text-ink-400">
            <li><a class="hover:text-white" routerLink="/">Order support</a></li>
            <li><a class="hover:text-white" routerLink="/">FAQs</a></li>
            <li><a class="hover:text-white" routerLink="/">Contact us</a></li>
          </ul>
        </div>
      </div>

      <div class="border-t border-white/10 py-5">
        <div class="container-shell flex flex-col items-center justify-between gap-2 text-xs text-ink-400 sm:flex-row">
          <p>© {{ year }} FeastGo. All rights reserved.</p>
          <p>Made for food lovers, everywhere.</p>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  year = new Date().getFullYear();
}
