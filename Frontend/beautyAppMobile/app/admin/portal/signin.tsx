/**
 * Admin Portal — Sign-in screen (RN port of admin-portal-signin.component).
 * Slate-themed. Submits to /api/beauty/login/ via BFF link, then routes to
 * /admin/portal/2fa (BFF redirect handles non-admin bounce server-side).
 */
import React, { useEffect, useState } from 'react';
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
import Svg, { Path, Rect } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { api } from '@/services/api';
import { getDeviceId } from '@/services/deviceId';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import { AdmBrandRow, AdmBtn, AdmHomeIndicator } from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

interface SigninData {
  eyebrow: string;
  title: string;
  sub: string;
  ip_allowlist_label: string;
}

export default function AdminSignin() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<SigninData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolve<SigninData>('beauty_admin_portal_signin')
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

  const onSubmit = async () => {
    setError(null);
    const submit = env?.action === 'render' ? (env._links?.submit as BffLink | undefined) : null;
    if (!submit?.href) return;
    setSubmitting(true);
    try {
      await api.request({
        url: submit.href,
        method: submit.method,
        // /api/beauty/login/ requires device_id in the body (customer/business
        // logins inject it via FormRenderer; this hand-rolled submit must too).
        data: { email: email.trim(), password, device_id: await getDeviceId() },
      });
      const route = nativeRouteFor(submit.screen) ?? '/admin/portal/2fa';
      router.replace(route as any);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const onMagic = () => {
    const link = env?.action === 'render' ? (env._links?.magic as BffLink | undefined) : null;
    const route = nativeRouteFor(link?.screen) ?? '/admin/portal/magic';
    router.push(route as any);
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
          <Text style={styles.label}>Work email</Text>
          <View style={styles.input}>
            <TextInput
              style={styles.inputField}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@beauty.io"
              placeholderTextColor={admTokens.slateMuted}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.input}>
            <TextInput
              style={styles.inputField}
              autoComplete="current-password"
              placeholder="••••••••••"
              placeholderTextColor={admTokens.slateMuted}
              secureTextEntry={!showPw}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPw((s) => !s)} hitSlop={8}>
              <Text style={styles.suffix}>{showPw ? 'hide' : 'show'}</Text>
            </Pressable>
          </View>

          <View style={styles.notice}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={admTokens.noticeText} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </Svg>
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>New device detected</Text>
              <Text style={styles.noticeBody}>
                A 2FA code will be required after password. IP allowlist: {data.ip_allowlist_label}
              </Text>
            </View>
          </View>

          {error ? (
            <View style={styles.serverErr}>
              <Text style={styles.serverErrText}>{error}</Text>
            </View>
          ) : null}

          <AdmBtn variant="slatePrimary" size="lg" full onPress={onSubmit} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Continue →'}
          </AdmBtn>

          <View style={styles.magicRow}>
            <Pressable onPress={onMagic}>
              <Text style={styles.magicLink}>Use magic link →</Text>
            </Pressable>
          </View>

          <View style={styles.inviteInfo}>
            <Text style={styles.inviteText}>
              Admin accounts are invite-only. No self-registration, no password reset. Lost access?
              Ask an Owner to re-invite you from <Text style={styles.mono}>/admin/team</Text>.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.foot}>
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={admTokens.slateMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={3} y={11} width={18} height={11} rx={2} />
          <Path d="M7 11V7a5 5 0 0110 0v4" />
        </Svg>
        <Text style={styles.footMono}>beauty.io/admin/login · v2.4.1</Text>
      </View>
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
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  label: {
    marginBottom: 6,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.slateMuted,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: admTokens.slate2,
    borderWidth: 1,
    borderColor: admTokens.slateLine,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputField: { flex: 1, color: admTokens.white, fontSize: 14 },
  suffix: { color: admTokens.slateMuted, fontFamily: admTokens.fontMono, fontSize: 11, paddingHorizontal: 6, paddingVertical: 4 },
  notice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: admTokens.noticeBg,
    borderWidth: 1,
    borderColor: admTokens.noticeBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  noticeTitle: { color: admTokens.white, fontSize: 12, fontWeight: '600', marginBottom: 2 },
  noticeBody: { color: admTokens.noticeText, fontSize: 11, lineHeight: 16.5 },
  serverErr: {
    backgroundColor: admTokens.errorBg,
    borderWidth: 1,
    borderColor: admTokens.errorBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  serverErrText: { color: admTokens.errorText, fontSize: 12 },
  magicRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  magicLink: {
    color: admTokens.white,
    fontSize: 12,
    textDecorationLine: 'underline',
    opacity: 0.85,
  },
  inviteInfo: {
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: admTokens.slate2,
    borderWidth: 1,
    borderColor: admTokens.slateLine,
    borderRadius: 8,
  },
  inviteText: { color: admTokens.slateMuted, fontSize: 10.5, lineHeight: 16 },
  mono: { color: admTokens.white, fontFamily: admTokens.fontMono },
  foot: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: admTokens.slateLine,
    backgroundColor: admTokens.slate,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footMono: { fontFamily: admTokens.fontMono, fontSize: 10, color: admTokens.slateMuted },
});
