import { rendererRegistry } from "@bndynet/ichat-messages";
import { chartRenderer } from "./chart-renderer.js";

// Auto-register on import — no manual setup needed.
rendererRegistry.register(chartRenderer);

export type { ChartInput } from "./chart-renderer.js";
export {
  chartRenderer,
  chartPlugin,
  createChartRenderer,
} from "./chart-renderer.js";

// Re-export shared renderer utilities from @bndynet/ichat-messages
export type { RendererOptions } from "@bndynet/ichat-messages";
export {
  CHAT_TOGGLE_SOURCE_CLASS,
  renderCodeFallback,
  wrapWithCodeToggle,
} from "@bndynet/ichat-messages";
