import React, { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { H2, ScrollView, SizableText, XStack, YStack } from 'tamagui';

import {
  searchServices,
  type SearchServiceItem,
} from '@/services/marketplace';
import { ServiceCard } from '@/components/marketplace/ServiceCard';
import {
  BeautyButton,
  BeautyInput,
  EmptyState,
  LoadingScreen,
} from '@/components/ui';

const PAGE_SIZE = 20;

export default function SearchScreen() {
  const router = useRouter();
  const { q: initialQ, location: initialLoc } = useLocalSearchParams<{
    q?: string;
    location?: string;
  }>();
  const [q, setQ] = useState((initialQ as string) ?? '');
  const [location, setLocation] = useState((initialLoc as string) ?? '');
  const [items, setItems] = useState<SearchServiceItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (offset: number, reset: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchServices({
          q,
          location,
          offset,
          limit: PAGE_SIZE,
        });
        setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
        setNextOffset(data.next_offset);
      } catch (e: any) {
        setError(e?.response?.data?.detail ?? 'Search failed.');
      } finally {
        setLoading(false);
      }
    },
    [q, location],
  );

  useEffect(() => {
    runSearch(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => runSearch(0, true);
  const loadMore = () => {
    if (nextOffset != null && !loading) runSearch(nextOffset, false);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Search' }} />
      <ScrollView flex={1} bg="$background">
        <YStack p="$4" gap="$3">
          <H2>Find a service</H2>
          <BeautyInput
            testID="search-keyword-input"
            label="Keyword"
            value={q}
            onChangeText={setQ}
            placeholder="e.g. facial, massage"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={submit}
          />
          <BeautyInput
            testID="search-location-input"
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="City or postal code"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={submit}
          />
          <BeautyButton
            testID="search-submit"
            variant="confirm"
            fullWidth
            loading={loading && items.length === 0}
            onPress={submit}
          >
            Search
          </BeautyButton>

          {error ? (
            <SizableText color="$red10" testID="search-error">
              {error}
            </SizableText>
          ) : null}

          {loading && items.length === 0 && !error ? (
            <LoadingScreen inline message="Searching…" />
          ) : null}

          {items.length === 0 && !loading && !error ? (
            <EmptyState testID="search-empty" message="No results." />
          ) : null}

          <YStack gap="$3">
            {items.map((s) => (
              <ServiceCard
                key={s.id}
                testID={`search-result-${s.id}`}
                name={s.name}
                description={s.description}
                priceCents={s.price_cents}
                durationMinutes={s.duration_minutes}
                category={s.category}
                providerName={s.provider.name}
                locationLabel={s.provider.location_label}
                isFavorited={s.is_favorited}
                onPress={() =>
                  router.push({
                    pathname: '/(customer)/service/[id]',
                    params: { id: String(s.id) },
                  })
                }
              />
            ))}
          </YStack>

          {nextOffset != null ? (
            <BeautyButton
              testID="search-load-more"
              variant="outline"
              fullWidth
              loading={loading}
              onPress={loadMore}
            >
              Load more
            </BeautyButton>
          ) : items.length > 0 ? (
            <XStack justify="center" p="$2">
              <SizableText opacity={0.5}>End of results</SizableText>
            </XStack>
          ) : null}
        </YStack>
      </ScrollView>
    </>
  );
}
