import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { BottomNav } from '@/components/BottomNav';

interface CategoryService {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  duration_minutes: number;
  _links?: Record<string, BffLink | undefined>;
}

interface CategoryProvider {
  id: number;
  name: string;
  short_description: string;
  location_label: string;
  services: CategoryService[];
  _links?: Record<string, BffLink | undefined>;
}

interface CategoryData {
  category_slug: string;
  category_label: string;
  providers: CategoryProvider[];
  total_providers: number;
}

interface FlatService extends CategoryService {
  providerName: string;
  providerLink: BffLink | null;
}

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  facial: ['#B28A76', '#8E6753'],
  massage: ['#605048', '#3F352F'],
  nails: ['#C07B8A', '#8B5360'],
  hair: ['#5C4A3F', '#3D2F25'],
  default: ['#3A3A3A', '#2A2A2A'],
};

const C = {
  surface: '#F2F2F2',
  surface2: '#E9E9EB',
  line: '#DCDCDF',
  text: '#0F1115',
  textMuted: '#6B6F77',
  accentBlueDeep: '#7DA8CF',
  accentBlueText: '#1a3a52',
  ink: '#0A0A0B',
  success: '#2F7A47',
  white: '#FFFFFF',
};

const FONT_BODY = 'Inter_400Regular';
const FONT_BODY_SEMI = 'Inter_600SemiBold';
const FONT_DISPLAY = 'CormorantGaramond_500Medium';
const FONT_MONO = 'Menlo';

export default function CategoryScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const slug = (category ?? '').toLowerCase();

  const [env, setEnv] = useState<BffEnvelope<CategoryData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setEnv(null);
    resolve<CategoryData>('beauty_category', { slug })
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(customer)/home') as any);
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
  }, [slug]);

  const data = env?.action === 'render' ? env.data : null;
  const providers = data?.providers ?? [];
  const links = (env?._links ?? {}) as Record<string, BffLink | undefined>;
  const categoryLabel = data?.category_label ?? slug;

  const flatServices: FlatService[] = useMemo(() => {
    const out: FlatService[] = [];
    for (const p of providers) {
      const link = (p._links?.detail as BffLink) || null;
      for (const s of p.services || []) {
        out.push({ ...s, providerName: p.name, providerLink: link });
      }
    }
    return out;
  }, [providers]);

  const heroColors = CATEGORY_GRADIENTS[slug] ?? CATEGORY_GRADIENTS.default;

  const goto = (link: BffLink | null | undefined) => {
    if (link) navigateLink(router, link);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: categoryLabel }} />
      <View style={styles.app}>
        {/* sub-header */}
        <View style={styles.subHeader}>
          <Pressable
            accessibilityLabel="Back"
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            onPress={() => goto(links.back || links.home)}
          >
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <View style={{ flex: 1 }} />
          {/* Favoriting lives on the individual service (provider page / search
              card), not the whole category — the category-level heart was a
              no-op, so it's removed. */}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {/* hero cover */}
          <View style={styles.hero}>
            <LinearGradient
              colors={heroColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
              locations={[0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTag}>
              <Text style={styles.heroTagText}>img · {slug}</Text>
            </View>
            <View style={styles.heroOverlay}>
              <Text style={styles.heroCategoryLabel}>Category</Text>
              <Text style={styles.heroTitle}>{categoryLabel}</Text>
            </View>
          </View>

          <View style={styles.body}>
            {error ? (
              <Text style={styles.errorText} testID="category-error">{error}</Text>
            ) : null}

            {!env && !error ? (
              <Text style={styles.muted}>Loading…</Text>
            ) : null}

            {env?.action === 'render' ? (
              <>
                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons name="location-outline" size={11} color={C.accentBlueDeep} />
                    <Text style={styles.metaPillText}>
                      {providers.length} provider{providers.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <View style={styles.metaPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.metaPillText}>
                      {flatServices.length} service{flatServices.length === 1 ? '' : 's'} available
                    </Text>
                  </View>
                </View>

                <Text style={styles.description}>
                  Curated {categoryLabel.toLowerCase()} bookings near you.
                  Tap a service to pick a time — or open a provider for the full menu.
                </Text>

                <View style={styles.servicesHead}>
                  <Text style={styles.servicesTitle}>Services</Text>
                  <Text style={styles.servicesCount}>{flatServices.length} available</Text>
                </View>

                {flatServices.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardText}>No providers in this category yet.</Text>
                  </View>
                ) : (
                  <View style={styles.serviceCard}>
                    {flatServices.map((s, idx) => {
                      const last = idx === flatServices.length - 1;
                      return (
                        <View
                          key={s.id}
                          style={[styles.serviceRow, last && styles.serviceRowLast]}
                          testID={`category-service-${s.id}`}
                        >
                          <View style={styles.serviceInfo}>
                            <Text style={styles.serviceName} numberOfLines={1}>{s.name}</Text>
                            <Pressable
                              onPress={() => goto(s.providerLink)}
                              disabled={!s.providerLink}
                            >
                              <Text style={styles.serviceCat}>{s.providerName}</Text>
                            </Pressable>
                            <View style={styles.serviceMeta}>
                              <Text style={styles.serviceMetaText}>{s.duration_minutes} min</Text>
                              <Text style={styles.serviceMetaDot}>·</Text>
                              <Text style={styles.servicePrice}>
                                ${(s.price_cents / 100).toFixed(0)}
                              </Text>
                            </View>
                            {s.description ? (
                              <Text style={styles.serviceDesc} numberOfLines={2}>
                                {s.description}
                              </Text>
                            ) : null}
                          </View>
                          <Pressable
                            onPress={() => goto(s._links?.book)}
                            disabled={!s._links?.book}
                            style={({ pressed }) => [
                              styles.btnBook,
                              !s._links?.book && styles.btnBookDisabled,
                              pressed && styles.btnBookPressed,
                            ]}
                          >
                            <Text style={styles.btnBookText}>Book</Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            ) : null}
          </View>
        </ScrollView>

        {/* Shared 4-tab nav (Bookings · Home · Chat · Profile) — keeps the
            chat tab consistent with the rest of the customer app. */}
        <BottomNav active="home" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.surface },

  subHeader: {
    height: 56,
    paddingHorizontal: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnPressed: { backgroundColor: C.surface2 },

  scrollContent: { flexGrow: 1 },

  hero: {
    height: 168,
    position: 'relative',
    overflow: 'hidden',
  },
  heroTag: {
    position: 'absolute', right: 12, top: 12, zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4,
  },
  heroTagText: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontFamily: FONT_MONO },
  heroOverlay: {
    position: 'absolute', left: 16, right: 16, bottom: 14, zIndex: 2,
  },
  heroCategoryLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10, fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: FONT_BODY_SEMI,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontFamily: FONT_DISPLAY,
    letterSpacing: 0.2,
    lineHeight: 31,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  body: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },

  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, backgroundColor: C.white,
    borderWidth: 1, borderColor: C.line,
  },
  metaPillText: { fontSize: 11, color: C.text, fontFamily: FONT_BODY_SEMI },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.success },

  description: { fontSize: 13, lineHeight: 20, color: C.text, opacity: 0.85, marginBottom: 18, fontFamily: FONT_BODY },

  servicesHead: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    marginBottom: 4,
  },
  servicesTitle: { fontFamily: FONT_DISPLAY, fontSize: 22, color: C.text, letterSpacing: 0.2 },
  servicesCount: { fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted },

  serviceCard: {
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 10, marginBottom: 16,
  },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  serviceRowLast: { borderBottomWidth: 0 },
  serviceInfo: { flex: 1, minWidth: 0 },
  serviceName: {
    fontFamily: FONT_DISPLAY, fontSize: 19,
    color: C.text, letterSpacing: 0.2, lineHeight: 24,
    marginBottom: 2,
  },
  serviceCat: {
    fontSize: 10, fontFamily: FONT_BODY_SEMI, color: C.accentBlueText,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 4,
  },
  serviceMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  serviceMetaText: { fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted },
  serviceMetaDot: { fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted, opacity: 0.5, marginHorizontal: 6 },
  servicePrice: { fontFamily: FONT_MONO, fontSize: 11, color: C.text, fontWeight: '600' },
  serviceDesc: { fontSize: 12, color: C.textMuted, lineHeight: 17, fontFamily: FONT_BODY },

  btnBook: {
    height: 38, paddingHorizontal: 18, borderRadius: 10,
    backgroundColor: C.ink, borderWidth: 1, borderColor: C.ink,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  btnBookPressed: { backgroundColor: '#1F1F22', borderColor: '#1F1F22' },
  btnBookDisabled: { opacity: 0.5 },
  btnBookText: { color: '#fff', fontSize: 12, letterSpacing: 0.2, fontFamily: FONT_BODY_SEMI },

  emptyCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 14, padding: 16, paddingVertical: 24,
    marginTop: 10, alignItems: 'center',
  },
  emptyCardText: { color: C.textMuted, fontSize: 13, fontFamily: FONT_BODY },

  errorText: { color: C.success, fontSize: 13, marginBottom: 12 },
  muted: { color: C.textMuted, fontSize: 13, padding: 8 },
});
