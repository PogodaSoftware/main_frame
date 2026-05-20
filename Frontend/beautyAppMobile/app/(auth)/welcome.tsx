/**
 * Auth welcome — RN port of Angular `beauty-welcome.component.ts`.
 * Pre-app landing for unauthenticated users.
 *
 * Layout (mirrors Angular exactly):
 *   - Hero (top): baby-blue → surface vertical gradient w/ 4 decorative dots,
 *     centered brand icon (64×64 ink), Cormorant 40px "Beauty",
 *     13px muted tag line. Min-height 380px, flex 1.
 *   - Actions (below hero): Sign in (green primary), Create account (ink
 *     secondary), OR divider, Continue with Google (white ghost).
 *   - Legal footer: plain centered 11px muted line with Terms / Privacy
 *     inline links.
 */
import React from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Separator, SizableText, XStack, YStack } from 'tamagui';

import { beautyTokens } from '../../tamagui.config';
import { BeautyShell } from '@/components/BeautyShell';

// Linear gradient fallback. expo-linear-gradient ships a broken
// `./normalizeColor` import on web builds (Metro can't resolve the
// `.web.js` shim), so on web we render the gradient via a plain CSS
// background-image and on native we just use the accent-blue solid.
function HeroBackground() {
  if (Platform.OS === 'web') {
    return (
      <View
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `linear-gradient(180deg, ${beautyTokens.accentBlue} 0%, ${beautyTokens.surface} 100%)`,
          } as any
        }
      />
    );
  }
  return (
    <YStack
      position="absolute"
      t={0}
      l={0}
      r={0}
      b={0}
      bg={beautyTokens.accentBlue}
    />
  );
}

function GoogleGlyph() {
  return (
    <YStack
      width={18}
      height={18}
      bg={beautyTokens.white}
      items="center"
      justify="center"
      testID="welcome-google-glyph"
    >
      <SizableText fontSize={14} fontWeight="700" color="#4285F4">
        G
      </SizableText>
    </YStack>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();

  const goGoogle = () => {
    router.push({ pathname: '/(auth)/login' as any, params: { provider: 'google' } });
  };

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1} bg={beautyTokens.surface}>
        {/* Hero */}
        <YStack
          flex={1}
          minH={380}
          items="center"
          justify="center"
          overflow="hidden"
          position="relative"
        >
          <HeroBackground />
          {/* Decorative dots */}
          <YStack
            position="absolute"
            t={30}
            l={40}
            width={4}
            height={4}
            rounded={999}
            bg={beautyTokens.accentBlueDeep}
            opacity={0.5}
          />
          <YStack
            position="absolute"
            t={70}
            r={50}
            width={6}
            height={6}
            rounded={999}
            bg={beautyTokens.accentBlueDeep}
            opacity={0.35}
          />
          <YStack
            position="absolute"
            t={130}
            l={70}
            width={3}
            height={3}
            rounded={999}
            bg={beautyTokens.accentBlueDeep}
            opacity={0.4}
          />
          <YStack
            position="absolute"
            t={50}
            r={90}
            width={3}
            height={3}
            rounded={999}
            bg={beautyTokens.accentBlueDeep}
            opacity={0.45}
          />

          <YStack items="center" gap={14} testID="welcome-brand">
            <YStack
              width={64}
              height={64}
              rounded={18}
              bg={beautyTokens.ink}
              items="center"
              justify="center"
              shadowColor="rgba(15, 35, 60, 0.18)"
              shadowOffset={{ width: 0, height: 4 }}
              shadowRadius={14}
              shadowOpacity={1}
              testID="welcome-brand-icon"
            >
              <SizableText color={beautyTokens.white} fontSize={28}>
                ✦
              </SizableText>
            </YStack>
            <SizableText
              fontFamily="$heading"
              fontSize={40}
              fontWeight="500"
              letterSpacing={0.4}
              color={beautyTokens.text}
              testID="welcome-brand-name"
            >
              Beauty
            </SizableText>
            <SizableText
              fontSize={13}
              color={beautyTokens.textMuted}
              text="center"
              maxW={260}
              lineHeight={18}
            >
              Hair, nails, facial & massage — booked in seconds.
            </SizableText>
          </YStack>
        </YStack>

        {/* Actions */}
        <YStack px={24} pt={24} pb={12} gap={10}>
          <Pressable
            onPress={() => router.push('/(auth)/login' as any)}
            testID="welcome-signin"
            accessibilityRole="button"
          >
            <YStack
              height={48}
              rounded={10}
              bg={beautyTokens.success}
              borderWidth={1}
              borderColor={beautyTokens.success}
              items="center"
              justify="center"
              shadowColor="rgba(47, 122, 71, 0.2)"
              shadowOffset={{ width: 0, height: 2 }}
              shadowRadius={8}
              shadowOpacity={1}
            >
              <SizableText
                color={beautyTokens.white}
                fontWeight="600"
                fontSize={14}
                letterSpacing={0.2}
              >
                Sign in
              </SizableText>
            </YStack>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(auth)/signup' as any)}
            testID="welcome-signup"
            accessibilityRole="button"
          >
            <YStack
              height={48}
              rounded={10}
              bg={beautyTokens.ink}
              borderWidth={1}
              borderColor={beautyTokens.ink}
              items="center"
              justify="center"
            >
              <SizableText
                color={beautyTokens.white}
                fontWeight="600"
                fontSize={14}
                letterSpacing={0.2}
              >
                Create account
              </SizableText>
            </YStack>
          </Pressable>

          {/* OR divider */}
          <XStack items="center" gap={12} my={10} testID="welcome-or-divider">
            <Separator flex={1} borderColor={beautyTokens.line} />
            <SizableText
              fontSize={11}
              fontWeight="600"
              color={beautyTokens.textMuted}
              letterSpacing={1.2}
              textTransform="uppercase"
            >
              OR
            </SizableText>
            <Separator flex={1} borderColor={beautyTokens.line} />
          </XStack>

          <Pressable onPress={goGoogle} testID="welcome-google" accessibilityRole="button">
            <XStack
              height={48}
              rounded={10}
              bg={beautyTokens.white}
              borderWidth={1.5}
              borderColor={beautyTokens.line}
              items="center"
              justify="center"
              gap={10}
            >
              <GoogleGlyph />
              <SizableText
                color={beautyTokens.text}
                fontWeight="600"
                fontSize={14}
                letterSpacing={0.2}
              >
                Continue with Google
              </SizableText>
            </XStack>
          </Pressable>
        </YStack>

        {/* Legal */}
        <YStack px={12} pt={18} pb={12} items="center" testID="welcome-legal">
          <XStack gap={4} items="center" flexWrap="wrap" justify="center">
            <SizableText fontSize={11} color={beautyTokens.textMuted} lineHeight={16}>
              By continuing you agree to the
            </SizableText>
            <Pressable
              onPress={() => Linking.openURL('https://example.com/terms').catch(() => {})}
              testID="welcome-legal-terms"
            >
              <SizableText
                fontSize={11}
                fontWeight="600"
                color={beautyTokens.accentBlueText}
              >
                Terms
              </SizableText>
            </Pressable>
            <SizableText fontSize={11} color={beautyTokens.textMuted}>
              and
            </SizableText>
            <Pressable
              onPress={() => Linking.openURL('https://example.com/privacy').catch(() => {})}
              testID="welcome-legal-privacy"
            >
              <SizableText
                fontSize={11}
                fontWeight="600"
                color={beautyTokens.accentBlueText}
              >
                Privacy Policy
              </SizableText>
            </Pressable>
            <SizableText fontSize={11} color={beautyTokens.textMuted}>
              .
            </SizableText>
          </XStack>
        </YStack>
      </YStack>
    </BeautyShell>
  );
}
