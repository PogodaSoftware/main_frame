/**
 * Booking detail — mirrors Angular `BeautyBookingDetailComponent`.
 *  - Sub-header (back + "Booking" centered title).
 *  - Dark gradient hero stripe.
 *  - Title row: serif service name + serif price.
 *  - Meta line: location · duration · status (success green when not cancelled).
 *  - Cancel banner variants: danger (cancelled by business), neutral
 *    (cancelled by customer), info (cancelled in grace).
 *  - Info card: WHEN / PROVIDER / ABOUT rows.
 *  - Sticky CTA stack: green Reschedule, red Cancel/Cancel grace, ink View provider.
 *  - 4-tab bottom nav.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { useGraceCountdown } from '@/hooks/useGraceCountdown';
import { BottomNav } from '@/components/BottomNav';

interface BookingDetailData {
  booking: {
    id: number;
    status: string;
    is_upcoming: boolean;
    slot_at: string;
    slot_label: string;
    grace_period_ends_at: string | null;
    in_grace_window: boolean;
    service: {
      id: number; name: string; description: string;
      price_cents: number; duration_minutes: number; category: string;
    };
    provider: {
      id: number; name: string;
      short_description: string; location_label: string;
      timezone?: string | null;
    };
  };
}

const C = {
  surface: '#F2F2F2',
  surface2: '#E9E9EB',
  line: '#DCDCDF',
  text: '#0F1115',
  textMuted: '#6B6F77',
  accentBlue: '#CFE3F5',
  accentBlueDeep: '#7DA8CF',
  accentBlueText: '#1a3a52',
  ink: '#0A0A0B',
  success: '#2F7A47',
  successHover: '#256238',
  danger: '#C0392B',
  white: '#FFFFFF',
};
const FONT_BODY = 'Inter_400Regular';
const FONT_BODY_SEMI = 'Inter_600SemiBold';
const FONT_DISPLAY = 'CormorantGaramond_500Medium';

function titleCase(s: string): string {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatLocal(iso: string, tz?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZoneName: 'short',
    };
    if (tz) (opts as any).timeZone = tz;
    return new Intl.DateTimeFormat(undefined, opts).format(d);
  } catch {
    return '';
  }
}

function isCancelled(status: string): boolean {
  return status === 'cancelled' || status === 'cancelled_by_business' || status === 'cancelled_by_customer' || status === 'cancelled_immediate';
}

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const [env, setEnv] = useState<BffEnvelope<BookingDetailData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(bookingId)) return;
    setError(null);
    try {
      const e = await resolve<BookingDetailData>('beauty_booking_detail', { id: bookingId });
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        router.replace((route ?? '/(customer)/bookings') as any);
        return;
      }
      setEnv(e);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [bookingId, router]);

  useEffect(() => { load(); }, [load]);

  const graceEndsAt =
    env?.action === 'render' ? env.data?.booking?.grace_period_ends_at ?? null : null;
  const graceLeft = useGraceCountdown(graceEndsAt);

  // When the grace countdown elapses, re-fetch so the BFF returns the
  // post-grace links (paid cancel) instead of the now-stale free-cancel link.
  const reloadedOnExpiry = useRef(false);
  useEffect(() => {
    const hasGraceLink = !!(env?.action === 'render' && env._links?.cancel_grace);
    if (hasGraceLink && graceEndsAt && !graceLeft && !reloadedOnExpiry.current) {
      reloadedOnExpiry.current = true;
      load();
    }
  }, [graceLeft, graceEndsAt, env, load]);

  const onCancel = async (link: BffLink) => {
    setIsCancelling(true);
    setCancelError(null);
    const r = await dispatchLink(link);
    setIsCancelling(false);
    if (r.ok) {
      await load();
    } else {
      setCancelError('Could not cancel booking. Please try again.');
    }
  };

  if (error) {
    return (
      <View style={[styles.app, { padding: 16 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.danger, fontFamily: FONT_BODY }} testID="booking-detail-error">{error}</Text>
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
  const priceLabel = `$${(b.service.price_cents / 100).toFixed(0)}`;
  const whenLabel = formatLocal(b.slot_at, b.provider?.timezone) || b.slot_label;
  const cancelled = isCancelled(b.status);

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.subHeader}>
        <Pressable
          onPress={() => (links.bookings ? navigateLink(router, links.bookings) : router.back())}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </Pressable>
        <Text style={styles.subHeaderTitle}>Booking</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
        <View style={styles.heroStripe}>
          <LinearGradient
            colors={['#3A3A3A', '#2A2A2A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.detailSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{b.service.name}</Text>
            <Text style={styles.price}>{priceLabel}</Text>
          </View>
          <Text style={styles.meta}>
            {b.provider.location_label} · {b.service.duration_minutes} min
            {!cancelled ? (
              <Text style={styles.statusOk}> · {titleCase(b.status)}</Text>
            ) : null}
          </Text>

          {b.status === 'cancelled_by_business' ? (
            <View style={[styles.banner, styles.bannerDanger]}>
              <Text style={[styles.bannerText, { color: '#6F1D14' }]}>
                <Text style={{ fontFamily: FONT_BODY_SEMI }}>Provider cancelled this booking.</Text> Refund processed.
              </Text>
            </View>
          ) : null}
          {b.status === 'cancelled_by_customer' || b.status === 'cancelled' ? (
            <View style={[styles.banner, styles.bannerNeutral]}>
              <Text style={[styles.bannerText, { color: C.text }]}>You cancelled this booking.</Text>
            </View>
          ) : null}
          {b.status === 'cancelled_immediate' ? (
            <View style={[styles.banner, styles.bannerInfo]}>
              <Text style={[styles.bannerText, { color: C.accentBlueText }]}>
                Booked then cancelled within grace window. No charge.
              </Text>
            </View>
          ) : null}

          <View style={styles.infoCard}>
            <View style={[styles.infoRow, { paddingTop: 0 }]}>
              <Text style={styles.infoLabel}>When</Text>
              <Text style={styles.infoValue}>{whenLabel}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Provider</Text>
              <Text style={styles.infoValue}>
                {b.provider.name}
                {b.provider.short_description ? (
                  <>{'\n'}<Text style={styles.infoValueSmall}>{b.provider.short_description}</Text></>
                ) : null}
              </Text>
            </View>
            {b.service.description ? (
              <View style={[styles.infoRow, styles.infoRowLast]}>
                <Text style={styles.infoLabel}>About</Text>
                <Text style={[styles.infoValue, { color: C.textMuted }]}>{b.service.description}</Text>
              </View>
            ) : null}
          </View>

          {cancelError ? (
            <View style={styles.serverError}>
              <Text style={styles.serverErrorText}>{cancelError}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.ctaRow}>
        {/* Reschedule — ink, full width */}
        {links.reschedule ? (
          <Pressable
            onPress={() => navigateLink(router, links.reschedule)}
            style={({ pressed }) => [styles.btnReschedule, pressed && { backgroundColor: '#1F1F22', borderColor: '#1F1F22' }]}
          >
            <Ionicons name="refresh" size={14} color={C.white} />
            <Text style={styles.btnRescheduleText}>{links.reschedule.prompt ?? 'Reschedule'}</Text>
          </Pressable>
        ) : null}

        {/* View provider + Add to calendar — white, side by side */}
        <View style={styles.secondaryRow}>
          {links.provider ? (
            <Pressable
              onPress={() => navigateLink(router, links.provider)}
              style={({ pressed }) => [styles.btnSecondary, pressed && { borderColor: C.accentBlueDeep }]}
            >
              <Text style={styles.btnSecondaryText}>{links.provider.prompt ?? 'View provider'}</Text>
            </Pressable>
          ) : null}
          <Pressable style={({ pressed }) => [styles.btnSecondary, pressed && { borderColor: C.accentBlueDeep }]}>
            <Text style={styles.btnSecondaryText}>Add to calendar</Text>
          </Pressable>
        </View>

        {/* Cancel — in grace (timer still running): baby-blue countdown pill
            + helper note; past grace: red fee-bearing text link. */}
        {links.cancel_grace && graceLeft ? (
          <View style={{ alignItems: 'center' }}>
            <Pressable
              onPress={() => onCancel(links.cancel_grace!)}
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
          </View>
        ) : links.cancel || links.cancel_grace ? (
          <Pressable
            onPress={() => onCancel((links.cancel ?? links.cancel_grace)!)}
            disabled={isCancelling}
            style={styles.cancelLink}
            accessibilityRole="button"
          >
            <Text style={[styles.cancelLinkText, isCancelling && { opacity: 0.55 }]}>
              {isCancelling ? 'Cancelling…' : `${links.cancel?.prompt ?? 'Cancel this booking'} · $20 fee`}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <BottomNav active="home" />
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
  subHeaderTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 15, fontFamily: FONT_BODY_SEMI, color: C.text, letterSpacing: 0.2,
  },

  heroStripe: { height: 180, overflow: 'hidden' },

  detailSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  title: { fontFamily: FONT_DISPLAY, fontSize: 28, lineHeight: 32, color: C.text, letterSpacing: 0.2, flex: 1 },
  // Money in Inter semibold w/ tabular lining figures — Cormorant's old-style
  // numerals made "$135" hard to read as a price. Serif stays on the title.
  price: {
    fontFamily: FONT_BODY_SEMI,
    fontSize: 19,
    color: C.text,
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
  meta: { fontSize: 12, color: C.textMuted, marginTop: 4, marginBottom: 18, fontFamily: FONT_BODY },
  statusOk: { color: C.success, fontFamily: FONT_BODY_SEMI },

  banner: {
    borderLeftWidth: 4, padding: 10, paddingHorizontal: 12,
    borderRadius: 8, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  bannerDanger: { backgroundColor: '#FCE8E5', borderLeftColor: C.danger },
  bannerNeutral: { backgroundColor: C.surface2, borderLeftColor: '#9A9AA0' },
  bannerInfo: { backgroundColor: C.accentBlue, borderLeftColor: C.accentBlueDeep },
  bannerText: { fontSize: 13, lineHeight: 18, fontFamily: FONT_BODY },

  infoCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  infoRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  infoLabel: {
    fontSize: 11, fontFamily: FONT_BODY_SEMI, color: C.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
  },
  infoValue: { fontSize: 14, color: C.text, lineHeight: 20, fontFamily: FONT_BODY },
  infoValueSmall: { fontSize: 12, color: C.textMuted, fontFamily: FONT_BODY },

  serverError: {
    backgroundColor: '#FCE8E5', borderWidth: 1, borderColor: '#F4B5AE',
    borderRadius: 10, padding: 10, paddingHorizontal: 14, marginTop: 4, marginBottom: 12,
  },
  serverErrorText: { color: '#8A2419', fontSize: 13, fontFamily: FONT_BODY, lineHeight: 18 },

  ctaRow: {
    flexDirection: 'column', gap: 10,
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line,
  },
  // Reschedule — ink/black, full width (matches manage-booking design).
  btnReschedule: {
    width: '100%', height: 48, borderRadius: 10,
    backgroundColor: C.ink, borderWidth: 1, borderColor: C.ink,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
    shadowColor: C.ink, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  btnRescheduleText: { color: C.white, fontSize: 14, fontFamily: FONT_BODY_SEMI, letterSpacing: 0.2 },

  // View provider + Add to calendar — white outline pair.
  secondaryRow: { flexDirection: 'row', gap: 10 },
  btnSecondary: {
    flex: 1, height: 48, borderRadius: 10,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { color: C.text, fontSize: 14, fontFamily: FONT_BODY_SEMI, letterSpacing: 0.2 },

  // Past-grace cancel — red outline button.
  cancelLink: {
    width: '100%', height: 48, borderRadius: 10,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelLinkText: { color: C.danger, fontSize: 14, fontFamily: FONT_BODY_SEMI, letterSpacing: 0.2 },

  // In-grace cancel — baby-blue pill w/ live MM:SS countdown + helper.
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
  gracePillText: { fontFamily: FONT_BODY_SEMI, fontSize: 12, color: C.accentBlueText },
  graceHelper: {
    fontSize: 12, color: C.textMuted, fontFamily: FONT_BODY,
    textAlign: 'center', marginTop: 8,
  },
});
