import { Injectable, computed, signal } from '@angular/core';
import { CartItem } from '../models/cart.model';
import { MenuItem } from '../models/menu-item.model';

const STORAGE_KEY = 'feastgo_cart';

interface StoredCart {
  restaurantSlug: string | null;
  restaurantName: string | null;
  items: CartItem[];
}

function loadFromStorage(): StoredCart {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { restaurantSlug: null, restaurantName: null, items: [] };
    return JSON.parse(raw);
  } catch {
    return { restaurantSlug: null, restaurantName: null, items: [] };
  }
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly restaurantSlugSig = signal<string | null>(null);
  private readonly restaurantNameSig = signal<string | null>(null);
  private readonly itemsSig = signal<CartItem[]>([]);
  readonly isDrawerOpen = signal(false);

  readonly restaurantSlug = this.restaurantSlugSig.asReadonly();
  readonly restaurantName = this.restaurantNameSig.asReadonly();
  readonly items = this.itemsSig.asReadonly();

  readonly itemCount = computed(() => this.itemsSig().reduce((sum, i) => sum + i.qty, 0));
  readonly subtotal = computed(() =>
    Math.round(this.itemsSig().reduce((sum, i) => sum + i.menuItem.price * i.qty, 0) * 100) / 100
  );
  readonly isEmpty = computed(() => this.itemsSig().length === 0);

  constructor() {
    const stored = loadFromStorage();
    this.restaurantSlugSig.set(stored.restaurantSlug);
    this.restaurantNameSig.set(stored.restaurantName);
    this.itemsSig.set(stored.items);
  }

  /** Returns 'conflict' if the cart holds items from a different restaurant, without mutating state. */
  wouldConflict(restaurantSlug: string): boolean {
    const current = this.restaurantSlugSig();
    return !!current && current !== restaurantSlug && this.itemsSig().length > 0;
  }

  clear() {
    this.restaurantSlugSig.set(null);
    this.restaurantNameSig.set(null);
    this.itemsSig.set([]);
    this.persist();
  }

  add(menuItem: MenuItem, restaurantSlug: string, restaurantName: string, qty = 1) {
    if (this.wouldConflict(restaurantSlug)) {
      throw new Error('CART_CONFLICT');
    }
    if (!this.restaurantSlugSig()) {
      this.restaurantSlugSig.set(restaurantSlug);
      this.restaurantNameSig.set(restaurantName);
    }
    const items = [...this.itemsSig()];
    const idx = items.findIndex((i) => i.menuItem._id === menuItem._id);
    if (idx >= 0) {
      items[idx] = { ...items[idx], qty: items[idx].qty + qty };
    } else {
      items.push({ menuItem, qty });
    }
    this.itemsSig.set(items);
    this.persist();
  }

  setQty(menuItemId: string, qty: number) {
    if (qty <= 0) {
      this.remove(menuItemId);
      return;
    }
    const items = this.itemsSig().map((i) => (i.menuItem._id === menuItemId ? { ...i, qty } : i));
    this.itemsSig.set(items);
    this.persist();
  }

  remove(menuItemId: string) {
    const items = this.itemsSig().filter((i) => i.menuItem._id !== menuItemId);
    this.itemsSig.set(items);
    if (items.length === 0) {
      this.restaurantSlugSig.set(null);
      this.restaurantNameSig.set(null);
    }
    this.persist();
  }

  qtyOf(menuItemId: string): number {
    return this.itemsSig().find((i) => i.menuItem._id === menuItemId)?.qty ?? 0;
  }

  openDrawer() {
    this.isDrawerOpen.set(true);
  }
  closeDrawer() {
    this.isDrawerOpen.set(false);
  }

  private persist() {
    const data: StoredCart = {
      restaurantSlug: this.restaurantSlugSig(),
      restaurantName: this.restaurantNameSig(),
      items: this.itemsSig(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
