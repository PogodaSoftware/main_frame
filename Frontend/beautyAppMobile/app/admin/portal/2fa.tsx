/**
 * Admin Portal — 2FA / TOTP entry screen.
 * Slate-themed. 6 digit cells driven by a hidden single TextInput. Submit POSTs
 * verify endpoint via BFF `submit` link, then routes to dashboard.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useRouter, Stack } from 'expo-router';
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
import { nativeRouteFor } from '@/bff/linkAction';
import { AdmBrandRow, AdmBtn, AdmHomeIndicator } from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

interface TwoFAData {
  eyebrow: string;
  title: string;
  sub: string;
  expires_in: string;
}

const CELLS = [0, 1, 2, 3, 4, 5];

export default function Admin2FA() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<TwoFAData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    let cancelled = false;
    resolve<TwoFAData>('beauty_admin_portal_2fa')
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          if (route) router.replace(route as any);
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
  }, [router]);

  const onChange = (text: string) => {
    setCode(text.replace(/\D/g, '').slice(0, 6));
  };

  const onVerify = async () => {
    if (code.length !== 6) return;
    setError(null);
    const submit = env?.action === 'render' ? (env._links?.submit as BffLink | undefined) : null;
    if (!submit?.href) {
      const route = nativeRouteFor('beauty_admin_portal_dashboard') ?? '/admin/portal/dashboard';
      router.replace(route as any);
      return;
    }
    setSubmitting(true);
    try {
      await api.request({ url: submit.href, method: submit.method, data: { code } });
      const route = nativeRouteFor(submit.screen) ?? '/admin/portal/dashboard';
      router.replace(route as any);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const navLink = (rel: 'recovery' | 'magic') => {
    const link = env?.action === 'render' ? (env._links?.[rel] as BffLink | undefined) : null;
    const route = nativeRouteFor(link?.screen);
    if (route) router.push(route as any);
  };

  if (!env || env.action !== 'render') {
    return (
      <View style={styles.loader}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={admTokens.white} />
      </View>
    );
  }

  const data = env.data!;
  const focusIndex = Math.min(code.length, 5);

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <AdmBrandRow />
          <Text style={styles.eyebrow}>{data.eyebrow}</Text>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.sub}>{data.sub}</Text>
        </View>

        <View style={styles.body}>
          <Pressable
            style={styles.digits}
            onPress={() => inputRef.current?.focus()}
            accessibilityLabel="6-digit verification code"
          >
            {CELLS.map((i) => {
              const focused = i === focusIndex;
              return (
                <View key={i} style={[styles.cell, focused && styles.cellFocus]}>
                  <Text style={[styles.cellText, focused && { color: admTokens.slate }]}>{code[i] ?? ''}</Text>
                </View>
              );
            })}
          </Pressable>
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={onChange}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
          />

          <View style={styles.timer}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={admTokens.slateMuted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={10} />
              <Path d="M12 7v5l3 2" />
            </Svg>
            <Text style={styles.timerText}>
              Code expires in <Text style={styles.timerMono}>{data.expires_in}</Text>
            </Text>
          </View>

          {error ? (
            <View style={styles.serverErr}>
              <Text style={styles.serverErrText}>{error}</Text>
            </View>
          ) : null}

          <AdmBtn
            variant="slatePrimary"
            size="lg"
            full
            disabled={code.length !== 6 || submitting}
            onPress={onVerify}
          >
            {submitting ? 'Verifying…' : 'Verify code →'}
          </AdmBtn>

          <Text style={styles.recover}>
            Lost your authenticator?{' '}
            <Text style={styles.recoverLink} onPress={() => navLink('recovery')}>
              Use a recovery code
            </Text>{' '}
            or{' '}
            <Text style={styles.recoverLink} onPress={() => navLink('magic')}>
              email a magic link
            </Text>
            .
          </Text>
        </View>
      </ScrollView>
      <AdmHomeIndicator tone="slate" />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: admTokens.slate },
  loader: { flex: 1, backgroundColor: admTokens.slate, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  eyebrow: {
    marginTop: 28,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.slateMuted,
  },
  title: { fontSize: 32, lineHeight: 36, color: admTokens.white, fontFamily: 'CormorantGaramond_500Medium' },
  sub: { marginTop: 8, fontSize: 13, color: admTokens.slateMuted, lineHeight: 19.5, maxWidth: 320 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 4 },
  digits: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  cell: {
    width: 46,
    height: 56,
    backgroundColor: admTokens.slate2,
    borderWidth: 1,
    borderColor: admTokens.slateLine,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFocus: { backgroundColor: admTokens.white, borderColor: admTokens.red, borderWidth: 2 },
  cellText: { fontFamily: admTokens.fontMono, fontSize: 24, fontWeight: '600', color: admTokens.white, lineHeight: 24 },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: admTokens.slate2,
    borderWidth: 1,
    borderColor: admTokens.slateLine,
    borderRadius: 10,
    marginBottom: 14,
  },
  timerText: { color: admTokens.slateMuted, fontSize: 12 },
  timerMono: { fontFamily: admTokens.fontMono, color: admTokens.white, fontWeight: '600' },
  serverErr: {
    backgroundColor: admTokens.errorBg,
    borderWidth: 1,
    borderColor: admTokens.errorBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  serverErrText: { color: admTokens.errorText, fontSize: 12 },
  recover: { marginTop: 18, fontSize: 12, color: admTokens.slateMuted, lineHeight: 19.2 },
  recoverLink: { color: admTokens.white, textDecorationLine: 'underline' },
});
