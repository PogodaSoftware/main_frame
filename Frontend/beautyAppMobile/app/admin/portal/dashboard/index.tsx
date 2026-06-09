/**
 * Admin Portal — Dashboard.
 * Slate chrome (top header + tab bar) over light body. KPI 2x2 grid, trend
 * sparkline, two-up mini bars, quick-link tiles, activity feed. All buttons
 * follow BFF `_links`.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import {
  AdmCard,
  AdmHomeIndicator,
  AdmSectionTitle,
  AdmTabBar,
  AdmTopHeader,
  type AdmTabKind,
} from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

interface Kpi { label: string; value: string; delta: string; tone: 'up' | 'down' | 'flat' }
interface QuickLink { color: string; label: string; sub: string; badge?: number | null; screen?: string }
interface ActivityRow { color: string; title: string; meta: string; time: string }

interface DashData {
  today_label: string;
  first_name: string;
  new_signups: number;
  flagged: number;
  kpis: Kpi[];
  quick_links: QuickLink[];
  activity: ActivityRow[];
  tab_badges: Partial<Record<AdmTabKind, number | string | null>>;
  notif_count: number;
  signups_12w_series: number[];
  signups_12w_total: number;
  bookings_7d_series: number[];
  bookings_7d_total: number;
  bookings_7d_delta: string;
  gmv_7d_series_cents: number[];
  gmv_7d_total: string;
  gmv_7d_delta: string;
  session_remaining?: string;
  admin_initials?: string;
}

function buildSparkPoints(series: number[], width = 320, height = 60): { line: string; fill: string } {
  if (!series || series.length === 0) {
    const flat = `0,${height} ${width},${height}`;
    return { line: flat, fill: `0,${height} ${flat} ${width},${height}` };
  }
  const max = Math.max(1, ...series);
  const step = series.length > 1 ? width / (series.length - 1) : 0;
  const pad = 4;
  const usable = height - pad * 2;
  const pts = series.map((v, i) => {
    const x = +(step * i).toFixed(2);
    const y = +(pad + usable - (v / max) * usable).toFixed(2);
    return `${x},${y}`;
  });
  const line = pts.join(' ');
  const fill = `0,${height} ${line} ${width},${height}`;
  return { line, fill };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<DashData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolve<DashData>('beauty_admin_portal_dashboard')
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          if (route) router.replace(route as any);
          return;
        }
        setEnv(e);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const navByRel = useCallback(
    (rel: string) => {
      const link = env?.action === 'render' ? (env._links?.[rel] as BffLink | undefined) : null;
      const route = nativeRouteFor(link?.screen);
      if (route) router.push(route as any);
    },
    [env, router],
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
  const { line: linePts, fill: fillPts } = buildSparkPoints(data.signups_12w_series ?? []);
  const bookingsBars = data.bookings_7d_series ?? [];
  const bookingsMax = Math.max(1, ...bookingsBars);
  const gmvBars = data.gmv_7d_series_cents ?? [];
  const gmvMax = Math.max(1, ...gmvBars);

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

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.greet}>
          <Text style={styles.eyebrowLight}>{data.today_label} · Overview</Text>
          <Text style={styles.gtitle}>Good morning, {data.first_name}</Text>
          <Text style={styles.gsub}>
            {data.new_signups} new signups overnight · {data.flagged} flagged accounts need review
          </Text>
        </View>

        <View style={styles.kpiGrid}>
          {data.kpis.map((k) => (
            <View key={k.label} style={styles.kpiTile}>
              <Text style={styles.kpiLbl}>{k.label}</Text>
              <Text style={styles.kpiVal}>{k.value}</Text>
              <Text style={[styles.kpiDelta, k.tone === 'up' && styles.kpiUp, k.tone === 'down' && styles.kpiDown]}>
                {k.tone === 'up' ? '▲' : k.tone === 'down' ? '▼' : '·'} {k.delta}
              </Text>
            </View>
          ))}
        </View>

        <AdmCard>
          <View style={styles.trendHead}>
            <View>
              <Text style={styles.eyebrowLight}>Signups · last 12 weeks</Text>
              <Text style={styles.trendVal}>+{(data.signups_12w_total ?? 0).toLocaleString()}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {['12W', '30D', 'YTD'].map((r, i) => (
                <View key={r} style={[styles.rangeChip, i === 0 && styles.rangeChipOn]}>
                  <Text style={[styles.rangeChipText, i === 0 && { color: admTokens.white }]}>{r}</Text>
                </View>
              ))}
            </View>
          </View>
          <Svg width="100%" height={60} viewBox="0 0 320 60" preserveAspectRatio="none">
            <Polyline points={fillPts} fill="rgba(125,168,207,0.16)" stroke="none" />
            <Polyline points={linePts} fill="none" stroke="#7DA8CF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <View style={styles.sparkAxis}>
            {sparkAxisLabels().map((d) => (
              <Text key={d} style={styles.sparkAxisText}>{d}</Text>
            ))}
          </View>
        </AdmCard>

        <View style={styles.twoUp}>
          <AdmCard padding={12} style={{ flex: 1 }}>
            <Text style={styles.eyebrowLight}>Bookings · 7d</Text>
            <View style={styles.bars}>
              {bookingsBars.map((v, i) => {
                const last = i === bookingsBars.length - 1;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: `${(v / bookingsMax) * 100}%`,
                      backgroundColor: '#0F1115',
                      opacity: last ? 1 : 0.55,
                      borderRadius: 2,
                      minHeight: 4,
                    }}
                  />
                );
              })}
            </View>
            <Text style={styles.barsFoot}>
              <Text style={styles.barsFootStrong}>{(data.bookings_7d_total ?? 0).toLocaleString()}</Text> · {data.bookings_7d_delta ?? '0%'}
            </Text>
          </AdmCard>
          <AdmCard padding={12} style={{ flex: 1 }}>
            <Text style={styles.eyebrowLight}>GMV · 7d</Text>
            <View style={styles.bars}>
              {gmvBars.map((v, i) => {
                const last = i === gmvBars.length - 1;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: `${(v / gmvMax) * 100}%`,
                      backgroundColor: '#7DA8CF',
                      opacity: last ? 1 : 0.55,
                      borderRadius: 2,
                      minHeight: 4,
                    }}
                  />
                );
              })}
            </View>
            <Text style={styles.barsFoot}>
              <Text style={styles.barsFootStrong}>{data.gmv_7d_total ?? '$0'}</Text> · {data.gmv_7d_delta ?? '0%'}
            </Text>
          </AdmCard>
        </View>

        <Text style={[styles.eyebrowLight, { marginBottom: 8 }]}>Quick admin</Text>
        <View style={styles.qlGrid}>
          {data.quick_links.map((q) => (
            <Pressable key={q.label} style={styles.ql} onPress={() => q.screen && navByRel(q.screen)}>
              <View style={[styles.qlIcon, { backgroundColor: hexAlpha(q.color, 0.08) }]}>
                <QlIcon label={q.label} color={q.color} />
              </View>
              <Text style={styles.qlLabel}>{q.label}</Text>
              <Text style={styles.qlSub}>{q.sub}</Text>
              {q.badge ? (
                <View style={styles.qlBadge}>
                  <Text style={styles.qlBadgeText}>{q.badge}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        <AdmCard>
          <AdmSectionTitle
            sub="Audit log · last 24h"
            action={
              <Pressable onPress={() => navByRel('view_all')}>
                <Text style={styles.viewAll}>View all →</Text>
              </Pressable>
            }
          >
            Activity
          </AdmSectionTitle>
          {data.activity.length === 0 ? (
            <Text style={styles.actEmpty}>No recent activity.</Text>
          ) : (
            data.activity.map((a, i) => (
              <View key={i} style={[styles.actRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#ECECEE' }]}>
                <View style={[styles.actIcon, { backgroundColor: hexAlpha(a.color, 0.1) }]}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Circle cx={12} cy={12} r={10} />
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actTitle}>{stripHtml(a.title)}</Text>
                  <Text style={styles.actMeta}>{a.meta}</Text>
                </View>
                <Text style={styles.actTime}>{a.time}</Text>
              </View>
            ))
          )}
        </AdmCard>
      </ScrollView>

      <AdmTabBar
        active="home"
        badges={data.tab_badges}
        onSelect={(kind) => {
          if (kind === 'home') return;
          navByRel(kind);
        }}
      />
      <AdmHomeIndicator tone="slate" />
    </View>
  );
}

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function sparkAxisLabels(): string[] {
  // Four equally-spaced month-day labels covering ~12 weeks ending today.
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const out: string[] = [];
  const now = new Date();
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 28);
    out.push(`${months[d.getMonth()]} ${d.getDate()}`);
  }
  return out;
}

function QlIcon({ label, color }: { label: string; color: string }) {
  if (label === 'Customer & provider CRM' || label.toLowerCase().includes('crm')) {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={9} cy={8} r={3.5} />
        <Path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <Circle cx={17.5} cy={9.5} r={2.5} />
        <Path d="M14.5 18.5c.4-2.4 2.4-4 5-4" />
      </Svg>
    );
  }
  if (label.includes('booking')) {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={3} y={5} width={18} height={16} rx={2.5} />
        <Path d="M3 10h18M8 3v4M16 3v4" />
      </Svg>
    );
  }
  if (label.toLowerCase().includes('ticket')) {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
      </Svg>
    );
  }
  if (label.toLowerCase().includes('team')) {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={8} cy={9} r={3} />
        <Circle cx={17} cy={9} r={3} />
        <Path d="M2 19c0-2.8 2.7-5 6-5s6 2.2 6 5M14 19c0-2.4 2-4.5 4.5-5" />
      </Svg>
    );
  }
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
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
  body: { flex: 1, padding: 14 },
  eyebrowLight: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
  },
  greet: { marginBottom: 14 },
  gtitle: { fontSize: 26, color: admTokens.text, fontFamily: 'CormorantGaramond_500Medium', marginTop: 4, marginBottom: 4 },
  gsub: { fontSize: 12, color: admTokens.textMuted },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpiTile: {
    width: '48.5%',
    backgroundColor: admTokens.white,
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 14,
    padding: 12,
  },
  kpiLbl: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
    marginBottom: 6,
  },
  kpiVal: { fontFamily: admTokens.fontMono, fontSize: 22, fontWeight: '600', color: admTokens.text, marginBottom: 4 },
  kpiDelta: { fontSize: 10, fontFamily: admTokens.fontMono, fontWeight: '600', color: admTokens.textMuted },
  kpiUp: { color: '#2F7A47' },
  kpiDown: { color: '#C0392B' },
  trendHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  trendVal: { fontSize: 22, fontWeight: '500', color: admTokens.text, marginTop: 4, fontFamily: 'CormorantGaramond_500Medium' },
  rangeChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 999,
    backgroundColor: admTokens.white,
  },
  rangeChipOn: { backgroundColor: '#0F1115', borderColor: '#0F1115' },
  rangeChipText: { fontSize: 9, fontWeight: '700', color: admTokens.textMuted },
  sparkAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sparkAxisText: { fontFamily: admTokens.fontMono, fontSize: 9, color: admTokens.textMuted },
  twoUp: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 60, marginTop: 8 },
  barsFoot: { fontSize: 11, color: admTokens.textMuted, marginTop: 6, fontFamily: admTokens.fontMono },
  barsFootStrong: { color: admTokens.text, fontWeight: '600' },
  qlGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  ql: {
    width: '48.5%',
    backgroundColor: admTokens.white,
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    position: 'relative',
  },
  qlIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  qlLabel: { fontSize: 13, fontWeight: '600', color: admTokens.text },
  qlSub: { fontSize: 10.5, color: admTokens.textMuted },
  qlBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: admTokens.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qlBadgeText: { color: admTokens.white, fontSize: 10, fontWeight: '700', lineHeight: 16 },
  viewAll: { fontSize: 11, color: '#7DA8CF', fontWeight: '600' },
  actEmpty: { color: admTokens.textMuted, fontSize: 12, paddingVertical: 10 },
  actRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  actIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actTitle: { fontSize: 12.5, color: admTokens.text, lineHeight: 17.5 },
  actMeta: { fontSize: 10, color: admTokens.textMuted, marginTop: 2, fontFamily: admTokens.fontMono },
  actTime: { fontSize: 10, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
});
