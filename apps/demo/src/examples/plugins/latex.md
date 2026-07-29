# LaTeX Math (ichat-renderer-katex)

Install and import `@bndynet/ichat-renderer-katex`. The package auto-registers `markdown-it-katex` with chat-friendly CSS and KaTeX font declarations.

```bash
npm install @bndynet/ichat-renderer-katex
```

```typescript
// Auto-registers on import — no manual setup needed
import '@bndynet/ichat-renderer-katex';
```

That's it. `$...$` for inline math and `$$...$$` for display math just work inside chat messages.
