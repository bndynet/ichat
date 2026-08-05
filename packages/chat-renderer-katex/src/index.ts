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
 * May be imported at startup or lazy-loaded later. Runtime registration affects
 * subsequent markdown renders.
 */

import { registerMarkdownPlugin } from '@bndynet/ichat-messages';
import mk from 'markdown-it-katex';

// ── KaTeX version & CDN ──────────────────────────────────────────────────
// In production, tsup replaces __KATEX_VERSION__ with the actual version
// from the installed katex package.  In dev mode we fall back to a CDN URL
// using the version below — keep this in sync with the katex dependency in
// package.json.  The next build will automatically pick up the npm version.

declare const __KATEX_VERSION__: string | undefined;

const KATEX_VERSION = typeof __KATEX_VERSION__ !== 'undefined'
  ? __KATEX_VERSION__
  : '0.16.45'; // ← update when katex is upgraded

const KATEX_CDN = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/fonts`;

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

// ── Register (MathML output — browser-native rendering, no CSS table layout) ─

registerMarkdownPlugin({
  id: 'latex',
  install: (md) => { mk(md, { output: 'mathml' }); },
  styles: `.katex .katex-html[aria-hidden="true"] { display: none; }`,
  globalStyles: KATEX_FONTS,
});
