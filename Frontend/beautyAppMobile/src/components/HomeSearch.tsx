/**
 * HomeSearch — mobile search bar that lives above the home carousel.
 * Mirrors Angular `BeautyHomeSearchComponent`:
 *   - 300ms debounce, distinct queries.
 *   - GET /api/beauty/services/search/?q&location&offset=0&limit=20&includeFuture=true
 *   - Status line announces "N results found" / "Searching…".
 *   - 429 → rate-limit toast (auto-dismiss 3s).
 *   - Other errors → generic toast.
 *   - Click result → /(customer)/book/[serviceId].
 *   - Heart toggles favorite (POST/DELETE /api/beauty/protected/services/:id/favorite/).
 *   - Reads stored customer city from AsyncStorage `beauty_customer_city`.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  favoriteService,
  searchServices,
  unfavoriteService,
  type SearchServiceItem,
} from '@/services/marketplace';

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

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

const C = {
  surface: '#F2F2F2',
  line: '#DCDCDF',
  text: '#0F1115',
  textMuted: '#6B6F77',
  accentBlueDeep: '#7DA8CF',
  accentBlueText: '#1a3a52',
  white: '#FFFFFF',
  warn: '#C97B1A',
  warnBg: '#FFF4E5',
  warnBorder: '#F5D6A4',
  errorBg: '#FCE8E6',
  errorBorder: '#F4C7C3',
  error: '#B3261E',
};
const FONT_BODY = 'Inter_400Regular';
const FONT_BODY_SEMI = 'Inter_600SemiBold';
const FONT_DISPLAY = 'CormorantGaramond_500Medium';
const FONT_MONO = 'Menlo';

export function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<string>('');

  const hasQuery = useMemo(() => query.trim().length > 0, [query]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>('');
  const rateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    readStoredCity().then(setLocation).catch(() => {});
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (rateTimerRef.current) clearTimeout(rateTimerRef.current);
    };
  }, []);

  const runSearch = async (q: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const resp = await searchServices({
        q,
        location: location || undefined,
        offset: 0,
        limit: PAGE_SIZE,
        includeFuture: true,
      });
      setResults(resp.items || []);
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

  const onChangeQuery = (v: string) => {
    setQuery(v);
    const trimmed = (v || '').trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (trimmed === lastQueryRef.current) return;
      lastQueryRef.current = trimmed;
      if (trimmed.length === 0) {
        setResults([]);
        setErrorMessage(null);
        return;
      }
      runSearch(trimmed);
    }, DEBOUNCE_MS);
  };

  const openService = (s: SearchServiceItem) => {
    if (!s?.id) return;
    router.push(`/(customer)/book/${s.id}` as any);
  };

  const toggleFavorite = async (s: SearchServiceItem) => {
    if (!s?.id) return;
    const wasOn = !!s.is_favorited;
    setResults((arr) => arr.map((x) => (x.id === s.id ? { ...x, is_favorited: !wasOn } : x)));
    try {
      if (wasOn) await unfavoriteService(s.id);
      else await favoriteService(s.id);
    } catch {
      setResults((arr) => arr.map((x) => (x.id === s.id ? { ...x, is_favorited: wasOn } : x)));
    }
  };

  return (
    <View style={styles.wrap} testID="home-search">
      <View style={styles.box}>
        <Ionicons name="search" size={18} color={C.textMuted} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search services..."
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search services"
          testID="home-search-input"
        />
      </View>

      {hasQuery ? (
        <Text style={styles.status} accessibilityLiveRegion="polite" testID="home-search-status">
          {loading
            ? 'Searching…'
            : rateLimited
              ? ''
              : `${results.length} result${results.length === 1 ? '' : 's'} found`}
        </Text>
      ) : null}

      {rateLimited ? (
        <View style={[styles.toast, styles.toastRate]} testID="home-search-rate-toast">
          <Text style={styles.toastTextRate}>Please slow down</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={[styles.toast, styles.toastError]} testID="home-search-error-toast">
          <Text style={styles.toastTextError}>{errorMessage}</Text>
        </View>
      ) : null}

      {hasQuery && results.length ? (
        <View style={styles.results} testID="home-search-results">
          {results.map((s) => (
            <View key={s.id} style={styles.card} testID="search-result-card">
              <Pressable
                style={styles.cardBtn}
                onPress={() => openService(s)}
                accessibilityRole="button"
              >
                <Text style={styles.cardName} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.cardProvider} numberOfLines={1}>{s.provider.name}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardMetaText}>{s.duration_minutes} min</Text>
                  <Text style={styles.cardMetaDot}>·</Text>
                  <Text style={styles.cardPrice}>${(s.price_cents / 100).toFixed(0)}</Text>
                  {s.is_future ? (
                    <View style={styles.futureBadge} testID="home-search-future-badge">
                      <Text style={styles.futureBadgeText}>Coming Soon</Text>
                    </View>
                  ) : null}
                </View>
                {s.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>{s.description}</Text>
                ) : null}
              </Pressable>
              <Pressable
                style={styles.favBtn}
                onPress={() => toggleFavorite(s)}
                accessibilityLabel={s.is_favorited ? 'Unfavorite' : 'Favorite'}
                testID="home-search-favorite-toggle"
              >
                <Ionicons
                  name={s.is_favorited ? 'heart' : 'heart-outline'}
                  size={18}
                  color={C.accentBlueDeep}
                />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {hasQuery && !loading && !errorMessage && !results.length && !rateLimited ? (
        <View style={styles.empty} testID="home-search-empty">
          <Text style={styles.emptyText}>No services match.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, backgroundColor: C.surface },
  box: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 12, paddingHorizontal: 12, height: 44,
  },
  input: {
    flex: 1, height: '100%', fontSize: 15, color: C.text,
    fontFamily: FONT_BODY, paddingVertical: 0,
  },

  status: { marginTop: 8, fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted },

  toast: { marginTop: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  toastRate: { backgroundColor: C.warnBg, borderColor: C.warnBorder },
  toastTextRate: { color: C.warn, fontSize: 13, fontFamily: FONT_BODY },
  toastError: { backgroundColor: C.errorBg, borderColor: C.errorBorder },
  toastTextError: { color: C.error, fontSize: 13, fontFamily: FONT_BODY },

  results: { marginTop: 12 },
  card: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'stretch',
  },
  cardBtn: { flex: 1, padding: 14, minWidth: 0 },
  favBtn: {
    width: 44, borderLeftWidth: 1, borderLeftColor: C.line,
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
    marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 999, backgroundColor: C.warnBg, borderWidth: 1, borderColor: C.warnBorder,
  },
  futureBadgeText: {
    fontSize: 10, color: C.warn, fontFamily: FONT_BODY_SEMI,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },

  empty: {
    marginTop: 12, padding: 16, backgroundColor: C.white,
    borderWidth: 1, borderColor: C.line, borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: { color: C.textMuted, fontSize: 13, fontFamily: FONT_BODY },
});
