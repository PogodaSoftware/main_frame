/**
 * Business bookings list — mirrors Angular beauty-business-bookings.component.
 * Pill-segmented tabs (Upcoming/Past/All) · sectioned list · date stack +
 * status chip + price · empty hint.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { BeautyShell } from '@/components/BeautyShell';
import {
  ProvBtn,
  ProvCard,
  ProvEmptyHint,
  ProvSubHeader,
  ProvTabBar,
  type ProviderTab,
} from '@/components/business';
import { beautyTokens } from '../../../tamagui.config';

type Tab = 'Upcoming' | 'Past' | 'All';

interface BookingRow {
  id: number;
  status: string;
  slot_at: string;
  slot_label?: string;
  service: { id: number; name: string; duration_minutes: number; price_cents: number; price_dollars?: string };
  customer_email: string;
}

interface BookingsData {
  upcoming?: BookingRow[];
  past?: BookingRow[];
  badges?: { messages_unread?: number; bookings_unread?: number };
}

interface DisplayRow {
  id: number;
  month: string;
  day: string;
  dow: string;
  service: string;
  status: string;
  statusLabel: string;
  time: string;
  duration: number;
  customer: string;
  price: string;
}

function toDisplay(b: BookingRow): DisplayRow {
  const d = new Date(b.slot_at);
  const month = d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  const day = d.getDate().toString();
  const dow = d.toLocaleDateString(undefined, { weekday: 'short' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const dollars = b.service.price_dollars || ((b.service.price_cents || 0) / 100).toFixed(2);
  const statusLabel =
    b.status === 'booked' ? 'Confirmed'
    : b.status === 'completed' ? 'Completed'
    : b.status === 'pending' ? 'Pending'
    : b.status.startsWith('cancelled') ? 'Cancelled'
    : b.status;
  return {
    id: b.id, month, day, dow,
    service: b.service.name,
    status: b.status,
    statusLabel,
    time,
    duration: b.service.duration_minutes,
    customer: b.customer_email,
    price: dollars,
  };
}

function statusChipColors(status: string): { bg: string; fg: string } {
  if (status === 'booked' || status === 'completed') {
    return { bg: beautyTokens.successBg, fg: beautyTokens.success };
  }
  if (status === 'pending') {
    return { bg: beautyTokens.warningBg, fg: beautyTokens.warningText };
  }
  if (status.startsWith('cancelled')) {
    return { bg: beautyTokens.dangerBg, fg: beautyTokens.danger };
  }
  return { bg: beautyTokens.surface, fg: beautyTokens.textMuted };
}

export default function BusinessBookingsScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<BookingsData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Upcoming');

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<BookingsData>('beauty_business_bookings');
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

  const data = env?.action === 'render' ? env.data : undefined;
  const links: Record<string, BffLink> = (env?._links as Record<string, BffLink>) ?? {};
  const upcoming = useMemo(() => (data?.upcoming ?? []).map(toDisplay), [data?.upcoming]);
  const past = useMemo(() => (data?.past ?? []).map(toDisplay), [data?.past]);
  const showUpcoming = (activeTab === 'Upcoming' || activeTab === 'All') && upcoming.length > 0;
  const showPast = (activeTab === 'Past' || activeTab === 'All') && past.length > 0;
  const tabHasContent = showUpcoming || showPast;
  const badges = data?.badges ?? {};

  const goBack = () => {
    const link = links['business_home'];
    if (link) navigateLink(router, link);
    else router.replace('/business/home' as any);
  };

  const onTab = (tab: ProviderTab) => {
    if (tab === 'bookings') return;
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
      <ProvSubHeader back="Dashboard" title="Bookings" onBackPress={goBack} />

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
          <View style={styles.segTabs}>
            {(['Upcoming', 'Past', 'All'] as Tab[]).map((t) => {
              const selected = activeTab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setActiveTab(t)}
                  style={[styles.segTab, selected && styles.segTabSelected]}
                >
                  <Text style={[styles.segTabText, selected && styles.segTabTextSelected]}>{t}</Text>
                </Pressable>
              );
            })}
          </View>

          {!tabHasContent ? (
            <ProvEmptyHint
              title="No bookings yet"
              body={
                activeTab === 'Past'
                  ? 'Past appointments will show up here once they have happened.'
                  : 'Bookings appear here once customers reserve a slot. Make sure you have services and hours set.'
              }
            >
              <ProvBtn variant="secondary" onPress={() => {
                const link = links['services'];
                if (link) navigateLink(router, link);
                else router.push('/business/services' as any);
              }}>View storefront →</ProvBtn>
            </ProvEmptyHint>
          ) : (
            <>
              {showUpcoming && (
                <>
                  <Text style={styles.sectionTitle}>This week</Text>
                  <ProvCard padding={0} style={styles.bkCard}>
                    <View style={styles.bkCardInner}>
                      {upcoming.map((b, idx) => (
                        <BookingRowView key={b.id} row={b} last={idx === upcoming.length - 1} />
                      ))}
                    </View>
                  </ProvCard>
                </>
              )}
              {showPast && (
                <>
                  <Text style={styles.sectionTitle}>Past</Text>
                  <ProvCard padding={0} style={styles.bkCard}>
                    <View style={styles.bkCardInner}>
                      {past.map((b, idx) => (
                        <BookingRowView key={b.id} row={b} last={idx === past.length - 1} />
                      ))}
                    </View>
                  </ProvCard>
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      <ProvTabBar
        active="bookings"
        badges={{ bookings: badges.bookings_unread, messages: badges.messages_unread }}
        onTabPress={onTab}
      />
    </BeautyShell>
  );
}

function BookingRowView({ row, last }: { row: DisplayRow; last: boolean }) {
  const colors = statusChipColors(row.status);
  return (
    <View style={[styles.bkRow, last && styles.bkRowLast]}>
      <View style={styles.dateStack}>
        <Text style={styles.dsMonth}>{row.month}</Text>
        <Text style={styles.dsDay}>{row.day}</Text>
        <Text style={styles.dsDow}>{row.dow}</Text>
      </View>
      <View style={styles.bkInfo}>
        <View style={styles.bkRowTop}>
          <Text style={styles.bkSvc} numberOfLines={1}>{row.service}</Text>
          <View style={[styles.statusChip, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusChipText, { color: colors.fg }]}>{row.statusLabel.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.bkMono}>{row.time} · {row.duration} min</Text>
        <Text style={styles.bkCust} numberOfLines={1}>{row.customer}</Text>
      </View>
      <Text style={styles.bkPrice}>${row.price}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flex: 1, padding: 16 },
  errorText: { color: beautyTokens.danger, fontFamily: beautyTokens.fontBody, fontSize: 13 },

  body: { flex: 1, backgroundColor: beautyTokens.surface },
  bodyContent: { padding: 16, paddingTop: 14 },

  segTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 999, padding: 3, marginBottom: 14,
  },
  segTab: {
    flex: 1, minHeight: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 999, paddingVertical: 8,
  },
  segTabSelected: { backgroundColor: beautyTokens.text },
  segTabText: { fontSize: 12, fontWeight: '600', color: beautyTokens.textMuted, fontFamily: beautyTokens.fontBody },
  segTabTextSelected: { color: '#FFFFFF' },

  sectionTitle: {
    marginBottom: 8,
    fontFamily: beautyTokens.fontDisplay,
    fontSize: 22, fontWeight: '500', color: beautyTokens.text,
  },
  bkCard: { marginBottom: 14 },
  bkCardInner: { paddingHorizontal: 14 },

  bkRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: beautyTokens.line,
  },
  bkRowLast: { borderBottomWidth: 0 },
  dateStack: {
    width: 48,
    alignItems: 'center',
    backgroundColor: beautyTokens.surface,
    borderRadius: 8,
    borderWidth: 1, borderColor: beautyTokens.line,
    paddingVertical: 4,
  },
  dsMonth: { fontSize: 9, fontWeight: '700', color: beautyTokens.accentBlueDeep, letterSpacing: 1, fontFamily: beautyTokens.fontBody },
  dsDay: { fontFamily: beautyTokens.fontDisplay, fontSize: 20, fontWeight: '500', color: beautyTokens.text, lineHeight: 22 },
  dsDow: { fontFamily: 'Menlo', fontSize: 9, color: beautyTokens.textMuted, marginTop: 1 },

  bkInfo: { flex: 1, minWidth: 0 },
  bkRowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  bkSvc: { fontSize: 14, fontWeight: '600', color: beautyTokens.text, fontFamily: beautyTokens.fontBody, flexShrink: 1 },
  statusChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  statusChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, fontFamily: beautyTokens.fontBody },
  bkMono: { fontFamily: 'Menlo', fontSize: 11, color: beautyTokens.textMuted, marginBottom: 4 },
  bkCust: { fontSize: 12, color: beautyTokens.text, fontFamily: beautyTokens.fontBody },

  bkPrice: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 18, fontWeight: '500',
    color: beautyTokens.text, lineHeight: 20, textAlign: 'right',
  },
});
