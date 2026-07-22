import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { Address, Gender, User } from '../models/user.model';
import { Restaurant } from '../models/restaurant.model';

const TOKEN_KEY = 'feastgo_token';

interface AuthResponse {
  token: string;
  user: User;
}

interface OtpRequestResponse {
  message: string;
  devOtp?: string;
}

type OtpVerifyResponse = AuthResponse | { newUser: true; phone: string };

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
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      this.initializedSig.set(true);
      return;
    }
    try {
      const res = await firstValueFrom(this.http.get<{ user: User }>(`${API_URL}/auth/me`));
      this.currentUserSig.set(res.user);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      this.initializedSig.set(true);
    }
  }

  requestOtp(phone: string) {
    return firstValueFrom(this.http.post<OtpRequestResponse>(`${API_URL}/auth/otp/request`, { phone }));
  }

  async verifyOtp(phone: string, code: string): Promise<{ newUser: true; phone: string } | { newUser: false; user: User }> {
    const res = await firstValueFrom(
      this.http.post<OtpVerifyResponse>(`${API_URL}/auth/otp/verify`, { phone, code })
    );
    if ('newUser' in res) return res;
    this.persist(res);
    return { newUser: false, user: res.user };
  }

  async completeProfile(phone: string, name: string, email?: string) {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${API_URL}/auth/complete-profile`, { phone, name, email })
    );
    this.persist(res);
    return res.user;
  }

  async updateProfile(updates: {
    name?: string;
    gender?: Gender | null;
    photo?: string | null;
    location?: { lat: number; lng: number } | null;
  }) {
    const res = await firstValueFrom(this.http.patch<{ user: User }>(`${API_URL}/auth/me`, updates));
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
    localStorage.removeItem(TOKEN_KEY);
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

  private persist(res: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.token);
    this.currentUserSig.set(res.user);
  }
}
