/**
 * ProvBtn — business portal button. Mirrors Angular app-prov-btn variants.
 */
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { beautyTokens } from '../../../tamagui.config';

export type ProvBtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerOutline' | 'success' | 'editDark';
export type ProvBtnSize = 'sm' | 'md' | 'lg';

export interface ProvBtnProps {
  variant?: ProvBtnVariant;
  size?: ProvBtnSize;
  full?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: ReactNode;
}

export function ProvBtn({
  variant = 'primary',
  size = 'md',
  full = false,
  disabled = false,
  onPress,
  children,
}: ProvBtnProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.btn,
        sizeStyle.box,
        variantStyle.box,
        full && styles.full,
        disabled && styles.disabled,
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.label, sizeStyle.label, variantStyle.label]}>{children}</Text>
      ) : (
        <View style={styles.contentRow}>{children}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  full: { width: '100%', alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  contentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: {
    fontFamily: beautyTokens.fontBody,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

const SIZE_STYLES: Record<ProvBtnSize, { box: ViewStyle; label: TextStyle }> = {
  sm: { box: { height: 44, paddingHorizontal: 14 }, label: { fontSize: 12 } },
  md: { box: { height: 44, paddingHorizontal: 16 }, label: { fontSize: 13 } },
  lg: { box: { height: 48, paddingHorizontal: 20 }, label: { fontSize: 14 } },
};

const VARIANT_STYLES: Record<ProvBtnVariant, { box: ViewStyle; label: TextStyle }> = {
  primary: {
    box: { backgroundColor: beautyTokens.text, borderWidth: 1, borderColor: beautyTokens.text },
    label: { color: '#FFFFFF' },
  },
  secondary: {
    box: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: beautyTokens.line },
    label: { color: beautyTokens.text },
  },
  ghost: {
    box: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'transparent' },
    label: { color: beautyTokens.text },
  },
  danger: {
    box: { backgroundColor: beautyTokens.danger, borderWidth: 1, borderColor: beautyTokens.danger },
    label: { color: '#FFFFFF' },
  },
  dangerOutline: {
    box: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(192, 57, 43, 0.33)' },
    label: { color: beautyTokens.danger },
  },
  success: {
    box: { backgroundColor: '#2F7A47', borderWidth: 1, borderColor: '#2F7A47' },
    label: { color: '#FFFFFF' },
  },
  // Darker outline for the Edit affordance — crisp ink border (the plain
  // `secondary` hairline read as too faint).
  editDark: {
    box: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: beautyTokens.text },
    label: { color: beautyTokens.text },
  },
};
