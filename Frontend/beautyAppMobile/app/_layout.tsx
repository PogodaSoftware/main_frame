import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
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

import { SafeAreaProvider } from 'react-native-safe-area-context';

import tamaguiConfig from '../tamagui.config';
import { useSession } from '@/hooks/useSession';
import { setOnAuthFailure } from '@/services/api';
import { LoadingScreen } from '@/components/ui';

const AUTH_PATH_PREFIXES = [
  '/login',
  '/signup',
  '/business-login',
  '/business-signup',
  '/welcome',
  '/forgot',
  '/admin/portal/signin',
  '/admin/portal/2fa',
  '/admin/portal/magic',
  '/admin/portal/ip-warning',
];

function isOnAuthRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return AUTH_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function RootLayout() {
  const { hydrate, clear } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
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
    // Run once on mount. `pathnameRef` keeps the handler reading the
    // live route without re-running `hydrate()` on every nav (which
    // would otherwise rate-limit `/protected/me/` + `/session/refresh/`).
    hydrate();
    setOnAuthFailure(() => {
      clear();
      // Don't bounce the user out of an auth screen they're already on
      // (signup / forgot / business-login etc). The 401 on
      // `/protected/me/` is expected for unauthenticated visitors and
      // shouldn't kick them off a sibling auth route.
      if (!isOnAuthRoute(pathnameRef.current)) {
        router.replace('/(auth)/login');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
          <LoadingScreen message="Loading…" />
        </TamaguiProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(customer)" />
          <Stack.Screen name="business" />
          <Stack.Screen name="admin" />
        </Stack>
        <StatusBar style="auto" />
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}
