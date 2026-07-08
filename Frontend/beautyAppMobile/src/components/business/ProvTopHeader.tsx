/**
 * ProvTopHeader — top bar for business portal screens.
 * Mirrors Angular app-prov-top-header (brand mark + Beauty + Business Portal pill + bell).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { beautyTokens } from '../../../tamagui.config';

export interface ProvTopHeaderProps {
  badge?: number | null;
  bellLabel?: string;
  onBellPress?: () => void;
}

export function ProvTopHeader({ badge = null, bellLabel = 'Notifications', onBellPress }: ProvTopHeaderProps) {
  const showBadge = !!badge && badge > 0;
  return (
    <View style={styles.header}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.text} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={4} y={3} width={16} height={18} rx={2} />
        <Path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2" />
      </Svg>
      <Text style={styles.brandName}>Beauty</Text>
      <View style={styles.businessBadge}>
        <Text style={styles.businessBadgeText}>BUSINESS PORTAL</Text>
      </View>
      <View style={styles.spacer} />
      <Pressable
        accessibilityLabel={bellLabel}
        onPress={onBellPress}
        style={styles.bellBtn}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <Path d="M10 21a2 2 0 0 0 4 0" />
        </Svg>
        {showBadge && (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>{badge}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: beautyTokens.surface,
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: beautyTokens.line,
  },
  brandName: {
    fontFamily: beautyTokens.fontDisplay,
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: beautyTokens.text,
    lineHeight: 22,
  },
  businessBadge: {
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(125, 168, 207, 0.33)',
    backgroundColor: beautyTokens.accentBlue,
  },
  businessBadgeText: {
    fontFamily: beautyTokens.fontBody,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: beautyTokens.accentBlueText,
  },
  spacer: { flex: 1 },
  bellBtn: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: beautyTokens.danger,
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    fontFamily: beautyTokens.fontBody,
  },
});
