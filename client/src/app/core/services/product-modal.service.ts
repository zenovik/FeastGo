import { Injectable, signal } from '@angular/core';
import { MenuItem } from '../models/menu-item.model';

export interface ProductModalContext {
  item: MenuItem;
  restaurantSlug: string;
  restaurantName: string;
}

@Injectable({ providedIn: 'root' })
export class ProductModalService {
  private readonly contextSig = signal<ProductModalContext | null>(null);
  readonly context = this.contextSig.asReadonly();

  open(context: ProductModalContext) {
    this.contextSig.set(context);
  }

  close() {
    this.contextSig.set(null);
  }
}
