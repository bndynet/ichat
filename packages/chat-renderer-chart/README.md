# @bndynet/ichat-renderer-chart

Chart fenced-code renderer for iChat. Renders ````chart` fence blocks as interactive chart visualizations via `@bndynet/icharts`.

## Install

```bash
npm install @bndynet/ichat-renderer-chart
```

## Usage

Register **before** the first `<i-chat>` element connects to the DOM:

```typescript
import { registerCodeRenderer } from '@bndynet/ichat';
import { chartRenderer } from '@bndynet/ichat-renderer-chart';

registerCodeRenderer(chartRenderer);
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
| `chartRenderer` | Pre-built `BlockRenderer` (code toggle off) |
| `createChartRenderer(opts?)` | Factory with customizable `RendererOptions` |
| `chartPlugin` | markdown-it plugin (for `md.use()`) |
| `ChartInput` | TypeScript type for chart JSON shape |

## Peer dependencies

| Package | Version |
|---|---|
| `@bndynet/ichat-messages` | `^2.1.1` |
| `markdown-it` | `>=14` |

## License

MIT
