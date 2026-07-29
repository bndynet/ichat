# LaTeX Math (markdown-it-katex)

Use the standard `markdown-it-katex` plugin via `registerMarkdownPlugin`. Keep CSS minimal to avoid conflicts with chat bubble styles.

```typescript
import { registerMarkdownPlugin } from '@bndynet/ichat';
import mk from 'markdown-it-katex';

registerMarkdownPlugin({
  id: 'latex',
  install: mk,
  styles: `
    .katex { font-size: 1.1em; }
    .katex .katex-html { max-width: 100%; overflow: hidden; }
    .katex .hide-tail { overflow: hidden; position: relative; display: inline-block; width: 100%; }
    .katex-display { margin: 1em 0; overflow-x: auto; overflow-y: hidden; }
    .katex-display > .katex { max-width: 100%; display: inline-block; }
  `,
  globalStyles: `
    @font-face { font-family: KaTeX_Main; src: url(...) format('woff2'); }
  `,
});
```
