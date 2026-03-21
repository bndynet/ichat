import type MarkdownIt from 'markdown-it';
import type { RenderRule } from 'markdown-it/lib/renderer.mjs';
import type Token from 'markdown-it/lib/token.mjs';

// ── Status types & constants ────────────────────────────────────────

export type TimelineStatus = 'done' | 'active' | 'error' | 'pending' | 'skipped';

const STATUS_RE = /^\[(done|complete|active|current|error|fail|pending|wait|skip|skipped)\]\s*/i;

const STATUS_ALIAS: Record<string, TimelineStatus> = {
  done: 'done',
  complete: 'done',
  active: 'active',
  current: 'active',
  error: 'error',
  fail: 'error',
  pending: 'pending',
  wait: 'pending',
  skip: 'skipped',
  skipped: 'skipped',
};

const ICONS: Record<TimelineStatus, string> = {
  done: '<svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5L6.5 11.5L12.5 4.5"/></svg>',
  active: '',
  error: '<svg viewBox="0 0 16 16" width="8" height="8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4 4L12 12M12 4L4 12"/></svg>',
  pending: '',
  skipped: '<svg viewBox="0 0 16 16" width="8" height="8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4 8H12"/></svg>',
};

// ── Helpers ──────────────────────────────────────────────────────────

function findClose(
  tokens: Token[],
  start: number,
  openType: string,
  closeType: string,
): number {
  let depth = 0;
  for (let j = start + 1; j < tokens.length; j++) {
    if (tokens[j].type === openType) depth++;
    if (tokens[j].type === closeType) {
      if (depth === 0) return j;
      depth--;
    }
  }
  return -1;
}

// ── bid comment regex (matches <!-- bid:xxx --> as literal text) ────

const BID_RE = /^<!--\s*bid:(\S+)\s*-->$/;

// ── Plugin ──────────────────────────────────────────────────────────

export function timelinePlugin(md: MarkdownIt): void {
  // --- Pre-pass: extract <!-- bid:xxx --> paragraphs -----------------
  md.core.ruler.push('timeline_bid', (state) => {
    const tokens = state.tokens;
    const removals = new Set<number>();

    for (let i = 0; i < tokens.length - 2; i++) {
      if (tokens[i].type !== 'paragraph_open') continue;
      if (tokens[i + 1].type !== 'inline') continue;
      if (tokens[i + 2].type !== 'paragraph_close') continue;

      const match = BID_RE.exec(tokens[i + 1].content.trim());
      if (!match) continue;

      const bid = match[1];

      for (let j = i + 3; j < tokens.length; j++) {
        if (tokens[j].type === 'ordered_list_open') {
          tokens[j].meta = { ...tokens[j].meta, bid };
          break;
        }
        if (
          tokens[j].type !== 'paragraph_open' &&
          tokens[j].type !== 'inline' &&
          tokens[j].type !== 'paragraph_close'
        ) break;
      }

      removals.add(i);
      removals.add(i + 1);
      removals.add(i + 2);
    }

    if (removals.size > 0) {
      state.tokens = tokens.filter((_, idx) => !removals.has(idx));
    }
  });

  // --- Core rule: detect [status] markers and annotate tokens --------
  md.core.ruler.push('timeline', (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'ordered_list_open') continue;

      const closeIdx = findClose(tokens, i, 'ordered_list_open', 'ordered_list_close');
      if (closeIdx === -1) continue;

      let hasTimeline = false;
      let stepIdx = 0;

      let j = i + 1;
      while (j < closeIdx) {
        if (tokens[j].type !== 'list_item_open') {
          j++;
          continue;
        }

        const liClose = findClose(tokens, j, 'list_item_open', 'list_item_close');
        if (liClose === -1) break;

        let status: TimelineStatus = 'pending';
        for (let k = j + 1; k < liClose; k++) {
          if (tokens[k].type !== 'inline') continue;
          const match = STATUS_RE.exec(tokens[k].content);
          if (match) {
            hasTimeline = true;
            status = STATUS_ALIAS[match[1].toLowerCase()] ?? 'pending';
            tokens[k].content = tokens[k].content.slice(match[0].length);
            if (tokens[k].children?.length) {
              const first = tokens[k].children![0];
              if (first.type === 'text') {
                const cm = STATUS_RE.exec(first.content);
                if (cm) first.content = first.content.slice(cm[0].length);
              }
            }
          }
          break;
        }

        tokens[j].meta = { ...tokens[j].meta, timeline: true, timelineStep: stepIdx, timelineStatus: status };
        tokens[liClose].meta = { ...tokens[liClose].meta, timeline: true };
        stepIdx++;
        j = liClose + 1;
      }
      if (hasTimeline || tokens[i].meta?.bid) {
        tokens[i].meta = { ...tokens[i].meta, timeline: true, stepCount: stepIdx };
        tokens[closeIdx].meta = { ...tokens[closeIdx].meta, timeline: true };
      }
    }
  });

  // --- Renderer overrides --------------------------------------------
  const fallback: RenderRule = (_tokens, idx, options, _env, self) =>
    self.renderToken(_tokens, idx, options);

  const origOlOpen = md.renderer.rules.ordered_list_open;
  const origOlClose = md.renderer.rules.ordered_list_close;
  const origLiOpen = md.renderer.rules.list_item_open;
  const origLiClose = md.renderer.rules.list_item_close;

  md.renderer.rules.ordered_list_open = (tokens, idx, options, env, self) => {
    if (tokens[idx].meta?.timeline) {
      const count = tokens[idx].meta.stepCount ?? 0;
      const bid: string | undefined = tokens[idx].meta.bid;
      const bidAttr = bid ? ` data-bid="${md.utils.escapeHtml(bid)}"` : '';
      return `<div class="chat-timeline"${bidAttr} data-timeline-steps="${count}">\n`;
    }
    return (origOlOpen ?? fallback)(tokens, idx, options, env, self);
  };

  md.renderer.rules.ordered_list_close = (tokens, idx, options, env, self) => {
    if (tokens[idx].meta?.timeline) {
      return '</div>\n';
    }
    return (origOlClose ?? fallback)(tokens, idx, options, env, self);
  };

  md.renderer.rules.list_item_open = (tokens, idx, options, env, self) => {
    const meta = tokens[idx].meta;
    if (meta?.timeline) {
      const step: number = meta.timelineStep ?? 0;
      const status: TimelineStatus = meta.timelineStatus ?? 'pending';
      const icon = ICONS[status] ?? '';
      return (
        `<div class="chat-timeline-step chat-timeline-step--${status}" data-step="${step}" data-status="${status}">\n` +
        `<div class="chat-timeline-indicator">${icon}</div>\n` +
        `<div class="chat-timeline-content">\n`
      );
    }
    return (origLiOpen ?? fallback)(tokens, idx, options, env, self);
  };

  md.renderer.rules.list_item_close = (tokens, idx, options, env, self) => {
    if (tokens[idx].meta?.timeline) {
      return '</div>\n</div>\n';
    }
    return (origLiClose ?? fallback)(tokens, idx, options, env, self);
  };
}

// ── Runtime status-update utility ───────────────────────────────────

/**
 * Programmatically update a timeline step's status after render.
 *
 * @param root   - The container that holds the `.chat-timeline` element
 *                 (e.g. a shadow root, or the timeline div itself).
 * @param step   - Zero-based step index.
 * @param status - The new status to apply.
 * @param bid    - Optional block id to scope the lookup when a message
 *                 contains multiple timelines.
 * @returns `true` if the step was found and updated.
 *
 * @example
 * ```ts
 * // Single timeline per message
 * chatEl.updateTimeline('msg-1', 0, 'done');
 *
 * // Multiple timelines — use bid to target the right one
 * chatEl.updateTimeline('msg-1', 0, 'done', 'build');
 * chatEl.updateTimeline('msg-1', 1, 'active', 'deploy');
 * ```
 */
export function updateTimelineStatus(
  root: Element | ShadowRoot | Document,
  step: number,
  status: TimelineStatus,
  bid?: string,
): boolean {
  console.debug(`updating timeline ${bid ? `[bid:${bid}]` : ''} step ${step} to ${status}`);
  const timeline = bid
    ? root.querySelector(`.chat-timeline[data-bid="${CSS.escape(bid)}"]`)
    : root.querySelector('.chat-timeline');
  if (!timeline) return false;
  const scope: Element = timeline;

  const item = scope.querySelector(
    `[data-step="${step}"]`,
  ) as HTMLElement | null;
  if (!item) return false;

  for (const cls of Array.from(item.classList)) {
    if (cls.startsWith('chat-timeline-step--')) {
      item.classList.remove(cls);
    }
  }
  item.classList.add(`chat-timeline-step--${status}`);
  item.setAttribute('data-status', status);

  const marker = item.querySelector('.chat-timeline-indicator');
  if (marker) {
    marker.innerHTML = ICONS[status] ?? '';
  }

  console.debug(`updated timeline ${bid ? `[bid:${bid}]` : ''} step ${step} to ${status}`);

  return true;
}
