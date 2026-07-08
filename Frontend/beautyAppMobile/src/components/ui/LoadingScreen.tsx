/**
 * LoadingScreen — full-bleed loading placeholder. Used while routes
 * hydrate or while BFF fetches block first paint. Matches the Angular
 * `.status` neutral muted look from beauty-search.component.ts.
 */
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { SizableText, YStack } from 'tamagui';

import { beautyTokens } from '../../../tamagui.config';

export interface LoadingScreenProps {
  message?: string;
  inline?: boolean;
}

export function LoadingScreen({ message = 'Loading…', inline = false }: LoadingScreenProps) {
  return (
    <YStack
      flex={inline ? undefined : 1}
      py={inline ? 24 : 0}
      bg={inline ? 'transparent' : beautyTokens.surface}
      items="center"
      justify="center"
      gap={12}
    >
      <ActivityIndicator size="large" color={beautyTokens.accentBlueDeep} />
      <SizableText fontSize={13} color={beautyTokens.textMuted}>
        {message}
      </SizableText>
    </YStack>
  );
}
