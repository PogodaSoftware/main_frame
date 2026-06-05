import React from 'react';
import { Stack } from 'expo-router';

/**
 * Admin route group root. Intentionally a plain pass-through Stack — the
 * only subtree is `/portal`, whose own `portal/_layout.tsx` supplies the
 * slate-themed `SafeAreaShell` (top inset + status-bar clamp). Wrapping a
 * second shell here double-padded the top inset, leaving a dead band above
 * the header.
 */
export default function AdminLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
