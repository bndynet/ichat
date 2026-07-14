import type MarkdownIt from 'markdown-it';
import type { RenderRule } from 'markdown-it/lib/renderer.mjs';
import type Token from 'markdown-it/lib/token.mjs';
import type { TaskStatus } from '../types.js';
import { chatIconStrings } from '../icons.js';

// ── Status types & constants ────────────────────────────────────────

/** Status vocabulary for ordered progress steps. */
export type ProgressStatus = TaskStatus;

const STATUS_RE = /^\[(done|complete|active|current|error|fail|pending|wait|skip|skipped)\]\s*/i;

const STATUS_ALIAS: Record<string, ProgressStatus> = {
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

const ICONS: Record<ProgressStatus, string> = {
  done: chatIconStrings.progressDone,
  active: '',
  error: chatIconStrings.progressError,
  pending: '',
  skipped: chatIconStrings.progressSkipped,
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

export function progressPlugin(md: MarkdownIt): void {
  // --- Pre-pass: extract <!-- bid:xxx --> paragraphs -----------------
  md.core.ruler.push('progress_bid', (state) => {
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
  md.core.ruler.push('progress', (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'ordered_list_open') continue;

      const closeIdx = findClose(tokens, i, 'ordered_list_open', 'ordered_list_close');
      if (closeIdx === -1) continue;

      let hasProgress = false;
      let stepIdx = 0;

      let j = i + 1;
      while (j < closeIdx) {
        if (tokens[j].type !== 'list_item_open') {
          j++;
          continue;
        }

        const liClose = findClose(tokens, j, 'list_item_open', 'list_item_close');
        if (liClose === -1) break;

        let status: ProgressStatus = 'pending';
        for (let k = j + 1; k < liClose; k++) {
          if (tokens[k].type !== 'inline') continue;
          const match = STATUS_RE.exec(tokens[k].content);
          if (match) {
            hasProgress = true;
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

        tokens[j].meta = { ...tokens[j].meta, progress: true, progressStep: stepIdx, progressStatus: status };
        tokens[liClose].meta = { ...tokens[liClose].meta, progress: true };
        stepIdx++;
        j = liClose + 1;
      }
      if (hasProgress || tokens[i].meta?.bid) {
        tokens[i].meta = { ...tokens[i].meta, progress: true, stepCount: stepIdx };
        tokens[closeIdx].meta = { ...tokens[closeIdx].meta, progress: true };
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
    if (tokens[idx].meta?.progress) {
      const count = tokens[idx].meta.stepCount ?? 0;
      const bid: string | undefined = tokens[idx].meta.bid;
      const bidAttr = bid ? ` data-bid="${md.utils.escapeHtml(bid)}"` : '';
      return `<div class="chat-progress"${bidAttr} data-progress-steps="${count}">\n`;
    }
    return (origOlOpen ?? fallback)(tokens, idx, options, env, self);
  };

  md.renderer.rules.ordered_list_close = (tokens, idx, options, env, self) => {
    if (tokens[idx].meta?.progress) {
      return '</div>\n';
    }
    return (origOlClose ?? fallback)(tokens, idx, options, env, self);
  };

  md.renderer.rules.list_item_open = (tokens, idx, options, env, self) => {
    const meta = tokens[idx].meta;
    if (meta?.progress) {
      const step: number = meta.progressStep ?? 0;
      const status: ProgressStatus = meta.progressStatus ?? 'pending';
      const icon = ICONS[status] ?? '';
      return (
        `<div class="chat-progress-step chat-progress-step--${status}" data-step="${step}" data-status="${status}">\n` +
        `<div class="chat-progress-indicator">${icon}</div>\n` +
        `<div class="chat-progress-content">\n`
      );
    }
    return (origLiOpen ?? fallback)(tokens, idx, options, env, self);
  };

  md.renderer.rules.list_item_close = (tokens, idx, options, env, self) => {
    if (tokens[idx].meta?.progress) {
      return '</div>\n</div>\n';
    }
    return (origLiClose ?? fallback)(tokens, idx, options, env, self);
  };
}

// ── Runtime status-update utility ───────────────────────────────────

/**
 * Programmatically update a progress step's status after render.
 *
 * @param root   - The container that holds the `.chat-progress` element
 *                 (e.g. a shadow root, or the progress div itself).
 * @param step   - One-based step number.
 * @param status - The new status to apply.
 * @param bid    - Optional block id to scope the lookup when a message
 *                 contains multiple progress blocks.
 * @returns `true` if the step was found and updated.
 *
 * @example
 * ```ts
 * // Single progress block per message
 * chatEl.updateProgressStep('msg-1', 1, 'done');
 *
 * // Multiple progress blocks — use bid to target the right one
 * chatEl.updateProgressStep('msg-1', 1, 'done', 'build');
 * chatEl.updateProgressStep('msg-1', 2, 'active', 'deploy');
 * ```
 */
export function updateProgressStepStatus(
  root: Element | ShadowRoot | Document,
  step: number,
  status: ProgressStatus,
  bid?: string,
): boolean {
  if (!Number.isInteger(step) || step < 1) return false;
  const stepIndex = step - 1;
  console.debug(`updating progress ${bid ? `[bid:${bid}]` : ''} step ${step} to ${status}`);
  const progress = bid
    ? root.querySelector(`.chat-progress[data-bid="${CSS.escape(bid)}"]`)
    : root.querySelector('.chat-progress');
  if (!progress) return false;
  const scope: Element = progress;

  const item = scope.querySelector(
    `[data-step="${stepIndex}"]`,
  ) as HTMLElement | null;
  if (!item) return false;

  for (const cls of Array.from(item.classList)) {
    if (cls.startsWith('chat-progress-step--')) {
      item.classList.remove(cls);
    }
  }
  item.classList.add(`chat-progress-step--${status}`);
  item.setAttribute('data-status', status);

  const marker = item.querySelector('.chat-progress-indicator');
  if (marker) {
    marker.innerHTML = ICONS[status] ?? '';
  }

  console.debug(`updated progress ${bid ? `[bid:${bid}]` : ''} step ${step} to ${status}`);

  return true;
}
