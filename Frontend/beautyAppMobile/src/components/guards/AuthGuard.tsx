import React from 'react';
import { Redirect } from 'expo-router';
import { Spinner, YStack } from 'tamagui';

import type { UserType } from '@/services/auth';
import { useSession } from '@/hooks/useSession';

export interface AuthGuardProps {
  requires: UserType;
  children: React.ReactNode;
}

export function AuthGuard({ requires, children }: AuthGuardProps) {
  const { status } = useSession();

  if (status === 'unknown') {
    return (
      <YStack flex={1} items="center" justify="center">
        <Spinner />
      </YStack>
    );
  }
  if (status !== requires) {
    return <Redirect href="/(auth)/login" />;
  }
  return <>{children}</>;
}
