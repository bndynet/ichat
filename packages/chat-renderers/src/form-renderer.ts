/**
 * ```form fence-block renderer for @bndynet/ichat-messages.
 *
 * Parses JSON form schemas and renders them as <i-chat-form> elements.
 * The <i-chat-form> custom element (form UI, validation, submission) lives
 * in chat-form.ts to keep this file focused on BlockRenderer registration.
 */
import type { BlockRenderer } from '@bndynet/ichat-messages';
import { renderCodeFallback, wrapWithCodeToggle, type RendererOptions } from '@bndynet/ichat-messages';
import './chat-form.js';

export type FormFieldType = 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date-range';

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string | boolean;
  min?: string;
  max?: string;
  rangeLabels?: [string, string];
}

export interface FormI18n {
  selectPlaceholder?: string;
  dateRangeLabels?: [string, string];
  dateRangeError?: string;
  submitLabel?: string;
  boolTrue?: string;
  boolFalse?: string;
}

export interface FormSchema {
  id?: string;
  title?: string;
  submitLabel?: string;
  i18n?: FormI18n;
  fields: FormField[];
  /** Pre-filled submitted values — renders the submitted summary instead of the interactive form. */
  submittedValues?: Record<string, unknown>;
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

let formCounter = 0;

function nextFormId(): string {
  return `chat-form-${++formCounter}`;
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderForm(code: string, opts: RendererOptions = {}): string {
  let schema: FormSchema;
  try {
    schema = JSON.parse(code) as FormSchema;
  } catch {
    return renderCodeFallback('form', code);
  }

  const formId = schema.id ?? nextFormId();
  const safeData = escapeAttr(JSON.stringify(schema));

  let attrs = `data="${safeData}" data-form-id="${escapeAttr(formId)}"`;
  if (schema.submittedValues) {
    attrs += ` submitted-values="${escapeAttr(JSON.stringify(schema.submittedValues))}"`;
  }

  const html = `<i-chat-form ${attrs}></i-chat-form>`;
  return opts.codeToggle !== false ? wrapWithCodeToggle('form', code, html) : html;
}

export function createFormRenderer(options: RendererOptions = {}): BlockRenderer {
  return {
    name: 'form',
    trusted: true,
    test: (lang: string) => lang === 'form',
    render: (code: string, _lang: string) => renderForm(code, options),
  };
}

export const formRenderer: BlockRenderer = createFormRenderer({ codeToggle: false });
