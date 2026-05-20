/**
 * WeeklyHoursGrid — standalone 7-day weekly hours editor.
 *
 * Accepts an array of WeeklyHourRow (Mon=0 … Sun=6) and fires onChange
 * whenever a row is mutated. Extracted from the wizard schedule.tsx so
 * it can be reused on the business availability screen.
 */
import React from 'react';
import { Switch } from 'react-native';
import { Input, SizableText, XStack, YStack } from 'tamagui';

import { beautyTokens } from '../../../tamagui.config';
import type { WeeklyHourRow } from '@/services/businessApply';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface WeeklyHoursGridProps {
  rows: WeeklyHourRow[];
  onChange: (rows: WeeklyHourRow[]) => void;
}

export function WeeklyHoursGrid({ rows, onChange }: WeeklyHoursGridProps) {
  const update = (idx: number, patch: Partial<WeeklyHourRow>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  };

  return (
    <YStack gap="$3">
      {rows.map((row, idx) => (
        <YStack
          key={row.day_of_week}
          bg={beautyTokens.white}
          borderWidth={1}
          borderColor={beautyTokens.line}
          rounded={12}
          px="$3"
          py="$3"
          gap="$2"
        >
          <XStack items="center" justify="space-between">
            <SizableText fontWeight="600" color={beautyTokens.text} fontSize={14}>
              {DAY_LABELS[row.day_of_week]}
            </SizableText>
            <XStack items="center" gap="$2">
              <SizableText fontSize={12} color={beautyTokens.textMuted}>
                {row.is_closed ? 'Closed' : 'Open'}
              </SizableText>
              <Switch
                value={!row.is_closed}
                onValueChange={(open) => update(idx, { is_closed: !open })}
                trackColor={{ false: beautyTokens.line, true: beautyTokens.successHover }}
                thumbColor={beautyTokens.white}
              />
            </XStack>
          </XStack>

          {!row.is_closed && (
            <XStack gap="$2" items="center">
              <YStack flex={1} gap={4}>
                <SizableText fontSize={11} color={beautyTokens.textMuted}>
                  Opens
                </SizableText>
                <Input
                  size="$3"
                  value={row.start_time}
                  onChangeText={(v) => update(idx, { start_time: v })}
                  placeholder="09:00"
                  keyboardType="numbers-and-punctuation"
                  color={beautyTokens.text}
                  borderColor={beautyTokens.line}
                />
              </YStack>
              <SizableText mt="$4" color={beautyTokens.textMuted}>–</SizableText>
              <YStack flex={1} gap={4}>
                <SizableText fontSize={11} color={beautyTokens.textMuted}>
                  Closes
                </SizableText>
                <Input
                  size="$3"
                  value={row.end_time}
                  onChangeText={(v) => update(idx, { end_time: v })}
                  placeholder="18:00"
                  keyboardType="numbers-and-punctuation"
                  color={beautyTokens.text}
                  borderColor={beautyTokens.line}
                />
              </YStack>
            </XStack>
          )}
        </YStack>
      ))}
    </YStack>
  );
}
