/**
 * Admin Portal — Audit log (`/admin/portal/audit`).
 * Read-only timeline of admin actions backed by BeautyAdminAuditEvent.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import {
  AdmCard,
  AdmHomeIndicator,
  AdmTabBar,
  AdmTopHeader,
  type AdmTabKind,
} from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

interface AuditRow {
  id: number;
  when_label: string;
  when_iso: string;
  icon: string;
  color: string;
  title_html: string;
  meta: string;
  action: string;
  actor_email: string;
}

interface AuditData {
  rows: AuditRow[];
  total: number;
  page_size: number;
  filters: { action: string; actor: string };
  action_values: string[];
  admin_email: string;
  tab_badges: Partial<Record<AdmTabKind, number | string | null>>;
  notif_count: number;
  session_remaining?: string;
  admin_initials?: string;
}

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function IconFor({ name, color }: { name: string; color: string }) {
  if (name === 'suspend') {
    return (
      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={12} r={10} />
        <Path d="M4.93 4.93l14.14 14.14" />
      </Svg>
    );
  }
  if (name === 'verify') {
    return (
      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <Path d="M22 4L12 14.01l-3-3" />
      </Svg>
    );
  }
  if (name === 'export') {
    return (
      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 8a2 2 0 012-2h6l2 3h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </Svg>
    );
  }
  if (name === 'warn') {
    return (
      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </Svg>
    );
  }
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 16v-4M12 8h.01" />
    </Svg>
  );
}

export default function AdminAudit() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<AuditData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<AuditData>('beauty_admin_portal_audit');
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        if (route) router.replace(route as any);
        return;
      }
      setEnv(e);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [router]);

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

  const onTab = (kind: AdmTabKind) => {
    if (kind === 'home') {
      const route = nativeRouteFor('beauty_admin_portal_dashboard');
      if (route) router.push(route as any);
      return;
    }
    const screen = `beauty_admin_portal_${kind}`;
    const route = nativeRouteFor(screen);
    if (route) router.push(route as any);
  };

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />
      <AdmTopHeader notifCount={data.notif_count || null} initials={data.admin_initials || 'AD'} />

      <View style={styles.sub}>
        <Text style={styles.subTitle}>Audit log</Text>
        <Text style={styles.subSummary}>
          Every admin action · immutable · last 90 days
          {data.total ? (
            <Text style={styles.subMono}> · {data.total} event{data.total === 1 ? '' : 's'}</Text>
          ) : null}
        </Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 14, paddingBottom: 24 }}>
        {data.rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyBody}>
              Admin actions (suspends, invites, tag changes, ticket updates) are recorded here as
              they happen.
            </Text>
          </View>
        ) : (
          <AdmCard padding={14}>
            {data.rows.map((e, i) => {
              const last = i === data.rows.length - 1;
              return (
                <View key={e.id} style={[styles.event, last && { paddingBottom: 0 }]}>
                  <View style={styles.evRail}>
                    <View
                      style={[
                        styles.evIcon,
                        { backgroundColor: hexAlpha(e.color, 0.1) },
                      ]}
                    >
                      <IconFor name={e.icon} color={e.color} />
                    </View>
                    {!last ? <View style={styles.evLine} /> : null}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.evHead}>
                      <Text style={styles.evTitle}>{stripHtml(e.title_html)}</Text>
                      <Text style={styles.evWhen}>{e.when_label}</Text>
                    </View>
                    {e.meta ? <Text style={styles.evMeta}>{e.meta}</Text> : null}
                  </View>
                </View>
              );
            })}
          </AdmCard>
        )}
      </ScrollView>

      <AdmTabBar active="home" badges={data.tab_badges} onSelect={onTab} />
      <AdmHomeIndicator tone="slate" />
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
  },
  subTitle: { fontSize: 24, color: admTokens.white, fontFamily: 'CormorantGaramond_500Medium' },
  subSummary: { marginTop: 2, fontSize: 11, color: admTokens.slateMuted },
  subMono: { fontFamily: admTokens.fontMono, color: admTokens.white },
  body: { flex: 1, backgroundColor: '#fff' },
  empty: { padding: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 20, color: admTokens.text, marginBottom: 6, fontFamily: 'CormorantGaramond_500Medium' },
  emptyBody: { fontSize: 12, color: admTokens.textMuted, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  event: { flexDirection: 'row', gap: 10, paddingBottom: 14 },
  evRail: { alignItems: 'center', paddingTop: 2 },
  evIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  evLine: { width: 1.5, flex: 1, backgroundColor: admTokens.line, marginTop: 4, minHeight: 14 },
  evHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  evTitle: { flex: 1, fontSize: 12.5, color: admTokens.text, lineHeight: 18 },
  evWhen: { fontSize: 10, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  evMeta: { fontSize: 10.5, color: admTokens.textMuted, marginTop: 4, lineHeight: 16.5, fontFamily: admTokens.fontMono },
});
