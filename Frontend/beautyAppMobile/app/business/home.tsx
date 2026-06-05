/**
 * Business dashboard — mirrors Angular beauty-business-home.component.
 * Layout: ProvTopHeader → greeting row → month calendar card → quick-action
 * tiles → earnings arc + volume cards → ProvTabBar. Empty state shows a 3-step
 * checklist when the storefront has no services / no activity yet.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { useSession } from '@/hooks/useSession';
import { BeautyShell } from '@/components/BeautyShell';
import {
  ProvCard,
  ProvTabBar,
  ProvTopHeader,
  type ProviderTab,
} from '@/components/business';
import { beautyTokens } from '../../tamagui.config';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface BookingItem {
  id: number;
  customer_email: string;
  service_name: string;
  slot_at: string;
  status: string;
  price_cents: number;
  price_dollars?: string;
  duration_minutes: number;
}

interface DashboardStats {
  earnings_cents: number;
  earnings_target_cents: number;
  earnings_dollars?: string;
  earnings_target_dollars?: string;
  bookings_count: number;
  by_category: Record<string, number>;
  new_clients: number;
  recurring_clients: number;
}

interface HomeData {
  business?: { email?: string; business_name?: string };
  storefront?: { id?: number; name?: string; is_open?: boolean };
  stats?: DashboardStats;
  services_count?: number;
  has_services?: boolean;
  hours_label?: string;
  month?: string;
  today?: string;
  month_bookings?: Record<string, BookingItem[]>;
  badges?: { messages_unread?: number; bookings_unread?: number };
}

interface DayCell {
  date: string;
  day: number | null;
  isToday: boolean;
  inMonth: boolean;
  count: number;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BusinessHome() {
  const router = useRouter();
  const { clear } = useSession();
  const [env, setEnv] = useState<BffEnvelope<HomeData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<HomeData>('beauty_business_home');
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        router.replace((route ?? '/(auth)/business-login') as any);
        return;
      }
      setEnv(e);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onLogout = async () => {
    if (env?.action === 'render' && env._links?.logout) {
      await dispatchLink(env._links.logout);
    }
    clear();
    router.replace('/(auth)/business-login' as any);
  };

  const onTab = (tab: ProviderTab) => {
    if (tab === 'dashboard') return;
    const links: Record<string, BffLink> = (env?._links as Record<string, BffLink>) ?? {};
    const map: Record<ProviderTab, string> = {
      dashboard: 'business_home',
      bookings: 'bookings',
      services: 'services',
      messages: 'business_messages',
      profile: 'profile',
    };
    const link = links[map[tab]];
    if (link) navigateLink(router, link);
    else {
      const route: Record<ProviderTab, string> = {
        dashboard: '/business/home',
        bookings: '/business/bookings',
        services: '/business/services',
        messages: '/business/messages',
        profile: '/business/profile',
      };
      router.replace(route[tab] as any);
    }
  };

  // Compute everything that touches a hook BEFORE the loading/error
  // guard. React hooks must be called in the same order on every
  // render; the previous version put `useMemo` after an early return
  // for the un-envelope state, which crashed with "Rendered more hooks
  // than during the previous render" once the resolve completed.
  const ready = env?.action === 'render' && !!env.data;
  const data = ready ? env.data! : undefined;
  const links: Record<string, BffLink> = ready
    ? ((env._links as Record<string, BffLink>) ?? {})
    : {};
  const business = data?.business ?? {};
  const businessName = business.business_name?.trim() || '';
  const businessInitial = businessName ? businessName[0].toUpperCase() : '·';
  const storefrontOpen = data?.storefront?.is_open !== false;

  const stats: DashboardStats = data?.stats ?? {
    earnings_cents: 0,
    earnings_target_cents: 500000,
    bookings_count: 0,
    by_category: {},
    new_clients: 0,
    recurring_clients: 0,
  };
  const monthBookings = data?.month_bookings ?? {};
  const today = data?.today ?? new Date().toISOString().slice(0, 10);
  const monthStr = data?.month ?? today.slice(0, 7);

  const showEmpty = useMemo(() => {
    if (!data) return false;
    const hasServices = !!(data.has_services ?? !!links['add-service']);
    const noActivity = !stats.bookings_count && !stats.earnings_cents;
    return noActivity && !hasServices && !!data.business;
  }, [data, links, stats]);

  const badges = data?.badges ?? {};
  const topBadge = (badges.messages_unread ?? 0) + (badges.bookings_unread ?? 0);

  if (!ready) {
    return (
      <BeautyShell>
        <Stack.Screen options={{ headerShown: false }} />
        <ProvTopHeader />
        <View style={styles.loadingBox}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <ActivityIndicator color={beautyTokens.accentBlueDeep} />
          )}
        </View>
        <ProvTabBar active="dashboard" onTabPress={onTab} />
      </BeautyShell>
    );
  }

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ProvTopHeader badge={topBadge > 0 ? topBadge : null} />

      {showEmpty ? (
        <EmptyState
          business={business}
          links={links}
          monthStr={monthStr}
          today={today}
          monthBookings={monthBookings}
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSelectedDate((cur) => (cur === d ? null : d));
          }}
        />
      ) : (
        <DashboardBody
          businessName={businessName || 'Your storefront'}
          businessEmail={business.email || ''}
          businessInitial={businessInitial}
          storefrontOpen={storefrontOpen}
          monthStr={monthStr}
          today={today}
          monthBookings={monthBookings}
          stats={stats}
          servicesCount={Number(data!.services_count ?? 0)}
          hoursLabel={data!.hours_label || 'Set weekly hours'}
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSelectedDate((cur) => (cur === d ? null : d));
          }}
          onAvailabilityPress={() => {
            const link = links['availability'];
            if (link) navigateLink(router, link);
            else router.push('/business/availability' as any);
          }}
          onServicesPress={() => {
            const link = links['services'];
            if (link) navigateLink(router, link);
            else router.push('/business/services' as any);
          }}
          onReviewsPress={() => router.push('/business/reviews' as any)}
        />
      )}

      <ProvTabBar
        active="dashboard"
        badges={{ bookings: badges.bookings_unread, messages: badges.messages_unread }}
        onTabPress={onTab}
      />
    </BeautyShell>
  );
}

interface DashboardBodyProps {
  businessName: string;
  businessEmail: string;
  businessInitial: string;
  storefrontOpen: boolean;
  monthStr: string;
  today: string;
  monthBookings: Record<string, BookingItem[]>;
  stats: DashboardStats;
  servicesCount: number;
  hoursLabel: string;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onAvailabilityPress: () => void;
  onServicesPress: () => void;
  onReviewsPress: () => void;
}

function DashboardBody(props: DashboardBodyProps) {
  const {
    businessName,
    businessEmail,
    businessInitial,
    storefrontOpen,
    monthStr,
    today,
    monthBookings,
    stats,
    servicesCount,
    hoursLabel,
    selectedDate,
    onSelectDate,
    onAvailabilityPress,
    onServicesPress,
    onReviewsPress,
  } = props;

  const [year, monthIdx] = useMemo(() => {
    const [yStr, mStr] = (monthStr || '').split('-');
    const y = Number(yStr) || new Date().getUTCFullYear();
    const m = (Number(mStr) || new Date().getUTCMonth() + 1) - 1;
    return [y, m];
  }, [monthStr]);

  const monthLabel = useMemo(() => {
    return new Date(Date.UTC(year, monthIdx, 1)).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }, [year, monthIdx]);

  return (
    <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
      {/* Greeting */}
      <View style={styles.greetRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{businessInitial}</Text>
        </View>
        <View style={styles.greetText}>
          <Text style={styles.bizName} numberOfLines={1}>{businessName}</Text>
          <Text style={styles.bizEmail} numberOfLines={1}>{businessEmail}</Text>
        </View>
        <Pressable
          accessibilityLabel={storefrontOpen ? 'Storefront open' : 'Storefront closed'}
          onPress={onAvailabilityPress}
          style={styles.statusPill}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: storefrontOpen ? beautyTokens.success : beautyTokens.danger },
            ]}
          />
          <Text style={styles.statusPillText}>{storefrontOpen ? 'Open' : 'Closed'}</Text>
        </Pressable>
      </View>

      {/* Calendar card */}
      <MonthCalendarCard
        monthStr={monthStr}
        today={today}
        monthBookings={monthBookings}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />

      {/* Quick action tiles */}
      <View style={styles.qaRow}>
        <Pressable style={[styles.qaTile, styles.qaTilePrimary]} onPress={onServicesPress}>
          <View style={[styles.qaIconWrap, styles.qaIconPrimary]}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z" />
              <Path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
            </Svg>
          </View>
          <View style={styles.qaText}>
            <Text style={[styles.qaLabel, { color: '#FFFFFF' }]}>Services</Text>
            <Text style={[styles.qaSub, { color: 'rgba(255,255,255,0.7)' }]}>{servicesCount} active</Text>
          </View>
        </Pressable>

        <Pressable style={styles.qaTile} onPress={onAvailabilityPress}>
          <View style={styles.qaIconWrap}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.accentBlueText} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={9} />
              <Path d="M12 7v5l3 2" />
            </Svg>
          </View>
          <View style={styles.qaText}>
            <Text style={styles.qaLabel}>Hours</Text>
            <Text style={styles.qaSub} numberOfLines={1}>{hoursLabel}</Text>
          </View>
        </Pressable>

        <Pressable style={styles.qaTile} onPress={onReviewsPress} testID="business-reviews-tile">
          <View style={styles.qaIconWrap}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="#F5C36B" stroke="#F5C36B" strokeWidth={1} strokeLinejoin="round">
              <Path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z" />
            </Svg>
          </View>
          <View style={styles.qaText}>
            <Text style={styles.qaLabel}>Reviews</Text>
            <Text style={styles.qaSub}>View ratings</Text>
          </View>
        </Pressable>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <EarningsCard stats={stats} monthLabel={monthLabel} />
        <VolumeCard stats={stats} />
      </View>
    </ScrollView>
  );
}

interface MonthCalendarCardProps {
  monthStr: string;
  today: string;
  monthBookings: Record<string, BookingItem[]>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

function MonthCalendarCard({ monthStr, today, monthBookings, selectedDate, onSelectDate }: MonthCalendarCardProps) {
  const [year, monthIdx] = useMemo(() => {
    const [yStr, mStr] = (monthStr || '').split('-');
    const y = Number(yStr) || new Date().getUTCFullYear();
    const m = (Number(mStr) || new Date().getUTCMonth() + 1) - 1;
    return [y, m];
  }, [monthStr]);

  const monthLabel = useMemo(() => {
    return new Date(Date.UTC(year, monthIdx, 1)).toLocaleDateString(undefined, {
      month: 'long', year: 'numeric', timeZone: 'UTC',
    });
  }, [year, monthIdx]);

  const weeks = useMemo(() => buildMonthGrid(year, monthIdx, today, monthBookings), [year, monthIdx, today, monthBookings]);

  return (
    <ProvCard padding={16} style={styles.calCard}>
      <View style={styles.calHead}>
        <Text style={styles.calMonth}>{monthLabel}</Text>
        <View style={styles.calNav}>
          <Pressable style={styles.calNavBtn} accessibilityLabel="Previous month">
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.textMuted} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </Pressable>
          <Pressable style={styles.calNavBtn} accessibilityLabel="Next month">
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.textMuted} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 6l6 6-6 6" />
            </Svg>
          </Pressable>
        </View>
      </View>

      <View style={styles.calDow}>
        {DAYS_OF_WEEK.map((d) => (
          <Text key={d} style={styles.calDowText}>{d}</Text>
        ))}
      </View>

      {weeks.map((week, i) => (
        <View key={i} style={styles.calRow}>
          {week.map((cell, j) => (
            <CalendarCell
              key={`${i}-${j}`}
              cell={cell}
              selected={cell.date === selectedDate}
              onPress={() => cell.inMonth && onSelectDate(cell.date)}
            />
          ))}
        </View>
      ))}

      {selectedDate && (monthBookings[selectedDate] || []).length > 0 && (
        <View style={styles.dayBookings}>
          <Text style={styles.dayHead}>{selectedDate}</Text>
          {monthBookings[selectedDate].map((b) => (
            <View key={b.id} style={styles.dayBookingRow}>
              <Text style={styles.dayBookingTime}>{formatTime(b.slot_at)}</Text>
              <Text style={styles.dayBookingSvc} numberOfLines={1}>{b.service_name}</Text>
              <Text style={styles.dayBookingCust} numberOfLines={1}>{b.customer_email}</Text>
            </View>
          ))}
        </View>
      )}
    </ProvCard>
  );
}

function CalendarCell({ cell, selected, onPress }: { cell: DayCell; selected: boolean; onPress: () => void }) {
  if (!cell.inMonth) {
    return <View style={[styles.calCell, styles.calCellBlank]} />;
  }
  return (
    <Pressable onPress={onPress} style={[
      styles.calCell,
      cell.isToday && styles.calCellToday,
      selected && styles.calCellSelected,
    ]}>
      <Text style={[styles.calDay, cell.isToday && styles.calDayToday]}>{cell.day}</Text>
      {cell.count > 0 && (
        <View style={[styles.calPip, cell.isToday && { backgroundColor: beautyTokens.accentBlueText }]} />
      )}
    </Pressable>
  );
}

function EarningsCard({ stats, monthLabel }: { stats: DashboardStats; monthLabel: string }) {
  const earningsCents = stats.earnings_cents || 0;
  const targetCents = Math.max(1, stats.earnings_target_cents);
  const ratio = Math.max(0, Math.min(1, earningsCents / targetCents));
  const pct = Math.round(ratio * 100);
  const r = 70;
  const cx = 76, cy = 76;
  const semiLen = Math.PI * r;
  const arcDash = `${(ratio * semiLen).toFixed(2)} ${semiLen.toFixed(2)}`;
  const arcPath = `M 6 76 A ${r} ${r} 0 0 1 146 76`;
  const theta = Math.PI * (1 - ratio);
  const dotX = +(cx + r * Math.cos(theta)).toFixed(2);
  const dotY = +(cy - r * Math.sin(theta)).toFixed(2);
  const earningsDollars = stats.earnings_dollars || (earningsCents / 100).toFixed(2);
  const targetDollarsRaw = stats.earnings_target_dollars || (stats.earnings_target_cents / 100).toFixed(2);
  const targetDollars = parseFloat(targetDollarsRaw).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <ProvCard padding={14} style={styles.earnCard}>
      <Text style={styles.cardEyebrow}>EARNINGS</Text>
      <Text style={styles.cardMonth}>{monthLabel}</Text>
      <View style={styles.arcWrap}>
        <Svg width="100%" height={90} viewBox="0 0 152 90" style={styles.arcSvg}>
          <Path d="M 6 76 A 70 70 0 0 1 146 76" stroke={beautyTokens.line} strokeWidth={12} strokeLinecap="round" fill="none" strokeDasharray="6 8" />
          <Path d={arcPath} stroke={beautyTokens.accentBlueDeep} strokeWidth={12} strokeLinecap="round" fill="none" strokeDasharray={arcDash} />
          <Circle cx={dotX} cy={dotY} r={9} fill="#fff" stroke={beautyTokens.accentBlueDeep} strokeWidth={2} />
          <Circle cx={dotX} cy={dotY} r={3} fill={beautyTokens.success} />
        </Svg>
        <View style={styles.arcValue}>
          <Text style={styles.arcStrong}>${earningsDollars}</Text>
          <Text style={styles.arcSub}>of ${targetDollars} target · {pct}%</Text>
        </View>
      </View>
    </ProvCard>
  );
}

function VolumeCard({ stats }: { stats: DashboardStats }) {
  return (
    <ProvCard padding={14} style={styles.volCard}>
      <Text style={styles.cardEyebrow}>BOOKINGS VOLUME</Text>
      <View style={styles.volTotal}>
        <Text style={styles.volTotalStrong}>{stats.bookings_count}</Text>
        <Text style={styles.volTotalSpan}>this month</Text>
      </View>
      <View style={styles.volGrid}>
        <View style={styles.volCell}>
          <Text style={styles.volNum}>{stats.new_clients}</Text>
          <Text style={styles.volLabel}>NEW</Text>
        </View>
        <View style={styles.volCell}>
          <Text style={styles.volNum}>{stats.recurring_clients}</Text>
          <Text style={styles.volLabel}>RECURRING</Text>
        </View>
      </View>
    </ProvCard>
  );
}

interface EmptyStateProps {
  business: { email?: string; business_name?: string };
  links: Record<string, BffLink>;
  monthStr: string;
  today: string;
  monthBookings: Record<string, BookingItem[]>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

// First-time setup pills mirror the application wizard chrome:
// Account (done) → Services (current) → Hours → Live.
const SETUP_STEPS = ['Account', 'Services', 'Hours', 'Live'];

function EmptyState({ business, links, monthStr, today, monthBookings, selectedDate, onSelectDate }: EmptyStateProps) {
  const router = useRouter();
  const goServices = () => {
    if (links['services']) navigateLink(router, links['services']);
    else router.push('/business/services' as any);
  };
  const goAvailability = () => {
    if (links['availability']) navigateLink(router, links['availability']);
    else router.push('/business/availability' as any);
  };
  const bizName = business.business_name || '';
  // Empty state = account created, services next.
  const currentStep = 2;

  return (
    <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
      <View style={styles.emptyGreet}>
        <Text style={styles.emptyTitle}>Welcome{bizName ? `, ${bizName}` : ''}.</Text>
        <Text style={styles.emptySub}>Get your storefront live in 3 quick steps.</Text>
      </View>

      {/* Setup stepper pills */}
      <View style={styles.setupSteps}>
        {SETUP_STEPS.map((label, idx) => {
          const i = idx + 1;
          const isCurrent = i === currentStep;
          const isDone = i < currentStep;
          return (
            <View key={label} style={[styles.setupPill, isCurrent && styles.setupPillCurrent]}>
              <View style={[styles.setupNum, isCurrent && styles.setupNumCurrent, isDone && styles.setupNumDone]}>
                {isDone ? (
                  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M5 12l4 4L19 7" />
                  </Svg>
                ) : (
                  <Text style={[styles.setupNumText, isCurrent && styles.setupNumTextCurrent]}>{i}</Text>
                )}
              </View>
              <Text style={[styles.setupName, isCurrent && styles.setupNameCurrent]} numberOfLines={1}>{label}</Text>
            </View>
          );
        })}
      </View>

      {/* Finish setup checklist */}
      <ProvCard padding={0} style={styles.checklistCard}>
        <View style={styles.ckHead}>
          <Text style={styles.ckHeadTitle}>Finish setup</Text>
          <Text style={styles.ckHeadSub}>Complete these to go live.</Text>
        </View>
        <View style={[styles.ckRow]}>
          <View style={[styles.ckBubble, styles.ckBubbleDone]}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5 12l4 4L19 7" />
            </Svg>
          </View>
          <View style={styles.ckText}>
            <Text style={[styles.ckLabel, styles.ckLabelDone]}>Create your account</Text>
            <Text style={styles.ckSub}>{business.email || ''}</Text>
          </View>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 18l6-6-6-6" />
          </Svg>
        </View>
        <Pressable style={styles.ckRow} onPress={goServices}>
          <View style={styles.ckBubble}>
            <Text style={styles.ckBubbleText}>2</Text>
          </View>
          <View style={styles.ckText}>
            <Text style={styles.ckLabel}>Add your first service</Text>
            <Text style={styles.ckSub}>Massage, facial, wax — set price & duration</Text>
          </View>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 18l6-6-6-6" />
          </Svg>
        </Pressable>
        <Pressable style={[styles.ckRow, styles.ckRowLast]} onPress={goAvailability}>
          <View style={styles.ckBubble}>
            <Text style={styles.ckBubbleText}>3</Text>
          </View>
          <View style={styles.ckText}>
            <Text style={styles.ckLabel}>Set weekly hours</Text>
            <Text style={styles.ckSub}>When can customers book?</Text>
          </View>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 18l6-6-6-6" />
          </Svg>
        </Pressable>
      </ProvCard>

      {/* Month calendar */}
      <MonthCalendarCard
        monthStr={monthStr}
        today={today}
        monthBookings={monthBookings}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />
    </ScrollView>
  );
}

function buildMonthGrid(
  year: number,
  monthIdx: number,
  today: string,
  monthBookings: Record<string, BookingItem[]>,
): DayCell[][] {
  const firstOfMonth = new Date(Date.UTC(year, monthIdx, 1));
  const lastOfMonth = new Date(Date.UTC(year, monthIdx + 1, 0));
  const startDay = firstOfMonth.getUTCDay();
  const daysInMonth = lastOfMonth.getUTCDate();
  const cells: DayCell[] = [];
  for (let i = 0; i < startDay; i++) {
    cells.push({ date: '', day: null, isToday: false, inMonth: false, count: 0 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      date,
      day: d,
      isToday: date === today,
      inMonth: true,
      count: (monthBookings[date] || []).length,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: '', day: null, isToday: false, inMonth: false, count: 0 });
  }
  const rows: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  errorText: { color: beautyTokens.danger, fontFamily: beautyTokens.fontBody, fontSize: 13 },

  body: { flex: 1, backgroundColor: beautyTokens.surface },
  bodyContent: { padding: 16, paddingBottom: 12 },

  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: beautyTokens.accentBlueDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 18, fontWeight: '500',
    color: beautyTokens.accentBlueText,
  },
  greetText: { flex: 1, minWidth: 0 },
  bizName: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 20, fontWeight: '500',
    letterSpacing: 0.2, lineHeight: 22, color: beautyTokens.text,
  },
  bizEmail: {
    fontFamily: 'Menlo', fontSize: 10, color: beautyTokens.textMuted, marginTop: 2,
  },
  statusPill: {
    minHeight: 44, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: beautyTokens.line,
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '600', color: beautyTokens.text, fontFamily: beautyTokens.fontBody },

  /* Calendar */
  calCard: { marginBottom: 12 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calMonth: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 20, fontWeight: '500',
    letterSpacing: 0.2, color: beautyTokens.text,
  },
  calNav: { flexDirection: 'row', gap: 4 },
  calNavBtn: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1, borderColor: beautyTokens.line,
    alignItems: 'center', justifyContent: 'center',
  },
  calDow: { flexDirection: 'row', marginBottom: 6 },
  calDowText: {
    flex: 1, textAlign: 'center',
    fontSize: 10, fontWeight: '600', color: beautyTokens.textMuted,
    letterSpacing: 0.4, paddingVertical: 4,
    fontFamily: beautyTokens.fontBody,
  },
  calRow: { flexDirection: 'row', marginBottom: 4, gap: 4 },
  calCell: {
    flex: 1, aspectRatio: 1,
    borderRadius: 8, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  calCellBlank: { backgroundColor: 'transparent', borderWidth: 0 },
  calCellToday: {
    backgroundColor: beautyTokens.accentBlue,
    borderColor: beautyTokens.accentBlueDeep,
    borderWidth: 1.5,
  },
  calCellSelected: {
    borderWidth: 2,
    borderColor: beautyTokens.accentBlueDeep,
  },
  calDay: {
    fontFamily: beautyTokens.fontBody,
    fontSize: 12, fontWeight: '500', color: beautyTokens.text,
  },
  calDayToday: { fontWeight: '700', color: beautyTokens.accentBlueText },
  calPip: {
    position: 'absolute', bottom: 3,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: beautyTokens.accentBlueDeep,
  },
  dayBookings: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: beautyTokens.line },
  dayHead: {
    fontFamily: 'Menlo', fontSize: 10, color: beautyTokens.textMuted, marginBottom: 6,
  },
  dayBookingRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 6,
  },
  dayBookingTime: { fontFamily: 'Menlo', fontSize: 12, fontWeight: '700', color: beautyTokens.text },
  dayBookingSvc: { flex: 1, fontSize: 12, fontWeight: '500', color: beautyTokens.text, fontFamily: beautyTokens.fontBody },
  dayBookingCust: { fontSize: 10, color: beautyTokens.textMuted, fontFamily: beautyTokens.fontBody },

  /* QA tiles */
  qaRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  qaTile: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line,
    minHeight: 44,
    gap: 8,
  },
  qaTilePrimary: { backgroundColor: beautyTokens.text, borderColor: beautyTokens.text },
  qaIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: beautyTokens.accentBlue,
    alignItems: 'center', justifyContent: 'center',
  },
  qaIconPrimary: { backgroundColor: 'rgba(255,255,255,0.14)' },
  qaText: { width: '100%' },
  qaLabel: { fontSize: 13, fontWeight: '600', color: beautyTokens.text, lineHeight: 15, fontFamily: beautyTokens.fontBody },
  qaSub: { fontSize: 10, color: beautyTokens.textMuted, marginTop: 2, fontFamily: beautyTokens.fontBody },

  /* Stats row */
  statsRow: { flexDirection: 'row', gap: 10 },
  earnCard: { flex: 1.1, minWidth: 0 },
  volCard: { flex: 1, minWidth: 0 },
  cardEyebrow: {
    fontFamily: beautyTokens.fontBody,
    fontSize: 11, fontWeight: '600', letterSpacing: 0.6,
    color: beautyTokens.textMuted,
  },
  cardMonth: { fontSize: 11, color: beautyTokens.textMuted, marginTop: 2, fontFamily: beautyTokens.fontBody },

  /* Arc */
  arcWrap: { marginTop: 8, paddingHorizontal: 12, position: 'relative' },
  arcSvg: { alignSelf: 'center', maxWidth: 180 },
  arcValue: { alignItems: 'center', marginTop: -8 },
  arcStrong: {
    fontFamily: beautyTokens.fontBody, fontSize: 22, fontWeight: '700',
    color: beautyTokens.text, lineHeight: 22,
  },
  arcSub: { fontFamily: 'Menlo', fontSize: 10, color: beautyTokens.textMuted, marginTop: 4 },

  /* Volume */
  volTotal: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8, marginBottom: 12 },
  volTotalStrong: {
    fontFamily: beautyTokens.fontBody, fontSize: 32, fontWeight: '700',
    color: beautyTokens.text, lineHeight: 32,
  },
  volTotalSpan: { fontSize: 11, color: beautyTokens.textMuted, fontFamily: beautyTokens.fontBody },
  volGrid: { flexDirection: 'row', gap: 8 },
  volCell: {
    flex: 1, backgroundColor: beautyTokens.surface,
    borderRadius: 8, padding: 8, paddingHorizontal: 10,
    borderWidth: 1, borderColor: beautyTokens.line,
  },
  volNum: {
    fontFamily: beautyTokens.fontBody, fontSize: 20, fontWeight: '700',
    color: beautyTokens.text, lineHeight: 20,
  },
  volLabel: {
    fontSize: 10, fontWeight: '600', color: beautyTokens.textMuted,
    letterSpacing: 0.4, marginTop: 4, fontFamily: beautyTokens.fontBody,
  },

  /* Empty */
  emptyGreet: { marginBottom: 12 },
  emptyTitle: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 22, fontWeight: '500',
    color: beautyTokens.text, letterSpacing: 0.2,
  },
  emptySub: { fontSize: 12, color: beautyTokens.textMuted, marginTop: 2, fontFamily: beautyTokens.fontBody },

  /* Setup stepper pills (mirror wizard chrome) */
  setupSteps: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  setupPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, paddingVertical: 3 },
  setupPillCurrent: {
    backgroundColor: beautyTokens.accentBlue, borderRadius: 999, paddingHorizontal: 8,
    borderWidth: 1, borderColor: 'rgba(125,168,207,0.35)',
  },
  setupNum: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1, borderColor: beautyTokens.line, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  setupNumCurrent: { backgroundColor: beautyTokens.accentBlueDeep, borderColor: beautyTokens.accentBlueDeep },
  setupNumDone: { backgroundColor: beautyTokens.success, borderColor: beautyTokens.success },
  setupNumText: { fontSize: 9, fontWeight: '700', color: beautyTokens.textMuted, fontFamily: beautyTokens.fontBody },
  setupNumTextCurrent: { color: '#FFFFFF' },
  setupName: { fontSize: 10, color: beautyTokens.textMuted, fontFamily: beautyTokens.fontBody, flexShrink: 1 },
  setupNameCurrent: { color: beautyTokens.accentBlueText, fontWeight: '700' },

  checklistCard: { overflow: 'hidden', marginBottom: 12 },
  ckHead: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: beautyTokens.line },
  ckHeadTitle: { fontFamily: beautyTokens.fontDisplay, fontSize: 16, fontWeight: '500', color: beautyTokens.text },
  ckHeadSub: { fontSize: 11, color: beautyTokens.textMuted, marginTop: 2, fontFamily: beautyTokens.fontBody },
  ckRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: beautyTokens.line,
    minHeight: 44,
  },
  ckRowLast: { borderBottomWidth: 0 },
  ckBubble: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: beautyTokens.line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  ckBubbleDone: { borderWidth: 0, backgroundColor: beautyTokens.success },
  ckBubbleText: { fontSize: 11, fontWeight: '700', color: beautyTokens.textMuted, fontFamily: beautyTokens.fontBody },
  ckText: { flex: 1, minWidth: 0 },
  ckLabel: { fontSize: 13, fontWeight: '600', color: beautyTokens.text, fontFamily: beautyTokens.fontBody },
  ckLabelDone: { color: beautyTokens.textMuted, textDecorationLine: 'line-through' },
  ckSub: { fontSize: 11, color: beautyTokens.textMuted, marginTop: 2, fontFamily: beautyTokens.fontBody },
});
