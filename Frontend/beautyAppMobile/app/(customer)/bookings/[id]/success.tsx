import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  H2,
  H4,
  Paragraph,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { formatDuration, formatPrice } from '@/services/marketplace';
import { formatStatus, formatTimeInTz } from '@/services/bookings';
import {
  BeautyButton,
  BeautyCard,
  InfoStrip,
  LoadingScreen,
} from '@/components/ui';

interface SuccessData {
  booking: {
    id: number;
    status: string;
    slot_at: string;
    slot_label: string;
    grace_period_ends_at: string | null;
    in_grace_window: boolean;
    service: { id: number; name: string; price_cents: number; duration_minutes: number };
    provider: { id: number; name: string; location_label: string; timezone?: string };
  };
}

export default function BookingSuccessScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);
  const [env, setEnv] = useState<BffEnvelope<SuccessData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(bookingId)) return;
    let cancelled = false;
    setEnv(null);
    setError(null);
    resolve<SuccessData>('beauty_booking_success', { bookingId })
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(customer)/bookings') as any);
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
  }, [bookingId]);

  if (error) {
    return (
      <YStack p="$4">
        <SizableText color="$red10" testID="booking-success-error">
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

  const onCancelGrace = async () => {
    if (!links.cancel_grace) return;
    setCancelling(true);
    const r = await dispatchLink(links.cancel_grace);
    setCancelling(false);
    if (r.ok) {
      router.replace('/(customer)/bookings' as any);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Booking confirmed' }} />
      <ScrollView flex={1} bg="$background">
        <YStack p="$4" gap="$4">
          <H2 testID="booking-success-status">✓ {formatStatus(booking.status)}</H2>
          <Paragraph opacity={0.8}>{booking.slot_label}</Paragraph>

          <BeautyCard testID="booking-success-card" gap="$2">
            <H4>{booking.service.name}</H4>
            <SizableText opacity={0.7}>
              {formatPrice(booking.service.price_cents)} ·{' '}
              {formatDuration(booking.service.duration_minutes)}
            </SizableText>
            <SizableText opacity={0.7}>{booking.provider.name}</SizableText>
            <SizableText opacity={0.6}>{booking.provider.location_label}</SizableText>
          </BeautyCard>

          {booking.in_grace_window && links.cancel_grace ? (
            <YStack gap="$2">
              <InfoStrip testID="booking-success-grace-strip" tone="warning">
                <SizableText fontWeight="700">Grace period active</SizableText>
                {'\n'}
                Free cancel until{' '}
                {formatTimeInTz(
                  booking.grace_period_ends_at!,
                  booking.provider.timezone,
                )}
              </InfoStrip>
              <BeautyButton
                testID="booking-success-cancel-grace"
                variant="delete"
                fullWidth
                loading={cancelling}
                onPress={onCancelGrace}
              >
                {links.cancel_grace.prompt ?? 'Cancel free'}
              </BeautyButton>
            </YStack>
          ) : null}

          <XStack gap="$2">
            {links.detail ? (
              <BeautyButton
                testID="booking-success-view-detail"
                variant="outline"
                fullWidth
                onPress={() => navigateLink(router, links.detail, { replace: true })}
              >
                {links.detail.prompt ?? 'View booking'}
              </BeautyButton>
            ) : null}
            {links.bookings ? (
              <BeautyButton
                testID="booking-success-bookings"
                variant="confirm"
                fullWidth
                onPress={() => navigateLink(router, links.bookings, { replace: true })}
              >
                {links.bookings.prompt ?? 'My Bookings'}
              </BeautyButton>
            ) : null}
          </XStack>
          {links.chat_thread ? (
            <BeautyButton
              testID="booking-success-chat"
              variant="outline"
              fullWidth
              onPress={() => navigateLink(router, links.chat_thread)}
            >
              {links.chat_thread.prompt ?? 'Message provider'}
            </BeautyButton>
          ) : null}
          {links.home ? (
            <BeautyButton
              testID="booking-success-home"
              variant="link"
              fullWidth
              onPress={() => navigateLink(router, links.home, { replace: true })}
            >
              {links.home.prompt ?? 'Home'}
            </BeautyButton>
          ) : null}
        </YStack>
      </ScrollView>
    </>
  );
}
