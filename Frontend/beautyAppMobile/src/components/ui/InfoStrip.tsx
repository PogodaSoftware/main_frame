/**
 * InfoStrip — baby-blue translucent helper strip. Mirrors Angular
 * `.info-strip` (beauty-business-application.component.scss line 410):
 *   - background rgba(207,227,245,0.5)
 *   - 1px border rgba(125,168,207,0.25)
 *   - 10px radius, 10/12 padding, small muted text
 *
 * Accepts an optional leading icon node and arbitrary text children.
 */
import React from 'react';
import { SizableText, XStack } from 'tamagui';

import { beautyTokens } from '../../../tamagui.config';

export type InfoStripTone = 'info' | 'success' | 'danger' | 'warning';

export interface InfoStripProps {
  icon?: React.ReactNode;
  children?: React.ReactNode;
  tone?: InfoStripTone;
  testID?: string;
}

const TONES = {
  info: {
    bg: 'rgba(207,227,245,0.5)',
    border: 'rgba(125,168,207,0.25)',
    color: beautyTokens.textMuted,
  },
  success: {
    bg: beautyTokens.successBg,
    border: 'rgba(47,122,71,0.25)',
    color: beautyTokens.successDeep,
  },
  danger: {
    bg: beautyTokens.dangerBg,
    border: 'rgba(192,57,43,0.25)',
    color: beautyTokens.danger,
  },
  warning: {
    bg: beautyTokens.warningBg,
    border: beautyTokens.warning,
    color: beautyTokens.warningText,
  },
} as const;

export function InfoStrip({ icon, children, tone = 'info', testID }: InfoStripProps) {
  const t = TONES[tone];
  return (
    <XStack
      testID={testID}
      bg={t.bg}
      borderWidth={1}
      borderColor={t.border}
      rounded={10}
      px={12}
      py={10}
      gap={8}
      items="flex-start"
    >
      {icon ? <XStack pt={1}>{icon}</XStack> : null}
      <SizableText flex={1} fontSize={12} lineHeight={18} color={t.color}>
        {children}
      </SizableText>
    </XStack>
  );
}
