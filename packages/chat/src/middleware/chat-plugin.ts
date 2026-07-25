import type { Chat } from '../components/chat.js';

/**
 * Plugin interface for extending `<i-chat>` with reusable functionality.
 *
 * Plugins are installed via `chat.use(plugin)` and can register middleware,
 * block renderers, part renderers, or perform any setup.  Return an optional
 * teardown function to clean up when the plugin is removed.
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
   * @returns Optional cleanup function called when `removePlugin(name)` is invoked.
   */
  install(chat: Chat): void | (() => void);

  /** Optional semantic version for compatibility checks. */
  version?: string;
}

/**
 * Manages the lifecycle of registered plugins.
 */
export interface PluginManager {
  readonly plugins: ReadonlyMap<string, ChatPlugin>;
  use(plugin: ChatPlugin): () => void;
  remove(name: string): boolean;
}

export function createPluginManager(): PluginManager {
  const plugins = new Map<string, ChatPlugin>();
  const teardowns = new Map<string, () => void>();

  return {
    get plugins(): ReadonlyMap<string, ChatPlugin> {
      return plugins;
    },

    use(plugin: ChatPlugin): () => void {
      if (plugins.has(plugin.name)) {
        // Replace existing plugin
        const oldTeardown = teardowns.get(plugin.name);
        oldTeardown?.();
      }

      plugins.set(plugin.name, plugin);

      return () => {
        plugins.delete(plugin.name);
        const teardown = teardowns.get(plugin.name);
        teardown?.();
        teardowns.delete(plugin.name);
      };
    },

    remove(name: string): boolean {
      const teardown = teardowns.get(name);
      teardown?.();
      teardowns.delete(name);
      return plugins.delete(name);
    },
  };
}

/**
 * Helper to install a plugin into a Chat element and capture its teardown.
 * @internal Used by `chat.use()` for plugin support.
 */
export function installPlugin(chat: Chat, plugin: ChatPlugin): () => void {
  const teardown = plugin.install(chat);
  return () => {
    teardown?.();
  };
}
