import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { DeliveryAccount } from '../models/role-account.model';

const TOKEN_KEY = 'feastgo_delivery_token';

interface DeliveryAuthResponse {
  token: string;
  user: DeliveryAccount;
}

@Injectable({ providedIn: 'root' })
export class DeliveryAuthService {
  private readonly currentUserSig = signal<DeliveryAccount | null>(null);
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
      const res = await firstValueFrom(this.http.get<{ user: DeliveryAccount }>(`${API_URL}/delivery/auth/me`));
      this.currentUserSig.set(res.user);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      this.initializedSig.set(true);
    }
  }

  async signup(payload: { name: string; email: string; phone: string; password: string; vehicleType: string }) {
    const res = await firstValueFrom(this.http.post<DeliveryAuthResponse>(`${API_URL}/delivery/auth/signup`, payload));
    this.persist(res);
    return res.user;
  }

  async login(email: string, password: string) {
    const res = await firstValueFrom(
      this.http.post<DeliveryAuthResponse>(`${API_URL}/delivery/auth/login`, { email, password })
    );
    this.persist(res);
    return res.user;
  }

  async logout() {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUserSig.set(null);
    try {
      await firstValueFrom(this.http.post(`${API_URL}/delivery/auth/logout`, {}));
    } catch {
      // best effort
    }
  }

  // Re-fetches the current account from the server so status changes an admin
  // makes elsewhere (approve/reject/suspend) show up without a manual reload.
  async refreshMe() {
    try {
      const res = await firstValueFrom(this.http.get<{ user: DeliveryAccount }>(`${API_URL}/delivery/auth/me`));
      this.currentUserSig.set(res.user);
      return res.user;
    } catch {
      return this.currentUserSig();
    }
  }

  async setOnline(isOnline: boolean) {
    const res = await firstValueFrom(
      this.http.patch<{ user: DeliveryAccount }>(`${API_URL}/delivery/auth/online`, { isOnline })
    );
    this.currentUserSig.set(res.user);
    return res.user;
  }

  private persist(res: DeliveryAuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.token);
    this.currentUserSig.set(res.user);
  }
}
