/**
 * Customer favorites list — RN port of Angular `beauty-favorites.component.ts`.
 * GET /api/beauty/protected/favorites/, DELETE /protected/services/<id>/favorite/.
 * Direct REST (no BFF resolver), same as the Angular shell.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Pressable } from 'react-native';
import { H2, H4, Paragraph, ScrollView, SizableText, XStack, YStack } from 'tamagui';

import { beautyTokens } from '../../tamagui.config';
import { BeautyShell } from '@/components/BeautyShell';
import {
  BeautyCard,
  EmptyState,
  LoadingScreen,
  Toast,
} from '@/components/ui';
import {
  formatDuration,
  formatPrice,
  listFavorites,
  unfavoriteService,
  type FavoriteRow,
} from '@/services/marketplace';

export default function FavoritesScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listFavorites();
      setRows(data.items ?? []);
    } catch (e: any) {
      const status = e?.response?.status;
      setError(
        status === 403
          ? 'Sign in as a customer to view your saved services.'
          : 'Could not load saved services.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (row: FavoriteRow) => {
    const before = rows;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    try {
      await unfavoriteService(row.service.id);
    } catch {
      setRows(before);
      setError('Could not remove favorite.');
    }
  };

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: true, title: 'Saved' }} />
      <ScrollView flex={1} bg={beautyTokens.surface}>
        <YStack p="$4" gap="$3">
          <H2 fontFamily="$heading" testID="favorites-title">
            Saved
          </H2>

          {loading ? <LoadingScreen inline message="Loading saved…" /> : null}

          {!loading && rows.length === 0 ? (
            <EmptyState
              testID="favorites-empty"
              message="No saved services yet."
            />
          ) : null}

          {!loading
            ? rows.map((r) => (
                <BeautyCard
                  key={r.id}
                  testID={`favorites-card-${r.id}`}
                  onPress={() =>
                    router.push({
                      pathname: '/(customer)/provider/[id]',
                      params: { id: String(r.provider.id) },
                    })
                  }
                  gap="$2"
                >
                  <XStack justify="space-between" items="flex-start" gap="$2">
                    <YStack flex={1} gap="$1">
                      <H4>{r.service.name}</H4>
                      <SizableText
                        fontSize={11}
                        fontWeight="600"
                        color={beautyTokens.accentBlueText}
                        letterSpacing={1.2}
                        textTransform="uppercase"
                      >
                        {r.provider.name}
                      </SizableText>
                      <SizableText
                        fontSize={11}
                        color={beautyTokens.textMuted}
                      >
                        {formatDuration(r.service.duration_minutes)} ·{' '}
                        {formatPrice(r.service.price_cents)}
                      </SizableText>
                      {r.service.description ? (
                        <Paragraph
                          opacity={0.7}
                          numberOfLines={2}
                          fontSize={12}
                        >
                          {r.service.description}
                        </Paragraph>
                      ) : null}
                    </YStack>
                    <Pressable
                      onPress={() => remove(r)}
                      accessibilityLabel="Remove from saved"
                      accessibilityRole="button"
                      testID={`favorites-remove-${r.id}`}
                      hitSlop={8}
                    >
                      <SizableText
                        fontSize={20}
                        color={beautyTokens.accentBlueDeep}
                      >
                        ♥
                      </SizableText>
                    </Pressable>
                  </XStack>
                </BeautyCard>
              ))
            : null}
        </YStack>
      </ScrollView>
      <Toast
        visible={Boolean(error)}
        tone="danger"
        title="Saved"
        message={error ?? ''}
        onDismiss={() => setError(null)}
      />
    </BeautyShell>
  );
}
