/**
 * Business service form — mirrors Angular beauty-business-service-form.component.
 * Inline form inside a card. Sub-header w/ Cancel back · category select · text
 * fields · 2-col price/duration row · sticky submit + optional delete.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { api } from '@/services/api';
import { BeautyShell } from '@/components/BeautyShell';
import { ProvBtn, ProvCard, ProvSubHeader } from '@/components/business';
import { beautyTokens } from '../../../tamagui.config';

interface FormField {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  value?: string | number;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  pattern?: string;
  suffix?: string;
}

interface ServiceFormData {
  is_edit: boolean;
  service_id: number | null;
  form: {
    title: string;
    submit_method: string;
    submit_href: string;
    success_screen: string;
    submit_label: string;
    fields: FormField[];
  };
}

export default function ServiceFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = !id || id === 'new';

  const [env, setEnv] = useState<BffEnvelope<ServiceFormData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = isNew ? { serviceId: 'new' } : { serviceId: id };
      const e = await resolve<ServiceFormData>('beauty_business_service_form', params);
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        router.replace((route ?? '/(auth)/business-login') as any);
        return;
      }
      setEnv(e);
      if (e.action === 'render' && e.data?.form?.fields) {
        const v: Record<string, string | number> = {};
        for (const f of e.data.form.fields) {
          v[f.name] = f.value ?? '';
        }
        setValues(v);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load form.');
    }
  }, [id, isNew, router]);

  useEffect(() => { load(); }, [load]);

  const links: Record<string, BffLink> = (env?._links as Record<string, BffLink>) ?? {};
  const form = env?.action === 'render' ? env.data?.form : undefined;
  const data = env?.action === 'render' ? env.data : undefined;
  const isEdit = !!data?.is_edit;

  const setField = (name: string, value: string | number) => {
    setValues((cur) => ({ ...cur, [name]: value }));
  };

  const goCancel = () => {
    const link = links['cancel'];
    if (link) navigateLink(router, link, { replace: true });
    else router.replace('/business/services' as any);
  };

  const onSubmit = async () => {
    if (!form || submitting) return;
    setSubmitting(true);
    setServerError('');
    try {
      if ((form.submit_method || 'POST').toUpperCase() === 'PUT') {
        await api.put(form.submit_href, values);
      } else {
        await api.post(form.submit_href, values);
      }
      const successRoute = nativeRouteFor(form.success_screen) ?? '/business/services';
      router.replace(successRoute as any);
    } catch (err: any) {
      setServerError(err?.response?.data?.detail || 'Could not save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    const deleteHref = links['delete']?.href;
    if (!deleteHref || submitting) return;
    const proceed = await confirmDelete();
    if (!proceed) return;
    setSubmitting(true);
    setServerError('');
    try {
      // HATEOAS delete action-link from the resolver (no hardcoded path).
      await api.delete(deleteHref);
      router.replace('/business/services' as any);
    } catch (err: any) {
      setServerError(err?.response?.data?.detail || 'Could not delete service.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <BeautyShell>
        <Stack.Screen options={{ headerShown: false }} />
        <ProvSubHeader back="Cancel" title="Service" onBackPress={goCancel} />
        <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
      </BeautyShell>
    );
  }

  if (!form) {
    return (
      <BeautyShell>
        <Stack.Screen options={{ headerShown: false }} />
        <ProvSubHeader back="Cancel" title="Service" onBackPress={goCancel} />
      </BeautyShell>
    );
  }

  const fields = form.fields || [];
  const nameField = fields.find((f) => f.name === 'name');
  const categoryField = fields.find((f) => f.name === 'category');
  const descField = fields.find((f) => f.name === 'description');
  const priceField = fields.find((f) => f.name === 'price_dollars');
  const durationField = fields.find((f) => f.name === 'duration_minutes');

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ProvSubHeader back="Cancel" title={form.title || 'Service'} onBackPress={goCancel} />

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        <ProvCard padding={16} style={styles.formCard}>
          {nameField && (
            <FieldBlock label={nameField.label} required={nameField.required}>
              <TextInput
                value={String(values[nameField.name] ?? '')}
                onChangeText={(v) => setField(nameField.name, v)}
                placeholder="e.g. Brightening Peel"
                placeholderTextColor={beautyTokens.textMuted}
                style={styles.input}
              />
            </FieldBlock>
          )}

          {categoryField && (
            <FieldBlock label={categoryField.label} required={categoryField.required}>
              <SelectInput
                value={String(values[categoryField.name] ?? '')}
                options={categoryField.options ?? []}
                onChange={(v) => setField(categoryField.name, v)}
              />
            </FieldBlock>
          )}

          {descField && (
            <FieldBlock label={descField.label} required={descField.required}>
              <TextInput
                value={String(values[descField.name] ?? '')}
                onChangeText={(v) => setField(descField.name, v)}
                placeholder="What's included? Any prep needed?"
                placeholderTextColor={beautyTokens.textMuted}
                multiline
                style={[styles.input, styles.textarea]}
              />
            </FieldBlock>
          )}

          <View style={styles.pairRow}>
            {priceField && (
              <View style={styles.pairCol}>
                <FieldBlock label={priceField.label} required={priceField.required}>
                  <View style={styles.priceWrap}>
                    <Text style={styles.priceDollar}>$</Text>
                    <TextInput
                      value={String(values[priceField.name] ?? '')}
                      onChangeText={(v) => setField(priceField.name, v)}
                      keyboardType="decimal-pad"
                      placeholder="50.00"
                      placeholderTextColor={beautyTokens.textMuted}
                      style={styles.priceInput}
                    />
                  </View>
                  <Text style={styles.priceHelp}>US dollars · decimals OK</Text>
                </FieldBlock>
              </View>
            )}
            {durationField && (
              <View style={styles.pairCol}>
                <FieldBlock label={durationField.label} required={durationField.required}>
                  <View style={styles.numWrap}>
                    <TextInput
                      value={String(values[durationField.name] ?? '')}
                      onChangeText={(v) => setField(durationField.name, v)}
                      keyboardType="numeric"
                      placeholder="60"
                      placeholderTextColor={beautyTokens.textMuted}
                      style={styles.numInput}
                    />
                    {!!durationField.suffix && (
                      <Text style={styles.numSuffix}>{durationField.suffix}</Text>
                    )}
                  </View>
                </FieldBlock>
              </View>
            )}
          </View>
        </ProvCard>

        {!!serverError && (
          <Text style={styles.serverError} accessibilityRole="alert">{serverError}</Text>
        )}

        <View style={styles.footerActions}>
          {isEdit && (
            <View style={styles.footerCol}>
              <ProvBtn variant="dangerOutline" full disabled={submitting} onPress={onDelete}>
                Delete
              </ProvBtn>
            </View>
          )}
          <View style={isEdit ? styles.footerColWide : styles.footerCol}>
            <ProvBtn variant="success" full disabled={submitting} onPress={onSubmit}>
              {submitting ? 'Saving…' : form.submit_label || 'Save'}
            </ProvBtn>
          </View>
        </View>
        <Text style={styles.footnote}>Customers will see this on your storefront.</Text>
      </ScrollView>
    </BeautyShell>
  );
}

function confirmDelete(): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      resolve(typeof window !== 'undefined' ? window.confirm('Delete this service? This cannot be undone.') : false);
    } else {
      Alert.alert(
        'Delete service',
        'This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    }
  });
}

function FieldBlock({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label.toUpperCase()}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function SelectInput({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  // Hook must run unconditionally (before the web early-return).
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'web') {
    return React.createElement('select', {
      value,
      onChange: (e: any) => onChange(e.target.value),
      style: {
        width: '100%',
        height: 44,
        padding: '0 32px 0 12px',
        background: '#FFFFFF',
        border: `1px solid ${beautyTokens.line}`,
        borderRadius: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
        color: beautyTokens.text,
        outline: 'none',
        appearance: 'none',
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6F77' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      },
    }, options.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label)));
  }
  const selectedLabel = options.find((o) => o.value === value)?.label ?? 'Select…';
  return (
    <>
      <Pressable style={styles.selectBox} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={styles.selectValue}>{selectedLabel}</Text>
        <Text style={styles.selectCaret}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Category</Text>
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  style={[styles.sheetRow, selected && styles.sheetRowActive]}
                  onPress={() => { onChange(o.value); setOpen(false); }}
                >
                  <Text style={[styles.sheetRowText, selected && styles.sheetRowTextActive]}>{o.label}</Text>
                  {selected ? <Text style={styles.sheetCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  errorBox: { flex: 1, padding: 16 },
  errorText: { color: beautyTokens.danger, fontFamily: beautyTokens.fontBody, fontSize: 13 },

  body: { flex: 1, backgroundColor: beautyTokens.surface },
  bodyContent: { padding: 16, paddingTop: 14, paddingBottom: 24 },

  formCard: { gap: 14 },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontFamily: beautyTokens.fontBody, fontSize: 11, fontWeight: '600',
    letterSpacing: 0.6, color: beautyTokens.textMuted, marginBottom: 6,
  },
  req: { color: beautyTokens.danger },
  input: {
    width: '100%', height: 44, paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 10,
    fontFamily: beautyTokens.fontBody, fontSize: 14,
    color: beautyTokens.text,
  },
  textarea: { height: 'auto', minHeight: 80, paddingVertical: 12, textAlignVertical: 'top' },

  pairRow: { flexDirection: 'row', gap: 10 },
  pairCol: { flex: 1, minWidth: 0 },

  priceWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line, borderRadius: 10,
    height: 44, paddingHorizontal: 12,
  },
  priceDollar: { fontFamily: beautyTokens.fontBody, fontSize: 14, color: beautyTokens.textMuted, marginRight: 4 },
  priceInput: { flex: 1, fontFamily: 'Menlo', fontSize: 14, color: beautyTokens.text },

  numWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line, borderRadius: 10,
    height: 44, paddingHorizontal: 12,
  },
  numInput: { flex: 1, fontFamily: 'Menlo', fontSize: 14, color: beautyTokens.text },
  numSuffix: { color: beautyTokens.textMuted, fontSize: 12, marginLeft: 8, fontFamily: beautyTokens.fontBody },

  priceHelp: { fontFamily: 'Menlo', fontSize: 10, color: beautyTokens.textMuted, marginTop: 6 },

  selectBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', height: 44, paddingHorizontal: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: beautyTokens.line, borderRadius: 10,
  },
  selectValue: { fontFamily: beautyTokens.fontBody, fontSize: 14, color: beautyTokens.text },
  selectCaret: { fontSize: 11, color: beautyTokens.textMuted },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15, 17, 21, 0.45)', justifyContent: 'flex-end' },
  sheetCard: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingTop: 14, paddingBottom: 28, paddingHorizontal: 8,
  },
  sheetTitle: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 18, fontWeight: '500',
    color: beautyTokens.text, paddingHorizontal: 12, marginBottom: 6,
  },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 10,
  },
  sheetRowActive: { backgroundColor: beautyTokens.surface },
  sheetRowText: { fontFamily: beautyTokens.fontBody, fontSize: 14, color: beautyTokens.text },
  sheetRowTextActive: { fontWeight: '700' },
  sheetCheck: { fontSize: 14, color: beautyTokens.accentBlueDeep, fontWeight: '700' },

  serverError: { color: beautyTokens.danger, fontSize: 13, paddingVertical: 8, fontFamily: beautyTokens.fontBody },
  footerActions: { flexDirection: 'row', gap: 8, alignItems: 'stretch', marginTop: 4 },
  footerCol: { flex: 1 },
  footerColWide: { flex: 1.6 },
  footnote: { fontSize: 11, color: beautyTokens.textMuted, textAlign: 'center', marginTop: 10, fontFamily: beautyTokens.fontBody },
});
