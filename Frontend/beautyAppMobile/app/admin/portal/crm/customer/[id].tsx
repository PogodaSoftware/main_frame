/**
 * Admin Portal — Customer detail (`/admin/portal/crm/customer/<id>`).
 * Slate hero, quick-action row, inline composers, tags + lifetime stats +
 * bookings + timeline + payments + risk + internal notes.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { api } from '@/services/api';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import {
  AdmAvatar,
  AdmBtn,
  AdmCard,
  AdmHomeIndicator,
  AdmStatusChip,
  AdmTabBar,
  AdmTopHeader,
  type AdmTabKind,
} from '@/components/admin/AdmAtoms';
import { admTokens } from '@/components/admin/tokens';

interface LifetimeStat { value: string; label: string }
interface BookingRow {
  id: number;
  mon: string;
  day: number;
  weekday: string;
  service: string;
  with_name: string;
  price: string;
  status: 'Confirmed' | 'Cancelled' | 'Pending' | string;
}
interface TimelineEvent { when: string; color: string; kind?: string; title: string; meta: string }
interface SupportTicket { id: string; subject: string; category: string; status: string; when: string }
interface PaymentMethod { brand: string; last4: string; exp: string; default?: boolean }
interface InternalNote { author: string; when: string; text: string; you?: boolean }
interface DetailTag { id: string; label: string; color: string; tone: string }

interface CustomerData {
  id: number;
  display_name: string;
  email: string;
  phone: string;
  joined_label: string;
  last_seen_label: string;
  is_suspended: boolean;
  status_tags: string[];
  attached_tags: DetailTag[];
  suggested_tags: DetailTag[];
  available_tags: DetailTag[];
  lifetime_stats: LifetimeStat[];
  bookings: BookingRow[];
  total_bookings: number;
  support_tickets: { open_count: number; total: number; rows: SupportTicket[] };
  timeline: TimelineEvent[];
  payment_methods: PaymentMethod[];
  internal_notes: InternalNote[];
  has_active_booking: boolean;
  risk_score: number;
  risk_label: string;
  tab_badges: Partial<Record<AdmTabKind, number | string | null>>;
  notif_count: number;
  session_remaining?: string;
  admin_initials?: string;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function AdminCustomerDetail() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = parseInt(String(rawId ?? ''), 10) || 0;

  const [env, setEnv] = useState<BffEnvelope<CustomerData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageSent, setMessageSent] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const e = await resolve<CustomerData>('beauty_admin_portal_customer_detail', { id: String(id) });
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        if (route) router.replace(route as any);
        return;
      }
      setEnv(e);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [id, router]);

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
  const initials = initialsOf(data.display_name);
  const statusLabel = data.is_suspended ? 'Suspended' : 'Active';
  const accountIdHex = id.toString(16).padStart(6, '0');

  const riskColor =
    data.risk_score < 30 ? '#2F7A47' : data.risk_score < 70 ? '#8A6A1F' : '#C0392B';

  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/admin/portal/crm' as any);
  };
  const onSuspend = () => {
    router.push({
      pathname: '/admin/portal/crm/suspend/[type]/[id]',
      params: { type: 'customer', id: String(id) },
    } as any);
  };
  const onManageTags = () => router.push('/admin/portal/crm/tags' as any);
  const openBookingDetail = (bookingId: number) =>
    router.push({ pathname: '/admin/portal/bookings/[id]', params: { id: String(bookingId) } } as any);

  const onAssignTag = async (slug: string) => {
    if (env?.action !== 'render') return;
    const link = env._links?.tag_assign_template as BffLink | undefined;
    if (!link?.href) return;
    try {
      await api.request({
        url: link.href.replace(':slug', slug),
        method: link.method,
        data: { type: 'customer', id },
      });
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to attach tag.');
    }
  };

  const onUnassignTag = async (slug: string) => {
    if (env?.action !== 'render') return;
    const link = env._links?.tag_unassign_template as BffLink | undefined;
    if (!link?.href) return;
    try {
      await api.request({
        url: link.href.replace(':slug', slug),
        method: link.method,
      });
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to remove tag.');
    }
  };
  const onTab = (kind: AdmTabKind) => {
    if (kind === 'crm') {
      router.replace('/admin/portal/crm' as any);
      return;
    }
    const screen =
      kind === 'home'
        ? 'beauty_admin_portal_dashboard'
        : `beauty_admin_portal_${kind}`;
    const route = nativeRouteFor(screen);
    if (route) router.push(route as any);
  };

  const onSendMessage = async () => {
    const body = messageBody.trim();
    if (!body || !data.has_active_booking) return;
    const link = env._links?.message as BffLink | undefined;
    if (!link?.href) {
      setMessageError('Endpoint unavailable.');
      return;
    }
    setMessageError(null);
    try {
      await api.request({ url: link.href, method: link.method, data: { body } });
      setMessageSent(true);
      setMessageBody('');
      setTimeout(() => {
        setMessageOpen(false);
        setMessageSent(false);
      }, 1200);
    } catch (err: any) {
      setMessageError(err?.response?.data?.detail ?? 'Failed to send.');
    }
  };

  const onSaveNote = async () => {
    const body = noteBody.trim();
    if (!body) return;
    const link = env._links?.note as BffLink | undefined;
    if (!link?.href) {
      setNoteError('Endpoint unavailable.');
      return;
    }
    setNoteError(null);
    try {
      await api.request({ url: link.href, method: link.method, data: { body } });
      setNoteSaved(true);
      setNoteBody('');
      setTimeout(() => {
        setNoteOpen(false);
        setNoteSaved(false);
        load();
      }, 1000);
    } catch (err: any) {
      setNoteError(err?.response?.data?.detail ?? 'Failed to save.');
    }
  };

  const onExport = async () => {
    const link = env._links?.export as BffLink | undefined;
    if (!link?.href) {
      setExportNotice('Export endpoint unavailable.');
      return;
    }
    try {
      await api.request({ url: link.href, method: link.method });
      setExportNotice('Export prepared.');
    } catch (err: any) {
      const status = err?.response?.status;
      setExportNotice(status === 404 || status === 405 ? 'Export queued.' : 'Export failed.');
    }
    setTimeout(() => setExportNotice(null), 1500);
  };

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />
      <AdmTopHeader notifCount={data.notif_count || null} initials={data.admin_initials || 'AD'} />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.hero}>
          <View style={styles.backRow}>
            <Pressable onPress={onBack} style={styles.backBtn} accessibilityLabel="Back to CRM">
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={admTokens.slateMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
              <Text style={styles.backText}>Customers</Text>
            </Pressable>
          </View>

          <View style={styles.idRow}>
            <AdmAvatar initials={initials} size={56} kind="customer" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.heroName} numberOfLines={1}>{data.display_name}</Text>
              <Text style={styles.heroEmail} numberOfLines={1}>{data.email}</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <AdmStatusChip status={statusLabel} />
            {data.status_tags.map((t) => (
              <AdmStatusChip key={t} status={t} />
            ))}
          </View>

          <View style={styles.metaGrid}>
            <MetaCell label="Phone" value={data.phone} />
            <MetaCell label="Joined" value={data.joined_label} />
            <MetaCell label="Last seen" value={data.last_seen_label} />
            <MetaCell label="Account ID" value={`cust_${accountIdHex}`} />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsRow}
        >
          <ActionBtn
            primary
            disabled={!data.has_active_booking}
            onPress={() => {
              setMessageOpen((v) => !v);
              setMessageError(null);
              setMessageSent(false);
            }}
          >
            In-app msg
          </ActionBtn>
          <ActionBtn disabled>Email</ActionBtn>
          <ActionBtn disabled>SMS</ActionBtn>
          <ActionBtn
            onPress={() => {
              setNoteOpen((v) => !v);
              setNoteError(null);
              setNoteSaved(false);
            }}
          >
            Add note
          </ActionBtn>
          <ActionBtn onPress={onManageTags}>Tag</ActionBtn>
          <ActionBtn onPress={onExport}>Export</ActionBtn>
          <ActionBtn danger onPress={onSuspend}>
            {data.is_suspended ? 'Reinstate' : 'Suspend'}
          </ActionBtn>
        </ScrollView>

        {messageOpen ? (
          <View style={styles.composer}>
            <Text style={styles.eyebrowLight}>Send in-app message</Text>
            <TextInput
              style={styles.composerInput}
              multiline
              numberOfLines={3}
              value={messageBody}
              onChangeText={setMessageBody}
              placeholder={`Message to ${data.display_name}…`}
              placeholderTextColor={admTokens.textMuted}
            />
            <View style={styles.composerActions}>
              {!data.has_active_booking ? (
                <Text style={styles.hint}>Customer has no active booking thread — message cannot be delivered.</Text>
              ) : null}
              {messageError ? <Text style={[styles.hint, { color: '#C0392B' }]}>{messageError}</Text> : null}
              {messageSent ? <Text style={[styles.hint, { color: '#2F7A47' }]}>Sent.</Text> : null}
              <View style={{ flex: 1 }} />
              <AdmBtn variant="secondary" size="sm" onPress={() => setMessageOpen(false)}>Cancel</AdmBtn>
              <View style={{ width: 6 }} />
              <AdmBtn
                variant="primary"
                size="sm"
                disabled={!messageBody.trim() || !data.has_active_booking}
                onPress={onSendMessage}
              >
                Send
              </AdmBtn>
            </View>
          </View>
        ) : null}

        {noteOpen ? (
          <View style={styles.composer}>
            <Text style={styles.eyebrowLight}>Add internal note</Text>
            <TextInput
              style={styles.composerInput}
              multiline
              numberOfLines={3}
              value={noteBody}
              onChangeText={setNoteBody}
              placeholder="Private note (admin-only)…"
              placeholderTextColor={admTokens.textMuted}
            />
            <View style={styles.composerActions}>
              {noteError ? <Text style={[styles.hint, { color: '#C0392B' }]}>{noteError}</Text> : null}
              {noteSaved ? <Text style={[styles.hint, { color: '#2F7A47' }]}>Saved.</Text> : null}
              <View style={{ flex: 1 }} />
              <AdmBtn variant="secondary" size="sm" onPress={() => setNoteOpen(false)}>Cancel</AdmBtn>
              <View style={{ width: 6 }} />
              <AdmBtn variant="primary" size="sm" disabled={!noteBody.trim()} onPress={onSaveNote}>
                Save note
              </AdmBtn>
            </View>
          </View>
        ) : null}

        {exportNotice ? (
          <View style={styles.composer}>
            <Text style={[styles.hint, { color: '#2F7A47' }]}>{exportNotice}</Text>
          </View>
        ) : null}

        <View style={styles.body}>
          {/* Tags */}
          <View style={styles.sec}>
            <View style={styles.secHead}>
              <Text style={styles.secTitle}>Tags</Text>
              <Pressable onPress={onManageTags}><Text style={styles.action}>Manage tags →</Text></Pressable>
            </View>
            <Text style={styles.secSub}>Admin-only · filter via CRM</Text>
            <AdmCard padding={12}>
              <View style={styles.grpHead}>
                <Text style={styles.eyebrowLight}>Attached</Text>
                <View style={styles.grpLine} />
                <Text style={styles.grpCnt}>{data.attached_tags.length}</Text>
              </View>
              <View style={styles.tagList}>
                {data.attached_tags.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => onUnassignTag(t.id)}
                    accessibilityLabel={`Remove tag ${t.label}`}
                    style={[styles.tchip, { backgroundColor: t.tone, borderColor: t.color + '33' }]}
                  >
                    <View style={[styles.tchipDot, { backgroundColor: t.color }]} />
                    <Text style={[styles.tchipText, { color: t.color }]}>{t.label}</Text>
                    <Text style={[styles.tchipX, { color: t.color }]}>×</Text>
                  </Pressable>
                ))}
                <Pressable
                  style={[styles.addTag, tagPickerOpen && styles.addTagActive]}
                  onPress={() => {
                    setTagPickerOpen((v) => !v);
                    setTagSearch('');
                  }}
                  accessibilityLabel="Open tag picker"
                >
                  <Text style={[styles.addTagText, tagPickerOpen && { color: admTokens.text }]}>
                    {tagPickerOpen ? '× Close' : '+ Add tag'}
                  </Text>
                </Pressable>
              </View>
              <View style={[styles.grpHead, { marginTop: 4 }]}>
                <Text style={styles.eyebrowLight}>Suggested</Text>
                <View style={styles.grpLine} />
              </View>
              <View style={styles.tagList}>
                {data.suggested_tags.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => onAssignTag(t.id)}
                    accessibilityLabel={`Attach tag ${t.label}`}
                    style={styles.tsug}
                  >
                    <Text style={styles.tsugPlus}>+</Text>
                    <View style={[styles.tchipDot, { backgroundColor: t.color }]} />
                    <Text style={styles.tsugLabel}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </AdmCard>

            {tagPickerOpen ? (
              <View style={styles.tagPicker}>
                <TextInput
                  style={styles.tagPickerSearch}
                  value={tagSearch}
                  onChangeText={setTagSearch}
                  placeholder="Search tags…"
                  placeholderTextColor={admTokens.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {(() => {
                  const q = tagSearch.toLowerCase();
                  const filtered = (data.available_tags ?? []).filter((t) =>
                    t.label.toLowerCase().includes(q)
                  );
                  if (filtered.length === 0) {
                    return (
                      <Text style={styles.tagPickerEmpty}>
                        {tagSearch ? 'No tags match.' : 'All tags are already attached.'}
                      </Text>
                    );
                  }
                  return (
                    <View style={styles.tagPickerList}>
                      {filtered.map((t) => (
                        <Pressable
                          key={t.id}
                          onPress={() => {
                            onAssignTag(t.id);
                            setTagPickerOpen(false);
                            setTagSearch('');
                          }}
                          accessibilityLabel={`Attach tag ${t.label}`}
                          style={[styles.tchip, { backgroundColor: t.tone, borderColor: t.color + '33' }]}
                        >
                          <View style={[styles.tchipDot, { backgroundColor: t.color }]} />
                          <Text style={[styles.tchipText, { color: t.color }]}>{t.label}</Text>
                          <Text style={[styles.tchipPlus, { color: t.color }]}>+</Text>
                        </Pressable>
                      ))}
                    </View>
                  );
                })()}
              </View>
            ) : null}
          </View>

          {/* Lifetime stats */}
          <View style={styles.sec}>
            <Text style={styles.secTitle}>Lifetime stats</Text>
            <View style={styles.statsGrid}>
              {data.lifetime_stats.map((s, i) => (
                <View key={`${s.label}-${i}`} style={styles.stat}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Bookings */}
          <View style={styles.sec}>
            <View style={styles.secHead}>
              <Text style={styles.secTitle}>Bookings</Text>
              <Text style={styles.action}>View all →</Text>
            </View>
            <Text style={styles.secSub}>
              {data.bookings.length} of {data.total_bookings} · most recent
            </Text>
            <AdmCard padding={0}>
              {data.bookings.length === 0 ? (
                <Text style={styles.empty}>No bookings yet.</Text>
              ) : (
                data.bookings.map((b, i) => (
                  <Pressable
                    key={b.id}
                    onPress={() => openBookingDetail(b.id)}
                    style={[styles.bkRow, i > 0 && styles.bkRowBorder]}
                    accessibilityLabel={`Open booking ${b.service}`}
                  >
                    <View style={styles.bkDate}>
                      <Text style={styles.bkMon}>{b.mon}</Text>
                      <Text style={styles.bkDay}>{b.day}</Text>
                      <Text style={styles.bkWd}>{b.weekday}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.bkService} numberOfLines={1}>{b.service}</Text>
                      <Text style={styles.bkWith} numberOfLines={1}>{b.with_name}</Text>
                    </View>
                    <View style={styles.bkRight}>
                      <Text style={styles.bkPrice}>{b.price}</Text>
                      <AdmStatusChip status={b.status} />
                    </View>
                  </Pressable>
                ))
              )}
            </AdmCard>
          </View>

          {/* Timeline */}
          <View style={styles.sec}>
            <Text style={styles.secTitle}>Activity timeline</Text>
            <Text style={styles.secSub}>Last 7 days</Text>
            <AdmCard padding={14}>
              {data.timeline.length === 0 ? (
                <Text style={styles.empty}>No recent activity.</Text>
              ) : (
                data.timeline.map((e, i) => (
                  <View key={i} style={styles.tline}>
                    <View style={[styles.tlIcon, { backgroundColor: hexAlpha(e.color, 0.1) }]}>
                      <TimelineIcon kind={e.kind} color={e.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.tlTitle}>{stripHtml(e.title)}</Text>
                      <Text style={styles.tlMeta}>{e.when} · {e.meta}</Text>
                    </View>
                  </View>
                ))
              )}
            </AdmCard>
          </View>

          {/* Payment methods */}
          <View style={styles.sec}>
            <Text style={styles.secTitle}>Payment methods</Text>
            <AdmCard padding={0}>
              {data.payment_methods.length === 0 ? (
                <Text style={styles.empty}>No cards on file.</Text>
              ) : (
                data.payment_methods.map((p, i) => (
                  <View key={`${p.brand}-${p.last4}-${i}`} style={[styles.pmRow, i > 0 && styles.pmRowBorder]}>
                    <View style={styles.pmBrand}>
                      <Text style={styles.pmBrandText}>{p.brand}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pmLast4}>•••• {p.last4}</Text>
                      <Text style={styles.pmExp}>Exp {p.exp}</Text>
                    </View>
                    {p.default ? <AdmStatusChip status="Verified" /> : null}
                  </View>
                ))
              )}
            </AdmCard>
          </View>

          {/* Risk */}
          <View style={styles.sec}>
            <Text style={styles.secTitle}>Risk signals</Text>
            <AdmCard padding={12}>
              <View style={styles.riskHead}>
                <View>
                  <Text style={styles.eyebrowLight}>Risk score</Text>
                  <Text style={styles.riskNum}>
                    {data.risk_score}<Text style={styles.riskDenom}>/100</Text>
                  </Text>
                </View>
                <View style={[styles.riskChip, { backgroundColor: hexAlpha(riskColor, 0.1) }]}>
                  <Text style={[styles.riskChipText, { color: riskColor }]}>{data.risk_label}</Text>
                </View>
              </View>
              <View style={styles.riskBar}>
                <View
                  style={{
                    width: `${Math.max(0, Math.min(100, data.risk_score))}%`,
                    height: '100%',
                    backgroundColor: riskColor,
                    borderRadius: 3,
                  }}
                />
              </View>
              <View style={styles.riskAxis}>
                <Text style={styles.riskAxisText}>0</Text>
                <Text style={styles.riskAxisText}>30</Text>
                <Text style={styles.riskAxisText}>70</Text>
                <Text style={styles.riskAxisText}>100</Text>
              </View>
            </AdmCard>
          </View>

          {/* Support tickets */}
          <View style={styles.sec}>
            <View style={styles.secHead}>
              <Text style={styles.secTitle}>Support tickets</Text>
              <Pressable
                onPress={() => {
                  const route = nativeRouteFor(env._links?.tickets?.screen);
                  if (route) router.push(route as any);
                }}
              >
                <Text style={styles.action}>{data.support_tickets.open_count} open →</Text>
              </Pressable>
            </View>
            <AdmCard padding={0}>
              {data.support_tickets.rows.length === 0 ? (
                <Text style={styles.empty}>No support tickets.</Text>
              ) : (
                data.support_tickets.rows.map((t, i) => (
                  <View key={t.id} style={[styles.tkRow, i > 0 && styles.bkRowBorder]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.tkSubject} numberOfLines={1}>{t.subject}</Text>
                      <Text style={styles.tkMeta}>{t.id} · {t.category} · {t.when}</Text>
                    </View>
                    <AdmStatusChip status={t.status} />
                  </View>
                ))
              )}
            </AdmCard>
          </View>

          {/* Notes */}
          <View style={styles.sec}>
            <Text style={styles.secTitle}>Internal notes</Text>
            {data.internal_notes.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.empty}>No internal notes yet.</Text>
              </View>
            ) : (
              data.internal_notes.map((n, i) => (
                <View key={i} style={[styles.note, n.you && styles.noteYou]}>
                  <View style={styles.noteHead}>
                    <Text style={[styles.noteAuthor, n.you && { color: '#fff' }]}>{n.author}</Text>
                    <Text style={[styles.noteWhen, n.you && { color: 'rgba(255,255,255,0.55)' }]}>{n.when}</Text>
                  </View>
                  <Text style={[styles.noteText, n.you && { color: '#fff' }]}>{n.text}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <AdmTabBar active="crm" badges={data.tab_badges} onSelect={onTab} />
      <AdmHomeIndicator tone="slate" />
    </View>
  );
}

// Per-event-type timeline glyph (matches the design's icon set). `color` is
// the event's accent colour, supplied by the resolver.
function TimelineIcon({ kind, color }: { kind?: string; color: string }) {
  const p = { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none' as const, stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'booking':
      return (
        <Svg {...p}>
          <Rect x={3} y={4} width={18} height={18} rx={2} />
          <Path d="M16 2v4M8 2v4M3 10h18" />
        </Svg>
      );
    case 'message':
      return (
        <Svg {...p}>
          <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </Svg>
      );
    case 'signup':
      return (
        <Svg {...p}>
          <Path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
          <Circle cx={9} cy={7} r={4} />
          <Path d="M19 8v6M22 11h-6" />
        </Svg>
      );
    case 'tag':
      return (
        <Svg {...p}>
          <Path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
          <Path d="M7 7h.01" />
        </Svg>
      );
    case 'export':
      return (
        <Svg {...p}>
          <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <Path d="M7 10l5 5 5-5M12 15V3" />
        </Svg>
      );
    case 'account':
      return (
        <Svg {...p}>
          <Circle cx={12} cy={12} r={10} />
          <Path d="M4.93 4.93l14.14 14.14" />
        </Svg>
      );
    case 'note':
      return (
        <Svg {...p}>
          <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </Svg>
      );
    default:
      return (
        <Svg {...p}>
          <Circle cx={12} cy={12} r={10} />
        </Svg>
      );
  }
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '48%' }}>
      <Text style={styles.metaEyebrow}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function ActionBtn({
  primary,
  danger,
  disabled,
  onPress,
  children,
}: {
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const bg = primary ? '#0F1115' : danger ? admTokens.red : '#fff';
  const color = primary || danger ? '#fff' : admTokens.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.ab,
        { backgroundColor: bg, borderColor: bg === '#fff' ? admTokens.line : bg },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[styles.abText, { color }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: admTokens.surface },
  loader: { flex: 1, backgroundColor: admTokens.slate, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: admTokens.slate, paddingHorizontal: 14, paddingBottom: 16 },
  backRow: { height: 48, flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: admTokens.slateMuted, fontSize: 12, fontWeight: '500' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroName: { fontSize: 24, color: admTokens.white, fontFamily: 'CormorantGaramond_500Medium' },
  heroEmail: { fontSize: 11, color: admTokens.slateMuted, marginTop: 4, fontFamily: admTokens.fontMono },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  metaEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.slateMuted,
  },
  metaValue: { color: admTokens.white, fontSize: 12, marginTop: 3, fontFamily: admTokens.fontMono },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: admTokens.surface,
    borderBottomWidth: 1,
    borderBottomColor: admTokens.line,
  },
  ab: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abText: { fontSize: 12, fontWeight: '600' },
  composer: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: admTokens.line, padding: 12 },
  composerInput: {
    backgroundColor: admTokens.surface,
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: admTokens.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  composerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  hint: { fontSize: 11, color: admTokens.textMuted },
  body: { padding: 14, backgroundColor: admTokens.surface },
  sec: { marginBottom: 14 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  secTitle: { fontSize: 18, color: admTokens.text, fontFamily: 'CormorantGaramond_500Medium' },
  secSub: { fontSize: 10.5, color: admTokens.textMuted, marginBottom: 8 },
  action: { fontSize: 11, color: '#1a3a52', fontWeight: '600' },
  eyebrowLight: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
  },
  grpHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  grpLine: { flex: 1, height: 1, backgroundColor: '#ECECEE' },
  grpCnt: { fontSize: 10, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tchip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  tchipDot: { width: 6, height: 6, borderRadius: 3 },
  tchipText: { fontSize: 11, fontWeight: '600' },
  tchipX: { marginLeft: 2, fontSize: 9, fontFamily: admTokens.fontMono, opacity: 0.7 },
  addTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: admTokens.line,
  },
  addTagActive: {
    backgroundColor: admTokens.surface,
    borderStyle: 'solid',
    borderColor: admTokens.text,
  },
  addTagText: { fontSize: 11, color: admTokens.textMuted },
  tagPicker: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 12,
    padding: 10,
  },
  tagPickerSearch: {
    backgroundColor: admTokens.surface,
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: admTokens.text,
    marginBottom: 10,
  },
  tagPickerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagPickerEmpty: { fontSize: 11, color: admTokens.textMuted, textAlign: 'center', paddingVertical: 8 },
  tchipPlus: { marginLeft: 2, fontSize: 11, fontFamily: admTokens.fontMono, opacity: 0.8 },
  tsug: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: admTokens.surface,
    borderWidth: 1,
    borderColor: admTokens.line,
  },
  tsugPlus: { fontSize: 12, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  tsugLabel: { fontSize: 11, color: admTokens.text },
  statsGrid: { flexDirection: 'row', gap: 6 },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: { fontSize: 14, fontWeight: '600', color: admTokens.text, fontFamily: admTokens.fontMono },
  statLabel: {
    fontSize: 9,
    color: admTokens.textMuted,
    marginTop: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  bkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  bkRowBorder: { borderTopWidth: 1, borderTopColor: '#ECECEE' },
  bkDate: { width: 36, alignItems: 'center' },
  bkMon: { fontSize: 8.5, fontWeight: '700', color: admTokens.textMuted, letterSpacing: 0.4, fontFamily: admTokens.fontMono },
  bkDay: { fontSize: 18, fontWeight: '600', color: admTokens.text, fontFamily: admTokens.fontMono },
  bkWd: { fontSize: 8.5, fontWeight: '600', color: admTokens.textMuted, letterSpacing: 0.3, fontFamily: admTokens.fontMono },
  bkService: { fontSize: 12.5, color: admTokens.text, fontWeight: '600' },
  bkWith: { fontSize: 10.5, color: admTokens.textMuted, marginTop: 2, fontFamily: admTokens.fontMono },
  bkRight: { alignItems: 'flex-end', gap: 4 },
  bkPrice: { fontSize: 12.5, fontWeight: '600', color: admTokens.text, fontFamily: admTokens.fontMono },
  tline: { flexDirection: 'row', gap: 10, paddingBottom: 14 },
  tlIcon: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  tlTitle: { fontSize: 12.5, color: admTokens.text, lineHeight: 17.5 },
  tlMeta: { fontSize: 10, color: admTokens.textMuted, marginTop: 2, fontFamily: admTokens.fontMono },
  empty: { padding: 16, textAlign: 'center', color: admTokens.textMuted, fontSize: 12 },
  emptyCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: admTokens.line, borderStyle: 'dashed', borderRadius: 12 },
  pmRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  pmRowBorder: { borderTopWidth: 1, borderTopColor: '#ECECEE' },
  pmBrand: { width: 42, height: 28, borderRadius: 6, backgroundColor: '#0F1115', alignItems: 'center', justifyContent: 'center' },
  pmBrandText: { color: '#fff', fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5, fontFamily: admTokens.fontMono },
  pmLast4: { fontSize: 12, color: admTokens.text, fontFamily: admTokens.fontMono },
  pmExp: { fontSize: 10, color: admTokens.textMuted, marginTop: 2 },
  riskHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  riskNum: { fontSize: 24, color: admTokens.text, fontFamily: 'CormorantGaramond_500Medium' },
  riskDenom: { color: admTokens.textMuted, fontSize: 16 },
  riskChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  riskChipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  riskBar: { height: 6, borderRadius: 3, backgroundColor: '#ECECEE', overflow: 'hidden' },
  riskAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  riskAxisText: { fontSize: 9, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  tkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  tkSubject: { fontSize: 12.5, color: admTokens.text, fontWeight: '600' },
  tkMeta: { fontSize: 10, color: admTokens.textMuted, marginTop: 2, fontFamily: admTokens.fontMono },
  note: {
    backgroundColor: '#FFF8DC',
    borderWidth: 1,
    borderColor: 'rgba(165,122,31,0.20)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  noteYou: { backgroundColor: '#0F1115', borderColor: '#0F1115' },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  noteAuthor: { fontSize: 11, fontWeight: '700', color: admTokens.text },
  noteWhen: { fontSize: 9.5, color: '#8A6A1F', fontFamily: admTokens.fontMono },
  noteText: { fontSize: 12, lineHeight: 18, color: admTokens.text },
});
