/**
 * Slot-picker form renderer for the beauty_book and beauty_reschedule
 * envelopes. Both expose a `data.form` shape with hidden fields + one
 * select whose options come from `compute_slots` on the backend.
 */
import React, { useState } from 'react';
import {
  Button,
  H4,
  ScrollView,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';

import { api } from '@/services/api';

export interface SlotOption {
  value: string;
  label: string;
}

export interface SlotPickerFormSpec {
  submit_method: 'POST' | 'PUT' | 'PATCH';
  submit_href: string;
  success_screen?: string;
  success_route_template?: string;
  submit_label: string;
  fields: Array<{
    name: string;
    type: 'hidden' | 'select' | string;
    label?: string;
    required?: boolean;
    value?: string | number;
    options?: SlotOption[];
  }>;
}

export interface SlotPickerFormProps {
  form: SlotPickerFormSpec;
  onSuccess: (responseBody: any) => void;
}

export function SlotPickerForm({ form, onSuccess }: SlotPickerFormProps) {
  const selectField = form.fields.find((f) => f.type === 'select');
  const hiddenFields = form.fields.filter((f) => f.type === 'hidden');
  const options: SlotOption[] = selectField?.options ?? [];

  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!selectField) return;
    if (!selected && selectField.required) {
      setError('Pick a time.');
      return;
    }
    setError(null);
    setPending(true);
    try {
      const body: Record<string, unknown> = {};
      for (const f of hiddenFields) body[f.name] = f.value;
      if (selectField) body[selectField.name] = selected;
      const resp = await api.request({
        url: form.submit_href,
        method: form.submit_method,
        data: body,
      });
      onSuccess(resp.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Submit failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <YStack gap="$3">
      {selectField ? <H4>{selectField.label ?? 'Pick a time'}</H4> : null}
      {options.length === 0 ? (
        <SizableText opacity={0.7}>No times available in the next 14 days.</SizableText>
      ) : null}
      <ScrollView height={400}>
        <YStack gap="$2">
          {options.map((opt) => {
            const active = opt.value === selected;
            return (
              <Button
                key={opt.value}
                size="$3"
                theme={active ? 'blue' : undefined}
                onPress={() => setSelected(opt.value)}
              >
                {opt.label}
              </Button>
            );
          })}
        </YStack>
      </ScrollView>
      {error ? <SizableText color="$red10">{error}</SizableText> : null}
      <XStack>
        <Button
          flex={1}
          theme="blue"
          disabled={pending || !selected}
          onPress={onSubmit}
        >
          {pending ? <Spinner /> : form.submit_label}
        </Button>
      </XStack>
    </YStack>
  );
}
