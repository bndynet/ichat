# @bndynet/ichat-renderers

Lightweight fenced-code renderers for iChat: KPI cards and interactive forms. No heavy third-party dependencies.

For charts and Mermaid diagrams, see the separate packages:
- [`@bndynet/ichat-renderer-chart`](../chat-renderer-chart) — Charts via @bndynet/icharts
- [`@bndynet/ichat-renderer-mermaid`](../chat-renderer-mermaid) — Mermaid diagrams

## Install

```bash
npm install @bndynet/ichat-renderers
```

## Usage

Auto-registers on import — no `registerCodeRenderer` calls needed:

```typescript
import '@bndynet/ichat-renderers';  // auto-registers kpi, kpis, form
```

## Built-in renderers

| Renderer | Fence language | Description |
|---|---|---|
| `kpiRenderer` | `kpi` | Single KPI card |
| `kpisRenderer` | `kpis` | KPI card group (horizontal strip) |
| `formRenderer` | `form` | Interactive forms with validation |

## Peer dependencies

| Package | Version |
|---|---|
| `@bndynet/ichat-messages` | `^2.1.1` |

## License

MIT
