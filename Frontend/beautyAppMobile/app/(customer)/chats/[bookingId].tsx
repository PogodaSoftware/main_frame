import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  H3,
  Paragraph,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from 'tamagui';

import { resolve } from '@/services/bff';
import { dispatchLink, nativeRouteFor } from '@/bff/linkAction';
import { isRedirect, type BffEnvelope, type BffLink } from '@/bff/types';
import { beautyTokens } from '../../../tamagui.config';
import {
  BeautyButton,
  BeautyCard,
  BeautyInput,
  EmptyState,
  LoadingScreen,
} from '@/components/ui';

interface ChatMessage {
  id: number;
  booking_id: number;
  sender_type: 'customer' | 'business';
  sender_id: number;
  body: string;
  created_at: string;
}

interface ChatThreadData {
  booking_id: number;
  service_name: string;
  slot_at: string;
  slot_label: string;
  peer_name: string;
  viewer_type: 'customer' | 'business';
  is_active: boolean;
  expires_at: string;
  messages: ChatMessage[];
}

const POLL_INTERVAL_MS = 4000;

export default function ChatThreadScreen() {
  const router = useRouter();
  const { bookingId: bookingIdRaw } = useLocalSearchParams<{ bookingId: string }>();
  const bookingId = Number(bookingIdRaw);

  const [env, setEnv] = useState<BffEnvelope<ChatThreadData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<any>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(bookingId)) return;
    try {
      const e = await resolve<ChatThreadData>('beauty_chat_thread', { bookingId });
      if (isRedirect(e)) {
        const route = nativeRouteFor(e._links?.target?.screen);
        router.replace((route ?? '/(customer)/chats') as any);
        return;
      }
      setEnv(e);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load.');
    }
  }, [bookingId, router]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd?.({ animated: false });
  }, [env]);

  const sendLink: BffLink | undefined =
    env?.action === 'render' ? env._links?.send : undefined;

  const onSend = async () => {
    if (!sendLink || !draft.trim()) return;
    setSending(true);
    const result = await dispatchLink(sendLink, { body: draft.trim() });
    setSending(false);
    if (result.ok) {
      setDraft('');
      load();
    } else {
      setError('Send failed.');
    }
  };

  if (error && !env) {
    return (
      <YStack p="$4">
        <SizableText color="$red10" testID="chat-error">
          {error}
        </SizableText>
      </YStack>
    );
  }
  if (!env || env.action !== 'render' || !env.data) {
    return <LoadingScreen />;
  }

  const { messages, peer_name, service_name, slot_label, viewer_type, is_active } =
    env.data;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: peer_name }} />
      <YStack flex={1} bg="$background">
        <YStack p="$3">
          <BeautyCard
            testID="chat-info-card"
            header={
              <YStack gap="$1">
                <H3>{peer_name}</H3>
                <SizableText opacity={0.7}>
                  {service_name} · {slot_label}
                </SizableText>
              </YStack>
            }
          >
            {!is_active ? (
              <SizableText color={beautyTokens.warning} testID="chat-readonly">
                Chat closed (read-only).
              </SizableText>
            ) : (
              <SizableText opacity={0.6} fontSize={12}>
                Conversation open.
              </SizableText>
            )}
          </BeautyCard>
        </YStack>

        <ScrollView ref={scrollRef} flex={1} px="$3">
          <YStack gap="$2">
            {messages.length === 0 ? (
              <EmptyState testID="chat-empty" message="No messages yet." />
            ) : null}
            {messages.map((m) => {
              const mine = m.sender_type === viewer_type;
              return (
                <XStack
                  key={m.id}
                  justify={mine ? 'flex-end' : 'flex-start'}
                  testID={`chat-msg-${m.id}`}
                >
                  <YStack
                    maxW="80%"
                    p="$2"
                    px="$3"
                    rounded={14}
                    bg={mine ? beautyTokens.accentBlue : beautyTokens.white}
                    borderWidth={1}
                    borderColor={
                      mine ? beautyTokens.accentBlueDeep : beautyTokens.line
                    }
                    gap="$1"
                  >
                    <Paragraph
                      color={mine ? beautyTokens.accentBlueText : beautyTokens.text}
                    >
                      {m.body}
                    </Paragraph>
                    <SizableText
                      opacity={0.55}
                      fontSize={11}
                      color={mine ? beautyTokens.accentBlueText : beautyTokens.textMuted}
                    >
                      {new Date(m.created_at).toLocaleTimeString()}
                    </SizableText>
                  </YStack>
                </XStack>
              );
            })}
          </YStack>
        </ScrollView>

        {is_active && sendLink ? (
          <XStack
            p="$3"
            gap="$2"
            items="flex-end"
            borderTopWidth={1}
            borderTopColor={beautyTokens.line}
            bg={beautyTokens.white}
          >
            <YStack flex={1}>
              <BeautyInput
                testID="chat-composer-input"
                value={draft}
                onChangeText={setDraft}
                placeholder="Type a message"
                onSubmitEditing={onSend}
                returnKeyType="send"
              />
            </YStack>
            <BeautyButton
              testID="chat-send"
              variant="confirm"
              loading={sending}
              disabled={!draft.trim()}
              onPress={onSend}
            >
              {sendLink.prompt ?? 'Send'}
            </BeautyButton>
          </XStack>
        ) : null}
        {error ? (
          <SizableText color="$red10" p="$3" testID="chat-send-error">
            {error}
          </SizableText>
        ) : null}
      </YStack>
    </>
  );
}
