declare module 'markdown-it-katex' {
  import type MarkdownIt from 'markdown-it';
  const mk: (md: MarkdownIt) => void;
  export default mk;
}
