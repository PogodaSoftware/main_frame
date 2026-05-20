/**
 * Toast — transient in-app banner. Loosely mirrors Angular
 * `beauty-provider-new-message-toast.component` (drag-handle, white card,
 * eyebrow + body + actions), trimmed to a single reusable atom.
 *
 * Render as an absolutely-positioned overlay, near the top of the screen.
 * Auto-dismiss is the caller's responsibility — pass `onDismiss` to wire it.
 */
import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import { SizableText, XStack, YStack } from 'tamagui';

import { beautyTokens } from '../../../tamagui.config';

export type ToastTone = 'info' | 'success' | 'danger';

export interface ToastProps {
  tone?: ToastTone;
  title?: string;
  message?: React.ReactNode;
  visible: boolean;
  durationMs?: number;
  onDismiss?: () => void;
  action?: { label: string; onPress: () => void };
}

const TONE_BAR: Record<ToastTone, any> = {
  info: beautyTokens.accentBlueDeep,
  success: beautyTokens.success,
  danger: beautyTokens.danger,
};

export function Toast({
  tone = 'info',
  title,
  message,
  visible,
  durationMs = 4000,
  onDismiss,
  action,
}: ToastProps) {
  useEffect(() => {
    if (!visible || !onDismiss || durationMs <= 0) return;
    const id = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(id);
  }, [visible, durationMs, onDismiss]);

  if (!visible) return null;

  return (
    <YStack
      position="absolute"
      t={56}
      l={12}
      r={12}
      z={9999}
      bg={beautyTokens.white}
      rounded={14}
      borderWidth={1}
      borderColor={beautyTokens.line}
      shadowColor="rgba(15, 35, 60, 0.18)"
      shadowOffset={{ width: 0, height: 4 }}
      shadowRadius={20}
      shadowOpacity={1}
      overflow="hidden"
    >
      <YStack height={3} bg={TONE_BAR[tone]} />
      <XStack p={14} gap={12} items="flex-start">
        <YStack flex={1} gap={2}>
          {title ? (
            <SizableText fontSize={14} fontWeight="700" color={beautyTokens.text}>
              {title}
            </SizableText>
          ) : null}
          {message ? (
            <SizableText fontSize={13} color={beautyTokens.textMuted} lineHeight={19}>
              {message}
            </SizableText>
          ) : null}
        </YStack>
        {action ? (
          <Pressable onPress={action.onPress} accessibilityRole="button">
            <SizableText
              fontSize={13}
              fontWeight="700"
              color={beautyTokens.accentBlueText}
            >
              {action.label}
            </SizableText>
          </Pressable>
        ) : null}
        {onDismiss ? (
          <Pressable
            onPress={onDismiss}
            accessibilityLabel="Dismiss"
            accessibilityRole="button"
            hitSlop={8}
          >
            <SizableText fontSize={16} color={beautyTokens.textMuted}>
              ✕
            </SizableText>
          </Pressable>
        ) : null}
      </XStack>
    </YStack>
  );
}
