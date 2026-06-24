import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { BeautyShell } from '@/components/BeautyShell';
import { BottomNav } from '@/components/BottomNav';
import { useSession } from '@/hooks/useSession';
import { logout as doLogout } from '@/services/auth';
import { PALETTE } from '@/theme/colors';
import { FONT_BODY, FONT_BODY_SEMI, FONT_DISPLAY, FONT_MONO } from '@/theme/fonts';

interface ProfileData {
  user?: { email?: string; name?: string; member_since?: string };
  stats?: { booking_count?: number };
}

const C = { ...PALETTE, accentBlueLight: '#BFD8EE' };

function formatMemberSince(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user: sessionUser, clear } = useSession();
  const [env, setEnv] = useState<BffEnvelope<ProfileData> | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolve<ProfileData>('beauty_profile')
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(auth)/login') as any);
          return;
        }
        setEnv(e);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  const data = env?.action === 'render' ? env.data : null;
  const links = (env?._links ?? {}) as Record<string, BffLink | undefined>;
  const user = data?.user ?? sessionUser ?? null;
  const email = user?.email ?? '—';
  const displayName = (() => {
    const u = user as any;
    if (u?.name) return u.name as string;
    const local = String(u?.email || '').split('@')[0];
    return local || 'Beauty';
  })();
  const initial = (displayName || 'B').charAt(0).toUpperCase();
  const memberSince = formatMemberSince((user as any)?.member_since);
  const bookingCount = data?.stats?.booking_count ?? 0;

  const onSignOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await doLogout('customer');
    } catch {}
    clear();
    setLoggingOut(false);
    router.replace('/(auth)/login' as any);
  };

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
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={18} color={C.text} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
          <View style={styles.avatarBlock}>
            <View style={styles.avatarWrap}>
              <LinearGradient
                colors={[C.accentBlueLight, C.accentBlueDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{initial}</Text>
              </LinearGradient>
            </View>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.emailMono}>{email}</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
            {memberSince ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Member since</Text>
                <Text style={styles.infoValue}>{memberSince}</Text>
              </View>
            ) : null}
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Bookings</Text>
              <Text style={styles.infoValue}>{bookingCount}</Text>
            </View>
          </View>

          <View style={styles.actionCard}>
            <ActionRow
              label="My Bookings"
              sub="View past & upcoming"
              onPress={() => links.bookings && navigateLink(router, links.bookings)}
              disabled={!links.bookings}
            />
            <ActionRow
              label="Saved Services"
              sub="Hearts you've tapped"
              onPress={() => router.push('/(customer)/favorites' as any)}
            />
            <ActionRow label="Notifications" sub="Reminders & updates" disabled />
            <ActionRow label="Payment methods" sub="Cards & receipts" disabled last />
          </View>

          <View style={styles.actionCard}>
            <ActionRow
              label={loggingOut ? 'Signing out…' : 'Sign out'}
              sub="End your session"
              onPress={onSignOut}
              disabled={loggingOut}
              danger
              last
            />
          </View>

          <Text style={styles.versionFooter}>Beauty · v0.1.0</Text>
        </ScrollView>

        <BottomNav active="profile" />
      </View>
    </BeautyShell>
  );
}

interface ActionRowProps {
  label: string;
  sub: string;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
  last?: boolean;
}

function ActionRow({ label, sub, onPress, disabled, danger, last }: ActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionRow,
        last && styles.actionRowLast,
        pressed && !disabled && { backgroundColor: C.surface2 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionLabel, danger && { color: C.danger }]}>{label}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={danger ? C.danger : C.textMuted} />
    </Pressable>
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
  iconBtn: {
    width: 44, height: 44, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnPressed: { backgroundColor: C.surface2 },

  body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, maxWidth: 480, width: '100%', alignSelf: 'center' },

  avatarBlock: { alignItems: 'center', marginBottom: 22 },
  avatarWrap: { marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7DA8CF', shadowOpacity: 0.35, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  avatarText: {
    fontFamily: FONT_DISPLAY, fontSize: 34, color: C.accentBlueText,
    textTransform: 'uppercase',
  },
  displayName: { fontFamily: FONT_DISPLAY, fontSize: 28, color: C.text, letterSpacing: 0.2 },
  emailMono: { fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted, marginTop: 2 },

  infoCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 12, marginBottom: 16, overflow: 'hidden',
  },
  actionCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 12, marginBottom: 16, overflow: 'hidden',
  },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 13, color: C.textMuted, fontFamily: FONT_BODY },
  infoValue: { fontSize: 13, color: C.text, fontFamily: FONT_BODY_SEMI },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  actionRowLast: { borderBottomWidth: 0 },
  actionLabel: { fontSize: 13, fontFamily: FONT_BODY_SEMI, color: C.text },
  actionSub: { fontSize: 11, color: C.textMuted, marginTop: 1, fontFamily: FONT_BODY },

  versionFooter: {
    textAlign: 'center', marginTop: 18,
    fontFamily: FONT_MONO, fontSize: 10, color: C.textMuted,
  },
});
