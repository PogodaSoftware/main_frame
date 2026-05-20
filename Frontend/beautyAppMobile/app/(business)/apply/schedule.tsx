/**
 * Apply wizard step 4 — Weekly hours.
 * BFF: `beauty_business_application_schedule`. Renders a read-only
 * summary of the 7 weekly-hour rows pulled from the backend default
 * (10–18 Mon–Sat, Sun closed). Tap a row to flip closed/open without
 * changing times — full per-day time editing lives in
 * `/business/availability` post-onboarding. Continue PUTs the current
 * grid to `availability_href` and PATCHes the wizard step complete.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SizableText, XStack, YStack } from 'tamagui';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { beautyTokens } from '../../../tamagui.config';
import { BeautyCard, InfoStrip } from '@/components/ui';
import { WizardLayout, type WizardData } from '@/components/business/WizardLayout';
import {
  patchApplicationStep,
  putWeeklyHours,
  type WeeklyHourRow,
} from '@/services/businessApply';

interface ScheduleData extends WizardData {
  submit_href: string;
  weekly_hours: WeeklyHourRow[];
  availability_href: string;
}

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function fmtTime(t: string): string {
  // Accept "HH:MM" or "HH:MM:SS"; show 12-hour to match Angular display.
  if (!t) return '';
  const [hh, mm] = t.split(':');
  const h = parseInt(hh, 10);
  const m = parseInt(mm, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
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
          router.replace((route ?? '/(business)/apply/stripe') as any);
          return;
        }
        setRows(e.data?.weekly_hours ?? []);
        setEnv(e);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleClosed = (dow: number) => {
    setRows((prev) =>
      prev.map((r) => (r.day_of_week === dow ? { ...r, is_closed: !r.is_closed } : r)),
    );
  };

  const onContinue = useCallback(async () => {
    if (!env || env.action !== 'render' || !env.data) return;
    setSubmitting(true);
    setError(null);
    try {
      await putWeeklyHours(env.data.availability_href, rows);
      await patchApplicationStep(env.data.submit_href, 'schedule', {});
      navigateLink(router, env._links?.next, { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not save this step.');
    } finally {
      setSubmitting(false);
    }
  }, [env, router, rows]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WizardLayout
        envelope={env}
        subtitle="Tap a day to flip open/closed. Fine-tune exact hours after onboarding."
        onContinue={onContinue}
        continueLoading={submitting}
        error={error}
      >
        <BeautyCard testID="schedule-card">
          {rows.map((row, idx) => (
            <Pressable
              key={row.day_of_week}
              onPress={() => toggleClosed(row.day_of_week)}
              testID={`schedule-row-${row.day_of_week}`}
              accessibilityRole="button"
            >
              <XStack
                py={12}
                gap={12}
                items="center"
                borderTopWidth={idx === 0 ? 0 : 1}
                borderTopColor={beautyTokens.line}
              >
                <SizableText
                  fontSize={14}
                  fontWeight="600"
                  color={beautyTokens.text}
                  width={96}
                >
                  {DAY_LABELS[row.day_of_week] ?? `Day ${row.day_of_week}`}
                </SizableText>
                <XStack flex={1} justify="flex-end">
                  {row.is_closed ? (
                    <SizableText fontSize={13} color={beautyTokens.textMuted}>
                      Closed
                    </SizableText>
                  ) : row.is_24h ? (
                    <SizableText fontSize={13} color={beautyTokens.text}>
                      Open 24h
                    </SizableText>
                  ) : (
                    <SizableText
                      fontSize={13}
                      color={beautyTokens.text}
                      fontFamily={'ui-monospace, SF Mono, Menlo, monospace' as any}
                    >
                      {fmtTime(row.start_time)} – {fmtTime(row.end_time)}
                    </SizableText>
                  )}
                </XStack>
              </XStack>
            </Pressable>
          ))}
        </BeautyCard>

        <InfoStrip tone="info" testID="schedule-help">
          Defaults are 10 AM – 6 PM Mon–Sat with Sunday closed. Adjust closed
          days now; per-day time ranges live in availability after onboarding.
        </InfoStrip>
      </WizardLayout>
    </>
  );
}
