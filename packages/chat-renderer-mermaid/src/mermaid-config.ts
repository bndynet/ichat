import type { MermaidConfig } from "mermaid";

/**
 * Official Mermaid theme names. All of them ship in the same Mermaid bundle —
 * selecting one is a runtime lookup, not a separate download.
 */
export const MERMAID_THEME_NAMES = [
  "default",
  "base",
  "dark",
  "forest",
  "neutral",
  "neo",
  "neo-dark",
  "redux",
  "redux-dark",
  "redux-color",
  "redux-dark-color",
] as const;

export type MermaidThemeName = (typeof MERMAID_THEME_NAMES)[number];

/**
 * Theme choice for the renderer:
 * - `auto` — default: `redux-dark` when the host is dark, otherwise `redux`
 *   (a single unified palette across diagram types)
 * - `base` — colors come from `--chat-mermaid-*` / `--chat-*` (opt-in)
 * - any official Mermaid theme name — complete official palette
 */
export type MermaidThemeOption = MermaidThemeName | "auto";

/**
 * Initial default: follow the host light/dark contract out of the box. Apps that
 * theme diagrams with `--chat-mermaid-*` opt into `base` instead.
 */
export const DEFAULT_MERMAID_THEME: MermaidThemeOption = "auto";

export function isMermaidThemeName(value: string): value is MermaidThemeName {
  return (MERMAID_THEME_NAMES as readonly string[]).includes(value);
}

/**
 * Layout and typography defaults. With the opt-in `theme: 'base'`, colors come
 * from `buildMermaidThemeVariables()` in `mermaid-theme-tokens.ts` at render
 * time; official themes (including the default `auto`) provide their own palettes.
 */
export const DEFAULT_MERMAID_CONFIG: MermaidConfig = {
  startOnLoad: false,
  securityLevel: "strict",

  fontSize: 13,

  themeVariables: {
    fontSize: "13px",
  },

  // Flowchart / Graph
  flowchart: {
    padding: 10,
    nodeSpacing: 24,
    rankSpacing: 28,
    diagramPadding: 4,
    curve: "basis",
  },

  // Sequence
  sequence: {
    height: 36,
  },
};
