import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { admTokens } from '@/components/admin/tokens';

/**
 * Admin portal lives behind a slate chrome. We're rendering edge-to-edge
 * (`edgeToEdgeEnabled: true` in app.json), so without a safe-area pad the
 * Android status bar overlapped the slate header on every screen.
 *
 * SafeAreaView with `edges={['top']}` adds the inset once for the whole
 * admin Stack and paints the inset region slate so the status icons sit on
 * the same dark band as the rest of the header. The bottom inset is
 * handled per screen by `AdmHomeIndicator`.
 */
export default function AdminPortalLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: admTokens.slate }}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: admTokens.slate }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: admTokens.surface },
          }}
        />
      </SafeAreaView>
    </View>
  );
}
