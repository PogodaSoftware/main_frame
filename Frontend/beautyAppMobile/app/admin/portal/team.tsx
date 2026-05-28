/**
 * Admin Portal — Admin team (`/admin/portal/team`).
 * Roster + role/permissions matrix + owner-only invite composer.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { api } from '@/services/api';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import {
  AdmAvatar,
  AdmBtn,
  AdmCard,
  AdmHomeIndicator,
  AdmTabBar,
  AdmTopHeader,
  type AdmTabKind,
} from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

interface AdminRow {
  principal_id: number;
  user_type: string;
  user_id: number;
  name: string;
  email: string;
  role: string;
  role_label: string;
  role_color: string;
  role_bg: string;
  last_active: string;
  status: string;
  initials: string;
  is_me: boolean;
}
interface InviteRow { id: number; email: string; role: string; role_label: string; expires_at: string }
interface RoleOption { value: string; label: string; color: string; bg: string }
interface MatrixCell { label: string; values: string[] }
interface PermissionMatrix {
  role_order: string[];
  role_labels: string[];
  role_colors: string[];
  rows: MatrixCell[];
}
interface Totals { admins: number; owners: number; pending_invites: number }

interface TeamData {
  admins: AdminRow[];
  invites: InviteRow[];
  totals: Totals;
  role_options: RoleOption[];
  permission_matrix: PermissionMatrix;
  admin_email: string;
  is_owner: boolean;
  tab_badges: Partial<Record<AdmTabKind, number | string | null>>;
  notif_count: number;
  session_remaining?: string;
  admin_initials?: string;
}

export default function AdminTeam() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<TeamData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuRole, setMenuRole] = useState('support_agent');
  const [menuError, setMenuError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('support_agent');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<TeamData>('beauty_admin_portal_team');
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        if (route) router.replace(route as any);
        return;
      }
      setEnv(e);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !env) {
    return (
      <View style={styles.loader}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: admTokens.errorText }}>{error}</Text>
      </View>
    );
  }
  if (!env || env.action !== 'render') {
    return (
      <View style={styles.loader}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={admTokens.white} />
      </View>
    );
  }
  const data = env.data!;

  const onTab = (kind: AdmTabKind) => {
    if (kind === 'team') return;
    const screen = kind === 'home' ? 'beauty_admin_portal_dashboard' : `beauty_admin_portal_${kind}`;
    const route = nativeRouteFor(screen);
    if (route) router.push(route as any);
  };

  const toggleMenu = (a: AdminRow) => {
    if (openMenuId === a.principal_id) {
      setOpenMenuId(null);
      setMenuError(null);
      return;
    }
    setOpenMenuId(a.principal_id);
    setMenuRole(a.role);
    setMenuError(null);
  };

  const onRoleSave = async (a: AdminRow) => {
    if (menuRole === a.role) {
      setOpenMenuId(null);
      return;
    }
    const link = env._links?.role_template as BffLink | undefined;
    if (!link?.href) {
      setMenuError('Endpoint unavailable.');
      return;
    }
    setMenuError(null);
    try {
      await api.request({
        url: link.href.replace(':id', String(a.principal_id)),
        method: link.method,
        data: { role: menuRole },
      });
      setOpenMenuId(null);
      load();
    } catch (err: any) {
      setMenuError(err?.response?.data?.detail ?? 'Failed to update.');
    }
  };

  const onRevoke = async (a: AdminRow) => {
    const link = env._links?.revoke_template as BffLink | undefined;
    if (!link?.href) {
      setMenuError('Endpoint unavailable.');
      return;
    }
    setMenuError(null);
    try {
      await api.request({
        url: link.href.replace(':id', String(a.principal_id)),
        method: link.method,
      });
      setOpenMenuId(null);
      load();
    } catch (err: any) {
      setMenuError(err?.response?.data?.detail ?? 'Failed to revoke.');
    }
  };

  const canSendInvite = inviteEmail.trim().length > 3 && inviteEmail.includes('@') && !!inviteRole;
  const onInviteSend = async () => {
    if (!canSendInvite) return;
    const link = env._links?.invite as BffLink | undefined;
    if (!link?.href) {
      setInviteError('Endpoint unavailable.');
      return;
    }
    setInviteError(null);
    try {
      await api.request({
        url: link.href,
        method: link.method,
        data: { email: inviteEmail.trim(), role: inviteRole },
      });
      setInviteSent(true);
      setInviteEmail('');
      setTimeout(() => {
        setInviteSent(false);
        load();
      }, 1000);
    } catch (err: any) {
      setInviteError(err?.response?.data?.detail ?? 'Failed to send invite.');
    }
  };

  const roleColor = (v: string) =>
    data.role_options.find((r) => r.value === v)?.color ?? '#6B6F77';

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />
      <AdmTopHeader notifCount={data.notif_count || null} initials={data.admin_initials || 'AD'} />

      <View style={styles.sub}>
        <View style={{ flex: 1 }}>
          <Text style={styles.subTitle}>Admin team</Text>
          <Text style={styles.subSummary}>
            <Text style={styles.subNum}>{data.totals.admins}</Text> admins ·{' '}
            <Text style={styles.subNum}>{data.totals.owners}</Text> owner
            {data.totals.owners === 1 ? '' : 's'} ·{' '}
            <Text style={styles.subNum}>{data.totals.pending_invites}</Text> invite
            {data.totals.pending_invites === 1 ? '' : 's'} pending
          </Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
        {data.admins.map((a) => (
          <View key={a.principal_id} style={styles.row}>
            <View style={styles.rowMain}>
              <AdmAvatar initials={a.initials} size={36} kind="customer" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.rName} numberOfLines={1}>{a.name}</Text>
                  {a.is_me ? (
                    <View style={styles.meTag}>
                      <Text style={styles.meTagText}>YOU</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.rEmail} numberOfLines={1}>{a.email || '—'}</Text>
                <View style={styles.rMeta}>
                  <View style={[styles.rolePill, { backgroundColor: a.role_bg }]}>
                    <Text style={[styles.rolePillText, { color: a.role_color }]}>{a.role_label}</Text>
                  </View>
                  <Text style={styles.last}>· Last active {a.last_active}</Text>
                </View>
              </View>
              {data.is_owner && !a.is_me ? (
                <Pressable
                  onPress={() => toggleMenu(a)}
                  style={[styles.kebab, openMenuId === a.principal_id && styles.kebabOn]}
                  accessibilityLabel="More actions"
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill={admTokens.textMuted}>
                    <Circle cx={5} cy={12} r={1.6} />
                    <Circle cx={12} cy={12} r={1.6} />
                    <Circle cx={19} cy={12} r={1.6} />
                  </Svg>
                </Pressable>
              ) : null}
            </View>

            {openMenuId === a.principal_id ? (
              <View style={styles.menu}>
                <View style={styles.menuRow}>
                  <Text style={styles.ml}>Role</Text>
                  <View style={styles.rolePicker}>
                    {data.role_options.map((r) => (
                      <Pressable
                        key={r.value}
                        onPress={() => setMenuRole(r.value)}
                        style={[
                          styles.rolePickerOpt,
                          menuRole === r.value && { backgroundColor: '#0F1115' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rolePickerText,
                            menuRole === r.value && { color: '#fff' },
                          ]}
                        >
                          {r.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable style={styles.mb} onPress={() => onRoleSave(a)}>
                    <Text style={styles.mbText}>Save</Text>
                  </Pressable>
                </View>
                <View style={styles.menuRow}>
                  <Pressable style={[styles.mb, styles.mbDanger]} onPress={() => onRevoke(a)}>
                    <Text style={styles.mbText}>Revoke admin</Text>
                  </Pressable>
                  {menuError ? (
                    <Text style={[styles.hint, { color: '#C0392B' }]}>{menuError}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        ))}

        {data.invites.length > 0 ? (
          <>
            <Text style={styles.sectionEyebrow}>Pending invites</Text>
            {data.invites.map((inv) => (
              <View key={inv.id} style={styles.row}>
                <View style={styles.rowMain}>
                  <View style={styles.invIcon}>
                    <Text style={styles.invIconText}>@</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rName} numberOfLines={1}>{inv.email}</Text>
                    <Text style={styles.rEmail} numberOfLines={1}>
                      expires {inv.expires_at.slice(0, 10)}
                    </Text>
                    <View style={styles.rMeta}>
                      <View
                        style={[
                          styles.rolePill,
                          {
                            backgroundColor:
                              data.role_options.find((r) => r.value === inv.role)?.bg ?? admTokens.surface2,
                          },
                        ]}
                      >
                        <Text style={[styles.rolePillText, { color: roleColor(inv.role) }]}>
                          {inv.role_label}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.sectionEyebrow}>Role permissions · matrix</Text>
        <Text style={styles.matrixBlurb}>
          Authorization is per-role. Owners edit this matrix from{' '}
          <Text style={styles.code}>/admin/team/roles</Text>.
        </Text>
        <View style={styles.matrixWrap}>
          <AdmCard padding={0}>
            <View style={styles.mHead}>
              <Text style={styles.mHeadLabel}>Permission</Text>
              {data.permission_matrix.role_labels.map((lab, i) => (
                // `role_labels` comes from the BFF as the first word of each
                // role label (e.g. "Support lead" -> "Support"), so two roles
                // can collide on the same string. Compose the key with the
                // column index so React keeps each header cell distinct.
                <Text
                  key={`${lab}-${i}`}
                  style={[styles.mHeadRole, { color: data.permission_matrix.role_colors[i] }]}
                >
                  {lab}
                </Text>
              ))}
            </View>
            {data.permission_matrix.rows.map((row, ri) => (
              <View key={row.label} style={[styles.mRow, ri === 0 && { borderTopWidth: 0 }]}>
                <Text style={styles.mRowLabel}>{row.label}</Text>
                {row.values.map((v, ci) => {
                  let bg = admTokens.surface;
                  let fg = '#B8BBC0';
                  let content: React.ReactNode = (
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M5 12h14" />
                    </Svg>
                  );
                  if (v === 'Y') {
                    bg = '#E5F3EA';
                    fg = '#2F7A47';
                    content = (
                      <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M20 6L9 17l-5-5" />
                      </Svg>
                    );
                  } else if (v === 'A') {
                    bg = '#F1E8DA';
                    fg = '#7A5A1F';
                    content = (
                      <Text style={[styles.approvalText, { color: fg }]}>2nd</Text>
                    );
                  }
                  return (
                    <View key={ci} style={styles.mCellWrap}>
                      <View style={[styles.mCell, { backgroundColor: bg }]}>{content}</View>
                    </View>
                  );
                })}
              </View>
            ))}
            <View style={styles.mLegend}>
              <View style={styles.legItem}>
                <View style={[styles.legSq, { backgroundColor: '#E5F3EA', borderColor: '#2F7A47' }]} />
                <Text style={styles.legText}>Allowed</Text>
              </View>
              <View style={styles.legItem}>
                <View style={[styles.legSq, { backgroundColor: '#F1E8DA', borderColor: '#7A5A1F' }]} />
                <Text style={styles.legText}>2nd-admin approval</Text>
              </View>
              <View style={styles.legItem}>
                <View style={[styles.legSq, { backgroundColor: admTokens.surface, borderColor: admTokens.line }]} />
                <Text style={styles.legText}>Denied</Text>
              </View>
            </View>
          </AdmCard>
        </View>

        {data.is_owner ? (
          <>
            <Text style={styles.sectionEyebrow}>Invite teammate</Text>
            <View style={styles.inviteWrap}>
              <AdmCard padding={14}>
                <Text style={styles.eyebrowLight}>Work email</Text>
                <TextInput
                  style={styles.ti}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="name@beauty.io"
                  placeholderTextColor={admTokens.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Text style={styles.eyebrowLight}>Role</Text>
                <View style={styles.roleChips}>
                  {data.role_options.map((r) => {
                    const active = inviteRole === r.value;
                    return (
                      <Pressable
                        key={r.value}
                        onPress={() => setInviteRole(r.value)}
                        style={[
                          styles.roleChip,
                          {
                            backgroundColor: active ? r.bg : '#fff',
                            borderColor: active ? r.color + '55' : admTokens.line,
                          },
                        ]}
                      >
                        <Text style={[styles.roleChipText, { color: r.color }]}>{r.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.inviteInfo}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={admTokens.textMuted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <Circle cx={12} cy={12} r={10} />
                    <Path d="M12 8v4M12 16h.01" />
                  </Svg>
                  <Text style={styles.inviteInfoText}>
                    Invite is sent via email and expires in 72h. 2FA is required on first sign-in.
                  </Text>
                </View>
                {inviteError ? (
                  <Text style={[styles.hint, { color: '#C0392B' }]}>{inviteError}</Text>
                ) : null}
                {inviteSent ? <Text style={[styles.hint, { color: '#2F7A47' }]}>Invite sent.</Text> : null}
                <AdmBtn variant="primary" size="lg" full disabled={!canSendInvite} onPress={onInviteSend}>
                  Send invite →
                </AdmBtn>
              </AdmCard>
            </View>
          </>
        ) : (
          <View style={styles.notOwner}>
            <AdmCard padding={14}>
              <Text style={styles.notOwnerTitle}>Owner role required</Text>
              <Text style={styles.notOwnerBody}>
                You can view the admin roster and permissions matrix, but only Owners can invite,
                change roles, or revoke admin access.
              </Text>
            </AdmCard>
          </View>
        )}
      </ScrollView>

      <AdmTabBar active="team" badges={data.tab_badges} onSelect={onTab} />
      <AdmHomeIndicator tone="slate" />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: admTokens.surface },
  loader: { flex: 1, backgroundColor: admTokens.slate, alignItems: 'center', justifyContent: 'center' },
  sub: {
    backgroundColor: admTokens.slate,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: admTokens.slateLine,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  subTitle: { fontSize: 24, color: admTokens.white, fontFamily: 'CormorantGaramond_500Medium' },
  subSummary: { marginTop: 2, fontSize: 11, color: admTokens.slateMuted },
  subNum: { color: admTokens.white, fontWeight: '600', fontFamily: admTokens.fontMono },
  body: { flex: 1, backgroundColor: '#fff' },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEE',
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rName: { fontSize: 13.5, fontWeight: '600', color: admTokens.text, flexShrink: 1 },
  meTag: {
    backgroundColor: admTokens.slate,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  meTagText: { color: admTokens.white, fontSize: 8.5, fontWeight: '700', letterSpacing: 0.4 },
  rEmail: { fontSize: 10.5, color: admTokens.textMuted, marginTop: 2, fontFamily: admTokens.fontMono },
  rMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  rolePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  rolePillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  last: { fontSize: 10, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  kebab: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  kebabOn: { backgroundColor: admTokens.surface },
  menu: {
    marginTop: 10,
    padding: 10,
    backgroundColor: admTokens.surface,
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 10,
    gap: 6,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  ml: { fontSize: 10, color: admTokens.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, width: 48 },
  rolePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1, minWidth: 120 },
  rolePickerOpt: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: admTokens.line,
  },
  rolePickerText: { fontSize: 10, color: admTokens.text, fontWeight: '600' },
  mb: { height: 30, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#0F1115', alignItems: 'center', justifyContent: 'center' },
  mbDanger: { backgroundColor: admTokens.red },
  mbText: { color: '#fff', fontSize: 11.5, fontWeight: '600' },
  hint: { fontSize: 11, color: admTokens.textMuted },
  invIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: admTokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invIconText: { color: admTokens.textMuted, fontWeight: '700', fontSize: 16 },
  sectionEyebrow: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: admTokens.surface,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
  },
  matrixBlurb: { paddingHorizontal: 14, paddingBottom: 4, backgroundColor: admTokens.surface, fontSize: 11, color: admTokens.textMuted, lineHeight: 16.5 },
  code: { color: admTokens.text, fontFamily: admTokens.fontMono },
  matrixWrap: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 14, backgroundColor: admTokens.surface },
  mHead: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEE',
    gap: 6,
  },
  mHeadLabel: {
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
  },
  mHeadRole: {
    width: 28,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  mRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#ECECEE',
    alignItems: 'center',
    gap: 6,
  },
  mRowLabel: { flex: 1, fontSize: 12, color: admTokens.text },
  mCellWrap: { width: 28, alignItems: 'center', justifyContent: 'center' },
  mCell: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3, fontFamily: admTokens.fontMono },
  mLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#ECECEE',
    gap: 12,
  },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legSq: { width: 10, height: 10, borderRadius: 3, borderWidth: 1 },
  legText: { fontSize: 10, color: admTokens.textMuted },
  inviteWrap: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 20, backgroundColor: admTokens.surface },
  eyebrowLight: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
    marginBottom: 6,
  },
  ti: {
    height: 38,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: admTokens.text,
    marginBottom: 10,
  },
  roleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  roleChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  inviteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: admTokens.surface,
    borderRadius: 8,
    marginBottom: 10,
  },
  inviteInfoText: { flex: 1, fontSize: 11, color: admTokens.textMuted, lineHeight: 16.5 },
  notOwner: { padding: 14, backgroundColor: admTokens.surface },
  notOwnerTitle: { fontSize: 13, fontWeight: '600', color: admTokens.text, marginBottom: 4 },
  notOwnerBody: { fontSize: 12, color: admTokens.textMuted, lineHeight: 18 },
});
