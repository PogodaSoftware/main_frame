/**
 * Apply wizard step 3 — Stripe Connect stand-in.
 * Mirrors Angular stripe branch.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { patchApplicationStep } from '@/services/businessApply';
import {
  InfoStripProv,
  WizardLayout,
  type WizardData,
} from '@/components/business';
import { beautyTokens } from '../../../tamagui.config';

interface StripeData extends WizardData {
  submit_href: string;
  stripe_copy?: string;
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
          router.replace((route ?? '/business/apply/services') as any);
          return;
        }
        setEnv(e);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => { cancelled = true; };
  }, [router]);

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

  const copy =
    env?.action === 'render'
      ? env.data?.stripe_copy ??
        'Stripe Connect lets us send payouts straight to your bank account when customers pay for bookings. The full flow is coming soon — for now, mark this step complete and continue your application.'
      : '';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WizardLayout
        envelope={env}
        subtitle="Where customer payments land when bookings are paid."
        onContinue={onContinue}
        continueLabel="Mark complete · Continue"
        continueLoading={submitting}
        error={error}
      >
        <View style={styles.card}>
          <View style={styles.head}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.name}>Stripe Connect</Text>
              <Text style={styles.sub}>Direct payouts to your bank account</Text>
            </View>
            <View style={styles.comingSoon}>
              <Text style={styles.comingSoonText}>Coming soon</Text>
            </View>
          </View>
          <Text style={styles.body}>{copy}</Text>
        </View>

        <InfoStripProv>
          No fees during the application phase. We'll prompt you to connect Stripe before your storefront goes live.
        </InfoStripProv>
      </WizardLayout>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line, borderRadius: 14,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: beautyTokens.line,
  },
  logo: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#635BFF',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#FFFFFF', fontFamily: beautyTokens.fontDisplay, fontSize: 18, fontWeight: '600' },
  titleBlock: { flex: 1 },
  name: { fontFamily: beautyTokens.fontDisplay, fontSize: 16, fontWeight: '500', color: beautyTokens.text },
  sub: { fontSize: 11, color: beautyTokens.textMuted, marginTop: 2, fontFamily: beautyTokens.fontBody },
  comingSoon: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: beautyTokens.warningBg,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.33)',
  },
  comingSoonText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, color: beautyTokens.warningText, fontFamily: beautyTokens.fontBody },
  body: { padding: 14, fontSize: 13, lineHeight: 19, color: beautyTokens.text, fontFamily: beautyTokens.fontBody },
});
