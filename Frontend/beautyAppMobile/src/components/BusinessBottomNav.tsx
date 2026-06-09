/**
 * BusinessBottomNav — fixed bottom tab bar for business portal screens.
 * Tabs: Home / Bookings / Services / Profile
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { SizableText, XStack, YStack } from 'tamagui';

import { beautyTokens } from '../../tamagui.config';

export type BusinessTabKey = 'home' | 'bookings' | 'services' | 'profile';

export interface BusinessBottomNavProps {
  active: BusinessTabKey;
}

const TABS: Array<{ key: BusinessTabKey; label: string; icon: string; path: string }> = [
  { key: 'home',     label: 'Home',     icon: '⌂',  path: '/business/home' },
  { key: 'bookings', label: 'Bookings', icon: '📅', path: '/business/bookings' },
  { key: 'services', label: 'Services', icon: '✂️',  path: '/business/services' },
  { key: 'profile',  label: 'Profile',  icon: '👤', path: '/business/profile' },
];

export function BusinessBottomNav({ active }: BusinessBottomNavProps) {
  const router = useRouter();
  return (
    <XStack
      bg={beautyTokens.white}
      borderTopWidth={1}
      borderTopColor={beautyTokens.line}
      shadowColor="rgba(15, 35, 60, 0.08)"
      shadowOffset={{ width: 0, height: -2 }}
      shadowRadius={14}
      shadowOpacity={1}
      testID="business-bottom-nav"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (!isActive) router.replace(tab.path as any);
            }}
            style={{ flex: 1 }}
            testID={`business-nav-${tab.key}`}
          >
            <YStack
              height={beautyTokens.navHeight}
              items="center"
              justify="center"
              gap={4}
              position="relative"
            >
              <YStack
                position="absolute"
                t={6}
                width={6}
                height={6}
                rounded={999}
                bg={isActive ? beautyTokens.accentBlueDeep : 'transparent'}
              />
              <SizableText
                fontSize={20}
                color={isActive ? beautyTokens.accentBlueText : beautyTokens.text}
              >
                {tab.icon}
              </SizableText>
              <SizableText
                fontSize={11}
                fontWeight={isActive ? '600' : '500'}
                color={isActive ? beautyTokens.accentBlueText : beautyTokens.text}
              >
                {tab.label}
              </SizableText>
            </YStack>
          </Pressable>
        );
      })}
    </XStack>
  );
}
