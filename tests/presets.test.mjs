import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createState } from '../model.js';
import { capturePreset, applyPreset, validateRecipe } from '../preset-model.js';
import { createApplication } from '../backend/application.mjs';
import { localStore, supabaseStore } from '../backend/storage.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('recipe preserves all controls, excludes photo-specific content, supports optional geometry', () => {
  const state = createState(); state.camera = 'dream120'; state.adjustments.light.exposure = 1.3; state.adjustments.hsl.orange.hue = 17; state.adjustments.curves.red = [.1,.3,.4,.7,.9]; state.adjustments.grading.shadows.hue = 240; state.flash.enabled = true; state.composition.rotation = 90; state.caption = 'private'; state.stickers.push({ id: 'private' });
  const recipe = capturePreset(state), next = createState(); next.seed = 999; next.caption = 'new'; next.composition.rotation = 270;
  assert.equal(recipe.composition, undefined); assert.equal(recipe.seed, undefined); assert.equal(recipe.stickers, undefined); assert.equal(recipe.caption, undefined);
  applyPreset(next, recipe); assert.deepEqual(next.adjustments, state.adjustments); assert.deepEqual(next.flash, state.flash); assert.equal(next.camera, 'dream120'); assert.equal(next.seed, 999); assert.equal(next.caption, 'new'); assert.equal(next.composition.rotation, 270);
  applyPreset(next, capturePreset(state, true)); assert.equal(next.composition.rotation, 90);
  assert.throws(() => validateRecipe({ ...recipe, version: 8 })); assert.throws(() => validateRecipe({ ...recipe, intensity: Infinity })); assert.throws(() => validateRecipe({ ...recipe, camera: 'unknown' }));
  const broken = capturePreset(state, true); broken.composition.crop.width = 3; assert.throws(() => validateRecipe(broken));
});

test('new DAZZ cameras and legacy saved cameras are both valid preset choices', () => {
  for (const camera of ['bw_classic', 'ccd_r', 'cpm35', 'd_classic', 'fisheye', 'fqs', 'fxn_r', 'grd_r', 'inst_c', 'inst_sqc', 'u300', 'classic38']) {
    const state = createState(); state.camera = camera;
    assert.equal(capturePreset(state).camera, camera);
  }
});

test('server authentication, protected assets, validation, CRUD, persistence, CSRF and revocation', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'princess-test-')), filename = path.join(directory, 'presets.json');
  const server = createApplication({ root, store: localStore(filename) }); await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(async () => { await new Promise(r => server.close(r)); await rm(directory, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const call = (url, method = 'GET', data, custom = {}) => fetch(origin + url, { method, redirect: 'manual', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', ...custom }, body: data === undefined ? undefined : JSON.stringify(data) });
  assert.equal((await call('/')).status, 302);
  for (const url of ['/app.js', '/api/presets', '/processor-worker.js', '/cameraProfiles/index.js']) assert.equal((await call(url)).status, 401);
  const loginHtml = await (await call('/login.html')).text(); assert(!loginHtml.includes('1309'));
  assert.equal((await call('/api/login', 'POST', { password: 'wrong' })).status, 401);
  assert.equal((await call('/api/login', 'POST', { password: '1309' }, { Origin: 'https://evil.example' })).status, 403);
  const login = await call('/api/login', 'POST', { password: '1309' }); assert.equal(login.status, 200);
  const header = login.headers.get('set-cookie'); assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Strict/); cookie = header.split(';')[0];
  assert.equal((await call('/')).status, 200); assert.equal((await call('/processor-worker.js')).status, 200); assert.equal((await call('/decorations.js')).status, 200);
  for (const url of ['/backend/application.mjs', '/.env', '/supabase/schema.sql', '/tests/presets.test.mjs', '/.runtime/presets.json']) assert.equal((await call(url)).status, 404);
  assert.equal((await call('/api/presets', 'POST', { name: '', recipe: capturePreset(createState()) })).status, 400);
  assert.equal((await call('/api/presets', 'POST', { name: 'bad', recipe: { version: 2 } })).status, 400);
  assert.equal((await call('/api/presets', 'POST', { name: 'x'.repeat(40000) })).status, 413);
  const created = await call('/api/presets', 'POST', { name: 'Meu sol', recipe: capturePreset(createState()), library_id: 'attacker' }); assert.equal(created.status, 201);
  const row = (await created.json()).preset; assert.equal(row.library_id, undefined);
  const created2 = await call('/api/presets', 'POST', { name: 'Minha nuvem', recipe: capturePreset(createState(), true) }); assert.equal(created2.status, 201);
  assert.equal((await (await call('/api/presets')).json()).presets.length, 2);
  assert.equal((await localStore(filename).list()).length, 2);
  assert.equal((await call(`/api/presets/${row.id}`, 'PATCH', { name: 'Sol dourado' })).status, 200);
  assert.equal((await call(`/api/presets/${row.id}`, 'DELETE', undefined, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await call(`/api/presets/${row.id}`, 'DELETE')).status, 200);
  assert.equal((await call(`/api/presets/${row.id}`, 'DELETE')).status, 404);
  assert.equal((await call('/api/logout', 'POST')).status, 200);
  assert.equal((await call('/api/presets')).status, 401);
  for (let i = 0; i < 8; i++) assert.equal((await call('/api/login', 'POST', { password: 'wrong' })).status, 401);
  assert.equal((await call('/api/login', 'POST', { password: '1309' })).status, 429);
});

test('Supabase adapter scopes requests and uses server-only API key (mock transport)', async () => {
  const requests = [], libraryId = '34964c82-2a73-41c3-b593-5953680d3571';
  const store = supabaseStore({ url: 'https://test.supabase.co', key: 'sb_secret_test', libraryId, fetcher: async (url, options) => { requests.push({ url, options }); return Response.json([{ id: 'preset' }]); } });
  await store.list(); await store.create({ name: 'Nuvem', recipe: capturePreset(createState()) }); await store.update('preset', { name: 'Lua' }); await store.remove('preset');
  for (const r of requests) { assert.equal(r.url.searchParams.get('library_id'), `eq.${libraryId}`); assert.equal(r.options.headers.apikey, 'sb_secret_test'); assert.equal(r.options.headers.Authorization, undefined); }
  assert.equal(JSON.parse(requests[1].options.body).library_id, libraryId);
  assert.equal(requests[2].url.searchParams.get('id'), 'eq.preset');
  const failed = supabaseStore({ url: 'https://test.supabase.co', key: 'sb_secret_private', libraryId, fetcher: async () => new Response('secret upstream body', { status: 500 }) });
  await assert.rejects(failed.list, e => !e.message.includes('secret'));
});

test('production requires HTTPS origin, marks cookies Secure and hides development fixtures', async t => {
  assert.throws(() => createApplication({ root, store: {}, production: true }));
  const server = createApplication({ root, store: { mode: 'supabase' }, production: true, origin: 'https://editor.example' });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); t.after(() => new Promise(r => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(base + '/api/login', { method: 'POST', headers: { Origin: 'https://editor.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ password: '1309' }) });
  assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /; Secure/);
  const Cookie = response.headers.get('set-cookie').split(';')[0];
  for (const route of ['/dev/profile-comparison', '/tests/fixtures/synthetic-scenes.png']) assert.equal((await fetch(base + route, { headers: { Cookie } })).status, 404);
});

test('signed production session works across independent serverless instances', async t => {
  const secret = 'serverless-session-secret-with-more-than-32-characters';
  const store = { mode: 'supabase', list: async () => [] };
  const first = createApplication({ root, store, production: true, dynamicOrigin: true, sessionSecret: secret });
  const second = createApplication({ root, store, production: true, dynamicOrigin: true, sessionSecret: secret });
  await Promise.all([new Promise(r => first.listen(0, '127.0.0.1', r)), new Promise(r => second.listen(0, '127.0.0.1', r))]);
  t.after(() => Promise.all([new Promise(r => first.close(r)), new Promise(r => second.close(r))]));
  const headers = { Origin: `https://127.0.0.1:${first.address().port}`, 'Content-Type': 'application/json' };
  const login = await fetch(`http://127.0.0.1:${first.address().port}/api/login`, { method: 'POST', headers, body: JSON.stringify({ password: '1309' }) });
  assert.equal(login.status, 200); const Cookie = login.headers.get('set-cookie').split(';')[0];
  const session = await fetch(`http://127.0.0.1:${second.address().port}/api/session`, { headers: { Cookie } });
  assert.equal(session.status, 200); assert.equal((await session.json()).authenticated, true);
  const tampered = Cookie.replace(/.$/, Cookie.endsWith('a') ? 'b' : 'a');
  assert.equal((await fetch(`http://127.0.0.1:${second.address().port}/api/session`, { headers: { Cookie: tampered } })).status, 401);
});

test('Supabase list loads multiple pages instead of hiding older presets (mock transport)', async () => {
  const offsets = [], store = supabaseStore({ url: 'https://test.supabase.co', key: 'sb_secret_test', libraryId: '34964c82-2a73-41c3-b593-5953680d3571', fetcher: async url => {
    const offset = Number(url.searchParams.get('offset')); offsets.push(offset);
    return Response.json(Array.from({ length: offset === 0 ? 100 : 3 }, (_, i) => ({ id: offset + i })));
  } });
  assert.equal((await store.list()).length, 103); assert.deepEqual(offsets, [0, 100]);
});
