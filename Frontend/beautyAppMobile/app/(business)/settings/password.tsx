import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  ScrollView,
  SizableText,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { api } from '@/services/api';
import { BeautyShell } from '@/components/BeautyShell';
import { BeautyButton, BeautyInput, InfoStrip, LoadingScreen } from '@/components/ui';
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
          <LoadingScreen />
        ) : (
          <ScrollView flex={1} bg={beautyTokens.surface2} keyboardShouldPersistTaps="handled">
            <YStack p="$4" gap="$4">
              <SizableText fontFamily="$heading" fontSize={22} fontWeight="500" color={beautyTokens.text}>
                Change Password
              </SizableText>

              {error ? <InfoStrip tone="danger">{error}</InfoStrip> : null}
              {success ? <InfoStrip tone="success">Password changed successfully ✓</InfoStrip> : null}

              <BeautyInput
                label="CURRENT PASSWORD"
                value={currentPw}
                onChangeText={setCurrentPw}
                secureTextEntry
                placeholder="Current password"
                testID="form-field-current_password"
              />

              <BeautyInput
                label="NEW PASSWORD"
                value={newPw}
                onChangeText={setNewPw}
                secureTextEntry
                placeholder="Min 8 characters"
                testID="form-field-new_password"
              />

              <BeautyInput
                label="CONFIRM NEW PASSWORD"
                value={confirmPw}
                onChangeText={setConfirmPw}
                secureTextEntry
                placeholder="Repeat new password"
                testID="form-field-confirm_password"
              />

              {submitError ? <InfoStrip tone="danger">{submitError}</InfoStrip> : null}

              <BeautyButton
                fullWidth
                size="lg"
                loading={submitting}
                onPress={onSubmit}
                testID="form-submit"
              >
                Change password
              </BeautyButton>
            </YStack>
          </ScrollView>
        )}
      </YStack>
    </BeautyShell>
  );
}
