import React from 'react';
import { Stack } from 'expo-router';

import { admTokens } from '@/components/admin/tokens';
import { SafeAreaShell } from '@/components/SafeAreaShell';

/**
 * Admin portal lives behind a slate chrome. We're rendering edge-to-edge
 * (`edgeToEdgeEnabled: true` in app.json), so without a safe-area pad the
 * Android status bar overlapped the slate header on every screen.
 *
 * The shell adds the top inset once for the whole admin Stack and paints
 * the inset region slate so the status icons sit on the same dark band as
 * the rest of the header. The bottom inset is handled per screen by
 * `AdmHomeIndicator`, so `padBottom={false}` avoids double padding.
 */
export default function AdminPortalLayout() {
  return (
    <SafeAreaShell
      background={admTokens.slate}
      statusBarStyle="light"
      clampTopToStatusBar
      topPad={0}
      padBottom={false}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: admTokens.surface },
        }}
      />
    </SafeAreaShell>
  );
}
