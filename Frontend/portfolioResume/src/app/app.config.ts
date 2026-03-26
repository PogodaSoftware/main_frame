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
 */

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch())
  ]
};
