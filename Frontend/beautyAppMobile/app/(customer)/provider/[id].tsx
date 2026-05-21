/**
 * Provider detail — mirrors Angular `BeautyProviderDetailComponent`.
 *  - Sub-header (back only).
 *  - Hero cover (default brown gradient) + img tag + categories caps label + serif title.
 *  - Meta pills: rating / distance / open status.
 *  - Mono address line + description.
 *  - Services white card: rows w/ serif name, caps category, mono duration·price,
 *    desc, heart fav toggle, ink Book pill.
 *  - Reviews section: header + count, leave-review CTA, review cards
 *    (avatar, stars, service, date, body, owner reply, delete if owner),
 *    empty dashed card.
 *  - 4-tab bottom nav (default).
 *  - Loads via `resolve('beauty_provider_detail', { id })`.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { api } from '@/services/api';
import { BottomNav } from '@/components/BottomNav';

interface ProviderInfo {
  id: number;
  name: string;
  short_description: string;
  long_description: string;
  location_label: string;
  avg_rating: number | null;
  review_count: number;
  distance_label?: string;
  open_status?: string;
}

interface ProviderService {
  id: number;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  duration_minutes: number;
  is_favorited: boolean;
  _links?: { book?: BffLink | null };
}

interface ProviderReview {
  id: number;
  rating: number;
  body: string;
  business_reply: string | null;
  business_reply_at: string | null;
  created_at: string;
  is_owner: boolean;
  service_id: number;
  service_name: string;
  customer_initial: string;
}

interface ProviderDetailData {
  provider: ProviderInfo;
  services: ProviderService[];
  reviews: ProviderReview[];
  can_review: boolean;
  review_eligible_booking_id: number | null;
}

const C = {
  surface: '#F2F2F2',
  surface2: '#E9E9EB',
  line: '#DCDCDF',
  text: '#0F1115',
  textMuted: '#6B6F77',
  accentBlue: '#CFE3F5',
  accentBlueDeep: '#7DA8CF',
  accentBlueText: '#1a3a52',
  ink: '#0A0A0B',
  success: '#2F7A47',
  danger: '#C0392B',
  starFill: '#F5C36B',
  starEmpty: '#E5E5EA',
  white: '#FFFFFF',
};
const FONT_BODY = 'Inter_400Regular';
const FONT_BODY_SEMI = 'Inter_600SemiBold';
const FONT_DISPLAY = 'CormorantGaramond_500Medium';
const FONT_MONO = 'Menlo';

function heroSlug(name: string): string {
  return (name || 'provider').toLowerCase().replace(/\s+/g, '-');
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function categoriesLine(services: ProviderService[]): string {
  const seen = new Set<string>();
  for (const s of services) {
    const c = (s.category || '').trim();
    if (c) seen.add(c.charAt(0).toUpperCase() + c.slice(1).toLowerCase());
  }
  return [...seen].join(' · ');
}

export default function ProviderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const providerId = Number(id);

  const [env, setEnv] = useState<BffEnvelope<ProviderDetailData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);

  useEffect(() => {
    if (!Number.isFinite(providerId)) return;
    let cancelled = false;
    setError(null);
    setEnv(null);
    resolve<ProviderDetailData>('beauty_provider_detail', { id: providerId })
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(auth)/login') as any);
          return;
        }
        setEnv(e);
        if (e.action === 'render' && e.data) {
          setServices(e.data.services ?? []);
          setReviews(e.data.reviews ?? []);
        }
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  const data = env?.action === 'render' ? env.data : null;
  const provider = data?.provider;
  const links = (env?._links ?? {}) as Record<string, BffLink | undefined>;
  const canReview = !!data?.can_review;

  const toggleFav = async (s: ProviderService) => {
    const wasOn = !!s.is_favorited;
    setServices((arr) => arr.map((x) => (x.id === s.id ? { ...x, is_favorited: !wasOn } : x)));
    try {
      if (wasOn) await api.delete(`/api/beauty/protected/services/${s.id}/favorite/`);
      else await api.post(`/api/beauty/protected/services/${s.id}/favorite/`);
    } catch {
      setServices((arr) => arr.map((x) => (x.id === s.id ? { ...x, is_favorited: wasOn } : x)));
    }
  };

  const deleteReview = async (reviewId: number) => {
    try {
      await api.delete(`/api/beauty/protected/reviews/${reviewId}/`);
      setReviews((arr) => arr.filter((r) => r.id !== reviewId));
    } catch {
      // swallow
    }
  };

  if (error) {
    return (
      <View style={[styles.app, { padding: 16 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.danger, fontFamily: FONT_BODY }} testID="provider-error">{error}</Text>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={[styles.app, { alignItems: 'center', justifyContent: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.textMuted, fontFamily: FONT_BODY }}>Loading…</Text>
      </View>
    );
  }

  const reviewCount = provider.review_count ?? 0;
  const avgRating = provider.avg_rating == null ? '—' : provider.avg_rating.toFixed(1);

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.subHeader}>
        <Pressable
          onPress={() => (links.back ? navigateLink(router, links.back) : router.back())}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.hero}>
          <LinearGradient
            colors={['#5C4A3F', '#3D2F25']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
            locations={[0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTag}>
            <Text style={styles.heroTagText}>img · {heroSlug(provider.name)}</Text>
          </View>
          <View style={styles.heroOverlay}>
            {categoriesLine(services) ? (
              <Text style={styles.heroCategories}>{categoriesLine(services)}</Text>
            ) : null}
            <Text style={styles.heroTitle}>{provider.name}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="star" size={11} color={C.starFill} />
              {reviewCount > 0 ? (
                <Text style={styles.metaPillText}>
                  <Text testID="provider-avg-rating">{avgRating}</Text>
                  {' · '}
                  <Text testID="provider-review-count">{reviewCount} review{reviewCount === 1 ? '' : 's'}</Text>
                </Text>
              ) : (
                <Text style={styles.metaPillText} testID="provider-no-reviews">No reviews yet</Text>
              )}
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="location-outline" size={11} color={C.accentBlueDeep} />
              <Text style={styles.metaPillText}>{provider.distance_label || '0.4 mi away'}</Text>
            </View>
            <View style={styles.metaPill}>
              <View style={styles.statusDot} />
              <Text style={styles.metaPillText}>{provider.open_status || 'Open · closes 8 PM'}</Text>
            </View>
          </View>

          <Text style={styles.addressLine}>{provider.location_label}</Text>

          {provider.long_description ? (
            <Text style={styles.description}>{provider.long_description}</Text>
          ) : null}

          <View style={styles.servicesHead}>
            <Text style={styles.servicesTitle}>Services</Text>
            <Text style={styles.servicesCount}>{services.length} available</Text>
          </View>

          <View style={styles.serviceCard}>
            {services.length === 0 ? (
              <Text style={styles.serviceEmpty}>No services listed yet.</Text>
            ) : (
              services.map((s, idx) => {
                const last = idx === services.length - 1;
                return (
                  <View
                    key={s.id}
                    style={[styles.serviceRow, last && styles.serviceRowLast]}
                  >
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName} numberOfLines={1}>{s.name}</Text>
                      <Text style={styles.serviceCat}>{s.category}</Text>
                      <View style={styles.serviceMeta}>
                        <Text style={styles.serviceMetaText}>{s.duration_minutes} min</Text>
                        <Text style={styles.serviceMetaDot}>·</Text>
                        <Text style={styles.servicePrice}>${(s.price_cents / 100).toFixed(0)}</Text>
                      </View>
                      {s.description ? (
                        <Text style={styles.serviceDesc} numberOfLines={2}>{s.description}</Text>
                      ) : null}
                    </View>
                    <Pressable
                      style={[styles.favBtn, s.is_favorited && styles.favBtnActive]}
                      onPress={() => toggleFav(s)}
                      accessibilityLabel={s.is_favorited ? 'Unfavorite' : 'Favorite'}
                      testID="favorite-toggle"
                    >
                      <Ionicons
                        name={s.is_favorited ? 'heart' : 'heart-outline'}
                        size={18}
                        color={C.accentBlueDeep}
                      />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.btnBook,
                        !s._links?.book && styles.btnBookDisabled,
                        pressed && styles.btnBookPressed,
                      ]}
                      onPress={() => navigateLink(router, s._links?.book)}
                      disabled={!s._links?.book}
                    >
                      <Text style={styles.btnBookText}>Book</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.reviewsSection} testID="reviews-section">
            <View style={styles.servicesHead}>
              <Text style={styles.servicesTitle}>Reviews</Text>
              <Text style={styles.servicesCount} testID="reviews-count-pill">{reviewCount} total</Text>
            </View>

            {canReview ? (
              <Pressable
                onPress={() => links.write_review && navigateLink(router, links.write_review)}
                style={({ pressed }) => [styles.btnLeaveReview, pressed && styles.btnBookPressed]}
                testID="leave-review-btn"
              >
                <Text style={styles.btnLeaveReviewText}>Leave a review</Text>
              </Pressable>
            ) : null}

            {reviews.length === 0 ? (
              <View style={styles.reviewsEmpty} testID="reviews-empty">
                <Text style={styles.reviewsEmptyText}>No reviews yet. Be the first to leave one.</Text>
              </View>
            ) : (
              <View style={{ gap: 10, marginTop: 10 }}>
                {reviews.map((r) => (
                  <View key={r.id} style={styles.reviewCard} testID="review-card">
                    <View style={styles.reviewHead}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>{r.customer_initial}</Text>
                      </View>
                      <View style={styles.reviewStars} testID="review-stars">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Ionicons
                            key={i}
                            name="star"
                            size={13}
                            color={i <= r.rating ? C.starFill : C.starEmpty}
                          />
                        ))}
                      </View>
                      <Text style={styles.reviewService}>{r.service_name}</Text>
                      <Text style={styles.reviewWhen}>{formatDate(r.created_at)}</Text>
                    </View>
                    {r.body ? (
                      <Text style={styles.reviewBody} testID="review-body">{r.body}</Text>
                    ) : null}
                    {r.business_reply ? (
                      <View style={styles.reviewReply} testID="review-business-reply">
                        <Text style={styles.reviewReplyHead}>Owner reply</Text>
                        <Text style={styles.reviewReplyBody}>{r.business_reply}</Text>
                      </View>
                    ) : null}
                    {r.is_owner ? (
                      <View style={styles.reviewActions}>
                        <Pressable
                          style={styles.reviewActionDelete}
                          onPress={() => deleteReview(r.id)}
                          testID="review-delete-btn"
                        >
                          <Text style={styles.reviewActionDeleteText}>Delete my review</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <BottomNav active="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.surface },

  subHeader: {
    height: 56, paddingHorizontal: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.line,
    flexDirection: 'row', alignItems: 'center',
  },
  iconBtn: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconBtnPressed: { backgroundColor: C.surface2 },

  hero: { height: 168, position: 'relative', overflow: 'hidden' },
  heroTag: {
    position: 'absolute', right: 12, top: 12, zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4,
  },
  heroTagText: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontFamily: FONT_MONO },
  heroOverlay: { position: 'absolute', left: 16, right: 16, bottom: 14, zIndex: 2 },
  heroCategories: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10, fontFamily: FONT_BODY_SEMI,
    letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4,
  },
  heroTitle: {
    color: '#fff', fontSize: 28, fontFamily: FONT_DISPLAY,
    letterSpacing: 0.2, lineHeight: 31,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8,
  },

  body: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },

  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, backgroundColor: C.white,
    borderWidth: 1, borderColor: C.line,
  },
  metaPillText: { fontSize: 11, color: C.text, fontFamily: FONT_BODY_SEMI },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.success },

  addressLine: { fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted, marginBottom: 10 },
  description: { fontSize: 13, lineHeight: 20, color: C.text, opacity: 0.85, marginBottom: 18, fontFamily: FONT_BODY },

  servicesHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4 },
  servicesTitle: { fontFamily: FONT_DISPLAY, fontSize: 22, color: C.text, letterSpacing: 0.2 },
  servicesCount: { fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted },

  serviceCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 14, paddingHorizontal: 14, marginTop: 10, marginBottom: 16,
  },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  serviceRowLast: { borderBottomWidth: 0 },
  serviceInfo: { flex: 1, minWidth: 0 },
  serviceName: { fontFamily: FONT_DISPLAY, fontSize: 19, color: C.text, lineHeight: 24, letterSpacing: 0.2, marginBottom: 2 },
  serviceCat: { fontSize: 10, fontFamily: FONT_BODY_SEMI, color: C.accentBlueText, letterSpacing: 1.2, marginBottom: 4, textTransform: 'uppercase' },
  serviceMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  serviceMetaText: { fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted },
  serviceMetaDot: { fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted, opacity: 0.5, marginHorizontal: 6 },
  servicePrice: { fontFamily: FONT_BODY_SEMI, fontSize: 11, color: C.text },
  serviceDesc: { fontSize: 12, color: C.textMuted, lineHeight: 17, fontFamily: FONT_BODY },
  serviceEmpty: { paddingVertical: 18, color: C.textMuted, fontSize: 13, fontFamily: FONT_BODY },

  favBtn: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1, borderColor: C.line, backgroundColor: 'transparent',
    alignItems: 'center', justifyContent: 'center', marginRight: 6,
  },
  favBtnActive: { borderColor: C.accentBlueDeep, backgroundColor: 'rgba(125,168,207,0.08)' },

  btnBook: {
    height: 38, paddingHorizontal: 18, borderRadius: 10,
    backgroundColor: C.ink, borderWidth: 1, borderColor: C.ink,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  btnBookPressed: { backgroundColor: '#1F1F22', borderColor: '#1F1F22' },
  btnBookDisabled: { opacity: 0.5 },
  btnBookText: { color: '#fff', fontSize: 12, fontFamily: FONT_BODY_SEMI, letterSpacing: 0.2 },

  reviewsSection: { marginTop: 18, marginBottom: 24 },
  btnLeaveReview: {
    alignSelf: 'flex-start',
    height: 38, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: C.ink, borderWidth: 1, borderColor: C.ink,
    alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  btnLeaveReviewText: { color: '#fff', fontSize: 12, fontFamily: FONT_BODY_SEMI, letterSpacing: 0.2 },

  reviewsEmpty: {
    marginTop: 10, padding: 16,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 12,
    borderStyle: 'dashed', alignItems: 'center',
  },
  reviewsEmptyText: { color: C.textMuted, fontSize: 13, fontFamily: FONT_BODY, textAlign: 'center' },

  reviewCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 14,
    padding: 12, paddingHorizontal: 14,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  reviewAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.accentBlue,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { color: C.accentBlueText, fontSize: 12, fontFamily: FONT_BODY_SEMI },
  reviewStars: { flexDirection: 'row', gap: 1, alignItems: 'center' },
  reviewService: { fontFamily: FONT_MONO, fontSize: 10, color: C.textMuted, letterSpacing: 1.1, textTransform: 'uppercase' },
  reviewWhen: { marginLeft: 'auto', fontFamily: FONT_MONO, fontSize: 10, color: C.textMuted },
  reviewBody: { marginTop: 4, fontSize: 13, lineHeight: 20, color: C.text, fontFamily: FONT_BODY },
  reviewReply: {
    marginTop: 10, padding: 10, paddingHorizontal: 12,
    backgroundColor: C.surface2, borderRadius: 10,
    borderLeftWidth: 3, borderLeftColor: C.accentBlueDeep,
  },
  reviewReplyHead: {
    fontSize: 10, fontFamily: FONT_BODY_SEMI, color: C.accentBlueText,
    letterSpacing: 1.1, marginBottom: 4, textTransform: 'uppercase',
  },
  reviewReplyBody: { fontSize: 12, color: C.text, lineHeight: 18, fontFamily: FONT_BODY },

  reviewActions: { marginTop: 8 },
  reviewActionDelete: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(192,57,43,0.4)',
    backgroundColor: 'transparent',
  },
  reviewActionDeleteText: { color: C.danger, fontSize: 11, fontFamily: FONT_BODY_SEMI },
});
