/**
 * BeautyAuthService
 * -----------------
 * Manages authentication state for the Beauty app.
 *
 * Device ID strategy:
 *   A lightweight fingerprint is generated from stable browser signals
 *   (user-agent, language, timezone, screen dimensions) and stored in
 *   localStorage so it remains consistent across browser sessions on the
 *   same device. It is sent as the X-Device-ID header on every API call
 *   and is embedded in the signed HttpOnly cookie by the backend.
 *
 * Auth state detection:
 *   Because the auth cookie is HttpOnly the frontend cannot read it
 *   directly. Instead we call GET /api/beauty/me/ which the backend
 *   validates (middleware checks cookie + device ID) and returns the
 *   current user or 401.
 */

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const DEVICE_ID_KEY = 'beauty_device_id';

@Injectable({ providedIn: 'root' })
export class BeautyAuthService {
  private readonly apiBase = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  getDeviceId(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return 'ssr-device';
    }

    let stored = localStorage.getItem(DEVICE_ID_KEY);
    if (!stored) {
      stored = this._generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, stored);
    }
    return stored;
  }

  private _generateDeviceId(): string {
    const raw = [
      navigator.userAgent,
      navigator.language,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      String(screen.width),
      String(screen.height),
      String(screen.colorDepth),
    ].join('|');

    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const chr = raw.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }

    const randomSuffix = Math.random().toString(36).slice(2, 10);
    return `dev_${Math.abs(hash).toString(16)}_${randomSuffix}`;
  }

  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-Device-ID': this.getDeviceId() });
  }

  login(email: string, password: string): Observable<{ email: string }> {
    return this.http.post<{ email: string }>(
      `${this.apiBase}/api/beauty/login/`,
      { email, password, device_id: this.getDeviceId() },
      { withCredentials: true },
    );
  }

  businessLogin(
    email: string,
    password: string,
  ): Observable<{ email: string; business_name: string }> {
    return this.http.post<{ email: string; business_name: string }>(
      `${this.apiBase}/api/beauty/business/login/`,
      { email, password, device_id: this.getDeviceId() },
      { withCredentials: true },
    );
  }

  logout(): Observable<unknown> {
    return this.http.post(
      `${this.apiBase}/api/beauty/logout/`,
      {},
      { withCredentials: true, headers: this.getAuthHeaders() },
    );
  }

  businessLogout(): Observable<unknown> {
    return this.http.post(
      `${this.apiBase}/api/beauty/business/logout/`,
      {},
      { withCredentials: true, headers: this.getAuthHeaders() },
    );
  }

  isAuthenticated(): Observable<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(false);
    }
    return this.http
      .get(`${this.apiBase}/api/beauty/protected/me/`, {
        withCredentials: true,
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );
  }
}
