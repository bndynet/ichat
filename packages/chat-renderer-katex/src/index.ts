/**
 * @bndynet/ichat-renderer-katex
 *
 * KaTeX math rendering for iChat. Auto-registers a markdown-it-katex plugin
 * on import so `$...$` (inline) and `$$...$$` (display) LaTeX math renders
 * inside chat messages.
 *
 * Usage:
 *   import '@bndynet/ichat-renderer-katex';
 *
 * Must be imported before the first `<i-chat>` or `<i-chat-messages>` element
 * connects to the DOM.
 */

import { registerMarkdownPlugin } from '@bndynet/ichat-messages';
import mk from 'markdown-it-katex';

// ── KaTeX font CDN (matches the katex npm dependency version) ────────────

const KATEX_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/fonts';

const KATEX_FONTS = `
@font-face {
  font-family: KaTeX_Main;
  src: url(${KATEX_CDN}/KaTeX_Main-Regular.woff2) format('woff2');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_Main;
  src: url(${KATEX_CDN}/KaTeX_Main-Bold.woff2) format('woff2');
  font-weight: bold;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_Main;
  src: url(${KATEX_CDN}/KaTeX_Main-Italic.woff2) format('woff2');
  font-weight: normal;
  font-style: italic;
}
@font-face {
  font-family: KaTeX_Math;
  src: url(${KATEX_CDN}/KaTeX_Math-Italic.woff2) format('woff2');
  font-weight: normal;
  font-style: italic;
}
@font-face {
  font-family: KaTeX_AMS;
  src: url(${KATEX_CDN}/KaTeX_AMS-Regular.woff2) format('woff2');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_Caligraphic;
  src: url(${KATEX_CDN}/KaTeX_Caligraphic-Bold.woff2) format('woff2');
  font-weight: bold;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_Caligraphic;
  src: url(${KATEX_CDN}/KaTeX_Caligraphic-Regular.woff2) format('woff2');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_Fraktur;
  src: url(${KATEX_CDN}/KaTeX_Fraktur-Bold.woff2) format('woff2');
  font-weight: bold;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_Fraktur;
  src: url(${KATEX_CDN}/KaTeX_Fraktur-Regular.woff2) format('woff2');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_SansSerif;
  src: url(${KATEX_CDN}/KaTeX_SansSerif-Bold.woff2) format('woff2');
  font-weight: bold;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_SansSerif;
  src: url(${KATEX_CDN}/KaTeX_SansSerif-Italic.woff2) format('woff2');
  font-weight: normal;
  font-style: italic;
}
@font-face {
  font-family: KaTeX_SansSerif;
  src: url(${KATEX_CDN}/KaTeX_SansSerif-Regular.woff2) format('woff2');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_Script;
  src: url(${KATEX_CDN}/KaTeX_Script-Regular.woff2) format('woff2');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_Size1;
  src: url(${KATEX_CDN}/KaTeX_Size1-Regular.woff2) format('woff2');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_Size2;
  src: url(${KATEX_CDN}/KaTeX_Size2-Regular.woff2) format('woff2');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_Size3;
  src: url(${KATEX_CDN}/KaTeX_Size3-Regular.woff2) format('woff2');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_Size4;
  src: url(${KATEX_CDN}/KaTeX_Size4-Regular.woff2) format('woff2');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: KaTeX_Typewriter;
  src: url(${KATEX_CDN}/KaTeX_Typewriter-Regular.woff2) format('woff2');
  font-weight: normal;
  font-style: normal;
}
`;

// ── Chat-friendly KaTeX overrides ────────────────────────────────────────

const KATEX_STYLES = `
.katex { font-size: 1.1em; }
.katex .katex-html { max-width: 100%; overflow: hidden; }
.katex .hide-tail { overflow: hidden; position: relative; display: inline-block; width: 100%; }
.katex-display { margin: 1em 0; overflow-x: auto; overflow-y: hidden; }
.katex-display > .katex { max-width: 100%; display: inline-block; }
`;

// ── Register ─────────────────────────────────────────────────────────────

registerMarkdownPlugin({
  id: 'latex',
  install: mk,
  styles: KATEX_STYLES,
  globalStyles: KATEX_FONTS,
});
