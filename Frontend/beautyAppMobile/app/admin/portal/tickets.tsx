/**
 * Admin Portal — Support tickets list (`/admin/portal/tickets`).
 * Slate header w/ open + SLA counts, "+ New" composer, search, category
 * rubric chips, status + source filters, sort, ticket rows w/ inline drawer.
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
import { api } from '@/services/api';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import {
  AdmBtn,
  AdmFilterChip,
  AdmHomeIndicator,
  AdmTabBar,
  AdmTopHeader,
  type AdmTabKind,
} from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

interface CategoryBucket { id: string; label: string; color: string; count: number }
interface StatusBucket { id: string; label: string; count: number }
interface TicketRow {
  id: number;
  priority: 'high' | 'med' | 'low' | string;
  priority_label: string;
  category: string;
  category_label: string;
  status: string;
  status_label: string;
  source: string;
  source_label: string;
  subject: string;
  from_label: string;
  from_principal_type: string;
  from_principal_id: number | null;
  assignee_email: string;
  age: string;
  sla: 'on-track' | 'breached';
}
interface SortOption { value: string; label: string }

interface TicketsData {
  rows: TicketRow[];
  category_rubric: CategoryBucket[];
  active_category: string;
  status_buckets: StatusBucket[];
  active_status: string;
  active_source: string;
  q: string;
  open_count: number;
  sla_count: number;
  admin_email: string;
  sort: string;
  sort_options: SortOption[];
  tab_badges: Partial<Record<AdmTabKind, number | string | null>>;
  notif_count: number;
  session_remaining?: string;
  admin_initials?: string;
}

const SOURCES = [
  { id: '', label: 'All sources' },
  { id: 'in_app', label: 'In-app' },
  { id: 'email', label: 'Email' },
  { id: 'system', label: 'System' },
];

function priorityColor(p: string): string {
  return p === 'high' ? '#C0392B' : p === 'med' ? '#7A5A1F' : '#2F7A47';
}

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

export default function AdminTickets() {
  const router = useRouter();
  const sp = useLocalSearchParams();
  const [env, setEnv] = useState<BffEnvelope<TicketsData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [ncSubject, setNcSubject] = useState('');
  const [ncPriority, setNcPriority] = useState('med');
  const [ncCategory, setNcCategory] = useState('booking');
  const [ncSource, setNcSource] = useState('in_app');
  const [ncBody, setNcBody] = useState('');
  const [ncError, setNcError] = useState<string | null>(null);
  const [ncSaved, setNcSaved] = useState(false);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [drawerAssignee, setDrawerAssignee] = useState('');
  const [drawerStatus, setDrawerStatus] = useState('new');
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Filters live in local state, NOT the URL — same pattern as the CRM list.
  // `router.replace` on every filter/sort/search change drove a route
  // transition that flashed the dark Stack background. Local state keeps this
  // screen mounted, so changes trigger a quiet background refetch (stale-
  // while-revalidate) with no navigation and no blank slate loader.
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

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<TicketsData>('beauty_admin_portal_tickets', params);
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        if (route) router.replace(route as any);
        return;
      }
      setEnv(e);
      if (e.action === 'render') setSearchInput(e.data?.q ?? '');
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [params, router]);

  useEffect(() => {
    // Keep the current data on screen while refetching — never blank to the
    // slate loader on a filter change (that read as a black flash).
    setLoading(true);
    load();
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
  const slaCount = data.sla_count;
  const slaLabel = slaCount === 1 ? 'SLA breach' : 'SLA breaches';

  const onCategory = (id: string) => navWith({ cat: id === 'all' ? null : id });
  const onStatus = (id: string) => navWith({ status: id === 'open' ? null : id });
  const onSource = (id: string) => navWith({ src: id || null });
  const onSort = (v: string) => {
    setSortOpen(false);
    navWith({ sort: v === 'sla' ? null : v });
  };
  const onSearchSubmit = () => {
    const v = searchInput.trim();
    if (v === (data.q || '')) return;
    navWith({ q: v || null });
  };

  const onCreate = async () => {
    const subj = ncSubject.trim();
    if (!subj) {
      setNcError('Subject required.');
      return;
    }
    const link = env._links?.create as BffLink | undefined;
    if (!link?.href) {
      setNcError('Endpoint unavailable.');
      return;
    }
    setNcError(null);
    try {
      await api.request({
        url: link.href,
        method: link.method,
        data: {
          subject: subj,
          priority: ncPriority,
          category: ncCategory,
          source: ncSource,
          body: ncBody.trim(),
        },
      });
      setNcSaved(true);
      setNcSubject('');
      setNcBody('');
      setTimeout(() => {
        setComposerOpen(false);
        setNcSaved(false);
        load();
      }, 800);
    } catch (err: any) {
      setNcError(err?.response?.data?.detail ?? 'Failed to create ticket.');
    }
  };

  const toggleRow = (t: TicketRow) => {
    if (expandedId === t.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(t.id);
    setDrawerAssignee(t.assignee_email);
    setDrawerStatus(t.status);
    setDrawerError(null);
  };

  const onAssign = async (t: TicketRow, email?: string) => {
    const link = env._links?.assign_template as BffLink | undefined;
    if (!link?.href) return;
    setDrawerError(null);
    const target = (email ?? drawerAssignee).trim();
    try {
      await api.request({
        url: link.href.replace(':id', String(t.id)),
        method: link.method,
        data: { assignee_email: target },
      });
      load();
    } catch (err: any) {
      setDrawerError(err?.response?.data?.detail ?? 'Failed to assign.');
    }
  };

  const onStatusChange = async (t: TicketRow) => {
    const link = env._links?.status_template as BffLink | undefined;
    if (!link?.href) return;
    setDrawerError(null);
    try {
      await api.request({
        url: link.href.replace(':id', String(t.id)),
        method: link.method,
        data: { status: drawerStatus },
      });
      load();
    } catch (err: any) {
      setDrawerError(err?.response?.data?.detail ?? 'Failed to update.');
    }
  };

  const onTab = (kind: AdmTabKind) => {
    if (kind === 'tickets') return;
    const screen = kind === 'home' ? 'beauty_admin_portal_dashboard' : `beauty_admin_portal_${kind}`;
    const route = nativeRouteFor(screen);
    if (route) router.push(route as any);
  };

  const currentSortLabel =
    data.sort_options.find((o) => o.value === data.sort)?.label ?? 'SLA · age';

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />
      <AdmTopHeader notifCount={data.notif_count || null} initials={data.admin_initials || 'AD'} />

      <View style={styles.sub}>
        <View style={{ flex: 1 }}>
          <Text style={styles.subTitle}>Support tickets</Text>
          <Text style={styles.subSummary}>
            <Text style={styles.subNum}>{data.open_count}</Text> open ·{' '}
            <Text style={[styles.subNum, { color: '#FCC2B7' }]}>{slaCount}</Text> {slaLabel}
          </Text>
        </View>
        <Pressable style={styles.newBtn} onPress={() => setComposerOpen((v) => !v)}>
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>

      {composerOpen ? (
        <View style={styles.composer}>
          <Text style={styles.eyebrowLight}>New ticket</Text>
          <TextInput
            style={styles.ti}
            value={ncSubject}
            onChangeText={setNcSubject}
            placeholder="Subject"
            placeholderTextColor={admTokens.textMuted}
          />
          <View style={styles.tiRow}>
            <PickerRow
              label="Priority"
              value={ncPriority}
              setValue={setNcPriority}
              options={[
                { value: 'high', label: 'High' },
                { value: 'med', label: 'Med' },
                { value: 'low', label: 'Low' },
              ]}
            />
            <PickerRow
              label="Category"
              value={ncCategory}
              setValue={setNcCategory}
              options={data.category_rubric
                .filter((c) => c.id !== 'all')
                .map((c) => ({ value: c.id, label: c.label }))}
            />
            <PickerRow
              label="Source"
              value={ncSource}
              setValue={setNcSource}
              options={[
                { value: 'in_app', label: 'In-app' },
                { value: 'email', label: 'Email' },
                { value: 'system', label: 'System' },
              ]}
            />
          </View>
          <TextInput
            style={[styles.ti, { minHeight: 60 }]}
            multiline
            value={ncBody}
            onChangeText={setNcBody}
            placeholder="Details (optional)"
            placeholderTextColor={admTokens.textMuted}
          />
          <View style={styles.composerActions}>
            {ncError ? <Text style={[styles.hint, { color: '#C0392B' }]}>{ncError}</Text> : null}
            {ncSaved ? <Text style={[styles.hint, { color: '#2F7A47' }]}>Created.</Text> : null}
            <View style={{ flex: 1 }} />
            <AdmBtn variant="secondary" size="sm" onPress={() => setComposerOpen(false)}>Cancel</AdmBtn>
            <View style={{ width: 6 }} />
            <AdmBtn variant="primary" size="sm" disabled={!ncSubject.trim()} onPress={onCreate}>
              Create ticket
            </AdmBtn>
          </View>
        </View>
      ) : null}

      <ScrollView
        style={styles.body}
        stickyHeaderIndices={[]}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={styles.filters}>
          <View style={styles.search}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#6B6F77" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={11} cy={11} r={7} />
              <Path d="M20 20l-3.5-3.5" />
            </Svg>
            <TextInput
              style={styles.searchInput}
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmitEditing={onSearchSubmit}
              onBlur={onSearchSubmit}
              placeholder="Ticket #, subject, customer, provider…"
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

          <Text style={styles.rubricHead}>Rubric · Category</Text>
          <View style={styles.chipRow}>
            {data.category_rubric.map((c) => {
              const active = data.active_category === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => onCategory(c.id)}
                  style={[styles.catChip, active && { backgroundColor: '#0F1115', borderColor: '#0F1115' }]}
                >
                  <View style={[styles.catDot, { backgroundColor: c.color }]} />
                  <Text style={[styles.catLabel, active && { color: '#fff' }]}>{c.label}</Text>
                  <Text style={[styles.catCnt, active && { color: 'rgba(255,255,255,0.7)' }]}>
                    {c.count}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.rubricHead}>Rubric · Status & SLA</Text>
          <View style={styles.chipRow}>
            {data.status_buckets.map((b) => (
              <AdmFilterChip
                key={b.id}
                active={data.active_status === b.id}
                count={b.count}
                onPress={() => onStatus(b.id)}
              >
                {b.label}
              </AdmFilterChip>
            ))}
          </View>

          <Text style={styles.rubricHead}>Rubric · Source</Text>
          <View style={styles.chipRow}>
            {SOURCES.map((s) => (
              <AdmFilterChip
                key={s.id || 'all'}
                active={(data.active_source || '') === s.id}
                onPress={() => onSource(s.id)}
              >
                {s.label}
              </AdmFilterChip>
            ))}
          </View>
        </View>

        <View style={styles.resultRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.resultCount}>
              {data.rows.length} ticket{data.rows.length === 1 ? '' : 's'}
            </Text>
            {loading ? <ActivityIndicator size="small" color={admTokens.textMuted} /> : null}
          </View>
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
          <Text style={styles.empty}>No tickets match these filters.</Text>
        ) : (
          data.rows.map((t) => {
            const expanded = expandedId === t.id;
            const catColor = data.category_rubric.find((c) => c.id === t.category)?.color ?? '#0F1115';
            const pc = priorityColor(t.priority);
            return (
              <View key={t.id} style={styles.tRow}>
                <Pressable onPress={() => toggleRow(t)} accessibilityLabel={`Ticket #${t.id} — ${t.subject}`}>
                  <View style={styles.tRowH}>
                    <View style={[styles.prioDot, { backgroundColor: pc }]} />
                    <Text style={styles.monoId}>#{t.id}</Text>
                    <Text style={[styles.prioLabel, { color: pc }]}>{t.priority_label}</Text>
                    <View style={[styles.catPill, { backgroundColor: hexAlpha(catColor, 0.1) }]}>
                      <Text style={[styles.catPillText, { color: catColor }]}>{t.category_label}</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    {t.sla === 'breached' ? (
                      <View style={styles.slaBadge}>
                        <Text style={styles.slaBadgeText}>SLA · {t.age}</Text>
                      </View>
                    ) : (
                      <Text style={styles.age}>{t.age}</Text>
                    )}
                  </View>
                  <Text style={styles.subj}>{t.subject}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.tFrom}>{t.from_label || '—'}</Text>
                    <View style={styles.sourcePill}>
                      <Text style={styles.sourcePillText}>{t.source_label}</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Text style={styles.assignee}>{t.assignee_email || 'Unassigned'}</Text>
                    <Text style={styles.statusChip}>{t.status_label}</Text>
                  </View>
                </Pressable>

                {expanded ? (
                  <View style={styles.drawer}>
                    <View style={styles.drawerRow}>
                      <Text style={styles.dl}>Assignee</Text>
                      <TextInput
                        style={styles.di}
                        value={drawerAssignee}
                        onChangeText={setDrawerAssignee}
                        placeholder="email@beauty.io"
                        placeholderTextColor={admTokens.textMuted}
                        autoCapitalize="none"
                      />
                      <Pressable style={styles.db} onPress={() => onAssign(t)}>
                        <Text style={styles.dbText}>Save</Text>
                      </Pressable>
                      {!drawerAssignee ? (
                        <Pressable style={[styles.db, styles.dbGhost]} onPress={() => onAssign(t, data.admin_email)}>
                          <Text style={[styles.dbText, { color: admTokens.text }]}>Assign to me</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={styles.drawerRow}>
                      <Text style={styles.dl}>Status</Text>
                      <View style={styles.statusPick}>
                        {['new', 'in_progress', 'waiting', 'resolved'].map((s) => (
                          <Pressable
                            key={s}
                            onPress={() => setDrawerStatus(s)}
                            style={[
                              styles.statusOpt,
                              drawerStatus === s && { backgroundColor: '#0F1115' },
                            ]}
                          >
                            <Text style={[styles.statusOptText, drawerStatus === s && { color: '#fff' }]}>
                              {s.replace('_', ' ')}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <Pressable style={styles.db} onPress={() => onStatusChange(t)}>
                        <Text style={styles.dbText}>Update</Text>
                      </Pressable>
                    </View>
                    {drawerError ? <Text style={[styles.hint, { color: '#C0392B' }]}>{drawerError}</Text> : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <AdmTabBar active="tickets" badges={data.tab_badges} onSelect={onTab} />
      <AdmHomeIndicator tone="slate" />
    </View>
  );
}

function PickerRow({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {options.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => setValue(o.value)}
              style={[styles.pickerOpt, value === o.value && { backgroundColor: '#0F1115' }]}
            >
              <Text style={[styles.pickerOptText, value === o.value && { color: '#fff' }]}>
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: admTokens.surface },
  loader: { flex: 1, backgroundColor: admTokens.slate, alignItems: 'center', justifyContent: 'center' },
  sub: {
    backgroundColor: admTokens.slate,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: admTokens.slateLine,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  subTitle: { fontSize: 22, color: admTokens.white, fontFamily: 'CormorantGaramond_500Medium' },
  subSummary: { marginTop: 6, fontSize: 12, color: admTokens.slateMuted },
  subNum: { color: admTokens.white, fontWeight: '600', fontFamily: admTokens.fontMono },
  newBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: admTokens.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtnText: { color: admTokens.slate, fontSize: 12, fontWeight: '700' },
  composer: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: admTokens.line, gap: 8 },
  eyebrowLight: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
  },
  ti: {
    backgroundColor: admTokens.surface,
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: admTokens.text,
    textAlignVertical: 'top',
  },
  tiRow: { flexDirection: 'row', gap: 6 },
  composerActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  hint: { fontSize: 11, color: admTokens.textMuted },
  pickerLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
    marginBottom: 4,
  },
  pickerOpt: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: admTokens.surface,
    borderWidth: 1,
    borderColor: admTokens.line,
  },
  pickerOptText: { fontSize: 11, color: admTokens.text },
  body: { flex: 1, backgroundColor: '#fff' },
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
  rubricHead: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
    marginTop: 4,
    marginBottom: 6,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: admTokens.line,
  },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catLabel: { fontSize: 11, fontWeight: '600', color: admTokens.text },
  catCnt: { fontSize: 10, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
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
  sortMenu: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECECEE', paddingVertical: 4 },
  sortItem: { paddingHorizontal: 14, paddingVertical: 8 },
  sortItemOn: { backgroundColor: admTokens.surface },
  sortItemText: { fontSize: 12, color: admTokens.text },
  empty: { padding: 32, textAlign: 'center', color: admTokens.textMuted, fontSize: 12 },
  tRow: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ECECEE' },
  tRowH: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prioDot: { width: 6, height: 6, borderRadius: 3 },
  monoId: { fontSize: 11, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  prioLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  catPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catPillText: { fontSize: 10, fontWeight: '700' },
  slaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#FCE8E5' },
  slaBadgeText: { fontSize: 10, fontWeight: '700', color: '#C0392B' },
  age: { fontSize: 10, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  subj: { fontSize: 13, color: admTokens.text, fontWeight: '600', marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  tFrom: { fontSize: 11, color: admTokens.textMuted },
  sourcePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: admTokens.surface },
  sourcePillText: { fontSize: 10, color: admTokens.textMuted, fontWeight: '600' },
  assignee: { fontSize: 10, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  statusChip: {
    fontSize: 10,
    fontWeight: '700',
    color: admTokens.text,
    backgroundColor: admTokens.surface2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  drawer: { marginTop: 10, backgroundColor: admTokens.surface, padding: 10, borderRadius: 10, gap: 8 },
  drawerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dl: { fontSize: 10, fontWeight: '700', color: admTokens.textMuted, width: 60 },
  di: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: admTokens.text,
  },
  db: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#0F1115',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dbGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: admTokens.line },
  dbText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statusPick: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  statusOpt: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: admTokens.line,
  },
  statusOptText: { fontSize: 11, color: admTokens.text, textTransform: 'capitalize' },
});
