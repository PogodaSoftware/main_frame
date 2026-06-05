/**
 * Marketplace shared types + pure formatters.
 * All data + mutations now flow through BFF resolvers / action-links
 * (search → `beauty_service_search`, reviews → `beauty_service_reviews`,
 * favorites → `beauty_favorites` + favorite/unfavorite action-links). This
 * module no longer talks to REST directly.
 */

export interface ProviderSummary {
  id: number;
  name: string;
  short_description: string;
  location_label: string;
}

export interface SearchServiceItem {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  duration_minutes: number;
  category: string;
  is_future: boolean;
  service_locations: string[];
  distance_km: number | null;
  is_favorited: boolean;
  provider: ProviderSummary;
}

export interface SearchResponse {
  items: SearchServiceItem[];
  next_offset: number | null;
  has_more: boolean;
  query: {
    q: string;
    location: string;
    offset: number;
    limit: number;
    includeFuture: boolean;
  };
}

export interface Review {
  id: number;
  rating: number;
  body: string;
  business_reply: string | null;
  business_reply_at: string | null;
  created_at: string;
  updated_at: string;
  is_owner: boolean;
  service: { id: number; name: string; provider_id: number | null };
  customer: { id: number; initial: string };
}

export interface ReviewsListResponse {
  items: Review[];
  has_more: boolean;
  next_offset: number | null;
  aggregate: { avg_rating: number | null; count: number };
}

export interface FavoriteRow {
  id: number;
  created_at: string;
  service: {
    id: number;
    name: string;
    description: string;
    category: string;
    price_cents: number;
    duration_minutes: number;
  };
  provider: {
    id: number;
    name: string;
    short_description: string;
    location_label: string;
  };
}

export interface FavoritesListResponse {
  items: FavoriteRow[];
  count: number;
}

export interface SubmitReviewPayload {
  rating: number;
  body: string;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
