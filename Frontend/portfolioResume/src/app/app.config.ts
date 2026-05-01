/**
 * Application Configuration (Browser)
 *
 * Central configuration for the Angular browser application. Registers
 * all essential providers needed at the application level:
 *
 * - provideZoneChangeDetection: Enables Angular's change detection with
 *   event coalescing for improved performance.
 * - provideRouter: Configures the Angular router with application routes.
 * - provideClientHydration: Enables SSR hydration with event replay so
 *   the browser can pick up where server rendering left off.
 * - provideHttpClient: Registers the HttpClient service for making API
 *   calls (e.g., fetching Pogoda data from the Django backend). Uses
 *   the fetch API backend (withFetch) for SSR compatibility.
 * - provideStore + Beauty feature slices: NgRx root store + the booking
 *   flow + webhooks slices. The store does NOT replace the BFF — it
 *   caches what the BFF already returns to reduce flicker between
 *   /book → /success → /detail navigations.
 */

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
  ]
};
