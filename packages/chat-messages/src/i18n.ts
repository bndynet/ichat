import type { DateSeparatorLabels } from './types.js';
import { DATE_SEPARATOR_LABELS_EN, DATE_SEPARATOR_LABELS_ZH_CN } from './date-separator.js';

/** Strings for the default composer (`<i-chat-input>`). */
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

/** Strings for the collapsible reasoning / "thinking" block. */
export interface ReasoningLabels {
  /** Header while the model is still thinking/streaming. */
  thinking: string;
  /** Header once reasoning has completed. */
  reasoning: string;
}

/** Strings for the tool-call card (`<i-chat-tool-call>`). */
export interface ToolCallLabels {
  /** State: `input-streaming`. */
  preparing: string;
  /** State: `input-available`. */
  ready: string;
  /** State: `executing`. */
  running: string;
  /** State: `output-available`. */
  success: string;
  /** State: `output-error`. */
  error: string;
  /** Section heading above the arguments block. */
  argumentsSection: string;
  /** Section heading above the error block. */
  errorSection: string;
  /** Section heading above the result block. */
  resultSection: string;
  /** Human-in-the-loop approve button. */
  approve: string;
  /** Human-in-the-loop reject button. */
  reject: string;
  /** Shown after the user approves. */
  approved: string;
  /** Shown after the user rejects. */
  rejected: string;
}

/** Strings for the message list shell (`<i-chat-messages>`). */
export interface MessagesLabels {
  /** Placeholder shown when there are no messages. */
  empty: string;
  /** `aria-label` for the error-banner dismiss button. */
  dismissError: string;
  /** `aria-label` for the scroll-to-latest button. */
  scrollToLatest: string;
}

/**
 * Complete set of user-facing UI strings for the chat components. Built-ins are
 * provided for `en` (default) and `zh` / `zh-CN`. Hosts override any subset via
 * {@link ChatConfig.labels}; values are deep-merged on top of the locale base,
 * so you only specify the strings you want to change.
 */
export interface ChatLabels {
  composer: ComposerLabels;
  reasoning: ReasoningLabels;
  toolCall: ToolCallLabels;
  messages: MessagesLabels;
  dateSeparator: DateSeparatorLabels;
}

/** Recursive partial used for label overrides (functions are kept atomic). */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown ? T[K] : DeepPartial<T[K]>;
};

/** English (default) UI strings. */
export const CHAT_LABELS_EN: ChatLabels = {
  composer: {
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
  },
  reasoning: {
    thinking: 'Thinking...',
    reasoning: 'Reasoning',
  },
  toolCall: {
    preparing: 'Preparing…',
    ready: 'Ready',
    running: 'Running…',
    success: 'Success',
    error: 'Error',
    argumentsSection: 'Arguments',
    errorSection: 'Error',
    resultSection: 'Result',
    approve: 'Approve',
    reject: 'Reject',
    approved: 'Approved',
    rejected: 'Rejected',
  },
  messages: {
    empty: 'No messages yet. Start a conversation!',
    dismissError: 'Dismiss error',
    scrollToLatest: 'Scroll to latest message',
  },
  dateSeparator: DATE_SEPARATOR_LABELS_EN,
};

/** Simplified Chinese UI strings. */
export const CHAT_LABELS_ZH_CN: ChatLabels = {
  composer: {
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
  },
  reasoning: {
    thinking: '正在思考...',
    reasoning: '推理过程',
  },
  toolCall: {
    preparing: '准备中…',
    ready: '就绪',
    running: '运行中…',
    success: '成功',
    error: '错误',
    argumentsSection: '参数',
    errorSection: '错误',
    resultSection: '结果',
    approve: '允许',
    reject: '拒绝',
    approved: '已允许',
    rejected: '已拒绝',
  },
  messages: {
    empty: '还没有消息，开始对话吧！',
    dismissError: '关闭错误提示',
    scrollToLatest: '滚动到最新消息',
  },
  dateSeparator: DATE_SEPARATOR_LABELS_ZH_CN,
};

/** Pick the built-in dictionary for a BCP 47 tag (falls back to English). */
function pickBuiltInLabels(locale: string): ChatLabels {
  const loc = locale.toLowerCase();
  if (loc === 'zh' || loc.startsWith('zh-')) return CHAT_LABELS_ZH_CN;
  return CHAT_LABELS_EN;
}

/** Merge a partial label section on top of a complete base section. */
function mergeSection<T>(base: T, override?: DeepPartial<T>): T {
  if (!override) return base;
  const out = { ...base };
  const src = override as Record<string, unknown>;
  for (const key of Object.keys(src)) {
    const value = src[key];
    if (value !== undefined) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

/**
 * Resolve the final {@link ChatLabels}: pick the built-in dictionary for
 * `locale`, then deep-merge `labels` (one level of sections) on top. Unknown
 * locales fall back to English. `dateSeparatorLabels` is an optional
 * backward-compatible override merged into `dateSeparator`.
 */
export function resolveLabels(options: {
  locale?: string;
  labels?: DeepPartial<ChatLabels>;
  /** @deprecated Use `labels.dateSeparator` instead. Merged into `dateSeparator` for compatibility. */
  dateSeparatorLabels?: Partial<DateSeparatorLabels>;
}): ChatLabels {
  const base = pickBuiltInLabels(options.locale?.trim() || 'en');
  const o = options.labels;
  const dateSeparatorOverride: DeepPartial<DateSeparatorLabels> | undefined =
    o?.dateSeparator || options.dateSeparatorLabels
      ? { ...(options.dateSeparatorLabels ?? {}), ...(o?.dateSeparator ?? {}) }
      : undefined;

  return {
    composer: mergeSection(base.composer, o?.composer),
    reasoning: mergeSection(base.reasoning, o?.reasoning),
    toolCall: mergeSection(base.toolCall, o?.toolCall),
    messages: mergeSection(base.messages, o?.messages),
    dateSeparator: mergeSection(base.dateSeparator, dateSeparatorOverride),
  };
}
