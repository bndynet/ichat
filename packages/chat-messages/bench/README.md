# Streaming Markdown Benchmark

Run from the repository root:

```sh
npm run benchmark:streaming
```

The benchmark simulates one second of streaming by rendering 15, 30, and 60
incremental snapshots for 2, 10, and 50 KiB plain-text and mixed-Markdown
messages. It performs two warm-up runs and reports seven measured runs.

For 10 and 50 KiB mixed-Markdown messages at 60 updates/s, it also alternates
the secure URI validator with the legacy `validateLink = () => true` behavior
in the same process. This isolates the cost of PR2's protocol checks from normal
run-to-run benchmark noise.

This is a repeatable computational baseline for `renderMarkdownLight`. It does
not include browser `innerHTML`/DOM patching, layout, painting, or the terminal
DOMPurify pass; use the browser benchmark below for those costs.

Results are intentionally informational rather than a hard CI threshold because
absolute timings vary by machine. Use the same runtime and hardware when
comparing implementation branches.

## Browser benchmark

Run the real DOM benchmark from the repository root:

```sh
npm run benchmark:streaming:browser
```

Open `http://127.0.0.1:4178/`. The benchmark starts automatically and covers
the same 18 content-size/update-rate scenarios in a real browser. It measures
Markdown parsing, `innerHTML` plus forced layout, terminal DOMPurify + morphdom,
dropped frames, and Long Task API entries. Each scenario's first stream-sized
snapshot is warmed once before measurement so module initialisation and initial
style calculation do not distort steady-state percentiles or manufacture a
large pre-measurement GC burst. It applies the production adaptive cadence,
so the report also shows rendered updates versus source updates. The page exposes its JSON report as
`window.__ICHAT_BENCHMARK__` and renders it under “JSON report”.

After the matrix, a real `i-chat-text-part` smoke check verifies that a
coalesced update is flushed within 150 ms and that the terminal Markdown render
is immediate. This protects the timer/lifecycle integration in addition to the
pure cadence policy.

After the isolated performance matrix, renderer runtime checks verify sync and
string-part error fallbacks, `chat-renderer-error` events, async sanitisation,
official Chart/Mermaid trusted-renderer compatibility, stale-result rejection,
and disconnect cancellation in a real browser.

Budgets are intentionally user-visible and hardware-tolerant:

- p95 streaming parse + DOM update at or below 16.7 ms for 2/10 KiB and
  40 ms for the synthetic 50 KiB stress case;
- at least 95% of rendered updates within the applicable update budget;
- streaming parse + DOM work at or below 40% of the scenario duration;
- at most 5% dropped frames, no Long Tasks for 2/10 KiB, and at most one for
  the 50 KiB stress case;
- terminal render at or below 50 ms for 2/10 KiB and 100 ms for 50 KiB.

Build the standalone benchmark page with:

```sh
npm run benchmark:streaming:browser:build
```
