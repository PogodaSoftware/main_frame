import React from 'react';
import { useRouter } from 'expo-router';

import { ScreenRenderer } from '@/bff/ScreenRenderer';
import { useSession } from '@/hooks/useSession';

export default function SignupScreen() {
  const router = useRouter();
  const { hydrate } = useSession();
  return (
    <ScreenRenderer
      screen="beauty_signup"
      onSuccess={async () => {
        await hydrate();
        router.replace('/');
      }}
    />
  );
}
