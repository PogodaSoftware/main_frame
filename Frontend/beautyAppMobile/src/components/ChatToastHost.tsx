/**
 * Global in-app toast for new chat messages — mounted once in the root
 * layout. Subscribes to the inbox socket and shows a tappable banner on any
 * screen when a message arrives for a conversation the user isn't currently
 * viewing. Tapping opens the right thread (customer vs business route).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { startInboxSocket, type InboxEvent } from '@/services/inboxSocket';
import { getActiveChat } from '@/services/activeChat';
import { bumpUnread, refreshUnreadTotal, setUnreadTotal } from '@/services/unreadStore';
import { useSession } from '@/hooks/useSession';

export function ChatToastHost() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const [toast, setToast] = useState<InboxEvent | null>(null);
  const slide = useRef(new Animated.Value(-120)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-establish the inbox socket whenever the signed-in user changes
  // (login / logout / account switch), so toasts follow the active session.
  const userKey = user ? `${user.user_type}:${user.user_id}` : null;
  useEffect(() => {
    if (!userKey) { setUnreadTotal(0); return; }
    // Authoritative initial badge count for this session.
    refreshUnreadTotal();
    const stop = startInboxSocket((ev) => {
      if (getActiveChat() === ev.booking_id) return; // already viewing → stays read
      bumpUnread(); // optimistic badge tick; reconciled on next refresh
      setToast(ev);
    });
    return stop;
  }, [userKey]);

  useEffect(() => {
    if (!toast) return;
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(dismiss, 4500);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [toast]);

  const dismiss = () => {
    Animated.timing(slide, { toValue: -140, duration: 200, useNativeDriver: true }).start(() => setToast(null));
  };

  const open = () => {
    if (!toast) return;
    const route = toast.viewer_type === 'business'
      ? `/business/messages/${toast.booking_id}`
      : `/chats/${toast.booking_id}`;
    dismiss();
    router.push(route as any);
  };

  if (!toast) return null;

  return (
    <Animated.View style={[styles.wrap, { top: insets.top + 6, transform: [{ translateY: slide }] }]}>
      <Pressable style={styles.toast} onPress={open} accessibilityRole="button">
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(toast.peer_name.trim()[0] ?? '?').toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>{toast.peer_name}</Text>
          <Text style={styles.body} numberOfLines={1}>{toast.body}</Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={10} accessibilityLabel="Dismiss">
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 9999 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0F1115', borderRadius: 14, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#7DA8CF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  name: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  body: { color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 1 },
  close: { color: 'rgba(255,255,255,0.6)', fontSize: 14, paddingHorizontal: 4 },
});
