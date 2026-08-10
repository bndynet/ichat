/** Safe defaults for untrusted/model-generated links. Custom schemes are opt-in. */
const DEFAULT_ALLOWED_LINK_PROTOCOLS = [
  "http",
  "https",
  "mailto",
  "tel",
] as const;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeProtocol(protocol: string): string {
  const trimmed = protocol.trim().toLowerCase();
  const withoutColon = trimmed.endsWith(":") ? trimmed.slice(0, -1) : trimmed;
  return /^[a-z][a-z0-9+.-]*$/.test(withoutColon) ? withoutColon : "";
}

export function normalizeAllowedLinkProtocols(
  protocols?: readonly string[],
): string[] {
  if (!protocols) return [];
  return [...new Set(protocols.map(normalizeProtocol).filter(Boolean))].sort();
}

export function uriRegexpForAllowedLinkProtocols(
  protocols?: readonly string[],
): RegExp {
  const normalized = normalizeAllowedLinkProtocols(protocols);
  const effective =
    normalized.length > 0 ? normalized : [...DEFAULT_ALLOWED_LINK_PROTOCOLS];
  const source = effective.map(escapeRegExp).join("|");
  return new RegExp(
    `^(?:(?:(?:${source}):)|[^a-z]|[a-z+.\\-]+(?:[^a-z+.\\-:]|$))`,
    "i",
  );
}

export function isAllowedLinkHref(
  rawHref: string,
  allowedLinkProtocols?: readonly string[],
): boolean {
  const normalized = normalizeAllowedLinkProtocols(allowedLinkProtocols);
  const effective =
    normalized.length > 0 ? normalized : [...DEFAULT_ALLOWED_LINK_PROTOCOLS];
  const explicit = /^([a-z][a-z0-9+.-]*):/i.exec(rawHref.trim());
  if (!explicit) return true;
  return effective.includes(explicit[1].toLowerCase());
}
