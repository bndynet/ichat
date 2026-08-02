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
DOMPurify pass. Those costs require browser instrumentation and should be added
when PR2 introduces the safe streaming pipeline.

Results are intentionally informational rather than a hard CI threshold because
absolute timings vary by machine. Use the same runtime and hardware when
comparing implementation branches.
