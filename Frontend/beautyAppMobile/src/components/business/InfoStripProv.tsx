/**
 * InfoStripProv — Angular `.info-strip` parity.
 * Light blue tint + info icon + text. Used in wizard steps.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { beautyTokens } from '../../../tamagui.config';

export function InfoStripProv({ children }: { children: string }) {
  return (
    <View style={styles.strip}>
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.accentBlueDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={12} r={9} />
        <Path d="M12 8v5M12 17v.01" />
      </Svg>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(207,227,245,0.6)',
    borderWidth: 1, borderColor: 'rgba(125,168,207,0.33)',
    borderRadius: 10, padding: 10, paddingHorizontal: 12,
  },
  text: { flex: 1, fontSize: 11, color: beautyTokens.accentBlueText, lineHeight: 17, fontFamily: beautyTokens.fontBody },
});
