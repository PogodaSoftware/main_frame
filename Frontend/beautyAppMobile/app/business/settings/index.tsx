/**
 * Business settings — mirrors Angular beauty-business-settings.component.
 * Avatar+email mini-row · Account / Business / Danger grouped cards · confirm modals.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { useSession } from '@/hooks/useSession';
import { BeautyShell } from '@/components/BeautyShell';
import {
  ProvBtn,
  ProvCard,
  ProvSubHeader,
  ProvTabBar,
  type ProviderTab,
} from '@/components/business';
import { beautyTokens } from '../../../tamagui.config';

interface SettingsData {
  business?: { email?: string; business_name?: string };
  badges?: { messages_unread?: number; bookings_unread?: number };
}

interface MenuRow {
  label: string;
  sub: string;
  link?: string;
  testid?: string;
  danger?: boolean;
  action?: 'logout' | 'delete';
}

const ACCOUNT_ROWS: MenuRow[] = [
  { label: 'Change password', sub: 'Update your sign-in password', link: 'change_password', testid: 'settings-change-password' },
  { label: 'Email & contact', sub: 'Account email', link: 'email_contact' },
  { label: 'Storefront preview', sub: 'See what customers see', link: 'storefront_preview' },
];
const BUSINESS_ROWS: MenuRow[] = [
  { label: 'Schedule', sub: 'Set when you are open and closed', link: 'schedule', testid: 'settings-schedule' },
  { label: 'Services', sub: 'Add, edit, remove services', link: 'services' },
  { label: 'Notifications', sub: 'Email & push preferences', link: 'notifications' },
];
const DANGER_ROWS: MenuRow[] = [
  { label: 'Sign out', sub: 'End this session', danger: true, action: 'logout', testid: 'settings-logout' },
  { label: 'Delete account', sub: 'Permanently remove this business', danger: true, action: 'delete', testid: 'settings-delete-account' },
];

export default function BusinessSettingsScreen() {
  const router = useRouter();
  const { clear } = useSession();
  const [env, setEnv] = useState<BffEnvelope<SettingsData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<SettingsData>('beauty_business_settings');
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

  const links: Record<string, BffLink> = (env?._links as Record<string, BffLink>) ?? {};
  const business = env?.action === 'render' ? env.data?.business : undefined;
  const businessName = business?.business_name?.trim() || '';
  const initial = businessName ? businessName[0].toUpperCase() : '·';
  const badges = env?.action === 'render' ? (env.data?.badges ?? {}) : {};

  const goBack = () => {
    const link = links['business_home'];
    if (link) navigateLink(router, link);
    else router.replace('/business/home' as any);
  };

  const onTab = (tab: ProviderTab) => {
    if (tab === 'profile') {
      const link = links['profile'];
      if (link) navigateLink(router, link);
      else router.replace('/business/profile' as any);
      return;
    }
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

  const rowLabel = (r: MenuRow): string => {
    if (r.action === 'logout') return loggingOut ? 'Signing out…' : 'Sign out';
    return r.label;
  };

  const rowDisabled = (r: MenuRow): boolean => {
    if (r.action === 'logout') return loggingOut || !links['logout'];
    if (r.action === 'delete') return deleting || !links['delete_account'];
    if (r.link) return !links[r.link];
    return false;
  };

  const onRowPress = (r: MenuRow) => {
    if (r.action === 'logout') { if (!loggingOut) setShowLogoutConfirm(true); return; }
    if (r.action === 'delete') { if (!deleting) setShowDeleteConfirm(true); return; }
    if (r.link) {
      const link = links[r.link];
      if (link) navigateLink(router, link);
    }
  };

  const logout = async () => {
    const link = links['logout'];
    if (!link || loggingOut) return;
    setLoggingOut(true);
    await dispatchLink(link);
    setLoggingOut(false);
    setShowLogoutConfirm(false);
    clear();
    router.replace('/(auth)/business-login' as any);
  };

  const deleteAccount = async () => {
    const link = links['delete_account'];
    if (!link || deleting) return;
    setDeleting(true);
    const result = await dispatchLink(link);
    setDeleting(false);
    setShowDeleteConfirm(false);
    if (!result.ok) {
      setMessage({ text: 'Could not delete account.', isError: true });
    } else {
      clear();
      router.replace('/(customer)/home' as any);
    }
  };

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ProvSubHeader back="Dashboard" title="Settings" onBackPress={goBack} />

      {!env && !error ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={beautyTokens.accentBlueDeep} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={styles.emailRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text style={styles.emailMono}>{business?.email}</Text>
          </View>

          <Group label="ACCOUNT">
            <MenuCard rows={ACCOUNT_ROWS} onPress={onRowPress} rowLabel={rowLabel} rowDisabled={rowDisabled} />
          </Group>

          <Group label="BUSINESS">
            <MenuCard rows={BUSINESS_ROWS} onPress={onRowPress} rowLabel={rowLabel} rowDisabled={rowDisabled} />
          </Group>

          <Group label="DANGER ZONE">
            <MenuCard rows={DANGER_ROWS} onPress={onRowPress} rowLabel={rowLabel} rowDisabled={rowDisabled} />
          </Group>

          {!!message && (
            <Text style={[styles.msg, message.isError && styles.msgError]} accessibilityRole={message.isError ? 'alert' : undefined}>
              {message.text}
            </Text>
          )}
        </ScrollView>
      )}

      <ProvTabBar
        active="profile"
        badges={{ bookings: badges.bookings_unread, messages: badges.messages_unread }}
        onTabPress={onTab}
      />

      <ConfirmModal
        visible={showLogoutConfirm}
        title="Sign out?"
        body="You'll need to sign in again to manage your storefront and respond to messages."
        primaryLabel={loggingOut ? 'Signing out…' : 'Sign out'}
        primaryVariant="danger"
        secondaryLabel="Stay signed in"
        busy={loggingOut}
        onConfirm={logout}
        onDismiss={() => setShowLogoutConfirm(false)}
      />

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete account?"
        body="This permanently removes your business, services, and storefront. Active bookings remain valid for the customer. This cannot be undone."
        primaryLabel={deleting ? 'Deleting…' : 'Delete account'}
        primaryVariant="danger"
        secondaryLabel="Keep my account"
        busy={deleting}
        onConfirm={deleteAccount}
        onDismiss={() => setShowDeleteConfirm(false)}
      />
    </BeautyShell>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <Text style={styles.groupLabel}>{label}</Text>
      {children}
    </>
  );
}

function MenuCard({
  rows,
  onPress,
  rowLabel,
  rowDisabled,
}: {
  rows: MenuRow[];
  onPress: (r: MenuRow) => void;
  rowLabel: (r: MenuRow) => string;
  rowDisabled: (r: MenuRow) => boolean;
}) {
  return (
    <ProvCard padding={0} style={styles.menuCard}>
      <View style={styles.menuCardInner}>
        {rows.map((r, idx) => {
          const disabled = rowDisabled(r);
          return (
            <Pressable
              key={r.label}
              onPress={() => { if (!disabled) onPress(r); }}
              disabled={disabled}
              testID={r.testid}
              style={[styles.menuRow, idx === rows.length - 1 && styles.menuRowLast, disabled && styles.menuRowDisabled]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, r.danger && styles.rowLabelDanger]}>{rowLabel(r)}</Text>
                <Text style={styles.rowSub}>{r.sub}</Text>
              </View>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={r.danger ? beautyTokens.danger : beautyTokens.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M9 18l6-6-6-6" />
              </Svg>
            </Pressable>
          );
        })}
      </View>
    </ProvCard>
  );
}

function ConfirmModal({
  visible,
  title,
  body,
  primaryLabel,
  primaryVariant,
  secondaryLabel,
  busy,
  onConfirm,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  body: string;
  primaryLabel: string;
  primaryVariant: 'primary' | 'danger';
  secondaryLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalBody}>{body}</Text>
          <View style={styles.modalActions}>
            <View style={styles.modalActionWrap}>
              <ProvBtn variant="secondary" size="md" full disabled={busy} onPress={onDismiss}>
                {secondaryLabel}
              </ProvBtn>
            </View>
            <View style={styles.modalActionWrap}>
              <ProvBtn variant={primaryVariant} size="md" full disabled={busy} onPress={onConfirm}>
                {primaryLabel}
              </ProvBtn>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flex: 1, padding: 16 },
  errorText: { color: beautyTokens.danger, fontFamily: beautyTokens.fontBody, fontSize: 13 },

  body: { flex: 1, backgroundColor: beautyTokens.surface },
  bodyContent: { padding: 16, paddingTop: 14 },

  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, paddingTop: 8, paddingBottom: 14 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: beautyTokens.accentBlueDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: beautyTokens.fontDisplay, fontSize: 15, fontWeight: '500', color: beautyTokens.accentBlueText },
  emailMono: { fontFamily: 'Menlo', fontSize: 12, color: beautyTokens.textMuted },

  groupLabel: {
    fontSize: 10, fontWeight: '700',
    color: beautyTokens.textMuted, letterSpacing: 1.2,
    marginBottom: 8, paddingLeft: 4,
    fontFamily: beautyTokens.fontBody,
  },
  menuCard: { marginBottom: 14, overflow: 'hidden' },
  menuCardInner: {},
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: beautyTokens.line,
    minHeight: 44,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuRowDisabled: { opacity: 0.5 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 13, fontWeight: '600', color: beautyTokens.text, fontFamily: beautyTokens.fontBody },
  rowLabelDanger: { color: beautyTokens.danger },
  rowSub: { fontSize: 11, color: beautyTokens.textMuted, marginTop: 2, fontFamily: beautyTokens.fontBody },

  msg: { paddingVertical: 12, color: beautyTokens.accentBlueText, fontSize: 13, fontFamily: beautyTokens.fontBody },
  msgError: { color: beautyTokens.danger },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(15, 17, 21, 0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingVertical: 20, paddingHorizontal: 20,
    width: '100%', maxWidth: 380,
  },
  modalTitle: { fontFamily: beautyTokens.fontDisplay, fontSize: 22, fontWeight: '500', color: beautyTokens.text, marginBottom: 8 },
  modalBody: { fontSize: 13, lineHeight: 19, color: beautyTokens.textMuted, fontFamily: beautyTokens.fontBody, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 8 },
  modalActionWrap: { flex: 1 },
});
