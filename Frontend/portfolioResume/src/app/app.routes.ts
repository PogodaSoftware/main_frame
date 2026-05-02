/**
 * Application Route Configuration
 *
 * Kevin Ortiz Portfolio (/kevin/*) and Pogoda Software (/pogoda/*) routes.
 *
 * Beauty App (/pogoda/beauty/*) routes have been separated into their own
 * standalone Angular project at Frontend/beautyApp. The portfolio nginx
 * proxies all /pogoda/beauty/* requests to the beauty_frontend container.
 */

import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { KevinHomeComponent } from './Kevin-Pages/home/home.component';
import { PogodaHomeComponent } from './Pogoda-Software-Pages/home/home.component';
import { PogodaExperienceComponent } from './Pogoda-Software-Pages/experience/experience.component';
import { KevinProjectsComponent } from './Kevin-Pages/projects/projects.component';
import { KevinBlenderFilesComponent } from './Kevin-Pages/blenderfiles/blenderfiles.component';

@Component({
  standalone: true,
  template: `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;color:#333;">
      <h1 style="font-size:2rem;margin-bottom:0.5rem;">404 — Page Not Found</h1>
      <p style="color:#666;">The page you're looking for doesn't exist.</p>
      <a href="/kevin/" style="margin-top:1.5rem;color:#1a3a52;font-weight:600;">Go home</a>
    </div>
  `,
})
class NotFoundComponent {}

export const routes: Routes = [
  /** Kevin Ortiz Portfolio Routes (relative to base href /kevin/) */
  {
    path: '',
    component: KevinHomeComponent,
    title: 'Kevin Home Page',
  },
  {
    path: 'projects',
    component: KevinProjectsComponent,
    title: 'Kevin Projects Page',
  },
  {
    path: 'blender-projects',
    component: KevinBlenderFilesComponent,
    title: 'Kevin 3D Viewer',
  },

  /** Pogoda Software Routes */
  {
    path: 'pogoda',
    component: PogodaHomeComponent,
    title: 'Pogoda Software - Home',
  },
  {
    path: 'pogoda/experience',
    component: PogodaExperienceComponent,
    title: 'Pogoda Software - Experience',
  },

  /** Global 404 — covers any unmatched route in the portfolio app. */
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Page Not Found',
  },
];
