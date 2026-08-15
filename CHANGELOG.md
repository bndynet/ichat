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
- Virtual scrolling for long histories through `config.virtualScroll`
  (`true` / `false` / `'auto'`). `@lit-labs/virtualizer` is loaded lazily the
  first time it is needed, so short conversations never pay for it, and the
  regular keyed list remains the automatic fallback if the import fails.
  `scrollToMessage()` / `scrollToPart()` reach rows that are not mounted. See
  [Optional virtual scrolling](docs/component-api.md#optional-virtual-scrolling).

### Changed

- `<i-chat>` keeps the default composer and custom `slot="input"` content
  mounted while a composer interaction is active, hiding and inerting the
  composer instead of removing it. Default composer drafts now survive
  confirmations, and active voice recognition stops when an interaction takes
  over the composer area. Every queued confirmation receives initial focus,
  and the default composer regains focus when the interaction queue empties.
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
- The per-part Markdown cache stores rendered HTML instead of only the raw
  content, so a row that scrolls back into view is served from cache rather than
  re-running markdown-it, DOMPurify, and its block renderers. Retention is capped
  by a character budget and evicts least-recently-used parts, replacing growth
  that was previously unbounded. Two consequences for renderer authors: `BlockRenderer` output is
  cached per part content rather than per element instance, so a renderer whose
  output varies for identical input is no longer re-invoked on remount; and the
  cache is keyed on the render options that affect output, so changing
  `highlightJs` or `allowedLinkProtocols` now re-renders existing parts instead of
  leaving them on the previous options.
- Corrected the documented meaning of `sequence_number`: it is carried through to
  the result but never used to order or deduplicate events, where the previous
  wording implied a guarantee that was never implemented. No behaviour changed —
  a patch replaces state, so a repeated or out-of-order event is harmless.

### Fixed

- Terminal message transitions now close out parts left mid-stream.
  `run.complete()`, `run.fail()`, `run.cancel()` and `chat.cancelMessage()`
  cleared `streaming` on the message but left `part.status` at `'streaming'`,
  which keeps `<i-chat-text-part>` on its light render path forever: the
  terminal sanitised render never runs, async block renderers stay unresolved,
  and the Markdown cache is never populated, so a virtualised row re-renders on
  every remount. Nothing was visible on screen, because the typewriter stops on
  the message-level flag. Parts still at `'pending'` / `'streaming'` now move to
  `'complete'` / `'error'` / `'cancelled'` in the same mutation that clears the
  flag, so a controlled host still sees one `messages-change` proposal per
  transition. Hosts that already patched the status by hand can drop that call;
  it stays harmless. Driving the lifecycle manually still requires doing this
  yourself — the new `finalizeMessageParts(parts, status)` export does it.
- Published packages include the MIT licence text. `npm publish -w <pkg>` packs
  from the package directory, so the repository-root LICENSE never reached a
  tarball even though every `package.json` declared `"license": "MIT"`.
  `validate:pack` now requires LICENSE alongside `package.json` and `README.md`,
  so the gap cannot reappear when a package is added.
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
- `updatePart()` no longer bypasses part validation. It shared a name and a
  purpose with `tryUpdatePart()` but not its safety: the underlying
  `patchMessagePart()` merged the patch straight into the part, so a patch could
  change a part's `id` (breaking keyed rendering and every later lookup), change
  its `type` into a shape the renderer cannot handle, or set an unknown
  tool-call `state` — and the result was committed to the authoritative message
  array. Both now run the same validation as `applyMessagePartUpdate()`. Since
  `updatePart()` returns nothing, a rejected patch is dropped and reported to the
  console; a missing message or part stays silent, because that races with
  ordinary message removal. Use `tryUpdatePart()` to receive the reason instead.
- Scrolling up during streaming is no longer undone once the virtual list
  finishes measuring its rows. The last scroll-to-bottom pass waits for layout to
  settle, so it could land long after the reader took over; it now yields to
  them, while the scroll-to-latest button and a restored bottom anchor still win.

### Compatibility

- Virtual scrolling defaults to `'auto'`, automatically enabling when messages
  exceed 500. Consumers can override with `true` (always on) or `false`
  (always off). While it is active, off-screen rows are not in the DOM, so
  browser find-in-page, selection spanning the whole history, and printing only
  cover the rendered range. Set `virtualScroll: false` if those matter more than
  large-history performance.
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
