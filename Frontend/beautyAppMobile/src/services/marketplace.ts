/**
 * Live-data REST endpoints not exposed through the BFF envelope.
 * Screens themselves are BFF-driven; search/favorite/reviews are direct
 * REST so paging and toggles don't go through the resolver. Matches the
 * Angular shell's split (BFF for screens, REST for in-screen data).
 */
import { api } from '@/services/api';

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

export async function searchServices(params: {
  q?: string;
  location?: string;
  offset?: number;
  limit?: number;
  includeFuture?: boolean;
}): Promise<SearchResponse> {
  const resp = await api.get<SearchResponse>('/api/beauty/services/search/', {
    params: {
      q: params.q || undefined,
      location: params.location || undefined,
      offset: params.offset ?? 0,
      limit: params.limit ?? 20,
      includeFuture: params.includeFuture ?? true,
    },
  });
  return resp.data;
}

export async function getServiceReviews(
  serviceId: number,
  offset = 0,
  limit = 20,
): Promise<ReviewsListResponse> {
  const resp = await api.get<ReviewsListResponse>(
    `/api/beauty/services/${serviceId}/reviews/`,
    { params: { offset, limit } },
  );
  return resp.data;
}

export async function favoriteService(serviceId: number): Promise<void> {
  await api.post(`/api/beauty/protected/services/${serviceId}/favorite/`);
}

export async function unfavoriteService(serviceId: number): Promise<void> {
  await api.delete(`/api/beauty/protected/services/${serviceId}/favorite/`);
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

export async function listFavorites(): Promise<FavoritesListResponse> {
  const resp = await api.get<FavoritesListResponse>(
    '/api/beauty/protected/favorites/',
  );
  return resp.data;
}

export interface SubmitReviewPayload {
  rating: number;
  body: string;
}

export async function submitServiceReview(
  serviceId: number,
  payload: SubmitReviewPayload,
): Promise<void> {
  await api.post(
    `/api/beauty/protected/services/${serviceId}/reviews/`,
    payload,
  );
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
