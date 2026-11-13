import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { Address, Gender, NotificationPrefs, ThemeMode, User } from '../models/user.model';
import { Restaurant } from '../models/restaurant.model';
import { clearStoredToken, getStoredToken, replaceStoredToken, setStoredToken } from '../utils/token-storage';
import { requestWithProgress } from '../../shared/utils/http-progress';

const TOKEN_KEY = 'feastgo_token';

export type AuthMethod = 'phone' | 'email';
export type AuthMode = 'login' | 'signup';

interface AuthResponse {
  token: string;
  user: User;
}

interface OtpRequestResponse {
  message: string;
  devOtp?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSig = signal<User | null>(null);
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
      const res = await firstValueFrom(this.http.get<{ user: User }>(`${API_URL}/auth/me`));
      this.currentUserSig.set(res.user);
    } catch {
      clearStoredToken(TOKEN_KEY);
    } finally {
      this.initializedSig.set(true);
    }
  }

  requestOtp(method: AuthMethod, value: string, mode: AuthMode) {
    return firstValueFrom(this.http.post<OtpRequestResponse>(`${API_URL}/auth/otp/request`, { method, value, mode }));
  }

  async verifyLoginOtp(method: AuthMethod, value: string, code: string, remember: boolean) {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${API_URL}/auth/otp/verify`, { method, value, code, mode: 'login' })
    );
    this.persist(res, remember);
    return res.user;
  }

  verifySignupOtp(method: AuthMethod, value: string, code: string) {
    return firstValueFrom(
      this.http.post<{ verified: true }>(`${API_URL}/auth/otp/verify`, { method, value, code, mode: 'signup' })
    );
  }

  async completeSignup(method: AuthMethod, value: string, name: string, termsAccepted: boolean, remember: boolean) {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${API_URL}/auth/complete-signup`, { method, value, name, termsAccepted })
    );
    this.persist(res, remember);
    return res.user;
  }

  async refreshToken() {
    try {
      const res = await firstValueFrom(this.http.post<AuthResponse>(`${API_URL}/auth/refresh-token`, {}));
      replaceStoredToken(TOKEN_KEY, res.token);
      this.currentUserSig.set(res.user);
    } catch {
      // best effort — an expired/invalid token here just means the next
      // authenticated request will 401 and the user re-logs in normally
    }
  }

  async updateProfile(
    updates: {
      name?: string;
      gender?: Gender | null;
      dob?: string | null;
      photo?: string | null;
      location?: { lat: number; lng: number } | null;
      notificationPrefs?: Partial<NotificationPrefs>;
      theme?: ThemeMode;
      language?: string;
    },
    onProgress?: (pct: number) => void
  ) {
    const res = await requestWithProgress<{ user: User }>(
      this.http.patch<{ user: User }>(`${API_URL}/auth/me`, updates, { reportProgress: true, observe: 'events' }),
      onProgress
    );
    this.currentUserSig.set(res.user);
    return res.user;
  }

  requestPhoneChangeOtp(phone: string) {
    return firstValueFrom(this.http.post<OtpRequestResponse>(`${API_URL}/auth/me/phone/request-otp`, { phone }));
  }

  async verifyPhoneChangeOtp(phone: string, code: string) {
    const res = await firstValueFrom(
      this.http.post<{ user: User }>(`${API_URL}/auth/me/phone/verify-otp`, { phone, code })
    );
    this.currentUserSig.set(res.user);
    return res.user;
  }

  requestEmailChangeOtp(email: string) {
    return firstValueFrom(this.http.post<OtpRequestResponse>(`${API_URL}/auth/me/email/request-otp`, { email }));
  }

  async verifyEmailChangeOtp(email: string, code: string) {
    const res = await firstValueFrom(
      this.http.post<{ user: User }>(`${API_URL}/auth/me/email/verify-otp`, { email, code })
    );
    this.currentUserSig.set(res.user);
    return res.user;
  }

  async toggleFavorite(restaurantId: string) {
    const res = await firstValueFrom(
      this.http.post<{ user: User }>(`${API_URL}/auth/me/favorites/${restaurantId}`, {})
    );
    this.currentUserSig.set(res.user);
    return res.user;
  }

  isFavorite(restaurantId: string): boolean {
    return this.currentUserSig()?.favoriteRestaurants.includes(restaurantId) ?? false;
  }

  async getFavorites(): Promise<Restaurant[]> {
    const res = await firstValueFrom(this.http.get<{ restaurants: Restaurant[] }>(`${API_URL}/auth/me/favorites`));
    return res.restaurants;
  }

  async logout() {
    clearStoredToken(TOKEN_KEY);
    this.currentUserSig.set(null);
    try {
      await firstValueFrom(this.http.post(`${API_URL}/auth/logout`, {}));
    } catch {
      // best effort
    }
  }

  async addAddress(address: Address) {
    const res = await firstValueFrom(this.http.post<{ user: User }>(`${API_URL}/auth/me/addresses`, address));
    this.currentUserSig.set(res.user);
    return res.user;
  }

  async removeAddress(addressId: string) {
    const res = await firstValueFrom(this.http.delete<{ user: User }>(`${API_URL}/auth/me/addresses/${addressId}`));
    this.currentUserSig.set(res.user);
    return res.user;
  }

  async updateAddress(addressId: string, address: Address) {
    const res = await firstValueFrom(this.http.patch<{ user: User }>(`${API_URL}/auth/me/addresses/${addressId}`, address));
    this.currentUserSig.set(res.user);
    return res.user;
  }

  async setDefaultAddress(addressId: string) {
    const res = await firstValueFrom(this.http.patch<{ user: User }>(`${API_URL}/auth/me/addresses/${addressId}/default`, {}));
    this.currentUserSig.set(res.user);
    return res.user;
  }

  async addSavedCard(card: { label: string; brand: string; last4: string; expiryMonth: number; expiryYear: number }) {
    const res = await firstValueFrom(this.http.post<{ user: User }>(`${API_URL}/auth/me/cards`, card));
    this.currentUserSig.set(res.user);
    return res.user;
  }

  async removeSavedCard(cardId: string) {
    const res = await firstValueFrom(this.http.delete<{ user: User }>(`${API_URL}/auth/me/cards/${cardId}`));
    this.currentUserSig.set(res.user);
    return res.user;
  }

  async addSavedUpi(upi: { label: string; upiId: string }) {
    const res = await firstValueFrom(this.http.post<{ user: User }>(`${API_URL}/auth/me/upi`, upi));
    this.currentUserSig.set(res.user);
    return res.user;
  }

  async removeSavedUpi(upiId: string) {
    const res = await firstValueFrom(this.http.delete<{ user: User }>(`${API_URL}/auth/me/upi/${upiId}`));
    this.currentUserSig.set(res.user);
    return res.user;
  }

  exportMyData() {
    return firstValueFrom(this.http.get<{ exportedAt: string; profile: User; orders: unknown[]; reviews: unknown[] }>(`${API_URL}/auth/me/export-data`));
  }

  async deleteAccount(confirmation: string) {
    const res = await firstValueFrom(this.http.post<{ message: string }>(`${API_URL}/auth/me/delete-account`, { confirmation }));
    clearStoredToken(TOKEN_KEY);
    this.currentUserSig.set(null);
    return res;
  }

  submitSupportRequest(subject: string, message: string) {
    return firstValueFrom(this.http.post<{ message: string }>(`${API_URL}/auth/me/support-request`, { subject, message }));
  }

  private persist(res: AuthResponse, remember: boolean) {
    setStoredToken(TOKEN_KEY, res.token, remember);
    this.currentUserSig.set(res.user);
  }
}
