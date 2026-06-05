/**
 * Business email & contact — mirrors Angular beauty-business-email-contact.component.
 * Sign-in email · public email · phone · show-publicly switch · info banner.
 * PATCHes to BFF-supplied submit_href.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { patchBusinessContact } from '@/services/businessMgmt';
import { BeautyShell } from '@/components/BeautyShell';
import { ProvBtn, ProvCard, ProvSubHeader } from '@/components/business';
import { beautyTokens } from '../../../tamagui.config';

interface ContactData {
  contact?: {
    email?: string;
    public_email?: string;
    contact_phone?: string;
    show_phone_publicly?: boolean;
  };
  submit_href?: string;
  submit_method?: string;
}

export default function ContactScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ContactData> | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [publicEmail, setPublicEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      const e = await resolve<ContactData>('beauty_business_email_contact');
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        router.replace((route ?? '/(auth)/business-login') as any);
        return;
      }
      setEnv(e);
    } catch (err: any) {
      setLoadErr(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (env?.action !== 'render') return;
    const c = env.data?.contact ?? {};
    setEmail(c.email || '');
    setPublicEmail(c.public_email || '');
    setPhone(c.contact_phone || '');
    setShowPhone(!!c.show_phone_publicly);
  }, [env]);

  const links: Record<string, BffLink> = (env?._links as Record<string, BffLink>) ?? {};
  const data = env?.action === 'render' ? env.data : undefined;

  const goBack = () => {
    const link = links['settings'];
    if (link) navigateLink(router, link);
    else router.replace('/business/settings' as any);
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const href = data?.submit_href || '/api/beauty/protected/business/account/contact/';
    try {
      await patchBusinessContact(href, {
        public_email: publicEmail,
        contact_phone: phone,
        show_phone_publicly: showPhone,
      });
      setMessage({ text: 'Saved.', isError: false });
    } catch (err: any) {
      setMessage({ text: err?.response?.data?.detail || 'Could not save. Please try again.', isError: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ProvSubHeader
        back="Settings"
        title="Email & contact"
        onBackPress={goBack}
        right={
          <ProvBtn variant="success" size="sm" disabled={busy} onPress={save}>
            {busy ? 'Saving…' : 'Save'}
          </ProvBtn>
        }
      />

      {!env && !loadErr ? (
        <View style={styles.loadingBox}><ActivityIndicator color={beautyTokens.accentBlueDeep} /></View>
      ) : loadErr ? (
        <View style={styles.errorBox}><Text style={styles.errorText}>{loadErr}</Text></View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>
            Customers see your contact info on bookings and receipts. Changes apply to new bookings only.
          </Text>

          <Text style={styles.groupLabel}>EMAIL</Text>
          <ProvCard padding={16} style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.lab}>SIGN-IN EMAIL<Text style={styles.req}> *</Text></Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoComplete="email"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
              <Text style={styles.micro}>Used to log in and receive booking notifications.</Text>
            </View>
            <View style={styles.fieldLast}>
              <Text style={styles.lab}>PUBLIC BUSINESS EMAIL</Text>
              <TextInput
                value={publicEmail}
                onChangeText={setPublicEmail}
                autoComplete="email"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
              <Text style={styles.micro}>Shown on your storefront. Leave blank to hide.</Text>
            </View>
          </ProvCard>

          <Text style={styles.groupLabel}>PHONE</Text>
          <ProvCard padding={16} style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.lab}>CONTACT PHONE<Text style={styles.req}> *</Text></Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                autoComplete="tel"
                keyboardType="phone-pad"
                style={[styles.input, styles.inputMono]}
              />
              <Text style={styles.micro}>Customers can call this number to reach you about bookings.</Text>
            </View>
            <View style={styles.showRow}>
              <View style={styles.showText}>
                <Text style={styles.showLabel}>Show phone publicly</Text>
                <Text style={styles.showSub}>Display on your storefront</Text>
              </View>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: showPhone }}
                onPress={() => setShowPhone(!showPhone)}
                style={[styles.switch, showPhone && styles.switchOn]}
              >
                <View style={[styles.thumb, showPhone && styles.thumbOn]} />
              </Pressable>
            </View>
          </ProvCard>

          <View style={styles.infoBanner}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={9} />
              <Path d="M12 8v5M12 17v.01" />
            </Svg>
            <Text style={styles.infoText}>We'll send a verification link to confirm any change to your sign-in email.</Text>
          </View>

          {!!message && (
            <Text
              accessibilityRole={message.isError ? 'alert' : undefined}
              style={[styles.msg, message.isError && styles.msgError]}
            >
              {message.text}
            </Text>
          )}
        </ScrollView>
      )}
    </BeautyShell>
  );
}

const styles = StyleSheet.create({
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flex: 1, padding: 16 },
  errorText: { color: beautyTokens.danger, fontSize: 13, fontFamily: beautyTokens.fontBody },

  body: { flex: 1, backgroundColor: beautyTokens.surface },
  bodyContent: { padding: 16, paddingTop: 20 },

  hint: { fontSize: 12, color: beautyTokens.textMuted, lineHeight: 18, marginBottom: 14, fontFamily: beautyTokens.fontBody },
  groupLabel: { fontSize: 10, fontWeight: '700', color: beautyTokens.textMuted, letterSpacing: 1.2, marginBottom: 8, paddingLeft: 4, fontFamily: beautyTokens.fontBody },
  card: { marginBottom: 14 },

  field: { marginBottom: 14 },
  fieldLast: { marginBottom: 0 },
  lab: { fontSize: 11, fontWeight: '600', color: beautyTokens.textMuted, letterSpacing: 0.6, marginBottom: 6, fontFamily: beautyTokens.fontBody },
  req: { color: beautyTokens.danger },
  input: {
    width: '100%', height: 44, paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line, borderRadius: 10,
    fontFamily: beautyTokens.fontBody, fontSize: 14, color: beautyTokens.text,
  },
  inputMono: { fontFamily: 'Menlo' },
  micro: { fontSize: 11, color: beautyTokens.textMuted, marginTop: 6, fontFamily: beautyTokens.fontBody },

  showRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: 'rgba(207,227,245,0.4)',
    borderWidth: 1, borderColor: 'rgba(125,168,207,0.33)',
    borderRadius: 10, marginTop: 14,
  },
  showText: { flex: 1 },
  showLabel: { fontSize: 12, fontWeight: '600', color: beautyTokens.text, fontFamily: beautyTokens.fontBody },
  showSub: { fontSize: 11, color: beautyTokens.textMuted, marginTop: 2, fontFamily: beautyTokens.fontBody },

  switch: {
    width: 44, height: 28, borderRadius: 14,
    backgroundColor: beautyTokens.line,
    padding: 3, justifyContent: 'center',
  },
  switchOn: { backgroundColor: beautyTokens.success },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  thumbOn: { marginLeft: 16 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 10, padding: 10, paddingHorizontal: 12,
    marginTop: 4,
  },
  infoText: { fontSize: 11, color: beautyTokens.textMuted, lineHeight: 17, flex: 1, fontFamily: beautyTokens.fontBody },

  msg: { paddingVertical: 12, color: beautyTokens.accentBlueText, fontSize: 13, fontFamily: beautyTokens.fontBody },
  msgError: { color: beautyTokens.danger },
});
