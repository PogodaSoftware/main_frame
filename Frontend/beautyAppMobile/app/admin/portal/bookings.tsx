/**
 * Admin Portal — Bookings ledger (`/admin/portal/bookings`).
 * Slate sub-header w/ summary, search + status chips, sort dropdown,
 * row list w/ customer → provider, status chip + price.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import {
  AdmFilterChip,
  AdmHomeIndicator,
  AdmStatusChip,
  AdmTabBar,
  AdmTopHeader,
  type AdmTabKind,
} from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

type StatusId = 'All' | 'Upcoming' | 'Pending' | 'Past' | 'Cancelled' | 'Refunded';

interface Row {
  id: number;
  confirmation: string;
  mon: string;
  day: number;
  weekday: string;
  time: string;
  service: string;
  customer_name: string;
  provider_name: string;
  price: string;
  status: string;
}

interface SortOption { value: string; label: string }

interface BookingsData {
  rows: Row[];
  status_buckets: { id: StatusId; count: number }[];
  active_status: StatusId;
  filtered_total: number;
  q: string;
  sort: string;
  sort_options: SortOption[];
  this_month_count: number;
  gmv_label: string;
  refund_rate_pct: string;
  tab_badges: Partial<Record<AdmTabKind, number | string | null>>;
  notif_count: number;
  session_remaining?: string;
  admin_initials?: string;
}

export default function AdminBookings() {
  const router = useRouter();
  const sp = useLocalSearchParams();
  const [env, setEnv] = useState<BffEnvelope<BookingsData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [sortOpen, setSortOpen] = useState(false);

  const params = useMemo(() => {
    const out: Record<string, string> = {};
    for (const k of Object.keys(sp)) {
      const v = sp[k];
      if (typeof v === 'string') out[k] = v;
      else if (Array.isArray(v) && v.length) out[k] = String(v[0]);
    }
    return out;
  }, [sp]);
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  useEffect(() => {
    let cancelled = false;
    setEnv(null);
    setError(null);
    resolve<BookingsData>('beauty_admin_portal_bookings', params)
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          if (route) router.replace(route as any);
          return;
        }
        setEnv(e);
        if (e.action === 'render') setSearchInput(e.data?.q ?? '');
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  const navWith = useCallback(
    (extra: Record<string, string | null>) => {
      const next: Record<string, string> = { ...params };
      for (const [k, v] of Object.entries(extra)) {
        if (v === null || v === '') delete next[k];
        else next[k] = v;
      }
      router.replace({ pathname: '/admin/portal/bookings', params: next } as any);
    },
    [params, router],
  );

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

  const onStatus = (id: StatusId) => navWith({ status: id === 'All' ? null : id.toLowerCase() });
  const onSort = (v: string) => {
    setSortOpen(false);
    navWith({ sort: v === 'newest' ? null : v });
  };
  const onSearchSubmit = () => {
    const v = searchInput.trim();
    if (v === (data.q || '')) return;
    navWith({ q: v || null });
  };
  const openBooking = (r: Row) => {
    // Admin booking detail — keep navigation inside the admin portal. Never
    // open the customer/business `beauty_booking_detail` screen from here.
    router.push({ pathname: '/admin/portal/bookings/[id]', params: { id: String(r.id) } } as any);
  };
  const onTab = (kind: AdmTabKind) => {
    if (kind === 'bookings') return;
    const screen = kind === 'home' ? 'beauty_admin_portal_dashboard' : `beauty_admin_portal_${kind}`;
    const route = nativeRouteFor(screen);
    if (route) router.push(route as any);
  };

  const currentSortLabel =
    data.sort_options.find((o) => o.value === data.sort)?.label ?? 'Newest first';

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />
      <AdmTopHeader notifCount={data.notif_count || null} initials={data.admin_initials || 'AD'} />

      <View style={styles.sub}>
        <Text style={styles.subTitle}>Bookings ledger</Text>
        <Text style={styles.subSummary}>
          <Text style={styles.subNum}>{data.this_month_count.toLocaleString()}</Text> this month ·{' '}
          <Text style={styles.subNum}>{data.gmv_label}</Text> GMV ·{' '}
          <Text style={styles.subNum}>{data.refund_rate_pct}</Text> refund rate
        </Text>
      </View>

      <View style={styles.filters}>
        <View style={styles.search}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#6B6F77" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={11} cy={11} r={7} />
            <Path d="M20 20l-3.5-3.5" />
          </Svg>
          <TextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={onSearchSubmit}
            onBlur={onSearchSubmit}
            placeholder="Booking ID, customer, provider…"
            placeholderTextColor={admTokens.textMuted}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchInput ? (
            <Pressable
              onPress={() => {
                setSearchInput('');
                navWith({ q: null });
              }}
              style={styles.searchClear}
            >
              <Text style={{ color: admTokens.textMuted, fontSize: 14 }}>×</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.chips}>
          {data.status_buckets.map((b) => (
            <AdmFilterChip
              key={b.id}
              active={data.active_status === b.id}
              count={b.count}
              onPress={() => onStatus(b.id)}
            >
              {b.id}
            </AdmFilterChip>
          ))}
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.resultRow}>
          <Text style={styles.resultCount}>{data.filtered_total.toLocaleString()} bookings</Text>
          <Pressable style={styles.sort} onPress={() => setSortOpen((v) => !v)}>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={admTokens.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 6h18M6 12h12M10 18h4" />
            </Svg>
            <Text style={styles.sortText}>{currentSortLabel} ▾</Text>
          </Pressable>
        </View>
        {sortOpen ? (
          <View style={styles.sortMenu}>
            {data.sort_options.map((o) => (
              <Pressable
                key={o.value}
                onPress={() => onSort(o.value)}
                style={[styles.sortItem, o.value === data.sort && styles.sortItemOn]}
              >
                <Text style={[styles.sortItemText, o.value === data.sort && { fontWeight: '700' }]}>
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {data.rows.length === 0 ? (
          <Text style={styles.empty}>No bookings match these filters.</Text>
        ) : (
          data.rows.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => openBooking(r)}
              style={styles.row}
              accessibilityLabel={`Open booking ${r.confirmation}`}
            >
              <View style={styles.bkDate}>
                <Text style={styles.bkMon}>{r.mon}</Text>
                <Text style={styles.bkDay}>{r.day}</Text>
                <Text style={styles.bkWd}>{r.weekday}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.bkService} numberOfLines={1}>{r.service}</Text>
                <Text style={styles.bkParties} numberOfLines={1}>
                  {r.customer_name} → {r.provider_name}
                </Text>
                <Text style={styles.bkMeta}>{r.confirmation} · {r.time}</Text>
              </View>
              <View style={styles.bkRight}>
                <Text style={styles.bkPrice}>{r.price}</Text>
                <AdmStatusChip status={r.status} />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <AdmTabBar active="bookings" badges={data.tab_badges} onSelect={onTab} />
      <AdmHomeIndicator tone="slate" />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: admTokens.surface },
  loader: { flex: 1, backgroundColor: admTokens.slate, alignItems: 'center', justifyContent: 'center' },
  sub: { backgroundColor: admTokens.slate, paddingHorizontal: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: admTokens.slateLine },
  subTitle: { fontSize: 22, color: admTokens.white, fontFamily: 'CormorantGaramond_500Medium' },
  subSummary: { marginTop: 6, fontSize: 12, color: admTokens.slateMuted },
  subNum: { color: admTokens.white, fontWeight: '600', fontFamily: admTokens.fontMono },
  filters: { backgroundColor: admTokens.surface, borderBottomWidth: 1, borderBottomColor: admTokens.line, paddingHorizontal: 14, paddingVertical: 10 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: admTokens.text },
  searchClear: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: admTokens.surface,
    borderWidth: 1,
    borderColor: admTokens.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  body: { flex: 1, backgroundColor: '#fff' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEE',
  },
  resultCount: { fontSize: 11, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { fontSize: 11.5, color: admTokens.text, fontWeight: '600' },
  sortMenu: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEE',
    paddingVertical: 4,
  },
  sortItem: { paddingHorizontal: 14, paddingVertical: 8 },
  sortItemOn: { backgroundColor: admTokens.surface },
  sortItemText: { fontSize: 12, color: admTokens.text },
  empty: { padding: 32, textAlign: 'center', color: admTokens.textMuted, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEE',
  },
  bkDate: { width: 40, alignItems: 'center' },
  bkMon: { fontSize: 8.5, fontWeight: '700', color: admTokens.textMuted, letterSpacing: 0.4, fontFamily: admTokens.fontMono },
  bkDay: { fontSize: 20, fontWeight: '600', color: admTokens.text, fontFamily: admTokens.fontMono },
  bkWd: { fontSize: 8.5, fontWeight: '600', color: admTokens.textMuted, letterSpacing: 0.3, fontFamily: admTokens.fontMono },
  bkService: { fontSize: 12.5, color: admTokens.text, fontWeight: '600' },
  bkParties: { fontSize: 10.5, color: admTokens.textMuted, marginTop: 2, fontFamily: admTokens.fontMono },
  bkMeta: { fontSize: 10, color: admTokens.textMuted, marginTop: 2, fontFamily: admTokens.fontMono },
  bkRight: { alignItems: 'flex-end', gap: 4 },
  bkPrice: { fontSize: 12.5, fontWeight: '600', color: admTokens.text, fontFamily: admTokens.fontMono },
});
