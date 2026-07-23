import { DecimalPipe } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';

export interface ChartPoint {
  label: string;
  value: number;
}

// A small dependency-free SVG bar/line chart — enough for admin-panel-style
// trend visualizations without pulling in a full charting library.
@Component({
  selector: 'app-mini-chart',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="relative" [style.height.px]="height">
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="h-full w-full overflow-visible">
        @if (kind === 'line') {
          <polyline [attr.points]="linePoints()" fill="none" [attr.stroke]="color" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          @for (p of scaledPoints(); track $index) {
            <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3" [attr.fill]="color" (mouseenter)="hoverIndex.set($index)" (mouseleave)="hoverIndex.set(null)" class="cursor-pointer" />
          }
        } @else {
          @for (p of scaledPoints(); track $index) {
            <rect
              [attr.x]="p.x - barWidth() / 2"
              [attr.y]="p.y"
              [attr.width]="barWidth()"
              [attr.height]="height - bottomPad - p.y"
              rx="3"
              [attr.fill]="color"
              [attr.opacity]="hoverIndex() === null || hoverIndex() === $index ? 1 : 0.35"
              (mouseenter)="hoverIndex.set($index)"
              (mouseleave)="hoverIndex.set(null)"
              class="cursor-pointer transition-opacity"
            />
          }
        }
        <line [attr.x1]="leftPad" [attr.y1]="height - bottomPad" [attr.x2]="width" [attr.y2]="height - bottomPad" stroke="currentColor" class="text-ink-100 dark:text-ink-700" />
      </svg>

      @if (hoverIndex() !== null) {
        <div
          class="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-ink-900 px-2 py-1 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-ink-900"
          [style.left.px]="scaledPoints()[hoverIndex()!].x"
          [style.top.px]="scaledPoints()[hoverIndex()!].y - 8"
        >
          {{ points[hoverIndex()!].label }}: {{ points[hoverIndex()!].value | number: '1.0-0' }}
        </div>
      }
    </div>
    @if (showLabels) {
      <div class="mt-1 flex text-[10px] text-ink-400 dark:text-ink-500" [style.padding-left.px]="leftPad">
        @for (p of points; track $index) {
          @if ($index % labelStep() === 0) {
            <span class="flex-1 truncate text-center">{{ p.label }}</span>
          } @else {
            <span class="flex-1"></span>
          }
        }
      </div>
    }
  `,
})
export class MiniChartComponent {
  @Input() points: ChartPoint[] = [];
  @Input() kind: 'bar' | 'line' = 'bar';
  @Input() color = '#ff5127';
  @Input() height = 140;
  @Input() width = 400;
  @Input() showLabels = true;

  readonly leftPad = 4;
  readonly bottomPad = 4;
  readonly topPad = 8;

  hoverIndex = signal<number | null>(null);

  maxValue = computed(() => Math.max(1, ...this.points.map((p) => p.value)));

  barWidth = computed(() => {
    const n = this.points.length || 1;
    const slot = (this.width - this.leftPad) / n;
    return Math.max(4, slot * 0.55);
  });

  labelStep = computed(() => Math.max(1, Math.ceil(this.points.length / 7)));

  scaledPoints = computed(() => {
    const n = this.points.length;
    if (!n) return [];
    const usableH = this.height - this.bottomPad - this.topPad;
    const slot = (this.width - this.leftPad) / n;
    return this.points.map((p, i) => {
      const x = this.leftPad + slot * (i + 0.5);
      const ratio = p.value / this.maxValue();
      const y = this.height - this.bottomPad - ratio * usableH;
      return { x, y: Number.isFinite(y) ? y : this.height - this.bottomPad };
    });
  });

  linePoints(): string {
    return this.scaledPoints()
      .map((p) => `${p.x},${p.y}`)
      .join(' ');
  }
}
