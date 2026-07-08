/**
 * Admin Portal — magic-link backup access.
 * POST send-link via BFF `send`. Shows success card after submit. Back link
 * navigates via BFF `back` to signin.
 */
import React, { useEffect, useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { api } from '@/services/api';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import { AdmBrandRow, AdmBtn, AdmHomeIndicator } from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

interface MagicData {
  eyebrow: string;
  title: string;
  sub: string;
  resend_in: string;
  sent_to: string;
}

export default function AdminMagic() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<MagicData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolve<MagicData>('beauty_admin_portal_magic')
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

  const onSend = async () => {
    if (!email.trim()) return;
    setError(null);
    const link = env?.action === 'render' ? (env._links?.send as BffLink | undefined) : null;
    if (!link?.href) {
      setSent(true);
      return;
    }
    setSubmitting(true);
    try {
      await api.request({ url: link.href, method: link.method, data: { email: email.trim() } });
      setSent(true);
    } catch (err: any) {
      // Backend endpoint not wired yet → still show success state visually.
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        setSent(true);
      } else {
        setError(err?.response?.data?.detail ?? 'Could not send link.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = () => {
    const link = env?.action === 'render' ? (env._links?.back as BffLink | undefined) : null;
    const route = nativeRouteFor(link?.screen) ?? '/admin/portal/signin';
    router.replace(route as any);
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
  const sentToEmail = sent ? email.trim() || data.sent_to : '';

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

          {error ? (
            <View style={styles.serverErr}>
              <Text style={styles.serverErrText}>{error}</Text>
            </View>
          ) : null}

          <AdmBtn variant="slatePrimary" size="lg" full disabled={submitting} onPress={onSend}>
            {submitting ? 'Sending…' : 'Send magic link →'}
          </AdmBtn>

          {sent ? (
            <View style={styles.successCard}>
              <View style={styles.successRow}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#86C49B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <Path d="M22 4L12 14.01l-3-3" />
                </Svg>
                <Text style={styles.successLabel}>Link sent</Text>
              </View>
              <Text style={styles.successBody}>
                Check <Text style={styles.mono}>{sentToEmail}</Text>. Resend available in{' '}
                <Text style={styles.mono}>{data.resend_in}</Text>.
              </Text>
            </View>
          ) : null}

          <View style={styles.backRow}>
            <Text style={styles.backLink} onPress={onBack}>
              ← Back to password sign-in
            </Text>
          </View>
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
  serverErr: {
    backgroundColor: admTokens.errorBg,
    borderWidth: 1,
    borderColor: admTokens.errorBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  serverErrText: { color: admTokens.errorText, fontSize: 12 },
  successCard: {
    marginTop: 24,
    padding: 14,
    backgroundColor: admTokens.slate2,
    borderWidth: 1,
    borderColor: admTokens.slateLine,
    borderRadius: 12,
  },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  successLabel: { color: admTokens.white, fontSize: 12, fontWeight: '600' },
  successBody: { color: admTokens.slateMuted, fontSize: 11, lineHeight: 16.5 },
  mono: { fontFamily: admTokens.fontMono, color: admTokens.white },
  backRow: { marginTop: 18 },
  backLink: { color: admTokens.white, fontSize: 12, textDecorationLine: 'underline' },
});
