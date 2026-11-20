'use strict';
const test = require('node:test');
const assert = require('node:assert');
const sdk = require('../src/index.js');
const { Client, segments } = sdk;

function fakeFetch(status, body, seen) {
  return async (url, init) => { seen.push({ url, init }); return { status, text: async () => JSON.stringify(body) }; };
}
const OK = { success: true, message_id: 7, status: 'pending', sender_id: 'TEST', total_recipients: 2,
  segments_per_message: 1, credits_deducted: 2, balance_remaining: 98 };

test('send posts JSON with auth headers', async () => {
  const seen = [];
  const r = await new Client('TEST', 'k1', { fetch: fakeFetch(200, OK, seen) }).send(['0712345678', '0722000111'], 'Hi');
  assert.strictEqual(seen[0].url, 'https://sms.macrasms.com/api/v1/');
  assert.strictEqual(seen[0].init.method, 'POST');
  assert.strictEqual(seen[0].init.headers.Authorization, 'Bearer k1');
  assert.strictEqual(seen[0].init.headers['X-Sender-Id'], 'TEST');
  assert.deepStrictEqual(JSON.parse(seen[0].init.body), { recipients: '0712345678,0722000111', message_text: 'Hi' });
  assert.ok(!seen[0].url.includes('k1'));
  assert.strictEqual(r.messageId, 7);
  assert.strictEqual(r.balanceRemaining, 98);
});

test('balance and status', async () => {
  const seen = [];
  assert.strictEqual(await new Client('T', 'k', { fetch: fakeFetch(200, { success: true, balance: 41 }, seen) }).balance(), 41);
  const st = await new Client('T', 'k', { fetch: fakeFetch(200, { success: true, message_id: 5, sender_id: 'T', status: 'sent',
    total_recipients: 1, successful_count: 1, failed_count: 0, created_at: 'x', sent_at: 'y' }, seen) }).messageStatus(5);
  assert.ok(seen[0].url.endsWith('/balance/'));
  assert.ok(seen[1].url.endsWith('/messages/?id=5'));
  assert.strictEqual(st.status, 'sent');
});

test('errors map to classes', async () => {
  const cases = [[400, sdk.ValidationError], [401, sdk.AuthenticationError], [402, sdk.InsufficientBalanceError],
    [403, sdk.AccountSuspendedError], [404, sdk.NotFoundError], [429, sdk.RateLimitError], [500, sdk.ApiError]];
  for (const [code, Cls] of cases) {
    const c = new Client('T', 'k', { fetch: fakeFetch(code, { success: false, error: 'e', required: 4, available: 1, retry_after: 6 }, []) });
    await assert.rejects(c.send('0712345678', 'x'), (e) => e instanceof Cls && e.status === code);
  }
  const c = new Client('T', 'k', { fetch: fakeFetch(402, { success: false, error: 'e', required: 4, available: 1 }, []) });
  await assert.rejects(c.send('0712345678', 'x'), (e) => e.required === 4 && e.available === 1);
});

test('network error', async () => {
  const c = new Client('T', 'k', { fetch: async () => { throw new Error('down'); } });
  await assert.rejects(c.balance(), sdk.ApiError);
});

test('segments match the server (vectors from the PHP code)', () => {
  for (const v of require('./segment_vectors.json')) assert.strictEqual(segments(v.text), v.segments, v.text.slice(0, 30));
});

test('ESM entry exports the same API', async () => {
  const m = await import('../src/index.mjs');
  assert.strictEqual(typeof m.Client, 'function');
  assert.strictEqual(m.segments('a'.repeat(161)), 2);
});
