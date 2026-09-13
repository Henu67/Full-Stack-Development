import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeRegex } from '../src/controllers/friendController.js';

test('escapeRegex leaves plain text unchanged', () => {
  assert.equal(escapeRegex('john'), 'john');
});

test('escapeRegex escapes regex special characters', () => {
  assert.equal(escapeRegex('a.b*c'), 'a\\.b\\*c');
});

test('escapeRegex neutralizes a ReDoS-style pattern', () => {
  const input = '(a+)+$';
  const escaped = escapeRegex(input);
  assert.doesNotMatch(escaped, /^\(a\+\)\+\$$/); // sanity: it's escaped, not passed through raw
  assert.equal(escaped, '\\(a\\+\\)\\+\\$');
});