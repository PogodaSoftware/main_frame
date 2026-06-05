/**
 * Admin Portal — CRM list (`/admin/portal/crm`).
 * Customer/Provider segmented tabs, search, status + tag + advanced filters,
 * row list with kebab → suspend. Filters drive new BFF resolves via `params`.
 * All counts, tags, rows from DB.
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
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import {
  AdmAvatar,
  AdmFilterChip,
  AdmHomeIndicator,
  AdmStatusChip,
  AdmTabBar,
  AdmTopHeader,
  type AdmTabKind,
} from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

type SegType = 'customers' | 'providers';
type StatusId = 'All' | 'Active' | 'Pending' | 'Suspended' | 'Flagged' | 'Deleted';

interface Row {
  id: number;
  initials: string;
  name: string;
  email: string;
  status: StatusId | string;
  tags: string[];
  meta1: string;
  meta2: string;
  meta3: string;
  lifetime: string;
}

interface Tag {
  id: string;
  label: string;
  color: string;
  tone: string;
  count: number;
}

interface StatusBucket {
  id: StatusId;
  count: number;
}

interface CrmData {
  type: SegType;
  chip_style: 'pill' | 'underline';
  bulk: boolean;
  active_tag_ids: string[];
  active_status: StatusId;
  q: string;
  has_bk: boolean;
  signup_30d: boolean;
  active_7d: boolean;
  spend_high: boolean;
  rows: Row[];
  counts: { customers: number; providers: number };
  status_buckets: StatusBucket[];
  filtered_total: number;
  tags: Tag[];
  tab_badges: Partial<Record<AdmTabKind, number | string | null>>;
  notif_count: number;
  session_remaining?: string;
  admin_initials?: string;
}

type AdvIcon = (color: string) => React.ReactNode;
const CalendarIcon: AdvIcon = (c) => (
  <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={3} y={4} width={18} height={18} rx={2} />
    <Path d="M16 2v4M8 2v4M3 10h18" />
  </Svg>
);
const ClockIcon: AdvIcon = (c) => (
  <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={10} />
    <Path d="M12 6v6l4 2" />
  </Svg>
);

const ADVANCED: {
  key: 'signup_30d' | 'active_7d' | 'spend_high' | 'has_bk';
  label: string;
  icon?: AdvIcon;
  caret?: boolean;
}[] = [
  { key: 'signup_30d', label: 'Sign-up: Last 30d', icon: CalendarIcon, caret: true },
  { key: 'active_7d', label: 'Last active: 7d', icon: ClockIcon, caret: true },
  { key: 'spend_high', label: 'Spend: High' },
  { key: 'has_bk', label: 'Has bookings' },
];

export default function AdminCrm() {
  const router = useRouter();
  const sp = useLocalSearchParams();
  const [env, setEnv] = useState<BffEnvelope<CrmData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState<string>('');
  // Bulk-select mode. Active when the resolver returns `bulk:true` (forced via
  // ?bulk=1). Tapping a row toggles selection instead of opening its detail;
  // the floating action bar appears once ≥1 row is selected.
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Filters live in local state, NOT the URL. Re-navigating via
  // `router.replace` on every pill tap caused a route transition that flashed
  // the dark Stack background. Local state keeps this screen mounted, so
  // filter changes just trigger a quiet background refetch (stale-while-
  // revalidate) with no navigation. Seeded once from any deep-link params.
  const [params, setParams] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const k of Object.keys(sp)) {
      const v = sp[k];
      if (typeof v === 'string') out[k] = v;
      else if (Array.isArray(v) && v.length) out[k] = String(v[0]);
    }
    return out;
  });
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);
  // Cache resolved envelopes per filter combo. Toggling customers↔providers
  // (or back to a prior filter) shows the cached result instantly, then
  // revalidates quietly in the background — so repeat taps feel immediate
  // even when the dev emulator's network round-trip is slow.
  const cacheRef = React.useRef<Map<string, BffEnvelope<CrmData>>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setError(null);
    // Instant paint from cache when we've seen this combo before.
    const hit = cacheRef.current.get(paramsKey);
    if (hit) {
      setEnv(hit);
      if (hit.action === 'render') setSearchInput(hit.data?.q ?? '');
    }
    // Revalidate (or first-load) in the background. Keep current data on
    // screen meanwhile — never blank to the slate loader.
    setLoading(true);
    resolve<CrmData>('beauty_admin_portal_crm', params)
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          if (route) router.replace(route as any);
          return;
        }
        cacheRef.current.set(paramsKey, e);
        setEnv(e);
        if (e.action === 'render') setSearchInput(e.data?.q ?? '');
      })
      .catch((err: any) => {
        if (!cancelled && !hit) setError(err?.response?.data?.detail ?? 'Failed to load.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  const navWith = useCallback(
    (extra: Record<string, string | null>) => {
      setParams((prev) => {
        const next: Record<string, string> = { ...prev };
        for (const [k, v] of Object.entries(extra)) {
          if (v === null || v === '') delete next[k];
          else next[k] = v;
        }
        return next;
      });
    },
    [],
  );

  if (error) {
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
  const fmt = (n: number) => n.toLocaleString();
  const bulkMode = !!data.bulk;
  const selectedCount = selected.size;
  const toggleSelect = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const onBulkSuspend = () => {
    const firstId = Array.from(selected)[0];
    if (firstId == null) return;
    // Bulk suspend has no batch endpoint yet; route to the single-target
    // suspend confirmation for the first selected row.
    const kind = data.type === 'customers' ? 'customer' : 'business';
    router.push({
      pathname: '/admin/portal/crm/suspend/[type]/[id]',
      params: { type: kind, id: String(firstId) },
    } as any);
  };

  const onStatus = (id: StatusId) => navWith({ status: id === 'All' ? null : id.toLowerCase() });
  const onType = (t: SegType) => navWith({ type: t });
  const onTagPress = (id: string) =>
    navWith({ tag: data.active_tag_ids.includes(id) ? null : id });
  const toggleAdvanced = (k: 'signup_30d' | 'active_7d' | 'spend_high' | 'has_bk') => {
    const isOn = (data as any)[k];
    navWith({ [k]: isOn ? null : '1' });
  };
  const onSearchSubmit = () => {
    const v = searchInput.trim();
    if (v === (data.q || '')) return;
    navWith({ q: v || null });
  };
  const openDetail = (r: Row) => {
    const screen =
      data.type === 'customers'
        ? 'beauty_admin_portal_customer_detail'
        : 'beauty_admin_portal_provider_detail';
    const route = nativeRouteFor(screen);
    if (!route) return;
    router.push({ pathname: route, params: { id: String(r.id) } } as any);
  };
  const openSuspend = (r: Row) => {
    const kind = data.type === 'customers' ? 'customer' : 'business';
    router.push({
      pathname: '/admin/portal/crm/suspend/[type]/[id]',
      params: { type: kind, id: String(r.id) },
    } as any);
  };
  const onManage = () => router.push('/admin/portal/crm/tags' as any);
  const onTab = (kind: AdmTabKind) => {
    if (kind === 'crm') return;
    const rel = kind === 'home' ? 'home' : kind;
    const link = env._links?.[rel];
    const route = nativeRouteFor(link?.screen);
    if (route) router.push(route as any);
  };

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />
      <AdmTopHeader notifCount={data.notif_count || null} initials={data.admin_initials || 'AD'} />

      {data.session_remaining ? (
        <View style={styles.session}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#8A6A1F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={10} />
              <Path d="M12 7v5l3 2" />
            </Svg>
            <Text style={styles.sessionText}>
              Session ends in <Text style={styles.sessionMono}>{data.session_remaining}</Text>
            </Text>
          </View>
          <Pressable>
            <Text style={styles.sessionLink}>Extend</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.segWrap}>
          <View style={styles.seg}>
            <Pressable
              style={[styles.segTab, data.type === 'customers' && styles.segTabOn]}
              onPress={() => onType('customers')}
            >
              <Text style={[styles.segTabText, data.type === 'customers' && styles.segTabTextOn]}>
                Customers
              </Text>
              <View style={styles.segCount}>
                <Text style={styles.segCountText}>{fmt(data.counts.customers)}</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.segTab, data.type === 'providers' && styles.segTabOn]}
              onPress={() => onType('providers')}
            >
              <Text style={[styles.segTabText, data.type === 'providers' && styles.segTabTextOn]}>
                Providers
              </Text>
              <View style={styles.segCount}>
                <Text style={styles.segCountText}>{fmt(data.counts.providers)}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.filterRow}>
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
              placeholder="Search name, email, phone, ID, business…"
              placeholderTextColor={admTokens.textMuted}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {searchInput ? (
              <Pressable
                onPress={() => {
                  setSearchInput('');
                  navWith({ q: null });
                }}
                style={styles.searchClear}
              >
                <Text style={{ color: admTokens.textMuted, fontSize: 14, lineHeight: 14 }}>×</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.chipRow}>
            {data.status_buckets.map((b) => (
              <AdmFilterChip
                key={b.id}
                active={data.active_status === b.id}
                count={b.count}
                style={data.chip_style}
                onPress={() => onStatus(b.id)}
              >
                {b.id}
              </AdmFilterChip>
            ))}
          </View>

          {data.tags.length > 0 ? (
            <>
              <View style={styles.tagHead}>
                <Text style={styles.eyebrowLight}>Tags</Text>
                <View style={styles.tagHeadRule} />
                <Pressable onPress={onManage} style={styles.manageBtn}>
                  <Svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke={admTokens.text} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <Circle cx={12} cy={12} r={3} />
                  </Svg>
                  <Text style={styles.manageBtnText}>Manage</Text>
                </Pressable>
              </View>
              <View style={styles.chipRow}>
                {data.tags.map((t) => {
                  const active = data.active_tag_ids.includes(t.id);
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => onTagPress(t.id)}
                      style={[
                        styles.tchip,
                        {
                          backgroundColor: active ? t.color : t.tone,
                          borderColor: active ? t.color : t.color + '33',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.tchipDot,
                          { backgroundColor: active ? '#fff' : t.color },
                        ]}
                      />
                      <Text style={[styles.tchipText, { color: active ? '#fff' : t.color }]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable onPress={onManage} style={styles.addTag}>
                  <Text style={styles.addTagText}>+ Tag</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          <View style={styles.chipRow}>
            {ADVANCED.map((f) => (
              <React.Fragment key={f.key}>
                <AdmFilterChip
                  active={Boolean((data as any)[f.key])}
                  icon={f.icon}
                  caret={f.caret}
                  onPress={() => toggleAdvanced(f.key)}
                >
                  {f.label}
                </AdmFilterChip>
                {/* City sits after "Last active" in the design. No city column
                    exists on BeautyUser / BusinessProvider, so this is a
                    visual-parity placeholder pending a city schema field. */}
                {f.key === 'active_7d' ? <AdmFilterChip>City: NYC</AdmFilterChip> : null}
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={styles.resultRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.resultCount}>{fmt(data.filtered_total)} results</Text>
            {loading ? <ActivityIndicator size="small" color={admTokens.textMuted} /> : null}
          </View>
          <View style={styles.sort}>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={admTokens.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 6h18M6 12h12M10 18h4" />
            </Svg>
            <Text style={styles.sortText}>Newest first ▾</Text>
          </View>
        </View>

        <View style={styles.rows}>
          {data.rows.length === 0 ? (
            <Text style={styles.emptyText}>No rows match the current filters.</Text>
          ) : (
            data.rows.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => (bulkMode ? toggleSelect(r.id) : openDetail(r))}
                style={[styles.rItem, bulkMode && selected.has(r.id) && styles.rItemSelected]}
                accessibilityLabel={
                  bulkMode
                    ? `${selected.has(r.id) ? 'Deselect' : 'Select'} ${r.name}`
                    : `Open ${r.name} detail`
                }
              >
                {bulkMode ? (
                  <View style={[styles.checkbox, selected.has(r.id) && styles.checkboxOn]}>
                    {selected.has(r.id) ? (
                      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M20 6L9 17l-5-5" />
                      </Svg>
                    ) : null}
                  </View>
                ) : null}
                <AdmAvatar
                  initials={r.initials}
                  size={36}
                  kind={data.type === 'providers' ? 'provider' : 'customer'}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.riH}>
                    <Text style={styles.riName} numberOfLines={1}>{r.name}</Text>
                    {r.tags.map((t) => (
                      <AdmStatusChip key={t} status={t} />
                    ))}
                  </View>
                  <Text style={styles.riEmail} numberOfLines={1}>{r.email}</Text>
                  <Text style={styles.riMeta}>
                    {r.meta1}  ·  {r.meta2}  ·  {r.meta3}
                  </Text>
                </View>
                <View style={styles.riRight}>
                  <AdmStatusChip status={r.status} />
                  <Text style={styles.riLife}>{r.lifetime}</Text>
                </View>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    openSuspend(r);
                  }}
                  style={styles.kebab}
                  accessibilityLabel={`${r.status === 'Suspended' ? 'Reinstate' : 'Suspend'} ${r.name}`}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill={admTokens.textMuted}>
                    <Circle cx={5} cy={12} r={1.6} />
                    <Circle cx={12} cy={12} r={1.6} />
                    <Circle cx={19} cy={12} r={1.6} />
                  </Svg>
                </Pressable>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {bulkMode && selectedCount > 0 ? (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkCount}>{selectedCount} selected</Text>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.bulkBtn} onPress={onManage}>
            <Text style={styles.bulkBtnText}>Tag</Text>
          </Pressable>
          <Pressable style={styles.bulkBtn}>
            <Text style={styles.bulkBtnText}>Message</Text>
          </Pressable>
          <Pressable style={[styles.bulkBtn, styles.bulkBtnDanger]} onPress={onBulkSuspend}>
            <Text style={styles.bulkBtnDangerText}>Suspend</Text>
          </Pressable>
        </View>
      ) : null}

      <AdmTabBar active="crm" badges={data.tab_badges} onSelect={onTab} />
      <AdmHomeIndicator tone="slate" />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: admTokens.surface },
  loader: { flex: 1, backgroundColor: admTokens.slate, alignItems: 'center', justifyContent: 'center' },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF4DA',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(165,122,31,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  sessionText: { fontSize: 11, color: '#8A6A1F' },
  sessionMono: { fontFamily: admTokens.fontMono, fontWeight: '700', color: '#8A6A1F' },
  sessionLink: { color: '#8A6A1F', fontSize: 11, fontWeight: '600', textDecorationLine: 'underline' },
  segWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: admTokens.surface,
    borderBottomWidth: 1,
    borderBottomColor: admTokens.line,
  },
  seg: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    backgroundColor: admTokens.surface2,
    borderRadius: 12,
    marginBottom: 10,
  },
  segTab: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'transparent',
  },
  segTabOn: { backgroundColor: '#fff' },
  segTabText: { fontSize: 13, color: admTokens.textMuted, fontWeight: '500' },
  segTabTextOn: { color: admTokens.text, fontWeight: '600' },
  segCount: {
    backgroundColor: admTokens.surface,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
  },
  segCountText: { fontSize: 10, color: admTokens.textMuted, fontWeight: '600' },
  filterRow: {
    backgroundColor: admTokens.surface,
    borderBottomWidth: 1,
    borderBottomColor: admTokens.line,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tagHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, marginTop: 2 },
  tagHeadRule: { flex: 1, height: 1, backgroundColor: admTokens.line },
  manageBtn: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: admTokens.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manageBtnText: { fontSize: 10, fontWeight: '600', color: admTokens.text },
  eyebrowLight: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
  },
  tchip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  tchipDot: { width: 6, height: 6, borderRadius: 3 },
  tchipText: { fontSize: 11, fontWeight: '600' },
  addTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: admTokens.line,
  },
  addTagText: { fontSize: 11, color: admTokens.textMuted },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEE',
    backgroundColor: '#fff',
  },
  resultCount: { fontSize: 11, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { fontSize: 11.5, color: admTokens.text, fontWeight: '600' },
  rows: { backgroundColor: '#fff' },
  rItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEE',
  },
  riH: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  riName: { fontSize: 13.5, fontWeight: '600', color: admTokens.text, flexShrink: 1 },
  riEmail: {
    fontSize: 10.5,
    color: admTokens.textMuted,
    marginTop: 2,
    fontFamily: admTokens.fontMono,
  },
  riMeta: { fontSize: 10.5, color: admTokens.textMuted, marginTop: 4 },
  riRight: { alignItems: 'flex-end' },
  riLife: { fontSize: 10, color: admTokens.textMuted, marginTop: 4, fontFamily: admTokens.fontMono },
  kebab: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  rItemSelected: { backgroundColor: admTokens.surface },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: admTokens.line,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: admTokens.text, borderColor: admTokens.text },
  bulkBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 104,
    backgroundColor: '#0F1115',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  bulkCount: { color: '#fff', fontSize: 12, fontWeight: '600' },
  bulkBtn: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  bulkBtnDanger: { backgroundColor: admTokens.red },
  bulkBtnDangerText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyText: {
    padding: 24,
    fontSize: 12,
    color: admTokens.textMuted,
    textAlign: 'center',
  },
});
