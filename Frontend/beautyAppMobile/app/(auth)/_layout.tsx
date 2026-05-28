import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const SURFACE = '#F2F2F2';

/**
 * Auth route group (welcome / login / signup / forgot / business-login /
 * business-signup). Edge-to-edge top inset so the Android status bar
 * doesn't overlap the "Welcome back" / "Create account" headers.
 */
export default function AuthLayout() {
  return (
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
  );
}
