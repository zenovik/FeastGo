import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chip',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      [class]="tone === 'veg' ? 'border-basil-400 text-basil-600 bg-basil-50' : tone === 'offer' ? 'border-gold-500 text-gold-600 bg-gold-400/10' : 'border-ink-200 text-ink-600 bg-white'"
    >
      <ng-content></ng-content>
    </span>
  `,
})
export class ChipComponent {
  @Input() tone: 'default' | 'veg' | 'offer' = 'default';
}
