import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const source = await readFile(new URL('../public/recovery-sw.js', import.meta.url), 'utf8');
function worker(network) {
 const handlers = {};
 const cache = { match: async () => new Response('offline fixture') };
 runInNewContext(source, { Response, URL, AbortSignal, fetch: network, caches: { open: async () => cache }, self: { location: { origin: 'https://fixture.invalid' }, addEventListener: (type, cb) => { handlers[type] = cb; }, clients: { claim() {} } } });
 return (method, mode, path='/page') => {
  let result;
  handlers.fetch({ request: { method, mode, url: 'https://fixture.invalid'+path, signal: new AbortController().signal }, respondWith(value) { result=value; } });
  return result;
 };
}
test('offline only handles safe navigation; never POST, API fetch or RSC', async () => {
 let calls = 0; const fetch = worker(async () => { calls++; throw new TypeError('offline'); });
 assert.equal(fetch('POST', 'navigate'), undefined);
 assert.equal(fetch('GET', 'cors', '/api/secret'), undefined);
 assert.equal(fetch('GET', 'cors', '/page?_rsc=x'), undefined);
 const response = await fetch('GET', 'navigate'); assert.equal(response.status, 503); assert.equal(await response.text(), 'offline fixture'); assert.equal(calls, 1);
});
test('HTTP errors and auth responses are forwarded, not converted to success', async () => {
 for (const status of [200, 401, 403, 404, 429, 503]) {
  const original = new Response('fixture', { status });
  assert.equal(await worker(async () => original)('GET','navigate'), original);
 }
});
