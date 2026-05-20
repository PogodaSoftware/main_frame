import React from 'react';
import { Stack } from 'expo-router';

import { AuthGuard } from '@/components/guards/AuthGuard';

export default function BusinessLayout() {
  return (
    <AuthGuard requires="business">
      <Stack screenOptions={{ headerShown: false }} />
    </AuthGuard>
  );
}
