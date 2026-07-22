import { Component, ElementRef, HostListener, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FoodItem, foodItemToMenuItem } from '../../../core/models/food-item.model';
import { ProductModalService } from '../../../core/services/product-modal.service';
import { SearchService } from '../../../core/services/search.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';
import { InrPipe } from '../../pipes/inr.pipe';
import { HighlightPipe } from '../../pipes/highlight.pipe';

export type SearchBarVariant = 'compact' | 'hero';

// One shared live-search dropdown used by every search bar in the app (header
// + home hero for now) so they all behave identically. `variant` only swaps
// the input's visual chrome — the matching, keyboard nav, and result
// rendering logic below is the same regardless of where it's mounted.
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule, IconComponent, InrPipe, HighlightPipe],
  template: `
    <div class="relative">
      <form (submit)="submitSearch($event)">
        <label class="relative block">
          <span
            class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-400"
            [class]="variant === 'hero' ? 'left-4' : 'left-3'"
          >
            <app-icon name="search" [size]="variant === 'hero' ? 19 : 17" />
          </span>
          <input
            type="search"
            [(ngModel)]="query"
            name="search"
            [placeholder]="placeholder"
            autocomplete="off"
            role="combobox"
            aria-haspopup="listbox"
            [attr.aria-expanded]="isOpen()"
            (input)="onInput()"
            (focus)="onInput()"
            (keydown)="onKeydown($event)"
            [class]="
              variant === 'hero'
                ? 'w-full rounded-2xl border-0 bg-white py-4 pl-12 pr-32 text-[15px] text-ink-800 shadow-[var(--shadow-pop)] outline-none focus:ring-2 focus:ring-ember-400'
                : 'w-full rounded-full border border-ink-200 bg-ink-50 py-2.5 pl-10 pr-9 text-sm text-ink-800 outline-none transition focus:border-ember-400 focus:bg-white focus:ring-2 focus:ring-ember-100'
            "
          />

          @if (showVoice) {
            <button
              type="button"
              class="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ember-600"
              [class.text-ember-600]="listening()"
              (click)="startVoiceSearch()"
              aria-label="Search by voice"
            >
              <app-icon name="mic" [size]="15" />
            </button>
          }

          @if (variant === 'hero') {
            <button
              type="submit"
              class="absolute right-1.5 top-1.5 rounded-xl bg-ember-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-ember-600"
            >
              Search
            </button>
          }
        </label>
      </form>

      @if (isOpen()) {
        <div
          class="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-ink-100 bg-white shadow-[var(--shadow-pop)]"
          role="listbox"
        >
          @if (results().length > 0) {
            @for (item of results(); track item.id; let i = $index) {
              <button
                type="button"
                role="option"
                [attr.aria-selected]="activeIndex() === i"
                class="flex w-full items-center gap-3 border-b border-ink-50 p-3 text-left last:border-0"
                [class.bg-ink-50]="activeIndex() === i"
                (mouseenter)="activeIndex.set(i)"
                (click)="selectResult(item)"
              >
                <img [src]="item.image" [alt]="item.name" class="h-12 w-12 shrink-0 rounded-lg object-cover" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-ink-900" [innerHTML]="item.name | highlight: query"></p>
                  <span
                    class="mt-0.5 block truncate text-xs text-ink-400 hover:text-ember-600 hover:underline"
                    (click)="goToRestaurant($event, item)"
                    [innerHTML]="item.restaurantName | highlight: query"
                  ></span>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-sm font-bold text-ink-900">{{ item.price | inr }}</p>
                  <p class="mt-0.5 flex items-center justify-end gap-0.5 text-xs font-semibold text-basil-600">
                    <app-icon name="star" [size]="10" /> {{ item.rating }}
                  </p>
                </div>
              </button>
            }
          } @else {
            <div class="p-5 text-center">
              <p class="text-sm font-semibold text-ink-600">No matching results found</p>
              <p class="mt-3 text-xs font-medium text-ink-400">Popular searches</p>
              <div class="mt-2 flex flex-wrap justify-center gap-2">
                @for (s of popularSearches; track s) {
                  <button
                    type="button"
                    class="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:border-ember-400 hover:text-ember-600"
                    (click)="selectSuggestion(s)"
                  >
                    {{ s }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SearchBarComponent {
  @Input() variant: SearchBarVariant = 'compact';
  @Input() placeholder = 'Search restaurants or dishes';
  @Input() showVoice = false;

  query = '';
  results = signal<FoodItem[]>([]);
  isOpen = signal(false);
  activeIndex = signal(-1);
  listening = signal(false);

  popularSearches: string[];

  constructor(
    private search: SearchService,
    private router: Router,
    private productModal: ProductModalService,
    private toast: ToastService,
    private elRef: ElementRef<HTMLElement>
  ) {
    this.popularSearches = this.search.popularSearches;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!this.elRef.nativeElement.contains(e.target as Node)) {
      this.isOpen.set(false);
    }
  }

  onInput() {
    const q = this.query.trim();
    if (q.length < 2) {
      this.results.set([]);
      this.isOpen.set(q.length > 0);
      this.activeIndex.set(-1);
      return;
    }
    this.results.set(this.search.search(q));
    this.isOpen.set(true);
    this.activeIndex.set(-1);
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.closeDropdown();
      return;
    }
    if (!this.isOpen()) return;

    const items = this.results();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length) this.activeIndex.update((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length) this.activeIndex.update((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      const idx = this.activeIndex();
      if (idx >= 0 && idx < items.length) {
        e.preventDefault();
        this.selectResult(items[idx]);
      }
    }
  }

  selectResult(item: FoodItem) {
    this.productModal.open({
      item: foodItemToMenuItem(item),
      restaurantSlug: item.restaurantId,
      restaurantName: item.restaurantName,
    });
    this.closeDropdown();
  }

  goToRestaurant(e: Event, item: FoodItem) {
    e.stopPropagation();
    e.preventDefault();
    this.closeDropdown();
    this.router.navigate(['/restaurants', item.restaurantId]);
  }

  selectSuggestion(term: string) {
    this.query = term;
    this.onInput();
  }

  submitSearch(e: Event) {
    e.preventDefault();
    const term = this.query.trim();
    this.closeDropdown();
    this.router.navigate(['/restaurants'], term ? { queryParams: { q: term } } : {});
  }

  closeDropdown() {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  startVoiceSearch() {
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.toast.error('Voice search is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    this.listening.set(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) {
        this.query = transcript;
        this.onInput();
      }
    };
    recognition.onerror = () => {
      this.toast.error('Could not hear that — try again');
    };
    recognition.onend = () => this.listening.set(false);

    recognition.start();
  }
}
