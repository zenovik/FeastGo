import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'feastgo_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

// `mode` is what the user picked; `dark` is the resolved boolean every shell
// actually binds `[class.dark]` to — unchanged call sites (seller/admin shell,
// their toggle buttons) keep working exactly as before against `dark`/`toggle()`.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly mediaQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  private readonly systemPrefersDark = signal(this.mediaQuery?.matches ?? false);

  readonly mode = signal<ThemeMode>(this.readStoredMode());

  readonly dark = computed(() => {
    const m = this.mode();
    return m === 'system' ? this.systemPrefersDark() : m === 'dark';
  });

  constructor() {
    this.mediaQuery?.addEventListener('change', (e) => this.systemPrefersDark.set(e.matches));
  }

  private readStoredMode(): ThemeMode {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
  }

  setMode(mode: ThemeMode) {
    this.mode.set(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  /** Applies a mode already persisted server-side (e.g. loaded on login) without re-triggering a save. */
  syncFromServer(mode: ThemeMode) {
    this.mode.set(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  // Kept for the seller/admin shell's existing sun/moon toggle button — flips
  // between light and dark, bypassing "system" (a binary toggle can't
  // meaningfully represent a three-way choice).
  toggle() {
    this.setMode(this.dark() ? 'light' : 'dark');
  }
}
