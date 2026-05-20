import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { BeautyShell } from '@/components/BeautyShell';
import { BottomNav } from '@/components/BottomNav';

interface BookingRow {
  id: number;
  status: string;
  slot_at: string;
  slot_label: string;
  in_grace_window?: boolean;
  grace_period_ends_at?: string | null;
  service: { id: number; name: string; price_cents: number; duration_minutes: number };
  provider: { id: number; name: string; location_label: string };
  _links?: {
    detail?: BffLink;
    cancel?: BffLink;
    cancel_grace?: BffLink;
  };
}

interface BookingsData {
  upcoming: BookingRow[];
  past: BookingRow[];
  total: number;
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
  danger: '#C0392B',
  white: '#FFFFFF',
};

const FONT_BODY = 'Inter_400Regular';
const FONT_BODY_SEMI = 'Inter_600SemiBold';
const FONT_DISPLAY = 'CormorantGaramond_500Medium';
const FONT_MONO = 'Menlo';

function statusBadge(status: string) {
  if (status === 'upcoming') return { bg: '#E5F3EA', fg: '#1D4F2C', label: 'Upcoming' };
  if (status === 'cancelled') return { bg: '#FCE8E5', fg: '#8A2419', label: 'Cancelled' };
  if (status === 'cancelled_by_business') return { bg: C.danger, fg: '#FFFFFF', label: 'Cancelled' };
  if (status === 'completed') return { bg: '#EDEDEF', fg: '#555', label: 'Completed' };
  return { bg: '#EDEDEF', fg: '#555', label: status };
}

function dotColor(status: string) {
  if (status === 'upcoming') return C.success;
  if (status === 'cancelled' || status === 'cancelled_by_business') return C.danger;
  return C.textMuted;
}

export default function BookingsListScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<BookingsData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<BookingsData>('beauty_bookings');
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        router.replace((route ?? '/(auth)/login') as any);
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

  const onCancel = async (row: BookingRow, link: BffLink) => {
    setBusyId(row.id);
    await dispatchLink(link);
    setBusyId(null);
    await load();
  };

  const data = env?.action === 'render' ? env.data : null;
  const links = (env?._links ?? {}) as Record<string, BffLink | undefined>;
  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.app}>
        <View style={styles.subHeader}>
          <Pressable
            accessibilityLabel="Back"
            onPress={() => links.home && navigateLink(router, links.home)}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <View style={{ width: 36, height: 36 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
          <Text style={styles.pageTitle}>Bookings</Text>
          <Text style={styles.pageSub}>Manage your appointments</Text>

          <View style={styles.segmented}>
            <Pressable
              onPress={() => setActiveTab('upcoming')}
              style={[styles.segTab, activeTab === 'upcoming' && styles.segTabActive]}
            >
              <Text style={[styles.segTabText, activeTab === 'upcoming' && styles.segTabTextActive]}>
                Upcoming · {upcoming.length}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('past')}
              style={[styles.segTab, activeTab === 'past' && styles.segTabActive]}
            >
              <Text style={[styles.segTabText, activeTab === 'past' && styles.segTabTextActive]}>
                Past · {past.length}
              </Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!env && !error ? <Text style={styles.muted}>Loading…</Text> : null}

          {env?.action === 'render' ? (
            activeTab === 'upcoming' ? (
              <>
                {upcoming.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No upcoming bookings</Text>
                    <Text style={styles.emptySub}>Pick a service from the home screen to schedule.</Text>
                    {links.home ? (
                      <Pressable
                        onPress={() => navigateLink(router, links.home)}
                        style={({ pressed }) => [styles.btnBrowse, pressed && styles.btnBrowsePressed]}
                      >
                        <Text style={styles.btnBrowseText}>Browse services</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {upcoming.map((b) => (
                  <View key={b.id} style={styles.bCard}>
                    <View style={styles.bCardHead}>
                      <Pressable
                        onPress={() => navigateLink(router, b._links?.detail)}
                        style={styles.bTitleBtn}
                      >
                        <View style={[styles.bDot, { backgroundColor: C.success }]} />
                        <Text style={styles.bTitle} numberOfLines={1}>{b.service.name}</Text>
                      </Pressable>
                      <View style={[styles.bStatus, { backgroundColor: '#E5F3EA' }]}>
                        <Text style={[styles.bStatusText, { color: '#1D4F2C' }]}>Upcoming</Text>
                      </View>
                    </View>
                    <Text style={styles.bPlace} numberOfLines={1}>
                      {b.provider.name} · {b.provider.location_label}
                    </Text>
                    <Text style={styles.bWhen}>{b.slot_label}</Text>

                    {b._links?.cancel ? (
                      <View style={styles.rowActions}>
                        <Pressable
                          onPress={() => onCancel(b, b._links!.cancel!)}
                          disabled={busyId === b.id}
                          style={({ pressed }) => [
                            styles.rowCancel,
                            pressed && styles.rowCancelPressed,
                            busyId === b.id && { opacity: 0.55 },
                          ]}
                        >
                          <Text style={styles.rowCancelText}>
                            {busyId === b.id ? 'Cancelling…' : 'Cancel'}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))}
              </>
            ) : (
              <>
                {past.length === 0 ? (
                  <View style={[styles.emptyCard, styles.emptyCardPast]}>
                    <Text style={[styles.emptyTitle, { color: C.text }]}>No past bookings</Text>
                  </View>
                ) : null}
                {past.map((b) => {
                  const badge = statusBadge(b.status);
                  return (
                    <View key={b.id} style={[styles.bCard, styles.bCardPast]}>
                      <View style={styles.bCardHead}>
                        <Pressable
                          onPress={() => navigateLink(router, b._links?.detail)}
                          style={styles.bTitleBtn}
                        >
                          <View style={[styles.bDot, { backgroundColor: dotColor(b.status) }]} />
                          <Text style={styles.bTitle} numberOfLines={1}>{b.service.name}</Text>
                        </Pressable>
                        <View style={[styles.bStatus, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.bStatusText, { color: badge.fg }]}>{badge.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.bPlace} numberOfLines={1}>{b.provider.name}</Text>
                      <Text style={styles.bWhen}>{b.slot_label}</Text>
                    </View>
                  );
                })}
              </>
            )
          ) : null}
        </ScrollView>

        <BottomNav active="bookings" />
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
  iconBtn: {
    width: 44, height: 44, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnPressed: { backgroundColor: C.surface2 },

  body: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },

  pageTitle: {
    fontFamily: FONT_DISPLAY, fontSize: 32, lineHeight: 36,
    color: C.text, letterSpacing: 0.2, marginBottom: 4,
  },
  pageSub: { fontSize: 12, color: C.textMuted, marginBottom: 18, fontFamily: FONT_BODY },

  segmented: {
    flexDirection: 'row', backgroundColor: C.surface2,
    padding: 3, borderRadius: 10, marginBottom: 18,
  },
  segTab: {
    flex: 1, height: 44, borderRadius: 8,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  segTabActive: {
    backgroundColor: C.white, borderColor: C.line,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segTabText: { fontSize: 12, color: C.textMuted, fontFamily: FONT_BODY },
  segTabTextActive: { color: C.text, fontFamily: FONT_BODY_SEMI },

  emptyCard: {
    backgroundColor: C.accentBlue,
    borderWidth: 1, borderColor: 'rgba(125, 168, 207, 0.2)',
    borderRadius: 12, padding: 20, paddingHorizontal: 16,
    alignItems: 'center', marginBottom: 16,
  },
  emptyCardPast: { backgroundColor: C.surface2, borderColor: C.line },
  emptyTitle: { fontFamily: FONT_DISPLAY, fontSize: 20, color: C.accentBlueText, marginBottom: 4 },
  emptySub: { fontSize: 12, color: C.accentBlueText, opacity: 0.75, marginBottom: 12, textAlign: 'center', fontFamily: FONT_BODY },
  btnBrowse: {
    height: 36, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: C.ink, borderWidth: 1, borderColor: C.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  btnBrowsePressed: { backgroundColor: '#1F1F22', borderColor: '#1F1F22' },
  btnBrowseText: { color: C.white, fontSize: 12, fontFamily: FONT_BODY_SEMI },

  bCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  bCardPast: { opacity: 0.78 },
  bCardHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 8, marginBottom: 6,
  },
  bTitleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  bDot: { width: 6, height: 6, borderRadius: 3 },
  bTitle: { fontFamily: FONT_DISPLAY, fontSize: 18, lineHeight: 23, color: C.text, letterSpacing: 0.2, flex: 1 },
  bStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  bStatusText: {
    fontSize: 10, fontFamily: FONT_BODY_SEMI,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  bPlace: { fontSize: 12, color: C.textMuted, marginBottom: 2, fontFamily: FONT_BODY },
  bWhen: { fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted },

  rowActions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line,
  },
  rowCancel: {
    height: 28, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  rowCancelPressed: { backgroundColor: '#FCE8E5', borderColor: C.danger },
  rowCancelText: { color: C.danger, fontSize: 11, fontFamily: FONT_BODY_SEMI },

  error: { color: C.danger, fontSize: 13, marginBottom: 12 },
  muted: { color: C.textMuted, fontSize: 13, padding: 8 },
});
