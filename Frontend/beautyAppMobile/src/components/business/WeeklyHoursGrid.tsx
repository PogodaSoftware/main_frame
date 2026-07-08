/**
 * WeeklyHoursGrid — shared weekly-hours editor.
 * Mirrors Angular beauty-weekly-hours-editor: quickset chips, seg pill
 * (Closed/Open/24h) per day, time inputs (HTML time input on web, TextInput
 * fallback native), and TZ banner. Backend uses Mon=0…Sun=6.
 */
import React from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProvBtn } from './ProvBtn';
import { ProvCard } from './ProvCard';
import { beautyTokens } from '../../../tamagui.config';
import type { WeeklyHourRow } from '@/services/businessApply';

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type SegState = 'closed' | 'open' | '24h';

/** "14:30" → "2:30 PM" (storage stays 24h). */
function fmt12(hhmm: string | undefined): string {
  const s = (hhmm || '').slice(0, 5);
  const [h, m] = s.split(':');
  const H = parseInt(h, 10);
  if (Number.isNaN(H)) return s;
  const ap = H >= 12 ? 'PM' : 'AM';
  let h12 = H % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${m ?? '00'} ${ap}`;
}

interface QuickSet {
  k: string;
  label: string;
  apply: (rows: WeeklyHourRow[]) => WeeklyHourRow[];
}

function setRange(rows: WeeklyHourRow[], from: number, to: number, start: string, end: string): WeeklyHourRow[] {
  return rows.map((r) =>
    r.day_of_week >= from && r.day_of_week <= to
      ? { ...r, is_closed: false, is_24h: false, start_time: start, end_time: end }
      : { ...r, is_closed: true, is_24h: false },
  );
}

const QUICK_SETS: QuickSet[] = [
  { k: 'wd-10-6', label: 'Weekdays 10–6', apply: (rows) => setRange(rows, 0, 4, '10:00', '18:00') },
  { k: 'mf-9-5', label: 'Mon–Fri 9–5', apply: (rows) => setRange(rows, 0, 4, '09:00', '17:00') },
  { k: '7day', label: '7 days 10–8', apply: (rows) => setRange(rows, 0, 6, '10:00', '20:00') },
  {
    k: 'wknd',
    label: 'Weekends only',
    apply: (rows) =>
      rows.map((r) =>
        r.day_of_week === 5 || r.day_of_week === 6
          ? { ...r, is_closed: false, is_24h: false, start_time: '10:00', end_time: '18:00' }
          : { ...r, is_closed: true, is_24h: false },
      ),
  },
  { k: 'closed', label: 'Closed all week', apply: (rows) => rows.map((r) => ({ ...r, is_closed: true, is_24h: false })) },
];

export interface WeeklyHoursGridProps {
  rows: WeeklyHourRow[];
  onChange: (rows: WeeklyHourRow[]) => void;
}

function rowState(row: WeeklyHourRow): SegState {
  if (row.is_closed) return 'closed';
  if (row.is_24h) return '24h';
  return 'open';
}

function subLabel(row: WeeklyHourRow): string {
  if (row.is_closed) return 'Closed';
  if (row.is_24h) return 'Open 24h';
  return `${fmt12(row.start_time)}–${fmt12(row.end_time)}`;
}

export function WeeklyHoursGrid({ rows, onChange }: WeeklyHoursGridProps) {
  const [activeQuickSet, setActiveQuickSet] = React.useState<string | null>(null);

  const setRowState = (idx: number, st: SegState) => {
    const next = rows.map((r, i) => {
      if (i !== idx) return r;
      const start_time = st === 'open' && !r.start_time ? '10:00' : r.start_time;
      const end_time = st === 'open' && !r.end_time ? '18:00' : r.end_time;
      return { ...r, is_closed: st === 'closed', is_24h: st === '24h', start_time, end_time };
    });
    setActiveQuickSet(null);
    onChange(next);
  };

  const updateTime = (idx: number, field: 'start_time' | 'end_time', value: string) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
    setActiveQuickSet(null);
    onChange(next);
  };

  const applyQuickSet = (qs: QuickSet) => {
    onChange(qs.apply(rows));
    setActiveQuickSet(qs.k);
  };

  return (
    <View>
      <View style={styles.quickset}>
        <Text style={styles.qsLabel}>QUICK SET</Text>
        <View style={styles.qsChips}>
          {QUICK_SETS.map((qs) => {
            const selected = activeQuickSet === qs.k;
            return (
              <Pressable
                key={qs.k}
                onPress={() => applyQuickSet(qs)}
                style={[styles.qsChip, selected && styles.qsChipSelected]}
              >
                <Text style={[styles.qsChipText, selected && styles.qsChipTextSelected]}>{qs.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ProvCard padding={0} style={styles.hoursCard}>
        <View style={styles.hoursCardInner}>
          {rows.map((row, idx) => {
            const state = rowState(row);
            const last = idx === rows.length - 1;
            return (
              <View key={row.day_of_week} style={[styles.dayRow, last && styles.dayRowLast]}>
                <View style={styles.dayCol}>
                  <Text style={styles.dayName}>{DAY_LABELS[row.day_of_week]}</Text>
                  <Text style={styles.daySub}>{subLabel(row)}</Text>
                </View>
                <View style={styles.segPill}>
                  <SegBtn label="Closed" selected={state === 'closed'} closed onPress={() => setRowState(idx, 'closed')} />
                  <SegBtn label="Open" selected={state === 'open'} onPress={() => setRowState(idx, 'open')} />
                  <SegBtn label="24h" selected={state === '24h'} onPress={() => setRowState(idx, '24h')} />
                </View>
                {state === 'open' && (
                  <View style={styles.timePair}>
                    <TimeInput
                      value={row.start_time}
                      onChange={(v) => updateTime(idx, 'start_time', v)}
                      eyebrow={`${DAY_LABELS[row.day_of_week]} · Opening time`}
                      accessibilityLabel={`${DAY_LABELS[row.day_of_week]} start time`}
                    />
                    <Text style={styles.dash}>–</Text>
                    <TimeInput
                      value={row.end_time}
                      onChange={(v) => updateTime(idx, 'end_time', v)}
                      eyebrow={`${DAY_LABELS[row.day_of_week]} · Closing time`}
                      accessibilityLabel={`${DAY_LABELS[row.day_of_week]} end time`}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ProvCard>
    </View>
  );
}

function SegBtn({ label, selected, closed = false, onPress }: { label: string; selected: boolean; closed?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.seg,
        selected && styles.segSelected,
        selected && closed && styles.segSelectedClosed,
      ]}
    >
      <Text
        style={[
          styles.segText,
          selected && styles.segTextSelected,
          selected && closed && styles.segTextClosed,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// 30-minute time options across the day (value = 24h "HH:MM", label = 12h).
const TIME_OPTIONS: { value: string; label: string }[] = Array.from({ length: 48 }, (_, i) => {
  const H = Math.floor(i / 2);
  const M = i % 2 === 0 ? '00' : '30';
  const value = `${String(H).padStart(2, '0')}:${M}`;
  return { value, label: fmt12(value) };
});

const MORNING_OPTIONS = TIME_OPTIONS.filter((o) => parseInt(o.value, 10) < 12);
const EVENING_OPTIONS = TIME_OPTIONS.filter((o) => parseInt(o.value, 10) >= 12);

function TimeInput({ value, onChange, eyebrow, accessibilityLabel }: { value: string; onChange: (v: string) => void; eyebrow?: string; accessibilityLabel?: string }) {
  const norm = (value || '').slice(0, 5);
  // Hooks must run unconditionally (before the web early-return).
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(norm);
  if (Platform.OS === 'web') {
    return React.createElement('select', {
      value: norm,
      onChange: (e: any) => onChange(e.target.value),
      'aria-label': accessibilityLabel,
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: 600,
        color: beautyTokens.text,
        background: '#FFFFFF',
        border: `1px solid ${beautyTokens.line}`,
        borderRadius: 8,
        padding: '6px 8px',
        minHeight: 32,
        cursor: 'pointer',
      },
    }, TIME_OPTIONS.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label)));
  }

  const openSheet = () => { setPending(norm); setOpen(true); };
  const commit = () => { onChange(pending); setOpen(false); };

  const renderRow = (o: { value: string; label: string }) => {
    const selected = o.value === pending;
    return (
      <Pressable
        key={o.value}
        style={[styles.timeRow, selected && styles.timeRowActive]}
        onPress={() => setPending(o.value)}
      >
        <Text style={[styles.timeRowText, selected && styles.timeRowTextActive]}>{o.label}</Text>
        {selected ? <Text style={styles.timeCheck}>✓</Text> : null}
      </Pressable>
    );
  };

  return (
    <>
      <Pressable style={styles.timeSelect} onPress={openSheet} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
        <Text style={styles.timeSelectText}>{fmt12(value)}</Text>
        <Text style={styles.timeCaret}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <View style={styles.grabber} />
            <View style={styles.sheetHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                {eyebrow ? <Text style={styles.sheetEyebrow}>{eyebrow.toUpperCase()}</Text> : null}
                <Text style={styles.sheetTitle}>Select time</Text>
              </View>
              <View style={styles.timePill}><Text style={styles.timePillText}>{fmt12(pending)}</Text></View>
            </View>
            <ScrollView style={styles.sheetScroll}>
              <Text style={styles.groupHead}>MORNING · AM</Text>
              {MORNING_OPTIONS.map(renderRow)}
              <Text style={styles.groupHead}>AFTERNOON & EVENING · PM</Text>
              {EVENING_OPTIONS.map(renderRow)}
            </ScrollView>
            <View style={styles.sheetFooter}>
              <View style={{ flex: 1 }}>
                <ProvBtn variant="secondary" full onPress={() => setOpen(false)}>Cancel</ProvBtn>
              </View>
              <View style={{ flex: 1 }}>
                <ProvBtn variant="success" full onPress={commit}>Done</ProvBtn>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  quickset: { marginTop: 20, marginBottom: 14 },
  qsLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.6,
    color: beautyTokens.textMuted, marginBottom: 6,
    fontFamily: beautyTokens.fontBody,
  },
  qsChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  qsChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    minHeight: 44, borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line,
    alignItems: 'center', justifyContent: 'center',
  },
  qsChipSelected: { backgroundColor: beautyTokens.text, borderColor: beautyTokens.text },
  qsChipText: { fontSize: 12, fontWeight: '600', color: beautyTokens.text, fontFamily: beautyTokens.fontBody },
  qsChipTextSelected: { color: '#FFFFFF' },

  hoursCard: {},
  hoursCardInner: { paddingHorizontal: 14 },
  dayRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    gap: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: beautyTokens.line,
  },
  dayRowLast: { borderBottomWidth: 0 },
  dayCol: { width: 96 },
  dayName: { fontSize: 13, fontWeight: '600', color: beautyTokens.text, fontFamily: beautyTokens.fontBody },
  daySub: { fontSize: 10, color: beautyTokens.textMuted, marginTop: 2, fontFamily: beautyTokens.fontBody },

  segPill: {
    flexDirection: 'row',
    backgroundColor: beautyTokens.surface,
    borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 999, padding: 2,
  },
  seg: {
    paddingHorizontal: 10, paddingVertical: 6,
    minHeight: 32, borderRadius: 999,
    borderWidth: 1, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  // Selected (Open or Closed) = ink fill per the desktop design.
  segSelected: { backgroundColor: beautyTokens.text, borderColor: beautyTokens.text },
  segSelectedClosed: { backgroundColor: beautyTokens.text, borderColor: beautyTokens.text },
  segText: { fontSize: 11, fontWeight: '600', color: beautyTokens.textMuted, fontFamily: beautyTokens.fontBody },
  segTextSelected: { color: '#FFFFFF' },
  segTextClosed: { color: '#FFFFFF' },

  timePair: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  dash: { color: beautyTokens.textMuted, fontSize: 11 },
  timeSelect: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: beautyTokens.line,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    minHeight: 34, minWidth: 92, justifyContent: 'center',
  },
  timeSelectText: { fontFamily: beautyTokens.fontBody, fontSize: 12, fontWeight: '600', color: beautyTokens.text },
  timeCaret: { fontSize: 10, color: beautyTokens.textMuted },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15, 17, 21, 0.55)', justifyContent: 'flex-end' },
  sheetCard: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 8, paddingBottom: 24, paddingHorizontal: 12, maxHeight: '80%',
  },
  grabber: {
    alignSelf: 'center', width: 40, height: 5, borderRadius: 999,
    backgroundColor: beautyTokens.line, marginBottom: 10, marginTop: 2,
  },
  sheetHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 4, marginBottom: 8,
  },
  sheetEyebrow: {
    fontFamily: beautyTokens.fontBody, fontSize: 10, fontWeight: '700',
    letterSpacing: 1.2, color: beautyTokens.textMuted, marginBottom: 2,
  },
  sheetTitle: {
    fontFamily: beautyTokens.fontDisplay, fontSize: 22, fontWeight: '500',
    color: beautyTokens.text,
  },
  timePill: {
    backgroundColor: beautyTokens.accentBlue, borderWidth: 1, borderColor: 'rgba(125,168,207,0.5)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  timePillText: { fontFamily: 'Menlo', fontSize: 13, fontWeight: '600', color: beautyTokens.accentBlueText },
  sheetScroll: { flexGrow: 0, marginTop: 4 },
  groupHead: {
    fontFamily: beautyTokens.fontBody, fontSize: 10, fontWeight: '700',
    letterSpacing: 1.2, color: beautyTokens.textMuted,
    paddingHorizontal: 8, paddingTop: 12, paddingBottom: 4,
  },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 10,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  timeRowActive: {
    backgroundColor: beautyTokens.accentBlue,
    borderLeftColor: beautyTokens.accentBlueDeep,
  },
  timeRowText: { fontFamily: beautyTokens.fontBody, fontSize: 14, color: beautyTokens.text },
  timeRowTextActive: { fontWeight: '700', color: beautyTokens.accentBlueText },
  timeCheck: { fontSize: 14, color: beautyTokens.accentBlueDeep, fontWeight: '700' },
  sheetFooter: { flexDirection: 'row', gap: 10, marginTop: 12, paddingHorizontal: 4 },
});
