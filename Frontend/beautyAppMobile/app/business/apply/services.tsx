/**
 * Apply wizard step 2 — Multi-select service categories.
 * Mirrors Angular services branch.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { patchApplicationStep } from '@/services/businessApply';
import { useAutosave } from '@/hooks/useAutosave';
import {
  ChoiceRow,
  HeadedCard,
  InfoStripProv,
  WizardLayout,
  type WizardData,
} from '@/components/business';

interface CategoryOption {
  value: string;
  label: string;
  description?: string;
}

interface ServicesData extends WizardData {
  application?: { selected_categories?: string[] };
  submit_href: string;
  category_options?: CategoryOption[];
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
          router.replace((route ?? '/business/apply/entity') as any);
          return;
        }
        setSelected(e.data?.application?.selected_categories ?? []);
        setEnv(e);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => { cancelled = true; };
  }, [router]);

  const toggle = (value: string) =>
    setSelected((cur) => (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]));

  const onContinue = useCallback(async () => {
    if (!env || env.action !== 'render' || !env.data) return;
    if (selected.length === 0) {
      setError('Pick at least one service category.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await patchApplicationStep(env.data.submit_href, 'services', { selected_categories: selected });
      navigateLink(router, env._links?.next, { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not save this step.');
    } finally {
      setSubmitting(false);
    }
  }, [env, router, selected]);

  const options: CategoryOption[] = env?.action === 'render' ? (env.data?.category_options ?? []) : [];

  const saveState = useAutosave({
    href: env?.action === 'render' ? env.data?.submit_href : undefined,
    step: 'services',
    fields: { selected_categories: selected },
    skip: !env || env.action !== 'render' || submitting || selected.length === 0,
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WizardLayout
        envelope={env}
        subtitle="What categories will you offer? You can add specific services later."
        onContinue={onContinue}
        continueDisabled={selected.length === 0 || submitting}
        continueLoading={submitting}
        error={error}
        saveState={saveState}
      >
        <HeadedCard head="Pick at least one">
          {options.map((opt, idx) => (
            <ChoiceRow
              key={opt.value}
              kind="check"
              label={opt.label}
              sub={opt.description}
              selected={selected.includes(opt.value)}
              onPress={() => toggle(opt.value)}
              first={idx === 0}
              testID={`services-option-${opt.value}`}
            />
          ))}
        </HeadedCard>

        <InfoStripProv>
          You can list specific services with pricing in the next stages of onboarding.
        </InfoStripProv>
      </WizardLayout>
    </>
  );
}
