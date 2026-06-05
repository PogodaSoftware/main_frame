/**
 * ChoiceRow — radio or checkbox row inside HeadedCard.
 * Mirrors Angular `.radio-row` / `.check-row` patterns.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { beautyTokens } from '../../../tamagui.config';

export interface ChoiceRowProps {
  kind: 'radio' | 'check';
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  first?: boolean;
  testID?: string;
}

export function ChoiceRow({ kind, label, sub, selected, onPress, first, testID }: ChoiceRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, !first && styles.rowBorder]}
      accessibilityRole={kind === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected }}
      testID={testID}
    >
      {kind === 'radio' ? (
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected && <View style={styles.radioDot} />}
        </View>
      ) : (
        <View style={[styles.check, selected && styles.checkOn]}>
          {selected && (
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5 12l4 4L19 7" />
            </Svg>
          )}
        </View>
      )}
      <View style={styles.text}>
        <Text style={[styles.label, selected && styles.labelOn]}>{label}</Text>
        {!!sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: beautyTokens.line },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.8, borderColor: beautyTokens.line,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  radioOn: { borderColor: beautyTokens.text },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: beautyTokens.text },
  check: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.8, borderColor: beautyTokens.line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  checkOn: { backgroundColor: beautyTokens.success, borderColor: beautyTokens.success },
  text: { flex: 1 },
  label: { fontSize: 14, fontWeight: '500', color: beautyTokens.text, fontFamily: beautyTokens.fontBody },
  labelOn: { fontWeight: '600' },
  sub: { fontSize: 12, color: beautyTokens.textMuted, marginTop: 2, fontFamily: beautyTokens.fontBody, lineHeight: 17 },
});
