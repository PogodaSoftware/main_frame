import React, { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  H2,
  H3,
  Paragraph,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { useSession } from '@/hooks/useSession';
import { BeautyShell } from '@/components/BeautyShell';
import { BusinessBottomNav } from '@/components/BusinessBottomNav';
import { BeautyButton, BeautyCard, InfoStrip, LoadingScreen } from '@/components/ui';
import { beautyTokens } from '../../tamagui.config';

interface MonthBooking {
  id: number;
  slot_at: string;
  service_name: string;
  customer_email: string;
  price_cents: number;
}

interface Stats {
  upcoming_count: number;
  total_revenue_cents: number;
  this_month_revenue_cents?: number;
}

interface HomeData {
  business: { email: string; business_name: string };
  storefront: { id: number; name: string };
  stats: Stats;
  services_count: number;
  has_services: boolean;
  month_bookings?: MonthBooking[];
}

export default function BusinessHome() {
  const router = useRouter();
  const { clear } = useSession();
  const [env, setEnv] = useState<BffEnvelope<HomeData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<HomeData>('beauty_business_home');
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

  const onLogout = async () => {
    if (env?.action === 'render' && env._links?.logout) {
      await dispatchLink(env._links.logout);
    }
    clear();
    router.replace('/(auth)/business-login' as any);
  };

  if (!env || env.action !== 'render' || !env.data) {
    return (
      <BeautyShell>
        <Stack.Screen options={{ headerShown: false }} />
        {error ? (
          <YStack flex={1} items="center" justify="center" p="$4">
            <InfoStrip tone="danger">{error}</InfoStrip>
          </YStack>
        ) : (
          <LoadingScreen />
        )}
        <BusinessBottomNav active="home" />
      </BeautyShell>
    );
  }

  const data = env.data;
  const links = env._links ?? {};

  const kpis = [
    {
      label: 'Services',
      value: String(data.services_count),
      icon: '✂️',
      link: links.services,
    },
    {
      label: 'Upcoming',
      value: String(data.stats?.upcoming_count ?? 0),
      icon: '📅',
      link: links.bookings,
    },
    {
      label: 'This month',
      value: data.stats?.this_month_revenue_cents != null
        ? `$${(data.stats.this_month_revenue_cents / 100).toFixed(0)}`
        : '—',
      icon: '💰',
      link: links.profile,
    },
  ];

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1}>
        {/* Header bar */}
        <XStack
          height={52}
          items="center"
          justify="space-between"
          px="$4"
          bg={beautyTokens.surface}
          borderBottomWidth={1}
          borderBottomColor={beautyTokens.line}
        >
          <YStack>
            <SizableText fontFamily="$heading" fontSize={18} fontWeight="600" color={beautyTokens.text}>
              {data.storefront.name}
            </SizableText>
            <SizableText fontSize={11} color={beautyTokens.textMuted}>{data.business.email}</SizableText>
          </YStack>
          {links.logout ? (
            <BeautyButton variant="outline-danger" size="sm" onPress={onLogout}>
              Sign out
            </BeautyButton>
          ) : null}
        </XStack>

        <ScrollView flex={1} bg={beautyTokens.surface2}>
          <YStack p="$4" gap="$4">
            {/* KPI row */}
            <H2 fontFamily="$heading" fontSize={22} fontWeight="500" color={beautyTokens.text}>
              Dashboard
            </H2>
            <XStack gap="$3">
              {kpis.map((kpi) => (
                <BeautyCard
                  key={kpi.label}
                  flex={1}
                  onPress={() => navigateLink(router, kpi.link)}
                >
                  <YStack items="center" gap={4}>
                    <SizableText fontSize={24}>{kpi.icon}</SizableText>
                    <SizableText fontFamily="$heading" fontSize={20} fontWeight="600" color={beautyTokens.text}>
                      {kpi.value}
                    </SizableText>
                    <SizableText fontSize={11} color={beautyTokens.textMuted}>{kpi.label}</SizableText>
                  </YStack>
                </BeautyCard>
              ))}
            </XStack>

            {/* Quick actions */}
            <H3 fontFamily="$heading" fontSize={16} fontWeight="600" color={beautyTokens.text}>
              Quick actions
            </H3>
            <YStack gap="$2">
              {[
                { key: 'services', icon: '✂️', label: links.services?.prompt ?? 'Manage services' },
                { key: 'bookings', icon: '📅', label: links.bookings?.prompt ?? 'View bookings' },
                { key: 'availability', icon: '🕐', label: links.availability?.prompt ?? 'Edit hours' },
                { key: 'profile', icon: '💰', label: links.profile?.prompt ?? 'Earnings' },
              ].map(({ key, icon, label }) =>
                links[key] ? (
                  <Pressable key={key} onPress={() => navigateLink(router, links[key])}>
                    <XStack
                      bg={beautyTokens.white}
                      borderWidth={1}
                      borderColor={beautyTokens.line}
                      rounded={12}
                      px="$4"
                      height={52}
                      items="center"
                      gap="$3"
                    >
                      <SizableText fontSize={20}>{icon}</SizableText>
                      <SizableText flex={1} fontSize={14} fontWeight="500" color={beautyTokens.text}>
                        {label}
                      </SizableText>
                      <SizableText color={beautyTokens.textMuted}>›</SizableText>
                    </XStack>
                  </Pressable>
                ) : null,
              )}
            </YStack>

            {!data.has_services && (
              <YStack
                bg={beautyTokens.accentBlue}
                rounded={14}
                p="$4"
                gap="$2"
              >
                <SizableText fontSize={20}>👋</SizableText>
                <Paragraph fontWeight="600" color={beautyTokens.text}>
                  Add your first service
                </Paragraph>
                <Paragraph fontSize={13} color={beautyTokens.textMuted}>
                  {`Clients can't book until you've listed at least one service.`}
                </Paragraph>
                {links.services ? (
                  <YStack mt="$1">
                    <BeautyButton
                      fullWidth
                      onPress={() => navigateLink(router, links.services)}
                    >
                      Add a service
                    </BeautyButton>
                  </YStack>
                ) : null}
              </YStack>
            )}
          </YStack>
        </ScrollView>

        <BusinessBottomNav active="home" />
      </YStack>
    </BeautyShell>
  );
}
