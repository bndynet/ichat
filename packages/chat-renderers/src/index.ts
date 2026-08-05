export type { BlockRenderer } from '@bndynet/ichat-messages';

import { rendererRegistry } from '@bndynet/ichat-messages';
import { kpiRenderer, kpisRenderer } from './kpi-renderer.js';
import { formRenderer } from './form-renderer.js';

// Auto-register on import — no manual setup needed.
rendererRegistry.register(kpiRenderer);
rendererRegistry.register(kpisRenderer);
rendererRegistry.register(formRenderer);

export {
  kpiRenderer,
  kpisRenderer,
  createKpiRenderer,
  createKpisRenderer,
} from './kpi-renderer.js';

export type {
  FormSchema,
  FormField,
  FormFieldType,
  FormI18n,
  FormSubmitDetail,
  DateRangeValue,
} from './form-renderer.js';
export { formRenderer, createFormRenderer } from './form-renderer.js';

// Re-export shared renderer utilities from @bndynet/ichat-messages
export type { RendererOptions } from '@bndynet/ichat-messages';
export {
  CHAT_TOGGLE_SOURCE_CLASS,
  renderCodeFallback,
  wrapWithCodeToggle,
} from '@bndynet/ichat-messages';
