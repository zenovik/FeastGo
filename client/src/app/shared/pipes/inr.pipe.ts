import { Pipe, PipeTransform } from '@angular/core';

const formatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

@Pipe({ name: 'inr', standalone: true })
export class InrPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return `₹${formatter.format(Math.round(value ?? 0))}`;
  }
}
