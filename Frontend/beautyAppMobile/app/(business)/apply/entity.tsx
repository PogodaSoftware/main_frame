/**
 * Apply wizard step 1 — Entity & applicant identity.
 * BFF: `beauty_business_application_entity`. PATCH `data.submit_href`
 * with `{ step: 'entity', entity_type, applicant_first_name, ... }`
 * then navigate `_links.next`.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SizableText, XStack, YStack } from 'tamagui';

import { resolve } from '@/services/bff';
import { isRedirect, type BffEnvelope } from '@/bff/types';
import { navigateLink, nativeRouteFor } from '@/bff/linkAction';
import { beautyTokens } from '../../../tamagui.config';
import {
  BeautyCard,
  BeautyInput,
} from '@/components/ui';
import { WizardLayout, type WizardData } from '@/components/business/WizardLayout';
import { patchApplicationStep } from '@/services/businessApply';

interface EntityApplication {
  entity_type: 'person' | 'business' | '';
  applicant_first_name: string;
  applicant_last_name: string;
  business_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  itin: string;
  itin_masked: string;
  has_itin: boolean;
}

interface EntityData extends WizardData {
  application: EntityApplication;
  submit_href: string;
  submit_method: string;
}

export default function ApplyEntityScreen() {
  const router = useRouter();
  const [env, setEnv] = useState<BffEnvelope<EntityData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [entityType, setEntityType] = useState<'person' | 'business' | ''>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [addr1, setAddr1] = useState('');
  const [addr2, setAddr2] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [itin, setItin] = useState('');

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
          setEntityType((a.entity_type as any) || '');
          setFirstName(a.applicant_first_name ?? '');
          setLastName(a.applicant_last_name ?? '');
          setBusinessName(a.business_name ?? '');
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
    return () => {
      cancelled = true;
    };
  }, []);

  const onContinue = useCallback(async () => {
    if (!env || env.action !== 'render' || !env.data) return;
    setSubmitting(true);
    setError(null);
    try {
      await patchApplicationStep(env.data.submit_href, 'entity', {
        entity_type: entityType,
        applicant_first_name: firstName,
        applicant_last_name: lastName,
        business_name: businessName,
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
  }, [
    env,
    router,
    entityType,
    firstName,
    lastName,
    businessName,
    addr1,
    addr2,
    city,
    stateCode,
    postalCode,
    itin,
  ]);

  const canContinue =
    Boolean(entityType) &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    businessName.trim().length > 0 &&
    addr1.trim().length > 0 &&
    city.trim().length > 0 &&
    stateCode.trim().length > 0 &&
    postalCode.trim().length > 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WizardLayout
        envelope={env}
        subtitle="Tell us who you are. The legal entity that will receive payouts."
        onContinue={onContinue}
        continueDisabled={!canContinue || submitting}
        continueLoading={submitting}
        error={error}
      >
        <BeautyCard testID="entity-type-card" header="Entity type">
          {(['person', 'business'] as const).map((value, idx) => {
            const on = entityType === value;
            return (
              <Pressable
                key={value}
                onPress={() => setEntityType(value)}
                testID={`entity-type-${value}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
              >
                <XStack
                  py={12}
                  gap={12}
                  items="flex-start"
                  borderTopWidth={idx === 0 ? 0 : 1}
                  borderTopColor={beautyTokens.line}
                >
                  <YStack
                    width={20}
                    height={20}
                    rounded={999}
                    borderWidth={1.8}
                    borderColor={on ? beautyTokens.text : beautyTokens.line}
                    items="center"
                    justify="center"
                    mt={1}
                  >
                    {on ? (
                      <YStack
                        width={10}
                        height={10}
                        rounded={999}
                        bg={beautyTokens.text}
                      />
                    ) : null}
                  </YStack>
                  <YStack flex={1}>
                    <SizableText
                      fontSize={14}
                      fontWeight={on ? '600' : '500'}
                      color={beautyTokens.text}
                    >
                      {value === 'person' ? 'Sole proprietor (person)' : 'Registered business'}
                    </SizableText>
                    <SizableText fontSize={12} color={beautyTokens.textMuted} mt={2}>
                      {value === 'person'
                        ? 'You receive payouts under your personal name + ITIN/SSN.'
                        : 'You receive payouts under a registered LLC, Inc, or DBA.'}
                    </SizableText>
                  </YStack>
                </XStack>
              </Pressable>
            );
          })}
        </BeautyCard>

        <BeautyCard testID="entity-applicant-card" header="Applicant name">
          <XStack gap={10}>
            <YStack flex={1}>
              <BeautyInput
                testID="entity-first-name"
                label="First name"
                required
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="given-name"
              />
            </YStack>
            <YStack flex={1}>
              <BeautyInput
                testID="entity-last-name"
                label="Last name"
                required
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
              />
            </YStack>
          </XStack>
        </BeautyCard>

        <BeautyCard testID="entity-business-card" header="Business name">
          <BeautyInput
            testID="entity-business-name"
            label="Business / DBA name"
            required
            value={businessName}
            onChangeText={setBusinessName}
            autoCapitalize="words"
          />
        </BeautyCard>

        <BeautyCard testID="entity-address-card" header="Business address">
          <BeautyInput
            testID="entity-addr1"
            label="Street address"
            required
            value={addr1}
            onChangeText={setAddr1}
          />
          <BeautyInput
            testID="entity-addr2"
            label="Apt / suite (optional)"
            value={addr2}
            onChangeText={setAddr2}
          />
          <XStack gap={10}>
            <YStack flex={2}>
              <BeautyInput
                testID="entity-city"
                label="City"
                required
                value={city}
                onChangeText={setCity}
              />
            </YStack>
            <YStack flex={1}>
              <BeautyInput
                testID="entity-state"
                label="State"
                required
                value={stateCode}
                onChangeText={setStateCode}
                autoCapitalize="characters"
                maxLength={2}
              />
            </YStack>
            <YStack flex={1}>
              <BeautyInput
                testID="entity-postal"
                label="ZIP"
                required
                value={postalCode}
                onChangeText={setPostalCode}
                keyboardType="number-pad"
                maxLength={10}
              />
            </YStack>
          </XStack>
        </BeautyCard>

        <BeautyCard testID="entity-itin-card" header="Tax ID (optional)">
          <BeautyInput
            testID="entity-itin"
            label={
              env?.action === 'render' && env.data?.application?.has_itin
                ? 'ITIN / SSN (on file)'
                : 'ITIN / SSN'
            }
            value={itin}
            onChangeText={setItin}
            placeholder={
              (env?.action === 'render' && env.data?.application?.itin_masked) ||
              '123-45-6789'
            }
            keyboardType="number-pad"
            monospace
            helperText="Stored encrypted. Leave blank to keep the masked value on file."
          />
        </BeautyCard>
      </WizardLayout>
    </>
  );
}
