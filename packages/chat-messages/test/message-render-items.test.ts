import assert from 'node:assert/strict';
import {
  buildMessageRenderItems,
  findMessageRenderIndex,
  findPartRenderIndex,
} from '../src/message-render-items.js';
import { DATE_SEPARATOR_LABELS_EN } from '../src/date-separator.js';
import { DEFAULT_CONFIG, type ChatMessage } from '../src/types.js';

function todayAt(hour: number): number {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.getTime();
}

function daysAgo(days: number): number {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date.getTime();
}

const todayMessages: ChatMessage[] = [
  { id: 'm-1', role: 'self', timestamp: todayAt(9), parts: [] },
  {
    id: 'm-2',
    role: 'assistant',
    timestamp: todayAt(10),
    parts: [{ id: 'part-2', type: 'text', text: 'hello' }],
  },
];

const todayItems = buildMessageRenderItems(
  todayMessages,
  DATE_SEPARATOR_LABELS_EN,
);
assert.deepEqual(todayItems.map((item) => item.key), ['m-1', 'm-2']);
assert.equal(findMessageRenderIndex(todayItems, 'm-2'), 1);
assert.equal(findPartRenderIndex(todayItems, 'part-2'), 1);

const mixedItems = buildMessageRenderItems(
  [
    { ...todayMessages[0], timestamp: daysAgo(1) },
    todayMessages[1],
  ],
  DATE_SEPARATOR_LABELS_EN,
);
assert.deepEqual(
  mixedItems.map((item) => item.kind),
  ['sep', 'msg', 'sep', 'msg'],
);
assert.equal(findMessageRenderIndex(mixedItems, 'm-2'), 3);
assert.equal(findMessageRenderIndex(mixedItems, 'missing'), -1);
assert.equal(findPartRenderIndex(mixedItems, 'missing'), -1);

// The first rollout must remain opt-in so existing DOM/state behaviour is the
// default for every consumer that does not touch ChatConfig.
assert.equal(DEFAULT_CONFIG.virtualScroll, false);
