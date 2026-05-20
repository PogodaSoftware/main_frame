/**
 * BottomNav — fixed bottom tab bar matching Angular `.bottom-nav`.
 * Default variant: Bookings · Home · Profile (used on bookings, home,
 * profile, category, etc.). Messages variant: Home · Messages · Profile
 * (used only on chats pages, mirrors Angular beauty-chats nav).
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SizableText, XStack, YStack } from 'tamagui';

import { beautyTokens } from '../../tamagui.config';

export type TabKey = 'bookings' | 'home' | 'chat' | 'profile' | 'messages';
export type NavVariant = 'default' | 'messages';

export interface BottomNavProps {
  active: TabKey;
  variant?: NavVariant;
}

type TabDef = {
  key: TabKey;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  path: string;
};

const DEFAULT_TABS: TabDef[] = [
  { key: 'bookings', label: 'Bookings', icon: 'calendar-outline', path: '/(customer)/bookings' },
  { key: 'home', label: 'Home', icon: 'home-outline', path: '/(customer)/home' },
  { key: 'chat', label: 'Chat', icon: 'chatbubble-outline', path: '/(customer)/chats' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', path: '/(customer)/profile' },
];

const MESSAGES_TABS: TabDef[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', path: '/(customer)/home' },
  { key: 'messages', label: 'Messages', icon: 'chatbubble-outline', path: '/(customer)/chats' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', path: '/(customer)/profile' },
];

export function BottomNav({ active, variant = 'default' }: BottomNavProps) {
  const router = useRouter();
  const tabs = variant === 'messages' ? MESSAGES_TABS : DEFAULT_TABS;
  return (
    <XStack
      bg={beautyTokens.white}
      borderTopWidth={1}
      borderTopColor={beautyTokens.line}
      shadowColor="rgba(15, 35, 60, 0.08)"
      shadowOffset={{ width: 0, height: -2 }}
      shadowRadius={14}
      shadowOpacity={1}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const color = isActive ? beautyTokens.accentBlueDeep : beautyTokens.text;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (!isActive) router.replace(tab.path as any);
            }}
            style={{ flex: 1 }}
          >
            <YStack
              height={beautyTokens.navHeight}
              items="center"
              justify="center"
              gap={4}
              position="relative"
            >
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: isActive ? beautyTokens.accentBlueDeep : 'transparent',
                }}
              />
              <Ionicons name={tab.icon} size={24} color={color} />
              <SizableText
                fontSize={11}
                fontWeight={isActive ? '600' : '500'}
                color={color}
                letterSpacing={0.1}
                lineHeight={11}
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
