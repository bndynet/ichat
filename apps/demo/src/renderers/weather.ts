// Demo-local example of how an external consumer writes their own `x-*` part
// renderers. The library only provides the `registerPartRenderer` capability;
// the weather card below is application code, not shipped by the library.
import type { PartRenderer } from '@bndynet/ichat'

export interface WeatherData {
  city?: string
  temp?: number | string
  unit?: string
  condition?: string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const CARD_STYLES = `
  .weather-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    border: 1px solid var(--chat-border, #e2e8f0);
    border-radius: 12px;
    background: var(--chat-surface-alt, #f8f9fa);
    color: var(--chat-text, #1a202c);
    max-width: 320px;
  }
  .weather-card__temp { font-size: 1.75rem; font-weight: 700; line-height: 1; }
  .weather-card__body { display: flex; flex-direction: column; gap: 2px; }
  .weather-card__city { font-weight: 600; }
  .weather-card__condition { color: var(--chat-text-secondary, #4a5568); font-size: 0.875rem; }
`

function cardHtml(d: WeatherData): string {
  const temp = d.temp != null ? escapeHtml(String(d.temp)) : '--'
  const unit = escapeHtml(d.unit ?? '')
  const city = escapeHtml(d.city ?? 'Unknown')
  const condition = escapeHtml(d.condition ?? '')
  return `
    <div class="weather-card">
      <div class="weather-card__temp">${temp}${unit}</div>
      <div class="weather-card__body">
        <span class="weather-card__city">${city}</span>
        <span class="weather-card__condition">${condition}</span>
      </div>
    </div>`
}

// ── Element mode: <x-weather-card> custom element ─────────────────────────────

class WeatherCardElement extends HTMLElement {
  private _data: WeatherData = {}

  /** The library sets the part `data` as a property (not via an HTML attribute). */
  set data(value: WeatherData) {
    this._data = value ?? {}
    this._render()
  }
  get data(): WeatherData {
    return this._data
  }

  connectedCallback(): void {
    this._render()
  }

  private _render(): void {
    this.innerHTML = `<style>${CARD_STYLES}</style>${cardHtml(this._data)}`
  }
}

if (!customElements.get('x-weather-card')) {
  customElements.define('x-weather-card', WeatherCardElement)
}

/** Element mode: instance is preserved across `updatePart`, so streaming patches do not rebuild the DOM. */
export const weatherElementRenderer: PartRenderer = {
  name: 'weather-element',
  test: (type) => type === 'x-weather',
  element: 'x-weather-card',
}

/** String mode: returns HTML, sanitised with DOMPurify + patched via morphdom. Inline styles only (`<style>` is stripped). */
export const weatherStringRenderer: PartRenderer = {
  name: 'weather-string',
  test: (type) => type === 'x-weather-html',
  render: (part) => {
    const d = part.data as WeatherData
    const temp = d.temp != null ? escapeHtml(String(d.temp)) : '--'
    const unit = escapeHtml(d.unit ?? '')
    const city = escapeHtml(d.city ?? 'Unknown')
    const condition = escapeHtml(d.condition ?? '')
    const card = [
      'display:flex', 'align-items:center', 'gap:14px', 'padding:14px 18px',
      'border:1px solid var(--chat-border,#e2e8f0)', 'border-radius:12px',
      'background:var(--chat-surface-alt,#f8f9fa)', 'color:var(--chat-text,#1a202c)', 'max-width:320px',
    ].join(';')
    return `
      <div style="${card}">
        <div style="font-size:1.75rem;font-weight:700;line-height:1">${temp}${unit}</div>
        <div style="display:flex;flex-direction:column;gap:2px">
          <span style="font-weight:600">${city}</span>
          <span style="color:var(--chat-text-secondary,#4a5568);font-size:0.875rem">${condition}</span>
        </div>
      </div>`
  },
}
