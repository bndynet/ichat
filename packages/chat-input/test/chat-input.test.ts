/**
 * API-surface tests for `<i-chat-input>`.
 *
 * Verifies module imports, custom element registration, constructor,
 * and default property values without a DOM environment.
 *
 * Full DOM interaction tests (send/cancel, voice, auto-resize)
 * require a browser — use Playwright or @web/test-runner.
 */

import assert from 'node:assert/strict';
import '../src/components/chat-input.js';

// Module & registration
assert.ok(customElements.get('i-chat-input'), 'i-chat-input should be registered');

const Ctor = customElements.get('i-chat-input')!;
assert.doesNotThrow(() => new Ctor(), 'constructor should not throw');

// Default property values
const el = new Ctor() as HTMLElement & Record<string, unknown>;
assert.equal(el.placeholder, '');
assert.equal(el.locale, '');
assert.equal(el.streaming, false);
assert.equal(el.busy, false);
assert.equal(el.disabled, false);
assert.equal(el.showVoiceInput, true);
assert.equal(el.voiceDiagnostics, false);

// Busy blocks programmatic submission at the same guard used by click/Enter.
{
  const input = new Ctor() as HTMLElement & {
    busy: boolean;
    setValue(value: string): void;
    _submit(): void;
  };
  let sends = 0;
  input.addEventListener('send', () => { sends += 1; });

  input.setValue('hello');
  input.busy = true;
  input._submit();
  assert.equal(sends, 0);

  input.busy = false;
  input._submit();
  assert.equal(sends, 1);
}
