/**
 * Apply wizard step 2 — Multi-select service categories.
 * BFF: `beauty_business_application_services`. PATCH submit_href with
 * `{ step: 'services', selected_categories: [...] }` then navigate next.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SizableText, XStack, YStack } from 'tamagui';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { beautyTokens } from '../../../tamagui.config';
import { BeautyCard } from '@/components/ui';
import { WizardLayout, type WizardData } from '@/components/business/WizardLayout';
import { patchApplicationStep } from '@/services/businessApply';

interface CategoryOption {
  value: string;
  label: string;
  description: string;
}

interface ServicesData extends WizardData {
  application: { selected_categories: string[] };
  submit_href: string;
  category_options: CategoryOption[];
}

export default function ApplyServicesScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ServicesData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setEnv(null);
    setError(null);
    resolve<ServicesData>('beauty_business_application_services', {})
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(business)/apply/entity') as any);
          return;
        }
        setSelected(e.data?.application?.selected_categories ?? []);
        setEnv(e);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const onContinue = useCallback(async () => {
    if (!env || env.action !== 'render' || !env.data) return;
    setSubmitting(true);
    setError(null);
    try {
      await patchApplicationStep(env.data.submit_href, 'services', {
        selected_categories: selected,
      });
      navigateLink(router, env._links?.next, { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not save this step.');
    } finally {
      setSubmitting(false);
    }
  }, [env, router, selected]);

  const options: CategoryOption[] =
    env?.action === 'render' ? (env.data?.category_options ?? []) : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WizardLayout
        envelope={env}
        subtitle="Pick at least one category. You can add specific services after the application is accepted."
        onContinue={onContinue}
        continueDisabled={selected.length === 0 || submitting}
        continueLoading={submitting}
        error={error}
      >
        <BeautyCard testID="services-options-card">
          {options.map((opt, idx) => {
            const on = selected.includes(opt.value);
            return (
              <Pressable
                key={opt.value}
                onPress={() => toggle(opt.value)}
                testID={`services-option-${opt.value}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
              >
                <XStack
                  py={12}
                  gap={12}
                  items="center"
                  borderTopWidth={idx === 0 ? 0 : 1}
                  borderTopColor={beautyTokens.line}
                >
                  <YStack
                    width={22}
                    height={22}
                    rounded={6}
                    borderWidth={1.8}
                    borderColor={on ? beautyTokens.success : beautyTokens.line}
                    bg={on ? beautyTokens.success : beautyTokens.white}
                    items="center"
                    justify="center"
                  >
                    {on ? (
                      <SizableText color={beautyTokens.white} fontSize={14}>
                        ✓
                      </SizableText>
                    ) : null}
                  </YStack>
                  <YStack flex={1}>
                    <SizableText
                      fontSize={14}
                      fontWeight={on ? '600' : '500'}
                      color={beautyTokens.text}
                    >
                      {opt.label}
                    </SizableText>
                    <SizableText fontSize={12} color={beautyTokens.textMuted} mt={2}>
                      {opt.description}
                    </SizableText>
                  </YStack>
                </XStack>
              </Pressable>
            );
          })}
        </BeautyCard>
      </WizardLayout>
    </>
  );
}
