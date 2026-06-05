/**
 * Admin Portal atoms — RN port of Angular admin-portal/atoms.ts.
 * Status bar, home indicator, brand mark + row, button. Slate-tone variants.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolve } from '@/services/bff';
import { isRedirect } from '@/bff/types';
import { admTokens } from './tokens';

interface AdmNotif {
  kind: string;
  title: string;
  sub: string;
  time: string;
  unread?: boolean;
  screen?: string;
}

// BFF screen name → RN admin route for notification tap-through.
const ADM_NOTIF_ROUTE: Record<string, string> = {
  beauty_admin_portal_crm: '/admin/portal/crm',
  beauty_admin_portal_tickets: '/admin/portal/tickets',
  beauty_admin_portal_audit: '/admin/portal/audit',
  beauty_admin_portal_notifications: '/admin/portal/notifications',
};

type Tone = 'slate' | 'light';

export function AdmStatusBar({ tone = 'slate' }: { tone?: Tone }) {
  const color = tone === 'slate' ? admTokens.white : admTokens.text;
  return (
    <View style={styles.bar}>
      <Text style={[styles.time, { color }]}>9:41</Text>
      <View style={styles.icons}>
        <Svg width={16} height={10} viewBox="0 0 16 10">
          <Rect x={0} y={7} width={2} height={3} rx={0.5} fill={color} />
          <Rect x={4} y={5} width={2} height={5} rx={0.5} fill={color} />
          <Rect x={8} y={3} width={2} height={7} rx={0.5} fill={color} />
          <Rect x={12} y={0} width={2} height={10} rx={0.5} fill={color} />
        </Svg>
        <Svg width={14} height={10} viewBox="0 0 14 10">
          <Path
            d="M7 9.5a1 1 0 100-2 1 1 0 000 2zM3.2 6.4a5.4 5.4 0 017.6 0l-1 1a4 4 0 00-5.6 0l-1-1zM.7 4a8.8 8.8 0 0112.6 0l-1 1a7.4 7.4 0 00-10.6 0L.7 4z"
            fill={color}
          />
        </Svg>
        <Svg width={22} height={10} viewBox="0 0 22 10">
          <Rect x={0.5} y={0.5} width={18} height={9} rx={2} stroke={color} strokeOpacity={0.5} fill="none" />
          <Rect x={2} y={2} width={15} height={6} rx={1} fill={color} />
          <Rect x={19.5} y={3.5} width={1.5} height={3} rx={0.5} fill={color} fillOpacity={0.5} />
        </Svg>
      </View>
    </View>
  );
}

export function AdmHomeIndicator({ tone = 'slate' }: { tone?: Tone }) {
  const bg = tone === 'slate' ? admTokens.slate : admTokens.white;
  const barColor = tone === 'slate' ? admTokens.white : admTokens.slate;
  const insets = useSafeAreaInsets();
  // edge-to-edge: pad for the OS gesture bar so our home indicator pill
  // doesn't get hidden underneath it.
  return (
    <View style={[styles.hi, { backgroundColor: bg, paddingBottom: insets.bottom }]}>
      <View style={[styles.hiBar, { backgroundColor: barColor }]} />
    </View>
  );
}

export function AdmBrandMark({ size = 20, color = admTokens.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={3} width={16} height={18} rx={2} />
      <Path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2" />
    </Svg>
  );
}

export function AdmBrandRow({ size = 20 }: { size?: number }) {
  return (
    <View style={styles.brandRow}>
      <AdmBrandMark size={size} />
      <Text style={styles.brandWord}>Beauty</Text>
      <View style={styles.brandBadge}>
        <Text style={styles.brandBadgeText}>Admin</Text>
      </View>
    </View>
  );
}

export type AdmBtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerOutline' | 'slate' | 'slatePrimary';

export interface AdmBtnProps {
  variant?: AdmBtnVariant;
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}

export function AdmBtn({ variant = 'primary', size = 'md', full, disabled, onPress, children }: AdmBtnProps) {
  const v = btnVariants[variant];
  const s = btnSizes[size];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        v,
        s,
        full && { width: '100%' },
        (disabled || pressed) && { opacity: disabled ? 0.5 : 0.8 },
      ]}
    >
      <Text style={[styles.btnText, { color: v.color as string, fontSize: s.fontSize }]}>{children}</Text>
    </Pressable>
  );
}

const btnSizes: Record<'sm' | 'md' | 'lg', { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 32, paddingHorizontal: 12, fontSize: 12 },
  md: { height: 40, paddingHorizontal: 16, fontSize: 13 },
  lg: { height: 48, paddingHorizontal: 20, fontSize: 14 },
};

const btnVariants: Record<AdmBtnVariant, any> = {
  primary: { backgroundColor: '#0F1115', color: '#fff', borderColor: '#0F1115', borderWidth: 1 },
  secondary: { backgroundColor: '#fff', color: '#0F1115', borderColor: admTokens.line, borderWidth: 1 },
  ghost: { backgroundColor: 'transparent', color: '#0F1115', borderColor: 'transparent', borderWidth: 1 },
  danger: { backgroundColor: admTokens.red, color: '#fff', borderColor: admTokens.red, borderWidth: 1 },
  dangerOutline: { backgroundColor: '#fff', color: admTokens.red, borderColor: 'rgba(178,58,45,0.33)', borderWidth: 1 },
  slate: { backgroundColor: admTokens.slate2, color: '#fff', borderColor: admTokens.slateLine, borderWidth: 1 },
  slatePrimary: { backgroundColor: '#fff', color: admTokens.slate, borderColor: '#fff', borderWidth: 1 },
};

export function AdmTopHeader({
  notifCount,
  initials = 'MR',
  onNotifPress,
  onAvatarPress,
}: {
  notifCount?: number | null;
  initials?: string;
  onNotifPress?: () => void;
  onAvatarPress?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AdmNotif[]>([]);

  const openPanel = useCallback(async () => {
    if (onNotifPress) { onNotifPress(); return; } // caller override
    setOpen(true);
    setLoading(true);
    try {
      const e = await resolve<{ notifications: AdmNotif[] }>('beauty_admin_portal_notifications');
      if (!isRedirect(e) && e.action === 'render') setItems(e.data?.notifications ?? []);
    } catch {
      /* leave empty */
    } finally {
      setLoading(false);
    }
  }, [onNotifPress]);

  const goto = (screen?: string) => {
    setOpen(false);
    const route = screen ? ADM_NOTIF_ROUTE[screen] : undefined;
    if (route) router.push(route as any);
  };

  return (
    <View style={styles.hdr}>
      <AdmBrandRow />
      <View style={{ flex: 1 }} />
      <Pressable onPress={openPanel} style={styles.iconBtn} accessibilityLabel="Notifications">
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#E8ECF1" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <Path d="M10 21a2 2 0 0 0 4 0" />
        </Svg>
        {notifCount ? (
          <View style={styles.iconBadge}>
            <Text style={styles.iconBadgeText}>{notifCount}</Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable onPress={onAvatarPress} style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </Pressable>

      <AdmNotifPanel
        visible={open}
        loading={loading}
        items={items}
        topInset={insets.top}
        onClose={() => setOpen(false)}
        onItem={(it) => goto(it.screen)}
        onViewAll={() => goto('beauty_admin_portal_notifications')}
        onMarkAllRead={() => setItems((cur) => cur.map((i) => ({ ...i, unread: false })))}
      />
    </View>
  );
}

export function AdmNotifIcon({ kind }: { kind: string }) {
  const c = NOTIF_ICON_COLOR[kind] ?? NOTIF_ICON_COLOR.default;
  return (
    <View style={[styles.notifIcon, { backgroundColor: c.bg }]}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c.fg} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {kind === 'flag' ? (
          <Path d="M4 22V4M4 4h13l-2 4 2 4H4" />
        ) : kind === 'provider' ? (
          <>
            <Circle cx={9} cy={8} r={3.2} />
            <Path d="M3.5 20a5.5 5.5 0 0 1 11 0M18 8v6M21 11h-6" />
          </>
        ) : kind === 'ticket' ? (
          <>
            <Rect x={3} y={5} width={18} height={14} rx={2} />
            <Path d="M3 7l9 6 9-6" />
          </>
        ) : (
          <>
            <Circle cx={12} cy={12} r={9} />
            <Path d="M12 7v5l3 2" />
          </>
        )}
      </Svg>
    </View>
  );
}

const NOTIF_ICON_COLOR: Record<string, { bg: string; fg: string }> = {
  flag:     { bg: '#FCE8E5', fg: '#B23A2D' },
  provider: { bg: '#E5F3EA', fg: '#2F7A47' },
  ticket:   { bg: '#EAF1F8', fg: '#3F6F9C' },
  default:  { bg: '#F1ECE2', fg: '#7A5A1F' },
};

export function AdmNotifPanel({
  visible,
  loading,
  items,
  topInset = 0,
  onClose,
  onItem,
  onViewAll,
  onMarkAllRead,
}: {
  visible: boolean;
  loading?: boolean;
  items: AdmNotif[];
  topInset?: number;
  onClose: () => void;
  onItem: (it: AdmNotif) => void;
  onViewAll: () => void;
  onMarkAllRead: () => void;
}) {
  const unread = items.filter((i) => i.unread).length;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.notifBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.notifCard, { marginTop: topInset + 52 }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          <View style={styles.notifHead}>
            <Text style={styles.notifTitle}>Notifications</Text>
            {unread ? (
              <View style={styles.notifNewPill}>
                <Text style={styles.notifNewPillText}>{unread} new</Text>
              </View>
            ) : null}
            <View style={{ flex: 1 }} />
            <Pressable onPress={onMarkAllRead} hitSlop={8}>
              <Text style={styles.notifMarkRead}>Mark all read</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.notifLoading}><ActivityIndicator color={admTokens.slateMuted} /></View>
          ) : items.length === 0 ? (
            <View style={styles.notifLoading}><Text style={styles.notifEmpty}>You&apos;re all caught up.</Text></View>
          ) : (
            items.map((it, i) => (
              <Pressable
                key={i}
                onPress={() => onItem(it)}
                style={[styles.notifRow, i < items.length - 1 && styles.notifRowDivider]}
              >
                <AdmNotifIcon kind={it.kind} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.notifRowTitle} numberOfLines={1}>{it.title}</Text>
                  <Text style={styles.notifRowSub} numberOfLines={1}>{it.sub}</Text>
                </View>
                <View style={styles.notifRowRight}>
                  <Text style={styles.notifRowTime}>{it.time}</Text>
                  {it.unread ? <View style={styles.notifDot} /> : null}
                </View>
              </Pressable>
            ))
          )}

          <Pressable onPress={onViewAll} style={styles.notifFooter}>
            <Text style={styles.notifFooterText}>View all activity →</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export type AdmTabKind = 'home' | 'crm' | 'bookings' | 'tickets' | 'team';
interface TabDef { kind: AdmTabKind; label: string }
const ADM_TABS: TabDef[] = [
  { kind: 'home', label: 'Home' },
  { kind: 'crm', label: 'CRM' },
  { kind: 'bookings', label: 'Bookings' },
  { kind: 'tickets', label: 'Tickets' },
  { kind: 'team', label: 'Team' },
];

function TabIcon({ kind, color }: { kind: AdmTabKind; color: string }) {
  const stroke = color;
  if (kind === 'home') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2v-9z" />
      </Svg>
    );
  }
  if (kind === 'crm') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={9} cy={8} r={3.5} />
        <Path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <Circle cx={17.5} cy={9.5} r={2.5} />
        <Path d="M14.5 18.5c.4-2.4 2.4-4 5-4 .7 0 1.4.1 2 .3" />
      </Svg>
    );
  }
  if (kind === 'bookings') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={3} y={5} width={18} height={16} rx={2.5} />
        <Path d="M3 10h18M8 3v4M16 3v4" />
      </Svg>
    );
  }
  if (kind === 'tickets') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
        <Path d="M10 6v12" strokeDasharray="2 2" />
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={8} cy={9} r={3} />
      <Circle cx={17} cy={9} r={3} />
      <Path d="M2 19c0-2.8 2.7-5 6-5s6 2.2 6 5M14 19c0-2.4 2-4.5 4.5-5" />
    </Svg>
  );
}

export function AdmTabBar({
  active,
  badges = {},
  onSelect,
}: {
  active: AdmTabKind;
  badges?: Partial<Record<AdmTabKind, number | string | null>>;
  onSelect: (kind: AdmTabKind) => void;
}) {
  return (
    <View style={styles.tabBar}>
      {ADM_TABS.map((t) => {
        const isActive = t.kind === active;
        const color = isActive ? admTokens.white : admTokens.slateMuted;
        const badge = badges[t.kind];
        return (
          <Pressable key={t.kind} onPress={() => onSelect(t.kind)} style={styles.tab}>
            {isActive ? <View style={styles.tabAccent} /> : null}
            <View>
              <TabIcon kind={t.kind} color={color} />
              {badge ? (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.tabLabel, { color, fontWeight: isActive ? '600' : '500' }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AdmAvatar({
  initials,
  size = 36,
  kind = 'customer',
}: {
  initials: string;
  size?: number;
  kind?: 'customer' | 'provider';
}) {
  const bg = kind === 'provider' ? '#7DA8CF' : '#6B4F3A';
  return (
    <View
      style={[
        styles.admAvatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.32, fontWeight: '700', letterSpacing: 0.4 }}>
        {initials}
      </Text>
    </View>
  );
}

export type AdmStatusKind =
  | 'Active'
  | 'Suspended'
  | 'Pending'
  | 'Deleted'
  | 'Flagged'
  | 'Verified'
  | 'VIP'
  | 'AtRisk';

const STATUS_PALETTE: Record<AdmStatusKind, { bg: string; fg: string; label?: string }> = {
  Active: { bg: '#E5F3EA', fg: '#2F7A47' },
  Suspended: { bg: '#FCE8E5', fg: '#C0392B' },
  Pending: { bg: '#FFF4DA', fg: '#8A6A1F' },
  Deleted: { bg: '#E9E9EB', fg: '#6B6F77' },
  Flagged: { bg: '#FFF4DA', fg: '#8A6A1F' },
  Verified: { bg: '#E5F3EA', fg: '#2F7A47' },
  VIP: { bg: '#F1E8DA', fg: '#7A5A1F' },
  AtRisk: { bg: '#FCE8E5', fg: '#C0392B', label: 'At risk' },
};

export function AdmStatusChip({ status }: { status: AdmStatusKind | string }) {
  const palette = STATUS_PALETTE[status as AdmStatusKind] ?? STATUS_PALETTE.Active;
  return (
    <View style={[styles.statusChip, { backgroundColor: palette.bg }]}>
      <Text style={[styles.statusChipText, { color: palette.fg }]}>
        {palette.label ?? status}
      </Text>
    </View>
  );
}

export function AdmFilterChip({
  active = false,
  count,
  style = 'pill',
  children,
  icon,
  caret = false,
  onPress,
}: {
  active?: boolean;
  count?: number | string | null;
  style?: 'pill' | 'underline';
  children: React.ReactNode;
  // Leading icon — receives the resolved text color so it flips with state.
  icon?: (color: string) => React.ReactNode;
  // Trailing ▾ caret, for chips that open a dropdown in the design.
  caret?: boolean;
  onPress?: () => void;
}) {
  if (style === 'underline') {
    const color = active ? admTokens.text : admTokens.textMuted;
    return (
      <Pressable onPress={onPress} style={styles.underlineChip}>
        {icon ? icon(color) : null}
        <Text style={[styles.underlineChipText, active && styles.underlineChipTextOn]}>
          {children}
        </Text>
        {caret ? <Text style={[styles.chipCaret, { color }]}>▾</Text> : null}
        {count !== null && count !== undefined ? (
          <Text style={styles.underlineChipCount}>{count}</Text>
        ) : null}
        {active ? <View style={styles.underlineChipBar} /> : null}
      </Pressable>
    );
  }
  const color = active ? '#fff' : '#0F1115';
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pillChip, active && styles.pillChipOn]}
    >
      {icon ? icon(color) : null}
      <Text style={[styles.pillChipText, active && { color: '#fff' }]}>{children}</Text>
      {caret ? <Text style={[styles.chipCaret, { color }]}>▾</Text> : null}
      {count !== null && count !== undefined ? (
        <View style={[styles.pillChipCount, active && { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Text style={[styles.pillChipCountText, active && { color: '#fff' }]}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function AdmCard({ padding = 14, children, style }: { padding?: number; children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

export function AdmSectionTitle({ children, sub, action }: { children: React.ReactNode; sub?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitleText}>{children}</Text>
        {sub ? <Text style={styles.sectionTitleSub}>{sub}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 28,
    paddingRight: 24,
    flexShrink: 0,
  },
  time: { fontSize: 13, fontWeight: '600' },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hi: { height: 34, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  hiBar: { width: 134, height: 5, borderRadius: 3 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandWord: { fontSize: 22, lineHeight: 22, color: admTokens.white, fontFamily: 'CormorantGaramond_500Medium' },
  brandBadge: {
    backgroundColor: admTokens.red,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 2,
  },
  brandBadgeText: {
    color: admTokens.white,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  btn: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnText: { fontWeight: '600', letterSpacing: 0.2 },
  hdr: {
    backgroundColor: admTokens.slate,
    paddingHorizontal: 14,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: admTokens.slateLine,
    flexShrink: 0,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    borderRadius: 999,
    backgroundColor: admTokens.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: admTokens.slate,
  },
  iconBadgeText: { color: admTokens.white, fontSize: 9, fontWeight: '700', lineHeight: 14 },

  // ── Notifications dropdown ──
  notifBackdrop: { flex: 1, backgroundColor: 'rgba(15,17,21,0.35)', alignItems: 'flex-end' },
  notifCard: {
    width: 344, maxWidth: '94%', marginRight: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingTop: 6, paddingBottom: 4,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14,
  },
  notifHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  notifTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 20, color: admTokens.text },
  notifNewPill: { backgroundColor: '#FCE8E5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  notifNewPillText: { color: admTokens.red, fontSize: 10, fontWeight: '700' },
  notifMarkRead: { color: admTokens.red, fontSize: 12, fontWeight: '600' },
  notifLoading: { paddingVertical: 28, alignItems: 'center' },
  notifEmpty: { color: admTokens.textMuted, fontSize: 13 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  notifRowDivider: { borderBottomWidth: 1, borderBottomColor: admTokens.line },
  notifIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  notifRowTitle: { fontSize: 14, fontWeight: '600', color: admTokens.text },
  notifRowSub: { fontSize: 12, color: admTokens.textMuted, marginTop: 2 },
  notifRowRight: { alignItems: 'flex-end', gap: 6, minWidth: 30 },
  notifRowTime: { fontSize: 11, color: admTokens.textMuted },
  notifDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: admTokens.red },
  notifFooter: { paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: admTokens.line, marginTop: 2 },
  notifFooterText: { fontSize: 13, fontWeight: '700', color: admTokens.text },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6B4F3A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: admTokens.slate3,
  },
  avatarText: { color: admTokens.white, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: admTokens.slate,
    borderTopWidth: 1,
    borderTopColor: admTokens.slateLine,
    flexShrink: 0,
  },
  tab: { flex: 1, height: 64, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabAccent: { position: 'absolute', top: 6, width: 22, height: 2, borderRadius: 2, backgroundColor: admTokens.red },
  tabBadge: {
    position: 'absolute',
    top: -3,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: admTokens.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: admTokens.slate,
  },
  tabBadgeText: { color: admTokens.white, fontSize: 10, fontWeight: '700', lineHeight: 13 },
  tabLabel: { fontSize: 10.5, letterSpacing: 0.1 },
  card: {
    backgroundColor: admTokens.white,
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 14,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  sectionTitleText: { fontSize: 20, color: admTokens.text, fontFamily: 'CormorantGaramond_500Medium' },
  sectionTitleSub: { fontSize: 11, color: admTokens.textMuted, marginTop: 2 },
  admAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusChip: {
    paddingHorizontal: 8,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    lineHeight: 12,
  },
  pillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: admTokens.line,
  },
  pillChipOn: { backgroundColor: '#0F1115', borderColor: '#0F1115' },
  pillChipText: { fontSize: 12, fontWeight: '600', color: '#0F1115' },
  chipCaret: { fontSize: 9, marginLeft: -2 },
  pillChipCount: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: admTokens.surface,
  },
  pillChipCountText: { fontSize: 10, fontWeight: '600', color: admTokens.textMuted },
  underlineChip: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  underlineChipText: { fontSize: 12, fontWeight: '500', color: admTokens.textMuted },
  underlineChipTextOn: { color: admTokens.text, fontWeight: '700' },
  underlineChipCount: {
    fontSize: 10,
    color: admTokens.textMuted,
    borderWidth: 1,
    borderColor: admTokens.line,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
  },
  underlineChipBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: '#0F1115',
    borderRadius: 1,
  },
});
