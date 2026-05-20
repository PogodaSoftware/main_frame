/**
 * Service form — handles both Add (id = "new") and Edit (id = <number>).
 * A single file is safer than two separate files as the service catalogue grows,
 * since all form logic lives in one place with no duplication.
 */
import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  Input,
  Paragraph,
  ScrollView,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { dispatchLink, navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { api } from '@/services/api';
import { BeautyShell } from '@/components/BeautyShell';
import { beautyTokens } from '../../../tamagui.config';

const CATEGORY_OPTIONS = [
  { value: 'facial', label: 'Facial' },
  { value: 'massage', label: 'Massage' },
  { value: 'nails', label: 'Nails' },
  { value: 'hair', label: 'Hair' },
];

interface FormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  value: string | number;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  suffix?: string;
}

interface ServiceFormData {
  is_edit: boolean;
  service_id: number | null;
  form: {
    title: string;
    submit_method: string;
    submit_href: string;
    success_screen: string;
    submit_label: string;
    fields: FormField[];
  };
}

export default function ServiceFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const router = useRouter();

  const [env, setEnv] = useState<BffEnvelope<ServiceFormData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Local form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('facial');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('50.00');
  const [duration, setDuration] = useState('60');

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const params = isNew ? { serviceId: 'new' } : { serviceId: id };
    resolve<ServiceFormData>('beauty_business_service_form', params)
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(auth)/business-login') as any);
          return;
        }
        setEnv(e);
        if (e.action === 'render' && e.data?.form?.fields) {
          const fv = (n: string) => {
            const f = e.data!.form.fields.find((x) => x.name === n);
            return f ? String(f.value ?? '') : '';
          };
          setName(fv('name'));
          setCategory(fv('category') || 'facial');
          setDescription(fv('description'));
          setPrice(fv('price_dollars'));
          setDuration(fv('duration_minutes'));
        }
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load form.');
      });
    return () => { cancelled = true; };
  }, [id]);

  const links = env?.action === 'render' ? (env._links ?? {}) : {};
  const form = env?.action === 'render' ? env.data?.form : undefined;

  const onSubmit = async () => {
    if (!form) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: Record<string, unknown> = {
        name,
        category,
        description,
        price_dollars: price,
        duration_minutes: parseInt(duration, 10) || 60,
      };
      if (form.submit_method === 'PUT') {
        await api.put(form.submit_href, payload);
      } else {
        await api.post(form.submit_href, payload);
      }
      // Navigate back to services list
      navigateLink(router, links.cancel, { replace: true });
    } catch (err: any) {
      setSubmitError(err?.response?.data?.detail ?? 'Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!env && !error) {
    return (
      <BeautyShell>
        <Stack.Screen options={{ headerShown: false }} />
        <YStack flex={1} items="center" justify="center">
          <Spinner color={beautyTokens.successHover} />
        </YStack>
      </BeautyShell>
    );
  }

  if (error) {
    return (
      <BeautyShell>
        <Stack.Screen options={{ headerShown: false }} />
        <YStack flex={1} p="$4">
          <SizableText color={beautyTokens.danger}>{error}</SizableText>
        </YStack>
      </BeautyShell>
    );
  }

  return (
    <BeautyShell>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1}>
        {/* Header */}
        <XStack
          height={52}
          items="center"
          px="$4"
          bg={beautyTokens.surface}
          borderBottomWidth={1}
          borderBottomColor={beautyTokens.line}
          gap="$3"
        >
          <Pressable onPress={() => navigateLink(router, links.cancel)}>
            <SizableText fontSize={22} color={beautyTokens.text}>‹</SizableText>
          </Pressable>
          <SizableText fontFamily="$heading" fontSize={18} fontWeight="500" color={beautyTokens.text} flex={1}>
            {form?.title ?? (isNew ? 'Add a service' : 'Edit service')}
          </SizableText>
        </XStack>

        <ScrollView flex={1} bg={beautyTokens.surface2} keyboardShouldPersistTaps="handled">
          <YStack p="$4" gap="$4">
            {/* Name */}
            <YStack gap="$1">
              <SizableText fontSize={12} fontWeight="600" color={beautyTokens.textMuted} testID="field-label-name">
                SERVICE NAME
              </SizableText>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="e.g. Swedish Massage"
                borderColor={beautyTokens.line}
                color={beautyTokens.text}
                testID="form-field-name"
              />
            </YStack>

            {/* Category */}
            <YStack gap="$1">
              <SizableText fontSize={12} fontWeight="600" color={beautyTokens.textMuted}>
                CATEGORY
              </SizableText>
              <XStack gap="$2" flexWrap="wrap">
                {CATEGORY_OPTIONS.map((opt) => (
                  <Pressable key={opt.value} onPress={() => setCategory(opt.value)}>
                    <YStack
                      rounded={20}
                      px="$3"
                      height={34}
                      justify="center"
                      bg={category === opt.value ? beautyTokens.accentBlueDeep : beautyTokens.white}
                      borderWidth={1}
                      borderColor={category === opt.value ? beautyTokens.accentBlueDeep : beautyTokens.line}
                    >
                      <SizableText
                        fontSize={13}
                        color={category === opt.value ? beautyTokens.white : beautyTokens.text}
                      >
                        {opt.label}
                      </SizableText>
                    </YStack>
                  </Pressable>
                ))}
              </XStack>
            </YStack>

            {/* Description */}
            <YStack gap="$1">
              <SizableText fontSize={12} fontWeight="600" color={beautyTokens.textMuted}>
                DESCRIPTION (OPTIONAL)
              </SizableText>
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Describe this service…"
                multiline
                numberOfLines={3}
                borderColor={beautyTokens.line}
                color={beautyTokens.text}
                testID="form-field-description"
              />
            </YStack>

            {/* Price */}
            <YStack gap="$1">
              <SizableText fontSize={12} fontWeight="600" color={beautyTokens.textMuted}>
                PRICE (USD)
              </SizableText>
              <XStack
                borderWidth={1}
                borderColor={beautyTokens.line}
                rounded={8}
                height={44}
                items="center"
                px="$3"
                bg={beautyTokens.white}
              >
                <SizableText fontSize={16} color={beautyTokens.textMuted}>$</SizableText>
                <Input
                  flex={1}
                  unstyled
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="50.00"
                  color={beautyTokens.text}
                  ml="$1"
                  testID="form-field-price"
                />
              </XStack>
            </YStack>

            {/* Duration */}
            <YStack gap="$1">
              <SizableText fontSize={12} fontWeight="600" color={beautyTokens.textMuted}>
                DURATION
              </SizableText>
              <XStack
                borderWidth={1}
                borderColor={beautyTokens.line}
                rounded={8}
                height={44}
                items="center"
                px="$3"
                bg={beautyTokens.white}
                gap="$2"
              >
                <Input
                  flex={1}
                  unstyled
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                  placeholder="60"
                  color={beautyTokens.text}
                  testID="form-field-duration"
                />
                <SizableText fontSize={13} color={beautyTokens.textMuted}>min(s)</SizableText>
              </XStack>
            </YStack>

            {submitError ? (
              <Paragraph color={beautyTokens.danger} fontSize={13}>{submitError}</Paragraph>
            ) : null}
          </YStack>
        </ScrollView>

        {/* Sticky submit */}
        <YStack
          bg={beautyTokens.surface}
          borderTopWidth={1}
          borderTopColor={beautyTokens.line}
          p="$4"
        >
          <Pressable
            testID="form-submit"
            disabled={submitting}
            onPress={onSubmit}
          >
            <YStack
              height={48}
              rounded={12}
              bg={submitting ? beautyTokens.textMuted : beautyTokens.successHover}
              justify="center"
              items="center"
            >
              {submitting
                ? <Spinner color={beautyTokens.white} />
                : <SizableText fontWeight="700" color={beautyTokens.white}>
                    {form?.submit_label ?? (isNew ? 'Create service' : 'Save changes')}
                  </SizableText>}
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </BeautyShell>
  );
}
