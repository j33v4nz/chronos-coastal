import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import worker from '../index.mjs';

function environment() {
  const sqlite = new DatabaseSync(':memory:');
  const DB = {
    prepare(sql) {
      let args = [];
      const statement = {
        bind(...values) { args = values; return statement; },
        async run() { return sqlite.prepare(sql).run(...args); },
        async first() { return sqlite.prepare(sql).get(...args) ?? null; },
        async all() { return { results: sqlite.prepare(sql).all(...args) }; },
      };
      return statement;
    },
    async batch(statements) { return Promise.all(statements.map(statement => statement.run())); },
  };
  return { DB, ASSETS: { fetch: async () => new Response('<html>Chronos</html>', { headers: { 'Content-Type': 'text/html' } }) } };
}

const sessionA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const sessionB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
async function call(env, path, body, session = sessionA) {
  const response = await worker.fetch(new Request('https://chronos.test' + path, {
    method: body ? 'POST' : 'GET', headers: { Cookie: 'chronos_session=' + session, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }), env);
  return { response, data: response.headers.get('Content-Type')?.startsWith('application/json') ? await response.json() : await response.text() };
}

test('scenario → draft → idempotent test delivery → export', async () => {
  const env = environment();
  const run = await call(env, '/api/operations/simulate', { corridor_id: 'kochi', ocean_surge_m: 1.85, river_inflow_m3s: 550, hours_to_landfall: 6 });
  assert.equal(run.response.status, 200);
  assert.ok(run.data.grid.hospitals.some(hospital => hospital.is_dry_but_outaged));
  const draft = await call(env, '/api/operations/advisories', { snapshot_id: run.data.snapshot_id, inspect_image: true });
  assert.equal(draft.response.status, 200);
  assert.equal(draft.data.engine_mode, 'rule_based_draft');
  assert.equal(draft.data.sha256.length, 64);
  assert.equal(draft.data.vision.image_source, 'synthetic_fixture');
  const payload = { advisory_id: draft.data.advisory_id, recipient: 'Demo response team', channel: 'test_inbox' };
  const first = await call(env, '/api/operations/dispatch', payload), second = await call(env, '/api/operations/dispatch', payload);
  assert.deepEqual(first.data, second.data);
  assert.equal(first.data.status, 'delivered_to_test_inbox');
  const inbox = await call(env, '/api/operations/deliveries');
  assert.equal(inbox.data.length, 1);
  const exported = await call(env, `/api/operations/advisories/${draft.data.advisory_id}/export`);
  assert.equal(exported.response.status, 200);
  assert.ok(exported.data.includes(draft.data.sha256));
  assert.ok(exported.response.headers.get('Content-Disposition').includes('.txt'));
});

test('browser sessions cannot retrieve another visitor’s evidence or inbox', async () => {
  const env = environment();
  const run = await call(env, '/api/operations/simulate', {});
  const other = await call(env, '/api/operations/advisories', { snapshot_id: run.data.snapshot_id }, sessionB);
  assert.equal(other.response.status, 404);
  const inbox = await call(env, '/api/operations/deliveries', null, sessionB);
  assert.deepEqual(inbox.data, []);
});

test('concurrent retry requests return one canonical receipt', async () => {
  const env = environment();
  const run = await call(env, '/api/operations/simulate', {});
  const draft = await call(env, '/api/operations/advisories', { snapshot_id: run.data.snapshot_id });
  const payload = { advisory_id: draft.data.advisory_id, recipient: 'Retry demonstration' };
  const receipts = await Promise.all(Array.from({ length: 8 }, () => call(env, '/api/operations/dispatch', payload)));
  for (const receipt of receipts) assert.deepEqual(receipt.data, receipts[0].data);
  assert.equal((await call(env, '/api/operations/deliveries')).data.length, 1);
});

test('invalid numbers, malformed requests, unknown routes and external delivery are rejected', async () => {
  const env = environment();
  for (const payload of [{ ocean_surge_m: 6 }, { river_inflow_m3s: -1 }, { corridor_id: 'unknown' }, { corridor_id: '__proto__' }, { corridor_id: 'constructor' }, { rainfall_mm: '10' }, { include_rainfall_runoff: 'yes' }]) {
    assert.ok([404, 422].includes((await call(env, '/api/operations/simulate', payload)).response.status));
  }
  assert.equal((await call(env, '/api/missing')).response.status, 404);
  assert.equal((await call(env, '/api/operations/dispatch', { advisory_id: 'missing', channel: 'webhook' })).response.status, 409);
});

test('HTML receives a secure session cookie and assets remain servable', async () => {
  const env = environment();
  const response = await worker.fetch(new Request('https://chronos.test/'), env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Set-Cookie'), /HttpOnly; SameSite=Lax; Max-Age=604800; Secure/);
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
});

test('missing database reports service unavailability instead of pretending a scenario succeeded', async () => {
  const { response, data } = await call({}, '/api/operations/simulate', {});
  assert.equal(response.status, 503);
  assert.match(data.detail, /storage is unavailable/);
});
