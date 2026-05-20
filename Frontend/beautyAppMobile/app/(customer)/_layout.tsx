import React from 'react';
import { Stack } from 'expo-router';

import { AuthGuard } from '@/components/guards/AuthGuard';

export default function CustomerLayout() {
  return (
    <AuthGuard requires="customer">
      <Stack screenOptions={{ headerShown: false }} />
    </AuthGuard>
  );
}
