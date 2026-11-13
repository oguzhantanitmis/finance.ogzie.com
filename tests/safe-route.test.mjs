import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeRoute } from '../lib/safe-route.ts';
test('service failure is 503, no identity loss or raw body, no write replay', async () => {
 let writes = 0;
 const read = safeRoute(async () => { throw Object.assign(new Error('PRIVATE_SQL_SENTINEL'), { code: 'P1001' }); });
 const response = await read(new Request('https://fixture.invalid/api'));
 assert.equal(response.status, 503); assert.equal(response.headers.get('set-cookie'), null);
 assert.doesNotMatch(await response.text(), /PRIVATE_SQL_SENTINEL/);
 const post = safeRoute(async () => { writes++; return Response.json({ error: 'PRIVATE_SQL_SENTINEL', stack: 'PRIVATE_SQL_SENTINEL' }, { status: 500 }); });
 const result = await post(new Request('https://fixture.invalid/api', { method: 'POST' }));
 assert.equal(result.status, 500); assert.equal(writes, 1);
 const body = await result.json(); assert.equal(body.outcome, 'unknown'); assert.doesNotMatch(JSON.stringify(body), /PRIVATE_SQL_SENTINEL/);
});
test('401, 403, 404, 429 and successful envelopes keep their actual status and body', async () => {
 for (const status of [200, 401, 403, 404, 429]) {
  const result = await safeRoute(async () => Response.json({ code: 'FIXTURE' }, { status, headers: { 'Retry-After': '30' } }))(new Request('https://fixture.invalid/api'));
  assert.equal(result.status, status); assert.deepEqual(await result.json(), { code: 'FIXTURE' }); assert.equal(result.headers.get('Retry-After'), '30');
 }
});
test('signed integration errors keep their documented envelope and redact thrown failures', async () => {
 const request = new Request('https://fixture.invalid/api/ogzie-sync', { method: 'POST' });
 const configured = await safeRoute(async () => Response.json({ ok: false, error: 'not_configured' }, { status: 500 }), { errorEnvelope: 'ogzie' })(request);
 assert.equal(configured.status, 500);
 assert.deepEqual(await configured.json(), { ok: false, error: 'not_configured' });
 const failed = await safeRoute(async () => { throw Object.assign(new Error('PRIVATE_SQL_SENTINEL'), { code: 'P1001' }); }, { errorEnvelope: 'ogzie' })(request);
 assert.equal(failed.status, 503);
 assert.deepEqual(await failed.json(), { ok: false, error: 'service_unavailable', outcome: 'unknown' });
});
