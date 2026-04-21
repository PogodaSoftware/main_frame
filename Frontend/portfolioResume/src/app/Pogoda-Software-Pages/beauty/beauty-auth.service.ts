/**
 * BeautyAuthService
 * -----------------
 * Owns the device-fingerprint and exposes a generic `submit(link, body)`
 * helper that follows whatever submit/logout link the BFF provides.
 *
 * The service no longer hard-codes endpoint URLs (login, signup,
 * business-login, logout) — the BFF tells the shell where to POST via
 * link objects in the HATEOAS envelope. This is what allows endpoint
 * URLs and even auth flows to change without an Angular release.
 *
 * Device ID strategy:
 *   A lightweight fingerprint is generated from stable browser signals
 *   (user-agent, language, timezone, screen dimensions) and stored in
 *   localStorage so it remains consistent across browser sessions on the
 *   same device. It is sent as the X-Device-ID header on every API call
 *   and is embedded in the signed HttpOnly cookie by the backend.
 */

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BffLink } from './beauty-bff.types';

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

  /**
   * Generic link-follower. Posts/gets/deletes whatever the BFF told us
   * to. Adds device id to the body when `includeDeviceId` is true and to
   * the X-Device-ID header always.
   */
  follow<T = unknown>(
    link: BffLink,
    body: Record<string, unknown> = {},
    includeDeviceId = false,
  ): Observable<T> {
    if (!link?.href) {
      return of(null as unknown as T);
    }
    const url = link.href.startsWith('http') ? link.href : `${this.apiBase}${link.href}`;
    const headers = this.getAuthHeaders();
    const payload: Record<string, unknown> = includeDeviceId
      ? { ...body, device_id: this.getDeviceId() }
      : { ...body };

    const method = (link.method || 'POST').toUpperCase();
    switch (method) {
      case 'GET':
        return this.http.get<T>(url, { withCredentials: true, headers });
      case 'DELETE':
        return this.http.delete<T>(url, { withCredentials: true, headers });
      case 'PUT':
        return this.http.put<T>(url, payload, { withCredentials: true, headers });
      case 'PATCH':
        return this.http.patch<T>(url, payload, { withCredentials: true, headers });
      case 'POST':
      default:
        return this.http.post<T>(url, payload, { withCredentials: true, headers });
    }
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
