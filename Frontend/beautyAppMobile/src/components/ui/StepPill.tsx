/**
 * StepPill — wizard progress pill. Mirrors Angular `.step-pill` (line 140
 * of beauty-business-application.component.scss). Three states:
 *   default — white bg, muted text
 *   current — baby-blue bg, deep-blue text, accent-blue-deep number circle
 *   done    — success-soft bg, success text, success number circle
 *
 * Pair with `StepPillRow` to scroll horizontally like the Angular wizard.
 */
import React from 'react';
import { ScrollView } from 'react-native';
import { SizableText, XStack, YStack } from 'tamagui';

import { beautyTokens } from '../../../tamagui.config';

export type StepPillState = 'default' | 'current' | 'done';

export interface StepPillProps {
  step: number;
  label: string;
  state?: StepPillState;
}

interface StateStyle {
  bg: any;
  border: any;
  color: any;
  numBg: any;
  numColor: any;
  numBorder: any;
}

const STATES: Record<StepPillState, StateStyle> = {
  default: {
    bg: beautyTokens.white,
    border: beautyTokens.line,
    color: beautyTokens.textMuted,
    numBg: beautyTokens.white,
    numColor: beautyTokens.textMuted,
    numBorder: beautyTokens.line,
  },
  current: {
    bg: beautyTokens.accentBlue,
    border: 'rgba(125,168,207,0.35)',
    color: beautyTokens.accentBlueText,
    numBg: beautyTokens.accentBlueDeep,
    numColor: beautyTokens.white,
    numBorder: beautyTokens.accentBlueDeep,
  },
  done: {
    bg: beautyTokens.successBg,
    border: 'rgba(47,122,71,0.2)',
    color: beautyTokens.success,
    numBg: beautyTokens.success,
    numColor: beautyTokens.white,
    numBorder: beautyTokens.success,
  },
};

export function StepPill({ step, label, state = 'default' }: StepPillProps) {
  const s = STATES[state];
  return (
    <XStack
      items="center"
      gap={6}
      pl={4}
      pr={12}
      py={4}
      rounded={999}
      bg={s.bg}
      borderWidth={1}
      borderColor={s.border}
    >
      <YStack
        width={20}
        height={20}
        rounded={999}
        bg={s.numBg}
        borderWidth={1}
        borderColor={s.numBorder}
        items="center"
        justify="center"
      >
        <SizableText fontSize={10} fontWeight="700" color={s.numColor}>
          {step}
        </SizableText>
      </YStack>
      <SizableText fontSize={11} fontWeight="600" color={s.color}>
        {label}
      </SizableText>
    </XStack>
  );
}

export interface StepPillRowProps {
  steps: { label: string; state?: StepPillState }[];
}

export function StepPillRow({ steps }: StepPillRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
    >
      {steps.map((step, idx) => (
        <StepPill
          key={`${idx}-${step.label}`}
          step={idx + 1}
          label={step.label}
          state={step.state ?? 'default'}
        />
      ))}
    </ScrollView>
  );
}
