/**
 * Customer review-write — mirrors Angular `BeautyReviewWriteComponent`.
 *  - Sub-header: back arrow + "Leave a review" serif title.
 *  - Service card: serif name + caps blue provider.
 *  - Form card: YOUR RATING (5 stars), COMMENT (textarea, "Share your experience..."),
 *    right-aligned small ink "Post review" pill (disabled until rating).
 *  - POST /api/beauty/protected/services/<id>/reviews/.
 *  - 409 → already reviewed, 403 → not yet completed, else generic error.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { listMyBookings, type MyBooking } from '@/services/bookings';
import { submitServiceReview } from '@/services/marketplace';

const C = {
  surface: '#F2F2F2',
  surface2: '#E9E9EB',
  line: '#DCDCDF',
  text: '#0F1115',
  textMuted: '#6B6F77',
  accentBlueText: '#1a3a52',
  ink: '#0A0A0B',
  danger: '#C0392B',
  white: '#FFFFFF',
  starFill: '#F5C36B',
  starEmpty: '#CFCFD3',
};
const FONT_BODY = 'Inter_400Regular';
const FONT_BODY_SEMI = 'Inter_600SemiBold';
const FONT_DISPLAY = 'CormorantGaramond_500Medium';

export default function ReviewWriteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const [booking, setBooking] = useState<MyBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(bookingId)) { setLoading(false); return; }
    try {
      const resp = await listMyBookings();
      const all: MyBooking[] = [
        ...(resp.upcoming ?? []),
        ...(resp.past ?? []),
        ...((resp as any).bookings ?? []),
        ...((resp as any).items ?? []),
      ];
      const seen = new Set<number>();
      const dedup = all.filter((b) => {
        if (!b || seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });
      setBooking(dedup.find((b) => b.id === bookingId) ?? null);
    } catch { /* surface below */ }
    finally { setLoading(false); }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async () => {
    if (submitting || !booking?.service?.id || rating < 1 || rating > 5) return;
    setSubmitting(true); setError(null);
    try {
      await submitServiceReview(booking.service.id, { rating, body });
      const providerId = booking.provider?.id;
      if (providerId) {
        router.replace(`/(customer)/provider/${providerId}` as any);
      } else {
        router.replace('/(customer)/bookings' as any);
      }
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

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header onBack={() => router.back()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        <View style={styles.serviceCard} testID="rw-service-card">
          <Text style={styles.serviceName} testID="rw-service-name">{booking.service.name}</Text>
          {booking.provider?.name ? (
            <Text style={styles.providerName} testID="rw-provider-name">{booking.provider.name}</Text>
          ) : null}
        </View>

        <View style={styles.formCard} testID="rw-form-card">
          <Text style={styles.label}>Your rating</Text>
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
                  <Ionicons name="star" size={28} color={on ? C.starFill : C.starEmpty} />
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Comment</Text>
          <TextInput
            style={styles.textarea}
            value={body}
            onChangeText={setBody}
            placeholder="Share your experience…"
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={5}
            maxLength={4000}
            testID="rw-body"
          />

          {error ? (
            <Text style={styles.error} testID="rw-error">{error}</Text>
          ) : null}

          <View style={styles.submitRow}>
            <Pressable
              onPress={onSubmit}
              disabled={rating < 1 || submitting}
              style={({ pressed }) => [
                styles.btnSubmit,
                (rating < 1 || submitting) && styles.btnSubmitDisabled,
                pressed && rating >= 1 && !submitting && { backgroundColor: '#1F1F22', borderColor: '#1F1F22' },
              ]}
              testID="rw-submit"
            >
              <Text style={styles.btnSubmitText}>{submitting ? 'Posting…' : 'Post review'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
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
      <View style={{ width: 36 }} />
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

  serviceCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 14, padding: 14, gap: 4,
  },
  serviceName: { fontFamily: FONT_DISPLAY, fontSize: 20, color: C.text, letterSpacing: 0.2 },
  providerName: {
    fontSize: 11, fontFamily: FONT_BODY_SEMI, color: C.accentBlueText,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },

  formCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 14, padding: 14, gap: 8,
  },
  label: {
    fontSize: 11, fontFamily: FONT_BODY_SEMI, color: C.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
  },
  stars: { flexDirection: 'row', gap: 8 },

  textarea: {
    minHeight: 90, padding: 12, borderWidth: 1, borderColor: C.line,
    borderRadius: 8, backgroundColor: C.white,
    color: C.text, fontSize: 14, fontFamily: FONT_BODY,
    textAlignVertical: 'top',
  },

  error: { color: C.danger, fontSize: 13, fontFamily: FONT_BODY },

  submitRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  btnSubmit: {
    paddingHorizontal: 14, height: 38, borderRadius: 8,
    backgroundColor: C.ink, borderWidth: 1, borderColor: C.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSubmitDisabled: { backgroundColor: '#9A9AA0', borderColor: '#9A9AA0' },
  btnSubmitText: { color: C.white, fontSize: 12, fontFamily: FONT_BODY_SEMI, letterSpacing: 0.2 },
});
