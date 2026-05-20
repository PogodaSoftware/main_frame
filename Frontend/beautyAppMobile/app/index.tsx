import React from 'react';
import { Redirect } from 'expo-router';
import { Spinner, YStack } from 'tamagui';

import { useSession } from '@/hooks/useSession';

export default function Index() {
  const { status } = useSession();

  if (status === 'unknown') {
    return (
      <YStack flex={1} items="center" justify="center">
        <Spinner />
      </YStack>
    );
  }
  if (status === 'customer') return <Redirect href="/(customer)/home" />;
  if (status === 'business') return <Redirect href="/(business)/home" />;
  return <Redirect href="/(auth)/login" />;
}
