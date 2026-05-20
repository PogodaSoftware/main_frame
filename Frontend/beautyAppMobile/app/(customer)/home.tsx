import React, { useEffect, useState } from 'react';
import { Image, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  H2,
  ScrollView,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { useSession } from '@/hooks/useSession';
import { BeautyShell } from '@/components/BeautyShell';
import { BottomNav } from '@/components/BottomNav';
import { beautyTokens } from '../../tamagui.config';

interface HomeService {
  slug: string;
  label: string;
  icon?: string;
  image?: string;
  _links?: { category?: BffLink | null };
}

interface HomeData {
  is_authenticated: boolean;
  user_email: string | null;
  user_type: 'customer' | 'business' | null;
  business_name: string | null;
  services: HomeService[];
}

export default function CustomerHome() {
  const router = useRouter();
  const { clear } = useSession();
  const [env, setEnv] = useState<BffEnvelope<HomeData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    resolve<HomeData>('beauty_home')
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
  }, [router]);

  const onLogout = async () => {
    if (env?.action === 'render' && env._links?.logout) {
      await dispatchLink(env._links.logout);
    }
    clear();
    router.replace('/(auth)/login' as any);
  };

  if (error) {
    return (
      <BeautyShell>
        <YStack p="$4">
          <SizableText color={beautyTokens.danger}>{error}</SizableText>
        </YStack>
        <BottomNav active="home" />
      </BeautyShell>
    );
  }

  if (!env || env.action !== 'render' || !env.data) {
    return (
      <BeautyShell>
        <Stack.Screen options={{ headerShown: false }} />
        <YStack flex={1} items="center" justify="center">
          <Spinner color={beautyTokens.successHover} />
        </YStack>
        <BottomNav active="home" />
      </BeautyShell>
    );
  }

  const data = env.data;
  const links = env._links ?? {};

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1}>
        {/* Customer home is account-free at the top — email + sign-out
            live on the Profile tab. Matches Angular `.beauty-header` which
            renders only the search bar + nav actions, no account row. */}
        <ScrollView flex={1}>
          {/* Services carousel panel */}
          <YStack bg={beautyTokens.accentBlue} py="$4">
            <H2
              fontFamily="$heading"
              fontSize={24}
              fontWeight="500"
              color={beautyTokens.text}
              px="$4"
              mb="$3"
            >
              Services
            </H2>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <XStack gap="$3" px="$4">
                {data.services.map((s) => (
                  <Pressable
                    key={s.slug}
                    onPress={() => navigateLink(router, s._links?.category)}
                  >
                    <YStack
                      width={220}
                      height={156}
                      rounded={14}
                      bg="#1a1a1a"
                      overflow="hidden"
                      shadowColor="rgba(15, 35, 60, 0.12)"
                      shadowOffset={{ width: 0, height: 4 }}
                      shadowRadius={14}
                      shadowOpacity={1}
                    >
                      {s.image ? (
                        <Image
                          source={{ uri: s.image }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : null}
                      <YStack
                        position="absolute"
                        b={0}
                        l={0}
                        r={0}
                        px="$3"
                        py="$3"
                        bg="rgba(0,0,0,0.35)"
                      >
                        <SizableText
                          fontFamily="$heading"
                          fontSize={22}
                          fontWeight="500"
                          color={beautyTokens.white}
                        >
                          {s.label}
                        </SizableText>
                      </YStack>
                    </YStack>
                  </Pressable>
                ))}
              </XStack>
            </ScrollView>
          </YStack>

          {/* Map placeholder */}
          <YStack flex={1} bg={beautyTokens.surface2} minH={300} items="center" justify="center">
            <YStack
              bg={beautyTokens.surface}
              borderWidth={1}
              borderColor={beautyTokens.line}
              rounded={14}
              px="$4"
              py="$4"
              items="center"
              gap="$1"
              shadowColor="rgba(15, 35, 60, 0.06)"
              shadowOffset={{ width: 0, height: 4 }}
              shadowRadius={16}
              shadowOpacity={1}
            >
              <SizableText fontSize={32}>🗺️</SizableText>
              <SizableText
                fontFamily="$heading"
                fontSize={20}
                fontWeight="500"
                color={beautyTokens.text}
              >
                Map coming soon
              </SizableText>
              <SizableText
                fontSize={11}
                color={beautyTokens.textMuted}
                style={{ fontFamily: 'monospace' } as any}
              >
                GOOGLE_MAPS_API_KEY
              </SizableText>
            </YStack>
          </YStack>
        </ScrollView>

        <BottomNav active="home" />
      </YStack>
    </BeautyShell>
  );
}
