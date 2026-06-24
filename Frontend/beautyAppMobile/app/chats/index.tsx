import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { BeautyShell } from '@/components/BeautyShell';
import { BottomNav } from '@/components/BottomNav';
import { PALETTE } from '@/theme/colors';
import { FONT_BODY, FONT_BODY_SEMI, FONT_BODY_BOLD, FONT_DISPLAY, FONT_MONO } from '@/theme/fonts';
import { formatSlotLocal } from '@/utils/dateFormatters';

interface ChatThreadRow {
  booking_id: number;
  service_name: string;
  slot_at: string;
  slot_label: string;
  status: string;
  peer_name: string;
  last_message: string;
  last_at: string | null;
  is_active: boolean;
  expires_at: string;
  unread_count?: number;
  _links?: { open?: BffLink };
}

interface ChatsData {
  threads: ChatThreadRow[];
  viewer_type: 'customer' | 'business';
  total: number;
}

const C = PALETTE;

const AVATAR_PALETTES: Array<[string, string]> = [
  ['#BFD8EE', '#7DA8CF'],
  ['#E8C5B8', '#B98C7A'],
  ['#C5D8B8', '#8FA876'],
  ['#DCC8E0', '#9D7CB1'],
];

function initialOf(name: string): string {
  return (name || '·').trim()[0]?.toUpperCase() || '·';
}

function avatarColors(name: string): [string, string] {
  const seed = (name || '').charCodeAt(0) || 0;
  return AVATAR_PALETTES[seed % AVATAR_PALETTES.length];
}

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  try {
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function ChatsListScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ChatsData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setEnv(null);
    setError(null);
    resolve<ChatsData>('beauty_chats')
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(auth)/login') as any);
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

  const data = env?.action === 'render' ? env.data : null;
  const links = (env?._links ?? {}) as Record<string, BffLink | undefined>;
  const threads = data?.threads ?? [];

  // Client-side filter over provider name + service name + last message,
  // mirroring the web Inbox search.
  const q = query.trim().toLowerCase();
  const filteredThreads = q
    ? threads.filter((t) =>
        [t.peer_name, t.service_name, t.last_message]
          .some((f) => (f || '').toLowerCase().includes(q)),
      )
    : threads;

  const goHome = () => {
    if (links.home) navigateLink(router, links.home);
    else router.replace('/(customer)/home');
  };

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.app}>
        <View style={styles.subHeader}>
          <Pressable
            onPress={goHome}
            style={({ pressed }) => [styles.backBtn, pressed && styles.iconBtnPressed]}
            accessibilityLabel="Dashboard"
          >
            <Ionicons name="chevron-back" size={18} color={C.text} />
            <Text style={styles.backBtnText}>Dashboard</Text>
          </Pressable>
          <Text style={styles.subHeaderTitle}>Messages</Text>
          <View style={{ width: 90 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle}>Inbox</Text>
            <Text style={styles.pageSub}>Talk with your providers about your bookings.</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!env && !error ? <Text style={styles.muted}>Loading…</Text> : null}

          {env?.action === 'render' ? (
            threads.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="chatbubbles-outline" size={28} color={C.accentBlueDeep} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyTitle}>No conversations yet</Text>
                <Text style={styles.emptyBody}>
                  Book an appointment to start messaging your provider.
                </Text>
                <Pressable
                  onPress={goHome}
                  style={({ pressed }) => [styles.btnBrowse, pressed && styles.btnBrowsePressed]}
                >
                  <Text style={styles.btnBrowseText}>Browse services →</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.searchRow}>
                  <Ionicons name="search" size={14} color={C.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search conversations"
                    placeholderTextColor={C.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    accessibilityLabel="Search conversations"
                    testID="chats-search-input"
                  />
                  {query ? (
                    <Pressable
                      onPress={() => setQuery('')}
                      hitSlop={8}
                      accessibilityLabel="Clear search"
                      testID="chats-search-clear"
                    >
                      <Ionicons name="close-circle" size={16} color={C.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
                {filteredThreads.length === 0 ? (
                  <Text style={styles.noMatch} testID="chats-search-empty">
                    No conversations match “{query}”.
                  </Text>
                ) : null}
                <View style={styles.listCard}>
                  {filteredThreads.map((t, idx) => {
                    const last = idx === filteredThreads.length - 1;
                    const [c1, c2] = avatarColors(t.peer_name);
                    return (
                      <Pressable
                        key={t.booking_id}
                        onPress={() => navigateLink(router, t._links?.open)}
                        style={[
                          styles.convRow,
                          last && styles.convRowLast,
                          !t.is_active && { opacity: 0.6 },
                        ]}
                      >
                        <View style={styles.avatarWrap}>
                          <View style={[styles.avatar, { backgroundColor: c1, borderColor: c2 }]}>
                            <Text style={styles.avatarText}>{initialOf(t.peer_name)}</Text>
                          </View>
                          {t.unread_count ? (
                            <View style={styles.unreadBadge}>
                              <Text style={styles.unreadBadgeText}>{t.unread_count}</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.convText}>
                          <View style={styles.convRow1}>
                            <Text
                              style={[styles.convName, t.unread_count ? { fontFamily: FONT_BODY_BOLD } : null]}
                              numberOfLines={1}
                            >
                              {t.peer_name}
                            </Text>
                            {t.last_at ? (
                              <Text style={styles.convTime}>{formatRelative(t.last_at)}</Text>
                            ) : null}
                          </View>
                          <Text style={styles.convSvc} numberOfLines={1}>
                            {t.service_name} · {formatSlotLocal(t.slot_at)}
                          </Text>
                          <Text
                            style={[styles.convPreview, t.unread_count ? styles.convPreviewUnread : null]}
                            numberOfLines={1}
                          >
                            {t.last_message || 'Tap to start the conversation.'}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )
          ) : null}
        </ScrollView>

        <BottomNav active="chat" />
      </View>
    </BeautyShell>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.surface },

  subHeader: {
    height: 56, paddingHorizontal: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.line,
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 6, paddingVertical: 6,
    borderRadius: 8,
    width: 90,
  },
  iconBtnPressed: { backgroundColor: C.surface2 },
  backBtnText: { color: C.text, fontSize: 13, fontFamily: FONT_BODY },
  subHeaderTitle: {
    flex: 1, textAlign: 'center',
    fontFamily: FONT_DISPLAY, fontSize: 17, color: C.text, letterSpacing: 0.2,
  },

  body: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

  titleBlock: { marginBottom: 12 },
  pageTitle: { fontFamily: FONT_DISPLAY, fontSize: 22, color: C.text, letterSpacing: 0.2 },
  pageSub: { fontSize: 12, color: C.textMuted, marginTop: 2, fontFamily: FONT_BODY },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 10, height: 40, paddingHorizontal: 12, marginBottom: 12,
  },
  searchRowText: { color: C.textMuted, fontSize: 13, fontFamily: FONT_BODY },
  searchInput: {
    flex: 1, height: '100%', padding: 0,
    color: C.text, fontSize: 13, fontFamily: FONT_BODY,
  },
  noMatch: {
    color: C.textMuted, fontSize: 12, fontFamily: FONT_BODY,
    paddingVertical: 8, paddingHorizontal: 2, marginBottom: 4,
  },

  listCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 12, paddingHorizontal: 14,
  },
  convRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  convRowLast: { borderBottomWidth: 0 },

  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0,
  },
  avatarText: { fontFamily: FONT_DISPLAY, fontSize: 18, color: C.accentBlueText },
  unreadBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: C.danger,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.white,
  },
  unreadBadgeText: { color: C.white, fontSize: 9, fontFamily: FONT_BODY_BOLD },

  convText: { flex: 1, minWidth: 0 },
  convRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  convName: { fontSize: 14, fontFamily: FONT_BODY_SEMI, color: C.text, flexShrink: 1 },
  convTime: { fontFamily: FONT_MONO, fontSize: 10, color: C.textMuted },
  convSvc: { fontSize: 11, fontFamily: FONT_BODY_SEMI, color: C.accentBlueDeep, marginTop: 1 },
  convPreview: { fontSize: 12, color: C.textMuted, marginTop: 3, lineHeight: 17, fontFamily: FONT_BODY },
  convPreviewUnread: { color: C.text, fontFamily: FONT_BODY_SEMI },

  emptyCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 12, padding: 20, alignItems: 'center',
  },
  emptyTitle: { fontFamily: FONT_DISPLAY, fontSize: 20, color: C.text, marginBottom: 4 },
  emptyBody: { fontSize: 12, color: C.textMuted, textAlign: 'center', marginBottom: 12, fontFamily: FONT_BODY },
  btnBrowse: {
    height: 36, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  btnBrowsePressed: { backgroundColor: C.surface2 },
  btnBrowseText: { color: C.text, fontSize: 12, fontFamily: FONT_BODY_SEMI },

  error: { color: C.danger, fontSize: 13, marginBottom: 12 },
  muted: { color: C.textMuted, fontSize: 13, padding: 8 },
});
