import React, { useEffect, useState } from 'react';
import { Pressable, Switch } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { api } from '@/services/api';
import { BeautyShell } from '@/components/BeautyShell';
import { BeautyButton, BeautyInput, InfoStrip, LoadingScreen } from '@/components/ui';
import { beautyTokens } from '../../../tamagui.config';

interface ContactData {
  contact: {
    email: string;
    public_email: string;
    contact_phone: string;
    show_phone_publicly: boolean;
  };
  submit_method: string;
  submit_href: string;
}

export default function EmailContactScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ContactData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publicEmail, setPublicEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolve<ContactData>('beauty_business_email_contact')
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(auth)/business-login') as any);
          return;
        }
        setEnv(e);
        if (e.action === 'render' && e.data?.contact) {
          setPublicEmail(e.data.contact.public_email);
          setPhone(e.data.contact.contact_phone);
          setShowPhone(e.data.contact.show_phone_publicly);
        }
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
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.patch(data.submit_href, {
        public_email: publicEmail,
        contact_phone: phone,
        show_phone_publicly: showPhone,
      });
      setSuccess(true);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.detail ?? 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1}>
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
                Email & Contact
              </SizableText>

              {/* Login email — read only */}
              <YStack gap={6}>
                <SizableText
                  fontSize={11}
                  fontWeight="700"
                  color={beautyTokens.textMuted}
                  letterSpacing={1.2}
                  textTransform="uppercase"
                >
                  Account email
                </SizableText>
                <YStack
                  borderWidth={1}
                  borderColor={beautyTokens.line}
                  rounded={10}
                  height={44}
                  justify="center"
                  px={14}
                  bg="#f9fafb"
                >
                  <SizableText fontSize={14} color={beautyTokens.textMuted}>
                    {data?.contact.email}
                  </SizableText>
                </YStack>
                <SizableText fontSize={12} color={beautyTokens.textMuted}>
                  Login email — contact support to change.
                </SizableText>
              </YStack>

              {error ? <InfoStrip tone="danger">{error}</InfoStrip> : null}
              {success ? <InfoStrip tone="success">Contact info saved ✓</InfoStrip> : null}

              <BeautyInput
                label="PUBLIC EMAIL (SHOWN TO CLIENTS)"
                value={publicEmail}
                onChangeText={setPublicEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="contact@mybusiness.com"
                testID="form-field-public_email"
              />

              <BeautyInput
                label="CONTACT PHONE"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+1 555 000 0000"
                testID="form-field-contact_phone"
              />

              {/* Show phone toggle */}
              <XStack justify="space-between" items="center">
                <SizableText fontSize={14} color={beautyTokens.text}>Show phone publicly</SizableText>
                <Switch
                  testID="form-field-show_phone"
                  value={showPhone}
                  onValueChange={setShowPhone}
                  trackColor={{ false: beautyTokens.line, true: beautyTokens.successHover }}
                  thumbColor={beautyTokens.white}
                />
              </XStack>

              {submitError ? <InfoStrip tone="danger">{submitError}</InfoStrip> : null}

              <BeautyButton
                fullWidth
                size="lg"
                loading={submitting}
                onPress={onSubmit}
                testID="form-submit"
              >
                Save changes
              </BeautyButton>
            </YStack>
          </ScrollView>
        )}
      </YStack>
    </BeautyShell>
  );
}
