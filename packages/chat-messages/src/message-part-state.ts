import type { ChatMessage, MessagePart } from './types.js';
import type { PartLookupFailureReason } from './update-results.js';

export type MessagePartLookupFailureReason = Extract<
  PartLookupFailureReason,
  'message-not-found' | 'part-not-found'
>;

export type MessagePartLookupResult =
  | { ok: true; message: ChatMessage; part: MessagePart }
  | { ok: false; reason: MessagePartLookupFailureReason };

export type MessagePartReplaceResult =
  | { ok: true; messages: ChatMessage[]; part: MessagePart }
  | {
      ok: false;
      messages: ChatMessage[];
      reason: MessagePartLookupFailureReason;
    };

export type MessagePartPatchResult = MessagePartReplaceResult;

export function findMessagePart(
  messages: readonly ChatMessage[],
  messageId: string,
  partId: string
): MessagePartLookupResult {
  const message = messages.find((candidate) => candidate.id === messageId);
  if (!message) return { ok: false, reason: 'message-not-found' };

  const part = message.parts.find((candidate) => candidate.id === partId);
  if (!part) return { ok: false, reason: 'part-not-found' };

  return { ok: true, message, part };
}

export function appendMessagePart(
  messages: readonly ChatMessage[],
  messageId: string,
  part: MessagePart
): ChatMessage[] {
  let didAppend = false;
  const nextMessages = messages.map((message) => {
    if (message.id !== messageId) return message;
    didAppend = true;
    return { ...message, parts: [...message.parts, part] };
  });

  return didAppend ? nextMessages : [...messages];
}

export function replaceMessagePart(
  messages: readonly ChatMessage[],
  messageId: string,
  partId: string,
  nextPart: MessagePart
): MessagePartReplaceResult {
  const lookup = findMessagePart(messages, messageId, partId);
  if (!lookup.ok) {
    return { ok: false, messages: [...messages], reason: lookup.reason };
  }

  const nextMessages = messages.map((message) => {
    if (message.id !== messageId) return message;
    return {
      ...message,
      parts: message.parts.map((part) => (part.id === partId ? nextPart : part)),
    };
  });

  return { ok: true, messages: nextMessages, part: nextPart };
}

export function patchMessagePart(
  messages: readonly ChatMessage[],
  messageId: string,
  partId: string,
  patch: Partial<MessagePart>
): MessagePartPatchResult {
  const lookup = findMessagePart(messages, messageId, partId);
  if (!lookup.ok) {
    return { ok: false, messages: [...messages], reason: lookup.reason };
  }

  return replaceMessagePart(messages, messageId, partId, {
    ...lookup.part,
    ...patch,
  } as MessagePart);
}
