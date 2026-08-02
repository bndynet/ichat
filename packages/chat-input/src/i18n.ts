/**
 * Self-contained strings for `<i-chat-input>`. This package stays dependency-free
 * (only `lit`), so the composer dictionary lives here rather than importing from
 * `@bndynet/ichat-messages`. The shape mirrors `ChatLabels.composer` there, so
 * `<i-chat>` can forward `config.labels.composer` straight through.
 */
export interface ComposerLabels {
  /** Textarea placeholder. */
  placeholder: string;
  /** Overlay shown while speech recognition is active. */
  voiceListening: string;
  /** Send button `aria-label`. */
  send: string;
  /** Send button `title` tooltip. */
  sendTitle: string;
  /** Cancel (stop streaming) button `aria-label`. */
  cancel: string;
  /** Cancel button `title` tooltip. */
  cancelTitle: string;
  /** Voice button `aria-label` when idle. */
  voiceStart: string;
  /** Voice button `title` when idle. */
  voiceStartTitle: string;
  /** Voice button `aria-label` while listening. */
  voiceStop: string;
  /** Voice button `title` while listening. */
  voiceStopTitle: string;
}

/** English (default) composer strings. */
export const COMPOSER_LABELS_EN: ComposerLabels = {
  placeholder: 'Type a message…',
  voiceListening: 'Listening…',
  send: 'Send',
  sendTitle: 'Send message',
  cancel: 'Cancel',
  cancelTitle: 'Stop generating',
  voiceStart: 'Voice input',
  voiceStartTitle: 'Voice input',
  voiceStop: 'Stop voice input',
  voiceStopTitle: 'Stop dictation',
};

/** Simplified Chinese composer strings. */
export const COMPOSER_LABELS_ZH_CN: ComposerLabels = {
  placeholder: '输入消息…',
  voiceListening: '正在聆听…',
  send: '发送',
  sendTitle: '发送消息',
  cancel: '取消',
  cancelTitle: '停止生成',
  voiceStart: '语音输入',
  voiceStartTitle: '语音输入',
  voiceStop: '停止语音输入',
  voiceStopTitle: '停止听写',
};

function pickBuiltInComposerLabels(locale: string): ComposerLabels {
  const loc = locale.toLowerCase();
  if (loc === 'zh' || loc.startsWith('zh-')) return COMPOSER_LABELS_ZH_CN;
  return COMPOSER_LABELS_EN;
}

/**
 * Resolve composer strings: built-ins from `locale`, then shallow-merge `labels`
 * overrides. Unknown locales fall back to English.
 */
export function resolveComposerLabels(options: {
  locale?: string;
  labels?: Partial<ComposerLabels>;
}): ComposerLabels {
  const base = pickBuiltInComposerLabels(options.locale?.trim() || 'en');
  if (!options.labels) return base;
  const out = { ...base };
  for (const key of Object.keys(options.labels) as Array<keyof ComposerLabels>) {
    const value = options.labels[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}
