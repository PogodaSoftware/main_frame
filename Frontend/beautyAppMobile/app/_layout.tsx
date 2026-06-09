import 'react-native-gesture-handler';
import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { Stack, usePathname, useRouter, type ErrorBoundaryProps } from 'expo-router';
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
import { BeautyErrorScreen } from '@/components/BeautyErrorScreen';
import { ChatToastHost } from '@/components/ChatToastHost';
import { getOffline, setOffline, subscribeOffline } from '@/services/connectivity';

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

/**
 * Root error boundary — expo-router renders this in place of a route that
 * throws during render. Shows the branded `error-generic` surface.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <BeautyErrorScreen
          eyebrow="Something went wrong"
          title="We hit a snag"
          body="Don't worry — your bookings and account are safe. Give it another try, or head back home."
          code={`ERR_5XX · ${(error?.message || 'session preserved').slice(0, 40)}`}
          iconName="alert"
          onRetry={retry}
          showNav
        />
        <StatusBar style="auto" />
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}

/**
 * Overlays the branded `error-offline` surface whenever a request fails
 * with a network error (no HTTP response). "Try again" clears the flag so
 * the next fetch can re-establish connectivity.
 */
function OfflineGate({ children }: { children: React.ReactNode }) {
  const offline = useSyncExternalStore(subscribeOffline, getOffline, getOffline);
  return (
    <View style={{ flex: 1 }}>
      {children}
      {offline ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <BeautyErrorScreen
            eyebrow="No connection"
            title="You're offline"
            body="Check your Wi-Fi or cellular signal. Your draft booking has been saved locally."
            code="ERR_NET · retrying…"
            iconName="alert"
            retryLabel="Try again"
            onRetry={() => setOffline(false)}
            showNav
            showBack={false}
          />
        </View>
      ) : null}
    </View>
  );
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
        <OfflineGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(customer)" />
            <Stack.Screen name="business" />
            <Stack.Screen name="admin" />
          </Stack>
        </OfflineGate>
        <ChatToastHost />
        <StatusBar style="auto" />
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}
