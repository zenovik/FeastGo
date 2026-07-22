import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'feastgo_location_label';
const DEFAULT_LABEL = 'Downtown, Metro City';

// Just the label shown in the header for now — picking an address or using
// geolocation only updates this display, independent of the account-level
// addresses managed on the profile page.
@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly labelSig = signal<string>(localStorage.getItem(STORAGE_KEY) ?? DEFAULT_LABEL);
  readonly label = this.labelSig.asReadonly();

  setLabel(label: string) {
    this.labelSig.set(label);
    localStorage.setItem(STORAGE_KEY, label);
  }
}
