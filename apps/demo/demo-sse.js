/**
 * Simulates realistic SSE (text/event-stream): JSON in data: lines, split across random "TCP" chunks.
 * Uses @bndynet/sse-parser (window.ssep) for spec-compliant parsing.
 * Exposes global DemoSSE for demo.js.
 */
(function (global) {
  if (!global.ssep) {
    console.error('[demo-sse] @bndynet/sse-parser (window.ssep) not found — load index.global.js before demo-sse.js');
    return;
  }

  var SSEParser = global.ssep.SSEParser;

  /**
   * Split a full SSE string into variable-size fragments (simulates network packets).
   */
  function splitIntoNetworkChunks(str, minC, maxC) {
    var out = [];
    var i = 0;
    minC = Math.max(1, minC);
    maxC = Math.max(minC, maxC);
    while (i < str.length) {
      var len = minC + Math.floor(Math.random() * (maxC - minC + 1));
      len = Math.min(len, str.length - i);
      out.push(str.slice(i, i + len));
      i += len;
    }
    return out;
  }

  /**
   * Create a push parser backed by ssep.SSEParser.
   * Returns { push(chunk) -> Array } where each item is a parsed JSON event object
   * or { done: true } for the [DONE] sentinel.
   */
  function createParser() {
    var pending = [];

    var parser = new SSEParser({
      onEvent: function (evt) {
        if (evt.data === '[DONE]') {
          pending.push({ done: true });
          return;
        }
        try {
          pending.push(JSON.parse(evt.data));
        } catch (e) {
          console.warn('[demo-sse] invalid JSON in data:', evt.data.slice(0, 80));
        }
      },
    });

    return {
      push: function (chunk) {
        parser.feed(chunk);
        var out = pending.slice();
        pending.length = 0;
        return out;
      },
    };
  }

  global.DemoSSE = {
    splitIntoNetworkChunks: splitIntoNetworkChunks,
    createParser: createParser,
  };
})(typeof window !== 'undefined' ? window : globalThis);
