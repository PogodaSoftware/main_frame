import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import {
  H2,
  H3,
  Paragraph,
  ScrollView,
  Separator,
  SizableText,
  Spinner,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { formatStatus } from '@/services/bookings';
import { BeautyShell } from '@/components/BeautyShell';
import { BusinessBottomNav } from '@/components/BusinessBottomNav';
import { beautyTokens } from '../../../tamagui.config';

interface BusinessBookingItem {
  id: number;
  status: string;
  slot_at: string;
  slot_label: string;
  service: {
    id: number;
    name: string;
    duration_minutes: number;
    price_cents: number;
    price_dollars: string;
  };
  customer_email: string;
}

interface BusinessBookingsData {
  storefront: { id: number; name: string };
  upcoming: BusinessBookingItem[];
  past: BusinessBookingItem[];
  total: number;
}

export default function BusinessBookingsScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<BusinessBookingsData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<BusinessBookingsData>('beauty_business_bookings');
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        router.replace((route ?? '/(auth)/business-login') as any);
        return;
      }
      setEnv(e);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const renderRow = (item: BusinessBookingItem) => (
    <YStack
      key={item.id}
      bg={beautyTokens.white}
      borderWidth={1}
      borderColor={beautyTokens.line}
      rounded={12}
      p="$3"
      gap="$1"
    >
      <SizableText fontWeight="700" fontSize={14} color={beautyTokens.text}>
        {item.service.name}
      </SizableText>
      <SizableText fontSize={12} color={beautyTokens.textMuted}>
        {item.slot_label}
      </SizableText>
      <SizableText fontSize={12} color={beautyTokens.textMuted}>
        {item.customer_email} · {item.service.duration_minutes} min · ${item.service.price_dollars}
      </SizableText>
      <SizableText fontSize={11} color={beautyTokens.textMuted}>
        {formatStatus(item.status)}
      </SizableText>
    </YStack>
  );

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
            Bookings
          </H2>
        </YStack>

        {!env && !error ? (
          <YStack flex={1} items="center" justify="center">
            <Spinner color={beautyTokens.successHover} />
          </YStack>
        ) : error ? (
          <YStack flex={1} p="$4">
            <SizableText color={beautyTokens.danger}>{error}</SizableText>
          </YStack>
        ) : (
          <ScrollView flex={1} bg={beautyTokens.surface2}>
            <YStack p="$4" gap="$4">
              {env?.action === 'render' && env.data ? (
                <>
                  <YStack gap="$2">
                    <H3 fontFamily="$heading" fontSize={15} fontWeight="600" color={beautyTokens.text}>
                      Upcoming
                    </H3>
                    {env.data.upcoming.length === 0 ? (
                      <Paragraph fontSize={13} color={beautyTokens.textMuted}>No upcoming bookings.</Paragraph>
                    ) : env.data.upcoming.map(renderRow)}
                  </YStack>

                  <Separator />

                  <YStack gap="$2">
                    <H3 fontFamily="$heading" fontSize={15} fontWeight="600" color={beautyTokens.text}>
                      Past
                    </H3>
                    {env.data.past.length === 0 ? (
                      <Paragraph fontSize={13} color={beautyTokens.textMuted}>No past bookings.</Paragraph>
                    ) : env.data.past.map(renderRow)}
                  </YStack>
                </>
              ) : null}
            </YStack>
          </ScrollView>
        )}

        <BusinessBottomNav active="bookings" />
      </YStack>
    </BeautyShell>
  );
}
