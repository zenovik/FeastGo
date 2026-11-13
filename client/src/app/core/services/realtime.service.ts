import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config';
import { getStoredToken } from '../utils/token-storage';

export type NotifRole = 'customer' | 'seller' | 'delivery' | 'admin';

const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

const TOKEN_KEY_BY_ROLE: Record<NotifRole, string> = {
  customer: 'feastgo_token',
  seller: 'feastgo_seller_token',
  delivery: 'feastgo_delivery_token',
  admin: 'feastgo_admin_token',
};

// Thin wrapper around a single socket.io-client connection — only one role is
// ever active per browser tab (the app only ever renders one portal's shell
// at a time), so a single shared socket, reconnected whenever the active
// role/token changes, is all that's needed.
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private socket: Socket | null = null;
  private connectedRole: NotifRole | null = null;

  connect(role: NotifRole): Socket | null {
    // Seller/delivery/admin logins are session-scoped by design (sessionStorage,
    // no "remember me" choice) — a raw localStorage.getItem here would never
    // find their token and the socket would silently never connect, so this
    // must check both storages the same way every other token read in the
    // app does.
    const token = getStoredToken(TOKEN_KEY_BY_ROLE[role]);
    if (!token) return null;
    if (this.socket && this.connectedRole === role) return this.socket;

    this.disconnect();
    this.socket = io(SOCKET_URL, { auth: { token }, withCredentials: true, transports: ['websocket', 'polling'] });
    this.connectedRole = role;
    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connectedRole = null;
  }

  on<T = any>(event: string, handler: (payload: T) => void) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler?: (...args: any[]) => void) {
    this.socket?.off(event, handler);
  }
}
