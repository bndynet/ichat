import { svg, type TemplateResult } from 'lit';

export interface ChatIconOptions {
  className?: string;
  size?: number | string;
  strokeWidth?: number | string;
  viewBox?: string;
}

interface StrokeIconOptions extends ChatIconOptions {
  strokeLinecap?: string;
  strokeLinejoin?: string;
}

function strokeIcon(
  paths: TemplateResult,
  {
    className = '',
    size = 16,
    strokeWidth = 2,
    viewBox = '0 0 24 24',
    strokeLinecap = 'round',
    strokeLinejoin = 'round',
  }: StrokeIconOptions = {},
): TemplateResult {
  return svg`
    <svg
      class=${className}
      viewBox=${viewBox}
      width=${size}
      height=${size}
      fill="none"
      stroke="currentColor"
      stroke-width=${strokeWidth}
      stroke-linecap=${strokeLinecap}
      stroke-linejoin=${strokeLinejoin}
      aria-hidden="true"
    >
      ${paths}
    </svg>
  `;
}

function filledIcon(
  paths: TemplateResult,
  { className = '', size = 16, viewBox = '0 0 24 24' }: ChatIconOptions = {},
): TemplateResult {
  return svg`
    <svg
      class=${className}
      viewBox=${viewBox}
      width=${size}
      height=${size}
      fill="currentColor"
      aria-hidden="true"
    >
      ${paths}
    </svg>
  `;
}

function strokeIconString(
  paths: string,
  {
    className = '',
    size = 16,
    strokeWidth = 2,
    viewBox = '0 0 24 24',
    strokeLinecap = 'round',
    strokeLinejoin = 'round',
  }: StrokeIconOptions = {},
): string {
  const classAttr = className ? ` class="${className}"` : '';
  return (
    `<svg${classAttr} viewBox="${viewBox}" width="${size}" height="${size}" fill="none" ` +
    `stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="${strokeLinecap}" ` +
    `stroke-linejoin="${strokeLinejoin}" aria-hidden="true">${paths}</svg>`
  );
}

export const chatIcons = {
  spinner(options?: ChatIconOptions): TemplateResult {
    return strokeIcon(svg`<path d="M12 3a9 9 0 1 0 9 9" />`, {
      strokeWidth: 3,
      ...options,
    });
  },

  check(options?: ChatIconOptions): TemplateResult {
    return strokeIcon(svg`<path d="m20 6-11 11-5-5" />`, {
      strokeWidth: 3,
      ...options,
    });
  },

  x(options?: ChatIconOptions): TemplateResult {
    return strokeIcon(svg`<path d="M6 6l12 12M18 6 6 18" />`, {
      strokeWidth: 3,
      ...options,
    });
  },

  circle(options?: ChatIconOptions): TemplateResult {
    return strokeIcon(svg`<circle cx="12" cy="12" r="8" />`, {
      strokeWidth: 3,
      ...options,
    });
  },

  chevronDown(options?: ChatIconOptions): TemplateResult {
    return strokeIcon(svg`<path d="m6 9 6 6 6-6" />`, options);
  },

  chevronRight(options?: ChatIconOptions): TemplateResult {
    return strokeIcon(svg`<path d="m9 18 6-6-6-6" />`, options);
  },

  lightbulb(options?: ChatIconOptions): TemplateResult {
    return strokeIcon(
      svg`
      <path d="M15 14c.8-.8 1.5-2.1 1.5-3.5a4.5 4.5 0 1 0-9 0c0 1.4.7 2.7 1.5 3.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    `,
      options,
    );
  },

  todoList(options?: ChatIconOptions): TemplateResult {
    return strokeIcon(
      svg`
      <circle cx="4" cy="5" r="1.25" fill="currentColor" stroke="none"></circle>
      <circle cx="4" cy="10" r="1.25" fill="currentColor" stroke="none"></circle>
      <circle cx="4" cy="15" r="1.25" fill="currentColor" stroke="none"></circle>
      <path d="M8 5h8M8 10h8M8 15h8"></path>
    `,
      {
        size: 20,
        strokeWidth: 1.6,
        viewBox: '0 0 20 20',
        ...options,
      },
    );
  },

  todoPending(options?: ChatIconOptions): TemplateResult {
    return strokeIcon(svg`<circle class="todo__pending-circle" cx="10" cy="10" r="7.5"></circle>`, {
      size: 20,
      strokeWidth: 1.6,
      viewBox: '0 0 20 20',
      ...options,
    });
  },

  todoActive(options?: ChatIconOptions): TemplateResult {
    return strokeIcon(
      svg`
      <circle cx="10" cy="10" r="7.5"></circle>
      <path d="M7 10h6m-2.5-2.5L13 10l-2.5 2.5"></path>
    `,
      {
        size: 20,
        strokeWidth: 1.6,
        viewBox: '0 0 20 20',
        ...options,
      },
    );
  },

  todoDone(options?: ChatIconOptions): TemplateResult {
    return strokeIcon(
      svg`
      <circle cx="10" cy="10" r="7.5"></circle>
      <path d="m6.5 10 2.2 2.2 4.8-4.8"></path>
    `,
      {
        size: 20,
        strokeWidth: 1.6,
        viewBox: '0 0 20 20',
        ...options,
      },
    );
  },

  todoError(options?: ChatIconOptions): TemplateResult {
    return strokeIcon(
      svg`
      <circle cx="10" cy="10" r="7.5"></circle>
      <path d="m7.5 7.5 5 5m0-5-5 5"></path>
    `,
      {
        size: 20,
        strokeWidth: 1.6,
        viewBox: '0 0 20 20',
        ...options,
      },
    );
  },

  todoSkipped(options?: ChatIconOptions): TemplateResult {
    return strokeIcon(
      svg`
      <circle cx="10" cy="10" r="7.5"></circle>
      <path d="M7 10h6"></path>
    `,
      {
        size: 20,
        strokeWidth: 1.6,
        viewBox: '0 0 20 20',
        ...options,
      },
    );
  },

  errorCircleFilled(options?: ChatIconOptions): TemplateResult {
    return filledIcon(
      svg`
      <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
    `,
      {
        size: 18,
        viewBox: '0 0 20 20',
        ...options,
      },
    );
  },

  alertTriangleFilled(options?: ChatIconOptions): TemplateResult {
    return filledIcon(
      svg`
      <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clip-rule="evenodd" />
    `,
      {
        size: 16,
        viewBox: '0 0 20 20',
        ...options,
      },
    );
  },
} as const;

export const chatIconStrings = {
  chevronRight: strokeIconString('<path d="m9 18 6-6-6-6" />', {
    size: 18,
    strokeWidth: 2.2,
  }),
  progressDone: strokeIconString('<path d="M3.5 8.5 6.5 11.5 12.5 4.5" />', {
    size: 9,
    strokeWidth: 3,
    viewBox: '0 0 16 16',
  }),
  progressError: strokeIconString('<path d="M4 4 12 12M12 4 4 12" />', {
    size: 8,
    strokeWidth: 3,
    viewBox: '0 0 16 16',
  }),
  progressSkipped: strokeIconString('<path d="M4 8h8" />', {
    size: 8,
    strokeWidth: 3,
    viewBox: '0 0 16 16',
  }),
} as const;
