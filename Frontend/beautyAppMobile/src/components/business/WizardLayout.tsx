/**
 * WizardLayout — shared chrome for the business application wizard.
 * Mirrors the Angular ``.business-shell`` + ``.biz-header`` + ``.step-progress``
 * layout from ``beauty-business-application.component.scss``.
 *
 * Renders:
 *   - top header w/ brand mark, badge, step counter ("Step N of 6")
 *   - horizontal StepPillRow with current step highlighted
 *   - body slot (children)
 *   - sticky bottom Back / Continue bar driven by ``_links.prev`` / ``_links.next``
 *
 * No business logic; just chrome. Each step screen passes its own
 * persistence handler in ``onContinue`` so this component stays generic.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import {
  H1,
  Paragraph,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from 'tamagui';

import { beautyTokens } from '../../../tamagui.config';
import {
  BeautyButton,
  LoadingScreen,
  StepPillRow,
} from '@/components/ui';
import { navigateLink } from '@/bff/linkAction';
import type { BffEnvelope, BffLink } from '@/bff/types';

const STEP_LABELS = ['Entity', 'Services', 'Stripe', 'Schedule', 'Tools', 'Review'];

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

  if (!envelope || envelope.action !== 'render' || !envelope.data) {
    return <LoadingScreen message="Loading application…" />;
  }

  const { step, step_index, total_steps, step_title } = envelope.data;
  const links = envelope._links ?? {};
  const prev: BffLink | undefined = links.prev;
  const next: BffLink | undefined = links.next;

  const pillSteps = STEP_LABELS.slice(0, total_steps).map((label, idx) => ({
    label,
    state:
      idx + 1 === step_index
        ? ('current' as const)
        : idx + 1 < step_index
          ? ('done' as const)
          : ('default' as const),
  }));

  return (
    <YStack flex={1} bg={beautyTokens.surface}>
      {/* Header */}
      <XStack
        items="center"
        gap={10}
        px={16}
        height={56}
        borderBottomWidth={1}
        borderBottomColor={beautyTokens.line}
        bg={beautyTokens.surface}
      >
        <YStack
          width={24}
          height={24}
          rounded={8}
          bg={beautyTokens.ink}
          items="center"
          justify="center"
        >
          <SizableText color={beautyTokens.white} fontSize={12}>
            ✦
          </SizableText>
        </YStack>
        <SizableText
          fontFamily="$heading"
          fontSize={22}
          color={beautyTokens.text}
          testID="wizard-brand-name"
        >
          Beauty
        </SizableText>
        <YStack
          px={9}
          py={3}
          rounded={999}
          bg={beautyTokens.accentBlue}
          borderWidth={1}
          borderColor="rgba(125,168,207,0.35)"
        >
          <SizableText
            fontSize={9}
            fontWeight="700"
            letterSpacing={1.4}
            color={beautyTokens.accentBlueText}
          >
            APPLY
          </SizableText>
        </YStack>
        <XStack flex={1} />
        <SizableText
          fontSize={11}
          color={beautyTokens.textMuted}
          fontFamily={'ui-monospace, SF Mono, Menlo, monospace' as any}
          testID="wizard-step-counter"
        >
          Step {step_index} of {total_steps}
        </SizableText>
      </XStack>

      {/* Step pill row */}
      <YStack
        py={10}
        bg={beautyTokens.surface}
        borderBottomWidth={1}
        borderBottomColor={beautyTokens.line}
      >
        <StepPillRow steps={pillSteps} />
      </YStack>

      {/* Body */}
      <ScrollView flex={1} bg={beautyTokens.surface}>
        <YStack p={16} pb={28} gap={14}>
          <YStack gap={4} testID={`wizard-step-${step}`}>
            <H1
              fontFamily="$heading"
              fontSize={26}
              fontWeight="500"
              color={beautyTokens.text}
              testID="wizard-step-title"
            >
              {step_title}
            </H1>
            {subtitle ? (
              <Paragraph fontSize={12} color={beautyTokens.textMuted} lineHeight={18}>
                {subtitle}
              </Paragraph>
            ) : null}
          </YStack>
          {children}
          {error ? (
            <SizableText color={beautyTokens.danger} fontSize={13} testID="wizard-error">
              {error}
            </SizableText>
          ) : null}
        </YStack>
      </ScrollView>

      {/* Bottom action bar */}
      <XStack
        px={16}
        py={12}
        gap={10}
        borderTopWidth={1}
        borderTopColor={beautyTokens.line}
        bg={beautyTokens.white}
      >
        {prev ? (
          <Pressable
            onPress={() => navigateLink(router, prev, { replace: true })}
            accessibilityRole="button"
            testID="wizard-back"
            style={{ flex: 1 }}
          >
            <YStack
              height={48}
              rounded={10}
              borderWidth={1.5}
              borderColor={beautyTokens.ink}
              items="center"
              justify="center"
            >
              <SizableText fontWeight="600" color={beautyTokens.ink}>
                {prev.prompt ?? 'Back'}
              </SizableText>
            </YStack>
          </Pressable>
        ) : (
          <XStack flex={1} />
        )}
        <YStack flex={2}>
          <BeautyButton
            testID="wizard-continue"
            variant="confirm"
            size="lg"
            fullWidth
            disabled={continueDisabled}
            loading={continueLoading}
            onPress={async () => {
              if (onContinue) {
                await onContinue();
              } else if (next) {
                navigateLink(router, next, { replace: true });
              }
            }}
          >
            {continueLabel ?? next?.prompt ?? 'Continue'}
          </BeautyButton>
        </YStack>
      </XStack>
    </YStack>
  );
}
