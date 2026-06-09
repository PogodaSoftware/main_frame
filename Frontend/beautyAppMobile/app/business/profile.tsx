/**
 * Business profile — mirrors Angular beauty-business-profile.component.
 * Identity card + lifetime earnings card + payouts button.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { BeautyShell } from '@/components/BeautyShell';
import {
  ProvBtn,
  ProvCard,
  ProvSubHeader,
  ProvTabBar,
  type ProviderTab,
} from '@/components/business';
import { beautyTokens } from '../../tamagui.config';

interface Earnings {
  currency?: string;
  total_cents?: number;
  this_month_cents?: number;
  this_year_cents?: number;
  total_dollars?: string;
  this_month_dollars?: string;
  this_year_dollars?: string;
  paid_bookings_count?: number;
}

interface ProfileData {
  business?: { email?: string; business_name?: string };
  earnings?: Earnings;
  badges?: { messages_unread?: number; bookings_unread?: number };
}

function fmt(dollars?: string, cents?: number): string {
  const v = dollars ? parseFloat(dollars) : (cents || 0) / 100;
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BusinessProfileScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ProfileData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<ProfileData>('beauty_business_profile');
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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onTab = (tab: ProviderTab) => {
    if (tab === 'profile') return;
    const links: Record<string, BffLink> = (env?._links as Record<string, BffLink>) ?? {};
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

  const data = env?.action === 'render' ? env.data : undefined;
  const links: Record<string, BffLink> = (env?._links as Record<string, BffLink>) ?? {};
  const business = data?.business ?? {};
  const earnings = data?.earnings ?? {};
  const businessName = business.business_name?.trim() || '';
  const initial = businessName ? businessName[0].toUpperCase() : '·';
  const badges = data?.badges ?? {};

  const goSettings = () => {
    const link = links['settings'];
    if (link) navigateLink(router, link);
    else router.push('/business/settings' as any);
  };

  const goBack = () => {
    const link = links['business_home'];
    if (link) navigateLink(router, link);
    else router.replace('/business/home' as any);
  };

  const SettingsBtn = (
    <Pressable
      accessibilityLabel="Settings"
      onPress={goSettings}
      disabled={!links['settings']}
      style={[styles.gearBtn, !links['settings'] && styles.gearDisabled]}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.text} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={12} r={3} />
        <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </Svg>
    </Pressable>
  );

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ProvSubHeader back="Dashboard" title="Profile" onBackPress={goBack} right={SettingsBtn} />

      {!env && !error ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={beautyTokens.accentBlueDeep} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <ProvCard padding={16} style={styles.identCard}>
            <View style={styles.identRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.identText}>
                <Text style={styles.bizName} numberOfLines={1}>
                  {businessName || 'Your storefront'}
                </Text>
                <Text style={styles.bizEmail} numberOfLines={1}>{business.email || ''}</Text>
                <View style={styles.statusLine}>
                  <View style={styles.greenDot} />
                  <Text style={styles.statusLineText}>Storefront live</Text>
                </View>
              </View>
            </View>
          </ProvCard>

          <ProvCard padding={0} style={styles.earnCard}>
            <View style={styles.earnHead}>
              <Text style={styles.earnTitle}>Earnings</Text>
              <Text style={styles.earnSub}>Total customers have paid you.</Text>
            </View>
            <View style={styles.earnLifetime}>
              <Text style={styles.ltLabel}>Lifetime total</Text>
              <Text style={styles.ltValue} testID="earnings-total">
                ${fmt(earnings.total_dollars, earnings.total_cents)}
              </Text>
            </View>
            <View style={styles.earnRow}>
              <Text style={styles.earnRowLabel}>This month</Text>
              <Text style={styles.mono} testID="earnings-month">
                ${fmt(earnings.this_month_dollars, earnings.this_month_cents)}
              </Text>
            </View>
            <View style={styles.earnRow}>
              <Text style={styles.earnRowLabel}>This year</Text>
              <Text style={styles.mono} testID="earnings-year">
                ${fmt(earnings.this_year_dollars, earnings.this_year_cents)}
              </Text>
            </View>
            <View style={[styles.earnRow, styles.earnRowLast]}>
              <Text style={styles.earnRowLabel}>Paid bookings</Text>
              <Text style={styles.mono} testID="earnings-count">
                {earnings.paid_bookings_count ?? 0}
              </Text>
            </View>
          </ProvCard>

          <ProvBtn variant="secondary" full>View payouts →</ProvBtn>
        </ScrollView>
      )}

      <ProvTabBar
        active="profile"
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
  bodyContent: { padding: 16, paddingVertical: 20 },

  gearBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line,
    alignItems: 'center', justifyContent: 'center',
  },
  gearDisabled: { opacity: 0.5 },

  identCard: { marginBottom: 14 },
  identRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: beautyTokens.accentBlueDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 24, fontWeight: '500',
    color: beautyTokens.accentBlueText,
  },
  identText: { flex: 1, minWidth: 0 },
  bizName: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 22, fontWeight: '500',
    letterSpacing: 0.2, color: beautyTokens.text,
  },
  bizEmail: {
    fontFamily: 'Menlo', fontSize: 11, color: beautyTokens.textMuted, marginTop: 2,
  },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: beautyTokens.success },
  statusLineText: { fontSize: 11, fontWeight: '600', color: beautyTokens.success, fontFamily: beautyTokens.fontBody },

  earnCard: { marginBottom: 14, overflow: 'hidden' },
  earnHead: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: beautyTokens.line },
  earnTitle: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 18, fontWeight: '500',
    color: beautyTokens.text, letterSpacing: 0.2,
  },
  earnSub: { fontSize: 11, color: beautyTokens.textMuted, marginTop: 2, fontFamily: beautyTokens.fontBody },
  earnLifetime: {
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
  },
  ltLabel: { fontSize: 12, color: beautyTokens.textMuted, fontFamily: beautyTokens.fontBody },
  ltValue: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 30, fontWeight: '500',
    color: beautyTokens.accentBlueDeep, letterSpacing: 0.2,
  },
  earnRow: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: beautyTokens.line,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  earnRowLast: { borderBottomWidth: 0 },
  earnRowLabel: { fontSize: 13, color: beautyTokens.textMuted, fontFamily: beautyTokens.fontBody },
  mono: { fontFamily: 'Menlo', fontSize: 13, fontWeight: '700', color: beautyTokens.text },
});
