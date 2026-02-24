/**
 * Application Bootstrap Entry Point (Server-Side Rendering)
 *
 * Entry point for Angular's SSR (Server-Side Rendering) process.
 * Bootstraps the AppComponent with the merged server configuration,
 * which includes both the base app config and server-specific providers
 * (provideServerRendering). Accepts a BootstrapContext parameter required
 * by Angular 19.2.x's SSR API.
 */

import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

/**
 * SSR bootstrap function called by Angular's server rendering engine.
 *
 * @param context - The BootstrapContext provided by Angular's SSR framework,
 *                  containing request-specific data for server rendering.
 * @returns A promise that resolves to the bootstrapped application reference.
 */
const bootstrap = (context: BootstrapContext) => 
  bootstrapApplication(AppComponent, config, context);

export default bootstrap;
