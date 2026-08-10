# LaTeX Math (ichat-renderer-katex)

Install and import `@bndynet/ichat-renderer-katex` before rendering LaTeX content. The package may be loaded from the application entry or lazily with a route, and auto-registers `markdown-it-katex` with chat-friendly CSS and KaTeX font declarations.

```bash
npm install @bndynet/ichat-renderer-katex
```

```typescript
// Application entry or lazy route module — auto-registers on import
import "@bndynet/ichat-renderer-katex";
```

That's it. `$...$` for inline math and `$$...$$` for display math just work in subsequent chat renders.
