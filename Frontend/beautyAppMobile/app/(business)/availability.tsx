import React, { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  H2,
  ScrollView,
  SizableText,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { putWeeklyHours, type WeeklyHourRow } from '@/services/businessApply';
import { BeautyShell } from '@/components/BeautyShell';
import { WeeklyHoursGrid } from '@/components/business/WeeklyHoursGrid';
import { BeautyButton, InfoStrip, LoadingScreen } from '@/components/ui';
import { beautyTokens } from '../../tamagui.config';

interface AvailabilityData {
  storefront: { id: number; name: string };
  weekly_hours: WeeklyHourRow[];
  submit_method: string;
  submit_href: string;
}

export default function BusinessAvailabilityScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<AvailabilityData> | null>(null);
  const [rows, setRows] = useState<WeeklyHourRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<AvailabilityData>('beauty_business_availability');
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        router.replace((route ?? '/(auth)/business-login') as any);
        return;
      }
      setEnv(e);
      if (e.action === 'render' && e.data?.weekly_hours) {
        setRows(e.data.weekly_hours);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const onSave = async () => {
    if (env?.action !== 'render' || !env.data?.submit_href) return;
    setSaving(true);
    setSaved(false);
    try {
      await putWeeklyHours(env.data.submit_href, rows);
      setSaved(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to save hours.');
    } finally {
      setSaving(false);
    }
  };

  const links = env?.action === 'render' ? (env._links ?? {}) : {};

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1}>
        {/* Header */}
        <YStack
          height={52}
          justify="center"
          px="$4"
          bg={beautyTokens.surface}
          borderBottomWidth={1}
          borderBottomColor={beautyTokens.line}
        >
          <Pressable onPress={() => navigateLink(router, links.business_home)}>
            <SizableText fontSize={13} color={beautyTokens.accentBlueText}>‹ Dashboard</SizableText>
          </Pressable>
        </YStack>

        {!env && !error ? (
          <LoadingScreen />
        ) : (
          <ScrollView flex={1} bg={beautyTokens.surface2} keyboardShouldPersistTaps="handled">
            <YStack p="$4" gap="$4">
              <H2 fontFamily="$heading" fontSize={22} fontWeight="500" color={beautyTokens.text}>
                Weekly Hours
              </H2>

              {error ? <InfoStrip tone="danger">{error}</InfoStrip> : null}

              {saved ? <InfoStrip tone="success">Hours saved ✓</InfoStrip> : null}

              <WeeklyHoursGrid rows={rows} onChange={setRows} />
            </YStack>
          </ScrollView>
        )}

        {/* Sticky save */}
        {env?.action === 'render' ? (
          <YStack
            bg={beautyTokens.surface}
            borderTopWidth={1}
            borderTopColor={beautyTokens.line}
            p="$4"
          >
            <BeautyButton
              fullWidth
              size="lg"
              loading={saving}
              onPress={onSave}
              testID="availability-save-btn"
            >
              Save hours
            </BeautyButton>
          </YStack>
        ) : null}
      </YStack>
    </BeautyShell>
  );
}
