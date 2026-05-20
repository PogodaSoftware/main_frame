import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  H2,
  H3,
  H4,
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
import { SlotPickerForm, type SlotPickerFormSpec } from '@/bff/SlotPickerForm';
import {
  favoriteService,
  formatDuration,
  formatPrice,
  getServiceReviews,
  unfavoriteService,
  type ReviewsListResponse,
} from '@/services/marketplace';
import {
  BeautyButton,
  BeautyCard,
  EmptyState,
  InfoStrip,
  LoadingScreen,
} from '@/components/ui';

interface BookProvider {
  id: number;
  name: string;
  location_label: string;
  timezone?: string;
}

interface BookService {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  duration_minutes: number;
  category: string;
}

interface BookData {
  service: BookService;
  provider: BookProvider;
  form?: SlotPickerFormSpec;
}

export default function ServiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const serviceId = Number(id);

  const [env, setEnv] = useState<BffEnvelope<BookData> | null>(null);
  const [reviews, setReviews] = useState<ReviewsListResponse | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [favPending, setFavPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(serviceId)) return;
    let cancelled = false;
    setError(null);
    setEnv(null);
    setReviews(null);

    resolve<BookData>('beauty_book', { serviceId })
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const target = e._links?.target;
          const route = nativeRouteFor(target?.screen);
          router.replace((route ?? '/(auth)/login') as any);
          return;
        }
        setEnv(e);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });

    getServiceReviews(serviceId)
      .then((r) => {
        if (!cancelled) setReviews(r);
      })
      .catch(() => {
        // reviews list optional; ignore failure
      });

    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  const toggleFavorite = async () => {
    setFavPending(true);
    try {
      if (favorited) {
        await unfavoriteService(serviceId);
        setFavorited(false);
      } else {
        await favoriteService(serviceId);
        setFavorited(true);
      }
    } catch {
      // ignore
    } finally {
      setFavPending(false);
    }
  };

  if (error) {
    return (
      <YStack p="$4">
        <SizableText color="$red10" testID="service-error">
          {error}
        </SizableText>
      </YStack>
    );
  }
  if (!env || env.action !== 'render' || !env.data) {
    return <LoadingScreen />;
  }

  const { service, provider } = env.data;
  const links = env._links ?? {};
  const providerLink: BffLink | undefined = links.provider;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: service.name }} />
      <ScrollView flex={1} bg="$background">
        <YStack p="$4" gap="$4">
          <YStack gap="$1">
            <H2 testID="service-name">{service.name}</H2>
            <SizableText opacity={0.7}>{service.category}</SizableText>
          </YStack>

          <BeautyCard testID="service-summary-card" gap="$2">
            <XStack justify="space-between" items="center">
              <SizableText fontWeight="700" fontSize="$6">
                {formatPrice(service.price_cents)}
              </SizableText>
              <SizableText opacity={0.7}>
                {formatDuration(service.duration_minutes)}
              </SizableText>
            </XStack>
            {service.description ? (
              <Paragraph>{service.description}</Paragraph>
            ) : null}
          </BeautyCard>

          <XStack gap="$2">
            {providerLink ? (
              <BeautyButton
                testID="service-view-provider"
                variant="outline"
                fullWidth
                onPress={() => navigateLink(router, providerLink)}
              >
                {providerLink.prompt ?? 'View provider'}
              </BeautyButton>
            ) : null}
            <BeautyButton
              testID="service-favorite-toggle"
              variant={favorited ? 'outline-danger' : 'outline'}
              fullWidth
              loading={favPending}
              onPress={toggleFavorite}
            >
              {favorited ? '★ Saved' : '☆ Save'}
            </BeautyButton>
          </XStack>

          <YStack gap="$2">
            <H3>Provider</H3>
            <BeautyCard testID="service-provider-card" gap="$1">
              <H4>{provider.name}</H4>
              <SizableText opacity={0.7}>{provider.location_label}</SizableText>
            </BeautyCard>
          </YStack>

          {env.data.form ? (
            <>
              <Separator />
              <YStack gap="$2">
                <H3>Book this service</H3>
                <SlotPickerForm
                  form={env.data.form}
                  onSuccess={(body) => {
                    const id = body?.id;
                    if (id != null) {
                      router.replace({
                        pathname: '/(customer)/bookings/[id]/success',
                        params: { id: String(id) },
                      });
                    }
                  }}
                />
              </YStack>
            </>
          ) : null}

          <Separator />

          <YStack gap="$2">
            <XStack justify="space-between" items="center">
              <H3>Reviews</H3>
              {reviews?.aggregate.avg_rating != null ? (
                <SizableText opacity={0.7}>
                  ★ {reviews.aggregate.avg_rating.toFixed(1)} ({reviews.aggregate.count})
                </SizableText>
              ) : null}
            </XStack>

            {!reviews ? <LoadingScreen inline /> : null}
            {reviews && reviews.items.length === 0 ? (
              <EmptyState testID="service-reviews-empty" message="No reviews yet." />
            ) : null}

            {reviews?.items.map((r) => (
              <BeautyCard key={r.id} testID={`service-review-${r.id}`} gap="$2">
                <XStack justify="space-between" items="center">
                  <SizableText fontWeight="700">{'★'.repeat(r.rating)}</SizableText>
                  <SizableText opacity={0.5}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </SizableText>
                </XStack>
                {r.body ? <Paragraph>{r.body}</Paragraph> : null}
                {r.business_reply ? (
                  <InfoStrip
                    testID={`service-review-reply-${r.id}`}
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
        </YStack>
      </ScrollView>
    </>
  );
}
