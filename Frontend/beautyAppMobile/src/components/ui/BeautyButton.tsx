/**
 * BeautyButton — primary action surface. Mirrors Angular `.btn` system
 * (Frontend/beautyApp/src/styles.scss). Variants map 1:1 to the SCSS:
 *   confirm / delete / neutral / outline / outline-success / outline-danger / link
 * Sizes map to .btn--size-{sm,md,lg}. `loading` shows a spinner and disables.
 */
import React from 'react';
import { ActivityIndicator, Pressable, type GestureResponderEvent } from 'react-native';
import { SizableText, XStack } from 'tamagui';

import { beautyTokens } from '../../../tamagui.config';

export type BeautyButtonVariant =
  | 'confirm'
  | 'delete'
  | 'neutral'
  | 'outline'
  | 'outline-success'
  | 'outline-danger'
  | 'link';

export type BeautyButtonSize = 'sm' | 'md' | 'lg';

export interface BeautyButtonProps {
  variant?: BeautyButtonVariant;
  size?: BeautyButtonSize;
  loading?: boolean;
  disabled?: boolean;
  onPress?: (e: GestureResponderEvent) => void;
  children?: React.ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

interface VariantStyle {
  bg: any;
  bgPress: any;
  border: any;
  color: any;
}

const VARIANTS: Record<BeautyButtonVariant, VariantStyle> = {
  confirm: {
    bg: beautyTokens.success,
    bgPress: beautyTokens.successDeep,
    border: beautyTokens.success,
    color: beautyTokens.white,
  },
  delete: {
    bg: beautyTokens.danger,
    bgPress: '#802519',
    border: beautyTokens.danger,
    color: beautyTokens.white,
  },
  neutral: {
    bg: beautyTokens.ink,
    bgPress: '#000000',
    border: beautyTokens.ink,
    color: beautyTokens.white,
  },
  outline: {
    bg: 'transparent',
    bgPress: 'rgba(10, 10, 11, 0.12)',
    border: beautyTokens.ink,
    color: beautyTokens.ink,
  },
  'outline-success': {
    bg: 'transparent',
    bgPress: 'rgba(47, 122, 71, 0.12)',
    border: beautyTokens.success,
    color: beautyTokens.successHover,
  },
  'outline-danger': {
    bg: 'transparent',
    bgPress: 'rgba(192, 57, 43, 0.12)',
    border: beautyTokens.danger,
    color: beautyTokens.danger,
  },
  link: {
    bg: 'transparent',
    bgPress: 'transparent',
    border: 'transparent',
    color: beautyTokens.ink,
  },
};

const SIZES: Record<BeautyButtonSize, { h: number; px: number; fs: number }> = {
  sm: { h: 32, px: 12, fs: 13 },
  md: { h: 40, px: 16, fs: 14 },
  lg: { h: 48, px: 22, fs: 16 },
};

export function BeautyButton({
  variant = 'confirm',
  size = 'md',
  loading = false,
  disabled = false,
  onPress,
  children,
  fullWidth = false,
  accessibilityLabel,
  testID,
}: BeautyButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const isLink = variant === 'link';
  const inactive = loading || disabled;

  return (
    <Pressable
      testID={testID}
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => ({
        opacity: inactive ? 0.55 : 1,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
      })}
    >
      {({ pressed }) => (
        <XStack
          items="center"
          justify="center"
          gap={8}
          height={isLink ? undefined : s.h}
          minH={isLink ? undefined : 44}
          px={isLink ? 0 : s.px}
          rounded={isLink ? 0 : 10}
          bg={pressed && !inactive ? v.bgPress : v.bg}
          borderWidth={isLink ? 0 : 1.5}
          borderColor={v.border}
        >
          {loading ? <ActivityIndicator size="small" color={v.color} /> : null}
          <SizableText
            color={v.color}
            fontWeight="600"
            fontSize={s.fs}
            textDecorationLine={isLink ? 'underline' : 'none'}
          >
            {children}
          </SizableText>
        </XStack>
      )}
    </Pressable>
  );
}
