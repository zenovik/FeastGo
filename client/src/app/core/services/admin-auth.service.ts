import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { AdminAccount } from '../models/role-account.model';
import { clearStoredToken, getStoredToken, setStoredToken } from '../utils/token-storage';

const TOKEN_KEY = 'feastgo_admin_token';

interface AdminAuthResponse {
  token: string;
  user: AdminAccount;
}

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly currentUserSig = signal<AdminAccount | null>(null);
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
      const res = await firstValueFrom(this.http.get<{ user: AdminAccount }>(`${API_URL}/admin/auth/me`));
      this.currentUserSig.set(res.user);
    } catch {
      clearStoredToken(TOKEN_KEY);
    } finally {
      this.initializedSig.set(true);
    }
  }

  async login(email: string, password: string) {
    const res = await firstValueFrom(
      this.http.post<AdminAuthResponse>(`${API_URL}/admin/auth/login`, { email, password })
    );
    // Session-scoped (not "remembered") — admin has no remember-me choice, and
    // a shared localStorage entry would leak this login into every other tab,
    // silently swapping whichever admin account those tabs were showing the
    // next time their own session poll/refresh ran.
    setStoredToken(TOKEN_KEY, res.token, false);
    this.currentUserSig.set(res.user);
    return res.user;
  }

  async logout() {
    clearStoredToken(TOKEN_KEY);
    this.currentUserSig.set(null);
    try {
      await firstValueFrom(this.http.post(`${API_URL}/admin/auth/logout`, {}));
    } catch {
      // best effort
    }
  }
}
