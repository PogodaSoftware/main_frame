/**
 * Book screen — mirrors Angular `BeautyBookComponent`.
 *  - Sub-header (back + centered "Book" title).
 *  - Dark gradient hero w/ "img · <category>" mono tag.
 *  - Title row: serif service name + serif price.
 *  - Meta line: provider · location · duration.
 *  - Calendar: month grid 7-wide, ‹ › chevrons, days w/ slot dot,
 *    selected day filled ink, past/no-slots disabled.
 *  - Time chips grid 3-wide per selected day; selected chip baby-blue.
 *  - Provider card (avatar + name + sub + Change link).
 *  - Sticky CTA "Confirm booking · 12:30 PM" green when ready.
 *  - 4-tab bottom nav (Home active).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { BottomNav } from '@/components/BottomNav';
import { PALETTE } from '@/theme/colors';
import { FONT_BODY, FONT_BODY_SEMI, FONT_DISPLAY, FONT_MONO } from '@/theme/fonts';

interface BookField {
  name: string;
  type: string;
  label?: string;
  value?: string | number;
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface BookForm {
  submit_method: string;
  submit_href: string;
  success_screen: string;
  success_route_template?: string;
  fields: BookField[];
  submit_label: string;
}

interface BookData {
  service: {
    id: number;
    name: string;
    description?: string;
    price_cents?: number;
    duration_minutes?: number;
    category?: string;
  };
  provider: {
    id: number;
    name: string;
    short_description?: string;
    location_label?: string;
    timezone?: string;
  };
  form: BookForm;
}

interface CalendarCell {
  iso: string;
  dayNum: number;
  inMonth: boolean;
  isPast: boolean;
  hasSlots: boolean;
  isSelected: boolean;
}

const C = { ...PALETTE, accentBlueLight: '#BFD8EE' };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toLocalDateIsoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toLocalDateIso(value: string, tz?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  if (tz) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(d);
    } catch { /* fall through */ }
  }
  return toLocalDateIsoFromDate(d);
}

function formatTimeOnly(value: string, tz?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  if (tz) opts.timeZone = tz;
  try {
    return new Intl.DateTimeFormat(undefined, opts).format(d);
  } catch {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
  }
}

function shiftMonth(anchor: string, delta: number): string {
  const [y, m] = anchor.split('-').map((n) => parseInt(n, 10));
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function BookScreen() {
  const router = useRouter();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const sid = Number(serviceId);

  const [env, setEnv] = useState<BffEnvelope<BookData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [monthAnchor, setMonthAnchor] = useState<string>('');
  const [serverError, setServerError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(sid)) return;
    let cancelled = false;
    setError(null);
    setEnv(null);
    resolve<BookData>('beauty_book', { service_id: sid })
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(auth)/login') as any);
          return;
        }
        setEnv(e);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => { cancelled = true; };
  }, [sid]);

  const data = env?.action === 'render' ? env.data : null;
  const links = (env?._links ?? {}) as Record<string, BffLink | undefined>;
  const form = data?.form ?? null;
  const tz = data?.provider?.timezone;

  const slotField = useMemo(
    () => form?.fields.find((f) => f.name === 'slot_at') || null,
    [form],
  );

  const allChips = useMemo(() => {
    const opts = slotField?.options || [];
    return opts.map((o) => ({ value: o.value, label: formatTimeOnly(o.value, tz) || o.label }));
  }, [slotField, tz]);

  const slotDays = useMemo(() => {
    const s = new Set<string>();
    for (const o of slotField?.options || []) {
      const iso = toLocalDateIso(o.value, tz);
      if (iso) s.add(iso);
    }
    return s;
  }, [slotField, tz]);

  useEffect(() => {
    if (!form) return;
    const next: Record<string, string | number> = {};
    for (const f of form.fields) if (f.value != null) next[f.name] = f.value;
    setValues(next);

    let earliest = '';
    for (const iso of slotDays) {
      if (!earliest || iso < earliest) earliest = iso;
    }
    if (earliest) {
      setMonthAnchor(`${earliest.slice(0, 7)}-01`);
      setSelectedDay(earliest);
    } else {
      const today = toLocalDateIsoFromDate(new Date());
      setMonthAnchor(`${today.slice(0, 7)}-01`);
      setSelectedDay('');
    }
  }, [form, slotDays]);

  const earliestMonth = useMemo(() => {
    let earliest = '';
    for (const iso of slotDays) {
      const m = iso.slice(0, 7);
      if (!earliest || m < earliest) earliest = m;
    }
    return earliest;
  }, [slotDays]);

  const latestMonth = useMemo(() => {
    let latest = '';
    for (const iso of slotDays) {
      const m = iso.slice(0, 7);
      if (!latest || m > latest) latest = m;
    }
    return latest;
  }, [slotDays]);

  const monthLabel = useMemo(() => {
    if (!monthAnchor) return '';
    const [y, m] = monthAnchor.split('-').map((n) => parseInt(n, 10));
    if (isNaN(y) || isNaN(m)) return '';
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }, [monthAnchor]);

  const calendarRows: CalendarCell[][] = useMemo(() => {
    if (!monthAnchor) return [];
    const [y, m] = monthAnchor.split('-').map((n) => parseInt(n, 10));
    const first = new Date(y, m - 1, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const today = toLocalDateIsoFromDate(new Date());

    const cells: CalendarCell[] = [];
    const empty = (): CalendarCell => ({ iso: '', dayNum: 0, inMonth: false, isPast: false, hasSlots: false, isSelected: false });
    for (let i = 0; i < startWeekday; i++) cells.push(empty());
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        iso, dayNum: day, inMonth: true,
        isPast: iso < today,
        hasSlots: slotDays.has(iso),
        isSelected: iso === selectedDay,
      });
    }
    while (cells.length % 7 !== 0) cells.push(empty());
    const rows: CalendarCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [monthAnchor, slotDays, selectedDay]);

  const canPrevMonth = () =>
    earliestMonth && monthAnchor && monthAnchor.slice(0, 7) > earliestMonth;
  const canNextMonth = () =>
    latestMonth && monthAnchor && monthAnchor.slice(0, 7) < latestMonth;

  const selectedSlot = (values['slot_at'] || '') as string;

  const timeChipsForSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    return allChips.filter((c) => toLocalDateIso(c.value, tz) === selectedDay);
  }, [allChips, selectedDay, tz]);

  const canSubmit = () => !!selectedSlot && allChips.some((c) => c.value === selectedSlot);

  const confirmLabel = (() => {
    if (isSubmitting) return 'Booking…';
    const base = form?.submit_label || 'Confirm booking';
    const time = selectedSlot ? formatTimeOnly(selectedSlot, tz) : '';
    return time ? `${base} · ${time}` : base;
  })();

  const onSubmit = async () => {
    if (!form || isSubmitting || !canSubmit()) return;
    setServerError('');
    setIsSubmitting(true);
    const body: Record<string, unknown> = {};
    for (const f of form.fields) {
      body[f.name] = f.type === 'hidden' ? f.value : values[f.name];
    }
    const submitLink: BffLink = {
      rel: 'submit',
      href: form.submit_href,
      method: (form.submit_method as BffLink['method']) || 'POST',
      screen: null,
      route: null,
      prompt: null,
      params: null,
    };
    const result = await dispatchLink(submitLink, body);
    setIsSubmitting(false);
    if (!result.ok) {
      const errData = (result.error as any)?.response?.data;
      setServerError(errData?.detail ?? 'Could not create that booking. Please try again.');
      return;
    }
    const bookingId = (result.data as any)?.id ?? null;
    const template = form.success_route_template;
    let route: string | null = null;
    if (template && bookingId != null) {
      route = template.replace(':bookingId', String(bookingId));
    }
    // navigateLink builds the native path from screen + params (it ignores
    // `route`). Without params the success route's [id] is left unfilled and
    // the screen hangs forever on "Loading…". Carry bookingId through params.
    const target: BffLink = {
      rel: 'success',
      href: null,
      method: 'NAV',
      screen: bookingId != null ? (form.success_screen || 'beauty_bookings') : 'beauty_bookings',
      route,
      params: bookingId != null ? { bookingId } : null,
      prompt: null,
    };
    navigateLink(router, target, { replace: true });
  };

  if (error) {
    return (
      <View style={[styles.app, { padding: 16 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.danger, fontFamily: FONT_BODY }}>{error}</Text>
      </View>
    );
  }
  if (!data || !form) {
    return (
      <View style={[styles.app, { alignItems: 'center', justifyContent: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.textMuted, fontFamily: FONT_BODY }}>Loading…</Text>
      </View>
    );
  }

  const svc = data.service;
  const prov = data.provider;
  const heroSlug = (svc.category || 'service').toLowerCase().replace(/\s+/g, '-');
  const priceLabel = svc.price_cents != null ? `$${(svc.price_cents / 100).toFixed(0)}` : '';
  const metaParts: string[] = [];
  if (prov?.name) metaParts.push(prov.name);
  if (prov?.location_label) metaParts.push(prov.location_label);
  if (svc.duration_minutes) metaParts.push(`${svc.duration_minutes} min`);
  const metaLine = metaParts.join(' · ');
  const providerInitial = (prov?.name?.trim().charAt(0) || '?').toUpperCase();

  const selectDay = (iso: string) => {
    setSelectedDay(iso);
    if (toLocalDateIso(selectedSlot, tz) !== iso) {
      setValues((v) => ({ ...v, slot_at: '' }));
    }
  };

  const selectSlot = (value: string) => {
    setValues((v) => ({ ...v, slot_at: value }));
    setSelectedDay(toLocalDateIso(value, tz));
  };

  return (
    <View style={styles.app}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.subHeader}>
        <Pressable
          onPress={() => (links.provider ? navigateLink(router, links.provider) : router.back())}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </Pressable>
        <Text style={styles.subHeaderTitle}>Book</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
        <View style={styles.heroStripe}>
          <LinearGradient
            colors={['#3A3A3A', '#2A2A2A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTag}>
            <Text style={styles.heroTagText}>img · {heroSlug}</Text>
          </View>
        </View>

        <View style={styles.detailSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{svc.name}</Text>
            {priceLabel ? <Text style={styles.price}>{priceLabel}</Text> : null}
          </View>
          <Text style={styles.meta}>{metaLine}</Text>

          {slotDays.size > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Choose a day</Text>

              <View style={styles.calHead}>
                <Pressable
                  onPress={() => canPrevMonth() && setMonthAnchor(shiftMonth(monthAnchor, -1))}
                  disabled={!canPrevMonth()}
                  style={[styles.calChev, !canPrevMonth() && { opacity: 0.35 }]}
                  accessibilityLabel="Previous month"
                >
                  <Text style={styles.calChevText}>‹</Text>
                </Pressable>
                <Text style={styles.calMonthLabel}>{monthLabel}</Text>
                <Pressable
                  onPress={() => canNextMonth() && setMonthAnchor(shiftMonth(monthAnchor, 1))}
                  disabled={!canNextMonth()}
                  style={[styles.calChev, !canNextMonth() && { opacity: 0.35 }]}
                  accessibilityLabel="Next month"
                >
                  <Text style={styles.calChevText}>›</Text>
                </Pressable>
              </View>

              <View style={styles.calWeekdays}>
                {WEEKDAYS.map((w) => (
                  <Text key={w} style={styles.calWeekdayText}>{w}</Text>
                ))}
              </View>

              <View style={styles.calGrid}>
                {calendarRows.map((row, ri) => (
                  <View key={ri} style={styles.calRow}>
                    {row.map((c, ci) => {
                      if (!c.iso) return <View key={ci} style={styles.calBlank} />;
                      const disabled = c.isPast || !c.hasSlots;
                      return (
                        <Pressable
                          key={ci}
                          onPress={() => !disabled && selectDay(c.iso)}
                          disabled={disabled}
                          style={[
                            styles.dayChip,
                            c.isSelected && styles.dayChipSelected,
                            disabled && styles.dayChipDisabled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNum,
                              c.isSelected && { color: C.white },
                              disabled && styles.dayNumDisabled,
                            ]}
                          >
                            {c.dayNum}
                          </Text>
                          {c.hasSlots && !c.isPast ? (
                            <View style={[styles.dayDot, c.isSelected && { backgroundColor: C.white }]} />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Available times</Text>
              {timeChipsForSelectedDay.length === 0 ? (
                <Text style={styles.timeEmpty}>No times available for this day.</Text>
              ) : (
                <View style={styles.timeGrid}>
                  {timeChipsForSelectedDay.map((t) => {
                    const sel = t.value === selectedSlot;
                    return (
                      <Pressable
                        key={t.value}
                        onPress={() => selectSlot(t.value)}
                        style={[styles.timeChip, sel && styles.timeChipSelected]}
                      >
                        <Text style={[styles.timeChipText, sel && styles.timeChipTextSelected]}>{t.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          ) : null}

          {prov?.name ? (
            <View style={styles.providerCard}>
              <LinearGradient
                colors={[C.accentBlueLight, C.accentBlueDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.providerAvatar}
              >
                <Text style={styles.providerAvatarText}>{providerInitial}</Text>
              </LinearGradient>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName} numberOfLines={1}>{prov.name}</Text>
                {prov.short_description ? (
                  <Text style={styles.providerSub} numberOfLines={1}>{prov.short_description}</Text>
                ) : null}
              </View>
              {links.provider ? (
                <Pressable onPress={() => navigateLink(router, links.provider)}>
                  <Text style={styles.providerChange}>Change</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {serverError ? (
            <View style={styles.serverError}>
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.ctaRow}>
        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit() || isSubmitting}
          style={({ pressed }) => [
            styles.btnConfirm,
            (!canSubmit() || isSubmitting) && styles.btnConfirmDisabled,
            pressed && canSubmit() && !isSubmitting && { backgroundColor: C.successHover, borderColor: C.successHover },
          ]}
        >
          {!isSubmitting ? (
            <Ionicons name="checkmark" size={14} color={canSubmit() ? C.white : '#9A9AA0'} />
          ) : null}
          <Text style={[styles.btnConfirmText, (!canSubmit() || isSubmitting) && { color: '#9A9AA0' }]}>
            {confirmLabel}
          </Text>
        </Pressable>
      </View>

      <BottomNav active="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.surface },

  subHeader: {
    height: 56, paddingHorizontal: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.line,
    flexDirection: 'row', alignItems: 'center',
  },
  iconBtn: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconBtnPressed: { backgroundColor: C.surface2 },
  subHeaderTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 15, fontFamily: FONT_BODY_SEMI, color: C.text, letterSpacing: 0.2,
  },

  heroStripe: { height: 180, position: 'relative', overflow: 'hidden' },
  heroTag: {
    position: 'absolute', right: 12, top: 12, zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4,
  },
  heroTagText: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontFamily: FONT_MONO },

  detailSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 },
  title: { fontFamily: FONT_DISPLAY, fontSize: 28, color: C.text, letterSpacing: 0.2, lineHeight: 32, flex: 1 },
  // Money in Inter semibold w/ tabular lining figures — Cormorant's old-style
  // numerals made "$135" hard to read as a price. Serif stays on the title.
  price: {
    fontFamily: FONT_BODY_SEMI,
    fontSize: 19,
    color: C.text,
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
  meta: { fontSize: 12, color: C.textMuted, marginBottom: 18, fontFamily: FONT_BODY },

  sectionLabel: {
    fontSize: 11, fontFamily: FONT_BODY_SEMI, color: C.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
  },

  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calMonthLabel: { fontFamily: FONT_DISPLAY, fontSize: 17, color: C.text, letterSpacing: 0.2 },
  calChev: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  calChevText: { fontSize: 18, color: C.text, lineHeight: 18 },

  calWeekdays: { flexDirection: 'row', marginBottom: 5 },
  calWeekdayText: {
    flex: 1, textAlign: 'center',
    fontSize: 9, fontFamily: FONT_BODY_SEMI, color: C.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },

  calGrid: { marginBottom: 18 },
  calRow: { flexDirection: 'row', marginBottom: 5 },
  calBlank: { flex: 1, height: 44, marginHorizontal: 2.5 },
  dayChip: {
    flex: 1, height: 44, borderRadius: 9, marginHorizontal: 2.5,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  dayChipSelected: { backgroundColor: C.text, borderColor: C.text },
  dayChipDisabled: { backgroundColor: 'transparent', borderColor: 'transparent' },
  dayNum: { fontFamily: FONT_DISPLAY, fontSize: 16, color: C.text },
  dayNumDisabled: { color: C.textMuted, textDecorationLine: 'line-through' },
  dayDot: {
    position: 'absolute', bottom: 5, alignSelf: 'center',
    width: 4, height: 4, borderRadius: 2, backgroundColor: C.success,
  },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 18 },
  timeChip: {
    width: '33.333%', height: 38, paddingHorizontal: 4,
    marginBottom: 8,
    alignItems: 'stretch',
  },
  timeChipText: {
    flex: 1, textAlign: 'center', textAlignVertical: 'center',
    height: 38, lineHeight: 36,
    borderRadius: 10, borderWidth: 1, borderColor: C.line,
    backgroundColor: C.white, color: C.text,
    fontSize: 13, fontFamily: FONT_BODY,
  },
  timeChipSelected: {},
  timeChipTextSelected: {
    backgroundColor: C.accentBlue, borderColor: C.accentBlueDeep, borderWidth: 1.5,
    color: C.accentBlueText, fontFamily: FONT_BODY_SEMI,
  },
  timeEmpty: { color: C.textMuted, fontSize: 13, paddingVertical: 12, fontFamily: FONT_BODY },

  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line,
    borderRadius: 10, marginBottom: 14,
  },
  providerAvatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  providerAvatarText: { fontSize: 13, color: C.accentBlueText, fontFamily: FONT_BODY_SEMI },
  providerInfo: { flex: 1, minWidth: 0 },
  providerName: { fontSize: 13, color: C.text, fontFamily: FONT_BODY_SEMI },
  providerSub: { fontSize: 11, color: C.textMuted, fontFamily: FONT_BODY },
  providerChange: { fontSize: 11, color: C.accentBlueDeep, fontFamily: FONT_BODY_SEMI },

  serverError: {
    backgroundColor: '#FCE8E5', borderWidth: 1, borderColor: '#F4B5AE',
    borderRadius: 10, padding: 10, paddingHorizontal: 14, marginBottom: 10,
  },
  serverErrorText: { color: '#8A2419', fontSize: 13, fontFamily: FONT_BODY, lineHeight: 18 },

  ctaRow: {
    paddingHorizontal: 20, paddingVertical: 10, paddingTop: 10,
    backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.line,
  },
  btnConfirm: {
    width: '100%', height: 46, borderRadius: 10,
    backgroundColor: C.success, borderWidth: 1, borderColor: C.success,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
    shadowColor: C.success, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  btnConfirmDisabled: {
    backgroundColor: '#D4D4D7', borderColor: '#D4D4D7',
    shadowOpacity: 0,
  },
  btnConfirmText: { color: C.white, fontSize: 14, fontFamily: FONT_BODY_SEMI, letterSpacing: 0.2 },
});
