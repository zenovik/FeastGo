import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'feastgo_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(localStorage.getItem(STORAGE_KEY) === 'dark');

  toggle() {
    this.dark.update((d) => !d);
    localStorage.setItem(STORAGE_KEY, this.dark() ? 'dark' : 'light');
  }
}
