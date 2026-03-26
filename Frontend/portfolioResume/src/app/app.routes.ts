/**
 * Application Route Configuration
 *
 * Defines all URL routes for the Angular application. The app serves
 * two independent portfolio sections:
 *
 * 1. Kevin Ortiz Portfolio (/kevin/*):
 *    - Home, About, Experience, Projects, Contact, Blender Projects
 *    - Showcases QA & DevOps engineering skills with 3D model viewer
 *
 * 2. Pogoda Software (/pogoda/*):
 *    - Home, Experience
 *    - Professional experience loaded dynamically from PostgreSQL via REST API
 *
 * The root path '/' redirects to '/kevin' by default.
 */

import { Routes } from '@angular/router';
import { KevinHomeComponent } from './Kevin-Pages/home/home.component';
import { KevinAboutComponent } from './Kevin-Pages/about/about.component';
import { KevinExperienceComponent } from './Kevin-Pages/experience/experience.component';
import { PogodaHomeComponent } from './Pogoda-Software-Pages/home/home.component';
import { PogodaExperienceComponent } from './Pogoda-Software-Pages/experience/experience.component';
import { KevinProjectsComponent } from './Kevin-Pages/projects/projects.component';
import { KevinContactComponent } from './Kevin-Pages/contact/contact.component';
import { KevinBlenderFilesComponent } from './Kevin-Pages/blenderfiles/blenderfiles.component';


export const routes: Routes = [
  /** Root path redirects to Kevin's portfolio home page. */
  {
    path: '',
    redirectTo: 'kevin',
    pathMatch: 'full',
  },

  /** Kevin Ortiz Portfolio Routes */
  {
    path: 'kevin',
    component: KevinHomeComponent,
    title: 'Kevin Home Page',
  },
  {
    path: 'kevin/about',
    component: KevinAboutComponent,
    title: 'Kevin About Page',
  },
  {
    path: 'kevin/experience',
    component: KevinExperienceComponent,
    title: 'Kevin Experience Page',
  },
  {
    path: 'kevin/projects',
    component: KevinProjectsComponent,
    title: 'Kevin Projects Page',
  },
  {
    path: 'kevin/contacts',
    component: KevinContactComponent,
    title: 'Kevin Contact Page',
  },
  {
    path: 'kevin/blender-projects',
    component: KevinBlenderFilesComponent,
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
];
