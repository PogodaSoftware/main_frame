import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  H2,
  Paragraph,
  ScrollView,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { useSession } from '@/hooks/useSession';
import { BeautyShell } from '@/components/BeautyShell';
import { beautyTokens } from '../../../tamagui.config';

interface SettingsData {
  business: { email: string; business_name: string };
}

interface SettingsRow {
  key: string;
  icon: string;
  label: string;
  linkKey: string;
  destructive?: boolean;
}

const ROWS: SettingsRow[] = [
  { key: 'password',    icon: '🔒', label: 'Change password',      linkKey: 'change_password' },
  { key: 'contact',     icon: '📧', label: 'Email & contact',       linkKey: 'email_contact' },
  { key: 'services',    icon: '✂️',  label: 'Manage services',       linkKey: 'services' },
  { key: 'schedule',    icon: '🕐', label: 'Open / closed hours',   linkKey: 'schedule' },
  { key: 'delete',      icon: '🗑️', label: 'Delete account',        linkKey: 'delete_account', destructive: true },
  { key: 'logout',      icon: '↩️', label: 'Sign out',              linkKey: 'logout', destructive: true },
];

export default function BusinessSettingsScreen() {
  const router = useRouter();
  const { clear } = useSession();
  const [env, setEnv] = useState<BffEnvelope<SettingsData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<SettingsData>('beauty_business_settings');
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        router.replace((route ?? '/(auth)/business-login') as any);
        return;
      }
      setEnv(e);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const links = env?.action === 'render' ? (env._links ?? {}) : {};

  const onRowPress = (row: SettingsRow) => {
    const link: BffLink | undefined = links[row.linkKey];
    if (!link) return;

    if (row.key === 'delete') {
      Alert.alert(
        'Delete account',
        'This permanently deletes your business account and all associated data. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setBusy('delete');
              await dispatchLink(link);
              clear();
              router.replace('/(auth)/business-login' as any);
              setBusy(null);
            },
          },
        ],
      );
      return;
    }

    if (row.key === 'logout') {
      Alert.alert('Sign out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          onPress: async () => {
            setBusy('logout');
            await dispatchLink(link);
            clear();
            router.replace('/(auth)/business-login' as any);
            setBusy(null);
          },
        },
      ]);
      return;
    }

    navigateLink(router, link);
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
          <H2 fontFamily="$heading" fontSize={20} fontWeight="500" color={beautyTokens.text}>
            Settings
          </H2>
        </YStack>

        {!env && !error ? (
          <YStack flex={1} items="center" justify="center">
            <Spinner color={beautyTokens.successHover} />
          </YStack>
        ) : error ? (
          <YStack flex={1} p="$4">
            <SizableText color={beautyTokens.danger}>{error}</SizableText>
          </YStack>
        ) : (
          <ScrollView flex={1} bg={beautyTokens.surface2}>
            <YStack p="$4" gap="$3">
              {/* Account info */}
              <YStack
                bg={beautyTokens.white}
                borderWidth={1}
                borderColor={beautyTokens.line}
                rounded={14}
                px="$4"
                py="$3"
              >
                <SizableText fontWeight="700" fontSize={14} color={beautyTokens.text}>
                  {env?.action === 'render' ? env.data?.business.business_name : ''}
                </SizableText>
                <SizableText fontSize={12} color={beautyTokens.textMuted}>
                  {env?.action === 'render' ? env.data?.business.email : ''}
                </SizableText>
              </YStack>

              {/* Setting rows */}
              <YStack
                bg={beautyTokens.white}
                borderWidth={1}
                borderColor={beautyTokens.line}
                rounded={14}
                overflow="hidden"
              >
                {ROWS.filter((r) => links[r.linkKey]).map((row, idx) => (
                  <Pressable
                    key={row.key}
                    testID={`settings-row-${row.key}`}
                    disabled={busy === row.key}
                    onPress={() => onRowPress(row)}
                  >
                    <XStack
                      px="$4"
                      height={52}
                      items="center"
                      gap="$3"
                      borderTopWidth={idx === 0 ? 0 : 1}
                      borderTopColor={beautyTokens.line}
                    >
                      <SizableText fontSize={18}>{row.icon}</SizableText>
                      <SizableText
                        flex={1}
                        fontSize={14}
                        fontWeight="500"
                        color={row.destructive ? beautyTokens.danger : beautyTokens.text}
                      >
                        {row.label}
                      </SizableText>
                      {busy === row.key
                        ? <Spinner size="small" />
                        : <SizableText color={beautyTokens.textMuted}>›</SizableText>}
                    </XStack>
                  </Pressable>
                ))}
              </YStack>
            </YStack>
          </ScrollView>
        )}
      </YStack>
    </BeautyShell>
  );
}
