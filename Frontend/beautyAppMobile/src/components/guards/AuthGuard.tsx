import React from 'react';
import { Redirect } from 'expo-router';
import { Spinner, YStack } from 'tamagui';

import type { UserType } from '@/services/auth';
import { useSession } from '@/hooks/useSession';

export interface AuthGuardProps {
  /**
   * Single user type, or a list — useful for screens that serve both
   * customer and business sessions (e.g. /chats).
   */
  requires: UserType | UserType[];
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
  const allowed = Array.isArray(requires) ? requires : [requires];
  if (!allowed.includes(status as UserType)) {
    return <Redirect href="/(auth)/login" />;
  }
  return <>{children}</>;
}
