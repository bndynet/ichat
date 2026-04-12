import type { DateSeparatorLabels } from './types.js';

function startOfLocalCalendarDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days between message time and `now` (non-negative; message in the past or same day). */
export function calendarDaysAgo(messageTs: number, now: Date = new Date()): number {
  const msgDay = startOfLocalCalendarDay(new Date(messageTs));
  const today = startOfLocalCalendarDay(now);
  return Math.round((today - msgDay) / 86400000);
}

export interface DateSeparatorInfo {
  /** Stable key for “same bucket” comparison */
  key: string;
  /** Short label shown on the divider */
  label: string;
}

/** English (default) */
export const DATE_SEPARATOR_LABELS_EN: DateSeparatorLabels = {
  today: 'Today',
  yesterday: 'Yesterday',
  daysAgo: (days: number) => `${days} days ago`,
  older: 'Older',
};

/** Simplified Chinese */
export const DATE_SEPARATOR_LABELS_ZH_CN: DateSeparatorLabels = {
  today: '今天',
  yesterday: '昨天',
  daysAgo: (days: number) => `${days}天前`,
  older: '更久以前',
};

function pickBuiltInLabels(locale: string): DateSeparatorLabels {
  const loc = locale.toLowerCase();
  if (loc === 'zh' || loc.startsWith('zh-')) return DATE_SEPARATOR_LABELS_ZH_CN;
  return DATE_SEPARATOR_LABELS_EN;
}

/**
 * Resolves final date-separator strings: built-ins from `locale`, then shallow merge of `labels`.
 */
export function resolveDateSeparatorLabels(options: {
  locale?: string;
  labels?: Partial<DateSeparatorLabels>;
}): DateSeparatorLabels {
  const base = pickBuiltInLabels(options.locale?.trim() || 'en');
  const o = options.labels;
  if (!o) return base;
  return {
    today: o.today ?? base.today,
    yesterday: o.yesterday ?? base.yesterday,
    daysAgo: o.daysAgo ?? base.daysAgo,
    older: o.older ?? base.older,
  };
}

/**
 * Maps a message timestamp to a separator bucket.
 * Buckets: today, yesterday, 2–7 calendar days ago, 8+ days (older).
 */
export function getDateSeparatorInfo(
  messageTs: number,
  labels: DateSeparatorLabels,
  now: Date = new Date()
): DateSeparatorInfo {
  const days = calendarDaysAgo(messageTs, now);
  if (days <= 0) return { key: 'today', label: labels.today };
  if (days === 1) return { key: 'yesterday', label: labels.yesterday };
  if (days >= 2 && days <= 7) return { key: `days-${days}`, label: labels.daysAgo(days) };
  return { key: 'older', label: labels.older };
}
