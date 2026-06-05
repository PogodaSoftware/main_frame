/**
 * Admin Portal — Notifications · view all activity (`/admin/portal/notifications`).
 * Full-screen feed destination of the header dropdown's "View all activity →".
 * Grouped by Today / Yesterday / Earlier; All vs Unread filter; tap a row to
 * mark read; "Mark all read" clears every unread dot. Data: real signals from
 * the `beauty_admin_portal_notifications` resolver.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
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
  AdmHomeIndicator,
  AdmNotifIcon,
  AdmTabBar,
  AdmTopHeader,
  type AdmTabKind,
} from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

interface Notif {
  kind: string;
  title: string;
  sub: string;
  time: string;
  unread?: boolean;
  group: string;
  screen?: string;
}

interface NotifData {
  notifications: Notif[];
  unread: number;
  total: number;
  tab_badges: Partial<Record<AdmTabKind, number | string | null>>;
  notif_count: number;
  session_remaining?: string;
  admin_initials?: string;
}

const GROUP_ORDER = ['Today', 'Yesterday', 'Earlier this week', 'Earlier'];

export default function AdminNotifications() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<NotifData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Notif[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<NotifData>('beauty_admin_portal_notifications');
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        if (route) router.replace(route as any);
        return;
      }
      setEnv(e);
      if (e.action === 'render') setItems(e.data?.notifications ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const unreadCount = useMemo(() => items.filter((i) => i.unread).length, [items]);
  const markRead = (idx: number) =>
    setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, unread: false } : it)));
  const markAllRead = () => setItems((cur) => cur.map((it) => ({ ...it, unread: false })));

  const visible = filter === 'unread' ? items.filter((i) => i.unread) : items;
  // Preserve original index for mark-read while grouping the filtered view.
  const grouped = useMemo(() => {
    const map = new Map<string, { it: Notif; idx: number }[]>();
    visible.forEach((it) => {
      const origIdx = items.indexOf(it);
      const arr = map.get(it.group) ?? [];
      arr.push({ it, idx: origIdx });
      map.set(it.group, arr);
    });
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ group: g, rows: map.get(g)! }));
  }, [visible, items]);

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
    const screen = kind === 'home' ? 'beauty_admin_portal_dashboard' : `beauty_admin_portal_${kind}`;
    const route = nativeRouteFor(screen);
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
          <Pressable><Text style={styles.sessionLink}>Extend</Text></Pressable>
        </View>
      ) : null}

      <View style={styles.sub}>
        <View style={styles.subTop}>
          <Pressable onPress={() => onTab('home')} style={styles.backRow} hitSlop={8}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={admTokens.slateMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
            <Text style={styles.backText}>Dashboard</Text>
          </Pressable>
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text style={styles.markRead}>Mark all read</Text>
          </Pressable>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount ? (
            <View style={styles.newPill}><Text style={styles.newPillText}>{unreadCount} new</Text></View>
          ) : null}
        </View>
        <View style={styles.chips}>
          <Pressable onPress={() => setFilter('all')} style={[styles.chip, filter === 'all' && styles.chipOn]}>
            <Text style={[styles.chipText, filter === 'all' && styles.chipTextOn]}>All</Text>
          </Pressable>
          <Pressable onPress={() => setFilter('unread')} style={[styles.chip, filter === 'unread' && styles.chipOn]}>
            <Text style={[styles.chipText, filter === 'unread' && styles.chipTextOn]}>
              Unread{unreadCount ? ` · ${unreadCount}` : ''}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyBody}>No unread notifications right now.</Text>
          </View>
        ) : (
          grouped.map(({ group, rows }) => (
            <View key={group}>
              <Text style={styles.groupLabel}>{group.toUpperCase()}</Text>
              {rows.map(({ it, idx }) => (
                <Pressable
                  key={idx}
                  onPress={() => markRead(idx)}
                  style={[styles.row, it.unread && styles.rowUnread]}
                >
                  <AdmNotifIcon kind={it.kind} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{it.title}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{it.sub}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowTime}>{it.time}</Text>
                    {it.unread ? <View style={styles.dot} /> : null}
                  </View>
                </Pressable>
              ))}
            </View>
          ))
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

  session: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF4DA', borderBottomWidth: 1, borderBottomColor: 'rgba(165,122,31,0.18)',
    paddingHorizontal: 14, paddingVertical: 6,
  },
  sessionText: { fontSize: 11, color: '#8A6A1F' },
  sessionMono: { fontFamily: admTokens.fontMono, fontWeight: '700', color: '#8A6A1F' },
  sessionLink: { color: '#8A6A1F', fontSize: 11, fontWeight: '600', textDecorationLine: 'underline' },

  sub: {
    backgroundColor: admTokens.slate,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: admTokens.slateLine,
  },
  subTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: admTokens.slateMuted, fontSize: 13 },
  markRead: { color: admTokens.red, fontSize: 12, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  title: { fontSize: 28, color: admTokens.white, fontFamily: 'CormorantGaramond_500Medium' },
  newPill: { backgroundColor: admTokens.red, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  newPillText: { color: admTokens.white, fontSize: 10, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: admTokens.slate2 },
  chipOn: { backgroundColor: admTokens.white },
  chipText: { fontSize: 12, fontWeight: '600', color: admTokens.slateMuted },
  chipTextOn: { color: admTokens.slate },

  body: { flex: 1, backgroundColor: admTokens.surface },
  groupLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1, color: admTokens.textMuted,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: admTokens.surface,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: admTokens.line,
  },
  rowUnread: { backgroundColor: '#FBF3EF' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: admTokens.text },
  rowSub: { fontSize: 11.5, color: admTokens.textMuted, marginTop: 2, fontFamily: admTokens.fontMono },
  rowRight: { alignItems: 'flex-end', gap: 6, minWidth: 30 },
  rowTime: { fontSize: 11, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: admTokens.red },

  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 20, color: admTokens.text, marginBottom: 6, fontFamily: 'CormorantGaramond_500Medium' },
  emptyBody: { fontSize: 12, color: admTokens.textMuted, textAlign: 'center' },
});
