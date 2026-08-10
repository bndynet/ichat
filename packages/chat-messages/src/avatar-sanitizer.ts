import DOMPurify from "dompurify";

type DOMPurifyConfig = NonNullable<Parameters<typeof DOMPurify.sanitize>[1]>;

interface InlineSvgPurifier {
  readonly isSupported?: boolean;
  sanitize(markup: string, config: DOMPurifyConfig): unknown;
}

/**
 * Keep normal inline-avatar artwork working while excluding SVG features that
 * can embed active HTML/script content. Event-handler attributes and unsafe
 * URI values are removed by DOMPurify's SVG profiles.
 */
const INLINE_SVG_SANITIZE_CONFIG: DOMPurifyConfig = {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ["script", "foreignObject"],
  ALLOW_DATA_ATTR: false,
};

/** Sanitize an inline SVG avatar. Returns an empty string when it cannot be rendered safely. */
export function sanitizeInlineSvgAvatar(
  svgMarkup: string,
  purifier: InlineSvgPurifier = DOMPurify,
): string {
  // DOMPurify is created without a DOM during SSR/Node imports. Fail closed
  // instead of passing the original markup to Lit's unsafeHTML directive.
  if (!purifier.isSupported || typeof purifier.sanitize !== "function")
    return "";

  const sanitized = String(
    purifier.sanitize(svgMarkup, INLINE_SVG_SANITIZE_CONFIG),
  ).trim();
  return /^<svg[\s>]/i.test(sanitized) ? sanitized : "";
}
