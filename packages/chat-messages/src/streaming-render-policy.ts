const KIB = 1024;
const FRAME_MS = 1000 / 60;

/**
 * Coalesce expensive full-tree Markdown replacements as the visible response
 * grows. Small responses stay at display refresh rate; only unusually large
 * responses trade visual cadence for main-thread headroom.
 */
export function streamingRenderIntervalMs(contentLength: number): number {
  if (contentLength <= 12 * KIB) return 0;
  if (contentLength <= 32 * KIB) return FRAME_MS * 2;
  return 100;
}

/** Remaining time before the next streaming DOM update may run. */
export function streamingRenderDelayMs(
  contentLength: number,
  now: number,
  lastRenderedAt: number,
): number {
  const interval = streamingRenderIntervalMs(contentLength);
  if (interval === 0 || !Number.isFinite(lastRenderedAt)) return 0;
  return Math.max(0, interval - (now - lastRenderedAt));
}
