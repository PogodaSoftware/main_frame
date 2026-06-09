/**
 * Forgot password — direct REST.
 * Mirrors Angular `beauty-forgot.component.ts`: single email field,
 * baby-blue info strip about reset-link expiry, and POST to
 * `/api/beauty/auth/forgot/`. Endpoint always returns the same response
 * shape to avoid leaking whether an email is on file (and a 404 is
 * treated as silent success for the same reason).
 *
 * The matching `beauty_forgot` BFF resolver still exists for any
 * platform that wants a fully BFF-driven flow, but this RN screen
 * follows the Angular precedent of rendering it as a small custom
 * form so we can keep the design-system info strip + footer layout.
 */
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { H1, Paragraph, ScrollView, SizableText, XStack, YStack } from 'tamagui';

import { beautyTokens } from '../../tamagui.config';
import { BeautyShell } from '@/components/BeautyShell';
import {
  BeautyButton,
  BeautyInput,
  InfoStrip,
} from '@/components/ui';
import { api } from '@/services/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const valid = EMAIL_RE.test(email.trim());

  const submit = async () => {
    setTouched(true);
    if (!valid || loading) return;
    setLoading(true);
    setServerError(null);
    setSent(false);
    try {
      await api.post('/api/beauty/auth/forgot/', { email: email.trim() });
      setSent(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 200) {
        // Treat as silent success — matches Angular non-leak behavior.
        setSent(true);
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView flex={1} bg={beautyTokens.surface}>
        <YStack p="$4" gap="$3" maxW={beautyTokens.phoneMax} self="center" width="100%">
          {/* Back bar */}
          <XStack height={28}>
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Back"
              accessibilityRole="button"
              testID="forgot-back"
              hitSlop={8}
            >
              <SizableText fontSize={22} color={beautyTokens.text}>
                ‹
              </SizableText>
            </Pressable>
          </XStack>

          {/* Brand */}
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
          </YStack>

          {/* Title + subtitle */}
          <YStack gap="$1" mt="$2">
            <H1
              fontFamily="$heading"
              fontSize={32}
              fontWeight="500"
              color={beautyTokens.text}
            >
              Reset password
            </H1>
            <Paragraph color={beautyTokens.textMuted} fontSize={14}>
              {`Enter the email tied to your account. We'll send a link to reset your password.`}
            </Paragraph>
          </YStack>

          {/* Email field */}
          <YStack gap="$3" mt="$3">
            <BeautyInput
              testID="forgot-email"
              label="Email"
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTouched(true)}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              errorText={
                touched && !valid
                  ? 'Please enter a valid email address.'
                  : undefined
              }
            />

            {serverError ? (
              <SizableText
                color={beautyTokens.danger}
                fontSize={13}
                testID="forgot-server-error"
              >
                {serverError}
              </SizableText>
            ) : null}

            <BeautyButton
              testID="forgot-submit"
              variant="confirm"
              size="lg"
              fullWidth
              disabled={!valid}
              loading={loading}
              onPress={submit}
            >
              Send reset link
            </BeautyButton>

            {sent ? (
              <InfoStrip tone="success" testID="forgot-success">
                Check your inbox — we sent a reset link to {email}.
              </InfoStrip>
            ) : null}

            <InfoStrip tone="info" testID="forgot-info-strip">
              {`Reset links expire after 30 minutes for security. Check your spam folder if you don't see it.`}
            </InfoStrip>

            {/* Footer */}
            <XStack justify="center" gap="$1" mt="$3">
              <SizableText fontSize={13} color={beautyTokens.textMuted}>
                Remembered it?
              </SizableText>
              <Pressable
                onPress={() => router.replace('/(auth)/login' as any)}
                testID="forgot-back-to-login"
              >
                <SizableText
                  fontSize={13}
                  fontWeight="700"
                  color={beautyTokens.text}
                >
                  Back to sign in
                </SizableText>
              </Pressable>
            </XStack>
          </YStack>
        </YStack>
      </ScrollView>
    </BeautyShell>
  );
}
