import React from 'react';
import { H4, Paragraph, SizableText, XStack, YStack } from 'tamagui';

import { formatDuration, formatPrice } from '@/services/marketplace';
import { BeautyCard } from '@/components/ui';

export interface ServiceCardProps {
  name: string;
  description?: string;
  priceCents: number;
  durationMinutes: number;
  category?: string;
  providerName?: string;
  locationLabel?: string;
  isFavorited?: boolean;
  onPress: () => void;
  testID?: string;
}

export function ServiceCard(props: ServiceCardProps) {
  return (
    <BeautyCard onPress={props.onPress} testID={props.testID ?? 'service-card'} gap="$2">
      <XStack justify="space-between" items="flex-start" gap="$2">
        <YStack flex={1} gap="$1">
          <H4>{props.name}</H4>
          {props.providerName ? (
            <SizableText opacity={0.7}>{props.providerName}</SizableText>
          ) : null}
        </YStack>
        {props.isFavorited ? <SizableText>★</SizableText> : null}
      </XStack>
      {props.description ? (
        <Paragraph opacity={0.8} numberOfLines={2}>
          {props.description}
        </Paragraph>
      ) : null}
      <XStack justify="space-between" items="center" gap="$2">
        <SizableText fontWeight="700">{formatPrice(props.priceCents)}</SizableText>
        <SizableText opacity={0.7}>
          {formatDuration(props.durationMinutes)}
          {props.category ? ` · ${props.category}` : ''}
          {props.locationLabel ? ` · ${props.locationLabel}` : ''}
        </SizableText>
      </XStack>
    </BeautyCard>
  );
}
