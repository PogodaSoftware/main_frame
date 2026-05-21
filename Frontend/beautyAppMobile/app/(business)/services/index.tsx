import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  H2,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { BeautyShell } from '@/components/BeautyShell';
import { BusinessBottomNav } from '@/components/BusinessBottomNav';
import { BeautyButton, BeautyCard, EmptyState, InfoStrip, LoadingScreen } from '@/components/ui';
import { beautyTokens } from '../../../tamagui.config';

interface ServiceItem {
  id: number;
  name: string;
  category_label: string;
  price_dollars: string;
  duration_minutes: number;
  description?: string;
  _links?: {
    edit?: BffLink;
    delete?: BffLink;
  };
}

interface ServicesData {
  storefront: { id: number; name: string };
  services: ServiceItem[];
}

export default function BusinessServicesScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ServicesData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<ServicesData>('beauty_business_services');
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

  const onDelete = (item: ServiceItem, link: BffLink) => {
    Alert.alert(
      'Delete service',
      `Delete "${item.name}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusyId(item.id);
            await dispatchLink(link);
            setBusyId(null);
            await load();
          },
        },
      ],
    );
  };

  const links = env?.action === 'render' ? (env._links ?? {}) : {};

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1}>
        {/* Header */}
        <XStack
          height={52}
          items="center"
          justify="space-between"
          px="$4"
          bg={beautyTokens.surface}
          borderBottomWidth={1}
          borderBottomColor={beautyTokens.line}
        >
          <H2 fontFamily="$heading" fontSize={20} fontWeight="500" color={beautyTokens.text}>
            My Services
          </H2>
          {links.add ? (
            <BeautyButton
              size="sm"
              testID="services-add-btn"
              onPress={() => navigateLink(router, links.add)}
            >
              + Add
            </BeautyButton>
          ) : null}
        </XStack>

        {!env && !error ? (
          <LoadingScreen />
        ) : error ? (
          <YStack flex={1} p="$4">
            <InfoStrip tone="danger">{error}</InfoStrip>
          </YStack>
        ) : (
          <ScrollView flex={1} bg={beautyTokens.surface2}>
            <YStack p="$4" gap="$3">
              {env?.action === 'render' && env.data?.services.length === 0 ? (
                <EmptyState
                  icon={<SizableText fontSize={36}>✂️</SizableText>}
                  title="No services yet"
                  message="Add a service so clients can start booking."
                />
              ) : null}

              {env?.action === 'render' && env.data?.services.map((item) => (
                <BeautyCard key={item.id}>
                  <XStack justify="space-between" items="flex-start">
                    <YStack flex={1} gap={4}>
                      <SizableText fontWeight="700" fontSize={15} color={beautyTokens.text}>
                        {item.name}
                      </SizableText>
                      <SizableText fontSize={12} color={beautyTokens.textMuted}>
                        {item.category_label} · {item.duration_minutes} min · ${item.price_dollars}
                      </SizableText>
                      {item.description ? (
                        <SizableText fontSize={12} color={beautyTokens.textMuted} numberOfLines={2}>
                          {item.description}
                        </SizableText>
                      ) : null}
                    </YStack>
                  </XStack>
                  <XStack gap="$2" mt="$1">
                    {item._links?.edit ? (
                      <YStack flex={1}>
                        <BeautyButton
                          variant="outline"
                          size="sm"
                          fullWidth
                          testID={`service-edit-${item.id}`}
                          onPress={() => navigateLink(router, item._links!.edit!)}
                        >
                          Edit
                        </BeautyButton>
                      </YStack>
                    ) : null}
                    {item._links?.delete ? (
                      <YStack flex={1}>
                        <BeautyButton
                          variant="outline-danger"
                          size="sm"
                          fullWidth
                          loading={busyId === item.id}
                          testID={`service-delete-${item.id}`}
                          onPress={() => onDelete(item, item._links!.delete!)}
                        >
                          Delete
                        </BeautyButton>
                      </YStack>
                    ) : null}
                  </XStack>
                </BeautyCard>
              ))}
            </YStack>
          </ScrollView>
        )}

        <BusinessBottomNav active="services" />
      </YStack>
    </BeautyShell>
  );
}
