import { md } from '@bndynet/ichat-messages';
import type { ChatPlugin } from '../middleware/chat-plugin.js';
import type { Chat } from '../components/chat.js';

// ── Inline SVG icons (avoid external icon dependency) ──────────────────────

const COPY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

const CHECK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

// ── CSS injected once ─────────────────────────────────────────────────────

const STYLE_ID = 'ichat-code-copy-styles';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ichat-code-block {
      position: relative;
      margin: 0.5em 0;
    }
    .ichat-code-copy-btn {
      position: absolute;
      top: 6px;
      right: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      font-size: 12px;
      line-height: 1;
      color: inherit;
      background: rgba(128, 128, 128, 0.15);
      border: 1px solid rgba(128, 128, 128, 0.25);
      border-radius: 4px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .ichat-code-block:hover .ichat-code-copy-btn,
    .ichat-code-copy-btn:focus-visible {
      opacity: 1;
    }
    .ichat-code-copy-btn:hover {
      background: rgba(128, 128, 128, 0.25);
    }
    .ichat-code-copy-btn.copied {
      color: #16a34a;
      border-color: #16a34a;
    }
  `;
  document.head.appendChild(style);
}

// ── markdown-it plugin ────────────────────────────────────────────────────

function codeCopyMdPlugin(mdInstance: typeof md): void {
  const defaultFence = mdInstance.renderer.rules.fence!;

  mdInstance.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const lang = token.info.trim().split(/\s+/)[0] || '';

    // Render the highlighted code block
    const highlighted = defaultFence(tokens, idx, options, env, self);

    // Encode for safe data attribute storage
    const encoded = encodeURIComponent(token.content);

    return (
      `<div class="ichat-code-block">` +
      `<button class="ichat-code-copy-btn" data-code="${encoded}" data-lang="${mdInstance.utils.escapeHtml(lang)}" title="Copy code">` +
      `${COPY_ICON}<span>Copy</span>` +
      `</button>` +
      highlighted +
      `</div>`
    );
  };
}

// ── ChatPlugin ────────────────────────────────────────────────────────────

/**
 * Adds a copy-to-clipboard button to every fenced code block in rendered
 * markdown.  Clicking the button copies the raw code and shows a brief
 * "Copied!" confirmation.
 *
 * @example
 * ```ts
 * import { codeCopyPlugin } from '@bndynet/ichat';
 * chat.use(codeCopyPlugin);
 * ```
 */
export const codeCopyPlugin: ChatPlugin = {
  name: 'code-copy',
  version: '1.0.0',

  install(chat: Chat): () => void {
    injectStyles();
    md.use(codeCopyMdPlugin);

    const handleClick = (e: Event): void => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ichat-code-copy-btn');
      if (!btn) return;

      e.preventDefault();
      const code = decodeURIComponent(btn.getAttribute('data-code') || '');
      navigator.clipboard.writeText(code).then(() => {
        btn.classList.add('copied');
        const span = btn.querySelector('span');
        if (span) span.textContent = 'Copied!';
        btn.innerHTML = `${CHECK_ICON}<span>Copied!</span>`;

        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = `${COPY_ICON}<span>Copy</span>`;
        }, 2000);
      }).catch(() => {
        // Clipboard API failed — silently ignore
      });
    };

    chat.addEventListener('click', handleClick);

    return () => {
      chat.removeEventListener('click', handleClick);
    };
  },
};
