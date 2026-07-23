import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// `text` comes from seller/admin-controlled data (restaurant & food names) and
// is therefore untrusted — it must be HTML-escaped before any bypassSecurityTrustHtml
// call, or a crafted name becomes a stored XSS payload for every customer who searches.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Wraps the portion of `text` that matches `query` (case-insensitive) in
// <mark> so live search results can highlight what the user typed.
@Pipe({ name: 'highlight', standalone: true })
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string, query: string | null | undefined): SafeHtml {
    const safeText = escapeHtml(text ?? '');
    if (!query?.trim()) return this.sanitizer.bypassSecurityTrustHtml(safeText);

    const re = new RegExp(`(${escapeRegExp(query.trim())})`, 'ig');
    const highlighted = safeText.replace(re, '<mark class="rounded-sm bg-gold-200 text-ink-900">$1</mark>');
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}
