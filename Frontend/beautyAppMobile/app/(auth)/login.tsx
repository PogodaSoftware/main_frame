import React from 'react';
import { useRouter, Stack } from 'expo-router';

import { ScreenRenderer } from '@/bff/ScreenRenderer';
import { useSession } from '@/hooks/useSession';
import { BeautyShell } from '@/components/BeautyShell';

export default function LoginScreen() {
  const router = useRouter();
  const { hydrate } = useSession();
  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenRenderer
        screen="beauty_login"
        onSuccess={async () => {
          await hydrate();
          router.replace('/' as any);
        }}
      />
    </BeautyShell>
  );
}
