/**
 * Reschedule — mirrors Angular `BeautyRescheduleComponent`.
 *  - "✨ Beauty" brand header (legacy header on this older Angular page).
 *  - "← Back to booking" link.
 *  - "Reschedule <service>" bold h1, "at <provider> · <loc>" caption.
 *  - "Times shown in <tz>." tz note.
 *  - Gray card: "Currently booked for / <slot label>".
 *  - "Pick a new time" label + native <select> (web) or pressable list (native).
 *  - Ink-black "Confirm new time" button (disabled until slot picked).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';

interface ReField {
  name: string;
  type: string;
  label?: string;
  value?: string | number;
  options?: { value: string; label: string }[];
  required?: boolean;
}
interface ReForm {
  submit_method: string;
  submit_href: string;
  success_screen: string;
  success_route_template?: string;
  fields: ReField[];
  submit_label: string;
}
interface RescheduleData {
  booking: { id: number; current_slot_at: string; current_slot_label: string };
  service: { id: number; name: string; duration_minutes: number; price_cents: number };
  provider: { id: number; name: string; location_label: string; timezone?: string };
  form: ReForm;
}

const C = {
  surface: '#FFFFFF',
  surface2: '#F6F6F6',
  line: '#DDDDDD',
  text: '#212121',
  textMuted: '#888888',
  textSubtle: '#666666',
  ink: '#000000',
  danger: '#C62828',
  white: '#FFFFFF',
};
const FONT_BODY = 'Inter_400Regular';
const FONT_BODY_SEMI = 'Inter_600SemiBold';

function formatSlotLocal(iso: string, tz?: string): string {
  if (!iso) return '';
  try {
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    };
    if (tz) (opts as any).timeZone = tz;
    return new Intl.DateTimeFormat(undefined, opts).format(new Date(iso));
  } catch {
    return '';
  }
}

export default function RescheduleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const [env, setEnv] = useState<BffEnvelope<RescheduleData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [serverError, setServerError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(bookingId)) return;
    let cancelled = false;
    setEnv(null); setError(null);
    resolve<RescheduleData>('beauty_reschedule', { bookingId })
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(customer)/bookings') as any);
          return;
        }
        setEnv(e);
        if (e.action === 'render' && e.data) {
          const next: Record<string, string | number> = {};
          for (const f of e.data.form.fields) if (f.value != null) next[f.name] = f.value;
          setValues(next);
        }
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => { cancelled = true; };
  }, [bookingId, router]);

  const data = env?.action === 'render' ? env.data : null;
  const form = data?.form ?? null;
  const links = (env?._links ?? {}) as Record<string, BffLink | undefined>;
  const tz = data?.provider?.timezone;

  const visibleFields = useMemo(
    () => (form?.fields || []).filter((f) => f.type !== 'hidden'),
    [form],
  );

  const slotLabel = (o: { value: string; label: string }) =>
    formatSlotLocal(o.value, tz) || o.label;

  const canSubmit = () =>
    !!form && visibleFields.every((f) => !f.required || !!values[f.name]);

  const currentSlotLabel = (() => {
    const b = data?.booking;
    if (!b) return '';
    return formatSlotLocal(b.current_slot_at, tz) || b.current_slot_label;
  })();

  const onSubmit = async () => {
    if (!form || isSubmitting || !canSubmit()) return;
    setServerError('');
    setIsSubmitting(true);
    const body: Record<string, unknown> = {};
    for (const f of form.fields) body[f.name] = f.type === 'hidden' ? f.value : values[f.name];
    const submitLink: BffLink = {
      rel: 'submit', href: form.submit_href,
      method: (form.submit_method as BffLink['method']) || 'POST',
      screen: null, route: null, prompt: null,
    };
    const r = await dispatchLink(submitLink, body);
    setIsSubmitting(false);
    if (!r.ok) {
      const errData = (r.error as any)?.response?.data;
      setServerError(errData?.detail ?? 'Could not reschedule. Please try a different time.');
      return;
    }
    const target = links.booking || {
      rel: 'success', href: null, method: 'NAV' as const,
      screen: form.success_screen || 'beauty_booking_detail',
      route: form.success_route_template ?? null,
      prompt: null,
    };
    navigateLink(router, target);
  };

  if (error) {
    return (
      <View style={[styles.app, { padding: 16 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.danger, fontFamily: FONT_BODY }}>{error}</Text>
      </View>
    );
  }
  if (!data || !form) {
    return (
      <View style={[styles.app, { alignItems: 'center', justifyContent: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.textMuted, fontFamily: FONT_BODY }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.beautyHeader}>
        <Text style={styles.brandIcon}>✨</Text>
        <Pressable onPress={() => links.home && navigateLink(router, links.home)}>
          <Text style={styles.brandName}>Beauty</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.reSection}>
        {links.booking ? (
          <Pressable onPress={() => navigateLink(router, links.booking)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← {links.booking.prompt || 'Back to booking'}</Text>
          </Pressable>
        ) : null}

        <Text style={styles.title}>Reschedule {data.service.name}</Text>
        {data.provider?.name ? (
          <Text style={styles.meta}>at {data.provider.name} · {data.provider.location_label}</Text>
        ) : null}
        {data.provider?.timezone ? (
          <Text style={styles.tzNote}>Times shown in {data.provider.timezone}.</Text>
        ) : null}

        <View style={styles.currentCard}>
          <Text style={styles.currentLabel}>Currently booked for</Text>
          <Text style={styles.currentTime}>{currentSlotLabel}</Text>
        </View>

        <View style={styles.reForm}>
          {visibleFields.map((f) => (
            <View key={f.name} style={{ gap: 6 }}>
              <Text style={styles.fieldLabel} accessibilityLabel={f.label}>{f.label}</Text>
              {Platform.OS === 'web' ? (
                React.createElement('select', {
                  id: f.name,
                  name: f.name,
                  value: String(values[f.name] ?? ''),
                  onChange: (e: any) => setValues((v) => ({ ...v, [f.name]: e.target.value })),
                  required: f.required ?? false,
                  style: webSelectStyle,
                }, [
                  React.createElement('option', { key: '__placeholder', value: '', disabled: true }, 'Select a new time…'),
                  ...(f.options || []).map((o) =>
                    React.createElement('option', { key: o.value, value: o.value }, slotLabel(o))
                  ),
                ])
              ) : (
                <View>
                  {(f.options || []).map((o) => {
                    const sel = String(values[f.name] ?? '') === o.value;
                    return (
                      <Pressable
                        key={o.value}
                        onPress={() => setValues((v) => ({ ...v, [f.name]: o.value }))}
                        style={[styles.nativeOption, sel && styles.nativeOptionSelected]}
                      >
                        <Text style={[styles.nativeOptionText, sel && styles.nativeOptionTextSelected]}>
                          {slotLabel(o)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          ))}

          {serverError ? (
            <Text style={styles.serverError}>{serverError}</Text>
          ) : null}

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit() || isSubmitting}
            style={[
              styles.btnConfirm,
              (!canSubmit() || isSubmitting) && styles.btnConfirmDisabled,
            ]}
          >
            <Text style={styles.btnConfirmText}>
              {isSubmitting ? 'Rescheduling…' : (form.submit_label || 'Confirm new time')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const webSelectStyle: any = {
  padding: 12,
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 16,
  background: '#fff',
  fontFamily: 'Inter, system-ui, sans-serif',
  color: '#212121',
  width: '100%',
};

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.surface },

  beautyHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#eeeeee',
  },
  brandIcon: { fontSize: 22 },
  brandName: { fontSize: 18, fontFamily: FONT_BODY_SEMI, color: C.text },

  reSection: {
    padding: 24, paddingBottom: 64,
    maxWidth: 520, width: '100%', alignSelf: 'center',
  },
  backBtn: { paddingVertical: 4, paddingHorizontal: 8, marginBottom: 16, alignSelf: 'flex-start' },
  backBtnText: { color: '#555555', fontSize: 14, fontFamily: FONT_BODY },

  title: { fontSize: 26, fontFamily: FONT_BODY_SEMI, color: C.text, marginBottom: 4 },
  meta: { fontSize: 14, color: C.textMuted, marginTop: 4, marginBottom: 20, fontFamily: FONT_BODY },
  tzNote: { fontSize: 13, color: C.textSubtle, marginBottom: 12, fontFamily: FONT_BODY },

  currentCard: {
    backgroundColor: C.surface2, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
  },
  currentLabel: { fontSize: 13, color: '#777', marginBottom: 4, fontFamily: FONT_BODY },
  currentTime: { fontSize: 14, color: C.text, fontFamily: FONT_BODY_SEMI },

  reForm: { gap: 12 },
  fieldLabel: { fontSize: 14, color: '#444', fontFamily: FONT_BODY },

  nativeOption: {
    padding: 12, borderWidth: 1, borderColor: C.line, borderRadius: 8,
    marginBottom: 6, backgroundColor: C.surface,
  },
  nativeOptionSelected: { borderColor: C.ink, backgroundColor: '#F0F0F0' },
  nativeOptionText: { fontSize: 14, color: C.text, fontFamily: FONT_BODY },
  nativeOptionTextSelected: { fontFamily: FONT_BODY_SEMI },

  btnConfirm: {
    backgroundColor: C.ink, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    marginTop: 12, minHeight: 44,
  } as ViewStyle,
  btnConfirmDisabled: { backgroundColor: '#AAAAAA' },
  btnConfirmText: { color: C.white, fontSize: 16, fontFamily: FONT_BODY_SEMI },

  serverError: { color: C.danger, fontSize: 14, fontFamily: FONT_BODY },
});
