/**
 * ProvSubHeader — sub-page header for business portal (back chevron + title).
 * Mirrors Angular app-prov-sub-header.
 */
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { beautyTokens } from '../../../tamagui.config';

export interface ProvSubHeaderProps {
  back?: string;
  title: string;
  onBackPress?: () => void;
  right?: ReactNode;
}

export function ProvSubHeader({ back = 'Dashboard', title, onBackPress, right }: ProvSubHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={`Back to ${back}`}
        onPress={onBackPress}
        style={styles.backBtn}
      >
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
        <Text style={styles.backText}>{back}</Text>
      </Pressable>
      <View style={styles.spacer} />
      {right}
      <View style={styles.titleWrap} pointerEvents="none">
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: beautyTokens.surface,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: beautyTokens.line,
  },
  backBtn: {
    minHeight: 44,
    paddingLeft: 6,
    paddingRight: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: beautyTokens.textMuted,
    fontFamily: beautyTokens.fontBody,
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    fontFamily: beautyTokens.fontDisplay,
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: beautyTokens.text,
    lineHeight: 24,
  },
  spacer: { flex: 1 },
  titleWrap: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
});
