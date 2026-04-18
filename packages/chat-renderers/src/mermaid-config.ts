import type { MermaidConfig } from "mermaid";

export const DEFAULT_MERMAID_CONFIG: MermaidConfig =
{
  startOnLoad: false,
  securityLevel: 'strict',

  fontSize: 13,

  themeVariables: {
    fontSize: '13px'
  },

  // Flowchart / Graph
  flowchart: {
    padding: 10,
    nodeSpacing: 24,
    rankSpacing: 28,
    diagramPadding: 4,
    curve: 'basis'
  },

  // Sequence
  sequence: {
    height: 36,
  }
};