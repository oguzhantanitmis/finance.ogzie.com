import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boundedDbUrl } from '../lib/db-timeouts.ts';
test('connection, pool and query all terminate while preserving TLS and pool size', () => {
 const url = new URL(boundedDbUrl('postgresql://fixture:fixture@invalid/db?sslmode=require&connection_limit=7&socket_timeout=0'));
 assert.equal(url.searchParams.get('connect_timeout'), '5');
 assert.equal(url.searchParams.get('pool_timeout'), '5');
 assert.equal(url.searchParams.get('socket_timeout'), '15');
 assert.equal(url.searchParams.get('sslmode'), 'require');
 assert.equal(url.searchParams.get('connection_limit'), '7');
 assert.equal(new URL(boundedDbUrl('postgresql://fixture:fixture@invalid/db?socket_timeout=3')).searchParams.get('socket_timeout'), '3');
});

test('DB failure redaction preserves error identity and codes without leaking diagnostics', async () => {
 const { sanitizeDbFailure } = await import('../lib/db-timeouts.ts');
 class DatabaseFailure extends Error {}
 const failure = Object.assign(new DatabaseFailure('PRIVATE_SQL_SENTINEL'), { code: 'P2002', meta: { message: 'PRIVATE_SQL_SENTINEL' }, cause: new Error('PRIVATE_SQL_SENTINEL') });
 const redacted = sanitizeDbFailure(failure);
 assert.ok(redacted instanceof DatabaseFailure); assert.equal(redacted.code, 'P2002');
 assert.equal(redacted.message, 'Bir sorun oluştu'); assert.equal(redacted.stack, undefined);
 assert.doesNotMatch(JSON.stringify(redacted), /PRIVATE_SQL_SENTINEL/);
 const outage = Object.assign(new Error('PRIVATE_DB_SENTINEL'), { name: 'PrismaClientInitializationError' });
 const unavailable = sanitizeDbFailure(outage);
 assert.equal(unavailable.code, 'P1001'); assert.match(unavailable.message, /Şu anda bağlantı kuramıyoruz/);
});
