/**
 * Business availability — mirrors Angular beauty-business-availability.component.
 * Sub-header w/ Save button + hint + WeeklyHoursGrid + status msg + tab bar.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { putWeeklyHours, type WeeklyHourRow } from '@/services/businessApply';
import { BeautyShell } from '@/components/BeautyShell';
import {
  ProvBtn,
  ProvSubHeader,
  ProvTabBar,
  WeeklyHoursGrid,
  type ProviderTab,
} from '@/components/business';
import { beautyTokens } from '../../tamagui.config';

interface AvailabilityData {
  storefront?: { id: number; name: string };
  weekly_hours?: WeeklyHourRow[];
  submit_method?: string;
  submit_href?: string;
  badges?: { messages_unread?: number; bookings_unread?: number };
}

export default function BusinessAvailabilityScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<AvailabilityData> | null>(null);
  const [rows, setRows] = useState<WeeklyHourRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSave = async () => {
    if (env?.action !== 'render') return;
    // Action-link from the resolver — no hardcoded REST path.
    const href = env.data?.submit_href;
    if (!href) { setMessage({ text: 'Save is unavailable right now.', isError: true }); return; }
    setSaving(true);
    setMessage(null);
    try {
      await putWeeklyHours(href, rows);
      setMessage({ text: 'Saved.', isError: false });
    } catch (err: any) {
      setMessage({
        text: err?.response?.data?.detail || 'Could not save. Please check the times.',
        isError: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const links: Record<string, BffLink> = (env?._links as Record<string, BffLink>) ?? {};
  const badges = env?.action === 'render' ? (env.data?.badges ?? {}) : {};

  const goBack = () => {
    const link = links['business_home'];
    if (link) navigateLink(router, link);
    else router.replace('/business/home' as any);
  };

  const onTab = (tab: ProviderTab) => {
    const map: Record<ProviderTab, string> = {
      dashboard: 'business_home',
      bookings: 'bookings',
      services: 'services',
      messages: 'business_messages',
      profile: 'profile',
    };
    const link = links[map[tab]];
    if (link) navigateLink(router, link);
    else {
      const route: Record<ProviderTab, string> = {
        dashboard: '/business/home',
        bookings: '/business/bookings',
        services: '/business/services',
        messages: '/business/messages',
        profile: '/business/profile',
      };
      router.replace(route[tab] as any);
    }
  };

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ProvSubHeader
        back="Dashboard"
        title="Weekly hours"
        onBackPress={goBack}
        right={
          <ProvBtn variant="success" size="sm" disabled={saving} onPress={onSave}>
            {saving ? 'Saving…' : 'Save'}
          </ProvBtn>
        }
      />

      {!env && !error ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={beautyTokens.accentBlueDeep} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>
            Set when your storefront is open. Customers can only book during these hours.
          </Text>
          <WeeklyHoursGrid rows={rows} onChange={setRows} />
          {message && (
            <Text
              accessibilityRole={message.isError ? 'alert' : undefined}
              style={[styles.msg, message.isError && styles.msgError]}
            >
              {message.text}
            </Text>
          )}
        </ScrollView>
      )}

      <ProvTabBar
        active="dashboard"
        badges={{ bookings: badges.bookings_unread, messages: badges.messages_unread }}
        onTabPress={onTab}
      />
    </BeautyShell>
  );
}

const styles = StyleSheet.create({
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flex: 1, padding: 16 },
  errorText: { color: beautyTokens.danger, fontFamily: beautyTokens.fontBody, fontSize: 13 },
  body: { flex: 1, backgroundColor: beautyTokens.surface },
  bodyContent: { padding: 16, paddingTop: 14 },
  hint: { fontSize: 12, color: beautyTokens.textMuted, lineHeight: 18, marginBottom: 12, fontFamily: beautyTokens.fontBody },
  msg: {
    paddingVertical: 12,
    color: beautyTokens.accentBlueDeep,
    fontSize: 13, fontFamily: beautyTokens.fontBody,
  },
  msgError: { color: beautyTokens.danger },
});
