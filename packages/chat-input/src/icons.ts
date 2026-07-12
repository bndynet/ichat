import { svg, type TemplateResult } from 'lit';

export interface ChatInputIconOptions {
  className?: string;
  size?: number | string;
  strokeWidth?: number | string;
}

function strokeIcon(
  paths: TemplateResult,
  { className = '', size = 12, strokeWidth = 2 }: ChatInputIconOptions = {},
): TemplateResult {
  return svg`
    <svg
      class=${className}
      viewBox="0 0 24 24"
      width=${size}
      height=${size}
      fill="none"
      stroke="currentColor"
      stroke-width=${strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      ${paths}
    </svg>
  `;
}

function filledIcon(
  paths: TemplateResult,
  { className = '', size = 12 }: ChatInputIconOptions = {},
): TemplateResult {
  return svg`
    <svg
      class=${className}
      viewBox="0 0 24 24"
      width=${size}
      height=${size}
      fill="currentColor"
      aria-hidden="true"
    >
      ${paths}
    </svg>
  `;
}

export const chatInputIcons = {
  microphone(options?: ChatInputIconOptions): TemplateResult {
    return strokeIcon(svg`
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="23" />
      <line x1="8" x2="16" y1="23" y2="23" />
    `, options);
  },

  stopDictation(options?: ChatInputIconOptions): TemplateResult {
    return strokeIcon(svg`
      <circle cx="12" cy="12" r="9" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
    `, options);
  },

  send(options?: ChatInputIconOptions): TemplateResult {
    return strokeIcon(svg`
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    `, options);
  },

  cancel(options?: ChatInputIconOptions): TemplateResult {
    return filledIcon(svg`<rect x="6" y="6" width="12" height="12" rx="2" />`, options);
  },
} as const;
