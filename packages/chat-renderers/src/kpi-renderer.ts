import type { BlockRenderer } from '@bndynet/chat-messages';
import { escapeHtml, renderCodeFallback, wrapWithCodeToggle, type RendererOptions } from './utils.js';

interface KpiData {
  label: string;
  value: string;
  trend?: number;
  unit?: string;
}

/** Builds the inner HTML for one KPI item using `.chat-kpi` classes. */
function buildKpiItemHtml(data: KpiData): string {
  const label = escapeHtml(data.label ?? '');
  const value = escapeHtml(data.value ?? '');

  let trendHtml = '';
  if (data.trend !== undefined && data.trend !== null) {
    const unit = data.unit ?? '%';
    const isDown = data.trend < 0;
    const arrow = isDown ? '▼' : '▲';
    const cls = isDown ? 'chat-kpi__trend--down' : 'chat-kpi__trend--up';
    trendHtml = `<span class="chat-kpi__trend ${cls}">${arrow} ${escapeHtml(String(Math.abs(data.trend)))}${escapeHtml(unit)}</span>`;
  }

  return `<div class="chat-kpi__header"><span class="chat-kpi__label">${label}</span>${trendHtml}</div><div class="chat-kpi__value">${value}</div>`;
}

// ── Single KPI card ──────────────────────────────────────────────────────────

function renderKpi(code: string, opts: RendererOptions = {}): string {
  try {
    const data = JSON.parse(code) as KpiData;
    const html = `<div class="chat-kpi">${buildKpiItemHtml(data)}</div>`;
    return opts.codeToggle !== false ? wrapWithCodeToggle('kpi', code, html) : html;
  } catch {
    return renderCodeFallback('kpi', code);
  }
}

/**
 * Creates a `BlockRenderer` for `kpi` fence blocks.
 *
 * @param options.codeToggle  Show the "view source" toggle icon.  Default: `true`.
 *
 * @example
 * registry.register(createKpiRenderer({ codeToggle: false }))
 */
export function createKpiRenderer(options: RendererOptions = {}): BlockRenderer {
  return {
    name: 'kpi',
    test: (lang: string) => lang === 'kpi',
    render: (code: string, _lang: string) => renderKpi(code, options),
  };
}

/** Pre-built `BlockRenderer` with default options (code toggle enabled). */
export const kpiRenderer: BlockRenderer = createKpiRenderer({ codeToggle: false });

// ── KPI group — horizontal strip ─────────────────────────────────────────────

function renderKpis(code: string, opts: RendererOptions = {}): string {
  try {
    const items = JSON.parse(code) as KpiData[];
    if (!Array.isArray(items) || items.length === 0) {
      return renderCodeFallback('kpis', code);
    }

    const inner = items
      .map((data, i) => {
        const divider = i < items.length - 1 ? '<div class="chat-kpis__divider"></div>' : '';
        return `<div class="chat-kpi">${buildKpiItemHtml(data)}</div>${divider}`;
      })
      .join('');

    const html = `<div class="chat-kpis">${inner}</div>`;
    return opts.codeToggle !== false ? wrapWithCodeToggle('kpis', code, html) : html;
  } catch {
    return renderCodeFallback('kpis', code);
  }
}

/**
 * Creates a `BlockRenderer` for `kpis` fence blocks (horizontal KPI strip).
 *
 * @param options.codeToggle  Show the "view source" toggle icon.  Default: `true`.
 */
export function createKpisRenderer(options: RendererOptions = {}): BlockRenderer {
  return {
    name: 'kpis',
    test: (lang: string) => lang === 'kpis',
    render: (code: string, _lang: string) => renderKpis(code, options),
  };
}

/** Pre-built `BlockRenderer` with default options (code toggle enabled). */
export const kpisRenderer: BlockRenderer = createKpisRenderer({ codeToggle: false });
