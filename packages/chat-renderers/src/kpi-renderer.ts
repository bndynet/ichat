import type { BlockRenderer } from '@bndynet/chat-messages';

interface KpiData {
  label: string;
  value: string;
  trend?: number;
  unit?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function renderKpi(code: string): string {
  try {
    const data = JSON.parse(code) as KpiData;
    return `<div class="chat-kpi">${buildKpiItemHtml(data)}</div>`;
  } catch {
    return `<pre class="chat-kpi--error">Invalid KPI data: expected JSON with "label" and "value" fields</pre>`;
  }
}

export const kpiRenderer: BlockRenderer = {
  name: 'kpi',
  test: (lang: string) => lang === 'kpi',
  render: (code: string, _lang: string) => renderKpi(code),
};

// ── KPI group — horizontal strip, reuses .chat-kpi classes ──────────────────

function renderKpis(code: string): string {
  try {
    const items = JSON.parse(code) as KpiData[];
    if (!Array.isArray(items) || items.length === 0) {
      return `<pre class="chat-kpi--error">Invalid KPIs data: expected a non-empty JSON array</pre>`;
    }

    const inner = items
      .map((data, i) => {
        const divider = i < items.length - 1 ? '<div class="chat-kpis__divider"></div>' : '';
        return `<div class="chat-kpi">${buildKpiItemHtml(data)}</div>${divider}`;
      })
      .join('');

    return `<div class="chat-kpis">${inner}</div>`;
  } catch {
    return `<pre class="chat-kpi--error">Invalid KPIs data: expected a JSON array of KPI objects</pre>`;
  }
}

export const kpisRenderer: BlockRenderer = {
  name: 'kpis',
  test: (lang: string) => lang === 'kpis',
  render: (code: string, _lang: string) => renderKpis(code),
};
