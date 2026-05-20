/**
 * Apply wizard final step — Review every captured field, accept ToS, submit.
 * BFF: `beauty_business_application_review`. POSTs to
 * `submit_application_href` then navigates to `success_screen`
 * (`beauty_business_home`).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Paragraph, SizableText, XStack, YStack } from 'tamagui';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import { beautyTokens } from '../../../tamagui.config';
import { BeautyCard } from '@/components/ui';
import { WizardLayout, type WizardData } from '@/components/business/WizardLayout';
import { submitApplication, type WeeklyHourRow } from '@/services/businessApply';

interface ReviewApplication {
  entity_type: string;
  applicant_first_name: string;
  applicant_last_name: string;
  business_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  itin_masked: string;
}

interface ReviewData extends WizardData {
  application: ReviewApplication;
  tos_text: string;
  submit_application_href: string;
  success_screen: string;
  weekly_hours: WeeklyHourRow[];
  category_labels: string[];
  tool_labels: string[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ApplyReviewScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ReviewData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEnv(null);
    setError(null);
    resolve<ReviewData>('beauty_business_application_review', {})
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(business)/apply/entity') as any);
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

  const onSubmit = useCallback(async () => {
    if (!env || env.action !== 'render' || !env.data) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitApplication(env.data.submit_application_href);
      const target = env.data.success_screen
        ? nativeRouteFor(env.data.success_screen)
        : null;
      router.replace((target ?? '/(business)/home') as any);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
  }, [env, router]);

  const renderData = env?.action === 'render' ? env.data : undefined;
  const a = renderData?.application;
  const weekly: WeeklyHourRow[] = renderData?.weekly_hours ?? [];
  const categoryLabels: string[] = renderData?.category_labels ?? [];
  const toolLabels: string[] = renderData?.tool_labels ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WizardLayout
        envelope={env}
        subtitle="Confirm everything looks right before we kick off review."
        onContinue={onSubmit}
        continueLabel="Submit application"
        continueDisabled={!tosAccepted || submitting}
        continueLoading={submitting}
        error={error}
      >
        <BeautyCard testID="review-entity" header="About your business">
          <YStack gap={4}>
            <SizableText fontSize={12} color={beautyTokens.textMuted}>
              Entity type
            </SizableText>
            <SizableText fontSize={14} color={beautyTokens.text} fontWeight="600">
              {a?.entity_type === 'business' ? 'Registered business' : 'Sole proprietor'}
            </SizableText>
          </YStack>
          <YStack gap={4}>
            <SizableText fontSize={12} color={beautyTokens.textMuted}>
              Applicant
            </SizableText>
            <SizableText fontSize={14} color={beautyTokens.text} fontWeight="600">
              {a?.applicant_first_name} {a?.applicant_last_name}
            </SizableText>
          </YStack>
          <YStack gap={4}>
            <SizableText fontSize={12} color={beautyTokens.textMuted}>
              Business name
            </SizableText>
            <SizableText fontSize={14} color={beautyTokens.text} fontWeight="600">
              {a?.business_name}
            </SizableText>
          </YStack>
          <YStack gap={4}>
            <SizableText fontSize={12} color={beautyTokens.textMuted}>
              Address
            </SizableText>
            <SizableText fontSize={14} color={beautyTokens.text}>
              {a?.address_line1}
              {a?.address_line2 ? `, ${a.address_line2}` : ''}
              {'\n'}
              {a?.city}, {a?.state} {a?.postal_code}
            </SizableText>
          </YStack>
          {a?.itin_masked ? (
            <YStack gap={4}>
              <SizableText fontSize={12} color={beautyTokens.textMuted}>
                Tax ID
              </SizableText>
              <SizableText
                fontSize={14}
                color={beautyTokens.text}
                fontFamily={'ui-monospace, SF Mono, Menlo, monospace' as any}
              >
                {a.itin_masked}
              </SizableText>
            </YStack>
          ) : null}
        </BeautyCard>

        <BeautyCard testID="review-services" header="Services">
          <SizableText fontSize={13} color={beautyTokens.text}>
            {categoryLabels.length ? categoryLabels.join(' · ') : '— none selected —'}
          </SizableText>
        </BeautyCard>

        <BeautyCard testID="review-schedule" header="Weekly hours">
          {weekly.map((row) => (
            <XStack key={row.day_of_week} justify="space-between" gap={12}>
              <SizableText fontSize={13} color={beautyTokens.text} fontWeight="600">
                {DAY_LABELS[row.day_of_week]}
              </SizableText>
              <SizableText
                fontSize={13}
                color={beautyTokens.textMuted}
                fontFamily={'ui-monospace, SF Mono, Menlo, monospace' as any}
              >
                {row.is_closed
                  ? 'Closed'
                  : row.is_24h
                    ? '24h'
                    : `${row.start_time} – ${row.end_time}`}
              </SizableText>
            </XStack>
          ))}
        </BeautyCard>

        <BeautyCard testID="review-tools" header="Third-party tools">
          <SizableText fontSize={13} color={beautyTokens.text}>
            {toolLabels.length ? toolLabels.join(' · ') : '— none selected —'}
          </SizableText>
        </BeautyCard>

        <BeautyCard testID="review-tos" header="Terms of Service">
          <Paragraph fontSize={12} color={beautyTokens.textMuted} lineHeight={18}>
            {renderData?.tos_text ?? ''}
          </Paragraph>
          <Pressable
            onPress={() => setTosAccepted((v) => !v)}
            testID="review-tos-checkbox"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: tosAccepted }}
          >
            <XStack gap={12} items="center" py={10}>
              <YStack
                width={22}
                height={22}
                rounded={6}
                borderWidth={1.8}
                borderColor={tosAccepted ? beautyTokens.success : beautyTokens.line}
                bg={tosAccepted ? beautyTokens.success : beautyTokens.white}
                items="center"
                justify="center"
              >
                {tosAccepted ? (
                  <SizableText color={beautyTokens.white} fontSize={14}>
                    ✓
                  </SizableText>
                ) : null}
              </YStack>
              <SizableText fontSize={13} color={beautyTokens.text} flex={1}>
                I agree to the Terms of Service and Privacy Policy.
              </SizableText>
            </XStack>
          </Pressable>
        </BeautyCard>
      </WizardLayout>
    </>
  );
}
