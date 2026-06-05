/**
 * Admin Portal — Dashboard variant 2.
 * Slate GMV hero + inline KPI list + Needs-Attention. All values from BFF
 * (real DB), no hardcoded fixtures.
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
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import {
  AdmCard,
  AdmHomeIndicator,
  AdmTabBar,
  AdmTopHeader,
  type AdmTabKind,
} from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

interface KpiRow { label: string; value: string; delta: string; tone: 'up' | 'down' }
interface AttentionRow { color: string; title: string; meta: string; time: string }

interface DashV2Data {
  gmv_whole: string;
  gmv_cents: string;
  mom_pct: string;
  forecast: string;
  rows: KpiRow[];
  attention: AttentionRow[];
  tab_badges: Partial<Record<AdmTabKind, number | string | null>>;
  notif_count: number;
  gmv_weekly_cents: number[];
  session_remaining?: string;
  admin_initials?: string;
}

function buildSparkPoints(series: number[], width = 320, height = 56): { line: string; fill: string } {
  if (!series || series.length === 0) {
    const flat = `0,${height} ${width},${height}`;
    return { line: flat, fill: flat };
  }
  const max = Math.max(1, ...series);
  const step = series.length > 1 ? width / (series.length - 1) : 0;
  const pad = 4;
  const usable = height - pad * 2;
  const pts = series.map((v, i) => `${+(step * i).toFixed(2)},${+(pad + usable - (v / max) * usable).toFixed(2)}`);
  const line = pts.join(' ');
  const fill = `0,${height} ${line} ${width},${height}`;
  return { line, fill };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

export default function AdminDashboardV2() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<DashV2Data> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolve<DashV2Data>('beauty_admin_portal_dashboard_v2')
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
  const { line: linePts, fill: fillPts } = buildSparkPoints(data.gmv_weekly_cents ?? []);

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
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Platform GMV · this month</Text>
          <Text style={styles.heroGmv}>
            {data.gmv_whole}
            <Text style={styles.heroCents}>{data.gmv_cents}</Text>
          </Text>
          <View style={styles.heroMeta}>
            <Text style={styles.heroUp}>▲ {data.mom_pct} MoM</Text>
            <Text style={styles.heroDim}>Forecast {data.forecast}</Text>
          </View>
          <Svg width="100%" height={56} viewBox="0 0 320 56" preserveAspectRatio="none" style={{ marginTop: 14 }}>
            <Polyline points={fillPts} fill="rgba(125,168,207,0.16)" stroke="none" />
            <Polyline points={linePts} fill="none" stroke="#7DA8CF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>

        <View style={styles.content}>
          <AdmCard padding={0}>
            {data.rows.map((r, i) => (
              <View key={r.label} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Text style={styles.rowLbl}>{r.label}</Text>
                <Text style={styles.rowVal}>{r.value}</Text>
                <Text
                  style={[
                    styles.rowDelta,
                    r.tone === 'up' && { color: '#2F7A47' },
                    r.tone === 'down' && { color: '#C0392B' },
                  ]}
                >
                  {r.tone === 'up' ? '▲' : '▼'} {r.delta}
                </Text>
              </View>
            ))}
          </AdmCard>

          <Text style={styles.sectionHead}>Needs attention</Text>
          <AdmCard padding={0}>
            {data.attention.length === 0 ? (
              <Text style={styles.attEmpty}>Nothing flagged. Quiet day.</Text>
            ) : (
              data.attention.map((a, i) => (
                <View key={i} style={[styles.att, i > 0 && styles.rowBorder]}>
                  <View style={[styles.attIcon, { backgroundColor: hexAlpha(a.color, 0.1) }]}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Circle cx={12} cy={12} r={10} />
                      <Path d="M12 7v5l3 2" />
                    </Svg>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attTitle}>{stripHtml(a.title)}</Text>
                    <Text style={styles.attMeta}>{a.meta}</Text>
                  </View>
                  <Text style={styles.attTime}>{a.time}</Text>
                </View>
              ))
            )}
          </AdmCard>
        </View>
      </ScrollView>

      <AdmTabBar
        active="home"
        badges={data.tab_badges}
        onSelect={(kind) => {
          if (kind === 'home') {
            navByRel('dashboard_v1');
            return;
          }
          navByRel(kind);
        }}
      />
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
  hero: { backgroundColor: admTokens.slate, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 },
  heroEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.slateMuted,
    marginBottom: 4,
  },
  heroGmv: { fontSize: 38, fontWeight: '500', color: admTokens.white, fontFamily: 'CormorantGaramond_500Medium' },
  heroCents: { fontSize: 18, color: admTokens.slateMuted },
  heroMeta: { flexDirection: 'row', gap: 14, marginTop: 10 },
  heroUp: { color: '#86C49B', fontSize: 11 },
  heroDim: { color: admTokens.slateMuted, fontSize: 11 },
  content: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#ECECEE' },
  rowLbl: { flex: 1, fontSize: 12, color: admTokens.textMuted },
  rowVal: { fontSize: 14, fontWeight: '600', color: admTokens.text, fontFamily: admTokens.fontMono },
  rowDelta: { width: 90, textAlign: 'right', fontSize: 10, fontWeight: '600', fontFamily: admTokens.fontMono, color: admTokens.textMuted },
  sectionHead: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
  },
  att: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  attEmpty: { paddingHorizontal: 14, paddingVertical: 18, color: admTokens.textMuted, fontSize: 12 },
  attIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  attTitle: { fontSize: 12.5, color: admTokens.text, lineHeight: 17.5 },
  attMeta: { fontSize: 10, color: admTokens.textMuted, marginTop: 2, fontFamily: admTokens.fontMono },
  attTime: { fontSize: 10, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
});
