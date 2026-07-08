import type { Router } from 'expo-router';

import { api } from '@/services/api';
import type { BffLink } from '@/bff/types';

const SCREEN_TO_NATIVE_ROUTE: Record<string, string> = {
  beauty_home: '/(customer)/home',
  beauty_welcome: '/(auth)/login',
  beauty_login: '/(auth)/login',
  beauty_signup: '/(auth)/signup',
  beauty_business_login: '/(auth)/business-login',
  beauty_business_signup: '/(auth)/business-signup',
  beauty_business_home: '/business/home',
  beauty_search: '/(customer)/search',
  beauty_category: '/(customer)/category/[category]',
  // Legacy service-detail screen is retired — the calendar/time picker on the
  // book screen is the canonical "choose a service slot" page. Route any
  // lingering service-detail link straight to it.
  beauty_service_detail: '/(customer)/book/[serviceId]',
  beauty_book: '/(customer)/book/[serviceId]',
  beauty_provider_detail: '/(customer)/provider/[id]',
  beauty_bookings: '/(customer)/bookings',
  beauty_booking_detail: '/(customer)/bookings/[id]',
  beauty_booking_success: '/(customer)/bookings/[id]/success',
  beauty_reschedule: '/(customer)/bookings/[id]/reschedule',
  beauty_chats: '/chats',
  beauty_chat_thread: '/chats/[bookingId]',
  beauty_favorites: '/(customer)/favorites',
  beauty_review_write: '/(customer)/bookings/[id]/review',
  beauty_forgot: '/(auth)/forgot',
  beauty_business_application_entity: '/business/apply/entity',
  beauty_business_application_services: '/business/apply/services',
  beauty_business_application_stripe: '/business/apply/stripe',
  beauty_business_application_schedule: '/business/apply/schedule',
  beauty_business_application_tools: '/business/apply/tools',
  beauty_business_application_review: '/business/apply/review',
  // Phase 4e — business management portal
  beauty_business_services: '/business/services',
  beauty_business_service_form: '/business/services/[id]', // single file; id='new' = create, id=<number> = edit
  beauty_business_availability: '/business/availability',
  beauty_business_bookings: '/business/bookings',
  beauty_business_profile: '/business/profile',
  beauty_business_reviews: '/business/reviews',
  beauty_business_settings: '/business/settings',
  beauty_business_change_password: '/business/settings/password',
  beauty_business_email_contact: '/business/settings/contact',
  // Phase 4f — admin portal
  beauty_admin_portal_signin: '/admin/portal/signin',
  beauty_admin_portal_2fa: '/admin/portal/2fa',
  beauty_admin_portal_magic: '/admin/portal/magic',
  beauty_admin_portal_ip_warning: '/admin/portal/ip-warning',
  beauty_admin_portal_dashboard: '/admin/portal/dashboard',
  beauty_admin_portal_dashboard_v2: '/admin/portal/dashboard/v2',
  beauty_admin_portal_crm: '/admin/portal/crm',
  beauty_admin_portal_tag_manager: '/admin/portal/crm/tags',
  beauty_admin_portal_suspend: '/admin/portal/crm/suspend/[type]/[id]',
  beauty_admin_portal_customer_detail: '/admin/portal/crm/customer/[id]',
  beauty_admin_portal_provider_detail: '/admin/portal/crm/provider/[id]',
  beauty_admin_portal_bookings: '/admin/portal/bookings',
  beauty_admin_portal_booking_detail: '/admin/portal/bookings/[id]',
  beauty_admin_portal_tickets: '/admin/portal/tickets',
  beauty_admin_portal_team: '/admin/portal/team',
  beauty_admin_portal_audit: '/admin/portal/audit',
};

export function nativeRouteFor(screen: string | null | undefined): string | null {
  if (!screen) return null;
  return SCREEN_TO_NATIVE_ROUTE[screen] ?? null;
}

export interface DispatchResult {
  ok: boolean;
  data?: unknown;
  status?: number;
  error?: unknown;
}

export async function dispatchLink(link: BffLink, body?: unknown): Promise<DispatchResult> {
  if (link.method === 'NAV' || !link.href) {
    return { ok: true };
  }
  try {
    const resp = await api.request({
      url: link.href,
      method: link.method,
      data: body,
    });
    return { ok: true, data: resp.data, status: resp.status };
  } catch (err: any) {
    return { ok: false, error: err, status: err?.response?.status };
  }
}

export function navigateToScreen(router: Router, screen: string | null | undefined): void {
  const route = nativeRouteFor(screen);
  if (route) {
    router.replace(route as any);
  }
}

const SCREEN_PARAM_ALIAS: Record<string, Record<string, string>> = {
  beauty_category: { slug: 'category' },
  beauty_provider_detail: { id: 'id' },
  beauty_book: { id: 'serviceId', service_id: 'serviceId', serviceId: 'serviceId' },
  beauty_service_detail: { id: 'serviceId' },
  beauty_booking_detail: { id: 'id' },
  beauty_booking_success: { bookingId: 'id', id: 'id' },
  beauty_reschedule: { bookingId: 'id' },
  beauty_chat_thread: { bookingId: 'bookingId' },
  beauty_business_service_form: { serviceId: 'id' },
};

function mapParams(screen: string, params: Record<string, string | number> | null | undefined): Record<string, string> {
  if (!params) return {};
  const alias = SCREEN_PARAM_ALIAS[screen] ?? {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    const mapped = alias[k] ?? k;
    out[mapped] = String(v);
  }
  return out;
}

export function navigateLink(
  router: Router,
  link: BffLink | null | undefined,
  opts?: { replace?: boolean },
): void {
  if (!link || !link.screen) return;
  const route = nativeRouteFor(link.screen);
  if (!route) return;
  const params = mapParams(link.screen, link.params);
  const target = { pathname: route, params } as any;
  if (opts?.replace) router.replace(target);
  else router.push(target);
}
