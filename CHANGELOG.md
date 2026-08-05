# Changelog

All notable changes to this project are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- `<i-chat>` now exposes a read-only `busy` state, reflected through the `busy`
  and `aria-busy` host attributes, plus a bubbling `busy-change` event for
  custom composers.
- `<i-chat-input>` accepts a `busy` property that blocks send and voice input
  while leaving the textarea available for the next draft.
- Async `BlockRenderer` implementations receive an optional fourth
  `context` argument containing a lifecycle `AbortSignal`.
- Renderer failures emit a bubbling, composed `chat-renderer-error` event for
  optional logging and observability.
- Browser regression coverage now verifies the official Chart and Mermaid
  renderers against the terminal sanitisation and trusted-renderer pipeline.
- `ChatMutationOutcome` reports whether a message-array mutation `changed`
  anything and whether a controlled host `accepted` the proposal. Every
  `ChatRunController` lifecycle method returns it.

### Changed

- `ChatRunController` only advances its lifecycle once the underlying mutation
  is accepted. A controlled host that rejects a proposal with `preventDefault()`
  leaves a rejected `start()` in `idle` and a rejected
  `complete()` / `fail()` / `cancel()` in `streaming`, so the call can be
  retried. A no-op — for example completing a message the host has already
  removed — is not a rejection and still reaches the terminal state.
- `ChatRunController.cancel()` now commits the cancellation before invoking the
  `onCancel` option, and skips the callback entirely when the host rejects the
  cancellation. Hosts that relied on `onCancel` firing before `messages-change`
  see the reverse order.
- `ChatRunController` lifecycle methods return `ChatMutationOutcome` instead of
  `void`; `ChatMessageStore` mutations do the same, replacing the `boolean`
  previously returned by `cancelMessage()` (its old value is now
  `outcome.changed`).

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

- A controlled host rejecting a `ChatRunController` proposal no longer leaves the
  run and the message array in conflicting states — a rejected `start()` used to
  report `streaming` with no message to write to, and a rejected `complete()`
  used to report `completed` while the message stayed `streaming` forever.
- `ChatRunController.signal` is aborted when first read after the run has already
  ended; it previously returned a fresh, unaborted signal.
- Duplicate sends are blocked while asynchronous `beforeSend` middleware is
  pending, and the submission lock is always released on drop or failure.
- A throwing block or string-part renderer no longer breaks the whole message;
  the source is escaped and rendered as a safe fallback.
- Stale async results can no longer overwrite a newer render pass or mutate a
  component after it disconnects.
- Throwing renderer match functions are isolated so later matching renderers
  can still run.
- A streamed reply is no longer stuck at the typewriter position when an earlier
  message already rendered the same text under the same part id. The shared
  markdown content cache used to short-circuit the terminal render and restore
  the partial streaming HTML, truncating the bubble permanently.
- Type-only re-exports from `@bndynet/ichat-messages` are marked `export type`,
  so consuming the package as unbundled source (e.g. a Vite dev server) no longer
  fails with a missing runtime export.

### Compatibility

- Existing three-argument `renderAsync(code, language, info)` implementations
  remain source compatible; handling `context.signal` is optional.
- The official Chart and Mermaid renderers already declare `trusted: true` and
  require no consumer configuration.
- Consumers that explicitly type `resolveAsyncBlocks()` as `Promise<void>`
  should remove that annotation or adopt its new result type.
- Ignoring the new `ChatRunController` return values stays source compatible, and
  uncontrolled mode behaves exactly as before because every mutation is accepted.
- Custom `ChatMessageStorePort` implementations may keep returning `void`; it is
  treated as accepted.
