/**
 * ProvTabBar — 5-tab bottom nav (Dashboard / Bookings / Services / Messages / Profile).
 * Mirrors Angular app-prov-tab-bar.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { beautyTokens } from '../../../tamagui.config';
import { refreshUnreadTotal, useUnreadTotal } from '@/services/unreadStore';

export type ProviderTab = 'dashboard' | 'bookings' | 'services' | 'messages' | 'profile';

export interface ProvTabBarProps {
  active: ProviderTab;
  badges?: { bookings?: number; messages?: number };
  onTabPress?: (tab: ProviderTab) => void;
}

const ROUTES: Record<ProviderTab, string> = {
  dashboard: '/business/home',
  bookings: '/business/bookings',
  services: '/business/services',
  messages: '/chats',
  profile: '/business/profile',
};

export function ProvTabBar({ active, badges, onTabPress }: ProvTabBarProps) {
  const router = useRouter();
  // Live unread total drives the Messages badge unless the caller overrides
  // it explicitly. Re-fetch on mount so navigating between business screens
  // (e.g. after reading a thread) reconciles the badge with the server.
  const unread = useUnreadTotal();
  React.useEffect(() => { refreshUnreadTotal(); }, []);
  const messagesBadge = badges?.messages ?? unread;
  const handle = (tab: ProviderTab) => {
    if (onTabPress) onTabPress(tab);
    else if (tab !== active) router.replace(ROUTES[tab] as any);
  };
  return (
    <View style={styles.bar}>
      <Tab name="dashboard" label="Dashboard" active={active === 'dashboard'} onPress={() => handle('dashboard')}>
        <DashboardIcon color={active === 'dashboard' ? beautyTokens.accentBlueDeep : beautyTokens.text} />
      </Tab>
      <Tab name="bookings" label="Bookings" active={active === 'bookings'} badge={badges?.bookings} onPress={() => handle('bookings')}>
        <BookingsIcon color={active === 'bookings' ? beautyTokens.accentBlueDeep : beautyTokens.text} />
      </Tab>
      <Tab name="services" label="Services" active={active === 'services'} onPress={() => handle('services')}>
        <ServicesIcon color={active === 'services' ? beautyTokens.accentBlueDeep : beautyTokens.text} />
      </Tab>
      <Tab name="messages" label="Messages" active={active === 'messages'} badge={messagesBadge} onPress={() => handle('messages')}>
        <MessagesIcon color={active === 'messages' ? beautyTokens.accentBlueDeep : beautyTokens.text} />
      </Tab>
      <Tab name="profile" label="Profile" active={active === 'profile'} onPress={() => handle('profile')}>
        <ProfileIcon color={active === 'profile' ? beautyTokens.accentBlueDeep : beautyTokens.text} />
      </Tab>
    </View>
  );
}

interface TabProps {
  name: ProviderTab;
  label: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
  children: React.ReactNode;
}

function Tab({ name, label, active, badge, onPress, children }: TabProps) {
  const color = active ? beautyTokens.accentBlueDeep : beautyTokens.text;
  return (
    <Pressable onPress={onPress} style={styles.tab} testID={`prov-tab-${name}`}>
      {active && <View style={styles.dot} />}
      <View style={styles.iconWrap}>
        {children}
        {!!badge && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.label, { color, fontWeight: active ? '600' : '500' }]}>{label}</Text>
    </Pressable>
  );
}

function DashboardIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={3} width={7} height={9} rx={1.5} />
      <Rect x={14} y={3} width={7} height={5} rx={1.5} />
      <Rect x={3} y={16} width={7} height={5} rx={1.5} />
      <Rect x={14} y={12} width={7} height={9} rx={1.5} />
    </Svg>
  );
}

function BookingsIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={16} rx={2.5} />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  );
}

function ServicesIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z" />
      <Path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
    </Svg>
  );
}

function MessagesIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" />
    </Svg>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8.5} r={3.8} />
      <Path d="M4.5 21c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: beautyTokens.line,
    shadowColor: 'rgba(15, 35, 60, 0.08)',
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 14,
    shadowOpacity: 1,
  },
  tab: {
    flex: 1,
    height: 64,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: beautyTokens.accentBlueDeep,
  },
  iconWrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: beautyTokens.danger,
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.1,
    lineHeight: 12,
    fontFamily: beautyTokens.fontBody,
  },
});
