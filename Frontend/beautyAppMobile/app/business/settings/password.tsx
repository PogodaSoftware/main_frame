/**
 * Business change password — mirrors Angular beauty-business-change-password.component.
 * Form card · current + new password · 4-segment strength meter · update button.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { resolve } from '@/services/bff';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { changeBusinessPassword } from '@/services/businessMgmt';
import { BeautyShell } from '@/components/BeautyShell';
import { ProvBtn, ProvCard, ProvSubHeader } from '@/components/business';
import { beautyTokens } from '../../../tamagui.config';

interface ChangePasswordData {
  submit_href?: string;
  submit_method?: string;
}

function strengthScore(p: string): number {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  return Math.min(score, 4);
}

function strengthLabel(score: number): string {
  if (score <= 1) return 'Weak password — add length and variety.';
  if (score === 2) return 'Okay — could be stronger.';
  if (score === 3) return 'Good password.';
  return 'Strong password — looks good.';
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<ChangePasswordData> | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      const e = await resolve<ChangePasswordData>('beauty_business_change_password');
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

  const links: Record<string, BffLink> = (env?._links as Record<string, BffLink>) ?? {};
  const data = env?.action === 'render' ? env.data : undefined;

  const score = useMemo(() => strengthScore(newPassword), [newPassword]);

  const goBack = () => {
    const link = links['settings'];
    if (link) navigateLink(router, link);
    else router.replace('/business/settings' as any);
  };

  const submit = async () => {
    if (busy) return;
    setMessage(null);
    if (!currentPassword || !newPassword) {
      setMessage({ text: 'Both fields are required.', isError: true });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ text: 'New password must be at least 8 characters.', isError: true });
      return;
    }
    const href = data?.submit_href || '/api/beauty/protected/business/account/password/';
    setBusy(true);
    try {
      await changeBusinessPassword(href, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage({ text: 'Password updated.', isError: false });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setMessage({ text: err?.response?.data?.detail || 'Could not change password.', isError: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ProvSubHeader back="Settings" title="Change password" onBackPress={goBack} />

      {!env && !loadErr ? (
        <View style={styles.loadingBox}><ActivityIndicator color={beautyTokens.accentBlueDeep} /></View>
      ) : loadErr ? (
        <View style={styles.errorBox}><Text style={styles.errorText}>{loadErr}</Text></View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <ProvCard padding={16}>
            <View style={styles.field}>
              <Text style={styles.lab}>CURRENT PASSWORD<Text style={styles.req}> *</Text></Text>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showPwd}
                autoComplete="current-password"
                placeholder="At least 8 characters"
                placeholderTextColor={beautyTokens.textMuted}
                style={styles.input}
                testID="current-password"
              />
            </View>

            <View style={[styles.field, styles.fieldLast]}>
              <Text style={styles.lab}>NEW PASSWORD<Text style={styles.req}> *</Text></Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPwd}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                placeholderTextColor={beautyTokens.textMuted}
                style={styles.input}
                testID="new-password"
              />

              <Pressable
                style={styles.showRow}
                onPress={() => setShowPwd((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: showPwd }}
                testID="show-password-toggle"
              >
                <View style={[styles.checkbox, showPwd && styles.checkboxOn]}>
                  {showPwd ? <Text style={styles.checkboxTick}>✓</Text> : null}
                </View>
                <Text style={styles.showRowText}>Show password</Text>
              </Pressable>

              {!!newPassword && (
                <>
                  <View style={styles.strength}>
                    {[0, 1, 2, 3].map((i) => {
                      const on = i < score;
                      const strong = on && score >= 3;
                      const mid = on && score < 3;
                      return (
                        <View
                          key={i}
                          style={[
                            styles.seg,
                            strong && styles.segStrong,
                            mid && styles.segMid,
                          ]}
                        />
                      );
                    })}
                  </View>
                  <Text style={styles.strengthHint}>{strengthLabel(score)}</Text>
                </>
              )}
            </View>

            <ProvBtn variant="success" full size="lg" disabled={busy} onPress={submit}>
              {busy ? 'Saving…' : 'Update password'}
            </ProvBtn>
          </ProvCard>

          {!!message && (
            <Text
              accessibilityRole={message.isError ? 'alert' : undefined}
              style={[styles.msg, message.isError && styles.msgError]}
              testID="change-password-msg"
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

  field: { marginBottom: 14 },
  fieldLast: { marginBottom: 14 },
  lab: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: beautyTokens.textMuted, marginBottom: 6, fontFamily: beautyTokens.fontBody },
  req: { color: beautyTokens.danger },
  input: {
    width: '100%', height: 44, paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 10,
    fontFamily: beautyTokens.fontBody, fontSize: 14, color: beautyTokens.text,
  },
  showRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: beautyTokens.line, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: beautyTokens.accentBlueDeep, borderColor: beautyTokens.accentBlueDeep },
  checkboxTick: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  showRowText: { fontFamily: beautyTokens.fontBody, fontSize: 13, color: beautyTokens.text },
  strength: { flexDirection: 'row', gap: 6, marginTop: 8 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: beautyTokens.line },
  segStrong: { backgroundColor: beautyTokens.success },
  segMid: { backgroundColor: '#E5BE5C' },
  strengthHint: { fontSize: 11, color: beautyTokens.textMuted, marginTop: 6, fontFamily: beautyTokens.fontBody },

  msg: { paddingVertical: 12, color: beautyTokens.accentBlueText, fontSize: 13, fontFamily: beautyTokens.fontBody },
  msgError: { color: beautyTokens.danger },
});
