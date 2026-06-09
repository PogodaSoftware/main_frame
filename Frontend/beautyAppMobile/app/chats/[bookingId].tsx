/**
 * Chat thread — mirrors Angular `BeautyChatThreadComponent`.
 *  - Thread header: back arrow + baby-blue avatar disc + peer name + service · slot,
 *    booking icon button, phone button (disabled gray).
 *  - Baby-blue summary chip "Confirmed · 30 min · $X paid" w/ Open → link.
 *  - Messages pane: mine = ink bubble right (rounded 16 16 4 16), peer = white
 *    bubble left (rounded 16 16 16 4). Mono time stamp 9px under bubble.
 *  - Composer: white bar w/ ⊕ attach (disabled), pill input, ink circle Send w/ arrow.
 *  - Empty: baby-blue card "Say hello" / "Chat closed".
 *  - Polls every 4s.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { setActiveChat } from '@/services/activeChat';

interface ChatMessage {
  id: number;
  booking_id: number;
  sender_type: 'customer' | 'business';
  sender_id: number;
  body: string;
  created_at: string;
}

interface ChatThreadData {
  booking_id: number;
  service_name: string;
  slot_at: string;
  slot_label: string;
  peer_name: string;
  viewer_type: 'customer' | 'business';
  is_active: boolean;
  expires_at: string;
  status?: string;
  service_duration_minutes?: number;
  service_price_dollars?: string;
  messages: ChatMessage[];
}

const POLL_INTERVAL_MS = 4000;

const C = {
  surface: '#F2F2F2',
  surface2: '#E9E9EB',
  line: '#DCDCDF',
  text: '#0F1115',
  textMuted: '#6B6F77',
  accentBlue: '#CFE3F5',
  accentBlueLight: '#BFD8EE',
  accentBlueDeep: '#7DA8CF',
  accentBlueText: '#1a3a52',
  ink: '#0F1115',
  danger: '#C0392B',
  white: '#FFFFFF',
};
const FONT_BODY = 'Inter_400Regular';
const FONT_BODY_SEMI = 'Inter_600SemiBold';
const FONT_DISPLAY = 'CormorantGaramond_500Medium';
const FONT_MONO = 'Menlo';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
}

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Booking slot in device-local time (EDT), not the UTC-baked `slot_label`.
function formatSlotLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const wd = WEEKDAYS_SHORT[d.getDay()];
  const mo = MONTHS_SHORT[d.getMonth()];
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  let tz = '';
  try {
    const part = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
      .formatToParts(d)
      .find((p) => p.type === 'timeZoneName');
    tz = part?.value ?? '';
  } catch {
    /* no tz abbreviation */
  }
  return `${wd} ${mo} ${d.getDate()} · ${time}${tz ? ` ${tz}` : ''}`;
}

export default function ChatThreadScreen() {
  const router = useRouter();
  const { bookingId: raw } = useLocalSearchParams<{ bookingId: string }>();
  const bookingId = Number(raw);

  const [env, setEnv] = useState<BffEnvelope<ChatThreadData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(bookingId)) return;
    try {
      const e = await resolve<ChatThreadData>('beauty_chat_thread', { bookingId });
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        router.replace((route ?? '/chats') as any);
        return;
      }
      setEnv(e);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [bookingId, router]);

  useEffect(() => {
    setActiveChat(bookingId);
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => { clearInterval(timer); setActiveChat(null); };
  }, [load, bookingId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd?.({ animated: false });
  }, [env]);

  const links = (env?._links ?? {}) as Record<string, BffLink | undefined>;
  const data = env?.action === 'render' ? env.data : null;
  const sendLink = links.send;

  const onSend = async () => {
    if (!sendLink || !draft.trim() || busy) return;
    setBusy(true);
    const r = await dispatchLink(sendLink, { body: draft.trim() });
    setBusy(false);
    if (r.ok) {
      setDraft('');
      load();
    } else {
      setError('Send failed.');
    }
  };

  if (error && !env) {
    return (
      <View style={[styles.app, { padding: 16 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.danger, fontFamily: FONT_BODY }} testID="chat-error">{error}</Text>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={[styles.app, { alignItems: 'center', justifyContent: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.textMuted, fontFamily: FONT_BODY }}>Loading…</Text>
      </View>
    );
  }

  const peerInitial = (data.peer_name || '·').trim()[0]?.toUpperCase() || '·';
  const composerPlaceholder = data.peer_name
    ? `Message ${data.peer_name.split(' ')[0]}…`
    : 'Message…';
  const hasSummary = !!(data.service_name && data.slot_label);
  const summaryText = (() => {
    const parts: string[] = [];
    if (data.status === 'booked' || data.status === 'completed') parts.push('Confirmed');
    if (data.service_duration_minutes) parts.push(`${data.service_duration_minutes} min`);
    if (data.service_price_dollars) parts.push(`$${data.service_price_dollars} paid`);
    return parts.length ? parts.join(' · ') : `${data.service_name} · ${formatSlotLocal(data.slot_at)}`;
  })();

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.threadHeader}>
        <Pressable
          onPress={() => (links.back ? navigateLink(router, links.back) : router.back())}
          style={({ pressed }) => [styles.iconBtnSmall, pressed && styles.iconBtnPressed]}
          accessibilityLabel="Back"
          testID="chat-back"
        >
          <Ionicons name="chevron-back" size={16} color={C.text} />
        </Pressable>
        <LinearGradient
          colors={[C.accentBlueLight, C.accentBlueDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hdrAvatar}
        >
          <Text style={styles.hdrAvatarText}>{peerInitial}</Text>
        </LinearGradient>
        <View style={styles.hdrText}>
          <Text style={styles.hdrName} numberOfLines={1} testID="chat-peer-name">{data.peer_name}</Text>
          <Text style={styles.hdrSub} numberOfLines={1}>{data.service_name} · {formatSlotLocal(data.slot_at)}</Text>
        </View>
        <Pressable
          onPress={() => links.view_booking && navigateLink(router, links.view_booking)}
          disabled={!links.view_booking}
          style={[styles.headerBtn, !links.view_booking && { opacity: 0.4 }]}
          accessibilityLabel="View booking"
        >
          <Ionicons name="calendar-outline" size={14} color={C.text} />
        </Pressable>
        <Pressable
          disabled
          style={[styles.headerBtn, { opacity: 0.4 }]}
          accessibilityLabel="Call"
          testID="chat-phone"
        >
          <Ionicons name="call-outline" size={14} color={C.textMuted} />
        </Pressable>
      </View>

      {hasSummary ? (
        <View style={styles.summaryWrap}>
          <View style={styles.summaryChip}>
            <Ionicons name="calendar-outline" size={14} color={C.accentBlueText} />
            <Text style={styles.summaryText} numberOfLines={1}>{summaryText}</Text>
            <Pressable
              onPress={() => links.view_booking && navigateLink(router, links.view_booking)}
              disabled={!links.view_booking}
            >
              <Text style={styles.summaryOpen}>Open →</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.messagesPane}
        testID="messages-pane"
      >
        {data.messages.length === 0 && !data.is_active ? (
          <View style={styles.emptyCard} testID="chat-closed">
            <Text style={styles.emptyTitle}>Chat closed</Text>
            <Text style={styles.emptySub}>This conversation ended 24 hours after the appointment.</Text>
          </View>
        ) : null}
        {data.messages.length === 0 && data.is_active ? (
          <View style={styles.emptyCard} testID="chat-empty">
            <Text style={styles.emptyTitle}>Say hello</Text>
            <Text style={styles.emptySub}>Send your first message about this booking.</Text>
          </View>
        ) : null}
        {data.messages.map((m) => {
          const mine = m.sender_type === data.viewer_type;
          return (
            <View
              key={m.id}
              style={[styles.msg, mine ? styles.msgMine : styles.msgPeer]}
              testID={`msg-${m.id}`}
            >
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubblePeer]}>
                <Text style={[styles.bubbleBody, mine ? { color: C.white } : { color: C.text }]}>{m.body}</Text>
                <Text style={[styles.msgTime, mine ? { color: 'rgba(255,255,255,0.6)' } : { color: C.textMuted }]}>
                  {formatTime(m.created_at)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {data.is_active && sendLink ? (
        <View style={styles.composer} testID="chat-composer">
          <Pressable disabled style={styles.attachBtn} accessibilityLabel="Attach">
            <Ionicons name="add" size={14} color={C.text} />
          </Pressable>
          <TextInput
            style={styles.composerInput}
            value={draft}
            onChangeText={setDraft}
            placeholder={composerPlaceholder}
            placeholderTextColor={C.textMuted}
            editable={!busy}
            returnKeyType="send"
            onSubmitEditing={onSend}
            testID="chat-input"
          />
          <Pressable
            onPress={onSend}
            disabled={busy || !draft.trim()}
            style={[styles.sendBtn, (busy || !draft.trim()) && { opacity: 0.45 }]}
            accessibilityLabel="Send"
            testID="chat-send"
          >
            <Ionicons name="arrow-forward" size={14} color={C.white} />
          </Pressable>
        </View>
      ) : !data.is_active ? (
        <View style={styles.composerDisabled} testID="composer-disabled">
          <Text style={styles.composerDisabledText}>Messaging disabled — chat closed.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.surface },

  threadHeader: {
    backgroundColor: C.surface,
    paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  iconBtnSmall: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconBtnPressed: { backgroundColor: C.surface2 },
  hdrAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  hdrAvatarText: { fontFamily: FONT_DISPLAY, fontSize: 15, color: C.accentBlueText },
  hdrText: { flex: 1, minWidth: 0 },
  hdrName: { fontSize: 14, color: C.text, fontFamily: FONT_BODY_SEMI, lineHeight: 16 },
  hdrSub: { fontSize: 10, color: C.accentBlueDeep, fontFamily: FONT_BODY_SEMI, marginTop: 2 },
  headerBtn: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },

  summaryWrap: { paddingHorizontal: 16, paddingTop: 10 },
  summaryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(207,227,245,0.6)',
    borderWidth: 1, borderColor: 'rgba(125,168,207,0.33)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  summaryText: { flex: 1, fontSize: 11, color: C.accentBlueText, fontFamily: FONT_BODY },
  summaryOpen: { fontSize: 11, fontFamily: FONT_BODY_SEMI, color: C.accentBlueText, paddingHorizontal: 4 },

  messagesPane: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },

  emptyCard: {
    backgroundColor: C.accentBlue,
    borderWidth: 1, borderColor: 'rgba(125,168,207,0.2)',
    borderRadius: 12, padding: 16, paddingVertical: 24,
    marginVertical: 16, alignSelf: 'center', maxWidth: 320,
    alignItems: 'center',
  },
  emptyTitle: { fontFamily: FONT_DISPLAY, fontSize: 18, color: C.accentBlueText, marginBottom: 4 },
  emptySub: { fontSize: 12, color: C.accentBlueText, opacity: 0.8, textAlign: 'center', fontFamily: FONT_BODY },

  msg: { marginBottom: 8, flexDirection: 'row' },
  msgMine: { justifyContent: 'flex-end' },
  msgPeer: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '74%', paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: {
    backgroundColor: C.ink,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderBottomLeftRadius: 16, borderBottomRightRadius: 4,
  },
  bubblePeer: {
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.line,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderBottomRightRadius: 16, borderBottomLeftRadius: 4,
  },
  bubbleBody: { fontSize: 13, lineHeight: 18, fontFamily: FONT_BODY },
  msgTime: { fontFamily: FONT_MONO, fontSize: 9, marginTop: 4, textAlign: 'right' },

  composer: {
    backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.line,
    paddingHorizontal: 12, paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  attachBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  composerInput: {
    flex: 1, height: 36, borderRadius: 999,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    paddingHorizontal: 14, fontSize: 13, color: C.text, fontFamily: FONT_BODY,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.ink,
    alignItems: 'center', justifyContent: 'center',
  },

  composerDisabled: {
    backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.line,
    padding: 14, alignItems: 'center',
  },
  composerDisabledText: { color: C.textMuted, fontSize: 12, fontFamily: FONT_BODY },
});
