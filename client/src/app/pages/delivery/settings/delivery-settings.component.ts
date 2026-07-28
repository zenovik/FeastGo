import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DeliveryNotificationPrefs } from '../../../core/models/role-account.model';
import { DeliveryAuthService } from '../../../core/services/delivery-auth.service';
import { DeliveryEarningRow, DeliveryService } from '../../../core/services/delivery.service';
import { ThemeMode, ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { DeliveryNavComponent } from '../../../shared/components/delivery-shell/delivery-nav.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';
import { normalizeMobile, validateMobile } from '../../../shared/utils/mobile-validation';
import { validateEmail } from '../../../shared/utils/profile-validation';

type SectionKey = 'personal' | 'security' | 'notifications' | 'availability' | 'navigation' | 'payments' | 'language' | 'appearance' | 'support' | 'about';

const SECTIONS: { key: SectionKey; emoji: string; label: string }[] = [
  { key: 'personal', emoji: '👤', label: 'Personal Information' },
  { key: 'security', emoji: '🔒', label: 'Security' },
  { key: 'notifications', emoji: '🔔', label: 'Notifications' },
  { key: 'availability', emoji: '🟢', label: 'Availability' },
  { key: 'navigation', emoji: '🧭', label: 'Navigation' },
  { key: 'payments', emoji: '💳', label: 'Payments' },
  { key: 'language', emoji: '🌐', label: 'Language' },
  { key: 'appearance', emoji: '🎨', label: 'Appearance' },
  { key: 'support', emoji: '❓', label: 'Help & Support' },
  { key: 'about', emoji: 'ℹ️', label: 'About' },
];

const NOTIF_TOGGLES: { key: keyof DeliveryNotificationPrefs; label: string; hint: string }[] = [
  { key: 'newDeliveryRequest', label: 'New Delivery Requests', hint: 'Alerts when a new order is available or assigned to you.' },
  { key: 'orderUpdates', label: 'Order Updates', hint: 'Changes to an order you are already delivering.' },
  { key: 'earnings', label: 'Earnings Updates', hint: 'Payout summaries and earnings milestones.' },
  { key: 'promotional', label: 'Promotional Notifications', hint: 'Incentive campaigns and festival greetings from FeastGo.' },
  { key: 'email', label: 'Email Notifications', hint: 'Copies of important updates sent to your email.' },
  { key: 'push', label: 'Push Notifications', hint: 'Alerts on this device when the app is in the background.' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
];

const MAPS_APPS: { value: 'google' | 'apple' | 'waze'; label: string }[] = [
  { value: 'google', label: 'Google Maps' },
  { value: 'apple', label: 'Apple Maps' },
  { value: 'waze', label: 'Waze' },
];

const ROUTE_PREFS: { value: 'fastest' | 'shortest' | 'avoid_tolls'; label: string }[] = [
  { value: 'fastest', label: 'Fastest route' },
  { value: 'shortest', label: 'Shortest distance' },
  { value: 'avoid_tolls', label: 'Avoid tolls' },
];

const FAQS = [
  { q: 'How do I go online to receive orders?', a: 'Toggle the online switch on your Dashboard — you\'ll start receiving new delivery requests immediately.' },
  { q: 'How is my delivery fee calculated?', a: 'Each delivery pays a base fee plus any customer tip and admin incentive — see the full breakdown in Payments → Payment History.' },
  { q: 'When do I get paid?', a: 'Earnings marked "pending" are settled in FeastGo\'s next payout cycle to your saved bank account or UPI ID.' },
  { q: 'What documents do I need to upload?', a: 'Go to Profile → Documents to upload your license, Aadhaar, PAN, vehicle RC, and insurance for admin verification.' },
];

const APP_VERSION = '1.0.0';

@Component({
  selector: 'app-delivery-settings',
  standalone: true,
  imports: [FormsModule, RouterLink, DeliveryNavComponent, IconComponent, InrPipe, DatePipe],
  template: `
    <app-delivery-nav />
    <div class="container-shell max-w-4xl py-8">
      <h1 class="font-display text-2xl font-bold text-ink-900 dark:text-white">Settings</h1>

      <div class="mt-6 flex flex-col gap-6 md:flex-row">
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
              <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">Your name, photo, vehicle, and identity details live on your Profile page.</p>
              <div class="mt-4 flex items-center gap-4 rounded-lg border border-ink-100 p-4 dark:border-ink-700">
                @if (auth.currentUser()?.photo; as photo) {
                  <img [src]="photo" alt="" class="h-12 w-12 rounded-full object-cover" />
                } @else {
                  <div class="flex h-12 w-12 items-center justify-center rounded-full bg-ember-100 font-bold text-ember-600 dark:bg-ember-500/10">
                    {{ auth.currentUser()?.name?.charAt(0) || '?' }}
                  </div>
                }
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-bold text-ink-900 dark:text-white">{{ auth.currentUser()?.name }}</p>
                  <p class="truncate text-xs text-ink-400 dark:text-ink-500">{{ auth.currentUser()?.email }}</p>
                </div>
                <a routerLink="/delivery/profile" class="shrink-0 rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-ink-900">Edit Profile</a>
              </div>
            </div>
          }

          @if (activeSection() === 'security') {
            <div class="card-surface p-5">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Security</h2>

              <div class="mt-4">
                <p class="text-sm font-semibold text-ink-700 dark:text-ink-200">Change Password</p>
                <div class="mt-2 space-y-2">
                  <input type="password" [(ngModel)]="currentPassword" name="currentPassword" placeholder="Current password" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                  <input type="password" [(ngModel)]="newPassword" name="newPassword" placeholder="New password (min 6 characters)" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                  <button type="button" [disabled]="changingPassword() || !currentPassword || newPassword.length < 6" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-ink-900" (click)="changePassword()">
                    {{ changingPassword() ? 'Updating…' : 'Update password' }}
                  </button>
                </div>
              </div>

              <div class="mt-4 border-t border-ink-100 pt-4 dark:border-ink-700">
                <p class="text-sm font-semibold text-ink-700 dark:text-ink-200">Change Mobile Number</p>
                <p class="mt-0.5 text-xs text-ink-400 dark:text-ink-500">Current: {{ auth.currentUser()?.phone || '—' }}</p>
                @if (changingField() !== 'phone') {
                  <div class="mt-2 flex items-center gap-2">
                    <input type="tel" [(ngModel)]="newPhone" name="newPhone" placeholder="New mobile number" class="w-full flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                    <button type="button" [disabled]="!newPhone.trim()" class="shrink-0 rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 dark:bg-white dark:text-ink-900" (click)="requestChange('phone')">
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
                      <button type="button" [disabled]="changeSubmitting()" class="shrink-0 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-ink-900" (click)="submitChange('phone')">
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
                    <button type="button" [disabled]="!newEmail.trim()" class="shrink-0 rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 dark:bg-white dark:text-ink-900" (click)="requestChange('email')">
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
                      <button type="button" [disabled]="changeSubmitting()" class="shrink-0 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-ink-900" (click)="submitChange('email')">
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

              <div class="mt-4 border-t border-ink-100 pt-4 dark:border-ink-700">
                <p class="text-sm font-semibold text-ink-700 dark:text-ink-200">Active Session</p>
                <p class="mt-0.5 text-xs text-ink-400 dark:text-ink-500">This app doesn't track individual devices — this covers every device currently signed in with your account.</p>
                @if (loggingOutAll() === false) {
                  <button type="button" class="mt-2 rounded-lg border border-ember-500 px-3 py-2 text-xs font-bold text-ember-600 hover:bg-ember-50" (click)="loggingOutAllConfirm.set(true)">
                    Logout from all devices
                  </button>
                }
                @if (loggingOutAllConfirm()) {
                  <div class="mt-2 rounded-lg bg-ember-50 p-3 dark:bg-ember-500/10">
                    <p class="text-xs font-semibold text-ember-700 dark:text-ember-300">This signs you out everywhere, including this device.</p>
                    <div class="mt-2 flex gap-2">
                      <button type="button" [disabled]="loggingOutAll()" class="rounded-lg bg-ember-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50" (click)="logoutAllDevices()">
                        {{ loggingOutAll() ? 'Signing out…' : 'Confirm' }}
                      </button>
                      <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-500 dark:border-ink-700 dark:text-ink-400" (click)="loggingOutAllConfirm.set(false)">Cancel</button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          @if (activeSection() === 'notifications') {
            <div class="card-surface p-5">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Notifications</h2>
              <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">Choose what you'd like to be alerted about.</p>
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

          @if (activeSection() === 'availability') {
            <div class="card-surface p-5">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Availability</h2>
              <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">Control how new orders reach you while you're online.</p>

              <label class="mt-4 flex items-center justify-between gap-4 border-t border-ink-100 py-3 dark:border-ink-700">
                <span>
                  <span class="block text-sm font-semibold text-ink-800 dark:text-ink-100">Auto-accept orders</span>
                  <span class="block text-xs text-ink-400 dark:text-ink-500">Skip the manual accept step — new orders assigned to you are accepted instantly.</span>
                </span>
                <input
                  type="checkbox"
                  class="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-ink-200 transition-colors checked:bg-basil-500 relative dark:bg-ink-700
                         before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
                  [checked]="auth.currentUser()?.autoAcceptOrders"
                  (change)="toggleAutoAccept()"
                />
              </label>

              <div class="border-t border-ink-100 py-3 dark:border-ink-700">
                <p class="text-sm font-semibold text-ink-800 dark:text-ink-100">Accept radius</p>
                <p class="text-xs text-ink-400 dark:text-ink-500">Only get matched with orders within this distance of your last known location.</p>
                <div class="mt-2 flex items-center gap-3">
                  <input type="range" min="1" max="20" step="1" [(ngModel)]="acceptRadiusKm" name="acceptRadiusKm" class="flex-1" (change)="saveAcceptRadius()" />
                  <span class="w-14 shrink-0 text-right text-sm font-bold text-ink-800 dark:text-ink-100">{{ acceptRadiusKm }} km</span>
                </div>
              </div>
            </div>
          }

          @if (activeSection() === 'navigation') {
            <div class="card-surface p-5">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Navigation</h2>
              <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">Preferences used when you tap "Navigate" on a delivery.</p>

              <div class="mt-4 border-t border-ink-100 py-3 dark:border-ink-700">
                <p class="text-sm font-semibold text-ink-800 dark:text-ink-100">Default maps app</p>
                <select [ngModel]="auth.currentUser()?.defaultMapsApp" (ngModelChange)="setMapsApp($event)" name="mapsApp" class="mt-2 w-full max-w-xs rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-white">
                  @for (m of mapsApps; track m.value) { <option [value]="m.value">{{ m.label }}</option> }
                </select>
              </div>

              <label class="flex items-center justify-between gap-4 border-t border-ink-100 py-3 dark:border-ink-700">
                <span>
                  <span class="block text-sm font-semibold text-ink-800 dark:text-ink-100">Voice navigation</span>
                  <span class="block text-xs text-ink-400 dark:text-ink-500">Turn-by-turn spoken directions while navigating.</span>
                </span>
                <input
                  type="checkbox"
                  class="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-ink-200 transition-colors checked:bg-basil-500 relative dark:bg-ink-700
                         before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
                  [checked]="auth.currentUser()?.voiceNavigation"
                  (change)="toggleVoiceNav()"
                />
              </label>

              <div class="border-t border-ink-100 py-3 dark:border-ink-700">
                <p class="text-sm font-semibold text-ink-800 dark:text-ink-100">Route preference</p>
                <select [ngModel]="auth.currentUser()?.routePreference" (ngModelChange)="setRoutePreference($event)" name="routePref" class="mt-2 w-full max-w-xs rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-white">
                  @for (r of routePrefs; track r.value) { <option [value]="r.value">{{ r.label }}</option> }
                </select>
              </div>
            </div>
          }

          @if (activeSection() === 'payments') {
            <div class="space-y-4">
              <div class="card-surface p-5">
                <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Bank & UPI</h2>
                <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">Your payout account details are managed from your Profile page.</p>
                <a routerLink="/delivery/profile" class="mt-3 inline-block rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-ink-900">Manage Bank & UPI</a>
              </div>

              <div class="card-surface p-5">
                <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Payment History</h2>
                <div class="mt-3 divide-y divide-ink-100 dark:divide-ink-700">
                  @for (row of earningsHistory(); track row._id) {
                    <div class="flex items-center justify-between py-2.5 text-sm">
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-ink-800 dark:text-ink-100">{{ row.order?.restaurantName || 'Delivery' }}</p>
                        <p class="text-xs text-ink-400 dark:text-ink-500">{{ row.createdAt | date: 'MMM d, y, h:mm a' }}</p>
                      </div>
                      <div class="shrink-0 text-right">
                        <p class="font-bold text-ink-900 dark:text-white">{{ row.total | inr }}</p>
                        <p class="text-[11px] font-semibold" [class.text-basil-600]="row.paid" [class.text-gold-600]="!row.paid">{{ row.paid ? 'Paid' : 'Pending payout' }}</p>
                      </div>
                    </div>
                  } @empty {
                    <p class="py-3 text-sm text-ink-400 dark:text-ink-500">No earnings recorded yet.</p>
                  }
                </div>
                @if (historyHasMore()) {
                  <button type="button" [disabled]="loadingHistory()" class="mt-3 text-sm font-semibold text-ember-600" (click)="loadMoreHistory()">
                    {{ loadingHistory() ? 'Loading…' : 'Load more' }}
                  </button>
                }
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
                @for (l of languages; track l.value) { <option [value]="l.value">{{ l.label }}</option> }
              </select>
            </div>
          }

          @if (activeSection() === 'appearance') {
            <div class="card-surface p-5">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">Appearance</h2>
              <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">Choose how the Delivery Panel looks on this device.</p>
              <div class="mt-4 grid grid-cols-3 gap-2">
                <button type="button" class="flex flex-col items-center gap-1.5 rounded-lg border p-3" [class.border-ember-500]="theme.mode() === 'light'" [class.border-ink-200]="theme.mode() !== 'light'" [class.dark:border-ink-700]="theme.mode() !== 'light'" (click)="setTheme('light')">
                  <app-icon name="sun" [size]="20" [class]="theme.mode() === 'light' ? 'text-ember-600' : 'text-ink-400'" />
                  <span class="text-xs font-bold" [class.text-ember-600]="theme.mode() === 'light'">Light Mode</span>
                </button>
                <button type="button" class="flex flex-col items-center gap-1.5 rounded-lg border p-3" [class.border-ember-500]="theme.mode() === 'dark'" [class.border-ink-200]="theme.mode() !== 'dark'" [class.dark:border-ink-700]="theme.mode() !== 'dark'" (click)="setTheme('dark')">
                  <app-icon name="moon" [size]="20" [class]="theme.mode() === 'dark' ? 'text-ember-600' : 'text-ink-400'" />
                  <span class="text-xs font-bold" [class.text-ember-600]="theme.mode() === 'dark'">Dark Mode</span>
                </button>
                <button type="button" class="flex flex-col items-center gap-1.5 rounded-lg border p-3" [class.border-ember-500]="theme.mode() === 'system'" [class.border-ink-200]="theme.mode() !== 'system'" [class.dark:border-ink-700]="theme.mode() !== 'system'" (click)="setTheme('system')">
                  <app-icon name="settings" [size]="20" [class]="theme.mode() === 'system' ? 'text-ember-600' : 'text-ink-400'" />
                  <span class="text-xs font-bold" [class.text-ember-600]="theme.mode() === 'system'">System Theme</span>
                </button>
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
                <form class="mt-3 space-y-2" (submit)="sendSupportMessage($event)">
                  <input [(ngModel)]="supportSubject" name="supportSubject" placeholder="Subject" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white" />
                  <textarea [(ngModel)]="supportMessage" name="supportMessage" rows="3" placeholder="How can we help?" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white"></textarea>
                  <button type="submit" [disabled]="submittingSupport()" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-ink-900">
                    {{ submittingSupport() ? 'Sending…' : 'Send message' }}
                  </button>
                </form>
              </div>
            </div>
          }

          @if (activeSection() === 'about') {
            <div class="card-surface p-5">
              <h2 class="font-display text-lg font-bold text-ink-900 dark:text-white">About FeastGo Delivery</h2>
              <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">The Delivery Panel is how you receive, accept, and complete deliveries for FeastGo.</p>
              <p class="mt-2 text-xs text-ink-400 dark:text-ink-500">App version {{ appVersion }}</p>

              <div class="mt-4 border-t border-ink-100 pt-4 dark:border-ink-700">
                @if (loggingOutConfirm() === false) {
                  <button type="button" class="rounded-lg border border-ember-500 px-4 py-2 text-sm font-bold text-ember-600 hover:bg-ember-50" (click)="loggingOutConfirm.set(true)">
                    Log out
                  </button>
                } @else {
                  <div class="rounded-lg bg-ember-50 p-3.5 dark:bg-ember-500/10">
                    <p class="text-sm font-semibold text-ember-700 dark:text-ember-300">Are you sure you want to log out?</p>
                    <div class="mt-2 flex gap-2">
                      <button type="button" class="rounded-lg bg-ember-600 px-4 py-2 text-sm font-bold text-white" (click)="logout()">Log out</button>
                      <button type="button" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-500 dark:border-ink-700 dark:text-ink-400" (click)="loggingOutConfirm.set(false)">Cancel</button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class DeliverySettingsComponent implements OnInit {
  sections = SECTIONS;
  notifToggles = NOTIF_TOGGLES;
  languages = LANGUAGES;
  mapsApps = MAPS_APPS;
  routePrefs = ROUTE_PREFS;
  faqs = FAQS;
  appVersion = APP_VERSION;

  activeSection = signal<SectionKey>('personal');

  constructor(
    public auth: DeliveryAuthService,
    public theme: ThemeService,
    private deliveryService: DeliveryService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.applySectionFromRoute();
    this.route.paramMap.subscribe(() => this.applySectionFromRoute());
    this.acceptRadiusKm = this.auth.currentUser()?.acceptRadiusKm ?? 5;
    this.loadHistory();
  }

  private applySectionFromRoute() {
    const section = this.route.snapshot.paramMap.get('section') as SectionKey | null;
    if (section && this.sections.some((s) => s.key === section)) this.activeSection.set(section);
  }

  selectSection(key: SectionKey) {
    this.router.navigate(['/delivery/settings', key]);
  }

  // ---- Security ----
  currentPassword = '';
  newPassword = '';
  changingPassword = signal(false);

  async changePassword() {
    this.changingPassword.set(true);
    try {
      await this.auth.changePassword(this.currentPassword, this.newPassword);
      this.toast.success('Password updated');
      this.currentPassword = '';
      this.newPassword = '';
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update password');
    } finally {
      this.changingPassword.set(false);
    }
  }

  changingField = signal<'phone' | 'email' | null>(null);
  newPhone = '';
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

  loggingOutAllConfirm = signal(false);
  loggingOutAll = signal(false);

  async logoutAllDevices() {
    this.loggingOutAll.set(true);
    try {
      await this.auth.logoutAllDevices();
      this.toast.success('Signed out from all devices — please sign in again');
      this.router.navigate(['/delivery/login']);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not sign out other devices');
    } finally {
      this.loggingOutAll.set(false);
      this.loggingOutAllConfirm.set(false);
    }
  }

  // ---- Notifications ----
  notifPrefValue(key: keyof DeliveryNotificationPrefs): boolean {
    return this.auth.currentUser()?.notificationPrefs?.[key] ?? true;
  }

  async toggleNotifPref(key: keyof DeliveryNotificationPrefs) {
    const partner = this.auth.currentUser();
    if (!partner) return;
    const next = { ...partner.notificationPrefs, [key]: !this.notifPrefValue(key) };
    try {
      await this.auth.updateProfile({ notificationPrefs: next });
      this.toast.success('Preference updated');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update preference');
    }
  }

  // ---- Availability ----
  acceptRadiusKm = 5;

  async toggleAutoAccept() {
    const partner = this.auth.currentUser();
    if (!partner) return;
    try {
      await this.auth.updateProfile({ autoAcceptOrders: !partner.autoAcceptOrders });
      this.toast.success('Preference updated');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update preference');
    }
  }

  async saveAcceptRadius() {
    try {
      await this.auth.updateProfile({ acceptRadiusKm: this.acceptRadiusKm });
      this.toast.success('Accept radius updated');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update radius');
    }
  }

  // ---- Navigation ----
  async setMapsApp(value: 'google' | 'apple' | 'waze') {
    try {
      await this.auth.updateProfile({ defaultMapsApp: value });
      this.toast.success('Preference updated');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update preference');
    }
  }

  async toggleVoiceNav() {
    const partner = this.auth.currentUser();
    if (!partner) return;
    try {
      await this.auth.updateProfile({ voiceNavigation: !partner.voiceNavigation });
      this.toast.success('Preference updated');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update preference');
    }
  }

  async setRoutePreference(value: 'fastest' | 'shortest' | 'avoid_tolls') {
    try {
      await this.auth.updateProfile({ routePreference: value });
      this.toast.success('Preference updated');
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not update preference');
    }
  }

  // ---- Payments / earnings history ----
  earningsHistory = signal<DeliveryEarningRow[]>([]);
  historyPage = 1;
  historyHasMore = signal(false);
  loadingHistory = signal(false);

  async loadHistory() {
    this.loadingHistory.set(true);
    try {
      const res = await this.deliveryService.listEarningsHistory(this.historyPage, 10);
      this.earningsHistory.set(res.earnings);
      this.historyHasMore.set(res.page * res.limit < res.total);
    } catch {
      // best effort — payment history is supplementary
    } finally {
      this.loadingHistory.set(false);
    }
  }

  async loadMoreHistory() {
    this.historyPage += 1;
    this.loadingHistory.set(true);
    try {
      const res = await this.deliveryService.listEarningsHistory(this.historyPage, 10);
      this.earningsHistory.set([...this.earningsHistory(), ...res.earnings]);
      this.historyHasMore.set(res.page * res.limit < res.total);
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Could not load more history');
      this.historyPage -= 1;
    } finally {
      this.loadingHistory.set(false);
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

  // ---- Help & Support ----
  openFaq = signal<number | null>(null);
  toggleFaq(i: number) {
    this.openFaq.set(this.openFaq() === i ? null : i);
  }

  supportSubject = '';
  supportMessage = '';
  submittingSupport = signal(false);

  async sendSupportMessage(e: Event) {
    e.preventDefault();
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

  // ---- Logout ----
  loggingOutConfirm = signal(false);
  async logout() {
    await this.auth.logout();
    this.router.navigate(['/delivery/login']);
  }
}
