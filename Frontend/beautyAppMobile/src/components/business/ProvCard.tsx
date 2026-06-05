import React, { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { beautyTokens } from '../../../tamagui.config';

export interface ProvCardProps {
  padding?: number;
  style?: ViewStyle | ViewStyle[];
  children?: ReactNode;
}

export function ProvCard({ padding = 16, style, children }: ProvCardProps) {
  return (
    <View style={[styles.card, { padding }, style as ViewStyle]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: beautyTokens.line,
    borderRadius: 14,
  },
});
