/**
 * BeautyCard — white surface card. Mirrors Angular `.prov-card` and
 * `.prov-headed-card` (white bg, line border, 14px radius, 16px padding).
 * Optional `header` renders a divided heading row in the display font.
 */
import React from 'react';
import { Pressable } from 'react-native';
import { SizableText, YStack, type YStackProps } from 'tamagui';

import { beautyTokens } from '../../../tamagui.config';

export interface BeautyCardProps extends Omit<YStackProps, 'children'> {
  header?: React.ReactNode;
  children?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
}

export function BeautyCard({ header, children, onPress, testID, ...rest }: BeautyCardProps) {
  const inner = (
    <YStack
      testID={testID}
      bg={beautyTokens.white}
      borderWidth={1}
      borderColor={beautyTokens.line}
      rounded={14}
      overflow="hidden"
      {...rest}
    >
      {header ? (
        <YStack
          px={16}
          py={12}
          borderBottomWidth={1}
          borderBottomColor={beautyTokens.line}
        >
          {typeof header === 'string' ? (
            <SizableText fontSize={17} fontWeight="500" color={beautyTokens.text}>
              {header}
            </SizableText>
          ) : (
            header
          )}
        </YStack>
      ) : null}
      <YStack px={16} py={16} gap={12}>
        {children}
      </YStack>
    </YStack>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID ? `${testID}-pressable` : undefined}
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
}
