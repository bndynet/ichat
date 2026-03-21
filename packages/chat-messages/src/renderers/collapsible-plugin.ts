import type MarkdownIt from 'markdown-it';
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs';

/**
 * Matches the opening marker: `:::details` optionally followed by a title.
 * Supports optional leading whitespace and is case-insensitive.
 *
 * Examples:
 *   :::details
 *   :::details My Title
 *   :::Details 展开查看详情
 */
const OPEN_RE = /^:{3}\s*details\b(.*)?$/i;

/**
 * Matches the bare closing marker `:::` (possibly surrounded by whitespace).
 */
const CLOSE_RE = /^:{3}\s*$/;

/**
 * markdown-it plugin that adds a `:::details Title … :::` container syntax.
 *
 * The rendered output uses native `<details>/<summary>` elements so the
 * browser handles expand/collapse with no JavaScript required.
 *
 * Usage in markdown:
 * ```
 * :::details Optional title here
 * Any **markdown** content is supported inside.
 *
 * - lists
 * - code blocks
 * - nested headings
 * :::
 * ```
 *
 * Registers `collapsiblePlugin` as a block rule that runs before `fence`.
 */
export function collapsiblePlugin(md: MarkdownIt): void {
  function detailsRule(
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean,
  ): boolean {
    const lineStart = state.bMarks[startLine] + state.tShift[startLine];
    const lineEnd = state.eMarks[startLine];
    const lineText = state.src.slice(lineStart, lineEnd).trim();

    const openMatch = OPEN_RE.exec(lineText);
    if (!openMatch) return false;

    // In silent mode the caller only wants to know whether this rule matches.
    if (silent) return true;

    const title = (openMatch[1] ?? '').trim() || 'Details';

    // Scan forward to find the matching closing `:::`.
    let closeLine = startLine + 1;
    let found = false;
    while (closeLine < endLine) {
      const s = state.bMarks[closeLine] + state.tShift[closeLine];
      const e = state.eMarks[closeLine];
      if (CLOSE_RE.test(state.src.slice(s, e).trim())) {
        found = true;
        break;
      }
      closeLine++;
    }

    // Emit the open token.
    const openToken = state.push('chat_details_open', 'details', 1);
    openToken.meta = { title };
    openToken.map = [startLine, closeLine];
    openToken.block = true;

    // Recursively tokenize the content between the open and close markers.
    state.md.block.tokenize(state, startLine + 1, found ? closeLine : endLine);

    // Emit the close token.
    const closeToken = state.push('chat_details_close', 'details', -1);
    closeToken.block = true;

    // Advance past the closing marker (or to endLine if none was found).
    state.line = found ? closeLine + 1 : endLine;
    return true;
  }

  md.block.ruler.before('fence', 'chat_details', detailsRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });

  md.renderer.rules.chat_details_open = (tokens, idx): string => {
    const title = md.utils.escapeHtml(tokens[idx].meta?.title ?? 'Details');
    return (
      `<details class="chat-details">` +
      `<summary class="chat-details__summary">${title}</summary>` +
      `<div class="chat-details__body">\n`
    );
  };

  md.renderer.rules.chat_details_close = (): string =>
    `</div></details>\n`;
}
