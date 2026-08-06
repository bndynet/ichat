/**
 * Resolves optional `--chat-mermaid-*` custom properties on `host` (typically
 * `<i-chat-mermaid>`), falling back to existing `--chat-*` tokens so apps need
 * not define Mermaid-specific variables unless they want diagram-only tweaks.
 */

function clampByte(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
}

function clampAlpha(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function formatAlpha(value: number): string {
  return String(Number(clampAlpha(value).toFixed(3)));
}

function parseCssChannel(value: string, scaleUnit = 255): number {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    return clampByte((Number.parseFloat(trimmed) / 100) * 255);
  }
  const n = Number.parseFloat(trimmed);
  return clampByte(scaleUnit === 1 ? n * 255 : n);
}

function parseCssAlpha(value: string): number {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    return clampAlpha(Number.parseFloat(trimmed) / 100);
  }
  return clampAlpha(Number.parseFloat(trimmed));
}

function formatRgbForMermaid(
  r: number,
  g: number,
  b: number,
  alpha = 1,
): string {
  const a = clampAlpha(alpha);
  if (a >= 1) return `rgb(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)})`;
  return `rgba(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)}, ${formatAlpha(a)})`;
}

function normalizeRgbColor(value: string): string {
  const match = /^rgba?\((.*)\)$/i.exec(value.trim());
  if (!match) return "";

  const body = match[1].trim();
  if (body.includes(",")) {
    const parts = body.split(",").map((part) => part.trim());
    if (parts.length < 3) return "";
    return formatRgbForMermaid(
      parseCssChannel(parts[0]),
      parseCssChannel(parts[1]),
      parseCssChannel(parts[2]),
      parts[3] == null ? 1 : parseCssAlpha(parts[3]),
    );
  }

  const [channelsPart, alphaPart] = body.split("/").map((part) => part.trim());
  const channels = channelsPart.split(/\s+/).filter(Boolean);
  if (channels.length < 3) return "";
  return formatRgbForMermaid(
    parseCssChannel(channels[0]),
    parseCssChannel(channels[1]),
    parseCssChannel(channels[2]),
    alphaPart == null || alphaPart === "" ? 1 : parseCssAlpha(alphaPart),
  );
}

function normalizeSrgbColor(value: string): string {
  const match = /^color\(\s*srgb\s+(.+)\)$/i.exec(value.trim());
  if (!match) return "";

  const [channelsPart, alphaPart] = match[1]
    .split("/")
    .map((part) => part.trim());
  const channels = channelsPart.split(/\s+/).filter(Boolean);
  if (channels.length < 3) return "";
  return formatRgbForMermaid(
    parseCssChannel(channels[0], 1),
    parseCssChannel(channels[1], 1),
    parseCssChannel(channels[2], 1),
    alphaPart == null || alphaPart === "" ? 1 : parseCssAlpha(alphaPart),
  );
}

function normalizeMermaidColor(host: Element, value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  if (
    typeof document === "undefined" ||
    typeof getComputedStyle === "undefined"
  ) {
    return raw;
  }

  const doc = host.ownerDocument ?? document;
  const probe = doc.createElement("span");
  probe.style.color = raw;
  probe.style.display = "none";
  if (!probe.style.color && !raw.toLowerCase().includes("var(")) return "";

  const root =
    typeof HTMLElement !== "undefined" &&
    host instanceof HTMLElement &&
    host.shadowRoot
      ? host.shadowRoot
      : host;
  root.appendChild(probe);
  const computed = getComputedStyle(probe).color.trim();
  probe.remove();

  return normalizeRgbColor(computed) || normalizeSrgbColor(computed) || "";
}

function firstResolvedColor(host: Element, cssVars: readonly string[]): string {
  const cs = getComputedStyle(host);
  for (const name of cssVars) {
    const v = cs.getPropertyValue(name).trim();
    if (!v) continue;
    const normalized = normalizeMermaidColor(host, v);
    if (normalized) return normalized;
  }
  return "";
}

/** Public CSS names hosts may set (documented in README). */
export const CHAT_MERMAID_TOKEN_NAMES = [
  "--chat-mermaid-background",
  "--chat-mermaid-text",
  "--chat-mermaid-text-secondary",
  "--chat-mermaid-line",
  "--chat-mermaid-node-fill",
  "--chat-mermaid-cluster-fill",
  "--chat-mermaid-main-fill",
  "--chat-mermaid-tertiary-fill",
  "--chat-mermaid-primary",
  "--chat-mermaid-primary-contrast",
  "--chat-mermaid-secondary-fill",
  "--chat-mermaid-note-fill",
  "--chat-mermaid-note-text",
  "--chat-mermaid-edge-label-bg",
] as const;

export type ChatMermaidTokenName = (typeof CHAT_MERMAID_TOKEN_NAMES)[number];

const BG = ["--chat-mermaid-background", "--chat-bg"] as const;
const TEXT = ["--chat-mermaid-text", "--chat-text"] as const;
const TEXT_SEC = [
  "--chat-mermaid-text-secondary",
  "--chat-text-secondary",
] as const;
const LINE = ["--chat-mermaid-line", "--chat-border"] as const;
/** Block fills: flowchart `.node` shapes use Mermaid `mainBkg`, not `nodeBkg` (see flowchart styles). */
const NODE = [
  "--chat-mermaid-node-fill",
  "--chat-mermaid-main-fill",
  "--chat-surface-alt",
] as const;
const CLUSTER = ["--chat-mermaid-cluster-fill", "--chat-surface-alt"] as const;
const PRIMARY = ["--chat-mermaid-primary", "--chat-primary"] as const;
const ON_PRIMARY = [
  "--chat-mermaid-primary-contrast",
  "--chat-self-text",
  "--chat-user-text",
] as const;
const SECONDARY = [
  "--chat-mermaid-secondary-fill",
  "--chat-primary-light",
] as const;
const TERTIARY = ["--chat-mermaid-tertiary-fill", "--chat-surface"] as const;
const NOTE_BG = ["--chat-mermaid-note-fill", "--chat-code-bg"] as const;
const NOTE_TXT = ["--chat-mermaid-note-text", "--chat-code-text"] as const;
const EDGE_LBL = ["--chat-mermaid-edge-label-bg", "--chat-surface"] as const;

/**
 * Builds `themeVariables` entries for Mermaid `theme: 'base'`.
 * Only keys with a resolved non-empty color are returned.
 */
export function buildMermaidThemeVariables(
  host: HTMLElement,
): Record<string, string> {
  const background = firstResolvedColor(host, BG);
  const textColor = firstResolvedColor(host, TEXT);
  const textSecondary = firstResolvedColor(host, TEXT_SEC);
  const lineColor = firstResolvedColor(host, LINE);
  const nodeBkg = firstResolvedColor(host, NODE);
  const clusterBkg = firstResolvedColor(host, CLUSTER);
  const primaryColor = firstResolvedColor(host, PRIMARY);
  let primaryTextColor = firstResolvedColor(host, ON_PRIMARY);
  if (!primaryTextColor) primaryTextColor = firstResolvedColor(host, TEXT);
  const secondaryColor = firstResolvedColor(host, SECONDARY);
  const tertiaryColor = firstResolvedColor(host, TERTIARY);
  const noteBkg = firstResolvedColor(host, NOTE_BG);
  const noteText = firstResolvedColor(host, NOTE_TXT);
  const edgeLabelBackground = firstResolvedColor(host, EDGE_LBL);

  const assign = (
    out: Record<string, string>,
    key: string,
    val: string,
  ): void => {
    if (val) out[key] = val;
  };

  const out: Record<string, string> = {};

  assign(out, "background", background);
  /* Keep mainBkg === nodeBkg so flowchart nodes (fill: mainBkg) match sequence actors (actorBkg). */
  assign(out, "mainBkg", nodeBkg);
  assign(out, "nodeBkg", nodeBkg);
  assign(out, "nodeBorder", lineColor);
  assign(out, "clusterBkg", clusterBkg);
  assign(out, "clusterBorder", lineColor);
  assign(out, "titleColor", textColor);
  assign(out, "textColor", textColor);
  assign(out, "nodeTextColor", textColor);
  assign(out, "lineColor", lineColor);
  assign(out, "arrowheadColor", lineColor);
  assign(out, "defaultLinkColor", lineColor);
  assign(out, "edgeLabelBackground", edgeLabelBackground);

  assign(out, "primaryColor", primaryColor);
  assign(out, "primaryTextColor", primaryTextColor);
  assign(out, "primaryBorderColor", lineColor);
  assign(out, "secondaryColor", secondaryColor);
  assign(out, "secondaryBorderColor", lineColor);
  assign(out, "secondaryTextColor", textSecondary || textColor);
  assign(out, "tertiaryColor", tertiaryColor);
  assign(out, "tertiaryBorderColor", lineColor);
  assign(out, "tertiaryTextColor", textSecondary || textColor);

  assign(out, "noteBkgColor", noteBkg);
  assign(out, "noteTextColor", noteText);
  assign(out, "noteBorderColor", lineColor);

  assign(out, "actorBkg", nodeBkg);
  assign(out, "actorBorder", lineColor);
  assign(out, "actorTextColor", textColor);
  assign(out, "actorLineColor", lineColor);
  assign(out, "signalColor", lineColor);
  assign(out, "signalTextColor", textColor);
  assign(out, "labelBoxBkgColor", edgeLabelBackground);
  assign(out, "labelBoxBorderColor", lineColor);
  assign(out, "labelTextColor", textColor);
  assign(out, "loopTextColor", textSecondary || textColor);
  assign(out, "activationBorderColor", lineColor);
  assign(out, "activationBkgColor", secondaryColor || nodeBkg);

  return out;
}
