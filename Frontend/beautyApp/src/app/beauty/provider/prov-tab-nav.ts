import { BffLink } from '../beauty-bff.types';
import { ProviderTab } from './prov-tab-bar.component';

const TAB_TO_LINK: Record<ProviderTab, string> = {
  dashboard: 'business_home',
  bookings: 'bookings',
  services: 'services',
  messages: 'chats',
  profile: 'profile',
};

const TAB_TO_NAV: Record<ProviderTab, { screen: string; route: string }> = {
  dashboard: { screen: 'beauty_business_home', route: '/business' },
  bookings: { screen: 'beauty_business_bookings', route: '/business/bookings' },
  services: { screen: 'beauty_business_services', route: '/business/services' },
  messages: { screen: 'beauty_chats', route: '/chats' },
  profile: { screen: 'beauty_business_profile', route: '/business/profile' },
};

/**
 * Resolve a provider tab click to a BffLink. Prefers a HATEOAS link from the
 * current resolver; falls back to a synthetic NAV link so tabs always navigate
 * regardless of whether the active resolver shipped that link.
 */
export function resolveTabLink(
  tab: ProviderTab,
  links: Record<string, BffLink>,
  currentRel?: string,
): BffLink {
  const rel = TAB_TO_LINK[tab];
  if (rel === currentRel) {
    const self = links['self'];
    if (self) return self;
  }
  const ship = links[rel];
  if (ship) return ship;
  const nav = TAB_TO_NAV[tab];
  return {
    rel,
    href: null,
    method: 'NAV',
    screen: nav.screen,
    route: nav.route,
    prompt: null,
  };
}
