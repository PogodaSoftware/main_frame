/**
 * Application Route Configuration
 *
 * Kevin Ortiz Portfolio (/kevin/*) and Pogoda Software (/pogoda/*) routes
 * are unchanged — each loads its own component directly.
 *
 * Beauty App (/pogoda/beauty/*) uses a SDUI shell pattern:
 *   - Every beauty route maps to BeautyShellComponent.
 *   - The shell sends the 'screen' name to the BFF middleware.
 *   - The BFF decides what to render and returns the data.
 *   - The shell renders the appropriate presentational component.
 *   - No data is stored in the frontend between renders.
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
import { BeautyShellComponent } from './Pogoda-Software-Pages/beauty/beauty-shell.component';
import { beautyAuthGuard, beautyBusinessAuthGuard } from './Pogoda-Software-Pages/beauty/beauty-auth.guard';


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

  /**
   * Beauty App Routes — SDUI Shell
   * Each route passes a `screen` name in route data.
   * BeautyShellComponent resolves the screen via the BFF middleware.
   */
  {
    path: 'pogoda/beauty',
    component: BeautyShellComponent,
    title: 'Beauty - Home',
    data: { screen: 'beauty_home' },
  },
  {
    path: 'pogoda/beauty/signup',
    component: BeautyShellComponent,
    title: 'Beauty - Sign Up',
    data: { screen: 'beauty_signup' },
  },
  {
    path: 'pogoda/beauty/login',
    component: BeautyShellComponent,
    title: 'Beauty - Sign In',
    data: { screen: 'beauty_login' },
  },
  {
    path: 'pogoda/beauty/business/login',
    component: BeautyShellComponent,
    title: 'Beauty - Business Sign In',
    data: { screen: 'beauty_business_login' },
  },
  {
    path: 'pogoda/beauty/wireframe',
    component: BeautyShellComponent,
    title: 'Beauty - Wireframe',
    data: { screen: 'beauty_wireframe' },
  },
  {
    path: 'pogoda/beauty/admin/flags',
    component: BeautyShellComponent,
    title: 'Beauty - Feature Flags',
    data: { screen: 'beauty_admin_flags' },
  },

  /** Customer marketplace screens (BFF-driven). */
  {
    path: 'pogoda/beauty/category/:slug',
    component: BeautyShellComponent,
    title: 'Beauty - Category',
    data: { screen: 'beauty_category' },
  },
  {
    path: 'pogoda/beauty/providers/:id',
    component: BeautyShellComponent,
    title: 'Beauty - Provider',
    data: { screen: 'beauty_provider_detail' },
  },
  {
    path: 'pogoda/beauty/book/:serviceId',
    component: BeautyShellComponent,
    title: 'Beauty - Book',
    canActivate: [beautyAuthGuard],
    data: { screen: 'beauty_book' },
  },
  {
    path: 'pogoda/beauty/bookings',
    component: BeautyShellComponent,
    title: 'Beauty - My Bookings',
    canActivate: [beautyAuthGuard],
    data: { screen: 'beauty_bookings' },
  },
  {
    path: 'pogoda/beauty/bookings/:bookingId/success',
    component: BeautyShellComponent,
    title: 'Beauty - Booking Confirmed',
    canActivate: [beautyAuthGuard],
    data: { screen: 'beauty_booking_success' },
  },
  {
    path: 'pogoda/beauty/bookings/:id',
    component: BeautyShellComponent,
    title: 'Beauty - Booking Details',
    canActivate: [beautyAuthGuard],
    data: { screen: 'beauty_booking_detail' },
  },
  {
    path: 'pogoda/beauty/profile',
    component: BeautyShellComponent,
    title: 'Beauty - Profile',
    canActivate: [beautyAuthGuard],
    data: { screen: 'beauty_profile' },
  },

  /** Business provider portal screens (BFF-driven, business auth required). */
  {
    path: 'pogoda/beauty/business',
    component: BeautyShellComponent,
    title: 'Beauty - Business Portal',
    canActivate: [beautyBusinessAuthGuard],
    data: { screen: 'beauty_business_home' },
  },
  {
    path: 'pogoda/beauty/business/services',
    component: BeautyShellComponent,
    title: 'Beauty - Manage Services',
    canActivate: [beautyBusinessAuthGuard],
    data: { screen: 'beauty_business_services' },
  },
  {
    path: 'pogoda/beauty/business/services/new',
    component: BeautyShellComponent,
    title: 'Beauty - Add Service',
    canActivate: [beautyBusinessAuthGuard],
    data: { screen: 'beauty_business_service_form' },
  },
  {
    path: 'pogoda/beauty/business/services/:serviceId/edit',
    component: BeautyShellComponent,
    title: 'Beauty - Edit Service',
    canActivate: [beautyBusinessAuthGuard],
    data: { screen: 'beauty_business_service_form' },
  },
  {
    path: 'pogoda/beauty/business/availability',
    component: BeautyShellComponent,
    title: 'Beauty - Weekly Hours',
    canActivate: [beautyBusinessAuthGuard],
    data: { screen: 'beauty_business_availability' },
  },
  {
    path: 'pogoda/beauty/business/bookings',
    component: BeautyShellComponent,
    title: 'Beauty - Incoming Bookings',
    canActivate: [beautyBusinessAuthGuard],
    data: { screen: 'beauty_business_bookings' },
  },
];
