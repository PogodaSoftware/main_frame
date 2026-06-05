import React from 'react';
import { Stack } from 'expo-router';

import { AuthGuard } from '@/components/guards/AuthGuard';
import { SafeAreaShell } from '@/components/SafeAreaShell';

const SURFACE = '#F2F2F2'; // matches beautyTokens.surface

/**
 * Chats live outside the (customer) group so business sessions can also
 * reach them — the chats resolver is dual-role on the backend. Guard
 * accepts either user type. Edge-to-edge insets so chat headers clear the
 * status bar and the composer clears the gesture pill.
 */
export default function ChatsLayout() {
  return (
    <AuthGuard requires={['customer', 'business']}>
      <SafeAreaShell background={SURFACE} statusBarStyle="dark" padBottom>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaShell>
    </AuthGuard>
  );
}
