import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-rating-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold"
      [class]="colorClasses()"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.7-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.7Z"/></svg>
      {{ rating.toFixed(1) }}
    </span>
  `,
})
export class RatingBadgeComponent {
  @Input() rating = 0;

  colorClasses(): string {
    const r = this.rating;
    if (r >= 4.3) return 'bg-basil-500 text-white';
    if (r >= 3.5) return 'bg-gold-500 text-white';
    return 'bg-ink-400 text-white';
  }
}
