/**
 * HeadedCard — Angular `.prov-headed-card` parity. White rounded card with
 * a darker head row (label like "Are you applying as…") and body content.
 */
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { beautyTokens } from '../../../tamagui.config';

export interface HeadedCardProps {
  head: string;
  children?: ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export function HeadedCard({ head, children, style }: HeadedCardProps) {
  return (
    <View style={[styles.card, style as ViewStyle]}>
      <Text style={styles.head}>{head}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 14,
    overflow: 'hidden',
  },
  head: {
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6,
    fontSize: 11, fontWeight: '600',
    letterSpacing: 0.6, color: beautyTokens.textMuted,
    fontFamily: beautyTokens.fontBody,
    textTransform: 'uppercase',
  },
  body: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 6 },
});
