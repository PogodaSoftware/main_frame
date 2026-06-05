/**
 * Apply wizard final step — Review every captured field, accept ToS, submit.
 * Mirrors Angular review branch.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import { submitApplication, type WeeklyHourRow } from '@/services/businessApply';
import {
  ChoiceRow,
  WizardLayout,
  type WizardData,
} from '@/components/business';
import { beautyTokens } from '../../../tamagui.config';

interface ReviewApplication {
  entity_type?: string;
  applicant_first_name?: string;
  applicant_last_name?: string;
  business_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  itin_masked?: string;
  has_itin?: boolean;
}

interface ReviewData extends WizardData {
  application?: ReviewApplication;
  tos_text?: string;
  submit_application_href: string;
  submit_application_method?: string;
  success_screen?: string;
  weekly_hours?: WeeklyHourRow[];
  category_labels?: string[];
  tool_labels?: string[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// 24h "HH:MM" → 12h "h:MM AM/PM" (no military time on the summary).
function fmt12(hhmm: string | undefined): string {
  const s = (hhmm || '').slice(0, 5);
  const [h, m] = s.split(':');
  const H = parseInt(h, 10);
  if (Number.isNaN(H)) return s;
  const ap = H >= 12 ? 'PM' : 'AM';
  let h12 = H % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${m ?? '00'} ${ap}`;
}

export default function ApplyReviewScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ReviewData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [acceptTos, setAcceptTos] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEnv(null);
    setError(null);
    resolve<ReviewData>('beauty_business_application_review', {})
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/business/apply/entity') as any);
          return;
        }
        setEnv(e);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => { cancelled = true; };
  }, [router]);

  const onSubmit = useCallback(async () => {
    if (!env || env.action !== 'render' || !env.data) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitApplication(env.data.submit_application_href, acceptTos);
      const target = env.data.success_screen
        ? nativeRouteFor(env.data.success_screen)
        : null;
      router.replace((target ?? '/business/home') as any);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
  }, [env, router, acceptTos]);

  const data = env?.action === 'render' ? env.data : undefined;
  const a = data?.application ?? {};
  const weekly = data?.weekly_hours ?? [];
  const categoryLabels = data?.category_labels ?? [];
  const toolLabels = data?.tool_labels ?? [];
  const addressLines: string[] = [];
  if (a.address_line1) addressLines.push(a.address_line1);
  if (a.address_line2) addressLines.push(a.address_line2);
  const cityLine = [a.city, a.state, a.postal_code].filter(Boolean).join(' ').trim();
  if (cityLine) addressLines.push(cityLine);
  // Hard-coded placeholders until the wizard captures address / payment / integrations.
  const businessAddress = addressLines.length > 0 ? addressLines : ['248 Mission St, Ste 401', 'San Francisco, CA 94105'];
  const integrationLabels = toolLabels.length > 0 ? toolLabels : ['Google Calendar'];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WizardLayout
        envelope={env}
        subtitle="Double-check the details — you can edit any section before submitting."
        onContinue={onSubmit}
        continueLabel="Submit application"
        continueDisabled={!acceptTos || submitting}
        continueLoading={submitting}
        error={error}
      >
        <ReviewSection title="Applicant" onEdit={() => router.push('/business/apply/entity' as any)}>
          <DlRow first label="Name" value={`${a.applicant_first_name ?? ''} ${a.applicant_last_name ?? ''}`.trim()} />
          <DlRow label="Entity" value={a.entity_type === 'business' ? 'Registered business' : 'Individual / sole practitioner'} />
          {a.has_itin && <DlRow label="ITIN" value={a.itin_masked ?? ''} mono />}
        </ReviewSection>

        <ReviewSection title="Business" onEdit={() => router.push('/business/apply/entity' as any)}>
          <DlRow first label="Name" value={a.business_name ?? ''} />
          <DlRow label="Address" multilineValue={businessAddress} />
        </ReviewSection>

        {categoryLabels.length > 0 && (
          <ReviewSection title="Services" onEdit={() => router.push('/business/apply/services' as any)}>
            <View style={styles.chips}>
              {categoryLabels.map((label) => (
                <View key={label} style={styles.chip}>
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              ))}
            </View>
          </ReviewSection>
        )}

        <ReviewSection title="Payments" onEdit={() => router.push('/business/apply/stripe' as any)}>
          <DlRow first label="Payout method" value="Stripe Connect" />
          <DlRow label="Status" value="Coming soon · connect before launch" />
        </ReviewSection>

        {weekly.length > 0 && (
          <ReviewSection title="Weekly hours" onEdit={() => router.push('/business/apply/schedule' as any)}>
            <View style={styles.hoursGrid}>
              {weekly.map((row) => (
                <View key={row.day_of_week} style={styles.hoursRow}>
                  <Text style={styles.hgDay}>{DAY_LABELS[row.day_of_week]}</Text>
                  <Text style={styles.hgTime}>
                    {row.is_closed ? 'Closed' : row.is_24h ? 'Open 24h' : `${fmt12(row.start_time)} – ${fmt12(row.end_time)}`}
                  </Text>
                </View>
              ))}
            </View>
          </ReviewSection>
        )}

        <ReviewSection title="Third-party tools" onEdit={() => router.push('/business/apply/tools' as any)}>
          <View style={styles.chips}>
            {integrationLabels.map((label) => (
              <View key={label} style={styles.chip}>
                <Text style={styles.chipText}>{label}</Text>
              </View>
            ))}
          </View>
        </ReviewSection>

        <ReviewSection title="Terms of Service">
          <ScrollView style={styles.tosScroll} nestedScrollEnabled>
            <Text style={styles.tosText}>{data?.tos_text ?? ''}</Text>
          </ScrollView>
          <ChoiceRow
            kind="check"
            label="I have read and accept the Terms of Service."
            selected={acceptTos}
            onPress={() => setAcceptTos(!acceptTos)}
            first
            testID="review-tos-checkbox"
          />
        </ReviewSection>
      </WizardLayout>
    </>
  );
}

function ReviewSection({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit?: () => void }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onEdit && (
          <Pressable
            onPress={onEdit}
            style={styles.editPill}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${title}`}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={13} color={beautyTokens.ink} />
            <Text style={styles.editPillText}>Edit</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function DlRow({ label, value, multilineValue, mono, first }: { label: string; value?: string; multilineValue?: string[]; mono?: boolean; first?: boolean }) {
  return (
    <View style={[styles.dlRow, !first && styles.dlRowDivided]}>
      <Text style={styles.dt}>{label}</Text>
      {multilineValue ? (
        <View style={styles.ddBlock}>
          {multilineValue.map((line, i) => (
            <Text key={i} style={[styles.dd, mono && styles.ddMono]}>{line}</Text>
          ))}
        </View>
      ) : (
        <Text style={[styles.dd, mono && styles.ddMono]}>{value || '—'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 14, padding: 14,
  },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: beautyTokens.fontDisplay,
    fontSize: 18, fontWeight: '500',
    color: beautyTokens.text,
  },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1, borderColor: beautyTokens.line,
    backgroundColor: '#FFFFFF',
  },
  editPillText: { fontSize: 12, fontWeight: '600', color: beautyTokens.ink, fontFamily: beautyTokens.fontBody },
  dlRow: { marginBottom: 8 },
  dlRowDivided: {
    borderTopWidth: 1, borderTopColor: beautyTokens.line,
    paddingTop: 8, marginTop: 2,
  },
  dt: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: beautyTokens.textMuted, fontFamily: beautyTokens.fontBody, marginBottom: 2 },
  dd: { fontSize: 14, color: beautyTokens.text, fontFamily: beautyTokens.fontBody, lineHeight: 20 },
  ddMono: { fontFamily: 'Menlo', fontSize: 13 },
  ddBlock: { gap: 0 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: beautyTokens.accentBlue,
    borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: beautyTokens.accentBlueText, letterSpacing: 0.2, fontFamily: beautyTokens.fontBody },

  hoursGrid: { gap: 4 },
  hoursRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: beautyTokens.line,
  },
  hgDay: { fontSize: 13, fontWeight: '600', color: beautyTokens.text, fontFamily: beautyTokens.fontBody },
  hgTime: { fontSize: 13, color: beautyTokens.textMuted, fontFamily: 'Menlo' },

  bulletList: { fontSize: 13, color: beautyTokens.text, lineHeight: 20, fontFamily: beautyTokens.fontBody },

  tosScroll: {
    maxHeight: 140,
    backgroundColor: beautyTokens.surface,
    borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 8, padding: 10, marginBottom: 8,
  },
  tosText: { fontSize: 12, lineHeight: 18, color: beautyTokens.text, fontFamily: beautyTokens.fontBody },
});
