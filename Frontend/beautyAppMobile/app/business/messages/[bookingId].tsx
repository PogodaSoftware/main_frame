/**
 * Business chat thread — real-time provider↔customer messaging over WebSocket.
 * Initial history via REST; live arrival / typing / read receipts over the
 * socket; optimistic send. Mirrors the `msg-thread` design.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { type ChatMessage } from '@/services/bookings';
import { resolve } from '@/services/bff';
import { isRedirect } from '@/bff/types';
import { openChatSocket, type ChatSocket, type SocketStatus } from '@/services/chatSocket';
import { setActiveChat } from '@/services/activeChat';
import { BeautyShell } from '@/components/BeautyShell';
import { ProvSubHeader } from '@/components/business';
import { beautyTokens } from '../../../tamagui.config';

interface Msg extends ChatMessage { pending?: boolean }

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function BusinessThreadScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const id = Number(bookingId);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [peer, setPeer] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerReadAt, setPeerReadAt] = useState<string | null>(null);

  const socketRef = useRef<ChatSocket | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tmpId = useRef(-1);

  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

  useEffect(() => {
    let cancelled = false;
    setActiveChat(id);
    (async () => {
      try {
        // Initial history from the `beauty_chat_thread` BFF resolver; live
        // arrival continues over the socket below.
        const e = await resolve<{
          messages: Msg[]; peer_name: string; service_name: string; is_active: boolean;
        }>('beauty_chat_thread', { bookingId: id });
        if (cancelled) return;
        if (isRedirect(e)) {
          router.replace('/(auth)/business-login' as any);
          return;
        }
        if (e.action === 'render' && e.data) {
          setMessages(e.data.messages as Msg[]);
          setPeer(e.data.peer_name);
          setServiceName(e.data.service_name);
          setActive(e.data.is_active);
          scrollToEnd();
        }
      } catch {
        /* surfaced as empty */
      } finally {
        if (!cancelled) setLoading(false);
      }

      const sock = await openChatSocket(
        id,
        (ev) => {
          if (ev.type === 'message') {
            setMessages((cur) => {
              const m = ev.message as Msg;
              // reconcile our own optimistic temp
              if (m.sender_type === 'business') {
                const i = cur.findIndex((x) => x.pending && x.body === m.body);
                if (i >= 0) { const next = cur.slice(); next[i] = m; return next; }
              }
              if (cur.some((x) => x.id === m.id)) return cur;
              return [...cur, m];
            });
            scrollToEnd();
            // mark read since we're viewing
            socketRef.current?.markRead(new Date().toISOString());
          } else if (ev.type === 'typing') {
            setPeerTyping(ev.is_typing);
            if (peerTypingTimer.current) clearTimeout(peerTypingTimer.current);
            if (ev.is_typing) peerTypingTimer.current = setTimeout(() => setPeerTyping(false), 4000);
          } else if (ev.type === 'read') {
            setPeerReadAt(ev.at ?? new Date().toISOString());
          }
        },
        (s) => setStatus(s),
      );
      if (cancelled) { sock.close(); return; }
      socketRef.current = sock;
      sock.markRead(new Date().toISOString());
    })();

    return () => {
      cancelled = true;
      setActiveChat(null);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (peerTypingTimer.current) clearTimeout(peerTypingTimer.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [id]);

  const onChangeInput = useCallback((v: string) => {
    setInput(v);
    const sock = socketRef.current;
    if (!sock) return;
    sock.setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sock.setTyping(false), 1500);
  }, []);

  const send = () => {
    const body = input.trim();
    if (!body || !socketRef.current) return;
    const temp: Msg = {
      id: tmpId.current--, booking_id: id, sender_type: 'business', sender_id: 0,
      body, created_at: new Date().toISOString(), pending: true,
    };
    setMessages((cur) => [...cur, temp]);
    socketRef.current.send(body);
    socketRef.current.setTyping(false);
    setInput('');
    scrollToEnd();
  };

  const lastOwn = [...messages].reverse().find((m) => m.sender_type === 'business' && !m.pending);
  const showRead = !!peerReadAt && !!lastOwn && new Date(peerReadAt).getTime() >= new Date(lastOwn.created_at).getTime();

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ProvSubHeader
        back="Messages"
        title={peer || 'Chat'}
        onBackPress={() => router.replace('/business/messages' as any)}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={beautyTokens.accentBlueDeep} /></View>
        ) : (
          <ScrollView ref={scrollRef} style={styles.body} contentContainerStyle={styles.bodyContent}>
            {!!serviceName && (
              <View style={styles.contextChip}>
                <Ionicons name="calendar-outline" size={13} color={beautyTokens.accentBlueText} />
                <Text style={styles.contextText} numberOfLines={1}>{serviceName}</Text>
              </View>
            )}

            {messages.length === 0 ? (
              <View style={styles.sayHello}>
                <Text style={styles.sayHelloTitle}>Say hello</Text>
                <Text style={styles.sayHelloBody}>Message {peer || 'your customer'} about their appointment.</Text>
              </View>
            ) : (
              messages.map((m) => {
                const own = m.sender_type === 'business';
                return (
                  <View key={m.id} style={[styles.bubbleRow, own ? styles.rowOwn : styles.rowPeer]}>
                    <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubblePeer, m.pending && styles.bubblePending]}>
                      <Text style={[styles.bubbleText, own && styles.bubbleTextOwn]}>{m.body}</Text>
                      <Text style={[styles.bubbleTime, own && styles.bubbleTimeOwn]}>{timeLabel(m.created_at)}</Text>
                    </View>
                  </View>
                );
              })
            )}

            {showRead && <Text style={styles.readReceipt}>Read</Text>}
            {peerTyping && <Text style={styles.typing}>{peer || 'Customer'} is typing…</Text>}
          </ScrollView>
        )}

        {active ? (
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              value={input}
              onChangeText={onChangeInput}
              placeholder={`Message ${peer || 'customer'}…`}
              placeholderTextColor={beautyTokens.textMuted}
              multiline
              onSubmitEditing={send}
            />
            <Pressable
              onPress={send}
              disabled={!input.trim()}
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              accessibilityLabel="Send"
            >
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.closedBar}>
            <Text style={styles.closedText}>Messaging disabled — chat closed.</Text>
          </View>
        )}
        {status !== 'open' && active && !loading ? (
          <Text style={styles.statusLine}>{status === 'connecting' ? 'Connecting…' : 'Reconnecting…'}</Text>
        ) : null}
      </KeyboardAvoidingView>
    </BeautyShell>
  );
}

const C = beautyTokens;
const styles = StyleSheet.create({
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, backgroundColor: C.surface },
  bodyContent: { padding: 16, gap: 8 },

  contextChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center',
    backgroundColor: C.accentBlue, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 6,
  },
  contextText: { fontFamily: C.fontBody, fontSize: 12, fontWeight: '600', color: C.accentBlueText, maxWidth: 280 },

  sayHello: { alignItems: 'center', backgroundColor: C.accentBlue, borderRadius: 16, padding: 20, marginTop: 8 },
  sayHelloTitle: { fontFamily: C.fontDisplay, fontSize: 22, color: C.accentBlueText },
  sayHelloBody: { fontFamily: C.fontBody, fontSize: 13, color: C.accentBlueText, marginTop: 4, textAlign: 'center' },

  bubbleRow: { flexDirection: 'row' },
  rowOwn: { justifyContent: 'flex-end' },
  rowPeer: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleOwn: { backgroundColor: C.ink, borderBottomRightRadius: 4 },
  bubblePeer: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.line, borderBottomLeftRadius: 4 },
  bubblePending: { opacity: 0.6 },
  bubbleText: { fontFamily: C.fontBody, fontSize: 14, color: C.text, lineHeight: 19 },
  bubbleTextOwn: { color: '#FFFFFF' },
  bubbleTime: { fontFamily: 'Menlo', fontSize: 9, color: C.textMuted, marginTop: 4, textAlign: 'right' },
  bubbleTimeOwn: { color: 'rgba(255,255,255,0.6)' },

  readReceipt: { alignSelf: 'flex-end', fontFamily: C.fontBody, fontSize: 10, color: C.textMuted, marginTop: -2 },
  typing: { alignSelf: 'flex-start', fontFamily: C.fontBody, fontSize: 12, color: C.textMuted, fontStyle: 'italic' },

  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#FFFFFF',
  },
  composerInput: {
    flex: 1, maxHeight: 110, minHeight: 40, paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: C.surface, borderRadius: 20, fontFamily: C.fontBody, fontSize: 14, color: C.text,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#B8B8BE' },

  closedBar: { padding: 14, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#FFFFFF', alignItems: 'center' },
  closedText: { fontFamily: C.fontBody, fontSize: 13, color: C.textMuted },
  statusLine: { textAlign: 'center', fontFamily: C.fontBody, fontSize: 11, color: C.textMuted, paddingVertical: 4 },
});
