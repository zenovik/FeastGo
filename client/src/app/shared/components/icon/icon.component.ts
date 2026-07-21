import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// A tiny hand-rolled icon set (24x24, stroke-based) so FeastGo ships with an
// original icon language instead of pulling in a third-party icon library.
const ICONS: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
  cart: '<circle cx="9" cy="21" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="21" r="1.2" fill="currentColor" stroke="none"/><path d="M2.5 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 8H6"/>',
  'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  star: '<path d="M12 2.5l2.9 6.1 6.6.7-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.7Z" fill="currentColor" stroke="none"/>',
  'star-outline': '<path d="M12 2.5l2.9 6.1 6.6.7-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.7Z"/>',
  chevron_down: '<path d="M6 9l6 6 6-6"/>',
  chevron_right: '<path d="M9 6l6 6-6 6"/>',
  chevron_left: '<path d="M15 6l-6 6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6"/>',
  heart: '<path d="M12 21s-7.5-4.8-10-9.5C.3 7.4 2.6 4 6.2 4c2 0 3.6 1.1 4.8 2.8C12.2 5.1 13.8 4 15.8 4c3.6 0 5.9 3.4 4.2 7.5C19.5 16.2 12 21 12 21Z"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  'arrow-left': '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  truck: '<rect x="1" y="7" width="13" height="10" rx="1"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="17.5" cy="19" r="1.6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  lock: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  leaf: '<path d="M5 12c0-5 4-9 9-9 5 0 5 4 5 9s-4 9-9 9c-3 0-5-2-5-5 0-3 2-4 5-6"/>',
  flame: '<path d="M12 2c-1.5 4.5-6.8 7.5-6.8 14.2A6.8 6.8 0 0 0 12 23a6.8 6.8 0 0 0 6.8-6.8C18.8 12 16.8 9.5 15 8c.8 3-1 4.6-2 4.6-1.3 0-1.8-1.4-.8-3C13 7 12.8 4.4 12 2Z"/>',
  'shield-check': '<path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5Z"/><path d="m9 12 2 2 4-4"/>',
  'credit-card': '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  bike: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17 10 8h5l3 5M10 8H8m5 0 2.5 5H18"/>',
  'chef-hat': '<path d="M6 13a4 4 0 0 1 1-7.9A4.5 4.5 0 0 1 12 3a4.5 4.5 0 0 1 5 2.1A4 4 0 0 1 18 13v3H6Z"/><path d="M6 20h12"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 8v.01"/>',
  'alert-triangle': '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  percent: '<path d="M19 5 5 19M6.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>',
  package: '<path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="14" r="3.5"/>',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `<svg
    [attr.width]="size"
    [attr.height]="size"
    viewBox="0 0 24 24"
    [attr.fill]="filled() ? 'currentColor' : 'none'"
    stroke="currentColor"
    [attr.stroke-width]="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    [innerHTML]="markup()"
  ></svg>`,
  styles: [':host { display: inline-flex; line-height: 0; }'],
})
export class IconComponent {
  @Input() name = 'info';
  @Input() size = 20;
  @Input() strokeWidth = 2;

  constructor(private sanitizer: DomSanitizer) {}

  filled(): boolean {
    return ['star', 'flame'].includes(this.name);
  }

  markup(): SafeHtml {
    const svg = ICONS[this.name] ?? ICONS['info'];
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
