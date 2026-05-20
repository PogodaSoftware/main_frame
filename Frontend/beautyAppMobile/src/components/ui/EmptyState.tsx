/**
 * EmptyState — centered placeholder for empty lists. Mirrors Angular
 * `.empty-state` (beauty-search.component.ts line 324): centered text,
 * 24/16 padding, muted color, 13px font. Optional icon, title, and CTA.
 */
import React from 'react';
import { SizableText, YStack } from 'tamagui';

import { beautyTokens } from '../../../tamagui.config';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message?: React.ReactNode;
  action?: React.ReactNode;
  testID?: string;
}

export function EmptyState({ icon, title, message, action, testID }: EmptyStateProps) {
  return (
    <YStack testID={testID} px={16} py={24} items="center" justify="center" gap={10}>
      {icon ? <YStack mb={2}>{icon}</YStack> : null}
      {title ? (
        <SizableText fontSize={16} fontWeight="600" color={beautyTokens.text} text="center">
          {title}
        </SizableText>
      ) : null}
      {message ? (
        <SizableText
          fontSize={13}
          color={beautyTokens.textMuted}
          text="center"
          lineHeight={19}
        >
          {message}
        </SizableText>
      ) : null}
      {action ? <YStack mt={4}>{action}</YStack> : null}
    </YStack>
  );
}
