/**
 * BeautyBffService
 * ----------------
 * The single communication channel between the Angular shell and the
 * Backend-for-Frontend middleware layer.
 *
 * On every navigation the shell calls resolve() with:
 *   - version:   client app version (server can instruct an update)
 *   - screen:    which screen the user is on
 *   - device_id: browser fingerprint (validated against the auth cookie)
 *
 * The BFF responds with a HATEOAS envelope ({_links, form, ...}) and a
 * render or redirect instruction. The shell renders exactly what the BFF
 * says — nothing is persisted locally between renders.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BeautyAuthService } from './beauty-auth.service';
import { BffResponse } from './beauty-bff.types';

const APP_VERSION = '2.0.0';

@Injectable({ providedIn: 'root' })
export class BeautyBffService {
  private readonly resolveUrl = `${environment.apiBaseUrl}/api/bff/beauty/resolve/`;

  constructor(
    private http: HttpClient,
    private authService: BeautyAuthService,
  ) {}

  resolve(
    screen: string,
    params: Record<string, string | number> | null = null,
  ): Observable<BffResponse> {
    return this.http.post<BffResponse>(
      this.resolveUrl,
      {
        version: APP_VERSION,
        screen,
        device_id: this.authService.getDeviceId(),
        params: params || {},
      },
      { withCredentials: true },
    );
  }
}

export type { BffResponse } from './beauty-bff.types';
