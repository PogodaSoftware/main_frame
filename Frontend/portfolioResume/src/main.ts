/**
 * Application Bootstrap Entry Point (Browser)
 *
 * Entry point for the Angular application in the browser environment.
 * Bootstraps the root AppComponent using the application configuration
 * from app.config.ts, which includes routing, HTTP client, hydration,
 * and zone change detection providers.
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
