/**
 * Business customer-reviews — mirrors Angular beauty-business-reviews.component.
 * Lists reviews on services owned by the logged-in business + per-review reply
 * editor (one reply per review).
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { api } from '@/services/api';
import { resolve } from '@/services/bff';
import { isRedirect, type BffLink } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import { BeautyShell } from '@/components/BeautyShell';
import { ProvSubHeader } from '@/components/business';
import { beautyTokens } from '../../tamagui.config';

/** Row shape from the `beauty_business_reviews` BFF resolver. */
interface BusinessReview {
  id: number;
  rating: number;
  body: string;
  created_at: string;
  business_reply: string;
  business_reply_at: string | null;
  customer: { initial: string; display_name?: string };
  service: { name: string };
  _links?: { reply?: BffLink };
}

interface ReviewWithDraft extends BusinessReview {
  draftReply: string;
  editing: boolean;
  saving: boolean;
}

// Relative for recent reviews ("2 days ago"), absolute month/day for older
// — mirrors the design's review timestamps.
function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Svg key={i} width={14} height={14} viewBox="0 0 24 24" fill={i <= rating ? '#F5C36B' : '#E5E5EA'} stroke={i <= rating ? '#F5C36B' : '#E5E5EA'} strokeWidth={1} strokeLinejoin="round">
          <Path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z" />
        </Svg>
      ))}
    </View>
  );
}

const STAR_TIERS = [5, 4, 3, 2, 1] as const;

type ReviewFilter = number | 'needs' | null;

// Deterministic per-customer avatar hue (design uses warm/earthy tones).
const AVATAR_HUES = ['#5C4A3F', '#A88A7A', '#7A8B6E', '#574A3D', '#5F5A4A', '#7DA8CF', '#9A6A6A'];
function avatarHue(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

function toRow(r: BusinessReview): ReviewWithDraft {
  return { ...r, draftReply: r.business_reply || '', editing: false, saving: false };
}

function FilterChip({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text>
    </Pressable>
  );
}

export default function BusinessReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReviewFilter>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Reviews come from the `beauty_business_reviews` BFF resolver (returns the
  // full list — no REST paging). Reply posts to the per-review action-link.
  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const e = await resolve<{ reviews: BusinessReview[] }>('beauty_business_reviews');
      if (isRedirect(e)) {
        router.replace((nativeRouteFor(e._links?.target?.screen) ?? '/(auth)/business-login') as any);
        return;
      }
      if (e.action === 'render') setReviews((e.data?.reviews ?? []).map(toRow));
    } catch {
      setErrorMessage('Could not load reviews. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Summary computed client-side from the loaded reviews.
  const total = reviews.length;
  const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  // Single pass over reviews → tier counts + needs-reply count (avoids
  // re-scanning the list once per star tier).
  const { breakdown, needsCount } = React.useMemo(() => {
    const counts = new Map<number, number>();
    let needs = 0;
    for (const r of reviews) {
      const tier = Math.round(r.rating);
      counts.set(tier, (counts.get(tier) ?? 0) + 1);
      if (!r.business_reply) needs += 1;
    }
    return {
      breakdown: STAR_TIERS.map((tier) => ({ tier, count: counts.get(tier) ?? 0 })),
      needsCount: needs,
    };
  }, [reviews]);
  const visible =
    filter == null ? reviews
    : filter === 'needs' ? reviews.filter((r) => !r.business_reply)
    : reviews.filter((r) => Math.round(r.rating) === filter);

  const updateRow = (id: number, patch: Partial<ReviewWithDraft>) => {
    setReviews((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const startEdit = (r: ReviewWithDraft) => updateRow(r.id, { editing: true, draftReply: r.business_reply || '' });
  const cancelEdit = (r: ReviewWithDraft) => updateRow(r.id, { editing: false, draftReply: '' });

  const postReply = async (r: ReviewWithDraft) => {
    const reply = (r.draftReply || '').trim();
    if (!reply || r.saving) return;
    const href = r._links?.reply?.href;
    if (!href) { setErrorMessage('Reply is unavailable for this review.'); return; }
    updateRow(r.id, { saving: true });
    setErrorMessage('');
    try {
      // HATEOAS action-link from the resolver; endpoint creates or edits the reply.
      await api.post(href, { reply });
      await load(); // refresh from BFF — re-emits the stored reply + timestamp
    } catch (err: any) {
      updateRow(r.id, { saving: false });
      if (err?.response?.status === 403) {
        setErrorMessage('You can only reply to reviews on your own services.');
      } else if (err?.response?.status === 401) {
        setErrorMessage('Your session has expired. Please sign in again.');
      } else {
        setErrorMessage('Could not save reply. Please try again.');
      }
    }
  };

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ProvSubHeader back="Dashboard" title="Reviews" onBackPress={() => router.back()} />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        testID="business-reviews-root"
      >
        {loading ? (
          <View style={styles.statusBox}>
            <ActivityIndicator color={beautyTokens.accentBlueDeep} />
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.emptyWrap} testID="business-reviews-empty">
            <View style={styles.emptyIcon}>
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.accentBlueDeep} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
                <Path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z" />
              </Svg>
            </View>
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptyBody}>
              When customers review a completed appointment, it will show up here for you to reply to.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard} testID="business-reviews-summary">
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryAvg} testID="business-reviews-avg">{avg.toFixed(1)}</Text>
                <StarRow rating={Math.round(avg)} />
                <Text style={styles.summaryTotal} testID="business-reviews-count">
                  {total} review{total === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.summaryBars}>
                {breakdown.map(({ tier, count }) => {
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <View key={tier} style={styles.barRow}>
                      <Text style={styles.barTier}>{tier}</Text>
                      <Svg width={10} height={10} viewBox="0 0 24 24" fill="#F5C36B" stroke="#F5C36B" strokeWidth={1} strokeLinejoin="round">
                        <Path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z" />
                      </Svg>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.barCount}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.chips}>
              <FilterChip label="All" count={total} active={filter == null} onPress={() => setFilter(null)} />
              <FilterChip label="Needs reply" count={needsCount} active={filter === 'needs'} onPress={() => setFilter(filter === 'needs' ? null : 'needs')} />
              {/* One chip per star tier (5★ … 1★) — only shown when that tier has reviews. */}
              {STAR_TIERS.map((tier) => {
                const count = breakdown.find((b) => b.tier === tier)?.count ?? 0;
                if (count === 0) return null;
                return (
                  <FilterChip
                    key={tier}
                    label={`${tier} ★`}
                    count={count}
                    active={filter === tier}
                    onPress={() => setFilter(filter === tier ? null : tier)}
                  />
                );
              })}
            </View>

          <View style={styles.list}>
            {visible.map((r) => (
              <View key={r.id} style={styles.card} testID="business-review-card">
                <View style={styles.cardHead}>
                  <View style={[styles.avatar, { backgroundColor: avatarHue(r.customer.initial + r.id) }]}>
                    <Text style={styles.avatarText}>{r.customer.initial}</Text>
                  </View>
                  <View style={styles.nameCol}>
                    <Text style={styles.reviewerName} numberOfLines={1}>
                      {r.customer.display_name || r.customer.initial}
                    </Text>
                    <Text style={styles.svc} numberOfLines={1}>{r.service.name}</Text>
                  </View>
                  <View style={styles.headRight}>
                    <StarRow rating={r.rating} />
                    <Text style={styles.when}>{formatDate(r.created_at)}</Text>
                  </View>
                </View>

                {!!r.body && (
                  <Text style={styles.bodyText} testID="business-review-body">{r.body}</Text>
                )}

                {r.business_reply && !r.editing && (
                  <View style={styles.replyBlock} testID="business-review-reply">
                    <Text style={styles.replyHead}>You replied</Text>
                    <Text style={styles.replyBody}>{r.business_reply}</Text>
                    <Pressable onPress={() => startEdit(r)} style={styles.replyEditBtn} testID="business-review-edit-reply">
                      <Text style={styles.replyEditText}>Edit reply</Text>
                    </Pressable>
                  </View>
                )}

                {!r.business_reply && !r.editing && (
                  <Pressable onPress={() => startEdit(r)} style={styles.replyLink} testID="business-review-reply-open">
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={beautyTokens.accentBlueDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M9 17l-5-5 5-5M4 12h11a4 4 0 0 1 4 4v2" />
                    </Svg>
                    <Text style={styles.replyLinkText}>Reply</Text>
                  </Pressable>
                )}

                {r.editing && (
                  <View style={styles.replyForm}>
                    <Text style={styles.label}>{r.business_reply ? 'EDIT REPLY' : 'REPLY TO THIS REVIEW'}</Text>
                    <TextInput
                      style={styles.textarea}
                      value={r.draftReply}
                      onChangeText={(v) => updateRow(r.id, { draftReply: v.slice(0, 4000) })}
                      multiline
                      placeholder="Write a reply..."
                      placeholderTextColor={beautyTokens.textMuted}
                      maxLength={4000}
                      testID="business-review-reply-input"
                    />
                    <View style={styles.replyActions}>
                      {r.editing && (
                        <Pressable onPress={() => cancelEdit(r)} style={styles.btnSecondary}>
                          <Text style={styles.btnSecondaryText}>Cancel</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => postReply(r)}
                        disabled={r.saving || !r.draftReply.trim()}
                        style={[styles.btnPrimary, (r.saving || !r.draftReply.trim()) && styles.btnDisabled]}
                        testID="business-review-reply-submit"
                      >
                        <Text style={styles.btnPrimaryText}>
                          {r.saving ? 'Saving…' : r.business_reply ? 'Save reply' : 'Post reply'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ))}
            {visible.length === 0 ? (
              <Text style={styles.filterEmpty}>
                {filter === 'needs' ? 'All caught up — no reviews need a reply.' : `No ${filter}★ reviews.`}
              </Text>
            ) : null}
          </View>

          </>
        )}

        {!!errorMessage && (
          <View style={styles.errorToast} testID="business-reviews-error" accessibilityRole="alert">
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}
      </ScrollView>
    </BeautyShell>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: beautyTokens.surface },
  bodyContent: { padding: 16, paddingTop: 14 },

  statusBox: { paddingVertical: 24, alignItems: 'center' },

  emptyWrap: {
    marginTop: 18, padding: 24, alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderStyle: 'dashed', borderColor: beautyTokens.line,
    borderRadius: 14,
  },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 26, marginBottom: 12,
    backgroundColor: beautyTokens.accentBlue,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontFamily: beautyTokens.fontDisplay, fontSize: 20, color: beautyTokens.text, marginBottom: 6 },
  emptyBody: { fontFamily: beautyTokens.fontBody, fontSize: 13, lineHeight: 19, color: beautyTokens.textMuted, textAlign: 'center' },

  summaryCard: {
    flexDirection: 'row', gap: 16,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 14, padding: 16, marginBottom: 12,
  },
  summaryLeft: { alignItems: 'center', justifyContent: 'center', paddingRight: 16, borderRightWidth: 1, borderRightColor: beautyTokens.line, gap: 4 },
  summaryAvg: { fontFamily: beautyTokens.fontDisplay, fontSize: 40, lineHeight: 44, color: beautyTokens.text },
  summaryTotal: { fontFamily: 'Menlo', fontSize: 11, color: beautyTokens.textMuted },
  summaryBars: { flex: 1, justifyContent: 'center', gap: 5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barTier: { fontFamily: 'Menlo', fontSize: 11, color: beautyTokens.textMuted, width: 8 },
  barTrack: { flex: 1, height: 6, borderRadius: 999, backgroundColor: beautyTokens.surface2, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 999, backgroundColor: '#F5C36B' },
  barCount: { fontFamily: 'Menlo', fontSize: 10, color: beautyTokens.textMuted, width: 34, textAlign: 'right' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingLeft: 12, paddingRight: 7, paddingVertical: 6, borderRadius: 999,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: beautyTokens.line,
  },
  chipActive: { backgroundColor: beautyTokens.ink, borderColor: beautyTokens.ink },
  chipText: { fontFamily: beautyTokens.fontBody, fontSize: 12, fontWeight: '600', color: beautyTokens.text },
  chipTextActive: { color: '#FFFFFF' },
  chipCount: {
    fontFamily: beautyTokens.fontBody, fontSize: 10, fontWeight: '700', color: beautyTokens.textMuted,
    backgroundColor: beautyTokens.surface2, overflow: 'hidden',
    minWidth: 18, textAlign: 'center', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 999,
  },
  chipCountActive: { color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.22)' },

  filterEmpty: { fontFamily: beautyTokens.fontBody, fontSize: 13, color: beautyTokens.textMuted, textAlign: 'center', paddingVertical: 16 },

  viewAll: {
    marginTop: 14, height: 44, borderRadius: 12,
    borderWidth: 1, borderColor: beautyTokens.line, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  viewAllPressed: { backgroundColor: beautyTokens.surface2 },
  viewAllText: { fontFamily: beautyTokens.fontBody, fontSize: 13, fontWeight: '600', color: beautyTokens.text },

  list: { marginVertical: 12, gap: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 14, padding: 12, paddingHorizontal: 14,
  },
  cardHead: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginBottom: 6,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: beautyTokens.accentBlue,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14, fontFamily: beautyTokens.fontBody },
  nameCol: { flex: 1, minWidth: 0, gap: 2 },
  reviewerName: { fontFamily: beautyTokens.fontBody, fontSize: 14, fontWeight: '600', color: beautyTokens.text },
  headRight: { alignItems: 'flex-end', gap: 3 },
  stars: { flexDirection: 'row', gap: 1, alignItems: 'center' },
  svc: { fontFamily: 'Menlo', fontSize: 10, color: '#B08A5A', letterSpacing: 1.1, textTransform: 'uppercase' },
  when: { fontFamily: 'Menlo', fontSize: 10, color: beautyTokens.textMuted },
  bodyText: { marginTop: 4, fontSize: 13, lineHeight: 19, color: beautyTokens.text, fontFamily: beautyTokens.fontBody },

  replyBlock: {
    marginTop: 10, padding: 10, paddingHorizontal: 12,
    backgroundColor: beautyTokens.surface2,
    borderRadius: 10, borderLeftWidth: 3, borderLeftColor: beautyTokens.accentBlueDeep,
  },
  replyHead: { fontSize: 10, fontWeight: '600', color: beautyTokens.accentBlueText, letterSpacing: 1.1, marginBottom: 4, fontFamily: beautyTokens.fontBody },
  replyBody: { fontSize: 12, color: beautyTokens.text, lineHeight: 18, marginBottom: 6, fontFamily: beautyTokens.fontBody },
  replyEditBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: beautyTokens.line,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  replyEditText: { fontFamily: beautyTokens.fontBody, fontSize: 11, fontWeight: '600', color: beautyTokens.text },

  replyLink: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  replyLinkText: { fontFamily: beautyTokens.fontBody, fontSize: 13, fontWeight: '600', color: beautyTokens.accentBlueDeep },

  replyForm: { marginTop: 10 },
  label: { fontSize: 11, fontWeight: '600', color: beautyTokens.textMuted, letterSpacing: 1.1, marginBottom: 6, fontFamily: beautyTokens.fontBody },
  textarea: {
    borderWidth: 1, borderColor: beautyTokens.line, borderRadius: 10,
    padding: 10, paddingHorizontal: 12,
    fontFamily: beautyTokens.fontBody, fontSize: 13,
    minHeight: 70,
    color: beautyTokens.text,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },
  replyActions: { marginTop: 8, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  btnPrimary: {
    height: 36, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: beautyTokens.ink, borderWidth: 1, borderColor: beautyTokens.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { color: '#FFFFFF', fontFamily: beautyTokens.fontBody, fontSize: 12, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  btnSecondary: {
    height: 36, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1, borderColor: beautyTokens.line,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { color: beautyTokens.text, fontFamily: beautyTokens.fontBody, fontSize: 12, fontWeight: '600' },

  errorToast: {
    marginTop: 12, padding: 10, paddingHorizontal: 12,
    borderRadius: 10, backgroundColor: '#FCE8E6',
    borderWidth: 1, borderColor: '#F4C7C3',
  },
  errorText: { color: '#B3261E', fontSize: 13, fontFamily: beautyTokens.fontBody },
});
