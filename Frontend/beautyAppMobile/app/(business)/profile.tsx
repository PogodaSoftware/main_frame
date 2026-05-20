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
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { BeautyShell } from '@/components/BeautyShell';
import { BusinessBottomNav } from '@/components/BusinessBottomNav';
import { BeautyCard, InfoStrip, LoadingScreen } from '@/components/ui';
import { beautyTokens } from '../../tamagui.config';

interface Earnings {
  currency: string;
  total_dollars: string;
  this_month_dollars: string;
  this_year_dollars: string;
  paid_bookings_count: number;
}

interface ProfileData {
  business: { email: string; business_name: string };
  earnings: Earnings;
}

export default function BusinessProfileScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ProfileData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<ProfileData>('beauty_business_profile');
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

  const links = env?.action === 'render' ? (env._links ?? {}) : {};
  const data = env?.action === 'render' ? env.data : undefined;

  const earningsCards = data ? [
    { label: 'This month', value: `$${data.earnings.this_month_dollars}`, icon: '📅' },
    { label: 'This year', value: `$${data.earnings.this_year_dollars}`, icon: '📆' },
    { label: 'Lifetime', value: `$${data.earnings.total_dollars}`, icon: '💰' },
  ] : [];

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
            Profile
          </H2>
        </YStack>

        {!env && !error ? (
          <LoadingScreen />
        ) : error ? (
          <YStack flex={1} p="$4">
            <InfoStrip tone="danger">{error}</InfoStrip>
          </YStack>
        ) : (
          <ScrollView flex={1} bg={beautyTokens.surface2}>
            <YStack p="$4" gap="$4">
              {/* Business info card */}
              <BeautyCard>
                <SizableText fontFamily="$heading" fontSize={20} fontWeight="600" color={beautyTokens.text}>
                  {data?.business.business_name}
                </SizableText>
                <SizableText fontSize={13} color={beautyTokens.textMuted}>
                  {data?.business.email}
                </SizableText>
              </BeautyCard>

              {/* Earnings */}
              <SizableText fontSize={13} fontWeight="600" color={beautyTokens.textMuted}>
                EARNINGS (COMPLETED BOOKINGS)
              </SizableText>
              <YStack gap="$3">
                {earningsCards.map((card) => (
                  <BeautyCard key={card.label}>
                    <XStack items="center" gap={12}>
                      <SizableText fontSize={22}>{card.icon}</SizableText>
                      <YStack flex={1}>
                        <SizableText fontSize={12} color={beautyTokens.textMuted}>{card.label}</SizableText>
                        <SizableText fontFamily="$heading" fontSize={20} fontWeight="600" color={beautyTokens.text}>
                          {card.value}
                        </SizableText>
                      </YStack>
                    </XStack>
                  </BeautyCard>
                ))}
              </YStack>

              <SizableText fontSize={12} color={beautyTokens.textMuted}>
                {data?.earnings.paid_bookings_count} paid booking(s) total
              </SizableText>

              {/* Settings link */}
              {links.settings ? (
                <BeautyCard onPress={() => navigateLink(router, links.settings)}>
                  <XStack items="center" gap={12}>
                    <SizableText fontSize={20}>⚙️</SizableText>
                    <SizableText flex={1} fontSize={14} fontWeight="500" color={beautyTokens.text}>
                      {links.settings.prompt ?? 'Settings'}
                    </SizableText>
                    <SizableText color={beautyTokens.textMuted}>›</SizableText>
                  </XStack>
                </BeautyCard>
              ) : null}
            </YStack>
          </ScrollView>
        )}

        <BusinessBottomNav active="profile" />
      </YStack>
    </BeautyShell>
  );
}
