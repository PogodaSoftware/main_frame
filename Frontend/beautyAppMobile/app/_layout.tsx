import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from 'tamagui';
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
  useFonts as useCormorantFonts,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import tamaguiConfig from '../tamagui.config';
import { useSession } from '@/hooks/useSession';
import { setOnAuthFailure } from '@/services/api';
import { LoadingScreen } from '@/components/ui';

const AUTH_PATH_PREFIXES = ['/login', '/signup', '/business-login', '/business-signup', '/welcome', '/forgot'];

function isOnAuthRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return AUTH_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function RootLayout() {
  const { hydrate, clear } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [fontsLoaded] = useCormorantFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
  });

  useEffect(() => {
    hydrate();
    setOnAuthFailure(() => {
      clear();
      // Don't bounce the user out of an auth screen they're already on
      // (signup / forgot / business-login etc). The 401 on
      // `/protected/me/` is expected for unauthenticated visitors and
      // shouldn't kick them off a sibling auth route.
      if (!isOnAuthRoute(pathname)) {
        router.replace('/(auth)/login');
      }
    });
  }, [pathname]);

  if (!fontsLoaded) {
    return (
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <LoadingScreen message="Loading…" />
      </TamaguiProvider>
    );
  }

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(business)" />
      </Stack>
      <StatusBar style="auto" />
    </TamaguiProvider>
  );
}
