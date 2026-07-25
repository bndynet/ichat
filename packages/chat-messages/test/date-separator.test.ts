import assert from 'node:assert/strict';
import {
  calendarDaysAgo,
  getDateSeparatorInfo,
  resolveDateSeparatorLabels,
  makeDaysAgo,
  DATE_SEPARATOR_LABELS_EN,
  DATE_SEPARATOR_LABELS_ZH_CN,
} from '../src/date-separator.js';
import type { DateSeparatorLabels } from '../src/types.js';

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

// ── calendarDaysAgo ────────────────────────────────────────────────────

test('calendarDaysAgo returns 0 for same day', () => {
  const now = new Date('2025-07-25T15:00:00Z');
  const ts = new Date('2025-07-25T09:00:00Z').getTime();
  assert.equal(calendarDaysAgo(ts, now), 0);
});

test('calendarDaysAgo returns 1 for yesterday', () => {
  const now = new Date('2025-07-25T15:00:00Z');
  const ts = new Date('2025-07-24T12:00:00Z').getTime();
  assert.equal(calendarDaysAgo(ts, now), 1);
});

test('calendarDaysAgo returns 2 for two days ago', () => {
  const now = new Date('2025-07-25T15:00:00Z');
  const ts = new Date('2025-07-23T12:00:00Z').getTime();
  assert.equal(calendarDaysAgo(ts, now), 2);
});

test('calendarDaysAgo returns 7 for a week ago', () => {
  const now = new Date('2025-07-25T15:00:00Z');
  const ts = new Date('2025-07-18T12:00:00Z').getTime();
  assert.equal(calendarDaysAgo(ts, now), 7);
});

test('calendarDaysAgo returns 8+ for older', () => {
  const now = new Date('2025-07-25T15:00:00Z');
  const ts = new Date('2025-07-17T12:00:00Z').getTime();
  assert.equal(calendarDaysAgo(ts, now), 8);
});

test('calendarDaysAgo uses current date when now not provided', () => {
  // Should not throw
  const ts = Date.now();
  const days = calendarDaysAgo(ts);
  assert.ok(days >= 0);
  assert.ok(Number.isFinite(days));
});

// ── getDateSeparatorInfo ───────────────────────────────────────────────

test('getDateSeparatorInfo returns today for same day', () => {
  const now = new Date('2025-07-25T15:00:00Z');
  const ts = new Date('2025-07-25T09:00:00Z').getTime();
  const info = getDateSeparatorInfo(ts, DATE_SEPARATOR_LABELS_EN, now);

  assert.equal(info.key, 'today');
  assert.equal(info.label, 'Today');
});

test('getDateSeparatorInfo returns yesterday', () => {
  const now = new Date('2025-07-25T15:00:00Z');
  const ts = new Date('2025-07-24T12:00:00Z').getTime();
  const info = getDateSeparatorInfo(ts, DATE_SEPARATOR_LABELS_EN, now);

  assert.equal(info.key, 'yesterday');
  assert.equal(info.label, 'Yesterday');
});

test('getDateSeparatorInfo returns days-ago for 2-7 days', () => {
  const now = new Date('2025-07-25T15:00:00Z');

  for (let days = 2; days <= 7; days++) {
    const ts = new Date(`2025-07-${String(25 - days).padStart(2, '0')}T12:00:00Z`).getTime();
    const info = getDateSeparatorInfo(ts, DATE_SEPARATOR_LABELS_EN, now);
    assert.equal(info.key, `days-${days}`);
    assert.equal(info.label, `${days} days ago`);
  }
});

test('getDateSeparatorInfo returns older for 8+ days', () => {
  const now = new Date('2025-07-25T15:00:00Z');
  const ts = new Date('2025-07-17T12:00:00Z').getTime();
  const info = getDateSeparatorInfo(ts, DATE_SEPARATOR_LABELS_EN, now);

  assert.equal(info.key, 'older');
  assert.equal(info.label, 'Older');
});

// ── Chinese locale ─────────────────────────────────────────────────────

test('getDateSeparatorInfo returns Chinese labels', () => {
  const now = new Date('2025-07-25T15:00:00Z');

  const today = new Date('2025-07-25T09:00:00Z').getTime();
  assert.equal(getDateSeparatorInfo(today, DATE_SEPARATOR_LABELS_ZH_CN, now).label, '今天');

  const yesterday = new Date('2025-07-24T12:00:00Z').getTime();
  assert.equal(getDateSeparatorInfo(yesterday, DATE_SEPARATOR_LABELS_ZH_CN, now).label, '昨天');

  const threeDaysAgo = new Date('2025-07-22T12:00:00Z').getTime();
  assert.equal(getDateSeparatorInfo(threeDaysAgo, DATE_SEPARATOR_LABELS_ZH_CN, now).label, '3天前');

  const older = new Date('2025-07-10T12:00:00Z').getTime();
  assert.equal(getDateSeparatorInfo(older, DATE_SEPARATOR_LABELS_ZH_CN, now).label, '更久以前');
});

// ── resolveDateSeparatorLabels ─────────────────────────────────────────

test('resolveDateSeparatorLabels returns English defaults for en locale', () => {
  const labels = resolveDateSeparatorLabels({ locale: 'en' });
  assert.equal(labels.today, 'Today');
  assert.equal(labels.yesterday, 'Yesterday');
});

test('resolveDateSeparatorLabels returns Chinese for zh locale', () => {
  const labels = resolveDateSeparatorLabels({ locale: 'zh-CN' });
  assert.equal(labels.today, '今天');
  assert.equal(labels.yesterday, '昨天');
});

test('resolveDateSeparatorLabels returns Chinese for zh-Hans', () => {
  const labels = resolveDateSeparatorLabels({ locale: 'zh-Hans' });
  assert.equal(labels.today, '今天');
});

test('resolveDateSeparatorLabels allows label override', () => {
  const labels = resolveDateSeparatorLabels({
    locale: 'en',
    labels: { today: 'TODAY!!' },
  });
  assert.equal(labels.today, 'TODAY!!');
  assert.equal(labels.yesterday, 'Yesterday'); // unchanged
});

test('resolveDateSeparatorLabels allows full override', () => {
  const custom: Partial<DateSeparatorLabels> = {
    today: 'Hoy',
    yesterday: 'Ayer',
    daysAgo: (n: number) => `Hace ${n} días`,
    older: 'Más antiguo',
  };
  const labels = resolveDateSeparatorLabels({ labels: custom });
  assert.equal(labels.today, 'Hoy');
  assert.equal(labels.yesterday, 'Ayer');
  assert.equal(labels.daysAgo(3), 'Hace 3 días');
  assert.equal(labels.older, 'Más antiguo');
});

test('resolveDateSeparatorLabels partial override merges with defaults', () => {
  const labels = resolveDateSeparatorLabels({
    locale: 'en',
    labels: { today: 'Custom Today' },
  });
  assert.equal(labels.today, 'Custom Today');
  assert.equal(labels.yesterday, 'Yesterday');
  assert.equal(labels.daysAgo(5), '5 days ago');
});

// ── makeDaysAgo (plural-aware) ─────────────────────────────────────────

test('makeDaysAgo returns correct form for plural categories', () => {
  // English: 'one' maps to 1, 'other' maps to everything else
  const enDaysAgo = makeDaysAgo('en', {
    one: (n) => `${n} day ago`,
    other: (n) => `${n} days ago`,
  });

  assert.equal(enDaysAgo(1), '1 day ago');
  assert.equal(enDaysAgo(2), '2 days ago');
  assert.equal(enDaysAgo(0), '0 days ago');
});

test('makeDaysAgo falls back to other when category not provided', () => {
  const daysAgo = makeDaysAgo('en', {
    other: (n) => `${n} days`,
  });

  assert.equal(daysAgo(1), '1 days'); // fallback to 'other'
  assert.equal(daysAgo(5), '5 days');
});

test('makeDaysAgo works with non-standard locale', () => {
  // Should not throw even with unknown locale
  const daysAgo = makeDaysAgo('xx-YY', {
    other: (n) => `${n}d`,
  });
  assert.equal(daysAgo(3), '3d');
});
