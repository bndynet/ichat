/**
 * Build-time injected package version.
 * Replaced by tsup `define` with the actual version from package.json.
 * Falls back to 'dev' when running unbundled (e.g. tests).
 */
declare var __PACKAGE_VERSION__: string | undefined;

export const PACKAGE_VERSION: string =
  typeof __PACKAGE_VERSION__ !== "undefined" ? __PACKAGE_VERSION__ : "dev";

/**
 * Sets `data-version` attribute on the given element so the package version
 * is visible in the DOM for debugging.
 */
export function setVersionAttribute(el: HTMLElement): void {
  el.setAttribute("version", PACKAGE_VERSION);
}
