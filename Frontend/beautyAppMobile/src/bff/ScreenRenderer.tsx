import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Paragraph, Spinner, YStack } from 'tamagui';

import { resolve } from '@/services/bff';
import type { BffEnvelope } from '@/bff/types';
import { isRedirect } from '@/bff/types';
import { FormRenderer } from '@/bff/FormRenderer';
import { navigateToScreen } from '@/bff/linkAction';

export interface ScreenRendererProps {
  screen: string;
  payload?: Record<string, unknown>;
  onSuccess?: (response: unknown, envelope: BffEnvelope) => void;
}

export function ScreenRenderer({ screen, payload, onSuccess }: ScreenRendererProps) {
  const router = useRouter();
  const [envelope, setEnvelope] = useState<BffEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Snapshot the payload so the resolve effect only fires on `screen`
  // change, not on every re-render where `payload` is a fresh object
  // literal. The old `[screen, JSON.stringify(payload)]` dep tripped a
  // tight loop with React 18 dev double-mount + Fast Refresh and the
  // BFF rate limiter started returning 429 on web.
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setEnvelope(null);
    resolve(screen, payloadRef.current)
      .then((env) => {
        if (cancelled) return;
        if (isRedirect(env)) {
          navigateToScreen(router, env.redirect_to);
          return;
        }
        setEnvelope(env);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? 'Failed to load screen');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  if (error) {
    return (
      <YStack p="$4">
        <Paragraph color="$red10">{error}</Paragraph>
      </YStack>
    );
  }

  if (!envelope) {
    return (
      <YStack p="$4" items="center" justify="center" flex={1}>
        <Spinner />
      </YStack>
    );
  }

  if (envelope.action === 'render' && envelope.form) {
    return (
      <FormRenderer
        form={envelope.form}
        onSuccess={(response) => {
          onSuccess?.(response, envelope);
          if (envelope.form?.success?.screen) {
            navigateToScreen(router, envelope.form.success.screen);
          }
        }}
      />
    );
  }

  return (
    <YStack p="$4">
      <Paragraph>Screen {envelope.action === 'render' ? envelope.screen : envelope.redirect_to} loaded.</Paragraph>
    </YStack>
  );
}
