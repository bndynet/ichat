import { getDateSeparatorInfo } from './date-separator.js';
import type { ChatMessage, DateSeparatorLabels } from './types.js';

export type MessageRenderItem =
  | { kind: 'sep'; key: string; label: string }
  | { kind: 'msg'; key: string; message: ChatMessage };

/** Build the ordered list consumed by both the regular and virtual renderers. */
export function buildMessageRenderItems(
  messages: readonly ChatMessage[],
  labels: DateSeparatorLabels,
  fallbackTimestamp = Date.now(),
): MessageRenderItem[] {
  const items: MessageRenderItem[] = [];
  const onlyToday =
    messages.length > 0 &&
    messages.every((message) =>
      getDateSeparatorInfo(message.timestamp ?? fallbackTimestamp, labels).key === 'today');
  let previousBucket: string | undefined;

  for (const message of messages) {
    const { key, label } = getDateSeparatorInfo(
      message.timestamp ?? fallbackTimestamp,
      labels,
    );
    if (previousBucket === undefined || key !== previousBucket) {
      if (!(onlyToday && key === 'today')) {
        items.push({ kind: 'sep', key: `sep-${message.id}`, label });
      }
      previousBucket = key;
    }
    items.push({ kind: 'msg', key: message.id, message });
  }

  return items;
}

export function findMessageRenderIndex(
  items: readonly MessageRenderItem[],
  messageId: string,
): number {
  return items.findIndex(
    (item) => item.kind === 'msg' && item.message.id === messageId,
  );
}

export function findPartRenderIndex(
  items: readonly MessageRenderItem[],
  partId: string,
): number {
  return items.findIndex(
    (item) =>
      item.kind === 'msg' &&
      (item.message.parts ?? []).some((part) => part.id === partId),
  );
}
