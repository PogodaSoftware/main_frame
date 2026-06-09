/**
 * Customer favorites — mirrors Angular `BeautyFavoritesComponent`:
 *  - Sub-header with back + "Saved" serif title.
 *  - GET /api/beauty/protected/favorites/.
 *  - Empty: white dashed card "No saved services yet.".
 *  - Loading: dashed "Loading…" card.
 *  - Compact result cards (serif name, caps blue provider, mono duration·price, desc, filled heart).
 *  - Heart removes via DELETE /protected/services/<id>/favorite/ (optimistic + rollback on error).
 *  - Card tap → /(customer)/provider/[id] (mirrors Angular `/providers/:id`).
 *  - 403 → "Sign in as a customer…" error toast.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { type FavoriteRow } from '@/services/marketplace';
import { api } from '@/services/api';
import { resolve } from '@/services/bff';
import { isRedirect, type BffLink } from '@/bff/types';

interface FavRow extends FavoriteRow {
  _links?: { unfavorite?: BffLink };
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
  white: '#FFFFFF',
  errorBg: '#FCE8E6',
  errorBorder: '#F4C7C3',
  error: '#B3261E',
};

const FONT_BODY = 'Inter_400Regular';
const FONT_BODY_SEMI = 'Inter_600SemiBold';
const FONT_DISPLAY = 'CormorantGaramond_500Medium';
const FONT_MONO = 'Menlo';

export default function FavoritesScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<FavRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = async () => {
    setErrorMessage(null);
    try {
      const e = await resolve<{ items: FavRow[] }>('beauty_favorites');
      if (isRedirect(e)) {
        setErrorMessage('Sign in as a customer to view your saved services.');
        return;
      }
      if (e.action === 'render') setRows(e.data?.items ?? []);
    } catch {
      setErrorMessage('Could not load saved services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (row: FavRow) => {
    const href = row._links?.unfavorite?.href;
    if (!href) return;
    const before = rows;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    try {
      // HATEOAS unfavorite action-link from the resolver row.
      await api.delete(href);
    } catch {
      setRows(before);
      setErrorMessage('Could not remove favorite.');
    }
  };

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
        <Text style={styles.subHeaderTitle}>Saved</Text>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.statusCard} testID="favorites-loading">
            <Text style={styles.statusText}>Loading…</Text>
          </View>
        ) : null}

        {!loading && rows.length === 0 ? (
          <View style={styles.statusCard} testID="favorites-empty">
            <Text style={styles.statusText}>No saved services yet.</Text>
          </View>
        ) : null}

        {!loading && rows.length ? (
          <View style={styles.results}>
            {rows.map((r) => (
              <View key={r.id} style={styles.card} testID={`favorites-card-${r.id}`}>
                <Pressable
                  style={styles.cardBtn}
                  onPress={() =>
                    router.push(`/(customer)/provider/${r.provider.id}` as any)
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.cardName} numberOfLines={1}>{r.service.name}</Text>
                  <Text style={styles.cardProvider} numberOfLines={1}>{r.provider.name}</Text>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardMetaText}>{r.service.duration_minutes} min</Text>
                    <Text style={styles.cardMetaDot}>·</Text>
                    <Text style={styles.cardPrice}>${(r.service.price_cents / 100).toFixed(0)}</Text>
                  </View>
                  {r.service.description ? (
                    <Text style={styles.cardDesc} numberOfLines={2}>{r.service.description}</Text>
                  ) : null}
                </Pressable>
                <Pressable
                  style={styles.favBtn}
                  onPress={() => remove(r)}
                  accessibilityLabel="Remove from saved"
                  testID={`favorites-remove-${r.id}`}
                >
                  <Ionicons name="heart" size={20} color={C.accentBlueDeep} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorToast} testID="favorites-error">
            <Text style={styles.errorToastText}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
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

  statusCard: {
    margin: 16, marginTop: 24, padding: 18,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 12, borderStyle: 'dashed',
    alignItems: 'center',
  },
  statusText: { color: C.textMuted, fontSize: 13, fontFamily: FONT_BODY },

  results: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 10 },

  card: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 14,
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

  errorToast: {
    marginHorizontal: 16, marginVertical: 12,
    padding: 12, borderRadius: 10,
    backgroundColor: C.errorBg, borderWidth: 1, borderColor: C.errorBorder,
  },
  errorToastText: { color: C.error, fontSize: 13, fontFamily: FONT_BODY },
});
