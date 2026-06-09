/**
 * Admin Portal — IP allowlist mismatch warning.
 * Centered amber alert + IP block + VPN nav + exception POST.
 */
import React, { useEffect, useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { api } from '@/services/api';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import { AdmBrandRow, AdmBtn, AdmHomeIndicator } from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

interface IpData {
  title: string;
  sub: string;
  your_ip: string;
  allowlist: string;
}

export default function AdminIpWarning() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<IpData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolve<IpData>('beauty_admin_portal_ip_warning')
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

  const onVpn = () => {
    const link = env?.action === 'render' ? (env._links?.vpn as BffLink | undefined) : null;
    const route = nativeRouteFor(link?.screen) ?? '/admin/portal/signin';
    router.replace(route as any);
  };

  const onException = async () => {
    setError(null);
    const link = env?.action === 'render' ? (env._links?.exception as BffLink | undefined) : null;
    if (!link?.href) {
      setRequested(true);
      return;
    }
    setSubmitting(true);
    try {
      await api.request({ url: link.href, method: link.method });
      setRequested(true);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        setRequested(true);
      } else {
        setError(err?.response?.data?.detail ?? 'Could not request exception.');
      }
    } finally {
      setSubmitting(false);
    }
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
        <View style={styles.header}>
          <AdmBrandRow />
        </View>

        <View style={styles.body}>
          <View style={styles.warnIcon}>
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#FFD27A" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </Svg>
          </View>

          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.sub}>{data.sub}</Text>

          <View style={styles.ipBlock}>
            <Text style={styles.lbl}>Your IP</Text>
            <Text style={styles.val}>{data.your_ip}</Text>
            <Text style={styles.lbl}>Allowlist</Text>
            <Text style={[styles.val, { marginBottom: 0 }]}>{data.allowlist}</Text>
          </View>

          {error ? (
            <View style={styles.serverErr}>
              <Text style={styles.serverErrText}>{error}</Text>
            </View>
          ) : null}

          {requested ? (
            <View style={styles.successCard}>
              <Text style={styles.successText}>✓ Exception request submitted. Security lead notified.</Text>
            </View>
          ) : null}

          <AdmBtn variant="slatePrimary" size="lg" full onPress={onVpn}>
            Connect to VPN
          </AdmBtn>

          <View style={styles.exceptionRow}>
            <Text style={[styles.exceptionLink, submitting && { opacity: 0.5 }]} onPress={submitting ? undefined : onException}>
              {submitting ? 'Requesting…' : 'Request exception →'}
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
  header: { paddingHorizontal: 24, paddingTop: 20 },
  body: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 32 },
  warnIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,196,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,196,0,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 28, color: admTokens.white, marginBottom: 10, fontFamily: 'CormorantGaramond_500Medium' },
  sub: { fontSize: 13, color: admTokens.slateMuted, lineHeight: 20.15, marginBottom: 18 },
  ipBlock: {
    backgroundColor: admTokens.slate2,
    borderWidth: 1,
    borderColor: admTokens.slateLine,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  lbl: { color: admTokens.slateMuted, fontFamily: admTokens.fontMono, fontSize: 11, marginBottom: 4 },
  val: { color: admTokens.white, fontFamily: admTokens.fontMono, fontSize: 13, marginBottom: 10 },
  serverErr: {
    backgroundColor: admTokens.errorBg,
    borderWidth: 1,
    borderColor: admTokens.errorBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  serverErrText: { color: admTokens.errorText, fontSize: 12 },
  successCard: {
    backgroundColor: 'rgba(134,196,155,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(134,196,155,0.30)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  successText: { color: '#86C49B', fontSize: 12 },
  exceptionRow: { marginTop: 12, alignItems: 'center' },
  exceptionLink: { color: admTokens.white, fontSize: 12, textDecorationLine: 'underline', opacity: 0.85 },
});
