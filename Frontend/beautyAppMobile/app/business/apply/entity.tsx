/**
 * Apply wizard step 1 — Entity & applicant identity.
 * Mirrors Angular `beauty-business-application.component` entity branch.
 * BFF: `beauty_business_application_entity`. PATCH submit_href w/ form.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { patchApplicationStep } from '@/services/businessApply';
import {
  ChoiceRow,
  HeadedCard,
  ProvCard,
  WizardLayout,
  type WizardData,
} from '@/components/business';
import { beautyTokens } from '../../../tamagui.config';

interface EntityApplication {
  entity_type?: 'person' | 'business' | string;
  applicant_first_name?: string;
  applicant_last_name?: string;
  business_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  itin_masked?: string;
  has_itin?: boolean;
}

interface EntityData extends WizardData {
  application?: EntityApplication;
  business?: { business_name?: string };
  submit_href: string;
  submit_method: string;
}

export default function ApplyEntityScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<EntityData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [entityType, setEntityType] = useState<'person' | 'business'>('person');
  const [itin, setItin] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [addr1, setAddr1] = useState('');
  const [addr2, setAddr2] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    let cancelled = false;
    setEnv(null);
    setError(null);
    resolve<EntityData>('beauty_business_application_entity', {})
      .then((e) => {
        if (cancelled) return;
        if (isRedirect(e)) {
          const route = nativeRouteFor(e._links?.target?.screen);
          router.replace((route ?? '/(auth)/business-login') as any);
          return;
        }
        const a = e.data?.application;
        if (a) {
          setEntityType((a.entity_type === 'business' ? 'business' : 'person'));
          setFirstName(a.applicant_first_name ?? '');
          setLastName(a.applicant_last_name ?? '');
          setBusinessName(a.business_name ?? e.data?.business?.business_name ?? '');
          setAddr1(a.address_line1 ?? '');
          setAddr2(a.address_line2 ?? '');
          setCity(a.city ?? '');
          setStateCode(a.state ?? '');
          setPostalCode(a.postal_code ?? '');
        }
        setEnv(e);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load.');
      });
    return () => { cancelled = true; };
  }, [router]);

  const onContinue = useCallback(async () => {
    if (!env || env.action !== 'render' || !env.data) return;
    setError(null);

    if (entityType === 'business') {
      const digits = (itin || '').replace(/\D/g, '');
      if (digits.length !== 9) {
        setError('ITIN must be 9 digits.');
        return;
      }
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    let derivedBusinessName = businessName;
    if (entityType === 'person') {
      derivedBusinessName = `${firstName.trim()} ${lastName.trim()}`.trim();
    } else if (!businessName.trim()) {
      setError('Business name is required.');
      return;
    }

    setSubmitting(true);
    try {
      await patchApplicationStep(env.data.submit_href, 'entity', {
        entity_type: entityType,
        applicant_first_name: firstName,
        applicant_last_name: lastName,
        business_name: derivedBusinessName,
        address_line1: addr1,
        address_line2: addr2,
        city,
        state: stateCode,
        postal_code: postalCode,
        ...(itin ? { itin } : {}),
      });
      navigateLink(router, env._links?.next, { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not save this step.');
    } finally {
      setSubmitting(false);
    }
  }, [env, router, entityType, itin, firstName, lastName, businessName, addr1, addr2, city, stateCode, postalCode]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WizardLayout
        envelope={env}
        subtitle="A few details so customers can find and trust your business."
        onContinue={onContinue}
        continueDisabled={submitting}
        continueLoading={submitting}
        error={error}
      >
        <HeadedCard head="Are you applying as…">
          <ChoiceRow
            kind="radio"
            label="An individual / sole practitioner"
            sub="You'll work under your own name."
            selected={entityType === 'person'}
            onPress={() => setEntityType('person')}
            first
            testID="entity-type-person"
          />
          <ChoiceRow
            kind="radio"
            label="A registered business"
            sub="LLC, S-corp, or other registered entity."
            selected={entityType === 'business'}
            onPress={() => setEntityType('business')}
            testID="entity-type-business"
          />
        </HeadedCard>

        {entityType === 'business' && (
          <ProvCard padding={16}>
            <View style={styles.field}>
              <Text style={styles.label}>ITIN / EIN<Text style={styles.req}> *</Text></Text>
              <TextInput
                value={itin}
                onChangeText={setItin}
                placeholder="9 digits"
                placeholderTextColor={beautyTokens.textMuted}
                keyboardType="numeric"
                maxLength={11}
                style={[styles.input, styles.inputMono]}
              />
              <Text style={styles.micro}>
                Required when applying as a registered business. We mask this on display and store it encrypted.
              </Text>
            </View>
          </ProvCard>
        )}

        <ProvCard padding={16}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>FIRST NAME<Text style={styles.req}> *</Text></Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Maya"
                placeholderTextColor={beautyTokens.textMuted}
                autoComplete="given-name"
                style={styles.input}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>LAST NAME<Text style={styles.req}> *</Text></Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Rivera"
                placeholderTextColor={beautyTokens.textMuted}
                autoComplete="family-name"
                style={styles.input}
              />
            </View>
          </View>

          {entityType === 'business' && (
            <View style={styles.field}>
              <Text style={styles.label}>BUSINESS NAME<Text style={styles.req}> *</Text></Text>
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Your storefront's name"
                placeholderTextColor={beautyTokens.textMuted}
                style={styles.input}
              />
            </View>
          )}
        </ProvCard>

        <ProvCard padding={16}>
          <View style={styles.field}>
            <Text style={styles.label}>ADDRESS LINE 1</Text>
            <TextInput
              value={addr1}
              onChangeText={setAddr1}
              placeholder="Street address"
              placeholderTextColor={beautyTokens.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>ADDRESS LINE 2</Text>
            <TextInput
              value={addr2}
              onChangeText={setAddr2}
              placeholder="Suite, floor (optional)"
              placeholderTextColor={beautyTokens.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>CITY</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="San Francisco"
              placeholderTextColor={beautyTokens.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>STATE</Text>
              <TextInput
                value={stateCode}
                onChangeText={setStateCode}
                placeholder="CA"
                placeholderTextColor={beautyTokens.textMuted}
                autoCapitalize="characters"
                style={styles.input}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>ZIP</Text>
              <TextInput
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="94105"
                placeholderTextColor={beautyTokens.textMuted}
                keyboardType="numeric"
                style={[styles.input, styles.inputMono]}
              />
            </View>
          </View>
        </ProvCard>
      </WizardLayout>
    </>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  col: { flex: 1 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: beautyTokens.textMuted, marginBottom: 6, fontFamily: beautyTokens.fontBody },
  req: { color: beautyTokens.danger },
  input: {
    width: '100%', height: 44, paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: beautyTokens.line, borderRadius: 10,
    fontFamily: beautyTokens.fontBody, fontSize: 14, color: beautyTokens.text,
  },
  inputMono: { fontFamily: 'Menlo' },
  micro: { fontSize: 11, color: beautyTokens.textMuted, marginTop: 6, lineHeight: 16, fontFamily: beautyTokens.fontBody },
});
