/**
 * Business services list — mirrors Angular beauty-business-services.component.
 * Sub-header w/ Add button + sort picker + service rows in card + delete confirm.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { BeautyShell } from '@/components/BeautyShell';
import {
  ProvBtn,
  ProvCard,
  ProvEmptyHint,
  ProvSubHeader,
  ProvTabBar,
  type ProviderTab,
} from '@/components/business';
import { beautyTokens } from '../../../tamagui.config';

interface ServiceRow {
  id: number;
  name: string;
  description?: string;
  category: string;
  category_label: string;
  price_cents: number;
  price_dollars?: string;
  duration_minutes: number;
  _links?: Record<string, BffLink>;
}

interface ServicesData {
  services?: ServiceRow[];
  badges?: { messages_unread?: number; bookings_unread?: number };
}

type SortKey = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'time-asc' | 'time-desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name-asc', label: 'Name A → Z' },
  { key: 'name-desc', label: 'Name Z → A' },
  { key: 'price-asc', label: 'Price low → high' },
  { key: 'price-desc', label: 'Price high → low' },
  { key: 'time-asc', label: 'Time short → long' },
  { key: 'time-desc', label: 'Time long → short' },
];

const CATEGORY_HUE: Record<string, string> = {
  facial: '#A88A7A',
  massage: '#7A8B6E',
  nails: '#C28A82',
  hair: '#5C4A3F',
};

function priceCents(s: ServiceRow): number {
  if (s.price_dollars) return Math.round(parseFloat(s.price_dollars) * 100);
  return s.price_cents || 0;
}

function formatPrice(s: ServiceRow): string {
  return s.price_dollars || ((s.price_cents || 0) / 100).toFixed(2);
}

export default function BusinessServicesScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ServicesData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ServiceRow | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name-asc');
  const [sortOpen, setSortOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<ServicesData>('beauty_business_services');
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        router.replace((route ?? '/(auth)/business-login') as any);
        return;
      }
      setEnv(e);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const data = env?.action === 'render' ? env.data : undefined;
  const links: Record<string, BffLink> = (env?._links as Record<string, BffLink>) ?? {};
  const services = data?.services ?? [];
  const badges = data?.badges ?? {};

  const sortedServices = useMemo(() => {
    const list = [...services];
    switch (sortKey) {
      case 'name-desc': return list.sort((a, b) => b.name.localeCompare(a.name));
      case 'price-asc': return list.sort((a, b) => priceCents(a) - priceCents(b));
      case 'price-desc': return list.sort((a, b) => priceCents(b) - priceCents(a));
      case 'time-asc': return list.sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
      case 'time-desc': return list.sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0));
      default: return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [services, sortKey]);

  const goBack = () => {
    const link = links['business_home'];
    if (link) navigateLink(router, link);
    else router.replace('/business/home' as any);
  };

  const onTab = (tab: ProviderTab) => {
    if (tab === 'services') return;
    const map: Record<ProviderTab, string> = {
      dashboard: 'business_home',
      bookings: 'bookings',
      services: 'services',
      messages: 'business_messages',
      profile: 'profile',
    };
    const link = links[map[tab]];
    if (link) navigateLink(router, link);
    else {
      const route: Record<ProviderTab, string> = {
        dashboard: '/business/home',
        bookings: '/business/bookings',
        services: '/business/services',
        messages: '/business/messages',
        profile: '/business/profile',
      };
      router.replace(route[tab] as any);
    }
  };

  const goAdd = () => {
    const link = links['add'];
    if (link) navigateLink(router, link);
    else router.push({ pathname: '/business/services/[id]', params: { id: 'new' } } as any);
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    if (!target) return;
    const delLink = target._links?.delete;
    if (!delLink) { setPendingDelete(null); return; }
    setBusyId(target.id);
    setError(null);
    const result = await dispatchLink(delLink);
    setBusyId(null);
    setPendingDelete(null);
    if (!result.ok) {
      setError('Could not delete that service.');
    } else {
      await load();
    }
  };

  const SortPicker = Platform.OS === 'web'
    ? React.createElement('select', {
        value: sortKey,
        onChange: (e: any) => setSortKey(e.target.value as SortKey),
        'aria-label': 'Sort services',
        style: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: 600,
          color: beautyTokens.text,
          background: '#FFFFFF',
          border: `1px solid ${beautyTokens.line}`,
          borderRadius: 8,
          padding: '5px 8px',
          cursor: 'pointer',
          minHeight: 32,
        },
      }, SORT_OPTIONS.map((o) => React.createElement('option', { key: o.key, value: o.key }, o.label)))
    : (
      <Pressable
        style={styles.sortFallback}
        onPress={() => setSortOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Sort services"
      >
        <Text style={styles.sortFallbackText}>{SORT_OPTIONS.find(o => o.key === sortKey)?.label}</Text>
        <Text style={styles.sortCaret}>▾</Text>
      </Pressable>
    );

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ProvSubHeader
        back="Dashboard"
        title="Services"
        onBackPress={goBack}
        right={
          <ProvBtn variant="success" size="sm" disabled={!links['add']} onPress={goAdd}>
            Add service
          </ProvBtn>
        }
      />

      {!env && !error ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={beautyTokens.accentBlueDeep} />
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={styles.centerCol}>
          <Pressable
            style={styles.hoursCard}
            onPress={() => {
              const link = links['hours'] || links['availability'];
              if (link) navigateLink(router, link);
              else router.push('/business/availability' as any);
            }}
            testID="weekly-hours-card"
          >
            <View style={styles.hoursIcon}>
              <Text style={styles.hoursIconGlyph}>🕑</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.hoursTitle}>Weekly hours</Text>
              <Text style={styles.hoursSub} numberOfLines={1}>Set the hours customers can book</Text>
            </View>
            <Text style={styles.hoursEdit}>EDIT →</Text>
          </Pressable>

          {services.length > 0 ? (
            <>
              <View style={styles.listHead}>
                <Text style={styles.countEyebrow}>
                  {services.length} {services.length === 1 ? 'SERVICE' : 'SERVICES'}
                </Text>
                <View style={styles.sortRow}>
                  <Text style={styles.sortEyebrow}>SORT:</Text>
                  {SortPicker}
                </View>
              </View>

              <ProvCard padding={0}>
                <View style={styles.cardInner}>
                  {sortedServices.map((s, idx) => (
                    <View key={s.id} style={[styles.svcRow, idx === sortedServices.length - 1 && styles.svcRowLast]}>
                      <View style={[styles.swatch, { backgroundColor: `${CATEGORY_HUE[s.category] || '#7A8B6E'}33` }]} />
                      <View style={styles.svcInfo}>
                        <Text style={styles.svcName} numberOfLines={1}>{s.name}</Text>
                        <View style={styles.svcMeta}>
                          <Text style={styles.catEyebrow}>{(s.category_label || '').toUpperCase()}</Text>
                          <Text style={styles.dot}>·</Text>
                          <Text style={styles.mono}>{s.duration_minutes} min(s)</Text>
                          <Text style={styles.dot}>·</Text>
                          <Text style={[styles.mono, styles.monoPrice]}>${formatPrice(s)}</Text>
                        </View>
                      </View>
                      <View style={styles.svcActions}>
                        <ProvBtn
                          variant="editDark"
                          size="sm"
                          onPress={() => {
                            const link = s._links?.['edit'];
                            if (link) navigateLink(router, link);
                            else router.push({ pathname: '/business/services/[id]', params: { id: String(s.id) } } as any);
                          }}
                        >
                          Edit
                        </ProvBtn>
                        <ProvBtn
                          variant="dangerOutline"
                          size="sm"
                          disabled={busyId === s.id}
                          onPress={() => { if (busyId == null) setPendingDelete(s); }}
                        >
                          Delete
                        </ProvBtn>
                      </View>
                    </View>
                  ))}
                </View>
              </ProvCard>

              <Text style={styles.listFoot}>Tap any service to edit. Customers see all services on your storefront.</Text>
            </>
          ) : (
            <ProvEmptyHint
              title="No services yet"
              body="Add your first service so customers can book. You can edit price, duration, and description anytime."
            >
              <ProvBtn variant="primary" disabled={!links['add']} onPress={goAdd}>
                Add your first service
              </ProvBtn>
            </ProvEmptyHint>
          )}

          {!!error && (
            <Text style={styles.serverError} accessibilityRole="alert">{error}</Text>
          )}
          </View>
        </ScrollView>
      )}

      <ProvTabBar
        active="services"
        badges={{ bookings: badges.bookings_unread, messages: badges.messages_unread }}
        onTabPress={onTab}
      />

      <Modal
        visible={sortOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setSortOpen(false)}>
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Sort services</Text>
            {SORT_OPTIONS.map((o) => {
              const active = o.key === sortKey;
              return (
                <Pressable
                  key={o.key}
                  style={[styles.sheetRow, active && styles.sheetRowActive]}
                  onPress={() => { setSortKey(o.key); setSortOpen(false); }}
                >
                  <Text style={[styles.sheetRowText, active && styles.sheetRowTextActive]}>{o.label}</Text>
                  {active ? <Text style={styles.sheetCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={!!pendingDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDelete(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete this service?</Text>
            {pendingDelete && (
              <Text style={styles.modalBody}>
                Removing '{pendingDelete.name}' won't refund existing bookings, but customers won't be able to book it going forward.
              </Text>
            )}
            <View style={styles.modalActions}>
              <View style={styles.modalActionWrap}>
                <ProvBtn
                  variant="secondary"
                  size="md"
                  full
                  disabled={busyId !== null}
                  onPress={() => setPendingDelete(null)}
                >
                  Keep service
                </ProvBtn>
              </View>
              <View style={styles.modalActionWrap}>
                <ProvBtn
                  variant="danger"
                  size="md"
                  full
                  disabled={busyId !== null}
                  onPress={confirmDelete}
                >
                  {busyId !== null ? 'Removing…' : 'Yes, delete'}
                </ProvBtn>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </BeautyShell>
  );
}

const styles = StyleSheet.create({
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, backgroundColor: beautyTokens.surface },
  bodyContent: { padding: 16, paddingTop: 14 },
  centerCol: { width: '100%', maxWidth: 480, alignSelf: 'center' },

  hoursCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 14,
  },
  hoursIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: beautyTokens.accentBlue,
    alignItems: 'center', justifyContent: 'center',
  },
  hoursIconGlyph: { fontSize: 16 },
  hoursTitle: { fontFamily: beautyTokens.fontBody, fontSize: 14, fontWeight: '700', color: beautyTokens.text },
  hoursSub: { fontFamily: beautyTokens.fontBody, fontSize: 12, color: beautyTokens.textMuted, marginTop: 1 },
  hoursEdit: { fontFamily: beautyTokens.fontBody, fontSize: 12, fontWeight: '700', color: beautyTokens.accentBlueDeep, letterSpacing: 0.4 },

  sortCaret: { fontSize: 10, color: beautyTokens.textMuted, marginLeft: 6 },

  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  countEyebrow: { fontSize: 11, fontWeight: '600', color: beautyTokens.textMuted, letterSpacing: 0.6, fontFamily: beautyTokens.fontBody },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortEyebrow: { fontSize: 11, fontWeight: '600', color: beautyTokens.textMuted, letterSpacing: 0.6, fontFamily: beautyTokens.fontBody },
  sortFallback: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, minHeight: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  sortFallbackText: { fontSize: 11, fontWeight: '600', color: beautyTokens.text, fontFamily: beautyTokens.fontBody },

  cardInner: { paddingHorizontal: 14 },
  svcRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: beautyTokens.line,
  },
  svcRowLast: { borderBottomWidth: 0 },
  swatch: {
    width: 44, height: 44, borderRadius: 10,
    borderWidth: 1, borderColor: beautyTokens.line,
  },
  svcInfo: { flex: 1, minWidth: 0 },
  svcName: { fontFamily: beautyTokens.fontDisplay, fontSize: 17, fontWeight: '500', color: beautyTokens.text, lineHeight: 20 },
  svcMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  catEyebrow: { fontSize: 9, fontWeight: '700', color: beautyTokens.accentBlueDeep, letterSpacing: 1.2, fontFamily: beautyTokens.fontBody },
  dot: { color: beautyTokens.line },
  mono: { fontFamily: 'Menlo', fontSize: 11, color: beautyTokens.textMuted },
  monoPrice: { fontWeight: '700', color: beautyTokens.text },
  svcActions: { flexDirection: 'row', gap: 6 },

  listFoot: {
    marginTop: 14,
    fontSize: 11, color: beautyTokens.textMuted,
    textAlign: 'center', fontFamily: beautyTokens.fontBody,
  },
  serverError: {
    color: beautyTokens.danger, paddingVertical: 12, fontSize: 13,
    fontFamily: beautyTokens.fontBody,
  },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(15, 17, 21, 0.55)',
    alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingVertical: 20, paddingHorizontal: 20,
    width: '100%', maxWidth: 380,
  },
  modalTitle: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 22, fontWeight: '500',
    color: beautyTokens.text, marginBottom: 8,
  },
  modalBody: {
    fontSize: 13, lineHeight: 19, color: beautyTokens.textMuted,
    fontFamily: beautyTokens.fontBody, marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 8 },
  modalActionWrap: { flex: 1 },

  sheetBackdrop: {
    flex: 1, backgroundColor: 'rgba(15, 17, 21, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingTop: 14, paddingBottom: 28, paddingHorizontal: 8,
  },
  sheetTitle: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 18, fontWeight: '500',
    color: beautyTokens.text, paddingHorizontal: 12, marginBottom: 6,
  },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 10,
  },
  sheetRowActive: { backgroundColor: beautyTokens.surface },
  sheetRowText: { fontFamily: beautyTokens.fontBody, fontSize: 14, color: beautyTokens.text },
  sheetRowTextActive: { fontWeight: '700' },
  sheetCheck: { fontSize: 14, color: beautyTokens.accentBlueDeep, fontWeight: '700' },
});
