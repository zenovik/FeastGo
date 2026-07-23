import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'feastgo_food_favorites';

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Local-only favorites for the Food Feed — the real favorites API is
// restaurant-scoped (see AuthService.toggleFavorite), so food-item bookmarks
// are kept client-side rather than persisted server-side.
@Injectable({ providedIn: 'root' })
export class FoodFavoritesService {
  private readonly idsSig = signal<Set<string>>(new Set(loadFromStorage()));
  readonly ids = this.idsSig.asReadonly();

  isFavorite(id: string): boolean {
    return this.idsSig().has(id);
  }

  toggle(id: string) {
    const next = new Set(this.idsSig());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.idsSig.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }
}
