/**
 * Apply wizard step 4 — Weekly hours.
 * Uses the shared WeeklyHoursGrid (quickset + Closed/Open/24h pill + time inputs).
 * PUTs hours to availability_href then PATCHes the wizard step.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import {
  patchApplicationStep,
  putWeeklyHours,
  type WeeklyHourRow,
} from '@/services/businessApply';
import {
  WeeklyHoursGrid,
  WizardLayout,
  type WizardData,
} from '@/components/business';

interface ScheduleData extends WizardData {
  submit_href: string;
  weekly_hours?: WeeklyHourRow[];
  availability_href: string;
  availability_method?: string;
}

export default function ApplyScheduleScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ScheduleData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<WeeklyHourRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    setEnv(null);
    setError(null);
    resolve<ScheduleData>('beauty_business_application_schedule', {})
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/business/apply/stripe') as any);
          return;
        }
        setRows(e.data?.weekly_hours ?? []);
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
      await putWeeklyHours(env.data.availability_href, rows);
      await patchApplicationStep(env.data.submit_href, 'schedule', {});
      navigateLink(router, env._links?.next, { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not save weekly hours.');
    } finally {
      setSubmitting(false);
    }
  }, [env, router, rows]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WizardLayout
        envelope={env}
        subtitle="When are you open? Customers can only book during these hours."
        onContinue={onContinue}
        continueLoading={submitting}
        error={error}
        centerTitle
      >
        <WeeklyHoursGrid rows={rows} onChange={setRows} />
      </WizardLayout>
    </>
  );
}
