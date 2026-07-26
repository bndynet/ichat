/**
 * API-surface tests for `<i-chat>`.
 *
 * Verifies module imports, custom element registration, constructor,
 * default property values, and key method signatures.
 *
 * Full component tests (controlled/uncontrolled, slots, confirmations,
 * ready promise, run controller) require a browser environment —
 * use Playwright or @web/test-runner.
 */

import assert from 'node:assert/strict';
import '../src/components/chat.js';

// Module & registration
assert.ok(customElements.get('i-chat'), 'i-chat should be registered');

const Ctor = customElements.get('i-chat')!;
const el = new Ctor() as HTMLElement & Record<string, unknown>;

assert.doesNotThrow(() => new Ctor(), 'constructor should not throw');

// Default property values
assert.equal(el.messageMode, 'uncontrolled');
assert.equal(el.disabled, false);
assert.equal(el.showVoiceInput, true);

// Config exists
const cfg = el.config as Record<string, unknown> | undefined;
assert.ok(cfg, 'config should exist');

// Methods exist
assert.equal(typeof el.addMessage, 'function');
assert.equal(typeof el.updateMessage, 'function');
assert.equal(typeof el.appendPart, 'function');
assert.equal(typeof el.removeMessage, 'function');
assert.equal(typeof el.clear, 'function');
assert.equal(typeof el.cancel, 'function');
assert.equal(typeof el.cancelMessage, 'function');
assert.equal(typeof el.focusInput, 'function');
assert.equal(typeof el.showError, 'function');
assert.equal(typeof el.dismissError, 'function');
assert.equal(typeof el.requestConfirmation, 'function');
assert.equal(typeof el.clearConfirmations, 'function');
assert.equal(typeof el.createRunController, 'function');
assert.equal(typeof el.registerRenderer, 'function');
assert.equal(typeof el.use, 'function');

// ready returns a Promise
assert.ok(el.ready instanceof Promise, 'ready should be a Promise');
