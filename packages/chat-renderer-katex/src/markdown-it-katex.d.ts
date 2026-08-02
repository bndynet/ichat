declare module 'markdown-it-katex' {
  import type MarkdownIt from 'markdown-it';
  interface KatexOptions {
    output?: 'html' | 'mathml' | 'htmlAndMathml';
    throwOnError?: boolean;
    errorColor?: string;
    displayMode?: boolean;
    [key: string]: unknown;
  }
  const mk: (md: MarkdownIt, options?: KatexOptions) => void;
  export default mk;
}
