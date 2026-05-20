import React, { useCallback, useEffect, useState } from 'react';
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
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { formatDuration, formatPrice } from '@/services/marketplace';
import { formatStatus, formatTimeInTz } from '@/services/bookings';
import {
  BeautyButton,
  BeautyCard,
  InfoStrip,
  LoadingScreen,
} from '@/components/ui';

interface BookingDetailData {
  booking: {
    id: number;
    status: string;
    is_upcoming: boolean;
    slot_at: string;
    slot_label: string;
    grace_period_ends_at: string | null;
    in_grace_window: boolean;
    service: {
      id: number;
      name: string;
      description: string;
      price_cents: number;
      duration_minutes: number;
      category: string;
    };
    provider: {
      id: number;
      name: string;
      short_description: string;
      location_label: string;
      timezone?: string | null;
    };
  };
}

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const [env, setEnv] = useState<BffEnvelope<BookingDetailData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(bookingId)) return;
    setError(null);
    try {
      const e = await resolve<BookingDetailData>('beauty_booking_detail', { id: bookingId });
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        router.replace((route ?? '/(customer)/bookings') as any);
        return;
      }
      setEnv(e);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [bookingId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const onAction = async (link: BffLink) => {
    setBusy(true);
    const r = await dispatchLink(link);
    setBusy(false);
    if (r.ok) await load();
  };

  if (error) {
    return (
      <YStack p="$4">
        <SizableText color="$red10" testID="booking-detail-error">
          {error}
        </SizableText>
      </YStack>
    );
  }
  if (!env || env.action !== 'render' || !env.data) {
    return <LoadingScreen />;
  }

  const { booking } = env.data;
  const links = env._links ?? {};

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Booking' }} />
      <ScrollView flex={1} bg="$background">
        <YStack p="$4" gap="$4">
          <YStack gap="$1">
            <H2 testID="booking-service-name">{booking.service.name}</H2>
            <SizableText opacity={0.7}>{booking.slot_label}</SizableText>
            <SizableText opacity={0.6} testID="booking-status">
              {formatStatus(booking.status)}
            </SizableText>
          </YStack>

          <BeautyCard testID="booking-summary-card" gap="$2">
            <XStack justify="space-between" items="center">
              <SizableText fontWeight="700" fontSize="$6">
                {formatPrice(booking.service.price_cents)}
              </SizableText>
              <SizableText opacity={0.7}>
                {formatDuration(booking.service.duration_minutes)}
              </SizableText>
            </XStack>
            {booking.service.description ? (
              <Paragraph>{booking.service.description}</Paragraph>
            ) : null}
          </BeautyCard>

          <YStack gap="$2">
            <H3>Provider</H3>
            <BeautyCard testID="booking-provider-card" gap="$1">
              <H4>{booking.provider.name}</H4>
              <SizableText opacity={0.7}>{booking.provider.location_label}</SizableText>
              {booking.provider.short_description ? (
                <Paragraph opacity={0.8}>{booking.provider.short_description}</Paragraph>
              ) : null}
            </BeautyCard>
          </YStack>

          {booking.in_grace_window && booking.grace_period_ends_at ? (
            <InfoStrip testID="booking-grace-strip" tone="warning">
              <SizableText fontWeight="700">Grace period active</SizableText>
              {'\n'}
              Free cancel until{' '}
              {formatTimeInTz(booking.grace_period_ends_at, booking.provider.timezone)}
            </InfoStrip>
          ) : null}

          <Separator />

          <YStack gap="$2">
            {links.reschedule ? (
              <BeautyButton
                testID="booking-reschedule"
                variant="outline"
                fullWidth
                onPress={() => navigateLink(router, links.reschedule)}
              >
                {links.reschedule.prompt ?? 'Reschedule'}
              </BeautyButton>
            ) : null}
            {links.cancel_grace ? (
              <BeautyButton
                testID="booking-cancel-grace"
                variant="delete"
                fullWidth
                loading={busy}
                onPress={() => onAction(links.cancel_grace!)}
              >
                {links.cancel_grace.prompt ?? 'Cancel now (free)'}
              </BeautyButton>
            ) : null}
            {links.cancel ? (
              <BeautyButton
                testID="booking-cancel"
                variant="delete"
                fullWidth
                loading={busy}
                onPress={() => onAction(links.cancel!)}
              >
                {links.cancel.prompt ?? 'Cancel'}
              </BeautyButton>
            ) : null}
            {links.chat_thread ? (
              <BeautyButton
                testID="booking-open-chat"
                variant="neutral"
                fullWidth
                onPress={() => navigateLink(router, links.chat_thread)}
              >
                {links.chat_thread.prompt ?? 'Open chat'}
              </BeautyButton>
            ) : null}
            {links.provider ? (
              <BeautyButton
                testID="booking-view-provider"
                variant="outline"
                fullWidth
                onPress={() => navigateLink(router, links.provider)}
              >
                {links.provider.prompt ?? 'View provider'}
              </BeautyButton>
            ) : null}
            {links.bookings ? (
              <BeautyButton
                testID="booking-back"
                variant="link"
                fullWidth
                onPress={() => navigateLink(router, links.bookings, { replace: true })}
              >
                {links.bookings.prompt ?? 'Back'}
              </BeautyButton>
            ) : null}
          </YStack>
        </YStack>
      </ScrollView>
    </>
  );
}
