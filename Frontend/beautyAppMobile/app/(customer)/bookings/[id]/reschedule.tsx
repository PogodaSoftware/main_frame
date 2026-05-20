import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  H2,
  H4,
  Paragraph,
  ScrollView,
  Separator,
  SizableText,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { SlotPickerForm, type SlotPickerFormSpec } from '@/bff/SlotPickerForm';
import { BeautyCard, LoadingScreen } from '@/components/ui';

interface RescheduleData {
  booking: { id: number; current_slot_at: string; current_slot_label: string };
  service: { id: number; name: string; duration_minutes: number; price_cents: number };
  provider: { id: number; name: string; location_label: string };
  form: SlotPickerFormSpec;
}

export default function RescheduleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const [env, setEnv] = useState<BffEnvelope<RescheduleData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(bookingId)) return;
    let cancelled = false;
    setEnv(null);
    setError(null);
    resolve<RescheduleData>('beauty_reschedule', { bookingId })
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
  }, [bookingId, router]);

  if (error) {
    return (
      <YStack p="$4">
        <SizableText color="$red10" testID="reschedule-error">
          {error}
        </SizableText>
      </YStack>
    );
  }
  if (!env || env.action !== 'render' || !env.data) {
    return <LoadingScreen />;
  }

  const { booking, service, provider, form } = env.data;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Reschedule' }} />
      <ScrollView flex={1} bg="$background">
        <YStack p="$4" gap="$4">
          <H2>Reschedule</H2>
          <BeautyCard testID="reschedule-current-card" gap="$1">
            <H4>{service.name}</H4>
            <SizableText opacity={0.7}>
              {provider.name} · {provider.location_label}
            </SizableText>
            <Paragraph opacity={0.8}>
              Current slot: {booking.current_slot_label}
            </Paragraph>
          </BeautyCard>

          <Separator />

          <SlotPickerForm
            form={form}
            onSuccess={() => {
              router.replace({
                pathname: '/(customer)/bookings/[id]' as any,
                params: { id: String(bookingId) },
              });
            }}
          />
        </YStack>
      </ScrollView>
    </>
  );
}
