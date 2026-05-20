/**
 * Customer review-write screen — RN port of Angular
 * `beauty-review-write.component.ts`. Direct REST: list bookings to find
 * the target by id, POST to /api/beauty/protected/services/<id>/reviews/.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { H2, ScrollView, SizableText, XStack, YStack } from 'tamagui';

import { beautyTokens } from '../../../../tamagui.config';
import {
  BeautyButton,
  BeautyCard,
  BeautyInput,
  EmptyState,
  LoadingScreen,
} from '@/components/ui';
import { listMyBookings, type MyBooking } from '@/services/bookings';
import { submitServiceReview } from '@/services/marketplace';

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
    if (!Number.isFinite(bookingId)) {
      setLoading(false);
      return;
    }
    try {
      const resp = await listMyBookings();
      const all: MyBooking[] = [
        ...(resp.upcoming ?? []),
        ...(resp.past ?? []),
        ...(resp.bookings ?? []),
        ...(resp.items ?? []),
      ];
      const seen = new Set<number>();
      const dedup = all.filter((b) => {
        if (!b || seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });
      setBooking(dedup.find((b) => b.id === bookingId) ?? null);
    } catch {
      // Surface in load-error state below.
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async () => {
    if (submitting) return;
    if (!booking?.service?.id) return;
    if (rating < 1 || rating > 5) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitServiceReview(booking.service.id, { rating, body });
      const providerId = booking.provider?.id;
      if (providerId) {
        router.replace({
          pathname: '/(customer)/provider/[id]',
          params: { id: String(providerId) },
        });
      } else {
        router.replace('/(customer)/bookings' as any);
      }
    } catch (e: any) {
      const status = e?.response?.status;
      setError(
        status === 409
          ? 'You have already reviewed this service.'
          : status === 403
            ? 'You can only review a service after the appointment has finished.'
            : 'Could not post review. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading booking…" />;
  }

  if (!booking) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Leave a review' }} />
        <YStack flex={1} bg={beautyTokens.surface}>
          <EmptyState
            testID="rw-load-error"
            message="Could not load booking."
          />
        </YStack>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Leave a review' }} />
      <ScrollView flex={1} bg={beautyTokens.surface}>
        <YStack p="$4" gap="$3">
          <H2 fontFamily="$heading">Leave a review</H2>

          <BeautyCard testID="rw-service-card" gap="$1">
            <SizableText
              fontFamily="$heading"
              fontSize={22}
              color={beautyTokens.text}
              testID="rw-service-name"
            >
              {booking.service.name}
            </SizableText>
            {booking.provider?.name ? (
              <SizableText
                fontSize={11}
                fontWeight="600"
                color={beautyTokens.accentBlueText}
                letterSpacing={1.2}
                textTransform="uppercase"
                testID="rw-provider-name"
              >
                {booking.provider.name}
              </SizableText>
            ) : null}
          </BeautyCard>

          <BeautyCard testID="rw-form-card" gap="$3">
            <YStack gap="$2">
              <SizableText
                fontSize={11}
                fontWeight="700"
                color={beautyTokens.textMuted}
                letterSpacing={1.2}
                textTransform="uppercase"
              >
                Your rating
              </SizableText>
              <XStack gap="$2" testID="rw-stars" accessibilityRole="radiogroup">
                {[1, 2, 3, 4, 5].map((n) => {
                  const on = n <= rating;
                  return (
                    <Pressable
                      key={n}
                      testID={`rw-star-${n}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      onPress={() => setRating(n)}
                      hitSlop={6}
                    >
                      <SizableText fontSize={28} color={on ? '#F5C36B' : '#CFCFD3'}>
                        ★
                      </SizableText>
                    </Pressable>
                  );
                })}
              </XStack>
            </YStack>

            <BeautyInput
              testID="rw-body"
              label="Comment"
              value={body}
              onChangeText={setBody}
              placeholder="Share your experience…"
              multiline
              rows={5}
              maxLength={4000}
            />

            {error ? (
              <SizableText color={beautyTokens.danger} fontSize={13} testID="rw-error">
                {error}
              </SizableText>
            ) : null}

            <BeautyButton
              testID="rw-submit"
              variant="neutral"
              size="md"
              fullWidth
              disabled={rating < 1}
              loading={submitting}
              onPress={onSubmit}
            >
              Post review
            </BeautyButton>
          </BeautyCard>
        </YStack>
      </ScrollView>
    </>
  );
}
