import React from 'react';
import { useRouter } from 'expo-router';

import { ScreenRenderer } from '@/bff/ScreenRenderer';
import { useSession } from '@/hooks/useSession';

export default function BusinessLoginScreen() {
  const router = useRouter();
  const { hydrate } = useSession();
  return (
    <ScreenRenderer
      screen="beauty_business_login"
      onSuccess={async () => {
        await hydrate();
        router.replace('/');
      }}
    />
  );
}
