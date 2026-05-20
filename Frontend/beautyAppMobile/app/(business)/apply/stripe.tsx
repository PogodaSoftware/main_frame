/**
 * Apply wizard step 3 — Stripe Connect stand-in.
 * BFF: `beauty_business_application_stripe`. No real gateway call;
 * PATCH submit_href with `{ step: 'stripe' }` to mark the step complete
 * and continue. Real Stripe Connect onboarding will replace this stub.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Paragraph, SizableText, XStack, YStack } from 'tamagui';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { beautyTokens } from '../../../tamagui.config';
import { BeautyCard, InfoStrip } from '@/components/ui';
import { WizardLayout, type WizardData } from '@/components/business/WizardLayout';
import { patchApplicationStep } from '@/services/businessApply';

interface StripeData extends WizardData {
  submit_href: string;
  stripe_copy: string;
}

export default function ApplyStripeScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<StripeData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEnv(null);
    setError(null);
    resolve<StripeData>('beauty_business_application_stripe', {})
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(business)/apply/services') as any);
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
  }, []);

  const onContinue = useCallback(async () => {
    if (!env || env.action !== 'render' || !env.data) return;
    setSubmitting(true);
    setError(null);
    try {
      await patchApplicationStep(env.data.submit_href, 'stripe', {});
      navigateLink(router, env._links?.next, { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not save this step.');
    } finally {
      setSubmitting(false);
    }
  }, [env, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WizardLayout
        envelope={env}
        subtitle="Connect a payout account so customers can pay through the app."
        onContinue={onContinue}
        continueLabel="Mark complete & continue"
        continueLoading={submitting}
        error={error}
      >
        <BeautyCard testID="stripe-card" gap={12}>
          <XStack gap={12} items="center">
            <YStack
              width={48}
              height={48}
              rounded={12}
              bg="#635BFF"
              items="center"
              justify="center"
            >
              <SizableText
                fontFamily="$heading"
                fontSize={20}
                fontWeight="600"
                color={beautyTokens.white}
              >
                S
              </SizableText>
            </YStack>
            <YStack flex={1}>
              <SizableText
                fontFamily="$heading"
                fontSize={18}
                fontWeight="500"
                color={beautyTokens.text}
              >
                Stripe Connect
              </SizableText>
              <SizableText fontSize={11} color={beautyTokens.textMuted}>
                Payouts direct to your bank
              </SizableText>
            </YStack>
          </XStack>
          <Paragraph fontSize={13} color={beautyTokens.text} lineHeight={20}>
            {env?.action === 'render' ? (env.data?.stripe_copy ?? '') : ''}
          </Paragraph>
          <InfoStrip tone="info" testID="stripe-coming-soon">
            Stripe Connect onboarding lands in the next release. For now this
            step just records that you intend to enable payments.
          </InfoStrip>
        </BeautyCard>
      </WizardLayout>
    </>
  );
}
