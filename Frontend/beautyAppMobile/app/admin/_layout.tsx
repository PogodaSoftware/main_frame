import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { admTokens } from '@/components/admin/tokens';

/**
 * Admin route group root. The /portal subtree has its own slate-themed
 * SafeAreaView in `portal/_layout.tsx`; siblings like /flags (which uses a
 * lighter chrome) inherit the same top inset here so the status bar doesn't
 * overlap content under edge-to-edge.
 */
export default function AdminLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: admTokens.slate }}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: admTokens.slate }}>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaView>
    </View>
  );
}
