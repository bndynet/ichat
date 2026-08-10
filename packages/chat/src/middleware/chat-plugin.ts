import type { Chat } from "../components/chat.js";

/**
 * Plugin interface for extending `<i-chat>` with reusable functionality.
 *
 * Plugins are installed via `chat.use(plugin)` and can register middleware,
 * block renderers, part renderers, or perform any setup.  Return an optional
 * teardown function to clean up when the plugin is removed via
 * `chat.removePlugin(name)` or component disconnect.
 *
 * Duplicate plugin names are rejected — only the first registration is kept.
 *
 * @example
 * ```ts
 * const linkPreviewPlugin: ChatPlugin = {
 *   name: 'link-preview',
 *   install(chat) {
 *     const dispose = chat.use({
 *       name: 'link-preview-middleware',
 *       afterMessageAdded: (msg) => {
 *         // Add link previews
 *         return msg;
 *       },
 *     });
 *     return () => dispose();
 *   },
 * };
 * ```
 */
export interface ChatPlugin {
  /** Unique name for identification and removal. */
  name: string;

  /**
   * Called when the plugin is installed.
   * @param chat — The `<i-chat>` element instance.
   * @returns Optional cleanup function called when `removePlugin(name)` is invoked
   *   or the component is disconnected.
   */
  install(chat: Chat): void | (() => void);

  /** Optional semantic version for compatibility checks. */
  version?: string;
}
