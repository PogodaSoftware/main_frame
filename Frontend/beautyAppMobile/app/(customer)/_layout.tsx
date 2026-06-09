import React from 'react';
import { Stack } from 'expo-router';

import { AuthGuard } from '@/components/guards/AuthGuard';
import { SafeAreaShell } from '@/components/SafeAreaShell';

const SURFACE = '#F2F2F2';

/**
 * Customer route group. App renders edge-to-edge so the Android status bar
 * was overlapping every header. Pad the top inset with the surface color
 * once for the whole group; per-screen headers paint on top of it.
 */
export default function CustomerLayout() {
  return (
    <AuthGuard requires="customer">
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
