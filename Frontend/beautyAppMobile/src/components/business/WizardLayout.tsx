/**
 * WizardLayout — shared chrome for the business application wizard.
 * Mirrors Angular `.business-shell` + `.biz-header` + `.step-progress` chrome.
 *
 * Header: brand mark + Beauty + APPLICATION pill + "Step N of M" mono counter.
 * Progress: pill row with check or step-num bubble + label per step.
 * Body: scrollable children w/ step title + optional subtitle.
 * Footer: Back / Continue actions (Continue full when no prev).
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { beautyTokens } from '../../../tamagui.config';
import { navigateLink } from '@/bff/linkAction';
import type { BffEnvelope, BffLink } from '@/bff/types';

const STEP_LABELS = ['About', 'Services', 'Payments', 'Hours', 'Tools', 'Review'];

export interface WizardData {
  step: string;
  step_index: number;
  total_steps: number;
  step_title: string;
}

export interface WizardLayoutProps<T extends WizardData> {
  envelope: BffEnvelope<T> | null;
  subtitle?: string;
  children?: React.ReactNode;
  onContinue?: () => void | Promise<void>;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  error?: string | null;
}

export function WizardLayout<T extends WizardData>({
  envelope,
  subtitle,
  children,
  onContinue,
  continueLabel,
  continueDisabled = false,
  continueLoading = false,
  error,
}: WizardLayoutProps<T>) {
  const router = useRouter();
  const progressRef = React.useRef<ScrollView>(null);

  if (!envelope || envelope.action !== 'render' || !envelope.data) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={beautyTokens.accentBlueDeep} />
      </View>
    );
  }

  const { step_index, total_steps, step_title } = envelope.data;
  const links: Record<string, BffLink> = (envelope._links as Record<string, BffLink>) ?? {};
  const prev = links.prev;
  const next = links.next;

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.brandIcon}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="#fff">
            <Path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
          </Svg>
        </View>
        <Text style={styles.brandName} testID="wizard-brand-name">Beauty</Text>
        <View style={styles.applyBadge}>
          <Text style={styles.applyBadgeText}>APPLICATION</Text>
        </View>
        <View style={styles.spacer} />
        <Text style={styles.stepCounter} testID="wizard-step-counter">
          Step {step_index} of {total_steps}
        </Text>
      </View>

      <View style={styles.progressBar}>
        <ScrollView ref={progressRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progressList}>
          {STEP_LABELS.slice(0, total_steps).map((label, idx) => {
            const i = idx + 1;
            const isCurrent = i === step_index;
            const isDone = i < step_index;
            return (
              <View
                key={label}
                style={[styles.stepPill, isCurrent && styles.stepPillCurrent]}
                onLayout={isCurrent ? (e) => {
                  const { x, width } = e.nativeEvent.layout;
                  // Keep the active pill fully on-screen (esp. the last "Review" step).
                  progressRef.current?.scrollTo({ x: Math.max(0, x + width - 320), animated: false });
                } : undefined}
              >
                <View
                  style={[
                    styles.stepNum,
                    isCurrent && styles.stepNumCurrent,
                    isDone && styles.stepNumDone,
                  ]}
                >
                  {isDone ? (
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M5 12l4 4L19 7" />
                    </Svg>
                  ) : (
                    <Text style={[styles.stepNumText, isCurrent && styles.stepNumTextCurrent]}>{i}</Text>
                  )}
                </View>
                <Text style={[styles.stepName, isCurrent && styles.stepNameCurrent]} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} testID="wizard-step-title">{step_title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {children}
        {!!error && (
          <Text style={styles.serverError} testID="wizard-error" accessibilityRole="alert">{error}</Text>
        )}
      </ScrollView>

      <View style={styles.footerActions}>
        {prev ? (
          <Pressable
            onPress={() => navigateLink(router, prev, { replace: true })}
            testID="wizard-back"
            style={[styles.footerBtn, styles.btnOutline, { flex: 1 }]}
            accessibilityRole="button"
          >
            <Text style={[styles.footerBtnText, styles.btnOutlineText]}>{prev.prompt ?? 'Back'}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={async () => {
            if (continueDisabled || continueLoading) return;
            if (onContinue) await onContinue();
            else if (next) navigateLink(router, next, { replace: true });
          }}
          disabled={continueDisabled || continueLoading}
          testID="wizard-continue"
          style={[
            styles.footerBtn,
            styles.btnConfirm,
            { flex: 1 },
            (continueDisabled || continueLoading) && styles.btnDisabled,
          ]}
          accessibilityRole="button"
        >
          {continueLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.footerBtnText, styles.btnConfirmText]}>
              {continueLabel ?? next?.prompt ?? 'Continue'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: beautyTokens.surface },

  shell: { flex: 1, backgroundColor: beautyTokens.surface },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, height: 56,
    borderBottomWidth: 1, borderBottomColor: beautyTokens.line,
    backgroundColor: beautyTokens.surface,
  },
  brandIcon: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: beautyTokens.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontFamily: beautyTokens.fontDisplay, fontSize: 22, color: beautyTokens.text },
  applyBadge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: beautyTokens.accentBlue,
    borderWidth: 1, borderColor: 'rgba(125,168,207,0.35)',
  },
  applyBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: beautyTokens.accentBlueText, fontFamily: beautyTokens.fontBody },
  spacer: { flex: 1 },
  stepCounter: { fontFamily: 'Menlo', fontSize: 11, color: beautyTokens.textMuted },

  progressBar: {
    paddingVertical: 10,
    backgroundColor: beautyTokens.surface,
    borderBottomWidth: 1, borderBottomColor: beautyTokens.line,
  },
  progressList: { flexDirection: 'row', paddingHorizontal: 8, gap: 6, alignItems: 'center' },
  stepPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, paddingVertical: 3 },
  // Active step = baby-blue pill wrapping the number + label (matches Angular).
  stepPillCurrent: {
    backgroundColor: beautyTokens.accentBlue,
    borderRadius: 999,
    paddingHorizontal: 8,
    borderWidth: 1, borderColor: 'rgba(125,168,207,0.35)',
  },
  stepNum: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1, borderColor: beautyTokens.line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumCurrent: { backgroundColor: beautyTokens.accentBlueDeep, borderColor: beautyTokens.accentBlueDeep },
  stepNumDone: { backgroundColor: beautyTokens.success, borderColor: beautyTokens.success },
  stepNumText: { fontSize: 9, fontWeight: '700', color: beautyTokens.textMuted, fontFamily: beautyTokens.fontBody },
  stepNumTextCurrent: { color: '#FFFFFF' },
  stepName: { fontSize: 10, color: beautyTokens.textMuted, fontFamily: beautyTokens.fontBody, flexShrink: 1 },
  stepNameCurrent: { color: beautyTokens.accentBlueText, fontWeight: '700' },

  body: { flex: 1, backgroundColor: beautyTokens.surface },
  bodyContent: { padding: 16, paddingBottom: 28, gap: 14 },
  titleBlock: { gap: 4 },
  title: { fontFamily: beautyTokens.fontDisplay, fontSize: 26, fontWeight: '500', color: beautyTokens.text },
  subtitle: { fontSize: 12, color: beautyTokens.textMuted, lineHeight: 18, fontFamily: beautyTokens.fontBody },
  serverError: { color: beautyTokens.danger, fontSize: 13, fontFamily: beautyTokens.fontBody },

  footerActions: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: beautyTokens.line,
    backgroundColor: '#FFFFFF',
  },
  footerBtn: {
    height: 48, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  btnOutline: { borderWidth: 1.5, borderColor: beautyTokens.ink, backgroundColor: 'transparent' },
  btnConfirm: { backgroundColor: '#2F7A47', borderWidth: 1, borderColor: '#2F7A47' },
  btnDisabled: { opacity: 0.5 },
  footerBtnText: { fontFamily: beautyTokens.fontBody, fontSize: 14, fontWeight: '600' },
  btnOutlineText: { color: beautyTokens.ink },
  btnConfirmText: { color: '#FFFFFF' },
});
