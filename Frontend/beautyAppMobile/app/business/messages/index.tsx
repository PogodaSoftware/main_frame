/**
 * Business messages inbox — provider side of the real-time chat.
 * Mirrors the `msg-list` / `msg-empty` design: "Inbox" + search + one row
 * per chat-eligible booking (customer avatar, name, service·date, last
 * message preview, time). Routes to the live thread on tap.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { setUnreadTotal } from '@/services/unreadStore';
import { navigateLink } from '@/bff/linkAction';
import type { BffLink } from '@/bff/types';
import { resolve } from '@/services/bff';
import { isRedirect } from '@/bff/types';
import { BeautyShell } from '@/components/BeautyShell';
import { ProvSubHeader, ProvTabBar, type ProviderTab } from '@/components/business';
import { beautyTokens } from '../../../tamagui.config';

/** Chat row shape from the `beauty_chats` BFF resolver (business viewer). */
interface BizThread {
  booking_id: number;
  service_name: string;
  slot_at: string;
  status: string;
  peer_name: string;
  last_message: string;
  last_at: string | null;
  unread_count: number;
  is_active: boolean;
}

const AVATAR_HUES = ['#5C4A3F', '#A88A7A', '#7A8B6E', '#574A3D', '#5F5A4A', '#7DA8CF', '#9A6A6A'];
function hue(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

function relTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function slotLine(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

export default function BusinessMessagesScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState<BizThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [links, setLinks] = useState<Record<string, BffLink>>({});

  const load = useCallback(async () => {
    setError('');
    // Threads come from the standard `beauty_chats` BFF resolver, which also
    // returns `unread_total` — reconciling the Messages-tab badge with the
    // server on every focus (e.g. after reading a thread marks it read).
    try {
      const e = await resolve<{ threads: BizThread[]; unread_total?: number }>('beauty_chats');
      if (isRedirect(e)) {
        router.replace('/(auth)/business-login' as any);
        return;
      }
      if (e.action === 'render') {
        setThreads(e.data?.threads ?? []);
        setUnreadTotal(e.data?.unread_total ?? 0);
      }
    } catch {
      setError('Could not load messages.');
    } finally {
      setLoading(false);
    }
    // tab-bar nav links (best-effort; falls back to static routes)
    try {
      const e = await resolve('beauty_business_home');
      if (!isRedirect(e)) setLinks((e._links as Record<string, BffLink>) ?? {});
    } catch { /* ignore */ }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onTab = (tab: ProviderTab) => {
    if (tab === 'messages') return;
    const staticRoute: Record<ProviderTab, string> = {
      dashboard: '/business/home',
      bookings: '/business/bookings',
      services: '/business/services',
      messages: '/business/messages',
      profile: '/business/profile',
    };
    const linkKey: Record<ProviderTab, string> = {
      dashboard: 'business_home', bookings: 'bookings', services: 'services', messages: 'chats', profile: 'profile',
    };
    const link = links[linkKey[tab]];
    if (link) navigateLink(router, link);
    else router.replace(staticRoute[tab] as any);
  };

  const visible = query.trim()
    ? threads.filter((t) =>
        (t.peer_name + t.service_name).toLowerCase().includes(query.trim().toLowerCase()))
    : threads;

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ProvSubHeader back="Dashboard" title="Messages" onBackPress={() => router.replace('/business/home' as any)} />

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={beautyTokens.accentBlueDeep} /></View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.inboxTitle}>Inbox</Text>
          <Text style={styles.inboxSub}>Talk with customers about their bookings.</Text>

          <View style={styles.searchWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search conversations"
              placeholderTextColor={beautyTokens.textMuted}
              style={styles.searchInput}
            />
          </View>

          {visible.length === 0 ? (
            <View style={styles.emptyWrap} testID="business-messages-empty">
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconGlyph}>💬</Text>
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyBody}>When a customer books, you can message them here about their appointment.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {visible.map((t, idx) => {
                const last = idx === visible.length - 1;
                const initial = (t.peer_name.trim()[0] ?? '?').toUpperCase();
                const unread = (t.unread_count ?? 0) > 0;
                return (
                  <Pressable
                    key={t.booking_id}
                    style={[styles.row, last && styles.rowLast]}
                    onPress={() => router.push(`/business/messages/${t.booking_id}` as any)}
                    testID="business-message-row"
                  >
                    <View style={[styles.avatar, { backgroundColor: hue(t.peer_name) }]}>
                      <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.rowTop}>
                        <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>{t.peer_name}</Text>
                        <View style={styles.rowTopRight}>
                          <Text style={[styles.when, unread && styles.whenUnread]}>{relTime(t.last_at)}</Text>
                          {unread && (
                            <View style={styles.unreadBadge} testID="business-message-unread">
                              <Text style={styles.unreadBadgeText}>{t.unread_count > 99 ? '99+' : t.unread_count}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={styles.svc} numberOfLines={1}>{t.service_name} · {slotLine(t.slot_at)}</Text>
                      <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
                        {t.last_message || 'Tap to start the conversation.'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      )}

      <ProvTabBar active="messages" onTabPress={onTab} />
    </BeautyShell>
  );
}

const styles = StyleSheet.create({
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, backgroundColor: beautyTokens.surface },
  bodyContent: { padding: 16, paddingTop: 14 },

  inboxTitle: { fontFamily: beautyTokens.fontDisplay, fontSize: 26, color: beautyTokens.text },
  inboxSub: { fontFamily: beautyTokens.fontBody, fontSize: 13, color: beautyTokens.textMuted, marginTop: 2, marginBottom: 12 },

  searchWrap: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 12, paddingHorizontal: 12, height: 44, justifyContent: 'center', marginBottom: 14,
  },
  searchInput: { fontFamily: beautyTokens.fontBody, fontSize: 14, color: beautyTokens.text },

  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: beautyTokens.line, borderRadius: 14, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: beautyTokens.line },
  rowLast: { borderBottomWidth: 0 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontFamily: beautyTokens.fontBody, fontWeight: '700', fontSize: 15 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: beautyTokens.fontBody, fontSize: 14, fontWeight: '700', color: beautyTokens.text, flexShrink: 1 },
  nameUnread: { color: beautyTokens.text },
  when: { fontFamily: 'Menlo', fontSize: 10, color: beautyTokens.textMuted },
  whenUnread: { color: beautyTokens.accentBlueDeep, fontWeight: '700' },
  unreadBadge: {
    minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 999,
    backgroundColor: beautyTokens.accentBlueDeep, alignItems: 'center', justifyContent: 'center',
  },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', fontFamily: beautyTokens.fontBody },
  svc: { fontFamily: beautyTokens.fontBody, fontSize: 11, fontWeight: '600', color: beautyTokens.accentBlueDeep, marginTop: 2 },
  preview: { fontFamily: beautyTokens.fontBody, fontSize: 12, color: beautyTokens.textMuted, marginTop: 2 },
  previewUnread: { color: beautyTokens.text, fontWeight: '600' },

  emptyWrap: {
    marginTop: 18, padding: 28, alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderStyle: 'dashed', borderColor: beautyTokens.line, borderRadius: 14,
  },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 26, marginBottom: 12,
    backgroundColor: beautyTokens.accentBlue, alignItems: 'center', justifyContent: 'center',
  },
  emptyIconGlyph: { fontSize: 22 },
  emptyTitle: { fontFamily: beautyTokens.fontDisplay, fontSize: 20, color: beautyTokens.text, marginBottom: 6 },
  emptyBody: { fontFamily: beautyTokens.fontBody, fontSize: 13, lineHeight: 19, color: beautyTokens.textMuted, textAlign: 'center' },

  error: { color: beautyTokens.danger, fontSize: 13, fontFamily: beautyTokens.fontBody, paddingVertical: 12 },
});
