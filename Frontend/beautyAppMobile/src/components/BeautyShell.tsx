/**
 * BeautyShell — phone-frame centering wrapper that mirrors the Angular
 * shell's `.beauty-app` layout on web. On native (iOS/Android) the shell
 * is just a full-bleed container; on web at ≥768px it's centered to a
 * 430px-wide column with a soft shadow, matching the Angular reference.
 */
import React from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { YStack } from 'tamagui';

import { beautyTokens } from '../../tamagui.config';

export interface BeautyShellProps {
  children: React.ReactNode;
}

export function BeautyShell({ children }: BeautyShellProps) {
  const { width } = useWindowDimensions();

  const isDesktopWeb = Platform.OS === 'web' && width >= 768;

  if (!isDesktopWeb) {
    return (
      <YStack flex={1} bg={beautyTokens.surface}>
        {children}
      </YStack>
    );
  }

  return (
    <YStack flex={1} items="center" justify="flex-start" bg="#f5f5f5">
      <YStack
        flex={1}
        width={beautyTokens.phoneMax}
        maxW={beautyTokens.phoneMax}
        bg={beautyTokens.surface}
        shadowColor="rgba(15, 35, 60, 0.15)"
        shadowOffset={{ width: 0, height: 0 }}
        shadowOpacity={1}
        shadowRadius={40}
      >
        {children}
      </YStack>
    </YStack>
  );
}
