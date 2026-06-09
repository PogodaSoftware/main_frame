import React from 'react';
import { Stack } from 'expo-router';

import { SafeAreaShell } from '@/components/SafeAreaShell';

const SURFACE = '#F2F2F2';

/**
 * Auth route group (welcome / login / signup / forgot / business-login /
 * business-signup). Edge-to-edge top inset so the Android status bar
 * doesn't overlap the "Welcome back" / "Create account" headers.
 */
export default function AuthLayout() {
  return (
    <SafeAreaShell background={SURFACE} statusBarStyle="dark" padBottom>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: SURFACE },
        }}
      />
    </SafeAreaShell>
  );
}
