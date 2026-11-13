import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { boundedFetch } from '../lib/request.ts';
test('deadline aborts headers/body; no POST retry; recovery preserves statuses', async () => {
 let posts = 0;
 const server = createServer((req, res) => {
  if (req.method === 'POST') { posts++; return; }
  if (req.url === '/body') { res.writeHead(200); res.write('{'); return; }
  if (req.url === '/slow') return;
  res.writeHead(req.url === '/outage' ? 503 : 200, { 'Content-Type': 'application/json' }); res.end('{}');
 });
 server.listen(0, '127.0.0.1'); await once(server, 'listening');
 const url = `http://127.0.0.1:${server.address().port}`;
 try {
  await assert.rejects(boundedFetch(url + '/slow', {}, 60));
  const body = await boundedFetch(url + '/body', {}, 60); await assert.rejects(body.text());
  await assert.rejects(boundedFetch(url + '/write', { method: 'POST' }, 60)); assert.equal(posts, 1);
  assert.equal((await boundedFetch(url + '/outage', {}, 500)).status, 503);
  assert.equal((await boundedFetch(url + '/ready', {}, 500)).status, 200);
  const caller = new AbortController(); caller.abort();
  await assert.rejects(boundedFetch(url + '/slow', { signal: caller.signal }, 500));
 } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
