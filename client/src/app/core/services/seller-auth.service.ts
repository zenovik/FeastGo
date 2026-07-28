import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { SellerAccount } from '../models/role-account.model';
import { Restaurant } from '../models/restaurant.model';
import { clearStoredToken, getStoredToken, setStoredToken } from '../utils/token-storage';

const TOKEN_KEY = 'feastgo_seller_token';

interface SellerAuthResponse {
  token: string;
  user: SellerAccount;
}

@Injectable({ providedIn: 'root' })
export class SellerAuthService {
  private readonly currentUserSig = signal<SellerAccount | null>(null);
  private readonly initializedSig = signal(false);

  readonly currentUser = this.currentUserSig.asReadonly();
  readonly initialized = this.initializedSig.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSig());

  constructor(private http: HttpClient) {
    this.bootstrap();
  }

  private async bootstrap() {
    const token = getStoredToken(TOKEN_KEY);
    if (!token) {
      this.initializedSig.set(true);
      return;
    }
    try {
      const res = await firstValueFrom(this.http.get<{ user: SellerAccount }>(`${API_URL}/seller/auth/me`));
      this.currentUserSig.set(res.user);
    } catch {
      clearStoredToken(TOKEN_KEY);
    } finally {
      this.initializedSig.set(true);
    }
  }

  async signup(payload: { name: string; businessName: string; email: string; phone: string; password: string }) {
    const res = await firstValueFrom(this.http.post<SellerAuthResponse>(`${API_URL}/seller/auth/signup`, payload));
    this.persist(res);
    return res.user;
  }

  async login(email: string, password: string) {
    const res = await firstValueFrom(
      this.http.post<SellerAuthResponse>(`${API_URL}/seller/auth/login`, { email, password })
    );
    this.persist(res);
    return res.user;
  }

  async logout() {
    clearStoredToken(TOKEN_KEY);
    this.currentUserSig.set(null);
    try {
      await firstValueFrom(this.http.post(`${API_URL}/seller/auth/logout`, {}));
    } catch {
      // best effort
    }
  }

  async updateMyProfile(payload: { name?: string; email?: string; phone?: string }) {
    const res = await firstValueFrom(this.http.patch<{ user: SellerAccount }>(`${API_URL}/seller/auth/profile`, payload));
    this.currentUserSig.set(res.user);
    return res.user;
  }

  // Re-fetches the current account from the server so status changes an admin
  // makes elsewhere (approve/reject/suspend) show up without a manual reload.
  async refreshMe() {
    try {
      const res = await firstValueFrom(this.http.get<{ user: SellerAccount }>(`${API_URL}/seller/auth/me`));
      this.currentUserSig.set(res.user);
      return res.user;
    } catch {
      return this.currentUserSig();
    }
  }

  async getMyRestaurant() {
    return firstValueFrom(this.http.get<{ restaurant: Restaurant | null }>(`${API_URL}/seller/restaurant`));
  }

  async registerRestaurant(payload: Partial<Restaurant>) {
    const res = await firstValueFrom(this.http.post<{ restaurant: Restaurant }>(`${API_URL}/seller/restaurant`, payload));
    this.currentUserSig.update((u) => (u ? { ...u, restaurant: res.restaurant._id } : u));
    return res.restaurant;
  }

  private persist(res: SellerAuthResponse) {
    // Session-scoped (not "remembered") — seller has no remember-me choice,
    // and a shared localStorage entry would leak this login into every other
    // tab, silently swapping whichever seller account those tabs were showing
    // the next time their own 15s account-status poll ran.
    setStoredToken(TOKEN_KEY, res.token, false);
    this.currentUserSig.set(res.user);
  }
}
