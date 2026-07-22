import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Wraps the portion of `text` that matches `query` (case-insensitive) in
// <mark> so live search results can highlight what the user typed.
@Pipe({ name: 'highlight', standalone: true })
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string, query: string | null | undefined): SafeHtml {
    if (!query?.trim()) return this.sanitizer.bypassSecurityTrustHtml(text);

    const re = new RegExp(`(${escapeRegExp(query.trim())})`, 'ig');
    const highlighted = text.replace(re, '<mark class="rounded-sm bg-gold-200 text-ink-900">$1</mark>');
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}
