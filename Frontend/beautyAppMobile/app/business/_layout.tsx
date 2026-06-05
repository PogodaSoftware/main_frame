import React from 'react';
import { Stack } from 'expo-router';

import { AuthGuard } from '@/components/guards/AuthGuard';
import { SafeAreaShell } from '@/components/SafeAreaShell';

const SURFACE = '#F2F2F2';

/**
 * Business provider route group. Same edge-to-edge inset treatment as the
 * customer + admin layouts so the status bar doesn't overlap any header.
 */
export default function BusinessLayout() {
  return (
    <AuthGuard requires="business">
      <SafeAreaShell background={SURFACE} statusBarStyle="dark" padBottom>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: SURFACE },
          }}
        />
      </SafeAreaShell>
    </AuthGuard>
  );
}
