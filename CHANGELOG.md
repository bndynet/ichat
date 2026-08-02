# Changelog

All notable changes to this project are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- Opt-in `config.virtualScroll` support backed by `@lit-labs/virtualizer`, with
  lazy loading, variable-height measurement, deterministic off-screen
  navigation, and automatic fallback to the existing keyed list.
- A real-browser virtual-list benchmark covering 100, 1,000, and 10,000
  messages, bounded DOM size, message/part navigation, and bottom anchoring.
- An interactive Virtual Scrolling demo with data-size switching, regular-list
  comparison, mounted DOM metrics, and a variable-height streaming update.
- Async `BlockRenderer` implementations receive an optional fourth
  `context` argument containing a lifecycle `AbortSignal`.
- Renderer failures emit a bubbling, composed `chat-renderer-error` event for
  optional logging and observability.
- Browser regression coverage now verifies the official Chart and Mermaid
  renderers against the terminal sanitisation and trusted-renderer pipeline.

### Changed

- Async block renderers start on the terminal render instead of once per
  streaming snapshot. A trusted synchronous placeholder may still be shown
  while streaming.
- Untrusted async renderer output is sanitised before it is inserted. Renderers
  that intentionally return audited application-owned custom elements may opt
  into the existing `trusted: true` contract.
- `<i-chat-text-part>` resolves async block output automatically. Manual
  `resolveAsyncBlocks(container)` calls remain safe and now return resolution
  counts for diagnostics.

### Fixed

- Virtualized message lists no longer inherit CSS smooth scrolling, preventing
  scrollbar dragging from fighting item-position corrections on long histories.
- Virtualized messages and date separators retain the same full content width
  and horizontal padding as the regular keyed list.
- Explicit message/part navigation is no longer undone by a delayed automatic
  bottom anchor, and parts inside tall off-screen messages finish in view.
- Switching between regular and virtual rendering preserves the first visible
  message, while virtual lists now expose new-content affordances away from the
  bottom.
- The Chromium virtual-list benchmark now compiles component Sass correctly,
  receives a measurable flex viewport, and fails fast on stalled layouts.
- A throwing block or string-part renderer no longer breaks the whole message;
  the source is escaped and rendered as a safe fallback.
- Stale async results can no longer overwrite a newer render pass or mutate a
  component after it disconnects.
- Throwing renderer match functions are isolated so later matching renderers
  can still run.

### Compatibility

- Virtual scrolling defaults to `false`, so existing DOM structure, scroll
  behaviour, and state retention are unchanged unless a consumer opts in.
- Existing three-argument `renderAsync(code, language, info)` implementations
  remain source compatible; handling `context.signal` is optional.
- The official Chart and Mermaid renderers already declare `trusted: true` and
  require no consumer configuration.
- Consumers that explicitly type `resolveAsyncBlocks()` as `Promise<void>`
  should remove that annotation or adopt its new result type.
