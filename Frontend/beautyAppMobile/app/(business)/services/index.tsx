import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  H2,
  Paragraph,
  ScrollView,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { BeautyShell } from '@/components/BeautyShell';
import { BusinessBottomNav } from '@/components/BusinessBottomNav';
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
            <Pressable
              testID="services-add-btn"
              onPress={() => navigateLink(router, links.add)}
            >
              <YStack
                bg={beautyTokens.successHover}
                rounded={8}
                height={34}
                px="$3"
                justify="center"
              >
                <SizableText fontSize={13} fontWeight="700" color={beautyTokens.white}>
                  + Add
                </SizableText>
              </YStack>
            </Pressable>
          ) : null}
        </XStack>

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
            <YStack p="$4" gap="$3">
              {env?.action === 'render' && env.data?.services.length === 0 ? (
                <YStack items="center" justify="center" py="$8" gap="$2">
                  <SizableText fontSize={36}>✂️</SizableText>
                  <Paragraph fontWeight="600" color={beautyTokens.text}>No services yet</Paragraph>
                  <Paragraph fontSize={13} color={beautyTokens.textMuted}>
                    Add a service so clients can start booking.
                  </Paragraph>
                </YStack>
              ) : null}

              {env?.action === 'render' && env.data?.services.map((item) => (
                <YStack
                  key={item.id}
                  bg={beautyTokens.white}
                  borderWidth={1}
                  borderColor={beautyTokens.line}
                  rounded={14}
                  p="$4"
                  gap="$2"
                  shadowColor="rgba(15,35,60,0.05)"
                  shadowOffset={{ width: 0, height: 2 }}
                  shadowRadius={6}
                  shadowOpacity={1}
                >
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
                      <Pressable
                        style={{ flex: 1 }}
                        testID={`service-edit-${item.id}`}
                        onPress={() => navigateLink(router, item._links!.edit!)}
                      >
                        <YStack
                          height={36}
                          rounded={8}
                          borderWidth={1}
                          borderColor={beautyTokens.accentBlueDeep}
                          justify="center"
                          items="center"
                        >
                          <SizableText fontSize={12} fontWeight="600" color={beautyTokens.accentBlueText}>
                            Edit
                          </SizableText>
                        </YStack>
                      </Pressable>
                    ) : null}
                    {item._links?.delete ? (
                      <Pressable
                        style={{ flex: 1 }}
                        testID={`service-delete-${item.id}`}
                        disabled={busyId === item.id}
                        onPress={() => onDelete(item, item._links!.delete!)}
                      >
                        <YStack
                          height={36}
                          rounded={8}
                          borderWidth={1}
                          borderColor={beautyTokens.danger}
                          justify="center"
                          items="center"
                          opacity={busyId === item.id ? 0.5 : 1}
                        >
                          {busyId === item.id
                            ? <Spinner size="small" />
                            : <SizableText fontSize={12} fontWeight="600" color={beautyTokens.danger}>Delete</SizableText>}
                        </YStack>
                      </Pressable>
                    ) : null}
                  </XStack>
                </YStack>
              ))}
            </YStack>
          </ScrollView>
        )}

        <BusinessBottomNav active="services" />
      </YStack>
    </BeautyShell>
  );
}
