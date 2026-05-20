/**
 * Business-side REST shim.
 *
 * Reviews are not yet backed by a BFF resolver, so we talk directly to
 * the REST API. All endpoints are protected (cookie auth required).
 */
import { api } from '@/services/api';

export interface BusinessReview {
  id: number;
  rating: number;
  body: string;
  created_at: string;
  customer_email: string;
  service_name: string;
  reply?: string | null;
  reply_at?: string | null;
}

export interface BusinessReviewsResponse {
  reviews: BusinessReview[];
  total: number;
}

export async function listBusinessReviews(): Promise<BusinessReviewsResponse> {
  const resp = await api.get<BusinessReviewsResponse>(
    '/api/beauty/protected/business/reviews/',
  );
  return resp.data;
}

export async function replyToReview(reviewId: number, body: string): Promise<void> {
  await api.post(`/api/beauty/protected/business/reviews/${reviewId}/reply/`, { body });
}
