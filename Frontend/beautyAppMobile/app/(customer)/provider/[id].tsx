import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  H2,
  H3,
  Paragraph,
  ScrollView,
  Separator,
  SizableText,
  XStack,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { ServiceCard } from '@/components/marketplace/ServiceCard';
import { BeautyCard, EmptyState, InfoStrip, LoadingScreen } from '@/components/ui';

interface ProviderInfo {
  id: number;
  name: string;
  short_description: string;
  long_description: string;
  location_label: string;
  avg_rating: number | null;
  review_count: number;
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

export default function ProviderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const providerId = Number(id);

  const [env, setEnv] = useState<BffEnvelope<ProviderDetailData> | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  if (error) {
    return (
      <YStack p="$4">
        <SizableText color="$red10" testID="provider-error">
          {error}
        </SizableText>
      </YStack>
    );
  }
  if (!env || env.action !== 'render' || !env.data) {
    return <LoadingScreen />;
  }

  const { provider, services, reviews } = env.data;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: provider.name }} />
      <ScrollView flex={1} bg="$background">
        <YStack p="$4" gap="$4">
          <YStack gap="$1">
            <H2 testID="provider-name">{provider.name}</H2>
            <SizableText opacity={0.7}>{provider.location_label}</SizableText>
            {provider.avg_rating != null ? (
              <XStack gap="$2">
                <SizableText>★ {provider.avg_rating.toFixed(1)}</SizableText>
                <SizableText opacity={0.6}>({provider.review_count} reviews)</SizableText>
              </XStack>
            ) : null}
          </YStack>

          {provider.short_description ? (
            <Paragraph opacity={0.8}>{provider.short_description}</Paragraph>
          ) : null}
          {provider.long_description ? (
            <Paragraph>{provider.long_description}</Paragraph>
          ) : null}

          <Separator />

          <YStack gap="$2">
            <H3>Services</H3>
            {services.length === 0 ? (
              <EmptyState testID="provider-services-empty" message="No services listed." />
            ) : null}
            {services.map((s) => (
              <ServiceCard
                key={s.id}
                testID={`provider-service-${s.id}`}
                name={s.name}
                description={s.description}
                priceCents={s.price_cents}
                durationMinutes={s.duration_minutes}
                category={s.category}
                isFavorited={s.is_favorited}
                onPress={() => navigateLink(router, s._links?.book)}
              />
            ))}
          </YStack>

          {reviews.length > 0 ? (
            <>
              <Separator />
              <YStack gap="$2">
                <H3>Recent reviews</H3>
                {reviews.map((r) => (
                  <BeautyCard key={r.id} testID={`provider-review-${r.id}`} gap="$2">
                    <XStack justify="space-between" items="center">
                      <SizableText fontWeight="700">{'★'.repeat(r.rating)}</SizableText>
                      <SizableText opacity={0.5}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </SizableText>
                    </XStack>
                    {r.body ? <Paragraph>{r.body}</Paragraph> : null}
                    <SizableText opacity={0.5}>{r.service_name}</SizableText>
                    {r.business_reply ? (
                      <InfoStrip
                        testID={`provider-review-reply-${r.id}`}
                        tone="info"
                      >
                        <SizableText fontWeight="700">Provider response</SizableText>
                        {'\n'}
                        {r.business_reply}
                      </InfoStrip>
                    ) : null}
                  </BeautyCard>
                ))}
              </YStack>
            </>
          ) : null}
        </YStack>
      </ScrollView>
    </>
  );
}
