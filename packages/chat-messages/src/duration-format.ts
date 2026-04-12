/**
 * Localized assistant streaming duration (footer next to timestamp).
 * - Under 1 minute: `Intl.NumberFormat` with `unit: "second"` (fractional seconds).
 * - One minute and above: `Intl.DurationFormat` when available; else English fallback.
 */

function fallbackEnglish(ms: number): string {
  if (ms < 1000) return '< 1s';
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/** Narrow typing without requiring `Intl.DurationFormat` in TS lib (ES2024). */
type DurationFormatCtor = new (
  locales?: string | string[],
  options?: { style?: 'long' | 'short' | 'narrow' | 'digital' }
) => { format(duration: Record<string, number>): string };

function getDurationFormat(): DurationFormatCtor | undefined {
  if (typeof Intl === 'undefined') return undefined;
  const idf = (Intl as typeof Intl & { DurationFormat?: DurationFormatCtor }).DurationFormat;
  return typeof idf === 'function' ? idf : undefined;
}

/**
 * @param locale - BCP 47 tag; `undefined` uses the runtime default locale.
 */
export function formatAssistantDurationMs(ms: number, locale: string | undefined): string {
  let n = ms;
  if (n < 0) n = 0;

  // Under 1 minute: unit formatter (handles decimals like 45.2s / localized 秒)
  if (n < 60_000) {
    try {
      const sec = n / 1000;
      return new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'second',
        unitDisplay: 'narrow',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(sec);
    } catch {
      return fallbackEnglish(n);
    }
  }

  const DurationFormat = getDurationFormat();
  if (DurationFormat) {
    try {
      const totalSec = Math.round(n / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      const df = new DurationFormat(locale, { style: 'narrow' });
      if (secs === 0) return df.format({ minutes: mins });
      return df.format({ minutes: mins, seconds: secs });
    } catch {
      /* use fallback */
    }
  }

  return fallbackEnglish(n);
}
