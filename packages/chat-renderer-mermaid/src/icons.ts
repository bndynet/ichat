interface RendererIconOptions {
  size?: number | string;
  strokeWidth?: number | string;
  viewBox?: string;
}

function strokeIcon(
  paths: string,
  {
    size = 13,
    strokeWidth = 2.2,
    viewBox = '0 0 24 24',
  }: RendererIconOptions = {},
): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="none" ` +
    `stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  );
}

export const rendererIcons = {
  code: strokeIcon('<path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" />'),
  eye: strokeIcon('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />'),
  check: strokeIcon('<path d="m20 6-11 11-5-5" />', {
    size: 11,
    strokeWidth: 3,
  }),
} as const;
