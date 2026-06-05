/**
 * Apply wizard step 5 — Optional third-party tools (check-rows in HeadedCard).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { patchApplicationStep } from '@/services/businessApply';
import {
  ChoiceRow,
  HeadedCard,
  InfoStripProv,
  WizardLayout,
  type WizardData,
} from '@/components/business';

interface ToolOption {
  value: string;
  label: string;
  description?: string;
}

interface ToolsData extends WizardData {
  application?: { third_party_tools?: string[] };
  submit_href: string;
  tool_options?: ToolOption[];
}

export default function ApplyToolsScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ToolsData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setEnv(null);
    setError(null);
    resolve<ToolsData>('beauty_business_application_tools', {})
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/business/apply/schedule') as any);
          return;
        }
        setSelected(e.data?.application?.third_party_tools ?? []);
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
    setSubmitting(true);
    setError(null);
    try {
      await patchApplicationStep(env.data.submit_href, 'tools', { third_party_tools: selected });
      navigateLink(router, env._links?.next, { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not save this step.');
    } finally {
      setSubmitting(false);
    }
  }, [env, router, selected]);

  const options: ToolOption[] = env?.action === 'render' ? (env.data?.tool_options ?? []) : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WizardLayout
        envelope={env}
        subtitle="Connect calendars or point-of-sale tools you already use."
        onContinue={onContinue}
        continueLoading={submitting}
        error={error}
      >
        <HeadedCard head="Optional integrations">
          {options.map((opt, idx) => (
            <ChoiceRow
              key={opt.value}
              kind="check"
              label={opt.label}
              sub={opt.description}
              selected={selected.includes(opt.value)}
              onPress={() => toggle(opt.value)}
              first={idx === 0}
              testID={`tools-option-${opt.value}`}
            />
          ))}
        </HeadedCard>

        <InfoStripProv>
          Selections are saved with your application — real syncing comes later.
        </InfoStripProv>
      </WizardLayout>
    </>
  );
}
