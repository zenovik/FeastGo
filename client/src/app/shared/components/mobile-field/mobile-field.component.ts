import { Component, EventEmitter, Input, Output } from '@angular/core';
import { sanitizeMobileInput, validateMobile } from '../../utils/mobile-validation';
import { IconComponent } from '../icon/icon.component';

// Drop-in mobile-number input used identically across every signup/profile
// form in the app (customer, seller, delivery partner) — sanitizes keystrokes
// and paste to digits-only (max 10) in real time, and shows a green/red
// validity indicator with the matching error message once the user has
// interacted with the field. Duplicate-number checks stay server-side; this
// only owns format validation.
@Component({
  selector: 'app-mobile-field',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div>
      <div class="relative">
        <input
          type="tel"
          inputmode="numeric"
          autocomplete="tel"
          maxlength="10"
          [placeholder]="placeholder"
          [value]="value"
          [disabled]="disabled"
          (input)="onInput($event)"
          (blur)="touched = true"
          class="w-full rounded-lg border px-3 py-2.5 pr-9 text-sm outline-none transition disabled:bg-ink-50 dark:bg-ink-900 dark:disabled:bg-ink-800"
          [class.border-ink-200]="state() === null"
          [class.dark:border-ink-700]="state() === null"
          [class.focus:border-ember-400]="state() === null"
          [class.border-basil-500]="state() === 'valid'"
          [class.border-ember-500]="state() === 'invalid'"
        />
        @if (state()) {
          <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <app-icon [name]="state() === 'valid' ? 'check' : 'x'" [size]="15" [class]="state() === 'valid' ? 'text-basil-600' : 'text-ember-600'" />
          </span>
        }
      </div>
      @if (state() === 'invalid') {
        <p class="mt-1 text-xs font-medium text-ember-600">{{ validateMobile(value).message }}</p>
      }
    </div>
  `,
})
export class MobileFieldComponent {
  @Input() placeholder = 'Mobile number';
  @Input() value = '';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();
  @Output() validityChange = new EventEmitter<boolean>();

  touched = false;
  validateMobile = validateMobile;

  state(): 'valid' | 'invalid' | null {
    if (!this.touched || !this.value) return null;
    return validateMobile(this.value).valid ? 'valid' : 'invalid';
  }

  onInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const sanitized = sanitizeMobileInput(input.value);
    input.value = sanitized;
    this.value = sanitized;
    this.touched = true;
    this.valueChange.emit(sanitized);
    this.validityChange.emit(validateMobile(sanitized).valid);
  }
}
