/**
 * Application Configuration (Server-Side Rendering)
 *
 * Extends the browser application config with server-specific providers.
 * Merges the base appConfig (routing, HttpClient, hydration) with
 * provideServerRendering() to enable Angular's SSR capabilities.
 *
 * This merged configuration is used by main.server.ts when rendering
 * pages on the server before sending them to the browser.
 */

import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';

/** Server-specific providers added on top of the browser config. */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
  ]
};

/** Merged configuration combining browser + server providers for SSR. */
export const config = mergeApplicationConfig(appConfig, serverConfig);
