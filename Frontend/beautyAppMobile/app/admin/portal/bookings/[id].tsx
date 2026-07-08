/**
 * Admin Portal — Booking detail (`/admin/portal/bookings/<id>`).
 * Admin-only drill-down from the bookings ledger. Stays entirely within the
 * admin surface: the customer/provider rows deep-link to the admin customer /
 * provider detail screens — never the customer- or business-facing booking
 * screens. All data from the `beauty_admin_portal_booking_detail` resolver.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import {
  AdmAvatar,
  AdmCard,
  AdmHomeIndicator,
  AdmStatusChip,
  AdmTabBar,
  AdmTopHeader,
  type AdmTabKind,
} from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

interface Party { id: number | null; name: string; email?: string }
interface BookingDetailData {
  id: number;
  confirmation: string;
  status: string;
  service: string;
  date_mon: string;
  date_day: number;
  date_weekday: string;
  slot_label: string;
  time_label: string;
  price_label: string;
  duration_label: string;
  booked_on_label: string;
  customer: Party;
  provider: Party;
  tab_badges: Partial<Record<AdmTabKind, number | string | null>>;
  notif_count: number;
  session_remaining?: string;
  admin_initials?: string;
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function AdminBookingDetail() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = parseInt(String(rawId ?? ''), 10) || 0;

  const [env, setEnv] = useState<BffEnvelope<BookingDetailData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<BookingDetailData>('beauty_admin_portal_booking_detail', { id: String(id) });
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        if (route) router.replace(route as any);
        return;
      }
      setEnv(e);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !env) {
    return (
      <View style={styles.loader}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: admTokens.errorText }}>{error}</Text>
      </View>
    );
  }
  if (!env || env.action !== 'render') {
    return (
      <View style={styles.loader}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={admTokens.white} />
      </View>
    );
  }

  const data = env.data!;

  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/admin/portal/bookings' as any);
  };
  const openCustomer = () => {
    if (data.customer.id == null) return;
    router.push({ pathname: '/admin/portal/crm/customer/[id]', params: { id: String(data.customer.id) } } as any);
  };
  const openProvider = () => {
    if (data.provider.id == null) return;
    router.push({ pathname: '/admin/portal/crm/provider/[id]', params: { id: String(data.provider.id) } } as any);
  };
  const onTab = (kind: AdmTabKind) => {
    if (kind === 'bookings') {
      router.replace('/admin/portal/bookings' as any);
      return;
    }
    const screen = kind === 'home' ? 'beauty_admin_portal_dashboard' : `beauty_admin_portal_${kind}`;
    const route = nativeRouteFor(screen);
    if (route) router.push(route as any);
  };

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />
      <AdmTopHeader notifCount={data.notif_count || null} initials={data.admin_initials || 'AD'} />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.hero}>
          <View style={styles.backRow}>
            <Pressable onPress={onBack} style={styles.backBtn} accessibilityLabel="Back to bookings">
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={admTokens.slateMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
              <Text style={styles.backText}>Bookings</Text>
            </Pressable>
          </View>

          <Text style={styles.heroConf}>{data.confirmation}</Text>
          <Text style={styles.heroService} numberOfLines={1}>{data.service}</Text>
          <View style={styles.statusRow}>
            <AdmStatusChip status={data.status} />
            <Text style={styles.heroSlot}>{data.slot_label}</Text>
          </View>

          <View style={styles.metaGrid}>
            <MetaCell label="Price" value={data.price_label} />
            <MetaCell label="Duration" value={data.duration_label} />
            <MetaCell label="Booked on" value={data.booked_on_label} />
            <MetaCell label="Booking ID" value={data.confirmation} />
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.sec}>
            <Text style={styles.secTitle}>Parties</Text>
            <AdmCard padding={0}>
              <Pressable
                onPress={openCustomer}
                disabled={data.customer.id == null}
                style={styles.partyRow}
                accessibilityLabel={`View customer ${data.customer.name}`}
              >
                <AdmAvatar initials={initialsOf(data.customer.name)} size={38} kind="customer" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.partyEyebrow}>Customer</Text>
                  <Text style={styles.partyName} numberOfLines={1}>{data.customer.name}</Text>
                  {data.customer.email ? <Text style={styles.partyEmail} numberOfLines={1}>{data.customer.email}</Text> : null}
                </View>
                {data.customer.id != null ? <Chevron /> : null}
              </Pressable>
              <Pressable
                onPress={openProvider}
                disabled={data.provider.id == null}
                style={[styles.partyRow, styles.partyBorder]}
                accessibilityLabel={`View provider ${data.provider.name}`}
              >
                <AdmAvatar initials={initialsOf(data.provider.name)} size={38} kind="provider" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.partyEyebrow}>Provider</Text>
                  <Text style={styles.partyName} numberOfLines={1}>{data.provider.name}</Text>
                </View>
                {data.provider.id != null ? <Chevron /> : (
                  <Text style={styles.partyMuted}>Not linked</Text>
                )}
              </Pressable>
            </AdmCard>
          </View>

          <View style={styles.sec}>
            <Text style={styles.secTitle}>Schedule</Text>
            <AdmCard padding={0}>
              <View style={styles.schedRow}>
                <View style={styles.bkDate}>
                  <Text style={styles.bkMon}>{data.date_mon}</Text>
                  <Text style={styles.bkDay}>{data.date_day}</Text>
                  <Text style={styles.bkWd}>{data.date_weekday}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.schedService} numberOfLines={1}>{data.service}</Text>
                  <Text style={styles.schedTime}>{data.slot_label}</Text>
                </View>
                <Text style={styles.schedPrice}>{data.price_label}</Text>
              </View>
            </AdmCard>
          </View>
        </View>
      </ScrollView>

      <AdmTabBar active="bookings" badges={data.tab_badges} onSelect={onTab} />
      <AdmHomeIndicator tone="slate" />
    </View>
  );
}

function Chevron() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={admTokens.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '48%' }}>
      <Text style={styles.metaEyebrow}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: admTokens.surface },
  loader: { flex: 1, backgroundColor: admTokens.slate, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: admTokens.slate, paddingHorizontal: 14, paddingBottom: 16 },
  backRow: { height: 48, flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: admTokens.slateMuted, fontSize: 12, fontWeight: '500' },
  heroConf: { fontSize: 24, color: admTokens.white, fontFamily: admTokens.fontMono, letterSpacing: 0.5 },
  heroService: { fontSize: 15, color: admTokens.white, marginTop: 6, fontFamily: 'CormorantGaramond_500Medium' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  heroSlot: { fontSize: 11, color: admTokens.slateMuted, fontFamily: admTokens.fontMono },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  metaEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.slateMuted,
  },
  metaValue: { color: admTokens.white, fontSize: 12, marginTop: 3, fontFamily: admTokens.fontMono },
  body: { padding: 14, backgroundColor: admTokens.surface },
  sec: { marginBottom: 14 },
  secTitle: { fontSize: 18, color: admTokens.text, fontFamily: 'CormorantGaramond_500Medium', marginBottom: 8 },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  partyBorder: { borderTopWidth: 1, borderTopColor: '#ECECEE' },
  partyEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
  },
  partyName: { fontSize: 13.5, fontWeight: '600', color: admTokens.text, marginTop: 2 },
  partyEmail: { fontSize: 10.5, color: admTokens.textMuted, marginTop: 1, fontFamily: admTokens.fontMono },
  partyMuted: { fontSize: 10.5, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  bkDate: { width: 40, alignItems: 'center' },
  bkMon: { fontSize: 8.5, fontWeight: '700', color: admTokens.textMuted, letterSpacing: 0.4, fontFamily: admTokens.fontMono },
  bkDay: { fontSize: 20, fontWeight: '600', color: admTokens.text, fontFamily: admTokens.fontMono },
  bkWd: { fontSize: 8.5, fontWeight: '600', color: admTokens.textMuted, letterSpacing: 0.3, fontFamily: admTokens.fontMono },
  schedService: { fontSize: 12.5, color: admTokens.text, fontWeight: '600' },
  schedTime: { fontSize: 10.5, color: admTokens.textMuted, marginTop: 2, fontFamily: admTokens.fontMono },
  schedPrice: { fontSize: 12.5, fontWeight: '600', color: admTokens.text, fontFamily: admTokens.fontMono },
});
