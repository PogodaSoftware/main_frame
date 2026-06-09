/**
 * BeautyInput — labeled text field. Mirrors Angular `.biz-field` block
 * (Frontend/beautyApp/src/app/beauty/beauty-business-application.component.scss).
 * Renders eyebrow label, input/textarea, helper or error text, and an
 * optional required marker. Focus ring uses accent-blue-deep; error state
 * switches the border to danger.
 */
import React, { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { SizableText, XStack, YStack } from 'tamagui';

import { beautyTokens } from '../../../tamagui.config';

export interface BeautyInputProps
  extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label?: string;
  required?: boolean;
  helperText?: string;
  errorText?: string;
  multiline?: boolean;
  rows?: number;
  monospace?: boolean;
  testID?: string;
}

export const BeautyInput = forwardRef<TextInput, BeautyInputProps>(function BeautyInput(
  {
    label,
    required = false,
    helperText,
    errorText,
    multiline = false,
    rows = 3,
    monospace = false,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(errorText);
  const borderColor = hasError
    ? beautyTokens.danger
    : focused
      ? beautyTokens.accentBlueDeep
      : beautyTokens.line;

  return (
    <YStack gap={6}>
      {label ? (
        <XStack gap={4}>
          <SizableText
            fontSize={11}
            fontWeight="700"
            color={beautyTokens.textMuted}
            letterSpacing={1.2}
            textTransform="uppercase"
          >
            {label}
          </SizableText>
          {required ? (
            <SizableText fontSize={11} color={beautyTokens.danger}>
              *
            </SizableText>
          ) : null}
        </XStack>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={`${beautyTokens.textMuted}B3`}
        accessibilityLabel={label}
        accessibilityState={{ disabled: rest.editable === false }}
        multiline={multiline}
        numberOfLines={multiline ? rows : undefined}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          minHeight: multiline ? rows * 22 + 22 : 44,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 10 : 0,
          borderRadius: 10,
          borderWidth: 1,
          borderColor,
          backgroundColor: beautyTokens.white,
          fontSize: 14,
          color: beautyTokens.text,
          fontFamily: monospace
            ? 'ui-monospace, SF Mono, Menlo, monospace'
            : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
        {...rest}
      />
      {hasError ? (
        <SizableText fontSize={12} color={beautyTokens.danger}>
          {errorText}
        </SizableText>
      ) : helperText ? (
        <SizableText fontSize={12} color={beautyTokens.textMuted} lineHeight={17}>
          {helperText}
        </SizableText>
      ) : null}
    </YStack>
  );
});
