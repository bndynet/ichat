const ALLOW_ALL_URI_REGEXP =
  /^(?:(?:[a-z][a-z0-9+.-]*:)|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeProtocol(protocol: string): string {
  const trimmed = protocol.trim().toLowerCase();
  const withoutColon = trimmed.endsWith(':') ? trimmed.slice(0, -1) : trimmed;
  return /^[a-z][a-z0-9+.-]*$/.test(withoutColon) ? withoutColon : '';
}

export function normalizeAllowedLinkProtocols(protocols?: readonly string[]): string[] {
  if (!protocols) return [];
  return [...new Set(protocols.map(normalizeProtocol).filter(Boolean))].sort();
}

export function uriRegexpForAllowedLinkProtocols(protocols?: readonly string[]): RegExp {
  const normalized = normalizeAllowedLinkProtocols(protocols);
  if (normalized.length === 0) return ALLOW_ALL_URI_REGEXP;
  const source = normalized.map(escapeRegExp).join('|');
  return new RegExp(
    `^(?:(?:(?:${source}):)|[^a-z]|[a-z+.\\-]+(?:[^a-z+.\\-:]|$))`,
    'i'
  );
}

export function isAllowedLinkHref(
  rawHref: string,
  allowedLinkProtocols?: readonly string[]
): boolean {
  const normalized = normalizeAllowedLinkProtocols(allowedLinkProtocols);
  if (normalized.length === 0) return true;
  const explicit = /^([a-z][a-z0-9+.-]*):/i.exec(rawHref.trim());
  if (!explicit) return true;
  return normalized.includes(explicit[1].toLowerCase());
}
