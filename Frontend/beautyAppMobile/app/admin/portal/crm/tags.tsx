/**
 * Admin Portal — Tag manager bottom-sheet (`/admin/portal/crm/tags`).
 * Lists every BeautyAdminTag with count + create new tag w/ color swatch.
 * Tap backdrop or close button → router.back().
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
import Svg, { Path } from 'react-native-svg';

import { resolve } from '@/services/bff';
import { api } from '@/services/api';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { nativeRouteFor } from '@/bff/linkAction';
import { admTokens } from '@/components/admin/tokens';

interface Tag {
  id: string;
  label: string;
  color: string;
  tone: string;
  count: number;
}

interface TagData {
  tags: Tag[];
}

const PALETTE = [
  '#A06B2C', '#2F7A47', '#C0392B', '#7DA8CF',
  '#5C4A8A', '#8A6A1F', '#1F6E7A', '#0F1115',
];

const TONE_FOR: Record<string, string> = {
  '#A06B2C': '#F4E7D6',
  '#2F7A47': '#E5F3EA',
  '#C0392B': '#FCE8E5',
  '#7DA8CF': '#E6F0FA',
  '#5C4A8A': '#ECE6F5',
  '#8A6A1F': '#F1E8DA',
  '#1F6E7A': '#DCEEF1',
  '#0F1115': '#E9E9EB',
};

export default function AdminTagManager() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<TagData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#7DA8CF');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (signal?: AbortController) => {
    setError(null);
    try {
      const e = await resolve<TagData>('beauty_admin_portal_tag_manager');
      if (signal?.signal.aborted) return;
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        if (route) router.replace(route as any);
        return;
      }
      setEnv(e);
    } catch (err: any) {
      if (!signal?.signal.aborted) {
        setError(err?.response?.data?.detail ?? 'Failed to load.');
      }
    }
  }, [router]);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl);
    return () => ctrl.abort();
  }, [load]);

  const onClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/admin/portal/crm' as any);
  };

  const onCreate = async () => {
    const label = name.trim();
    if (!label) {
      setError('Tag name required.');
      return;
    }
    const link = env?.action === 'render' ? (env._links?.create as BffLink | undefined) : null;
    if (!link?.href) {
      setError('Create endpoint unavailable.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const tone = TONE_FOR[color] ?? color;
      await api.request({
        url: link.href,
        method: link.method,
        data: { label, color, tone },
      });
      setName('');
      setColor('#7DA8CF');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not create tag.');
    } finally {
      setSubmitting(false);
    }
  };

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
  const tags = data.tags ?? [];

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Stack.Screen options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }} />
      <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.handle} />
        <View style={styles.head}>
          <Text style={styles.title}>Manage tags</Text>
          <Text style={styles.count}>{tags.length} tags</Text>
          <Pressable onPress={onClose} style={styles.closeX} accessibilityLabel="Close">
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={admTokens.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M18 6L6 18M6 6l12 12" />
            </Svg>
          </Pressable>
        </View>
        <Text style={styles.desc}>
          Tags attached here show up as filters in CRM and on the account detail page. Tags are
          admin-only — users never see them.
        </Text>

        <View style={styles.create}>
          <Text style={styles.eyebrow}>New tag</Text>
          <View style={styles.createRow}>
            <View style={[styles.swatch, { backgroundColor: color }]} />
            <TextInput
              style={styles.nameIn}
              value={name}
              onChangeText={setName}
              placeholder="Tag name…"
              placeholderTextColor={admTokens.textMuted}
            />
            <Pressable
              style={[styles.createBtn, submitting && { opacity: 0.6 }]}
              onPress={onCreate}
              disabled={submitting}
            >
              <Text style={styles.createBtnText}>{submitting ? '…' : 'Create'}</Text>
            </Pressable>
          </View>
          <View style={styles.colors}>
            {PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.cell,
                  { backgroundColor: c },
                  c === color && styles.cellOn,
                ]}
              />
            ))}
          </View>
          {error ? <Text style={styles.err}>{error}</Text> : null}
        </View>

        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 22 }}>
          {tags.map((t, i) => (
            <View key={t.id} style={[styles.tagRow, i > 0 && styles.tagRowBorder]}>
              <View style={[styles.tchip, { backgroundColor: t.tone, borderColor: t.color + '33' }]}>
                <View style={[styles.tchipDot, { backgroundColor: t.color }]} />
                <Text style={[styles.tchipText, { color: t.color }]}>{t.label}</Text>
              </View>
              <View style={{ flex: 1 }} />
              <Text style={styles.cnt}>{(t.count ?? 0).toLocaleString()} accts</Text>
              <Pressable style={styles.editBtn} accessibilityLabel={`Edit ${t.label}`}>
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={admTokens.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </Svg>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,17,21,0.5)', justifyContent: 'flex-end' },
  loader: { flex: 1, backgroundColor: 'rgba(15,17,21,0.5)', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 14,
    paddingBottom: 22,
    maxHeight: '85%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: admTokens.line, alignSelf: 'center', marginBottom: 12 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  title: { fontSize: 22, color: admTokens.text, flex: 1, fontFamily: 'CormorantGaramond_500Medium' },
  count: { fontSize: 11, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  closeX: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: admTokens.surface,
    borderWidth: 1,
    borderColor: admTokens.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desc: { paddingHorizontal: 18, paddingBottom: 10, fontSize: 12, color: admTokens.textMuted, lineHeight: 18 },
  create: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 12,
    backgroundColor: admTokens.surface,
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 12,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: admTokens.textMuted,
    marginBottom: 6,
  },
  createRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  swatch: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  nameIn: {
    flex: 1,
    height: 30,
    borderWidth: 1,
    borderColor: admTokens.line,
    borderRadius: 7,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontSize: 12.5,
    lineHeight: 16,
    color: admTokens.text,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  createBtn: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 7,
    backgroundColor: '#0F1115',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: { color: admTokens.white, fontWeight: '700', fontSize: 11.5 },
  colors: { flexDirection: 'row', gap: 5, marginTop: 8 },
  cell: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(15,17,21,0.10)',
  },
  cellOn: { borderWidth: 2, borderColor: '#0F1115' },
  err: { marginTop: 8, fontSize: 11, color: admTokens.errorText },
  list: { paddingHorizontal: 14, flexGrow: 0 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  tagRowBorder: { borderTopWidth: 1, borderTopColor: '#ECECEE' },
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
  cnt: { fontSize: 10.5, color: admTokens.textMuted, fontFamily: admTokens.fontMono },
  editBtn: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderColor: admTokens.line,
    backgroundColor: '#fff',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
