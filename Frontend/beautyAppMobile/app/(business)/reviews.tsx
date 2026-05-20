import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import {
  H2,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { replyToReview, type BusinessReview } from '@/services/business';
import { BeautyShell } from '@/components/BeautyShell';
import { BusinessBottomNav } from '@/components/BusinessBottomNav';
import { BeautyButton, BeautyCard, BeautyInput, EmptyState, InfoStrip, LoadingScreen } from '@/components/ui';
import { beautyTokens } from '../../tamagui.config';

interface ReviewsData {
  storefront: { id: number; name: string };
  reviews: (BusinessReview & { _links?: { reply?: BffLink } })[];
  total: number;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <XStack gap={2}>
      {[1, 2, 3, 4, 5].map((n) => (
        <SizableText key={n} fontSize={14} color={n <= rating ? '#f59e0b' : beautyTokens.line}>
          ★
        </SizableText>
      ))}
    </XStack>
  );
}

export default function BusinessReviewsScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ReviewsData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [replyBusy, setReplyBusy] = useState<number | null>(null);
  const [replyError, setReplyError] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<ReviewsData>('beauty_business_reviews');
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        router.replace((route ?? '/(auth)/business-login') as any);
        return;
      }
      setEnv(e);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load reviews.');
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const onReply = async (review: BusinessReview & { _links?: { reply?: BffLink } }) => {
    const body = (replyText[review.id] ?? '').trim();
    if (!body) return;
    setReplyBusy(review.id);
    setReplyError((prev) => ({ ...prev, [review.id]: '' }));
    try {
      await replyToReview(review.id, body);
      await load();
      setReplyText((prev) => ({ ...prev, [review.id]: '' }));
    } catch (err: any) {
      setReplyError((prev) => ({
        ...prev,
        [review.id]: err?.response?.data?.detail ?? 'Failed to send reply.',
      }));
    } finally {
      setReplyBusy(null);
    }
  };

  const reviews = env?.action === 'render' ? (env.data?.reviews ?? []) : [];

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1}>
        <YStack
          height={52}
          justify="center"
          px="$4"
          bg={beautyTokens.surface}
          borderBottomWidth={1}
          borderBottomColor={beautyTokens.line}
        >
          <H2 fontFamily="$heading" fontSize={20} fontWeight="500" color={beautyTokens.text}>
            Customer Reviews
          </H2>
        </YStack>

        {!env && !error ? (
          <LoadingScreen />
        ) : error ? (
          <YStack flex={1} p="$4">
            <InfoStrip tone="danger">{error}</InfoStrip>
          </YStack>
        ) : (
          <ScrollView flex={1} bg={beautyTokens.surface2} keyboardShouldPersistTaps="handled">
            <YStack p="$4" gap="$3">
              {reviews.length === 0 ? (
                <EmptyState
                  icon={<SizableText fontSize={36}>⭐</SizableText>}
                  title="No reviews yet"
                  message="Reviews will appear here once customers leave them."
                />
              ) : null}

              {reviews.map((rv) => (
                <BeautyCard key={rv.id}>
                  <XStack justify="space-between" items="center">
                    <StarRow rating={rv.rating} />
                    <SizableText fontSize={11} color={beautyTokens.textMuted}>
                      {new Date(rv.created_at).toLocaleDateString()}
                    </SizableText>
                  </XStack>

                  <SizableText fontSize={13} color={beautyTokens.text}>{rv.body}</SizableText>

                  <SizableText fontSize={11} color={beautyTokens.textMuted}>
                    {rv.customer_email} · {rv.service_name}
                  </SizableText>

                  {/* Existing reply */}
                  {rv.reply ? (
                    <YStack
                      bg={beautyTokens.accentBlue}
                      rounded={10}
                      p="$3"
                      gap={4}
                      mt="$1"
                    >
                      <SizableText fontSize={11} fontWeight="600" color={beautyTokens.accentBlueText}>
                        Your reply
                      </SizableText>
                      <SizableText fontSize={13} color={beautyTokens.text}>{rv.reply}</SizableText>
                    </YStack>
                  ) : (
                    /* Reply input — only shown when no reply yet */
                    <YStack gap="$2" mt="$1">
                      <BeautyInput
                        testID={`review-reply-input-${rv.id}`}
                        value={replyText[rv.id] ?? ''}
                        onChangeText={(t) => setReplyText((prev) => ({ ...prev, [rv.id]: t }))}
                        placeholder="Write a reply…"
                        multiline
                        rows={2}
                        errorText={replyError[rv.id] || undefined}
                      />
                      <BeautyButton
                        testID={`review-reply-submit-${rv.id}`}
                        fullWidth
                        size="sm"
                        loading={replyBusy === rv.id}
                        onPress={() => onReply(rv)}
                      >
                        Send reply
                      </BeautyButton>
                    </YStack>
                  )}
                </BeautyCard>
              ))}
            </YStack>
          </ScrollView>
        )}

        <BusinessBottomNav active="profile" />
      </YStack>
    </BeautyShell>
  );
}
