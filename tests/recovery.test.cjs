/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS harness loads SWC output with Module._compile. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const swc = require('next/dist/build/swc');
async function load() {
 const filename = path.resolve('components/Recovery.tsx');
 const code = fs.readFileSync(filename, 'utf8').replace(/^import ['"][^'"]+\.css['"];?$/gm, '');
 await swc.loadBindings();
 const compiled = await swc.transform(code, { filename, jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } }, target: 'es2022' }, module: { type: 'commonjs' } });
 const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
 mod._compile(compiled.code, filename); return mod.exports.default;
}
test('404 and failure recovery render without providers or raw exceptions', async () => {
 const Recovery = await load();
 const notFound = renderToStaticMarkup(React.createElement(Recovery, { kind: 'not-found' }));
 assert.match(notFound, /404/); assert.match(notFound, /Bu sayfayı bulamadık|We couldn&#x27;t find this page/);
 assert.match(notFound, /href="\/"/);
 const failure = renderToStaticMarkup(React.createElement(Recovery, { error: new Error('PRIVATE_SQL_SENTINEL'), onRetry() {} }));
 assert.match(failure, /Bir sorun oluştu|Something went wrong/);
 assert.match(failure, /<button[^>]+type="button"/);
 assert.doesNotMatch(failure, /PRIVATE_SQL_SENTINEL|stack|Digest/);
 assert.match(failure, /role="alert"/);
});
test('service, session and permission remain distinct', async () => {
 const Recovery = await load();
 for (const [kind, expected] of [['unavailable', /Şu anda bağlantı kuramıyoruz|connect right now/], ['unauthorized', /Devam etmek için giriş yapın|Sign in to continue/], ['forbidden', /Bu sayfaya erişim izniniz yok|permission to access/]]) {
  assert.match(renderToStaticMarkup(React.createElement(Recovery, { kind })), expected);
 }
});
