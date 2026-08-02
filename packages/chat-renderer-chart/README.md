# @bndynet/ichat-renderer-chart

Chart fenced-code renderer for iChat. Renders ````chart` fence blocks as interactive chart visualizations via `@bndynet/icharts`.

## Install

```bash
npm install @bndynet/ichat-renderer-chart
```

## Usage

Import **before** the first `<i-chat>` element connects to the DOM — auto-registers on import:

```typescript
import '@bndynet/ichat-renderer-chart';
```

Or register manually with custom options:

```typescript
import { registerCodeRenderer } from '@bndynet/ichat';
import { createChartRenderer } from '@bndynet/ichat-renderer-chart';

registerCodeRenderer(createChartRenderer({ codeToggle: false }));
```

## Fence format

````markdown
```chart
{"type":"bar","data":{"categories":["Q1","Q2","Q3"],"series":[{"name":"Sales","data":[10,20,30]}]},"options":{"title":"Sales"}}
```
````

Supported chart types: `bar`, `line`, `area`, `pie`, `gauge`.

## API

| Export | Description |
|---|---|
| `chartRenderer` | Pre-built `BlockRenderer` (code toggle on) |
| `createChartRenderer(opts?)` | Factory with customizable `RendererOptions` |
| `chartPlugin` | markdown-it plugin (for `md.use()`) |
| `ChartInput` | TypeScript type for chart JSON shape |

## Peer dependencies

| Package | Version |
|---|---|
| `@bndynet/ichat-messages` | `^3.1.0` |
| `markdown-it` | `>=14` |

The renderer uses the library's audited `trusted: true` path so the `<i-chart>`
custom element is preserved. JSON values are escaped before they are written to
HTML attributes; consumers do not need to change the renderer security config.

## License

MIT
