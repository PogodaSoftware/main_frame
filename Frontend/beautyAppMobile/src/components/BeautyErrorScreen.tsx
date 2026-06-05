/**
 * Shared error surface — mirrors the Claude-design `error-generic`,
 * `error-404` and `error-offline` artboards (and the Angular web error
 * pages). One layout, parameterised by eyebrow / title / body / code / icon:
 *   - back chevron header
 *   - centered baby-blue disc with a circled icon
 *   - caps blue eyebrow, serif title, muted body
 *   - mono "code · note" pill
 *   - Try again (white) + Go home (ink) row
 *   - Contact support link
 *   - optional bottom nav (shown on generic/offline, hidden on 404)
 */
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/BottomNav';

const C = {
  surface: '#F2F2F2',
  surface2: '#E9E9EB',
  line: '#DCDCDF',
  text: '#0F1115',
  textMuted: '#6B6F77',
  accentBlue: '#CFE3F5',
  accentBlueLight: '#E3F0FB',
  accentBlueDeep: '#7DA8CF',
  accentBlueText: '#1a3a52',
  ink: '#0A0A0B',
  white: '#FFFFFF',
};
const FONT_BODY = 'Inter_400Regular';
const FONT_BODY_SEMI = 'Inter_600SemiBold';
const FONT_DISPLAY = 'CormorantGaramond_500Medium';
const FONT_MONO = 'Menlo';

export interface BeautyErrorScreenProps {
  eyebrow: string;
  title: string;
  body: string;
  code: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  retryLabel?: string;
  onRetry?: () => void;
  /** Show the 4-tab bottom nav (generic/offline). 404 hides it. */
  showNav?: boolean;
  /** Allow back chevron (hidden when there's nowhere to go back to). */
  showBack?: boolean;
}

export function BeautyErrorScreen({
  eyebrow,
  title,
  body,
  code,
  iconName = 'alert',
  retryLabel = 'Try again',
  onRetry,
  showNav = false,
  showBack = true,
}: BeautyErrorScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goHome = () => router.replace('/(customer)/home' as any);
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else goHome();
  };

  return (
    <View style={[styles.app, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {showBack ? (
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      <View style={styles.center}>
        <View style={styles.disc}>
          <Ionicons name={iconName} size={30} color={C.accentBlueText} />
        </View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        <View style={styles.codePill}>
          <Text style={styles.codeText}>{code}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onRetry ?? goBack}
            style={({ pressed }) => [styles.btnGhost, pressed && styles.btnGhostPressed]}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={14} color={C.text} />
            <Text style={styles.btnGhostText}>{retryLabel}</Text>
          </Pressable>
          <Pressable
            onPress={goHome}
            style={({ pressed }) => [styles.btnInk, pressed && styles.btnInkPressed]}
            accessibilityRole="button"
          >
            <Ionicons name="home" size={14} color={C.white} />
            <Text style={styles.btnInkText}>Go home</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => Linking.openURL('mailto:support@beauty.io').catch(() => {})}
          accessibilityRole="button"
        >
          <Text style={styles.support}>Contact support</Text>
        </Pressable>
      </View>

      {showNav ? (
        <BottomNav active="home" />
      ) : (
        <View style={{ height: insets.bottom }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.surface },
  header: {
    height: 56, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: C.line,
    flexDirection: 'row', alignItems: 'center',
  },
  iconBtn: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconBtnPressed: { backgroundColor: C.surface2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  disc: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.accentBlueLight, borderWidth: 1, borderColor: C.accentBlue,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11, fontFamily: FONT_BODY_SEMI, color: C.accentBlueDeep,
    letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8,
  },
  title: {
    fontFamily: FONT_DISPLAY, fontSize: 32, color: C.text,
    letterSpacing: 0.2, textAlign: 'center', marginBottom: 10, lineHeight: 36,
  },
  body: {
    fontSize: 14, color: C.textMuted, textAlign: 'center',
    lineHeight: 20, fontFamily: FONT_BODY, marginBottom: 18, maxWidth: 320,
  },
  codePill: {
    backgroundColor: C.surface2, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 22,
  },
  codeText: { fontSize: 12, fontFamily: FONT_MONO, color: C.textMuted },

  actions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btnGhost: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 48, paddingHorizontal: 22, borderRadius: 10,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
  },
  btnGhostPressed: { backgroundColor: C.surface2 },
  btnGhostText: { color: C.text, fontSize: 14, fontFamily: FONT_BODY_SEMI },
  btnInk: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 48, paddingHorizontal: 22, borderRadius: 10,
    backgroundColor: C.ink, borderWidth: 1, borderColor: C.ink,
  },
  btnInkPressed: { backgroundColor: '#1F1F22' },
  btnInkText: { color: C.white, fontSize: 14, fontFamily: FONT_BODY_SEMI },

  support: {
    fontSize: 13, color: C.textMuted, fontFamily: FONT_BODY,
    textDecorationLine: 'underline',
  },
});
