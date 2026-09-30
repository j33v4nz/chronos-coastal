import { corridors, simulate } from './engine.mjs';

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fail = (status, detail) => Object.assign(new Error(detail), { status });
const ident = prefix => `${prefix}-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
const timestamp = () => new Date().toISOString();
const initialized = new WeakMap();
const weatherCache = new Map();

async function database(env) {
  if (!env.DB) throw fail(503, 'Demo storage is unavailable. Please try again shortly.');
  if (!initialized.has(env.DB)) initialized.set(env.DB, env.DB.prepare(`CREATE TABLE IF NOT EXISTS chronos_records (
    session TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL,
    PRIMARY KEY(session, kind, id))`).run().catch(error => { initialized.delete(env.DB); throw error; }));
  await initialized.get(env.DB);
  return env.DB;
}

async function put(env, session, kind, id, body) {
  const db = await database(env);
  const created = body.created_at ?? body.timestamp ?? timestamp();
  await db.batch([
    db.prepare('INSERT OR REPLACE INTO chronos_records VALUES (?, ?, ?, ?, ?)').bind(session, kind, id, JSON.stringify(body), created),
    db.prepare(`DELETE FROM chronos_records WHERE session = ? AND kind = ? AND id NOT IN
      (SELECT id FROM chronos_records WHERE session = ? AND kind = ? ORDER BY created_at DESC LIMIT 100)`).bind(session, kind, session, kind),
  ]);
  return body;
}

async function get(env, session, kind, id) {
  const db = await database(env);
  const row = await db.prepare('SELECT body FROM chronos_records WHERE session = ? AND kind = ? AND id = ?').bind(session, kind, id).first();
  if (!row) throw fail(404, `${kind === 'snapshot' ? 'Scenario' : 'Advisory'} not found. Create a new scenario or draft.`);
  return JSON.parse(row.body);
}

async function recent(env, session, kind) {
  const db = await database(env);
  const rows = await db.prepare('SELECT body FROM chronos_records WHERE session = ? AND kind = ? ORDER BY created_at DESC LIMIT 100').bind(session, kind).all();
  return rows.results.map(row => JSON.parse(row.body));
}

async function body(request) {
  if (Number(request.headers.get('Content-Length')) > 16000) throw fail(413, 'Request is too large.');
  const text = await request.text();
  if (text.length > 16000) throw fail(413, 'Request is too large.');
  try {
    const result = JSON.parse(text);
    if (!result || Array.isArray(result) || typeof result !== 'object') throw new Error();
    return result;
  } catch { throw fail(422, 'A JSON object is required.'); }
}

function validateScenario(value) {
  const input = { corridor_id: 'chennai', ocean_surge_m: 1.8, river_inflow_m3s: 520, hours_to_landfall: 6, rainfall_mm: 150, include_rainfall_runoff: false };
  for (const key of Object.keys(input)) if (key in value) input[key] = value[key];
  if (typeof input.corridor_id !== 'string' || !Object.hasOwn(corridors, input.corridor_id)) throw fail(404, 'Unknown coastal corridor');
  for (const [key, min, max] of [['ocean_surge_m', 0, 5], ['river_inflow_m3s', 50, 2500], ['hours_to_landfall', .5, 24], ['rainfall_mm', 0, 1000]]) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < min || input[key] > max) throw fail(422, `${key} must be between ${min} and ${max}.`);
  }
  if (typeof input.include_rainfall_runoff !== 'boolean') throw fail(422, 'Rainfall runoff must be enabled or disabled.');
  return input;
}

async function forecast(cid, refresh) {
  const corridor = corridors[cid];
  if (!Object.hasOwn(corridors, cid)) throw fail(404, 'Unknown coastal corridor');
  const cached = weatherCache.get(cid);
  if (cached && !refresh && Date.now() - cached.time < 600000) return cached.value;
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({ latitude: corridor.center_lat, longitude: corridor.center_lon,
      hourly: 'precipitation,wind_speed_10m,wind_gusts_10m,pressure_msl', forecast_days: 3, timezone: 'UTC', wind_speed_unit: 'kmh' });
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Provider failed');
    const { hourly } = await response.json(), current = new Date().toISOString().slice(0, 13) + ':00';
    const rows = hourly.time.map((time, index) => ({ time: time + 'Z', rain_mm: hourly.precipitation[index], wind_kmh: hourly.wind_speed_10m[index], gust_kmh: hourly.wind_gusts_10m[index], pressure_hpa: hourly.pressure_msl[index] })).filter(row => row.time >= current).slice(0, 48);
    if (!rows.length) throw new Error('Empty forecast');
    const value = { mode: 'live_forecast', provider: 'Open-Meteo', retrieved_at: timestamp(), source_url: 'https://open-meteo.com/en/docs', corridor_id: cid,
      rainfall_next_24h_mm: Math.round(rows.slice(0, 24).reduce((s, r) => s + (r.rain_mm ?? 0), 0) * 10) / 10,
      peak_gust_kmh: Math.max(...rows.slice(0, 24).map(r => r.gust_kmh ?? 0)), hourly: rows,
      note: 'Weather-model forecast. Does not provide cyclone track or storm surge.' };
    weatherCache.set(cid, { time: Date.now(), value });
    return value;
  } catch {
    return cached ? { ...cached.value, mode: 'cached_forecast', note: 'Provider unavailable; displaying the last retrieved forecast.' }
      : { mode: 'unavailable', provider: 'Open-Meteo', corridor_id: cid, hourly: [], rainfall_next_24h_mm: null, peak_gust_kmh: null,
        note: 'Forecast unavailable. Scenario inputs remain available; no live weather values are fabricated.' };
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(canonical(value))));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function draft(env, session, input) {
  if (!['English', 'Tamil', 'Hindi'].includes(input.language ?? 'English')) throw fail(422, 'Choose English, Tamil or Hindi.');
  const state = await get(env, session, 'snapshot', input.snapshot_id);
  let text = { title: `${corridors[state.corridor_id].name} — preparedness advisory`,
    summary: `Scenario screening identifies ${state.hydro.flooded_asset_count} exposed assets, ${state.grid.tripped_substation_count} interrupted substations and ${state.apex.critical_patients_at_risk} ICU beds dependent on threatened services.`,
    actions: [...state.apex.tactical_directives].sort((a, b) => a.priority.localeCompare(b.priority)).slice(0, 6).map(d => d.details),
    public_message: 'Preparedness exercise: monitor official weather bulletins, avoid flooded roads, and follow instructions from local emergency authorities. This scenario is not an official warning.' };
  let mode = 'rule_based_draft', notice = null;
  if (env.GEMINI_API_KEY) {
    try {
      // Bound paid inference by browser session, with durable accounting.
      const quota = (await recent(env, session, 'advisory')).filter(a => Date.now() - new Date(a.created_at).getTime() < 3600000);
      if (quota.length >= 10) throw new Error('Demo inference quota reached');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL || 'gemini-3.7-flash')}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(35000), headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Write a concise municipal preparedness DRAFT in ${input.language ?? 'English'}. Use only this evidence. Do not invent observations, confirmed damage, payouts or deliveries. Recommendations require authority review. Weather forecasts and simulated surge are different inputs. Mention scenario limitations. Evidence: ${JSON.stringify({ scenario: state, weather: weatherCache.get(state.corridor_id)?.value })}` }] }],
          generationConfig: { temperature: .2, responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', required: ['title', 'summary', 'actions', 'public_message'], properties: { title: { type: 'STRING' }, summary: { type: 'STRING' }, actions: { type: 'ARRAY', items: { type: 'STRING' } }, public_message: { type: 'STRING' } } } } }),
      });
      if (!response.ok) throw new Error('Inference unavailable');
      const result = await response.json(), parsed = JSON.parse(result.candidates[0].content.parts.map(p => p.text ?? '').join(''));
      if (typeof parsed.title !== 'string' || typeof parsed.summary !== 'string' || typeof parsed.public_message !== 'string' || !Array.isArray(parsed.actions) || parsed.actions.some(a => typeof a !== 'string')) throw new Error('Invalid draft');
      text = { title: parsed.title, summary: parsed.summary, actions: parsed.actions, public_message: parsed.public_message }; mode = 'gemini_live';
    } catch { notice = 'Gemini unavailable; using an English rule-based draft.'; }
  }
  const record = { advisory_id: ident('ADV'), snapshot_id: state.snapshot_id, corridor_id: state.corridor_id, created_at: timestamp(),
    language: mode === 'gemini_live' ? (input.language ?? 'English') : 'English', engine_mode: mode, model: mode === 'gemini_live' ? env.GEMINI_MODEL || 'gemini-3.7-flash' : null,
    status: 'draft', ...text,
    vision: input.inspect_image ? { image_source: 'synthetic_fixture', engine_mode: 'SYNTHETIC_DEMONSTRATION',
      geotechnical_summary: 'Illustrative inspection highlights infrastructure dependencies in the selected scenario. No satellite observation or calibrated structural failure probability is supplied by this hosted demonstration.' } : null,
    notice, evidence: { scenario: state.provenance, satellite: null, weather: weatherCache.get(state.corridor_id)?.value?.mode ?? 'not_loaded' } };
  record.sha256 = await digest(record);
  return put(env, session, 'advisory', record.advisory_id, record);
}

async function route(request, env, session) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (method === 'GET' && path === '/api/health') return json({ status: 'healthy', version: '1.0.0', runtime: 'hosted_screening_adapter', model_status: 'scenario_screening_unvalidated' });
  if (method === 'GET' && path === '/api/corridors') return json(Object.values(corridors).map(c => ({ id: c.id, name: c.name, region: c.region, sea_basin: c.sea_basin, benchmark_event: c.benchmark_event })));
  if (method === 'GET' && path === '/api/operations/status') return json({ gemini_configured: !!env.GEMINI_API_KEY, gemini_model: env.GEMINI_MODEL || 'gemini-3.7-flash', earth_engine_configured: false, external_dispatch_configured: false, model_status: 'scenario_screening_unvalidated', runtime: 'hosted_screening_adapter' });
  const weather = path.match(/^\/api\/operations\/weather\/([a-z]+)$/);
  if (weather && method === 'GET') return json(await forecast(weather[1], url.searchParams.get('refresh') === 'true'));
  const earth = path.match(/^\/api\/operations\/earth\/([a-z]+)$/);
  if (earth && method === 'GET') {
    if (!Object.hasOwn(corridors, earth[1])) throw fail(404, 'Unknown coastal corridor');
    return json({ mode: 'not_configured', corridor_id: earth[1], collections: ['COPERNICUS/S1_GRD', 'COPERNICUS/DEM/GLO30_2024_1', 'NASA/GPM_L3/IMERG_V07'], note: 'Satellite observations are not connected in this hosted demo. The Python backend supports authenticated Earth Engine access.' });
  }
  if (method === 'POST' && path === '/api/operations/simulate') {
    const result = { ...simulate(validateScenario(await body(request))), snapshot_id: ident('RUN'), created_at: timestamp() };
    return json(await put(env, session, 'snapshot', result.snapshot_id, result));
  }
  if (method === 'POST' && path === '/api/operations/advisories') return json(await draft(env, session, await body(request)));
  if (method === 'POST' && path === '/api/operations/dispatch') {
    const input = await body(request), channel = input.channel ?? 'test_inbox', recipient = input.recipient ?? 'District emergency operations centre';
    if (typeof recipient !== 'string' || recipient.trim().length < 3 || recipient.length > 160) throw fail(422, 'Response team must have between 3 and 160 characters.');
    if (channel !== 'test_inbox') throw fail(409, 'This public demo delivers only to the in-app test inbox.');
    await get(env, session, 'advisory', input.advisory_id);
    const deliveryKey = 'DEL-' + (await digest({ advisory_id: input.advisory_id, channel, recipient })).slice(0, 16).toUpperCase();
    const existing = (await recent(env, session, 'delivery')).find(d => d.delivery_id === deliveryKey);
    if (existing) return json(existing);
    const record = { delivery_id: deliveryKey, advisory_id: input.advisory_id, channel, recipient, timestamp: timestamp(), status: 'delivered_to_test_inbox' };
    const db = await database(env);
    // Concurrent retries share one receipt, including its original timestamp.
    await db.prepare('INSERT OR IGNORE INTO chronos_records VALUES (?, ?, ?, ?, ?)').bind(session, 'delivery', deliveryKey, JSON.stringify(record), record.timestamp).run();
    return json(await get(env, session, 'delivery', deliveryKey));
  }
  if (method === 'GET' && path === '/api/operations/deliveries') return json(await recent(env, session, 'delivery'));
  const exported = path.match(/^\/api\/operations\/advisories\/(ADV-[A-Z0-9]+)\/export$/);
  if (method === 'GET' && exported) {
    const item = await get(env, session, 'advisory', exported[1]);
    const text = `CHRONOS COASTAL | PREPAREDNESS DRAFT\n${item.title}\n${item.created_at}\n\n${item.summary}\n\n${item.actions.map((action, i) => `${i + 1}. ${action}`).join('\n')}\n\nPUBLIC MESSAGE\n${item.public_message}\n\nEvidence: ${item.snapshot_id} | Mode: ${item.engine_mode}\nScenario screening; not an official forecast.\nSHA-256: ${item.sha256}\n`;
    return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${item.advisory_id}.txt"`, 'Cache-Control': 'no-store' } });
  }
  if (path.startsWith('/api/') || path.startsWith('/ws/')) throw fail(404, 'Endpoint unavailable in this hosted dashboard. The full Python API is in the repository.');
  if (!['GET', 'HEAD'].includes(method)) throw fail(405, 'Method not allowed');
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    const cookie = request.headers.get('Cookie') ?? '';
    const saved = cookie.match(/(?:^|;\s*)chronos_session=([a-f0-9-]{36})(?:;|$)/)?.[1];
    const session = saved ?? crypto.randomUUID();
    let response;
    try { response = await route(request, env, session); }
    catch (error) { console.error('Chronos request failed:', error.status ?? 500); response = json({ detail: error.status ? error.message : 'The demo could not complete this request. Please try again.' }, error.status ?? 500); }
    response = new Response(response.body, response);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-Frame-Options', 'DENY');
    if (!saved) response.headers.append('Set-Cookie', `chronos_session=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`);
    return response;
  },
};
