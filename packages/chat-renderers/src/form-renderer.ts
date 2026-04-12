import type { BlockRenderer } from '@bndynet/chat-messages';
import { renderCodeFallback, wrapWithCodeToggle, type RendererOptions } from './utils.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FormFieldType = 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date-range';

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  /** Options for select / radio fields */
  options?: string[];
  /** Default value */
  defaultValue?: string | boolean;
  /** Minimum date (YYYY-MM-DD) for date-range fields */
  min?: string;
  /** Maximum date (YYYY-MM-DD) for date-range fields */
  max?: string;
  /** Labels for date-range start/end inputs; defaults to ["Start", "End"] */
  rangeLabels?: [string, string];
}

/**
 * All user-visible strings the library emits.
 * Every key is optional — omit the ones you don't need to override.
 * When a key is absent the field simply has no text fallback, so the
 * host application is in full control of every displayed string.
 */
export interface FormI18n {
  /** Placeholder option shown at the top of every <select>. Default: none. */
  selectPlaceholder?: string;
  /** Sub-labels for the date-range start/end inputs. Default: none (inputs have no sub-label). */
  dateRangeLabels?: [string, string];
  /** Inline error shown when the end date precedes the start date. Default: none (only visual highlight). */
  dateRangeError?: string;
  /** Text for the submit button when schema.submitLabel is absent. Default: none. */
  submitLabel?: string;
  /** Representation of a checked checkbox in the submitted summary. Default: '✓'. */
  boolTrue?: string;
  /** Representation of an unchecked checkbox in the submitted summary. Default: '✗'. */
  boolFalse?: string;
}

export interface FormSchema {
  /** Unique identifier surfaced in the form-submit event */
  id?: string;
  title?: string;
  submitLabel?: string;
  i18n?: FormI18n;
  fields: FormField[];
}

export interface DateRangeValue {
  start: string;
  end: string;
}

export interface FormSubmitDetail {
  formId: string;
  title: string;
  values: Record<string, string | boolean | string[] | DateRangeValue>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let formCounter = 0;

function nextFormId(): string {
  return `chat-form-${++formCounter}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Shadow-DOM styles ─────────────────────────────────────────────────────────

const FORM_STYLES = `
  :host {
    display: block;
    font-family: inherit;
    /* Derive from --chat-* base tokens; dark/light mode is handled by the ancestor
       setting those tokens — no media query or :host-context needed. */
    --_form-bg:           var(--chat-form-bg,            var(--chat-surface-alt, #f8f9fa));
    --_form-border:       var(--chat-form-border,        var(--chat-border,      #e2e8f0));
    --_form-title:        var(--chat-form-title-color,   var(--chat-text,        #1a202c));
    --_form-label:        var(--chat-form-label-color,   var(--chat-text-secondary, #4a5568));
    --_form-required:     var(--chat-form-required-color,var(--chat-error,       #e53e3e));
    --_form-input-color:  var(--chat-form-input-color,   var(--chat-text,        #1a202c));
    --_form-input-bg:     var(--chat-form-input-bg,      var(--chat-surface,     #ffffff));
    --_form-input-border: var(--chat-form-input-border,  var(--chat-border,      #cbd5e0));
    --_form-focus-border: var(--chat-form-focus-border,  var(--chat-primary,     #667eea));
    --_form-focus-shadow: var(--chat-form-focus-shadow,  color-mix(in srgb, var(--chat-primary, #667eea) 18%, transparent));
    --_form-accent:       var(--chat-form-accent,        var(--chat-primary,     #667eea));
    --_form-btn-bg:       var(--chat-form-btn-bg,        var(--chat-primary,     #667eea));
    --_form-btn-hover-bg: var(--chat-form-btn-hover-bg,  color-mix(in srgb, var(--chat-primary, #667eea) 85%, black));
    --_form-btn-text:     var(--chat-form-btn-text,      #ffffff);
    --_form-submitted:    var(--chat-form-submitted-color,var(--chat-success, #38a169));
  }

  .chat-form {
    background: var(--_form-bg);
    border: 1px solid var(--_form-border);
    border-radius: 10px;
    padding: 20px 24px 16px;
    max-width: 480px;
    transition: background 0.3s, border-color 0.3s;
  }
  .chat-form__title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--_form-title);
    margin: 0 0 16px;
    transition: color 0.3s;
  }
  .chat-form__field {
    margin-bottom: 14px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .chat-form__label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--_form-label);
    transition: color 0.3s;
  }
  .chat-form__required {
    color: var(--_form-required);
    margin-left: 2px;
  }
  .chat-form__input,
  .chat-form__select,
  .chat-form__textarea {
    font-family: inherit;
    font-size: 0.875rem;
    color: var(--_form-input-color);
    background: var(--_form-input-bg);
    border: 1px solid var(--_form-input-border);
    border-radius: 6px;
    padding: 8px 10px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.3s, color 0.3s;
    width: 100%;
    box-sizing: border-box;
  }
  .chat-form__input:focus,
  .chat-form__select:focus,
  .chat-form__textarea:focus {
    border-color: var(--_form-focus-border);
    box-shadow: 0 0 0 3px var(--_form-focus-shadow);
  }
  .chat-form__textarea {
    resize: vertical;
    min-height: 72px;
  }
  .chat-form__checkbox-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-direction: row;
  }
  .chat-form__checkbox,
  .chat-form__radio {
    width: 15px;
    height: 15px;
    accent-color: var(--_form-accent);
    cursor: pointer;
    flex-shrink: 0;
  }
  .chat-form__radio-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .chat-form__radio-option {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    color: var(--_form-input-color);
    cursor: pointer;
    transition: color 0.3s;
  }
  .chat-form__actions {
    margin-top: 18px;
    display: flex;
    justify-content: flex-end;
  }
  .chat-form__submit {
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--_form-btn-text);
    background: var(--_form-btn-bg);
    border: none;
    border-radius: 6px;
    padding: 8px 20px;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
  }
  .chat-form__submit:hover {
    background: var(--_form-btn-hover-bg);
  }
  .chat-form__submit:active {
    opacity: 0.85;
  }
  /* Submitted state */
  .chat-form--submitted {
    position: relative;
    border-color: var(--_form-submitted);
  }
  .chat-form--submitted .chat-form__title {
    margin-bottom: 12px;
  }
  .chat-form__submitted-badge {
    position: absolute;
    top: -10px;
    right: -10px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--_form-submitted);
    color: var(--chat-surface, #fff);
    box-shadow: 0 1px 4px rgba(0,0,0,0.18);
    transition: background 0.3s;
  }
  .chat-form__summary {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .chat-form__summary-row {
    display: flex;
    gap: 8px;
    font-size: 0.8125rem;
  }
  .chat-form__summary-key {
    font-weight: 500;
    color: var(--_form-label);
    min-width: 100px;
    flex-shrink: 0;
    transition: color 0.3s;
  }
  .chat-form__summary-val {
    color: var(--_form-input-color);
    word-break: break-word;
    transition: color 0.3s;
  }
  /* Native date-picker calendar icon */
  .chat-form__input[type="date"]::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.15s, filter 0.3s;
  }
  .chat-form__input[type="date"]::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
  }
  /* Date range */
  .chat-form__date-range {
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }
  .chat-form__date-range-part {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }
  .chat-form__date-range-sublabel {
    font-size: 0.75rem;
    color: var(--_form-label);
    transition: color 0.3s;
  }
  .chat-form__date-range-sep {
    font-size: 1rem;
    color: var(--_form-label);
    padding-bottom: 8px;
    flex-shrink: 0;
    user-select: none;
    transition: color 0.3s;
  }
  /* Validation error hint */
  .chat-form__date-range-error {
    display: none;
    font-size: 0.75rem;
    color: var(--_form-required);
    margin-top: 4px;
  }
  .chat-form__date-range[data-invalid] .chat-form__date-range-error {
    display: block;
  }
`;

// ── Field HTML builders ───────────────────────────────────────────────────────

function buildFieldHtml(field: FormField, fieldId: string, i18n: FormI18n): string {
  const label = escapeHtml(field.label ?? field.name);
  const name = escapeHtml(field.name);
  const placeholder = escapeHtml(field.placeholder ?? '');
  const required = field.required ? ' required' : '';
  const requiredMark = field.required ? '<span class="chat-form__required" aria-hidden="true">*</span>' : '';

  switch (field.type) {
    case 'textarea':
      return `
        <div class="chat-form__field">
          <label class="chat-form__label" for="${fieldId}">${label}${requiredMark}</label>
          <textarea class="chat-form__textarea" id="${fieldId}" name="${name}" placeholder="${placeholder}"${required}></textarea>
        </div>`;

    case 'select': {
      const placeholder = i18n.selectPlaceholder != null
        ? `<option value="">${escapeHtml(i18n.selectPlaceholder)}</option>`
        : '';
      const options = (field.options ?? [])
        .map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
        .join('');
      return `
        <div class="chat-form__field">
          <label class="chat-form__label" for="${fieldId}">${label}${requiredMark}</label>
          <select class="chat-form__select" id="${fieldId}" name="${name}"${required}>
            ${placeholder}
            ${options}
          </select>
        </div>`;
    }

    case 'checkbox':
      return `
        <div class="chat-form__field">
          <div class="chat-form__checkbox-row">
            <input class="chat-form__checkbox" type="checkbox" id="${fieldId}" name="${name}" />
            <label class="chat-form__label" for="${fieldId}">${label}</label>
          </div>
        </div>`;

    case 'radio': {
      const options = (field.options ?? [])
        .map(
          (o, i) => `
            <label class="chat-form__radio-option">
              <input class="chat-form__radio" type="radio" name="${name}" value="${escapeHtml(o)}"${required && i === 0 ? ' required' : ''} />
              ${escapeHtml(o)}
            </label>`,
        )
        .join('');
      return `
        <div class="chat-form__field">
          <span class="chat-form__label">${label}${requiredMark}</span>
          <div class="chat-form__radio-group" role="radiogroup" aria-label="${label}">
            ${options}
          </div>
        </div>`;
    }

    case 'date-range': {
      const rangeLabels = field.rangeLabels ?? i18n.dateRangeLabels;
      const startLabel = rangeLabels ? escapeHtml(rangeLabels[0]) : '';
      const endLabel   = rangeLabels ? escapeHtml(rangeLabels[1]) : '';
      const startSubLabel = startLabel ? `<label class="chat-form__date-range-sublabel" for="${fieldId}-start">${startLabel}</label>` : '';
      const endSubLabel   = endLabel   ? `<label class="chat-form__date-range-sublabel" for="${fieldId}-end">${endLabel}</label>` : '';
      const minAttr = field.min ? ` min="${escapeHtml(field.min)}"` : '';
      const maxAttr = field.max ? ` max="${escapeHtml(field.max)}"` : '';
      const errorHtml = i18n.dateRangeError != null
        ? `<span class="chat-form__date-range-error">${escapeHtml(i18n.dateRangeError)}</span>`
        : '';
      return `
        <div class="chat-form__field">
          <span class="chat-form__label">${label}${requiredMark}</span>
          <div class="chat-form__date-range" data-range-field="${name}">
            <div class="chat-form__date-range-part">
              ${startSubLabel}
              <input class="chat-form__input" type="date" id="${fieldId}-start"
                name="${name}__start"${minAttr}${maxAttr}${required} />
            </div>
            <span class="chat-form__date-range-sep" aria-hidden="true">→</span>
            <div class="chat-form__date-range-part">
              ${endSubLabel}
              <input class="chat-form__input" type="date" id="${fieldId}-end"
                name="${name}__end"${minAttr}${maxAttr}${required} />
            </div>
          </div>
          ${errorHtml}
        </div>`;
    }

    default: {
      const type = escapeHtml(field.type);
      return `
        <div class="chat-form__field">
          <label class="chat-form__label" for="${fieldId}">${label}${requiredMark}</label>
          <input class="chat-form__input" type="${type}" id="${fieldId}" name="${name}" placeholder="${placeholder}"${required} />
        </div>`;
    }
  }
}

// ── Custom Element ────────────────────────────────────────────────────────────

class ChatFormElement extends HTMLElement {
  static get observedAttributes() {
    return ['data'];
  }

  private _shadow: ShadowRoot;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    this._render();
  }

  private _parse(): { schema: FormSchema; formId: string } | null {
    const raw = this.getAttribute('data') ?? '';
    if (!raw) return null;
    try {
      const schema = JSON.parse(raw) as FormSchema;
      const formId = schema.id ?? this.getAttribute('data-form-id') ?? nextFormId();
      return { schema, formId };
    } catch {
      return null;
    }
  }

  private _render() {
    const parsed = this._parse();
    if (!parsed) {
      const raw = this.getAttribute('data') ?? '';
      this._shadow.innerHTML = `<style>${FORM_STYLES}</style>${renderCodeFallback('form', raw)}`;
      return;
    }

    const { schema, formId } = parsed;
    const i18n: FormI18n = schema.i18n ?? {};
    const title = schema.title ?? '';
    const submitLabel = schema.submitLabel ?? i18n.submitLabel ?? '';

    const fieldsHtml = (schema.fields ?? [])
      .map((field, i) => buildFieldHtml(field, `${formId}-field-${i}`, i18n))
      .join('');

    this._shadow.innerHTML = `
      <style>${FORM_STYLES}</style>
      <div class="chat-form">
        ${title ? `<h3 class="chat-form__title">${escapeHtml(title)}</h3>` : ''}
        <form id="${escapeHtml(formId)}" novalidate>
          ${fieldsHtml}
          <div class="chat-form__actions">
            <button type="submit" class="chat-form__submit">${escapeHtml(submitLabel)}</button>
          </div>
        </form>
      </div>`;

    const formEl = this._shadow.querySelector('form');
    formEl?.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      if (!formEl.reportValidity()) return;
      this._handleSubmit(formEl, formId, schema);
    });
  }

  private _handleSubmit(formEl: HTMLFormElement, formId: string, schema: FormSchema) {
    const title = schema.title ?? '';
    // Validate date-range fields: end must not be before start.
    let hasDateRangeError = false;
    for (const field of schema.fields ?? []) {
      if (field.type !== 'date-range') continue;
      const rangeEl = this._shadow.querySelector<HTMLElement>(`[data-range-field="${CSS.escape(field.name)}"]`);
      const start = (formEl.querySelector<HTMLInputElement>(`[name="${CSS.escape(field.name + '__start')}"]`)?.value ?? '');
      const end   = (formEl.querySelector<HTMLInputElement>(`[name="${CSS.escape(field.name + '__end')}"]`)?.value ?? '');
      const invalid = start && end && end < start;
      rangeEl?.toggleAttribute('data-invalid', !!invalid);
      if (invalid) hasDateRangeError = true;
    }
    if (hasDateRangeError) return;

    const data = new FormData(formEl);
    const values: Record<string, string | boolean | string[] | DateRangeValue> = {};

    for (const field of schema.fields ?? []) {
      if (field.type === 'checkbox') {
        values[field.name] = formEl.querySelector<HTMLInputElement>(`[name="${CSS.escape(field.name)}"]`)?.checked ?? false;
      } else if (field.type === 'radio') {
        values[field.name] = data.get(field.name) as string ?? '';
      } else if (field.type === 'date-range') {
        values[field.name] = {
          start: data.get(field.name + '__start') as string ?? '',
          end:   data.get(field.name + '__end')   as string ?? '',
        };
      } else {
        const all = data.getAll(field.name);
        values[field.name] = all.length > 1 ? (all as string[]) : (all[0] as string) ?? '';
      }
    }

    const detail: FormSubmitDetail = { formId, title, values };

    this.dispatchEvent(new CustomEvent<FormSubmitDetail>('form-submit', {
      bubbles: true,
      composed: true,
      detail,
    }));

    this._renderSubmitted(schema, values);
  }

  private _renderSubmitted(schema: FormSchema, values: Record<string, string | boolean | string[] | DateRangeValue>) {
    const title = schema.title ?? '';
    const i18n: FormI18n = schema.i18n ?? {};
    const fields = schema.fields ?? [];
    const summaryRows = fields
      .map((field) => {
        const val = values[field.name];
        let displayVal: string;
        if (typeof val === 'boolean') {
          displayVal = val ? (i18n.boolTrue ?? '✓') : (i18n.boolFalse ?? '✗');
        } else if (Array.isArray(val)) {
          displayVal = val.join(', ');
        } else if (val !== null && typeof val === 'object') {
          const rangeLabels = field.rangeLabels ?? i18n.dateRangeLabels;
          const startLabel = rangeLabels?.[0] ?? '';
          const endLabel   = rangeLabels?.[1] ?? '';
          const startPart = startLabel ? `${startLabel}: ${val.start || '—'}` : (val.start || '—');
          const endPart   = endLabel   ? `${endLabel}: ${val.end || '—'}`     : (val.end   || '—');
          displayVal = `${startPart}  →  ${endPart}`;
        } else {
          displayVal = String(val ?? '');
        }
        return `
          <div class="chat-form__summary-row">
            <span class="chat-form__summary-key">${escapeHtml(field.label ?? field.name)}</span>
            <span class="chat-form__summary-val">${escapeHtml(displayVal)}</span>
          </div>`;
      })
      .join('');

    this._shadow.innerHTML = `
      <style>${FORM_STYLES}</style>
      <div class="chat-form chat-form--submitted">
        ${title ? `<h3 class="chat-form__title">${escapeHtml(title)}</h3>` : ''}
        <span class="chat-form__submitted-badge" role="status" aria-live="polite">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
        <div class="chat-form__summary">${summaryRows}</div>
      </div>`;
  }
}

// Guard against double registration (HMR / multiple script loads)
if (!customElements.get('i-chat-form')) {
  customElements.define('i-chat-form', ChatFormElement);
}

// ── BlockRenderer export ──────────────────────────────────────────────────────

function renderForm(code: string, opts: RendererOptions = {}): string {
  let schema: FormSchema;
  try {
    schema = JSON.parse(code) as FormSchema;
  } catch {
    return renderCodeFallback('form', code);
  }

  const formId = schema.id ?? nextFormId();
  const safeData = escapeHtml(JSON.stringify(schema));
  const html = `<i-chat-form data="${safeData}" data-form-id="${escapeHtml(formId)}"></i-chat-form>`;

  return opts.codeToggle !== false ? wrapWithCodeToggle('form', code, html) : html;
}

/**
 * Creates a `BlockRenderer` for `form` fence blocks.
 *
 * @param options.codeToggle  Show the "view source" toggle icon on rendered
 *   forms.  Default: `true`.  Pass `{ codeToggle: false }` to disable.
 *
 * @example
 * registry.register(createFormRenderer({ codeToggle: false }))
 */
export function createFormRenderer(options: RendererOptions = {}): BlockRenderer {
  return {
    name: 'form',
    test: (lang: string) => lang === 'form',
    render: (code: string, _lang: string) => renderForm(code, options),
  };
}

/** Pre-built `BlockRenderer` with default options (code toggle enabled). */
export const formRenderer: BlockRenderer = createFormRenderer({ codeToggle: false });
