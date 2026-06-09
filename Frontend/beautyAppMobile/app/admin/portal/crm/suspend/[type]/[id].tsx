/**
 * Admin Portal — Suspend / reinstate confirm sheet.
 * URL: `/admin/portal/crm/suspend/<type>/<id>`. Resolver supplies name +
 * is_currently_suspended. Confirm POSTs BFF `submit`, then router.back().
 */
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { api } from '@/services/api';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { AdmBtn } from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

interface SuspendData {
  kind: 'customer' | 'business';
  id: number;
  name: string;
  default_reason: string;
  is_currently_suspended: boolean;
}

export default function AdminSuspendConfirm() {
  const router = useRouter();
  const { type: rawType, id: rawId } = useLocalSearchParams<{ type: string; id: string }>();
  const type = (rawType === 'business' ? 'business' : 'customer') as 'customer' | 'business';
  const id = parseInt(String(rawId ?? ''), 10) || 0;

  const [env, setEnv] = useState<BffEnvelope<SuspendData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolve<SuspendData>('beauty_admin_portal_suspend', { type, id: String(id) })
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          router.replace('/admin/portal/signin' as any);
          return;
        }
        setEnv(e);
        if (e.action === 'render') setReason(e.data?.default_reason ?? '');
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => {
      cancelled = true;
    };
  }, [router, type, id]);

  const onClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/admin/portal/crm' as any);
  };

  const onConfirm = async () => {
    if (env?.action !== 'render') return;
    const data = env.data!;
    const link = env._links?.submit as BffLink | undefined;
    if (!link?.href) {
      setError('Submit endpoint unavailable.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.request({
        url: link.href,
        method: link.method,
        data: {
          type: data.kind,
          id: data.id,
          reason: reason.trim(),
          suspended: !data.is_currently_suspended,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !env) {
    return (
      <View style={styles.loader}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: admTokens.errorText }}>{error}</Text>
      </View>
    );
  }
  if (!env || env.action !== 'render') {
    return (
      <View style={styles.loader}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={admTokens.white} />
      </View>
    );
  }

  const data = env.data!;
  const reinstating = data.is_currently_suspended;
  const kindLabel = data.kind === 'business' ? 'business' : 'customer';

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Stack.Screen options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }} />
      <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.handle} />

        {reinstating ? (
          <View style={[styles.iconBox, { backgroundColor: '#E5F3EA' }]}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#2F7A47" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <Path d="M22 4L12 14.01l-3-3" />
            </Svg>
          </View>
        ) : (
          <View style={[styles.iconBox, { backgroundColor: '#FCE8E5' }]}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={10} />
              <Path d="M4.93 4.93l14.14 14.14" />
            </Svg>
          </View>
        )}

        <Text style={styles.title}>
          {reinstating ? `Reinstate this ${kindLabel}?` : `Suspend this ${kindLabel}?`}
        </Text>
        <Text style={styles.body}>
          {reinstating ? (
            <>
              <Text style={styles.bodyStrong}>{data.name}</Text> will regain access to sign in and
              appear in search again. A reinstatement email is sent automatically.
            </>
          ) : (
            <>
              <Text style={styles.bodyStrong}>{data.name}</Text> will be signed out, hidden from
              search, and notified by email. Existing bookings remain valid until canceled.
            </>
          )}
        </Text>

        <Text style={styles.eyebrow}>
          {reinstating ? 'Note (optional, sent to user)' : 'Reason (sent to user)'}
        </Text>
        <TextInput
          style={styles.reason}
          multiline
          numberOfLines={reinstating ? 3 : 4}
          value={reason}
          onChangeText={setReason}
          placeholder={
            reinstating ? 'Welcome back — your account has been reinstated.' : ''
          }
          placeholderTextColor={admTokens.textMuted}
        />

        <View
          style={[
            styles.notice,
            { backgroundColor: reinstating ? '#E5F3EA' : '#FCE8E5' },
          ]}
        >
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={reinstating ? '#2F7A47' : '#C0392B'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            {reinstating ? (
              <>
                <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <Path d="M22 4L12 14.01l-3-3" />
              </>
            ) : (
              <>
                <Path d="M4 4h16v16H4z" />
                <Path d="M22 6L12 13 2 6" />
              </>
            )}
          </Svg>
          <Text style={[styles.noticeText, { color: reinstating ? '#2F7A47' : '#C0392B' }]}>
            {reinstating
              ? 'An email will be sent confirming the account is active.'
              : 'An email will be sent to the user explaining the suspension.'}
          </Text>
        </View>

        {error ? (
          <View style={styles.err}>
            <Text style={styles.errText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <AdmBtn variant="secondary" size="lg" full onPress={onClose}>
              Cancel
            </AdmBtn>
          </View>
          <View style={{ flex: 1 }}>
            <AdmBtn
              variant={reinstating ? 'primary' : 'danger'}
              size="lg"
              full
              disabled={submitting}
              onPress={onConfirm}
            >
              {submitting ? '…' : reinstating ? 'Reinstate account' : 'Suspend account'}
            </AdmBtn>
          </View>
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,17,21,0.5)', justifyContent: 'flex-end' },
  loader: { flex: 1, backgroundColor: 'rgba(15,17,21,0.5)', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: admTokens.line, alignSelf: 'center', marginBottom: 14 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, color: admTokens.text, marginBottom: 6, fontFamily: 'CormorantGaramond_500Medium' },
  body: { fontSize: 13, color: admTokens.textMuted, lineHeight: 19.5, marginBottom: 14 },
  bodyStrong: { color: admTokens.text, fontWeight: '700' },
  eyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
    marginBottom: 6,
  },
  reason: {
    backgroundColor: admTokens.surface,
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 84,
    fontSize: 13,
    color: admTokens.text,
    lineHeight: 19.5,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  noticeText: { fontSize: 11, fontWeight: '600' },
  err: {
    backgroundColor: 'rgba(192,57,43,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.30)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errText: { fontSize: 12, color: '#C0392B' },
  actions: { flexDirection: 'row', gap: 8 },
});
