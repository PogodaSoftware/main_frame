import React from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface SafeAreaShellProps {
  children: React.ReactNode;
  /** Surface color painted behind the inset regions. */
  background: string;
  statusBarStyle?: 'light' | 'dark';
  /** Extra padding added on top of insets.top (matches the old paddingTop:8). */
  topPad?: number;
  /** Pad the bottom inset here. Disable when a child handles it (admin). */
  padBottom?: boolean;
  /**
   * Android only. `react-native-safe-area-context` over-reports the top
   * inset under edge-to-edge on some devices/emulators (~2× the real status
   * bar), leaving a dead band above the header. When true, clamp the top pad
   * down to a tight status-bar clearance (`TIGHT_TOP_DP`) so the header sits
   * right under the status icons. Never pads more than the reported inset.
   */
  clampTopToStatusBar?: boolean;
}

/**
 * Minimal slate clearance (dp) under the Android status icons for the admin
 * chrome. Big enough that the clock/battery never overlap the header row,
 * tight enough to kill the phantom band the bloated inset leaves behind.
 */
const TIGHT_TOP_DP = 44;

/**
 * Hook-based safe-area shell. Replaces the brittle native `SafeAreaView`
 * recipe: under Android edge-to-edge + Fabric/new-arch, native SafeAreaView
 * fails to apply insets reliably around scrollable content. Expo SDK 54
 * guidance is to consume `useSafeAreaInsets()` as padding on a plain View.
 * See https://docs.expo.dev/versions/v54.0.0/sdk/safe-area-context/
 */
export function SafeAreaShell({
  children,
  background,
  statusBarStyle = 'dark',
  topPad = 8,
  padBottom = true,
  clampTopToStatusBar = false,
}: SafeAreaShellProps) {
  const insets = useSafeAreaInsets();
  // Under Android edge-to-edge + bridgeless/Fabric, `useSafeAreaInsets().top`
  // can come back bloated (~2× the real status bar) and `StatusBar.currentHeight`
  // is unreliable. When the caller opts in, pad a fixed tight clearance instead
  // of trusting either value, so the header sits right under the status icons.
  const topInset =
    clampTopToStatusBar && Platform.OS === 'android'
      ? Math.min(insets.top, TIGHT_TOP_DP)
      : insets.top;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: background,
        paddingTop: topInset + topPad,
        paddingBottom: padBottom ? insets.bottom : 0,
      }}
    >
      <StatusBar style={statusBarStyle} />
      {children}
    </View>
  );
}
