import React from 'react';
import { Stack } from 'expo-router';

import { AuthGuard } from '@/components/guards/AuthGuard';

/**
 * Chats live outside the (customer) group so business sessions can also
 * reach them — the chats resolver is dual-role on the backend. Guard
 * accepts either user type.
 */
export default function ChatsLayout() {
  return (
    <AuthGuard requires={['customer', 'business']}>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthGuard>
  );
}
