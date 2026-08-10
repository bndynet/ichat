/**
 * Global registry for the shared `markdown-it` instance.
 *
 * Uses a global symbol so that even if the module is loaded from different
 * paths (e.g. source vs dist in Vite dev), all imports share the same
 * singleton.
 *
 * @internal
 */

import MarkdownIt from "markdown-it";

const MD_KEY = Symbol.for("@bndynet/ichat-messages:markdown-it");

/** Get or create the shared markdown-it instance. Idempotent. */
export function getSharedMd(factory: () => MarkdownIt): MarkdownIt {
  // Use globalThis (standard) in all modern runtimes; the global fallback is
  // only needed for ancient Node.js without --harmony-global-this.
  const store = (
    typeof globalThis !== "undefined"
      ? globalThis
      : (Function("return this")() as typeof globalThis)
  ) as Record<symbol, MarkdownIt>;
  return (store[MD_KEY] ??= factory());
}
