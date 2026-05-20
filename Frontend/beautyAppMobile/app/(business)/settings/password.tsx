import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  Input,
  Paragraph,
  ScrollView,
  SizableText,
  Spinner,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { api } from '@/services/api';
import { BeautyShell } from '@/components/BeautyShell';
import { beautyTokens } from '../../../tamagui.config';

interface ChangePasswordData {
  business: { email: string; business_name: string };
  submit_href: string;
  submit_method: string;
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ChangePasswordData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolve<ChangePasswordData>('beauty_business_change_password')
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(auth)/business-login') as any);
          return;
        }
        setEnv(e);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => { cancelled = true; };
  }, []);

  const links = env?.action === 'render' ? (env._links ?? {}) : {};
  const data = env?.action === 'render' ? env.data : undefined;

  const onSubmit = async () => {
    if (!data?.submit_href) return;
    if (newPw !== confirmPw) {
      setSubmitError('New passwords do not match.');
      return;
    }
    if (newPw.length < 8) {
      setSubmitError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(data.submit_href, {
        current_password: currentPw,
        new_password: newPw,
      });
      setSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      setSubmitError(err?.response?.data?.detail ?? 'Failed to change password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1}>
        {/* Back header */}
        <YStack
          height={52}
          justify="center"
          px="$4"
          bg={beautyTokens.surface}
          borderBottomWidth={1}
          borderBottomColor={beautyTokens.line}
        >
          <Pressable onPress={() => navigateLink(router, links.settings)}>
            <SizableText fontSize={13} color={beautyTokens.accentBlueText}>‹ Settings</SizableText>
          </Pressable>
        </YStack>

        {!env && !error ? (
          <YStack flex={1} items="center" justify="center">
            <Spinner color={beautyTokens.successHover} />
          </YStack>
        ) : (
          <ScrollView flex={1} bg={beautyTokens.surface2} keyboardShouldPersistTaps="handled">
            <YStack p="$4" gap="$4">
              <SizableText fontFamily="$heading" fontSize={22} fontWeight="500" color={beautyTokens.text}>
                Change Password
              </SizableText>

              {error ? <Paragraph color={beautyTokens.danger}>{error}</Paragraph> : null}
              {success ? (
                <YStack bg="#d1fae5" rounded={10} px="$4" py="$2">
                  <SizableText fontSize={13} color="#065f46">Password changed successfully ✓</SizableText>
                </YStack>
              ) : null}

              <YStack gap="$1">
                <SizableText fontSize={12} fontWeight="600" color={beautyTokens.textMuted}>CURRENT PASSWORD</SizableText>
                <Input
                  value={currentPw}
                  onChangeText={setCurrentPw}
                  secureTextEntry
                  placeholder="Current password"
                  borderColor={beautyTokens.line}
                  color={beautyTokens.text}
                  testID="form-field-current_password"
                />
              </YStack>

              <YStack gap="$1">
                <SizableText fontSize={12} fontWeight="600" color={beautyTokens.textMuted}>NEW PASSWORD</SizableText>
                <Input
                  value={newPw}
                  onChangeText={setNewPw}
                  secureTextEntry
                  placeholder="Min 8 characters"
                  borderColor={beautyTokens.line}
                  color={beautyTokens.text}
                  testID="form-field-new_password"
                />
              </YStack>

              <YStack gap="$1">
                <SizableText fontSize={12} fontWeight="600" color={beautyTokens.textMuted}>CONFIRM NEW PASSWORD</SizableText>
                <Input
                  value={confirmPw}
                  onChangeText={setConfirmPw}
                  secureTextEntry
                  placeholder="Repeat new password"
                  borderColor={beautyTokens.line}
                  color={beautyTokens.text}
                  testID="form-field-confirm_password"
                />
              </YStack>

              {submitError ? <Paragraph color={beautyTokens.danger} fontSize={13}>{submitError}</Paragraph> : null}

              <Pressable disabled={submitting} onPress={onSubmit} testID="form-submit">
                <YStack
                  height={48}
                  rounded={12}
                  bg={submitting ? beautyTokens.textMuted : beautyTokens.successHover}
                  justify="center"
                  items="center"
                >
                  {submitting
                    ? <Spinner color={beautyTokens.white} />
                    : <SizableText fontWeight="700" color={beautyTokens.white}>Change password</SizableText>}
                </YStack>
              </Pressable>
            </YStack>
          </ScrollView>
        )}
      </YStack>
    </BeautyShell>
  );
}
