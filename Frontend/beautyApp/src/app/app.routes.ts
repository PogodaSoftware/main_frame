import { Routes } from '@angular/router';
import { BeautyShellComponent } from './beauty/beauty-shell.component';
import { BeautyWelcomeComponent } from './beauty/beauty-welcome.component';
import { BeautyForgotComponent } from './beauty/beauty-forgot.component';
import { BeautyErrorComponent } from './beauty/beauty-error.component';
import { beautyAuthGuard, beautyBusinessAuthGuard } from './beauty/beauty-auth.guard';

export const routes: Routes = [
  {
    path: 'pogoda/beauty',
    component: BeautyShellComponent,
    title: 'Beauty - Home',
    canActivate: [beautyAuthGuard],
    data: { screen: 'beauty_home' },
  },
  {
    path: 'pogoda/beauty/welcome',
    component: BeautyWelcomeComponent,
    title: 'Beauty - Welcome',
  },
  {
    path: 'pogoda/beauty/forgot',
    component: BeautyForgotComponent,
    title: 'Beauty - Reset Password',
  },
  {
    path: 'pogoda/beauty/error',
    component: BeautyErrorComponent,
    title: 'Beauty - Error',
    data: { variant: 'generic' },
  },
  {
    path: 'pogoda/beauty/not-found',
    component: BeautyErrorComponent,
    title: 'Beauty - Page Not Found',
    data: { variant: 'notfound' },
  },
  {
    path: 'pogoda/beauty/offline',
    component: BeautyErrorComponent,
    title: 'Beauty - Offline',
    data: { variant: 'offline' },
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
  {
    path: 'pogoda/beauty/category/:slug',
    component: BeautyShellComponent,
    title: 'Beauty - Category',
    canActivate: [beautyAuthGuard],
    data: { screen: 'beauty_category' },
  },
  {
    path: 'pogoda/beauty/providers/:id',
    component: BeautyShellComponent,
    title: 'Beauty - Provider',
    canActivate: [beautyAuthGuard],
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
    path: 'pogoda/beauty/bookings/:bookingId/reschedule',
    component: BeautyShellComponent,
    title: 'Beauty - Reschedule Booking',
    canActivate: [beautyAuthGuard],
    data: { screen: 'beauty_reschedule' },
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
  {
    path: '**',
    component: BeautyErrorComponent,
    title: 'Page Not Found',
    data: { variant: 'notfound' },
  },
];
