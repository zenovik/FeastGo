import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Address } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { LocationService } from '../../core/services/location.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';
import { NotificationCenterComponent } from '../../shared/components/notification-center/notification-center.component';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, SearchBarComponent, NotificationBellComponent, NotificationCenterComponent],
  template: `
    <header class="sticky top-0 z-50 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div class="container-shell flex h-16 items-center gap-2 sm:gap-4">
        <a routerLink="/" class="flex shrink-0 items-center gap-2">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-ember-500 text-white">
            <app-icon name="flame" [size]="18" />
          </span>
          <span class="font-display text-xl font-extrabold tracking-tight text-ink-900">FeastGo</span>
        </a>

        <div class="relative hidden shrink-0 sm:block" #locationWrapper>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-50"
            (click)="locationOpen.set(!locationOpen())"
          >
            <app-icon name="map-pin" [size]="16" class="text-ember-500" />
            <span class="max-w-[140px] truncate">{{ location.label() }}</span>
            <app-icon name="chevron_down" [size]="14" />
          </button>

          @if (locationOpen()) {
            <div
              class="absolute left-0 top-12 z-50 w-72 overflow-hidden rounded-xl border border-ink-100 bg-white py-1.5 shadow-[var(--shadow-pop)]"
              (click)="locationOpen.set(false)"
            >
              <button
                type="button"
                class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-ember-600 hover:bg-ember-50"
                (click)="useCurrentLocation($event)"
              >
                <app-icon name="compass" [size]="16" /> Use current location
              </button>

              @if (auth.isAuthenticated()) {
                @if (auth.currentUser()?.addresses?.length) {
                  <div class="border-t border-ink-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Saved addresses
                  </div>
                  @for (addr of auth.currentUser()!.addresses; track addr._id) {
                    <button
                      type="button"
                      class="flex w-full items-start gap-2.5 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50"
                      (click)="selectAddress(addr)"
                    >
                      <app-icon name="map-pin" [size]="15" class="mt-0.5 shrink-0 text-ink-400" />
                      <span class="min-w-0">
                        <span class="block font-semibold">
                          {{ addr.label }}
                          @if (addr.isDefault) {
                            <span class="ml-1 rounded bg-basil-100 px-1.5 py-0.5 text-[10px] font-bold text-basil-600">DEFAULT</span>
                          }
                        </span>
                        <span class="block truncate text-xs text-ink-400">{{ addr.line1 }}, {{ addr.area }}, {{ addr.city }}</span>
                      </span>
                    </button>
                  }
                }
                <a routerLink="/profile" class="flex items-center gap-2.5 border-t border-ink-100 px-4 py-2.5 text-sm text-ink-600 hover:bg-ink-50">
                  <app-icon name="edit" [size]="15" /> Manage addresses
                </a>
              } @else {
                <a routerLink="/login" class="flex items-center gap-2.5 border-t border-ink-100 px-4 py-2.5 text-sm text-ink-600 hover:bg-ink-50">
                  <app-icon name="user" [size]="15" /> Sign in to use saved addresses
                </a>
              }
            </div>
          }
        </div>

        <div class="mx-auto min-w-0 max-w-md flex-1">
          <app-search-bar variant="compact" [showVoice]="true" placeholder="Search restaurants or dishes" />
        </div>

        <nav class="ml-auto flex items-center gap-1 sm:gap-2">
          <a
            routerLink="/restaurants"
            routerLinkActive="text-ember-600"
            class="hidden rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50 sm:block"
          >
            Restaurants
          </a>

          @if (auth.isAuthenticated()) {
            <a
              routerLink="/orders"
              routerLinkActive="text-ember-600"
              class="hidden rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50 sm:block"
            >
              Orders
            </a>
          }

          @if (auth.isAuthenticated()) {
            <div class="hidden sm:block">
              <app-notification-bell role="customer" [iconSize]="20" />
            </div>
          }

          <button
            type="button"
            class="relative hidden rounded-lg p-2.5 text-ink-700 hover:bg-ink-50 sm:block"
            (click)="cart.openDrawer()"
            aria-label="Open cart"
          >
            <app-icon name="cart" [size]="21" />
            @if (cart.itemCount() > 0) {
              <span
                class="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-white"
              >
                {{ cart.itemCount() }}
              </span>
            }
          </button>

          @if (auth.isAuthenticated()) {
            <div class="relative hidden sm:block" #menuWrapper>
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-lg py-1.5 pl-1.5 pr-2 hover:bg-ink-50"
                (click)="menuOpen.set(!menuOpen())"
              >
                <span
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-ink-800 text-xs font-bold text-white"
                >
                  {{ initials() }}
                </span>
                <app-icon name="chevron_down" [size]="14" class="text-ink-500" />
              </button>

              @if (menuOpen()) {
                <div
                  class="absolute right-0 top-12 w-52 overflow-hidden rounded-xl border border-ink-100 bg-white py-1.5 shadow-[var(--shadow-pop)]"
                  (click)="menuOpen.set(false)"
                >
                  <div class="border-b border-ink-100 px-4 py-2.5">
                    <p class="truncate text-sm font-semibold text-ink-900">{{ auth.currentUser()?.name }}</p>
                    <p class="truncate text-xs text-ink-400">{{ contactLabel() }}</p>
                  </div>
                  <a routerLink="/profile" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                    <app-icon name="user" [size]="16" /> Profile
                  </a>
                  <a routerLink="/orders" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                    <app-icon name="package" [size]="16" /> Orders
                  </a>
                  <a routerLink="/favorites" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                    <app-icon name="heart" [size]="16" /> Bookmarks
                  </a>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ember-600 hover:bg-ember-50"
                    (click)="logout()"
                  >
                    <app-icon name="log-out" [size]="16" /> Sign out
                  </button>
                </div>
              }
            </div>
          } @else {
            <a
              routerLink="/login"
              class="hidden rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-700 sm:block"
            >
              Sign in
            </a>
          }

          <!-- Mobile: everything collapses into this single hamburger menu. -->
          <div class="relative sm:hidden" #mobileNavWrapper>
            <button
              type="button"
              class="relative rounded-lg p-2 text-ink-700 hover:bg-ink-50"
              (click)="mobileNavOpen.set(!mobileNavOpen())"
              aria-label="Menu"
            >
              <app-icon name="menu" [size]="22" />
              @if (!auth.isAuthenticated() || notif.unreadCount() > 0 || cart.itemCount() > 0) {
                <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-ember-500"></span>
              }
            </button>

            @if (mobileNavOpen()) {
              <div
                class="fixed inset-x-3 top-16 z-50 max-h-[75vh] overflow-y-auto rounded-xl border border-ink-100 bg-white py-1.5 shadow-[var(--shadow-pop)]"
              >
                @if (auth.isAuthenticated()) {
                  <div class="border-b border-ink-100 px-4 py-2.5">
                    <p class="truncate text-sm font-semibold text-ink-900">{{ auth.currentUser()?.name }}</p>
                    <p class="truncate text-xs text-ink-400">{{ contactLabel() }}</p>
                  </div>
                }

                <a
                  routerLink="/restaurants"
                  routerLinkActive="text-ember-600"
                  class="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                  (click)="mobileNavOpen.set(false)"
                >
                  <app-icon name="store" [size]="16" /> Restaurants
                </a>

                @if (auth.isAuthenticated()) {
                  <a
                    routerLink="/orders"
                    routerLinkActive="text-ember-600"
                    class="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                    (click)="mobileNavOpen.set(false)"
                  >
                    <app-icon name="package" [size]="16" /> Orders
                  </a>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-ink-700 hover:bg-ink-50"
                    (click)="openMobileNotifications($event)"
                  >
                    <app-icon name="bell" [size]="16" /> Notifications
                    @if (notif.unreadCount() > 0) {
                      <span class="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ember-500 px-1.5 text-[10px] font-bold text-white">
                        {{ notif.unreadCount() > 9 ? '9+' : notif.unreadCount() }}
                      </span>
                    }
                  </button>
                }

                @if (auth.isAuthenticated()) {
                  <button
                    type="button"
                    class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-ink-700 hover:bg-ink-50"
                    (click)="mobileNavOpen.set(false); cart.openDrawer()"
                  >
                    <app-icon name="cart" [size]="16" /> Cart
                    @if (cart.itemCount() > 0) {
                      <span class="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ember-500 px-1.5 text-[10px] font-bold text-white">
                        {{ cart.itemCount() }}
                      </span>
                    }
                  </button>
                }

                @if (auth.isAuthenticated()) {
                  <a routerLink="/profile" class="flex items-center gap-2.5 border-t border-ink-100 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50" (click)="mobileNavOpen.set(false)">
                    <app-icon name="user" [size]="16" /> Profile
                  </a>
                  <a routerLink="/favorites" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50" (click)="mobileNavOpen.set(false)">
                    <app-icon name="heart" [size]="16" /> Bookmarks
                  </a>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ember-600 hover:bg-ember-50"
                    (click)="mobileNavOpen.set(false); logout()"
                  >
                    <app-icon name="log-out" [size]="16" /> Sign out
                  </button>
                } @else {
                  <a
                    routerLink="/login"
                    class="mx-4 mt-2 block rounded-lg bg-ink-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-ink-700"
                    (click)="mobileNavOpen.set(false)"
                  >
                    Sign in
                  </a>
                }
              </div>
            }
          </div>
        </nav>
      </div>
    </header>
    @if (mobileCenterOpen()) {
      <app-notification-center (closed)="mobileCenterOpen.set(false)" />
    }
  `,
})
export class HeaderComponent implements OnInit, OnDestroy {
  menuOpen = signal(false);
  locationOpen = signal(false);
  mobileNavOpen = signal(false);
  mobileCenterOpen = signal(false);

  @ViewChild('locationWrapper') locationWrapper?: ElementRef<HTMLElement>;
  @ViewChild('menuWrapper') menuWrapper?: ElementRef<HTMLElement>;
  @ViewChild('mobileNavWrapper') mobileNavWrapper?: ElementRef<HTMLElement>;

  constructor(
    public auth: AuthService,
    public cart: CartService,
    public location: LocationService,
    public notif: NotificationService,
    private router: Router,
    private toast: ToastService
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as Node;
    if (this.locationOpen() && !this.locationWrapper?.nativeElement.contains(target)) {
      this.locationOpen.set(false);
    }
    if (this.menuOpen() && !this.menuWrapper?.nativeElement.contains(target)) {
      this.menuOpen.set(false);
    }
    if (this.mobileNavOpen() && !this.mobileNavWrapper?.nativeElement.contains(target)) {
      this.mobileNavOpen.set(false);
    }
  }

  ngOnInit() {
    if (this.auth.isAuthenticated()) this.notif.init('customer');
  }

  ngOnDestroy() {}

  openMobileNotifications(e: Event) {
    e.stopPropagation();
    this.mobileNavOpen.set(false);
    this.mobileCenterOpen.set(true);
  }

  useCurrentLocation(e: Event) {
    e.stopPropagation();
    this.locationOpen.set(false);

    if (!navigator.geolocation) {
      this.toast.error('Location is not supported on this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        this.location.setLabel('Current location');
        this.toast.success('Using your current location');
      },
      () => {
        this.toast.error('Location permission denied');
      },
      { timeout: 10000 }
    );
  }

  selectAddress(addr: Address) {
    this.location.setLabel(addr.area ? `${addr.area}, ${addr.city}` : addr.city);
  }

  contactLabel(): string {
    const u = this.auth.currentUser();
    return u?.phone || u?.email || '';
  }

  initials(): string {
    const name = this.auth.currentUser()?.name ?? '';
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  async logout() {
    await this.auth.logout();
    this.notif.disconnect();
    this.router.navigate(['/']);
  }
}
