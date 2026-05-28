import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthGuard } from '@/components/guards/AuthGuard';

const SURFACE = '#F2F2F2';

/**
 * Business provider route group. Same edge-to-edge inset treatment as the
 * customer + admin layouts so the status bar doesn't overlap any header.
 */
export default function BusinessLayout() {
  return (
    <AuthGuard requires="business">
      <View style={{ flex: 1, backgroundColor: SURFACE }}>
        <StatusBar style="dark" />
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: SURFACE }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: SURFACE },
            }}
          />
        </SafeAreaView>
      </View>
    </AuthGuard>
  );
}
