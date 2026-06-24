/**
 * Customer review-write — mirrors the Claude-design "Leave a review · rating
 * + comment" artboard.
 *  - Sub-header: back arrow + centered "Leave a review" serif title.
 *  - Context card: brown square avatar, serif provider name, caps service,
 *    muted "Visited <date>".
 *  - Rating card: centered "YOUR RATING", 5 stars, dynamic Poor→Excellent
 *    label (placeholder "Tap a star to rate" until a star is picked).
 *  - Comment card: "YOUR COMMENT" + live N/280 counter, textarea.
 *  - Helper: "Reviews are public and shown on the provider's storefront…".
 *  - Sticky full-width "Post review" (disabled until a rating is picked).
 *  - POST /api/beauty/protected/services/<id>/reviews/ → "Review posted"
 *    confirmation. 409 → already reviewed, 403 → not yet completed.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { type MyBooking } from '@/services/bookings';
import { api } from '@/services/api';
import { resolve } from '@/services/bff';
import { isRedirect } from '@/bff/types';
import { PALETTE } from '@/theme/colors';
import { FONT_BODY, FONT_BODY_SEMI, FONT_DISPLAY } from '@/theme/fonts';

const C = {
  ...PALETTE,
  avatar: '#5C4A3F',
  starFill: '#F5C36B',
  starEmpty: '#CFCFD3',
};

const MAX_COMMENT = 280;
const RATING_LABELS = ['Tap a star to rate', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

function formatVisited(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReviewWriteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const [booking, setBooking] = useState<MyBooking | null>(null);
  const [submitHref, setSubmitHref] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(bookingId)) { setLoading(false); return; }
    try {
      // Single-booking lookup via the `beauty_booking_detail` BFF resolver.
      const e = await resolve<{ booking: {
        id: number; status: string; slot_at: string;
        service: { id: number; name: string };
        provider: { id: number; name: string };
      } }>('beauty_booking_detail', { id: bookingId });
      if (isRedirect(e)) { router.replace('/(auth)/login' as any); return; }
      if (e.action === 'render' && e.data?.booking) {
        const b = e.data.booking;
        setBooking({
          id: b.id,
          status: b.status,
          slot_at: b.slot_at,
          service: { id: b.service.id, name: b.service.name },
          provider: { id: b.provider.id, name: b.provider.name },
        });
        setSubmitHref((e._links as Record<string, { href?: string }> | undefined)?.submit_review?.href ?? null);
      }
    } catch { /* surface below */ }
    finally { setLoading(false); }
  }, [bookingId, router]);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async () => {
    if (submitting || !submitHref || rating < 1 || rating > 5) return;
    setSubmitting(true); setError(null);
    try {
      // HATEOAS submit_review action-link from beauty_booking_detail.
      await api.post(submitHref, { rating, body });
      // Land on the storefront's post-review state (green banner + pinned
      // "Your review") — the `business-reviewed` artboard.
      const providerId = booking?.provider?.id;
      if (providerId) router.replace(`/(customer)/provider/${providerId}?posted=1` as any);
      else router.replace('/(customer)/bookings' as any);
    } catch (e: any) {
      const status = e?.response?.status;
      setError(
        status === 409 ? 'You have already reviewed this service.'
          : status === 403 ? 'You can only review a service after the appointment has finished.'
          : 'Could not post review. Please try again.',
      );
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <View style={[styles.app, { alignItems: 'center', justifyContent: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.textMuted, fontFamily: FONT_BODY }}>Loading booking…</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.app}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header onBack={() => router.back()} />
        <View style={{ padding: 16 }}>
          <Text style={{ color: C.textMuted, fontFamily: FONT_BODY }} testID="rw-load-error">Could not load booking.</Text>
        </View>
      </View>
    );
  }

  const providerName = booking.provider?.name ?? 'Provider';
  const initial = (providerName.trim()[0] ?? 'P').toUpperCase();
  const visited = formatVisited(booking.slot_at);
  const canSubmit = rating >= 1 && !submitting;

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header onBack={() => router.back()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        <View style={styles.contextCard} testID="rw-service-card">
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.providerName} numberOfLines={1} testID="rw-provider-name">{providerName}</Text>
            <Text style={styles.serviceName} numberOfLines={1} testID="rw-service-name">{booking.service.name}</Text>
            {visited ? <Text style={styles.visited}>Visited {visited}</Text> : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.label, styles.labelCentered]}>Your rating</Text>
          <View style={styles.stars} accessibilityRole="radiogroup" testID="rw-stars">
            {[1, 2, 3, 4, 5].map((n) => {
              const on = n <= rating;
              return (
                <Pressable
                  key={n}
                  onPress={() => setRating(n)}
                  testID={`rw-star-${n}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  hitSlop={6}
                >
                  <Ionicons name={on ? 'star' : 'star-outline'} size={34} color={on ? C.starFill : C.starEmpty} />
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.ratingPill, rating > 0 && styles.ratingPillActive]}>
            <Text style={[styles.ratingPillText, rating > 0 && styles.ratingPillTextActive]} testID="rw-rating-label">
              {RATING_LABELS[rating]}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.commentHead}>
            <Text style={styles.label}>Your comment</Text>
            <Text style={styles.counter} testID="rw-counter">{body.length}/{MAX_COMMENT}</Text>
          </View>
          <TextInput
            style={styles.textarea}
            value={body}
            onChangeText={setBody}
            placeholder="What stood out about your visit? Was the studio clean, the staff friendly, the result worth it?"
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={5}
            maxLength={MAX_COMMENT}
            testID="rw-body"
          />
        </View>

        <Text style={styles.helper}>
          Reviews are public and shown on the provider&apos;s storefront. Keep it honest and respectful.
        </Text>

        {error ? <Text style={styles.error} testID="rw-error">{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.btnSubmit,
            !canSubmit && styles.btnSubmitDisabled,
            pressed && canSubmit && { backgroundColor: '#1F1F22', borderColor: '#1F1F22' },
          ]}
          testID="rw-submit"
        >
          <Text style={styles.btnSubmitText}>{submitting ? 'Posting…' : 'Post review'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.subHeader}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={20} color={C.text} />
      </Pressable>
      <Text style={styles.subHeaderTitle}>Leave a review</Text>
      <View style={{ width: 44 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.surface },

  subHeader: {
    height: 56, paddingHorizontal: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.line,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  iconBtn: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconBtnPressed: { backgroundColor: C.surface2 },
  subHeaderTitle: { flex: 1, textAlign: 'center', fontFamily: FONT_DISPLAY, fontSize: 18, color: C.text, letterSpacing: 0.2 },

  body: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 },

  contextCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 10, backgroundColor: C.avatar,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: C.white, fontSize: 18, fontFamily: FONT_DISPLAY },
  providerName: { fontFamily: FONT_DISPLAY, fontSize: 20, color: C.text, letterSpacing: 0.2 },
  serviceName: {
    fontSize: 11, fontFamily: FONT_BODY_SEMI, color: C.accentBlueText,
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 1,
  },
  visited: { fontSize: 12, color: C.textMuted, fontFamily: FONT_BODY, marginTop: 3 },

  card: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 14, padding: 14, gap: 8,
  },
  label: {
    fontSize: 11, fontFamily: FONT_BODY_SEMI, color: C.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  labelCentered: { textAlign: 'center' },

  stars: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },
  ratingPill: {
    alignSelf: 'center', marginTop: 6,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999,
    backgroundColor: C.surface2,
  },
  ratingPillActive: { backgroundColor: 'rgba(245,195,107,0.22)' },
  ratingPillText: { fontSize: 12, fontFamily: FONT_BODY_SEMI, color: C.textMuted, letterSpacing: 0.3 },
  ratingPillTextActive: { color: C.text },

  commentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { fontSize: 11, fontFamily: FONT_BODY_SEMI, color: C.textMuted },

  textarea: {
    minHeight: 110, padding: 12, borderWidth: 1, borderColor: C.line,
    borderRadius: 8, backgroundColor: C.white,
    color: C.text, fontSize: 14, fontFamily: FONT_BODY,
    textAlignVertical: 'top', lineHeight: 20,
  },

  helper: { fontSize: 12, color: C.textMuted, fontFamily: FONT_BODY, textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },
  error: { color: C.danger, fontSize: 13, fontFamily: FONT_BODY, textAlign: 'center' },

  footer: {
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line,
  },
  btnSubmit: {
    width: '100%', height: 50, borderRadius: 12,
    backgroundColor: C.ink, borderWidth: 1, borderColor: C.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSubmitDisabled: { backgroundColor: '#B8B8BE', borderColor: '#B8B8BE' },
  btnSubmitText: { color: C.white, fontSize: 14, fontFamily: FONT_BODY_SEMI, letterSpacing: 0.3 },
});
