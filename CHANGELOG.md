# Changelog

All notable changes to this project are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## Unreleased

### Added

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

- A throwing block or string-part renderer no longer breaks the whole message;
  the source is escaped and rendered as a safe fallback.
- Stale async results can no longer overwrite a newer render pass or mutate a
  component after it disconnects.
- Throwing renderer match functions are isolated so later matching renderers
  can still run.

### Compatibility

- Existing three-argument `renderAsync(code, language, info)` implementations
  remain source compatible; handling `context.signal` is optional.
- The official Chart and Mermaid renderers already declare `trusted: true` and
  require no consumer configuration.
- Consumers that explicitly type `resolveAsyncBlocks()` as `Promise<void>`
  should remove that annotation or adopt its new result type.
