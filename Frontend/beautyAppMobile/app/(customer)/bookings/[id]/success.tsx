/**
 * Booking success — mirrors Angular `BeautyBookingSuccessComponent`.
 *  - Sub-header w/ share icon top-right.
 *  - Centered hero: baby-blue check disc, "YOU'RE ALL SET" caps eyebrow,
 *    "Booking confirmed" serif h1, body "You're booked for X at Y."
 *  - Summary card rows: WHEN / WHERE / STYLIST / TOTAL.
 *  - Baby-blue confirmation chip: CONFIRMATION caps + BK-XXXX-XXXX mono + Copy.
 *  - Sticky action stack: ink "View my bookings", outline pair "Add to calendar" + "Back to home".
 *  - Grace period: baby-blue "Cancel free · MM:SS" pill when in_grace_window.
 *  - 4-tab nav (Bookings active).
 */
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { BottomNav } from '@/components/BottomNav';
import { useGraceCountdown } from '@/hooks/useGraceCountdown';

interface SuccessData {
  booking: {
    id: number;
    status: string;
    slot_at: string;
    slot_label: string;
    grace_period_ends_at: string | null;
    in_grace_window: boolean;
    service: { id: number; name: string; price_cents: number; duration_minutes: number };
    provider: { id: number; name: string; location_label: string; timezone?: string };
  };
}

const C = {
  surface: '#F2F2F2',
  surface2: '#E9E9EB',
  line: '#DCDCDF',
  text: '#0F1115',
  textMuted: '#6B6F77',
  accentBlue: '#CFE3F5',
  accentBlueLight: '#E8F1FA',
  accentBlueDeep: '#7DA8CF',
  accentBlueText: '#1a3a52',
  ink: '#0A0A0B',
  danger: '#C0392B',
  white: '#FFFFFF',
};
const FONT_BODY = 'Inter_400Regular';
const FONT_BODY_SEMI = 'Inter_600SemiBold';
const FONT_DISPLAY = 'CormorantGaramond_500Medium';
const FONT_MONO = 'Menlo';

function confirmationCode(id: number): string {
  const hex = id.toString(16).toUpperCase().padStart(8, '0');
  return `BK-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

function formatLocal(iso: string, tz?: string): string {
  if (!iso) return '';
  try {
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZoneName: 'short',
    };
    if (tz) (opts as any).timeZone = tz;
    return new Intl.DateTimeFormat(undefined, opts).format(new Date(iso));
  } catch {
    return '';
  }
}

export default function BookingSuccessScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);
  const [env, setEnv] = useState<BffEnvelope<SuccessData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(bookingId)) return;
    let cancelled = false;
    setEnv(null);
    setError(null);
    resolve<SuccessData>('beauty_booking_success', { bookingId })
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(customer)/bookings') as any);
          return;
        }
        setEnv(e);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => { cancelled = true; };
  }, [bookingId]);

  const graceEndsAt =
    env?.action === 'render' ? env.data?.booking?.grace_period_ends_at ?? null : null;
  const graceLeft = useGraceCountdown(graceEndsAt);

  if (error) {
    return (
      <View style={[styles.app, { padding: 16 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.danger, fontFamily: FONT_BODY }} testID="booking-success-error">{error}</Text>
      </View>
    );
  }
  if (!env || env.action !== 'render' || !env.data) {
    return (
      <View style={[styles.app, { alignItems: 'center', justifyContent: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.textMuted, fontFamily: FONT_BODY }}>Loading…</Text>
      </View>
    );
  }

  const b = env.data.booking;
  const links = (env._links ?? {}) as Record<string, BffLink | undefined>;
  const code = confirmationCode(b.id);
  const whenLabel = formatLocal(b.slot_at, b.provider.timezone) || b.slot_label;

  const copy = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard) {
      try {
        await (navigator as any).clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch { /* ignore */ }
    } else {
      try {
        const Clip = await import('expo-clipboard');
        await Clip.setStringAsync(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch { /* ignore */ }
    }
  };

  const onCancelGrace = async () => {
    if (!links.cancel_grace || isCancelling) return;
    setIsCancelling(true);
    const r = await dispatchLink(links.cancel_grace);
    setIsCancelling(false);
    if (r.ok) router.replace('/(customer)/bookings' as any);
  };

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.subHeader}>
        <View style={{ width: 36 }} />
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityLabel="Share"
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        >
          <Ionicons name="share-outline" size={18} color={C.text} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <View style={styles.sparkleDisc}>
            <View style={styles.sparkleRing} />
            <Ionicons name="checkmark" size={32} color={C.accentBlueText} />
          </View>
          <Text style={styles.eyebrow}>You're all set</Text>
          <Text style={styles.title}>Booking confirmed</Text>
          <Text style={styles.bodyText}>
            You're booked for <Text style={styles.bodyStrong}>{b.service.name}</Text> at <Text style={styles.bodyStrong}>{b.provider.name}</Text>.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>When</Text>
            <Text style={styles.rowValue}>{whenLabel}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Where</Text>
            <Text style={styles.rowValue}>{b.provider.location_label}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Stylist</Text>
            <Text style={styles.rowValue}>{b.provider.name}</Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Total</Text>
            <Text style={[styles.rowValue, styles.rowValueMono]}>
              ${(b.service.price_cents / 100).toFixed(2)} · {b.service.duration_minutes} min
            </Text>
          </View>
        </View>

        <View style={styles.confChip}>
          <View style={styles.confText}>
            <Text style={styles.confEyebrow}>Confirmation</Text>
            <Text style={styles.confCode}>{code}</Text>
          </View>
          <Pressable style={styles.confCopy} onPress={copy}>
            <Ionicons name="copy-outline" size={11} color={C.accentBlueText} />
            <Text style={styles.confCopyText}>{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, minHeight: 12 }} />

        <View style={styles.actions}>
          <Pressable
            disabled={!links.bookings}
            onPress={() => links.bookings && navigateLink(router, links.bookings, { replace: true })}
            style={({ pressed }) => [
              styles.btnPrimary,
              !links.bookings && { opacity: 0.55 },
              pressed && links.bookings && { backgroundColor: '#1F1F22', borderColor: '#1F1F22' },
            ]}
          >
            <Ionicons name="calendar-outline" size={14} color={C.white} />
            <Text style={styles.btnPrimaryText}>View my bookings</Text>
          </Pressable>

          <View style={styles.actionsRow}>
            <Pressable style={({ pressed }) => [styles.btnSecondary, pressed && { borderColor: C.accentBlueDeep }]}>
              <Text style={styles.btnSecondaryText}>Add to calendar</Text>
            </Pressable>
            <Pressable
              disabled={!links.home}
              onPress={() => links.home && navigateLink(router, links.home, { replace: true })}
              style={({ pressed }) => [
                styles.btnSecondary,
                !links.home && { opacity: 0.55 },
                pressed && links.home && { borderColor: C.accentBlueDeep },
              ]}
            >
              <Text style={styles.btnSecondaryText}>Back to home</Text>
            </Pressable>
          </View>

          {b.in_grace_window && links.cancel_grace && graceLeft ? (
            <>
              <Pressable
                onPress={onCancelGrace}
                disabled={isCancelling}
                style={[styles.btnGrace, isCancelling && { opacity: 0.55 }]}
                accessibilityRole="button"
              >
                <Ionicons name="time-outline" size={14} color={C.accentBlueText} />
                <Text style={styles.btnGraceText}>
                  {isCancelling ? 'Cancelling…' : 'Cancel free'}
                </Text>
                <View style={styles.gracePill}>
                  <Text style={styles.gracePillText}>{graceLeft}</Text>
                </View>
              </Pressable>
              <Text style={styles.graceHelper}>
                {"Cancel within 5 minutes of booking and you won't be charged."}
              </Text>
            </>
          ) : b.in_grace_window && links.cancel_grace && !graceLeft ? (
            // Grace elapsed on this screen — cancelling now carries the fee;
            // send the user to the booking to complete it.
            <Pressable
              onPress={() => router.push(`/(customer)/bookings/${b.id}` as any)}
              style={styles.cancelLink}
              accessibilityRole="button"
            >
              <Text style={styles.cancelLinkText}>Cancel this booking · $20 fee</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <BottomNav active="bookings" />
    </View>
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
  iconBtn: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconBtnPressed: { backgroundColor: C.surface2 },

  body: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },

  hero: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  sparkleDisc: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: C.accentBlue,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#7DA8CF', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
  },
  sparkleRing: {
    position: 'absolute', top: 6, left: 6, right: 6, bottom: 6,
    borderRadius: 32,
    borderWidth: 1, borderColor: 'rgba(125,168,207,0.4)', borderStyle: 'dashed',
  },
  eyebrow: {
    fontSize: 11, fontFamily: FONT_BODY_SEMI, color: C.accentBlueText,
    letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6,
  },
  title: {
    fontFamily: FONT_DISPLAY, fontSize: 34, color: C.text,
    letterSpacing: 0.2, lineHeight: 36, marginBottom: 8, textAlign: 'center',
  },
  bodyText: {
    fontSize: 13, lineHeight: 20, color: C.textMuted,
    maxWidth: 290, textAlign: 'center', fontFamily: FONT_BODY,
  },
  bodyStrong: { color: C.text, fontFamily: FONT_BODY_SEMI },

  summaryCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 14, marginBottom: 16, overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: {
    fontSize: 10, fontFamily: FONT_BODY_SEMI, color: C.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
  },
  rowValue: { fontSize: 14, color: C.text, lineHeight: 19, fontFamily: FONT_BODY_SEMI },
  rowValueMono: { fontFamily: FONT_MONO, fontWeight: '500' as const },

  confChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.accentBlue,
    borderWidth: 1, borderColor: 'rgba(125,168,207,0.4)',
    marginBottom: 16,
  },
  confText: { gap: 2 },
  confEyebrow: {
    fontSize: 10, fontFamily: FONT_BODY_SEMI, color: C.accentBlueText,
    letterSpacing: 1.2, opacity: 0.75, textTransform: 'uppercase',
  },
  confCode: { fontFamily: FONT_MONO, fontSize: 13, color: C.accentBlueText, fontWeight: '600' as const },
  confCopy: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 30, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: C.white, borderWidth: 1, borderColor: 'rgba(125,168,207,0.55)',
  },
  confCopyText: { fontSize: 11, fontFamily: FONT_BODY_SEMI, color: C.accentBlueText },

  actions: { gap: 8 },
  btnPrimary: {
    width: '100%', height: 48, borderRadius: 12,
    backgroundColor: C.ink, borderWidth: 1, borderColor: C.ink,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  btnPrimaryText: { color: C.white, fontSize: 14, fontFamily: FONT_BODY_SEMI, letterSpacing: 0.2 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  btnSecondary: {
    flex: 1, height: 44, borderRadius: 12,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { fontSize: 13, fontFamily: FONT_BODY_SEMI, color: C.text, letterSpacing: 0.2 },

  // Grace-window cancel — baby-blue pill w/ live MM:SS countdown + helper.
  btnGrace: {
    width: '100%', height: 44, borderRadius: 12,
    backgroundColor: C.accentBlue,
    borderWidth: 1, borderColor: 'rgba(125,168,207,0.5)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnGraceText: { fontSize: 13, fontFamily: FONT_BODY_SEMI, color: C.accentBlueText, letterSpacing: 0.2 },
  gracePill: {
    backgroundColor: C.white, borderWidth: 1, borderColor: 'rgba(125,168,207,0.55)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    minWidth: 46, alignItems: 'center',
  },
  gracePillText: { fontFamily: FONT_MONO, fontSize: 12, color: C.accentBlueText, fontWeight: '600' as const },
  graceHelper: {
    fontSize: 12, color: C.textMuted, fontFamily: FONT_BODY,
    textAlign: 'center', marginTop: 8,
  },
  cancelLink: {
    width: '100%', height: 48, borderRadius: 10,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelLinkText: { color: C.danger, fontSize: 14, fontFamily: FONT_BODY_SEMI, letterSpacing: 0.2 },
});
