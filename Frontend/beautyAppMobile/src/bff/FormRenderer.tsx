/**
 * FormRenderer — Angular-parity auth form layout.
 *
 * Renders BFF-driven login/signup forms with the brand chrome:
 *   - Beauty mark (black rounded tile + sparkle) + serif title
 *   - Serif H2 (form.title) + muted subtitle (form.subtitle)
 *   - Uppercase gray field labels with rounded white pill inputs
 *   - SHOW/HIDE toggle inside password inputs
 *   - Disabled gray pill until valid, primary green pill when enabled
 *   - OR divider + Continue with Google placeholder
 *   - Footer links rendered from form.footer_links
 */
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import {
  Button,
  H1,
  H2,
  Input,
  Paragraph,
  ScrollView,
  Separator,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';

import { beautyTokens } from '../../tamagui.config';
import { getDeviceId } from '@/services/deviceId';
import type { BffForm } from '@/bff/types';
import { dispatchLink, navigateToScreen } from '@/bff/linkAction';

export interface FormRendererProps {
  form: BffForm;
  onSuccess: (response: unknown) => void;
}

const FOOTER_TARGET_SCREEN: Record<string, string> = {
  signup: 'beauty_signup',
  login: 'beauty_login',
  business_login: 'beauty_business_login',
  business_signup: 'beauty_business_signup',
  customer_login: 'beauty_login',
  forgot: 'beauty_forgot',
};

export function FormRenderer({ form, onSuccess }: FormRendererProps) {
  const router = useRouter();
  const { control, handleSubmit, formState } = useForm({
    mode: 'onChange',
    defaultValues: Object.fromEntries(form.fields.map((f) => [f.name, ''])),
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [shownPasswords, setShownPasswords] = useState<Record<string, boolean>>({});

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setPending(true);
    const body: Record<string, unknown> = { ...values };
    if (form.include_device_id) {
      body.device_id = await getDeviceId();
    }
    const result = await dispatchLink(form.submit, body);
    setPending(false);
    if (result.ok) {
      onSuccess(result.data);
      return;
    }
    const statusKey = String(result.status ?? '');
    const msg =
      (form.error_status_map && form.error_status_map[statusKey]) ??
      form.error_default ??
      'Request failed.';
    setSubmitError(msg);
  });

  const presentation = (form.presentation ?? {}) as Record<string, unknown>;
  const showBackBar = Boolean(presentation.show_back_bar);
  const showForgotLink = Boolean(presentation.show_forgot_link);
  const showOrDivider = presentation.show_or_divider !== false;
  const showSocial = presentation.show_social !== false;
  const showTermsCheckbox = Boolean(presentation.show_terms_checkbox);
  const brandBadge = (presentation.brand_block_badge as string) || null;
  const socialLabel =
    (presentation.social_button_label as string) ?? 'Continue with Google';
  const [termsAccepted, setTermsAccepted] = useState(false);

  const canSubmit =
    formState.isValid && !pending && (!showTermsCheckbox || termsAccepted);

  return (
    <ScrollView flex={1} bg={beautyTokens.surface}>
      <YStack p="$4" gap="$3" maxW={beautyTokens.phoneMax} self="center" width="100%">
        {/* Back bar */}
        {showBackBar ? (
          <XStack height={28}>
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Back"
              accessibilityRole="button"
              testID="form-back"
              hitSlop={8}
            >
              <SizableText fontSize={22} color={beautyTokens.text}>
                ‹
              </SizableText>
            </Pressable>
          </XStack>
        ) : null}

        {/* Brand mark */}
        <YStack items="center" gap="$2" mt="$3">
          <YStack
            width={56}
            height={56}
            bg={beautyTokens.ink}
            rounded={14}
            items="center"
            justify="center"
          >
            <SizableText color={beautyTokens.white} fontSize={28}>
              ✦
            </SizableText>
          </YStack>
          <SizableText
            fontFamily="$heading"
            fontSize={24}
            color={beautyTokens.text}
          >
            Beauty
          </SizableText>
          {brandBadge ? (
            <YStack
              px={10}
              py={3}
              rounded={999}
              bg={beautyTokens.accentBlue}
              borderWidth={1}
              borderColor="rgba(125,168,207,0.35)"
              testID="form-brand-badge"
            >
              <SizableText
                fontSize={9}
                fontWeight="700"
                letterSpacing={1.4}
                textTransform="uppercase"
                color={beautyTokens.accentBlueText}
              >
                {brandBadge}
              </SizableText>
            </YStack>
          ) : null}
        </YStack>

        {/* Title + subtitle */}
        <YStack gap="$1" mt="$2">
          <H1
            fontFamily="$heading"
            fontSize={32}
            fontWeight="500"
            color={beautyTokens.text}
          >
            {form.title}
          </H1>
          <Paragraph color={beautyTokens.textMuted} fontSize={14}>
            {form.subtitle}
          </Paragraph>
        </YStack>

        {/* Fields */}
        <YStack gap="$3" mt="$3">
          {form.fields.map((field) => {
            const isPassword = field.type === 'password';
            const showSecret = isPassword && shownPasswords[field.name];
            return (
              <YStack key={field.name} gap="$2">
                <SizableText
                  fontSize={11}
                  fontWeight="600"
                  letterSpacing={1}
                  color={beautyTokens.textMuted}
                  textTransform="uppercase"
                >
                  {field.label}
                </SizableText>
                <Controller
                  control={control}
                  name={field.name}
                  rules={{
                    required: field.required
                      ? field.error_messages?.required ?? 'Required'
                      : false,
                    minLength: field.min_length
                      ? {
                          value: field.min_length,
                          message:
                            field.error_messages?.min_length ??
                            `Min ${field.min_length} chars`,
                        }
                      : undefined,
                    pattern: field.pattern
                      ? {
                          value: new RegExp(field.pattern),
                          message: field.error_messages?.pattern ?? 'Invalid format',
                        }
                      : undefined,
                  }}
                  render={({ field: rhf, fieldState }) => (
                    <YStack gap="$1">
                      <XStack
                        bg={beautyTokens.white}
                        rounded={10}
                        borderWidth={1}
                        borderColor={beautyTokens.line}
                        items="center"
                        px="$3"
                        height={48}
                      >
                        <Input
                          testID={`form-field-${field.name}`}
                          flex={1}
                          unstyled
                          value={rhf.value as string}
                          onChangeText={rhf.onChange}
                          onBlur={rhf.onBlur}
                          placeholder={field.placeholder}
                          placeholderTextColor={beautyTokens.textMuted}
                          secureTextEntry={isPassword && !showSecret}
                          keyboardType={
                            field.inputmode === 'email' ? 'email-address' : 'default'
                          }
                          autoCapitalize={(field.autocapitalize as any) ?? 'none'}
                          autoComplete={field.autocomplete as any}
                          color={beautyTokens.text}
                          fontSize={15}
                        />
                        {isPassword ? (
                          <Pressable
                            onPress={() =>
                              setShownPasswords((s) => ({
                                ...s,
                                [field.name]: !s[field.name],
                              }))
                            }
                          >
                            <SizableText
                              fontSize={11}
                              fontWeight="700"
                              color={beautyTokens.text}
                              letterSpacing={1}
                            >
                              {showSecret ? 'HIDE' : 'SHOW'}
                            </SizableText>
                          </Pressable>
                        ) : null}
                      </XStack>
                      {fieldState.error ? (
                        <SizableText color={beautyTokens.danger} fontSize={12}>
                          {fieldState.error.message}
                        </SizableText>
                      ) : null}
                      {isPassword && showForgotLink ? (
                        <XStack justify="flex-end" mt="$1">
                          <Pressable
                            onPress={() =>
                              navigateToScreen(router, 'beauty_forgot')
                            }
                            testID="form-forgot-link"
                          >
                            <SizableText
                              fontSize={12}
                              fontWeight="700"
                              color={beautyTokens.accentBlueText}
                            >
                              Forgot password?
                            </SizableText>
                          </Pressable>
                        </XStack>
                      ) : null}
                    </YStack>
                  )}
                />
              </YStack>
            );
          })}
        </YStack>

        {/* Terms & Privacy checkbox (signup only) */}
        {showTermsCheckbox ? (
          <Pressable
            onPress={() => setTermsAccepted((v) => !v)}
            testID="form-terms-checkbox"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: termsAccepted }}
          >
            <XStack gap="$2" items="center" mt="$1">
              <YStack
                width={18}
                height={18}
                rounded={4}
                borderWidth={1.5}
                borderColor={termsAccepted ? beautyTokens.success : beautyTokens.line}
                bg={termsAccepted ? beautyTokens.success : beautyTokens.white}
                items="center"
                justify="center"
              >
                {termsAccepted ? (
                  <SizableText fontSize={12} color={beautyTokens.white}>
                    ✓
                  </SizableText>
                ) : null}
              </YStack>
              <SizableText fontSize={13} color={beautyTokens.textMuted}>
                I agree to the{' '}
                <SizableText
                  fontSize={13}
                  fontWeight="700"
                  color={beautyTokens.accentBlueText}
                >
                  Terms
                </SizableText>{' '}
                and{' '}
                <SizableText
                  fontSize={13}
                  fontWeight="700"
                  color={beautyTokens.accentBlueText}
                >
                  Privacy Policy
                </SizableText>
                .
              </SizableText>
            </XStack>
          </Pressable>
        ) : null}

        {submitError ? (
          <SizableText color={beautyTokens.danger} fontSize={13} mt="$1">
            {submitError}
          </SizableText>
        ) : null}

        {/* Submit */}
        <YStack mt="$3" gap="$3">
          <Pressable testID="form-submit" disabled={!canSubmit} onPress={onSubmit}>
            <YStack
              height={48}
              rounded={10}
              items="center"
              justify="center"
              bg={canSubmit ? beautyTokens.success : '#cccccc'}
              opacity={pending ? 0.7 : 1}
            >
              {pending ? (
                <Spinner color={beautyTokens.white} />
              ) : (
                <SizableText color={beautyTokens.white} fontWeight="700" fontSize={15}>
                  {form.submit.prompt ?? 'Submit'}
                </SizableText>
              )}
            </YStack>
          </Pressable>

          {/* OR divider */}
          {showOrDivider ? (
            <XStack items="center" gap="$2" my="$1">
              <Separator flex={1} borderColor={beautyTokens.line} />
              <SizableText
                fontSize={11}
                color={beautyTokens.textMuted}
                letterSpacing={2}
              >
                OR
              </SizableText>
              <Separator flex={1} borderColor={beautyTokens.line} />
            </XStack>
          ) : null}

          {/* Continue with Google */}
          {showSocial ? (
            <XStack
              height={48}
              rounded={10}
              bg={beautyTokens.white}
              borderWidth={1.5}
              borderColor={beautyTokens.line}
              items="center"
              justify="center"
              gap={10}
            >
              <XStack
                width={18}
                height={18}
                items="center"
                justify="center"
                bg={beautyTokens.white}
              >
                {/* Multi-color G glyph — colored letters fake the real
                    Google G without shipping the SVG. */}
                <SizableText fontSize={14} fontWeight="700" color="#4285F4">
                  G
                </SizableText>
              </XStack>
              <SizableText
                color={beautyTokens.text}
                fontWeight="600"
                fontSize={14}
              >
                {socialLabel}
              </SizableText>
            </XStack>
          ) : null}

          {/* Footer links */}
          {form.footer_links && form.footer_links.length > 0 ? (
            <YStack items="center" mt="$3" gap="$2">
              {form.footer_links.map((f) => {
                const targetScreen = FOOTER_TARGET_SCREEN[f.rel];
                // Angular renders an implicit prefix for business_login
                // even though `label_prefix` is null in the schema — keep
                // that label here so the row reads naturally on its own.
                const prefix =
                  f.label_prefix ??
                  (f.rel === 'business_login' ? 'Business provider?' : null);
                const linkLabel =
                  f.rel === 'signup'
                    ? 'Sign up'
                    : f.rel === 'business_signup'
                      ? 'Sign up'
                      : f.rel === 'login'
                        ? 'Sign in'
                        : f.rel === 'business_login'
                          ? 'Sign in'
                          : f.rel === 'customer_login'
                            ? 'Customer sign in'
                            : f.rel === 'forgot'
                              ? 'Forgot password?'
                              : f.rel;
                return (
                  <XStack key={f.rel} gap="$1" items="center">
                    {prefix ? (
                      <SizableText fontSize={13} color={beautyTokens.textMuted}>
                        {prefix}
                      </SizableText>
                    ) : null}
                    <Pressable
                      onPress={() => {
                        if (targetScreen) navigateToScreen(router, targetScreen);
                      }}
                    >
                      <SizableText
                        fontSize={13}
                        fontWeight="700"
                        color={beautyTokens.successHover}
                      >
                        {linkLabel}
                      </SizableText>
                    </Pressable>
                  </XStack>
                );
              })}
            </YStack>
          ) : null}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
