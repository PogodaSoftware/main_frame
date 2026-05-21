/**
 * Customer search screen — mirrors Angular `BeautySearchComponent`:
 *  - Debounced query (300ms, distinct).
 *  - Auto-load on mount with paged results (`PAGE_SIZE = 20`).
 *  - Location pill auto-applies stored `beauty_customer_city`.
 *  - Status line announces "N results found" / "Loading…".
 *  - 429 → rate-limit toast (3s auto-dismiss).
 *  - Generic error → error toast.
 *  - Infinite scroll via FlatList onEndReached when `hasMore`.
 *  - Card tap → `/(customer)/provider/[id]` (Angular routes to `/providers/:id`).
 *  - Heart toggles favorite, optimistic with rollback.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  favoriteService,
  searchServices,
  unfavoriteService,
  type SearchServiceItem,
} from '@/services/marketplace';

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;
const LOCATION_KEY = 'beauty_customer_city';

async function readStoredCity(): Promise<string> {
  if (Platform.OS === 'web') {
    try {
      return (window?.localStorage?.getItem(LOCATION_KEY) || '').trim();
    } catch {
      return '';
    }
  }
  try {
    const SecureStore = await import('expo-secure-store');
    const v = await SecureStore.getItemAsync(LOCATION_KEY);
    return (v || '').trim();
  } catch {
    return '';
  }
}

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
  warn: '#C97B1A',
  warnBg: '#FFF4E5',
  warnBorder: '#F5D6A4',
  errorBg: '#FCE8E6',
  errorBorder: '#F4C7C3',
  error: '#B3261E',
  futureBg: '#E5F4EA',
  futureBorder: '#B5DCC2',
};

const FONT_BODY = 'Inter_400Regular';
const FONT_BODY_SEMI = 'Inter_600SemiBold';
const FONT_DISPLAY = 'CormorantGaramond_500Medium';
const FONT_MONO = 'Menlo';

export default function SearchScreen() {
  const router = useRouter();
  const { q: initialQ } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState((initialQ as string) ?? '');
  const [location, setLocation] = useState('');
  const [items, setItems] = useState<SearchServiceItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>((initialQ as string) ?? '');
  const rateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = async (q: string, offset: number, reset: boolean) => {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const resp = await searchServices({
        q,
        location: location || undefined,
        offset,
        limit: PAGE_SIZE,
        includeFuture: true,
      });
      setItems((prev) => (reset ? resp.items || [] : prev.concat(resp.items || [])));
      setNextOffset(resp.next_offset);
      setHasMore(!!resp.has_more);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        setRateLimited(true);
        if (rateTimerRef.current) clearTimeout(rateTimerRef.current);
        rateTimerRef.current = setTimeout(() => setRateLimited(false), 3000);
      } else {
        setErrorMessage('Something went wrong, please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    readStoredCity()
      .then((city) => {
        if (cancelled) return;
        setLocation(city);
      })
      .finally(() => {
        if (cancelled) return;
        runSearch(lastQueryRef.current, 0, true);
      });
    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (rateTimerRef.current) clearTimeout(rateTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeQuery = (v: string) => {
    setQuery(v);
    const trimmed = (v || '').trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (trimmed === lastQueryRef.current) return;
      lastQueryRef.current = trimmed;
      runSearch(trimmed, 0, true);
    }, DEBOUNCE_MS);
  };

  const loadMore = () => {
    if (nextOffset == null || loading) return;
    runSearch(lastQueryRef.current, nextOffset, false);
  };

  const openProvider = (s: SearchServiceItem) => {
    if (!s?.provider?.id) return;
    router.push(`/(customer)/provider/${s.provider.id}` as any);
  };

  const toggleFavorite = async (s: SearchServiceItem) => {
    if (!s?.id) return;
    const wasOn = !!s.is_favorited;
    setItems((arr) => arr.map((x) => (x.id === s.id ? { ...x, is_favorited: !wasOn } : x)));
    try {
      if (wasOn) await unfavoriteService(s.id);
      else await favoriteService(s.id);
    } catch {
      setItems((arr) => arr.map((x) => (x.id === s.id ? { ...x, is_favorited: wasOn } : x)));
    }
  };

  const totalLoaded = items.length;
  const showEmpty = !loading && !errorMessage && items.length === 0;

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.subHeader}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </Pressable>
        <Text style={styles.subHeaderTitle}>Search</Text>
        <View style={{ flex: 1 }} />
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search services"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search services"
          testID="search-input"
        />
        {location ? (
          <View style={styles.locationPill} testID="search-location">
            <Ionicons name="location-outline" size={11} color={C.accentBlueDeep} />
            <Text style={styles.locationPillText}>{location}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.status} accessibilityLiveRegion="polite" testID="search-status">
        {loading ? 'Loading…' : rateLimited ? '' : `${totalLoaded} result${totalLoaded === 1 ? '' : 's'} found`}
      </Text>

      {rateLimited ? (
        <View style={[styles.toast, styles.toastRate]} testID="search-rate-toast">
          <Text style={styles.toastTextRate}>Please slow down</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={[styles.toast, styles.toastError]} testID="search-error-toast">
          <Text style={styles.toastTextError}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.4}
        onEndReached={hasMore ? loadMore : undefined}
        renderItem={({ item }) => (
          <View style={styles.card} testID="search-result-card">
            <Pressable
              style={styles.cardBtn}
              onPress={() => openProvider(item)}
              accessibilityRole="button"
            >
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.cardProvider} numberOfLines={1}>{item.provider.name}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardMetaText}>{item.duration_minutes} min</Text>
                <Text style={styles.cardMetaDot}>·</Text>
                <Text style={styles.cardPrice}>${(item.price_cents / 100).toFixed(0)}</Text>
              </View>
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              {item.is_future ? (
                <View style={styles.futureBadge} testID="search-future-badge">
                  <Text style={styles.futureBadgeText}>Coming Soon</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              style={styles.favBtn}
              onPress={() => toggleFavorite(item)}
              accessibilityLabel={item.is_favorited ? 'Unfavorite' : 'Favorite'}
              testID="search-favorite-toggle"
            >
              <Ionicons
                name={item.is_favorited ? 'heart' : 'heart-outline'}
                size={20}
                color={C.accentBlueDeep}
              />
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          !hasMore && items.length > 0 ? (
            <Text style={styles.endMarker} testID="search-end-marker">No more results</Text>
          ) : null
        }
        ListEmptyComponent={
          showEmpty ? (
            <Text style={styles.empty} testID="search-empty">No services match your search.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.surface },

  subHeader: {
    height: 56, paddingHorizontal: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.line,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnPressed: { backgroundColor: C.surface2 },
  subHeaderTitle: { fontFamily: FONT_DISPLAY, fontSize: 20, color: C.text, marginLeft: 4 },

  searchBar: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1, minWidth: 220, height: 44,
    borderWidth: 1, borderColor: C.line, borderRadius: 12,
    paddingHorizontal: 14, backgroundColor: C.white,
    color: C.text, fontSize: 15, fontFamily: FONT_BODY,
  },
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
  },
  locationPillText: { fontSize: 11, color: C.text, fontFamily: FONT_BODY_SEMI },

  status: {
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12,
    fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted,
  },

  toast: { marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  toastRate: { backgroundColor: C.warnBg, borderColor: C.warnBorder },
  toastTextRate: { color: C.warn, fontSize: 13, fontFamily: FONT_BODY },
  toastError: { backgroundColor: C.errorBg, borderColor: C.errorBorder },
  toastTextError: { color: C.error, fontSize: 13, fontFamily: FONT_BODY },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 14, marginBottom: 12,
    flexDirection: 'row', alignItems: 'stretch',
  },
  cardBtn: { flex: 1, padding: 14, minWidth: 0 },
  favBtn: {
    width: 48, borderLeftWidth: 1, borderLeftColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: {
    fontFamily: FONT_DISPLAY, fontSize: 19, lineHeight: 24,
    color: C.text, letterSpacing: 0.2, marginBottom: 2,
  },
  cardProvider: {
    fontSize: 10, fontFamily: FONT_BODY_SEMI, color: C.accentBlueText,
    letterSpacing: 1.2, marginBottom: 4, textTransform: 'uppercase',
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardMetaText: { fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted },
  cardMetaDot: { fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted, opacity: 0.5, marginHorizontal: 6 },
  cardPrice: { fontFamily: FONT_BODY_SEMI, fontSize: 11, color: C.text },
  cardDesc: { fontSize: 12, color: C.textMuted, lineHeight: 17, fontFamily: FONT_BODY },

  futureBadge: {
    alignSelf: 'flex-start',
    marginTop: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: C.futureBg, borderWidth: 1, borderColor: C.futureBorder,
  },
  futureBadgeText: {
    fontSize: 10, color: C.success, fontFamily: FONT_BODY_SEMI,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },

  empty: {
    textAlign: 'center', paddingVertical: 24, paddingHorizontal: 16,
    color: C.textMuted, fontSize: 13, fontFamily: FONT_BODY,
  },
  endMarker: {
    textAlign: 'center', paddingVertical: 24,
    color: C.textMuted, fontSize: 13, fontFamily: FONT_BODY,
  },
});
