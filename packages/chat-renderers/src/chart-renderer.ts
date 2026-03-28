import type MarkdownIt from 'markdown-it';
import type { BlockRenderer } from '@bndynet/chat-messages';
import type { ChartData, ChartOptions } from '@bndynet/icharts';
import { switchTheme } from '@bndynet/icharts';
import '@bndynet/icharts'; // registers <i-chart>
import { renderCodeFallback, wrapWithCodeToggle, type RendererOptions } from './utils.js';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * JSON shape accepted inside a ```chart fence block.
 * Mirrors the three properties of the <i-chart> web component exactly:
 *
 *   type    — "bar" | "line" | "area" | "pie" | "gauge"
 *   data    — XYData | PieData | GaugeData  (see @bndynet/icharts)
 *   options — ChartOptions                  (see @bndynet/icharts)
 *
 * Examples
 * --------
 * Bar:
 *   {
 *     "type": "bar",
 *     "data": { "categories": ["Q1","Q2"], "series": [{ "name": "Sales", "data": [10,20] }] },
 *     "options": { "title": "Sales", "stacked": true }
 *   }
 *
 * Pie / Doughnut:
 *   {
 *     "type": "pie",
 *     "data": [{ "name": "Chrome", "value": 65 }, { "name": "Other", "value": 35 }],
 *     "options": { "variant": "doughnut" }
 *   }
 *
 * Gauge:
 *   {
 *     "type": "gauge",
 *     "data": { "value": 72, "max": 100, "label": "Score" },
 *     "options": { "variant": "percentage" }
 *   }
 */
export interface ChartInput {
  type: string;
  data: ChartData;
  options?: ChartOptions;
}

// ── Theme detection ───────────────────────────────────────────────────────────

/** Returns true when the document is currently in dark mode. */
function isDarkTheme(): boolean {
  if (typeof document === 'undefined') return false;
  return (document.documentElement.getAttribute('data-theme') ?? '').includes('dark');
}

/**
 * Watch <html data-theme> and call switchTheme() on every theme change.
 * switchTheme() updates both the global colorHub state (so newly created
 * charts pick up the correct theme via resolveThemeName()) and calls
 * setTheme() on every IChart instance already in the registry.
 */
function setupThemeObserver(): void {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;

  new MutationObserver(() => {
    switchTheme(isDarkTheme() ? 'dark' : 'light');
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

setupThemeObserver();

// ── Renderer ──────────────────────────────────────────────────────────────────

function renderChart(code: string, opts: RendererOptions = {}): string {
  let input: ChartInput;
  try {
    input = JSON.parse(code) as ChartInput;
  } catch {
    return renderCodeFallback('chart', code);
  }

  const options: ChartOptions = { ...(input.options ?? {}) };

  // @bndynet/icharts >=6.0.0: resolveThemeName(undefined) falls back to
  // colorHub.getCurrentTheme().name, so newly created charts automatically
  // pick up whichever theme is currently active via switchTheme().
  // Only inject options.theme when the caller explicitly requested one.
  const escapedData = JSON.stringify(input.data).replace(/'/g, '&#39;');
  const escapedOptions = JSON.stringify(options).replace(/'/g, '&#39;');

  const html = `<i-chart type="${input.type}" data='${escapedData}' options='${escapedOptions}' style="display:block;width:100%;height:320px"></i-chart>`;

  return opts.codeToggle !== false
    ? wrapWithCodeToggle('chart', code, html)
    : html;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Creates a `BlockRenderer` for `chart` fence blocks.
 *
 * @param options.codeToggle  Show the "view source" toggle icon on rendered
 *   charts.  Default: `true`.  Pass `{ codeToggle: false }` to disable.
 *
 * @example
 * // Default — toggle icon visible
 * registry.register(createChartRenderer())
 *
 * // Disable toggle
 * registry.register(createChartRenderer({ codeToggle: false }))
 */
export function createChartRenderer(options: RendererOptions = {}): BlockRenderer {
  return {
    name: 'chart',
    test: (lang: string) => lang === 'chart',
    render: (code: string, _lang: string) => renderChart(code, options),
  };
}

/**
 * Pre-built `BlockRenderer` with default options (code toggle enabled).
 * Add to a renderer registry: `registry.register(chartRenderer)`
 */
export const chartRenderer: BlockRenderer = createChartRenderer();

/**
 * markdown-it plugin approach.
 * Install into a markdown-it instance: `md.use(chartPlugin)`
 *
 * To customise options pass them as the second argument to `md.use()`:
 * `md.use(chartPlugin, { codeToggle: false })`
 */
export function chartPlugin(mdInstance: MarkdownIt, options: RendererOptions = {}): void {
  const originalFence =
    mdInstance.renderer.rules.fence ||
    function (tokens, idx, opts, _env, self) {
      return self.renderToken(tokens, idx, opts);
    };

  mdInstance.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    if (token.info.trim() === 'chart') {
      return renderChart(token.content, options);
    }
    return originalFence(tokens, idx, opts, env, self);
  };
}
