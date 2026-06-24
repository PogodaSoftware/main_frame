/**
 * BeautySearchService
 * -------------------
 * Shared search data-layer for the standalone search page and the
 * home-page search bar. Both fetch services through the BFF
 * `beauty_service_search` resolver and toggle favorites through the
 * per-item HATEOAS `favorite`/`unfavorite` links — no direct REST.
 *
 * Extracted to kill the duplicated fetch / favorite / location logic
 * that previously lived in both components.
 */

import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { BeautyAuthService } from './beauty-auth.service';
import { BeautyBffService } from './beauty-bff.service';
import { BffLink } from './beauty-bff.types';

export interface SearchItem {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  duration_minutes: number;
  category: string;
  is_future: boolean;
  service_locations: string[];
  distance_km?: number | null;
  is_favorited?: boolean;
  provider: { id: number; name: string; short_description: string; location_label: string };
  _links?: Record<string, BffLink>;
}

export interface SearchPage {
  items: SearchItem[];
  next_offset: number | null;
  has_more: boolean;
}

const LOCATION_KEY = 'beauty_customer_city';

@Injectable({ providedIn: 'root' })
export class BeautySearchService {
  constructor(
    private bff: BeautyBffService,
    private auth: BeautyAuthService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  /** Stored customer city, used to order results by proximity. */
  readProfileLocation(): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    try {
      const raw = localStorage.getItem(LOCATION_KEY);
      if (raw && raw.trim()) return raw.trim();
    } catch { /* localStorage may be locked */ }
    return '';
  }

  setProfileLocation(city: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.setItem(LOCATION_KEY, city); } catch { /* locked */ }
  }

  /** One page of results via the BFF resolver. Errors propagate to the caller. */
  search(q: string, location: string, offset: number, limit: number): Observable<SearchPage> {
    const params: Record<string, string | number> = { offset, limit };
    if (q) params['q'] = q;
    if (location) params['location'] = location;
    return this.bff.resolve('beauty_service_search', params).pipe(
      map((env) => {
        const d = (env?.data || {}) as Partial<SearchPage>;
        return {
          items: d.items || [],
          next_offset: d.next_offset ?? null,
          has_more: !!d.has_more,
        };
      }),
    );
  }

  /** Follow the item's favorite/unfavorite HATEOAS link. No link → no-op. */
  toggleFavorite(item: SearchItem, wasOn: boolean): Observable<unknown> {
    const link = item._links?.[wasOn ? 'unfavorite' : 'favorite'];
    return link ? this.auth.follow(link) : of(null);
  }
}
