import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationPrefs, ThemeMode } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { MobileFieldComponent } from '../../shared/components/mobile-field/mobile-field.component';
import { normalizeMobile, validateMobile } from '../../shared/utils/mobile-validation';
import { validateEmail } from '../../shared/utils/profile-validation';
import { ProfileComponent } from '../profile/profile.component';

type SectionKey = 'personal' | 'addresses' | 'security' | 'notifications' | 'appearance' | 'language' | 'payment' | 'privacy' | 'support' | 'about';

const SECTIONS: { key: SectionKey; emoji: string; label: string }[] = [
  { key: 'personal', emoji: '👤', label: 'Personal Information' },
  { key: 'addresses', emoji: '📍', label: 'Address Management' },
  { key: 'security', emoji: '🔒', label: 'Security' },
  { key: 'notifications', emoji: '🔔', label: 'Notifications' },
  { key: 'appearance', emoji: '🎨', label: 'Appearance' },
  { key: 'language', emoji: '🌐', label: 'Language' },
  { key: 'payment', emoji: '💳', label: 'Payment Methods' },
  { key: 'privacy', emoji: '🛡️', label: 'Privacy' },
  { key: 'support', emoji: '❓', label: 'Help & Support' },
  { key: 'about', emoji: 'ℹ️', label: 'About' },
];

const NOTIF_TOGGLES: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: 'orderUpdates', label: 'Order Notifications', hint: 'Status updates for your orders — placed, out for delivery, delivered.' },
  { key: 'promotional', label: 'Promotional Notifications', hint: 'Discounts, coupons, and marketing announcements.' },
  { key: 'offers', label: 'Offer Notifications', hint: 'Festival greetings and limited-time offers.' },
  { key: 'email', label: 'Email Notifications', hint: 'Copies of important updates sent to your email.' },
  { key: 'push', label: 'Push Notifications', hint: 'Alerts on this device when the app is in the background.' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
];

const CARD_BRANDS = ['visa', 'mastercard', 'rupay', 'amex', 'discover', 'other'];

const FAQS = [
  { q: 'How do I track my order?', a: 'Open Orders from your account menu and tap any active order to see its live status and delivery partner details.' },
  { q: 'How do I cancel an order?', a: 'You can cancel from the order tracking page any time before the restaurant marks it ready for pickup.' },
  { q: 'How do I change my delivery address?', a: 'Go to Settings → Address Management to add, edit, or set a default address for future orders.' },
  { q: 'Is Cash on Delivery available everywhere?', a: 'Cash on Delivery is available for every order in this app — no setup needed.' },
  { q: 'How do I delete my account?', a: 'Go to Settings → Privacy → Delete Account. This permanently removes your personal information.' },
];

const APP_VERSION = '1.0.0';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, IconComponent, MobileFieldComponent, ProfileComponent],
  template: `
    <div class="container-shell-full py-10">
      <h1 class="font-display text-2xl font-bold text-ink-900 dark:text-white">Settings</h1>

      <div class="mt-6 flex flex-col gap-6 md:flex-row">
        <!-- Section nav: horizontal pill-scroll on mobile, sticky sidebar on desktop -->
        <nav class="flex gap-1.5 overflow-x-auto pb-2 md:sticky md:top-20 md:h-fit md:w-56 md:shrink-0 md:flex-col md:overflow-visible md:pb-0">
          @for (s of sections; track s.key) {
            <button
              type="button"
              class="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition"
              [class.bg-ember-50]="activeSection() === s.key"
              [class.dark:bg-ember-500/10]="activeSection() === s.key"
              [class.text-ember-600]="activeSection() === s.key"
              [class.dark:text-ember-400]="activeSection() === s.key"
              [class.text-ink-600]="activeSection() !== s.key"
              [class.dark:text-ink-300]="activeSection() !== s.key"
              [class.hover:bg-ink-50]="activeSection() !== s.key"
              [class.dark:hover:bg-ink-700/50]="activeSection() !== s.key"
              (click)="selectSection(s.key)"
            >
              <span aria-hidden="true">{{ s.emoji }}</span> {{ s.label }}
            </button>
          }
        </nav>

        <div class="min-w-0 flex-1">
          @if (activeSection() === 'personal') {
            <div class="card-surface p-5">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Personal Information</h2>
              <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">Profile photo, full name, mobile number, email, date of birth, and gender.</p>
              <div class="mt-4">
                <app-profile [embedded]="true" [showAddresses]="false" [showSignOut]="false" />
              </div>
            </div>
          }

          @if (activeSection() === 'addresses') {
            <div class="card-surface p-5">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Address Management</h2>
              <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">Add, edit, delete, or set a default delivery address.</p>
              <div class="mt-4">
                <app-profile [embedded]="true" [showPersonalInfo]="false" [showSignOut]="false" />
              </div>
            </div>
          }

          @if (activeSection() === 'security') {
            <div class="card-surface p-5">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Security</h2>

              <div class="mt-4 rounded-lg border border-ink-100 bg-ink-50 p-3.5 dark:border-ink-700 dark:bg-ink-900/40">
                <p class="flex items-center gap-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
                  <app-icon name="lock" [size]="15" /> Change Password
                </p>
                <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  Your account signs in with a one-time code — there's no password to change. Use the options below to update your mobile number or email instead.
                </p>
              </div>

              <div class="mt-4 border-t border-ink-100 pt-4 dark:border-ink-700">
                <p class="text-sm font-semibold text-ink-700 dark:text-ink-200">Change Mobile Number</p>
                <p class="mt-0.5 text-xs text-ink-400 dark:text-ink-500">Current: {{ auth.currentUser()?.phone || '—' }}</p>
                @if (changingField() !== 'phone') {
                  <div class="mt-2 flex items-center gap-2">
                    <div class="flex-1">
                      <app-mobile-field [value]="newPhone" (valueChange)="newPhone = $event" (validityChange)="newPhoneValid.set($event)" placeholder="New mobile number" />
                    </div>
                    <button type="button" [disabled]="!newPhoneValid()" class="shrink-0 rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50" (click)="requestChange('phone')">
                      Send OTP
                    </button>
                  </div>
                } @else {
                  <div class="mt-2">
                    @if (devOtp()) {
                      <div class="rounded-xl border border-gold-300 bg-gold-50 px-4 py-3">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-gold-700">Demo mode — no SMS is actually sent</p>
                        <p class="mt-0.5 font-display text-lg font-extrabold text-gold-800">Demo OTP: <span class="tracking-[0.25em]">{{ devOtp() }}</span></p>
                      </div>
                    }
                    <div class="mt-2 flex gap-2">
                      <input type="text" inputmode="numeric" maxlength="4" [(ngModel)]="changeCode" name="phoneChangeCode" placeholder="4-digit code" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                      <button type="button" [disabled]="changeSubmitting()" class="shrink-0 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" (click)="submitChange('phone')">
                        {{ changeSubmitting() ? 'Verifying…' : 'Verify' }}
                      </button>
                      <button type="button" class="shrink-0 rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-500 dark:border-ink-700 dark:text-ink-400" (click)="cancelChange()">Cancel</button>
                    </div>
                  </div>
                }
              </div>

              <div class="mt-4 border-t border-ink-100 pt-4 dark:border-ink-700">
                <p class="text-sm font-semibold text-ink-700 dark:text-ink-200">Change Email</p>
                <p class="mt-0.5 text-xs text-ink-400 dark:text-ink-500">Current: {{ auth.currentUser()?.email || '—' }}</p>
                @if (changingField() !== 'email') {
                  <div class="mt-2 flex items-center gap-2">
                    <input type="email" [(ngModel)]="newEmail" name="newEmail" placeholder="New email address" class="w-full flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                    <button type="button" [disabled]="!newEmail.trim()" class="shrink-0 rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50" (click)="requestChange('email')">
                      Send OTP
                    </button>
                  </div>
                } @else {
                  <div class="mt-2">
                    @if (devOtp()) {
                      <div class="rounded-xl border border-gold-300 bg-gold-50 px-4 py-3">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-gold-700">Demo mode — no email is actually sent</p>
                        <p class="mt-0.5 font-display text-lg font-extrabold text-gold-800">Demo OTP: <span class="tracking-[0.25em]">{{ devOtp() }}</span></p>
                      </div>
                    }
                    <div class="mt-2 flex gap-2">
                      <input type="text" inputmode="numeric" maxlength="4" [(ngModel)]="changeCode" name="emailChangeCode" placeholder="4-digit code" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                      <button type="button" [disabled]="changeSubmitting()" class="shrink-0 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" (click)="submitChange('email')">
                        {{ changeSubmitting() ? 'Verifying…' : 'Verify' }}
                      </button>
                      <button type="button" class="shrink-0 rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-500 dark:border-ink-700 dark:text-ink-400" (click)="cancelChange()">Cancel</button>
                    </div>
                  </div>
                }
              </div>
              @if (changeError()) {
                <p class="mt-2 text-xs font-medium text-ember-600">{{ changeError() }}</p>
              }
            </div>
          }

          @if (activeSection() === 'notifications') {
            <div class="card-surface p-5">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Notifications</h2>
              <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">Choose what you'd like to hear from us.</p>
              <div class="mt-4 divide-y divide-ink-100 dark:divide-ink-700">
                @for (t of notifToggles; track t.key) {
                  <label class="flex items-center justify-between gap-4 py-3">
                    <span>
                      <span class="block text-sm font-semibold text-ink-800 dark:text-ink-100">{{ t.label }}</span>
                      <span class="block text-xs text-ink-400 dark:text-ink-500">{{ t.hint }}</span>
                    </span>
                    <input
                      type="checkbox"
                      class="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-ink-200 transition-colors checked:bg-basil-500 relative dark:bg-ink-700
                             before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
                      [checked]="notifPrefValue(t.key)"
                      (change)="toggleNotifPref(t.key)"
                    />
                  </label>
                }
              </div>
            </div>
          }

          @if (activeSection() === 'appearance') {
            <div class="card-surface p-5">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Appearance</h2>
              <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">Choose how FeastGo looks on this device.</p>
              <div class="mt-4 grid grid-cols-3 gap-2">
                <button type="button" class="flex flex-col items-center gap-1.5 rounded-lg border p-3" [class.border-ember-500]="theme.mode() === 'light'" [class.border-ink-200]="theme.mode() !== 'light'" (click)="setTheme('light')">
                  <app-icon name="sun" [size]="20" [class]="theme.mode() === 'light' ? 'text-ember-600' : 'text-ink-400'" />
                  <span class="text-xs font-bold" [class.text-ember-600]="theme.mode() === 'light'">Light Mode</span>
                </button>
                <button type="button" class="flex flex-col items-center gap-1.5 rounded-lg border p-3" [class.border-ember-500]="theme.mode() === 'dark'" [class.border-ink-200]="theme.mode() !== 'dark'" (click)="setTheme('dark')">
                  <app-icon name="moon" [size]="20" [class]="theme.mode() === 'dark' ? 'text-ember-600' : 'text-ink-400'" />
                  <span class="text-xs font-bold" [class.text-ember-600]="theme.mode() === 'dark'">Dark Mode</span>
                </button>
                <button type="button" class="flex flex-col items-center gap-1.5 rounded-lg border p-3" [class.border-ember-500]="theme.mode() === 'system'" [class.border-ink-200]="theme.mode() !== 'system'" (click)="setTheme('system')">
                  <app-icon name="settings" [size]="20" [class]="theme.mode() === 'system' ? 'text-ember-600' : 'text-ink-400'" />
                  <span class="text-xs font-bold" [class.text-ember-600]="theme.mode() === 'system'">System Theme</span>
                </button>
              </div>
            </div>
          }

          @if (activeSection() === 'language') {
            <div class="card-surface p-5">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Language</h2>
              <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">Your language preference is saved to your account.</p>
              <select
                [ngModel]="auth.currentUser()?.language"
                (ngModelChange)="setLanguage($event)"
                name="language"
                [disabled]="savingLanguage()"
                class="mt-3 w-full max-w-xs rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              >
                @for (l of languages; track l.value) {
                  <option [value]="l.value">{{ l.label }}</option>
                }
              </select>
            </div>
          }

          @if (activeSection() === 'payment') {
            <div class="space-y-4">
              <div class="card-surface p-5">
                <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Saved Cards</h2>
                <p class="mt-1 text-xs text-ink-400 dark:text-ink-500">Only the card network and last 4 digits are stored — never your full card number.</p>
                <div class="mt-3 space-y-2">
                  @for (c of auth.currentUser()?.savedCards; track c._id) {
                    <div class="flex items-center justify-between rounded-lg border border-ink-100 p-3 dark:border-ink-700">
                      <div class="flex items-center gap-2.5">
                        <app-icon name="credit-card" [size]="18" class="text-ink-400 dark:text-ink-500" />
                        <div>
                          <p class="text-sm font-semibold capitalize text-ink-800 dark:text-ink-100">{{ c.brand }} •••• {{ c.last4 }}</p>
                          <p class="text-xs text-ink-400 dark:text-ink-500">{{ c.label || 'Card' }} · Expires {{ c.expiryMonth }}/{{ c.expiryYear }}</p>
                        </div>
                      </div>
                      <button type="button" class="text-ink-300 hover:text-ember-600 dark:text-ink-600" (click)="removeCard(c._id)"><app-icon name="trash" [size]="16" /></button>
                    </div>
                  } @empty {
                    <p class="text-sm text-ink-400 dark:text-ink-500">No saved cards yet.</p>
                  }
                </div>
                @if (!showCardForm()) {
                  <button type="button" class="mt-3 text-sm font-semibold text-ember-600" (click)="showCardForm.set(true)">+ Add card</button>
                } @else {
                  <form class="mt-3 space-y-2 rounded-lg border border-ink-100 p-3 dark:border-ink-700" (submit)="addCard($event)">
                    <div class="grid grid-cols-2 gap-2">
                      <input [(ngModel)]="newCard.label" name="cardLabel" placeholder="Nickname (optional)" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                      <select [(ngModel)]="newCard.brand" name="cardBrand" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white">
                        <option value="">Select network</option>
                        @for (b of cardBrands; track b) { <option [value]="b">{{ b }}</option> }
                      </select>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                      <input [(ngModel)]="newCard.last4" name="cardLast4" maxlength="4" inputmode="numeric" placeholder="Last 4 digits" (input)="onLast4Input($event)" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                      <input [(ngModel)]="newCard.expiryMonth" name="cardExpMonth" type="number" min="1" max="12" placeholder="MM" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                      <input [(ngModel)]="newCard.expiryYear" name="cardExpYear" type="number" placeholder="YYYY" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                    </div>
                    @if (cardError()) { <p class="text-xs font-medium text-ember-600">{{ cardError() }}</p> }
                    <div class="flex gap-2">
                      <button type="submit" [disabled]="savingCard()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ savingCard() ? 'Saving…' : 'Save card' }}</button>
                      <button type="button" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-500 dark:border-ink-700 dark:text-ink-400" (click)="showCardForm.set(false)">Cancel</button>
                    </div>
                  </form>
                }
              </div>

              <div class="card-surface p-5">
                <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Saved UPI</h2>
                <div class="mt-3 space-y-2">
                  @for (u of auth.currentUser()?.savedUpi; track u._id) {
                    <div class="flex items-center justify-between rounded-lg border border-ink-100 p-3 dark:border-ink-700">
                      <div>
                        <p class="text-sm font-semibold text-ink-800 dark:text-ink-100">{{ u.upiId }}</p>
                        <p class="text-xs text-ink-400 dark:text-ink-500">{{ u.label || 'UPI' }}</p>
                      </div>
                      <button type="button" class="text-ink-300 hover:text-ember-600 dark:text-ink-600" (click)="removeUpi(u._id)"><app-icon name="trash" [size]="16" /></button>
                    </div>
                  } @empty {
                    <p class="text-sm text-ink-400 dark:text-ink-500">No saved UPI IDs yet.</p>
                  }
                </div>
                @if (!showUpiForm()) {
                  <button type="button" class="mt-3 text-sm font-semibold text-ember-600" (click)="showUpiForm.set(true)">+ Add UPI ID</button>
                } @else {
                  <form class="mt-3 space-y-2 rounded-lg border border-ink-100 p-3 dark:border-ink-700" (submit)="addUpi($event)">
                    <input [(ngModel)]="newUpi.label" name="upiLabel" placeholder="Nickname (optional)" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                    <input [(ngModel)]="newUpi.upiId" name="upiId" placeholder="name@bank" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                    @if (upiError()) { <p class="text-xs font-medium text-ember-600">{{ upiError() }}</p> }
                    <div class="flex gap-2">
                      <button type="submit" [disabled]="savingUpi()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ savingUpi() ? 'Saving…' : 'Save UPI' }}</button>
                      <button type="button" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-500 dark:border-ink-700 dark:text-ink-400" (click)="showUpiForm.set(false)">Cancel</button>
                    </div>
                  </form>
                }
              </div>

              <div class="card-surface flex items-center gap-3 p-5">
                <app-icon name="banknote" [size]="20" class="text-basil-600" />
                <div>
                  <p class="text-sm font-semibold text-ink-800 dark:text-ink-100">Cash on Delivery</p>
                  <p class="text-xs text-ink-400 dark:text-ink-500">Always available at checkout — no setup needed.</p>
                </div>
              </div>
            </div>
          }

          @if (activeSection() === 'privacy') {
            <div class="space-y-4">
              <div class="card-surface p-5">
                <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Privacy Settings</h2>
                <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">
                  Control what you share and receive from FeastGo. Promotional and offer messaging can be turned off any time from
                  <button type="button" class="font-semibold text-ember-600" (click)="selectSection('notifications')">Notifications</button>.
                </p>
              </div>

              <div class="card-surface p-5">
                <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Download My Data</h2>
                <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">Get a copy of your profile, orders, and reviews as a JSON file.</p>
                <button type="button" [disabled]="exportingData()" class="mt-3 flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 disabled:opacity-50 dark:border-ink-700 dark:text-ink-200" (click)="downloadData()">
                  <app-icon name="download" [size]="15" /> {{ exportingData() ? 'Preparing…' : 'Download my data' }}
                </button>
              </div>

              <div class="card-surface border-2 border-ember-100 p-5">
                <h2 class="font-display text-lg font-bold text-ember-700">Delete Account</h2>
                <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">Permanently removes your personal information. Your past orders remain on record for the restaurants and delivery partners you ordered from, but will no longer show your name.</p>
                @if (deleteStep() === 'idle') {
                  <button type="button" class="mt-3 rounded-lg border border-ember-500 px-4 py-2 text-sm font-bold text-ember-600 hover:bg-ember-50" (click)="deleteStep.set('confirming')">
                    Delete my account
                  </button>
                } @else {
                  <div class="mt-3 rounded-lg bg-ember-50 p-3.5">
                    <p class="text-sm font-semibold text-ember-700">This cannot be undone. Type DELETE below to confirm.</p>
                    <input [(ngModel)]="deleteConfirmText" name="deleteConfirmText" placeholder="Type DELETE" class="mt-2 w-full max-w-xs rounded-lg border border-ember-300 px-3 py-2 text-sm outline-none focus:border-ember-500" />
                    <div class="mt-2 flex gap-2">
                      <button type="button" [disabled]="deleteConfirmText.trim() !== 'DELETE' || deletingAccount()" class="rounded-lg bg-ember-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" (click)="confirmDeleteAccount()">
                        {{ deletingAccount() ? 'Deleting…' : 'Permanently delete' }}
                      </button>
                      <button type="button" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-500 dark:border-ink-700 dark:text-ink-400" (click)="deleteStep.set('idle'); deleteConfirmText = ''">Cancel</button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          @if (activeSection() === 'support') {
            <div class="space-y-4">
              <div class="card-surface p-5">
                <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Help Center — FAQ</h2>
                <div class="mt-3 divide-y divide-ink-100 dark:divide-ink-700">
                  @for (item of faqs; track item.q; let i = $index) {
                    <div class="py-2.5">
                      <button type="button" class="flex w-full items-center justify-between text-left text-sm font-semibold text-ink-800 dark:text-ink-100" (click)="toggleFaq(i)">
                        {{ item.q }}
                        <app-icon [name]="openFaq() === i ? 'chevron_down' : 'chevron_right'" [size]="14" class="shrink-0 text-ink-400 dark:text-ink-500" />
                      </button>
                      @if (openFaq() === i) {
                        <p class="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{{ item.a }}</p>
                      }
                    </div>
                  }
                </div>
              </div>

              <div class="card-surface p-5">
                <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Contact Support</h2>
                <form class="mt-3 space-y-2" (submit)="sendSupportMessage($event, false)">
                  <input [(ngModel)]="supportSubject" name="supportSubject" placeholder="Subject" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                  <textarea [(ngModel)]="supportMessage" name="supportMessage" rows="3" placeholder="How can we help?" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white"></textarea>
                  <button type="submit" [disabled]="submittingSupport()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {{ submittingSupport() ? 'Sending…' : 'Send message' }}
                  </button>
                </form>
              </div>

              <div class="card-surface p-5">
                <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Report a Problem</h2>
                <form class="mt-3 space-y-2" (submit)="sendSupportMessage($event, true)">
                  <textarea [(ngModel)]="reportMessage" name="reportMessage" rows="3" placeholder="Describe the problem you ran into" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white"></textarea>
                  <button type="submit" [disabled]="submittingReport()" class="rounded-lg border border-ember-500 px-4 py-2 text-sm font-bold text-ember-600 hover:bg-ember-50 disabled:opacity-50">
                    {{ submittingReport() ? 'Sending…' : 'Report problem' }}
                  </button>
                </form>
              </div>
            </div>
          }

          @if (activeSection() === 'about') {
            <div class="card-surface p-5">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">About FeastGo</h2>
              <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">FeastGo connects you with the best local restaurants for fast, reliable delivery.</p>
              <p class="mt-2 text-xs text-ink-400 dark:text-ink-500">App version {{ appVersion }}</p>

              <div class="mt-4 divide-y divide-ink-100 border-t border-ink-100 dark:divide-ink-700 dark:border-ink-700">
                <div class="py-3">
                  <p class="text-sm font-semibold text-ink-800 dark:text-ink-100">Privacy Policy</p>
                  <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">
                    We collect only what's needed to place and deliver your orders — your name, contact details, and delivery
                    addresses. We never sell your data. You can download or delete your data any time from the Privacy section.
                  </p>
                </div>
                <div class="py-3">
                  <p class="text-sm font-semibold text-ink-800 dark:text-ink-100">Terms &amp; Conditions</p>
                  <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">
                    By using FeastGo you agree to order responsibly, provide accurate delivery details, and treat delivery
                    partners and restaurant staff with respect. Restaurants set their own menus, pricing, and availability.
                  </p>
                </div>
                <div class="py-3">
                  <p class="text-sm font-semibold text-ink-800 dark:text-ink-100">Refund Policy</p>
                  <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">
                    If an order arrives incorrect, incomplete, or not at all, contact Support within 24 hours and we'll work
                    with the restaurant to make it right.
                  </p>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  sections = SECTIONS;
  notifToggles = NOTIF_TOGGLES;
  languages = LANGUAGES;
  cardBrands = CARD_BRANDS;
  faqs = FAQS;
  appVersion = APP_VERSION;

  activeSection = signal<SectionKey>('personal');

  constructor(
    public auth: AuthService,
    public theme: ThemeService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.applySectionFromRoute();
    this.route.paramMap.subscribe(() => this.applySectionFromRoute());
  }

  private applySectionFromRoute() {
    const section = this.route.snapshot.paramMap.get('section') as SectionKey | null;
    if (section && this.sections.some((s) => s.key === section)) this.activeSection.set(section);
  }

  selectSection(key: SectionKey) {
    this.router.navigate(['/settings', key]);
  }

  // ---- Security: mobile/email change ----
  changingField = signal<'phone' | 'email' | null>(null);
  newPhone = '';
  newPhoneValid = signal(false);
  newEmail = '';
  changeCode = '';
  devOtp = signal<string | null>(null);
  changeSubmitting = signal(false);
  changeError = signal<string | null>(null);
  private pendingChangeValue = '';

  async requestChange(field: 'phone' | 'email') {
    this.changeError.set(null);
    let value: string;
    if (field === 'phone') {
      const result = validateMobile(this.newPhone);
      if (!result.valid) {
        this.toast.error(result.message);
        return;
      }
      value = normalizeMobile(this.newPhone);
    } else {
      const result = validateEmail(this.newEmail);
      if (!result.valid) {
        this.toast.error(result.message);
        return;
      }
      value = this.newEmail.trim().toLowerCase();
    }
    this.pendingChangeValue = value;
    this.changeCode = '';
    this.devOtp.set(null);
    this.changeSubmitting.set(true);
    try {
      const res = field === 'phone' ? await this.auth.requestPhoneChangeOtp(value) : await this.auth.requestEmailChangeOtp(value);
      this.devOtp.set(res.devOtp ?? null);
      this.changingField.set(field);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not send code');
    } finally {
      this.changeSubmitting.set(false);
    }
  }

  async submitChange(field: 'phone' | 'email') {
    if (this.changeCode.trim().length < 4) return;
    this.changeSubmitting.set(true);
    this.changeError.set(null);
    try {
      if (field === 'phone') {
        await this.auth.verifyPhoneChangeOtp(this.pendingChangeValue, this.changeCode.trim());
        this.newPhone = '';
      } else {
        await this.auth.verifyEmailChangeOtp(this.pendingChangeValue, this.changeCode.trim());
        this.newEmail = '';
      }
      this.toast.success(field === 'phone' ? 'Mobile number updated' : 'Email updated');
      this.changingField.set(null);
    } catch (err: any) {
      this.changeError.set(err?.error?.message ?? 'Incorrect code');
    } finally {
      this.changeSubmitting.set(false);
    }
  }

  cancelChange() {
    this.changingField.set(null);
    this.changeError.set(null);
  }

  // ---- Notifications ----
  notifPrefValue(key: keyof NotificationPrefs): boolean {
    return this.auth.currentUser()?.notificationPrefs?.[key] ?? true;
  }

  async toggleNotifPref(key: keyof NotificationPrefs) {
    const u = this.auth.currentUser();
    if (!u) return;
    const next = { ...u.notificationPrefs, [key]: !this.notifPrefValue(key) };
    try {
      await this.auth.updateProfile({ notificationPrefs: next });
      this.toast.success('Preference updated');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update preference');
    }
  }

  // ---- Appearance ----
  async setTheme(mode: ThemeMode) {
    this.theme.setMode(mode);
    try {
      await this.auth.updateProfile({ theme: mode });
    } catch {
      // theme still applies locally even if the sync fails
    }
  }

  // ---- Language ----
  savingLanguage = signal(false);
  async setLanguage(lang: string) {
    this.savingLanguage.set(true);
    try {
      await this.auth.updateProfile({ language: lang });
      this.toast.success('Language preference saved');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not save language');
    } finally {
      this.savingLanguage.set(false);
    }
  }

  // ---- Payment methods ----
  showCardForm = signal(false);
  newCard: { label: string; brand: string; last4: string; expiryMonth: number | null; expiryYear: number | null } = {
    label: '',
    brand: '',
    last4: '',
    expiryMonth: null,
    expiryYear: null,
  };
  cardError = signal<string | null>(null);
  savingCard = signal(false);

  onLast4Input(e: Event) {
    const input = e.target as HTMLInputElement;
    const sanitized = input.value.replace(/\D/g, '').slice(0, 4);
    input.value = sanitized;
    this.newCard.last4 = sanitized;
  }

  async addCard(e: Event) {
    e.preventDefault();
    this.cardError.set(null);
    if (!/^\d{4}$/.test(this.newCard.last4)) {
      this.cardError.set('Enter the last 4 digits of the card.');
      return;
    }
    if (!this.newCard.brand) {
      this.cardError.set('Select a card network.');
      return;
    }
    if (!this.newCard.expiryMonth || !this.newCard.expiryYear) {
      this.cardError.set('Enter a valid expiry date.');
      return;
    }
    this.savingCard.set(true);
    try {
      await this.auth.addSavedCard({
        label: this.newCard.label.trim(),
        brand: this.newCard.brand,
        last4: this.newCard.last4,
        expiryMonth: this.newCard.expiryMonth,
        expiryYear: this.newCard.expiryYear,
      });
      this.newCard = { label: '', brand: '', last4: '', expiryMonth: null, expiryYear: null };
      this.showCardForm.set(false);
      this.toast.success('Card saved');
    } catch (err: any) {
      this.cardError.set(err?.error?.message ?? 'Could not save card');
    } finally {
      this.savingCard.set(false);
    }
  }

  async removeCard(id: string) {
    try {
      await this.auth.removeSavedCard(id);
      this.toast.success('Card removed');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not remove card');
    }
  }

  showUpiForm = signal(false);
  newUpi = { label: '', upiId: '' };
  upiError = signal<string | null>(null);
  savingUpi = signal(false);

  async addUpi(e: Event) {
    e.preventDefault();
    this.upiError.set(null);
    if (!/^[\w.-]{2,256}@[a-zA-Z][a-zA-Z0-9]{2,64}$/.test(this.newUpi.upiId.trim())) {
      this.upiError.set('Enter a valid UPI ID (e.g. name@bank).');
      return;
    }
    this.savingUpi.set(true);
    try {
      await this.auth.addSavedUpi({ label: this.newUpi.label.trim(), upiId: this.newUpi.upiId.trim() });
      this.newUpi = { label: '', upiId: '' };
      this.showUpiForm.set(false);
      this.toast.success('UPI ID saved');
    } catch (err: any) {
      this.upiError.set(err?.error?.message ?? 'Could not save UPI ID');
    } finally {
      this.savingUpi.set(false);
    }
  }

  async removeUpi(id: string) {
    try {
      await this.auth.removeSavedUpi(id);
      this.toast.success('UPI ID removed');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not remove UPI ID');
    }
  }

  // ---- Privacy ----
  exportingData = signal(false);
  async downloadData() {
    this.exportingData.set(true);
    try {
      const data = await this.auth.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feastgo-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.toast.success('Your data export has started downloading');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not export your data');
    } finally {
      this.exportingData.set(false);
    }
  }

  deleteStep = signal<'idle' | 'confirming'>('idle');
  deleteConfirmText = '';
  deletingAccount = signal(false);

  async confirmDeleteAccount() {
    if (this.deleteConfirmText.trim() !== 'DELETE') return;
    this.deletingAccount.set(true);
    try {
      await this.auth.deleteAccount('DELETE');
      this.toast.success('Your account has been deleted');
      this.router.navigate(['/']);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not delete account');
    } finally {
      this.deletingAccount.set(false);
    }
  }

  // ---- Help & Support ----
  openFaq = signal<number | null>(null);
  toggleFaq(i: number) {
    this.openFaq.set(this.openFaq() === i ? null : i);
  }

  supportSubject = '';
  supportMessage = '';
  reportMessage = '';
  submittingSupport = signal(false);
  submittingReport = signal(false);

  async sendSupportMessage(e: Event, isReport: boolean) {
    e.preventDefault();
    if (isReport) {
      if (!this.reportMessage.trim()) {
        this.toast.error('Please describe the problem');
        return;
      }
      this.submittingReport.set(true);
      try {
        await this.auth.submitSupportRequest('Problem report', this.reportMessage.trim());
        this.reportMessage = '';
        this.toast.success('Thanks — our team will look into it');
      } catch (err: any) {
        this.toast.error(err?.error?.message ?? 'Could not send report');
      } finally {
        this.submittingReport.set(false);
      }
      return;
    }

    if (!this.supportSubject.trim() || !this.supportMessage.trim()) {
      this.toast.error('Please fill in both fields');
      return;
    }
    this.submittingSupport.set(true);
    try {
      await this.auth.submitSupportRequest(this.supportSubject.trim(), this.supportMessage.trim());
      this.supportSubject = '';
      this.supportMessage = '';
      this.toast.success('Message sent — our team will get back to you');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not send message');
    } finally {
      this.submittingSupport.set(false);
    }
  }
}
