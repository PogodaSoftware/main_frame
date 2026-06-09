import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ProvCard } from './ProvCard';
import { beautyTokens } from '../../../tamagui.config';

export interface ProvEmptyHintProps {
  title: string;
  body?: string;
  children?: ReactNode;
}

export function ProvEmptyHint({ title, body, children }: ProvEmptyHintProps) {
  return (
    <ProvCard padding={20}>
      <View style={styles.wrap}>
        <View style={styles.bubble}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.accentBlueDeep} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
          </Svg>
        </View>
        <Text style={styles.title}>{title}</Text>
        {!!body && <Text style={styles.body}>{body}</Text>}
        {children}
      </View>
    </ProvCard>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  bubble: {
    width: 48, height: 48, borderRadius: 24,
    marginBottom: 10,
    backgroundColor: beautyTokens.accentBlue,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 20, fontWeight: '500',
    color: beautyTokens.text, marginBottom: 4, textAlign: 'center',
  },
  body: {
    fontSize: 12, color: beautyTokens.textMuted,
    marginBottom: 14, lineHeight: 18,
    fontFamily: beautyTokens.fontBody, textAlign: 'center',
  },
});
