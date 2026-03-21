import type MarkdownIt from 'markdown-it';
import type { BlockRenderer } from '@bndynet/chat-messages';
import type { ChartData, ChartOptions } from '@bndynet/icharts';
import '@bndynet/icharts'; // registers <i-chart>

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
 * Recursively collect elements matching `selector` across all shadow roots.
 * document.querySelectorAll() cannot pierce shadow DOM boundaries, so we
 * must traverse every shadow root manually.
 */
function queryShadowAll(selector: string, root: Document | ShadowRoot = document): HTMLElement[] {
  const found: HTMLElement[] = Array.from(root.querySelectorAll<HTMLElement>(selector));
  root.querySelectorAll('*').forEach((el) => {
    if (el.shadowRoot) found.push(...queryShadowAll(selector, el.shadowRoot));
  });
  return found;
}

/**
 * Watch <html data-theme> and update every auto-themed <i-chart> on change.
 * Charts where the user explicitly set options.theme are left untouched.
 */
function setupThemeObserver(): void {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;

  new MutationObserver(() => {
    const theme = isDarkTheme() ? 'dark' : 'light';
    queryShadowAll('i-chart[data-auto-theme]').forEach((el) => {
      try {
        const opts = JSON.parse(el.getAttribute('options') ?? '{}') as ChartOptions;
        if (opts.theme === theme) return;
        opts.theme = theme as ChartOptions['theme'];
        el.setAttribute('options', JSON.stringify(opts));
      } catch { /* malformed attribute — skip */ }
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

setupThemeObserver();

// ── Renderer ──────────────────────────────────────────────────────────────────

function renderChart(code: string): string {
  let input: ChartInput;
  try {
    input = JSON.parse(code) as ChartInput;
  } catch {
    return `<pre class="chart-error">Invalid chart data: expected JSON\n${code}</pre>`;
  }

  const options: ChartOptions = { ...(input.options ?? {}) };

  // Auto-inject dark theme when the document is dark and the user has not
  // explicitly chosen a theme in options.
  const autoTheme = !options.theme;
  if (autoTheme && isDarkTheme()) {
    options.theme = 'dark' as ChartOptions['theme'];
  }

  // @bndynet/icharts >=5.0.1 declares data/options with @property({ type: Object }),
  // so Lit's defaultConverter calls JSON.parse() on these attribute strings automatically.
  const escapedData = JSON.stringify(input.data).replace(/'/g, '&#39;');
  const escapedOptions = JSON.stringify(options).replace(/'/g, '&#39;');

  // data-auto-theme marks charts whose theme was injected automatically so the
  // MutationObserver above can update them when the page theme toggles.
  const autoAttr = autoTheme ? ' data-auto-theme' : '';

  return `<i-chart type="${input.type}" data='${escapedData}' options='${escapedOptions}'${autoAttr} style="display:block;width:100%;height:320px"></i-chart>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * BlockRenderer for the registry approach.
 * Add to a renderer registry: `registry.register(chartRenderer)`
 */
export const chartRenderer: BlockRenderer = {
  name: 'chart',
  test: (lang: string) => lang === 'chart',
  render: (code: string, _lang: string) => renderChart(code),
};

/**
 * markdown-it plugin approach.
 * Install into a markdown-it instance: `md.use(chartPlugin)`
 */
export function chartPlugin(mdInstance: MarkdownIt): void {
  const originalFence =
    mdInstance.renderer.rules.fence ||
    function (tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options);
    };

  mdInstance.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token.info.trim() === 'chart') {
      return renderChart(token.content);
    }
    return originalFence(tokens, idx, options, env, self);
  };
}
