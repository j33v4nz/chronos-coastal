import React, { useEffect, useRef, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, Bell, Check, ChevronDown, ChevronRight, HelpCircle, Clock3, CloudRain, FileText, Gauge, Globe2, HeartPulse, Layers, Loader2, Map, Menu, RefreshCw, Send, Settings2, ShieldCheck, Sparkles, Waves, Wind, X, Zap } from 'lucide-react';
import CoastalMap from './components/CoastalMap';
import './coastal.css';

const CORRIDORS = { chennai: { name: 'Chennai', detail: 'Adyar–Cooum corridor', state: 'Tamil Nadu', sea: 'Bay of Bengal', surge: 2.2, inflow: 520 }, odisha: { name: 'Odisha', detail: 'Mahanadi delta', state: 'Odisha', sea: 'Bay of Bengal', surge: 3.2, inflow: 880 }, kochi: { name: 'Kochi', detail: 'Vembanad estuary', state: 'Kerala', sea: 'Arabian Sea', surge: 1.85, inflow: 550 }, mumbai: { name: 'Mumbai', detail: 'Mithi–Mahim corridor', state: 'Maharashtra', sea: 'Arabian Sea', surge: 2.1, inflow: 600 } };
const PRESETS = { baseline: { title: 'Baseline', surge: .4, inflow: 180, hours: 18, rain: 20 }, cyclone: { title: 'Cyclone', surge: 1.8, inflow: 520, hours: 6, rain: 150 }, severe: { title: 'Severe', surge: 2.8, inflow: 950, hours: 3, rain: 300 } };
function initialScenario() {
  const query = new URLSearchParams(window.location.search);
  const cid = Object.hasOwn(CORRIDORS, query.get('corridor')) ? query.get('corridor') : 'chennai';
  const number = (key, fallback, min, max) => {
    const value = query.has(key) ? Number(query.get(key)) : fallback;
    return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
  };
  return { corridor: cid, surge: number('surge', CORRIDORS[cid].surge, 0, 5), inflow: number('inflow', CORRIDORS[cid].inflow, 50, 2500), hours: number('hours', 6, .5, 24), rain: number('rain', 150, 0, 1000), runoff: query.get('runoff') === '1', custom: query.has('surge') || query.has('inflow') };
}
const INITIAL = initialScenario();
const pretty = value => value?.replaceAll('_', ' ').toLowerCase() || '';
const fmt = (n, digits = 0) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: digits });
const date = value => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Not retrieved';

async function api(path, body, signal) {
  const response = await fetch('/api/operations' + path, { ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), signal });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Request failed. Check the scenario inputs and try again.');
  return result;
}

function downloadScenario(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `chronos-${data.corridor_id}-${data.snapshot_id}.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function routeState(route) {
  if (route.is_currently_submerged) return ['Blocked', 'critical'];
  if (route.departure_window_remaining_min === 0) return ['Window closed', 'critical'];
  if (route.departure_window_remaining_min == null) return ['Open through horizon', 'safe'];
  return [route.departure_window_remaining_min <= 60 ? 'Closing soon' : 'Departure available', 'watch'];
}

function Sparkline({ values = [], color = '#268576', filled = false }) {
  const list = values.length ? values : [0, 0];
  const max = Math.max(...list, 1);
  const points = list.map((v, i) => `${i * 180 / Math.max(1, list.length - 1)},${42 - (v || 0) / max * 32}`).join(' ');
  return <svg viewBox="0 0 180 48" role="img" aria-label="Forecast trend" className="sparkline">{filled && <polygon points={`0,48 ${points} 180,48`} fill={color} opacity=".10" />}<polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" /></svg>;
}

function Modal({ title, eyebrow, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const handler = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const elements = ref.current.querySelectorAll('button:not([disabled]), a[href], input, select, textarea, [tabindex="0"]');
        const first = elements[0], last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current.querySelector('button')?.focus();
    document.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', handler); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onClick={onClose}><section ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`coast-modal ${wide ? 'wide' : ''}`} onClick={e => e.stopPropagation()}><header><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></header>{children}</section></div>;
}

export default function CoastalDashboard() {
  const [corridor, setCorridor] = useState(INITIAL.corridor);
  const [surge, setSurge] = useState(INITIAL.surge);
  const [inflow, setInflow] = useState(INITIAL.inflow);
  const [hours, setHours] = useState(INITIAL.hours);
  const [rain, setRain] = useState(INITIAL.rain);
  const [rainEnabled, setRainEnabled] = useState(INITIAL.runoff);
  const [preset, setPreset] = useState(INITIAL.custom ? null : 'cyclone');
  const [data, setData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [earth, setEarth] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [earthLoading, setEarthLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [advisory, setAdvisory] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [language, setLanguage] = useState('English');
  const [inspect, setInspect] = useState(true);
  const [delivering, setDelivering] = useState(false);
  const [delivery, setDelivery] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [recipient, setRecipient] = useState(`${CORRIDORS[INITIAL.corridor].name} district emergency operations centre`);
  const [channel, setChannel] = useState('test_inbox');
  const [tab, setTab] = useState('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [copied, setCopied] = useState(false);
  const runId = useRef(0);
  const providerId = useRef(0);
  const advisoryId = useRef(0);
  const location = CORRIDORS[corridor];

  async function run(values = {}) {
    const id = ++runId.current;
    ++advisoryId.current;
    setAdvisory(null); setDelivery(null); setGenerating(false);
    setLoading(true); setError(null);
    try {
      const result = await api('/simulate', { corridor_id: corridor, ocean_surge_m: surge, river_inflow_m3s: inflow, hours_to_landfall: hours, rainfall_mm: rain, include_rainfall_runoff: rainEnabled, ...values });
      if (id === runId.current) { setData(result); setAdvisory(null); setDelivery(null); setSelected(null); }
    } catch (e) { if (id === runId.current) setError(e.message); }
    finally { if (id === runId.current) setLoading(false); }
  }

  async function loadProviders(cid, refresh = false) {
    const id = ++providerId.current;
    setWeatherLoading(true); setEarthLoading(true); setWeather(null); setEarth(null);
    await Promise.allSettled([
      api(`/weather/${cid}${refresh ? '?refresh=true' : ''}`).then(v => { if (id === providerId.current) setWeather(v); }).catch(e => { if (id === providerId.current) setWeather({ mode: 'unavailable', note: e.message, hourly: [] }); }).finally(() => { if (id === providerId.current) setWeatherLoading(false); }),
      api(`/earth/${cid}${refresh ? '?refresh=true' : ''}`).then(v => { if (id === providerId.current) setEarth(v); }).catch(e => { if (id === providerId.current) setEarth({ mode: 'unavailable', note: e.message }); }).finally(() => { if (id === providerId.current) setEarthLoading(false); }),
    ]);
  }

  useEffect(() => { run(); loadProviders(INITIAL.corridor); api('/status').then(setStatus).catch(() => {}); }, []);

  async function shareScenario() {
    const link = new URL(window.location.href);
    link.search = new URLSearchParams({ corridor: data.corridor_id, surge: data.ocean_surge_m, inflow: data.river_inflow_m3s, hours: data.hours_to_landfall, rain: data.rainfall_mm, runoff: data.include_rainfall_runoff ? '1' : '0' });
    try { await navigator.clipboard.writeText(link.href); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { setError('Clipboard unavailable. Export the scenario JSON to share the inputs.'); }
  }

  function switchCorridor(cid) {
    const next = CORRIDORS[cid];
    setCorridor(cid); setSurge(next.surge); setInflow(next.inflow); setHours(6); setRain(150); setPreset('cyclone');
    setRecipient(`${next.name} district emergency operations centre`);
    setData(null); setSelected(null); setAdvisory(null); setDelivery(null);
    run({ corridor_id: cid, ocean_surge_m: next.surge, river_inflow_m3s: next.inflow, hours_to_landfall: 6, rainfall_mm: 150 });
    loadProviders(cid);
  }

  function choosePreset(key) {
    const v = key === 'cyclone' ? { ...PRESETS[key], surge: location.surge, inflow: location.inflow } : PRESETS[key];
    setPreset(key); setSurge(v.surge); setInflow(v.inflow); setHours(v.hours); setRain(v.rain);
    run({ ocean_surge_m: v.surge, river_inflow_m3s: v.inflow, hours_to_landfall: v.hours, rainfall_mm: v.rain });
  }

  async function generate() {
    if (!data) return;
    const id = ++advisoryId.current;
    const snapshotId = data.snapshot_id;
    setGenerating(true); setError(null); setDelivery(null);
    try {
      const result = await api('/advisories', { snapshot_id: snapshotId, language, inspect_image: inspect });
      if (id === advisoryId.current) setAdvisory(result);
    } catch (e) { if (id === advisoryId.current) setError(e.message); }
    finally { if (id === advisoryId.current) setGenerating(false); }
  }

  async function dispatch() {
    setDelivering(true); setError(null);
    try {
      const result = await api('/dispatch', { advisory_id: advisory.advisory_id, channel, recipient });
      setDelivery(result); setInbox(await api('/deliveries'));
    } catch (e) { setError(e.message); }
    finally { setDelivering(false); }
  }

  const hospitals = data?.grid?.hospitals || [];
  const routes = [...(data?.logistics?.routes || [])].sort((a, b) =>
    (a.departure_window_remaining_min ?? Infinity) - (b.departure_window_remaining_min ?? Infinity));
  const patients = (data?.grid?.total_patients_on_dg_risk || 0) + (data?.grid?.total_blacked_out_icu_patients || 0);
  const atRisk = hospitals.filter(h => !h.grid_mains_powered);
  const assets = data?.hydro?.assets || [];
  const exposed = data?.hydro?.flooded_asset_count || 0;
  const shortest = routes.find(r => r.departure_window_remaining_min != null);
  const tripped = data?.grid?.tripped_substation_count || 0;
  const dirty = data && (data.ocean_surge_m !== surge || data.river_inflow_m3s !== inflow || data.hours_to_landfall !== hours || data.rainfall_mm !== rain || data.include_rainfall_runoff !== rainEnabled);
  const weatherReady = ['live_forecast', 'cached_forecast'].includes(weather?.mode);
  const directives = [...(data?.apex?.tactical_directives || [])].sort((a, b) => a.priority.localeCompare(b.priority));
  const selectedHospital = hospitals.find(h => h.id === selected?.id);
  const receiptMatches = delivery && delivery.channel === channel && delivery.recipient === recipient;

  return <div className="coastal-app">
    <aside className={`coast-sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <a href="#" className="brand-mark" aria-label="Chronos home" onClick={e => { e.preventDefault(); setTab('overview'); }}><Waves size={28} /></a>
      <span className="sidebar-divider" />
      <nav aria-label="Main navigation">
        {[['overview', Map, 'Overview'], ['assets', Layers, 'Infrastructure'], ['advisories', FileText, 'Advisories'], ['sources', Globe2, 'Data sources']].map(([key, Icon, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setMobileNav(false); if (key === 'advisories') api('/deliveries').then(setInbox).catch(() => {}); }} aria-label={label} title={label}><Icon size={21} /><span>{label}</span></button>)}
      </nav>
      <div className="sidebar-bottom"><button onClick={() => setModal('help')} aria-label="About this prototype" title="About this prototype"><HelpCircle size={21} /></button><button className="avatar" onClick={() => setModal('help')} aria-label="Community operations">CO</button></div>
    </aside>

    <div className="coast-workspace">
      <header className="coast-topbar">
        <div className="topbar-brand"><button className="mobile-menu icon-button" onClick={() => setMobileNav(v => !v)} aria-label="Open navigation"><Menu size={20} /></button><strong>CHRONOS<span> / COASTAL</span></strong><span className="topbar-divider" /><span className="topbar-context">Community resilience workspace</span></div>
        <div className="topbar-right"><span className="prototype-badge"><span /> Prototype</span><button className="icon-button notifications" onClick={() => { setTab('advisories'); api('/deliveries').then(setInbox).catch(() => {}); }} aria-label="Open advisory inbox"><Bell size={18} />{inbox.length > 0 && <i />}</button><span className="user-badge">CO</span></div>
      </header>

      <main className="coast-main">
        <div className="page-heading"><div><div className="breadcrumb">OPERATIONS <ChevronRight size={12} /> {location.sea.toUpperCase()}</div><h1>{tab === 'overview' ? 'Coastal intelligence' : tab === 'assets' ? 'Critical infrastructure' : tab === 'advisories' ? 'Advisory centre' : 'Evidence & data sources'}<span className="heading-dot">.</span></h1><p>{tab === 'overview' ? 'Understand the impact. Act before the window closes.' : tab === 'assets' ? 'Follow the dependencies behind essential community services.' : tab === 'advisories' ? 'Turn scenario evidence into a reviewable early-action message.' : 'Know what is observed, forecast, and assumed.'}</p></div><div className="heading-actions"><div className="location-select"><Globe2 size={17} /><select aria-label="Select coastal corridor" value={corridor} onChange={e => switchCorridor(e.target.value)}>{Object.entries(CORRIDORS).map(([key, value]) => <option key={key} value={key}>{value.name} · {value.state}</option>)}</select><ChevronDown size={14} /></div><button className="secondary-button sources-button" onClick={() => { setTab('sources'); }}><Layers size={15} /> Data sources</button></div></div>

        {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></button></div>}

        {tab === 'overview' && <>
          <div className="scenario-strip"><div><span className="status-pip amber" /><strong>Anticipatory action</strong><span className="strip-separator" />{location.detail}<span className="strip-note">Scenario screening · not an official warning</span></div><button onClick={() => setModal('help')}>How to read this <ArrowUpRight size={13} /></button></div>

          <section className="metric-grid" aria-label="Scenario impact summary">
            {[{ title: 'Exposed infrastructure', value: fmt(exposed), suffix: `/ ${assets.length || '—'}`, detail: 'Assets with estimated inundation', Icon: Layers, accent: 'teal', bars: true }, { title: 'Power interruptions', value: fmt(tripped), suffix: 'substations', detail: `${atRisk.length} hospital${atRisk.length === 1 ? '' : 's'} with supply at risk`, Icon: Zap, accent: 'amber' }, { title: 'Critical care exposure', value: fmt(patients), suffix: 'ICU beds', detail: 'Scenario capacity · not a patient count', Icon: HeartPulse, accent: 'coral' }, { title: 'Earliest resupply window', value: shortest ? fmt(shortest.departure_window_remaining_min) : 'Open', suffix: shortest ? 'min' : '', detail: shortest ? (shortest.departure_window_remaining_min <= 0 ? 'Route window already closed in scenario' : 'Estimated latest departure') : 'No closure within the scenario window', Icon: Clock3, accent: 'teal' }].map(m => <article className={`metric-card ${m.accent}`} key={m.title}><div className="metric-top"><span>{m.title}</span><m.Icon size={17} /></div><div className="metric-value">{loading && !data ? '—' : m.value}<small>{m.suffix}</small></div><div className="metric-detail">{m.detail}</div>{m.bars && <div className="exposure-bar">{Array.from({ length: Math.max(assets.length, 9) }, (_, i) => <i key={i} className={i < exposed ? 'exposed' : ''} />)}</div>}</article>)}
          </section>

          <div className="operations-grid">
            <section className="scenario-card panel">
              <div className="panel-title"><div className="panel-icon"><Settings2 size={17} /></div><h2>Scenario studio</h2><span className="tiny-badge">WHAT IF</span></div>
              <p className="panel-intro">Explore the conditions that put essential services at risk.</p>
              <div className="preset-tabs">{Object.entries(PRESETS).map(([key, value]) => <button className={preset === key ? 'active' : ''} key={key} onClick={() => choosePreset(key)} disabled={loading}>{value.title}</button>)}</div>
              <div className="control-group"><label htmlFor="surge"><span><Waves size={15} /> Storm surge</span><strong>{surge.toFixed(2)} <small>m</small></strong></label><input id="surge" type="range" min="0" max="5" step=".05" value={surge} onChange={e => { setSurge(+e.target.value); setPreset(null); }} /><div className="range-labels"><span>0 m</span><span>5 m</span></div></div>
              <div className="control-group"><label htmlFor="inflow"><span><Activity size={15} /> River inflow</span><strong>{fmt(inflow)} <small>m³/s</small></strong></label><input id="inflow" type="range" min="50" max="2500" step="5" value={inflow} onChange={e => { setInflow(+e.target.value); setPreset(null); }} /><div className="range-labels"><span>50 m³/s</span><span>2,500 m³/s</span></div></div>
              <div className="control-group"><label htmlFor="landfall"><span><Clock3 size={15} /> Time to peak</span><strong>{hours} <small>hours</small></strong></label><input id="landfall" type="range" min=".5" max="24" step=".5" value={hours} onChange={e => { setHours(+e.target.value); setPreset(null); }} /><div className="range-labels"><span>30 min</span><span>24 hours</span></div></div>
              <div className="rain-control"><label className="checkbox-label"><input type="checkbox" checked={rainEnabled} onChange={e => setRainEnabled(e.target.checked)} /><span>Include rainfall runoff</span><CloudRain size={15} /></label>{rainEnabled && <><div className="rain-input"><label htmlFor="rain">24h scenario rainfall</label><div><input id="rain" type="number" min="0" max="1000" value={rain} onChange={e => setRain(Math.max(0, Math.min(1000, +e.target.value)))} /><span>mm</span></div></div>{weatherReady && <button className="text-button" onClick={() => setRain(weather.rainfall_next_24h_mm)}>Use forecast: {weather.rainfall_next_24h_mm} mm <ArrowRight size={12} /></button>}<p className="small-note">Screening assumption: 120 km² catchment, 0.45 runoff coefficient over 24h.</p></>}</div>
              <button className="primary-button run-button" onClick={() => run()} disabled={loading}>{loading ? <Loader2 className="spin" size={17} /> : <Activity size={17} />}{loading ? 'Calculating impact…' : 'Run impact simulation'}{!loading && <ArrowRight size={16} />}</button>
              <div className={`run-status ${dirty ? 'pending' : ''}`}><span />{dirty ? 'Inputs changed · run to update results' : data ? `Updated ${date(data.created_at)}` : 'Connecting to simulation engine'}</div>
            </section>

            <section className="map-panel panel"><div className="map-panel-header"><div><h2>{location.name} <span>/{location.detail}</span></h2><p><span className="status-pip" /> {assets.length} mapped assets <span>·</span> Curated dependency network</p></div><span className="map-region-badge">{location.sea}</span></div><CoastalMap data={data} corridor={corridor} selected={selected} onSelect={setSelected} earth={earth} />{loading && <div className="map-loading"><Loader2 size={16} className="spin" /> Updating scenario</div>}<div className="map-footer"><div><Clock3 size={14} /><span>Peak impact horizon</span><strong>T + {data?.hours_to_landfall || hours}h</strong></div><span>Tap an asset to inspect its dependencies <ArrowUpRight size={13} /></span></div></section>

            <aside className="action-column">
              <section className="early-action-card"><div className="action-eyebrow"><Sparkles size={15} /> FROM INSIGHT TO ACTION</div><h2>Every hour<br />can change the outcome.</h2><p>Prepare an evidence-linked advisory for your local response team.</p><div className="ai-engine"><i />{status?.gemini_configured ? status.gemini_model : 'Rule-based drafting available'}</div><button disabled={!data || loading} onClick={() => setModal('advisory')}>Prepare advisory <ArrowUpRight size={17} /></button></section>
              <section className="priority-card panel"><div className="panel-title"><h2>Action priorities</h2><span className="count-badge">{directives.length}</span></div><p className="panel-intro">Suggested steps for authority review</p><div className="priority-list">{directives.slice(0, 3).map((d, i) => <button key={i} onClick={() => setModal('actions')}><span className={`priority-number ${d.priority.startsWith('P0') ? 'urgent' : ''}`}>0{i + 1}</span><div><strong>{pretty(d.action)}</strong><span>{d.target}</span></div><ChevronRight size={15} /></button>)}{!directives.length && <p className="empty-note">Run a scenario to identify action priorities.</p>}</div><button className="text-button" onClick={() => setModal('actions')}>View incident plan <ArrowRight size={13} /></button></section>
            </aside>
          </div>

          <div className="lower-grid"><section className="panel continuity-panel"><div className="section-heading"><div><span className="eyebrow">THE HUMAN IMPACT</span><h2>Keep critical care connected</h2></div><button className="text-button" onClick={() => setTab('assets')}>All infrastructure <ArrowUpRight size={14} /></button></div><div className="hospital-grid">{hospitals.map(h => <button className="hospital-card" key={h.id} onClick={() => { setSelected(assets.find(a => a.id === h.id)); setModal('asset'); }}><div className="hospital-card-top"><span className="hospital-icon"><HeartPulse size={19} /></span><span className={`status-label ${h.grid_mains_powered ? 'safe' : h.on_generator ? 'watch' : 'critical'}`}>{h.grid_mains_powered ? 'Grid online' : h.on_generator ? 'Backup power' : 'Power at risk'}</span></div><h3>{h.name}</h3><div className="hospital-values"><span><strong>{h.icu_patients}</strong> ICU beds</span><span><strong>{h.runtime_hours_remaining}h</strong> fuel reserve</span></div><div className="dependency-chain"><span className={h.grid_mains_powered ? 'ok' : 'broken'}><Zap size={11} /> Grid</span><ChevronRight size={11} /><span className={h.on_generator ? 'watch' : ''}>Generator</span><ChevronRight size={11} /><span>Critical care</span></div>{h.is_dry_but_outaged && <p className="dry-warning">Dry facility. Interrupted power supply.</p>}</button>)}</div></section>
            <section className="panel weather-panel"><div className="section-heading"><div><span className="eyebrow">METEOROLOGICAL CONTEXT</span><h2>Next 24 hours</h2></div><button className="icon-button" disabled={weatherLoading} aria-label="Refresh forecast" onClick={() => loadProviders(corridor, true)}><RefreshCw size={15} className={weatherLoading ? 'spin' : ''} /></button></div><div className="weather-stats"><div><CloudRain size={19} /><strong>{weatherReady ? fmt(weather.rainfall_next_24h_mm, 1) : '—'}<small>mm</small></strong><span>Forecast rainfall</span></div><div><Wind size={19} /><strong>{weatherReady ? fmt(weather.peak_gust_kmh) : '—'}<small>km/h</small></strong><span>Peak wind gust</span></div></div><Sparkline values={weather?.hourly?.slice(0, 24).map(r => r.rain_mm)} filled /><div className="weather-source"><span className={`status-pip ${weatherReady ? '' : 'amber'}`} />{weatherLoading ? 'Retrieving forecast…' : weatherReady ? `${weather.mode === 'cached_forecast' ? 'Cached' : 'Live'} · Open-Meteo` : 'Forecast unavailable'}<button onClick={() => setTab('sources')}>Source details <ArrowUpRight size={11} /></button></div></section>
          </div>
          <section className="panel resupply-panel" aria-label="Supply route departure windows">
            <div className="section-heading"><div><span className="eyebrow">BEFORE ACCESS CLOSES</span><h2>Protect the resupply window</h2></div><div className="scenario-export-actions"><button className="secondary-button" disabled={!data || loading} onClick={shareScenario}>{copied ? <Check size={14} /> : <ArrowUpRight size={14} />}{copied ? 'Link copied' : 'Share scenario'}</button><button className="secondary-button" disabled={!data || loading} onClick={() => downloadScenario(data)}><ArrowDownToLine size={14} /> Export scenario</button></div></div>
            <p className="panel-intro">Compare oxygen and diesel clearance limits. Deadlines are relative to this scenario run, not live road conditions.</p>
            <div className="route-grid">{routes.map(route => { const [label, tone] = routeState(route); return <article className="route-card" key={route.corridor_id}><div className="route-card-top"><strong>{route.cargo_type === 'LIQUID_MEDICAL_OXYGEN' ? 'Medical oxygen' : 'Diesel fuel'}</strong><span className={`status-label ${tone}`}>{label}</span></div><h3>{route.name}</h3><p>{route.choke_point_name}</p><div className="route-window"><Clock3 size={18} /><strong>{route.departure_window_remaining_min == null ? 'Open' : fmt(route.departure_window_remaining_min, 1)}<small>{route.departure_window_remaining_min == null ? 'through peak' : 'min to latest departure'}</small></strong></div><dl><dt>Transit allowance</dt><dd>{route.nominal_travel_time_min} min</dd><dt>Assumed clearance</dt><dd>{route.critical_clearance_depth_m.toFixed(2)} m</dd><dt>Estimated peak depth</dt><dd>{route.peak_water_depth_m.toFixed(2)} m</dd></dl></article>; })}</div>
          </section>
          <section className="sensitivity-panel"><div><Gauge size={18} /><div><strong>How sensitive is this scenario?</strong><span>Compare ±20% surge and inflow · sensitivity cases, not probabilities</span></div></div><div className="sensitivity-cases">{data?.sensitivity?.map(v => <div key={v.label} className={v.factor === 1 ? 'selected' : ''}><span>{v.label}</span><strong>{v.flooded_assets}<small>exposed assets</small></strong></div>)}</div></section>
        </>}

        {tab === 'assets' && <section className="panel assets-panel"><div className="section-heading"><div><span className="eyebrow">{location.detail.toUpperCase()}</span><h2>{assets.length} essential assets. One connected system.</h2></div><span className="tiny-badge">CURATED DEMO DATA</span></div><div className="asset-table-wrap"><table className="asset-table"><thead><tr><th>Infrastructure</th><th>Type</th><th>Estimated depth</th><th>Scenario status</th><th /></tr></thead><tbody>{assets.map(a => <tr key={a.id}><td><strong>{a.name}</strong><span>{a.id}</span></td><td>{pretty(a.type)}</td><td>{a.water_depth_m.toFixed(2)} m</td><td><span className={`status-label ${a.water_depth_m > 0 ? 'watch' : 'safe'}`}>{a.water_depth_m > 0 ? 'Exposed' : 'No inundation'}</span></td><td><button className="icon-button" aria-label={`Inspect ${a.name}`} onClick={() => { setSelected(a); setModal('asset'); }}><ArrowUpRight size={17} /></button></td></tr>)}</tbody></table></div></section>}

        {tab === 'advisories' && <div className="advisory-page"><section className="panel"><div className="section-heading"><div><span className="eyebrow">EARLY ACTION</span><h2>A clear message, grounded in evidence.</h2></div><FileText size={25} /></div><p className="body-copy">Prepare a municipal advisory from the latest infrastructure impact scenario. Review the recommendations, download the brief, and send it to the test inbox or a configured webhook.</p><button className="primary-button" disabled={!data || loading} onClick={() => setModal('advisory')}><Sparkles size={16} /> Prepare new advisory <ArrowRight size={16} /></button></section><section className="panel"><div className="section-heading"><div><span className="eyebrow">DELIVERY RECEIPTS</span><h2>Response team inbox</h2></div><span className="count-badge">{inbox.length}</span></div>{inbox.length ? inbox.map(item => <div className="delivery-row" key={item.delivery_id}><span className="delivery-check"><Check size={16} /></span><div><strong>{item.recipient}</strong><span>{item.advisory_id} · {date(item.timestamp)}</span></div><span className="status-label safe">{item.channel === 'test_inbox' ? 'Test inbox' : 'Webhook accepted'}</span></div>) : <div className="empty-state"><Send size={28} /><h3>No advisories delivered yet</h3><p>Your first reviewed advisory will appear here.</p></div>}</section></div>}

        {tab === 'sources' && <div className="sources-grid"><section className="panel source-card"><span className="source-symbol"><CloudRain size={25} /></span><div className="source-card-title"><h2>Weather forecasts</h2><span className={`status-label ${weatherReady ? 'safe' : 'watch'}`}>{weatherLoading ? 'Loading' : weatherReady ? 'Connected' : 'Unavailable'}</span></div><p>Hourly rainfall, wind gusts and pressure from Open-Meteo. Forecasts supply context; storm surge remains a separate scenario input.</p><dl><dt>Retrieved</dt><dd>{date(weather?.retrieved_at)}</dd><dt>Provider mode</dt><dd>{pretty(weather?.mode)}</dd><dt>Forecast horizon</dt><dd>48 hours</dd></dl><button className="secondary-button" onClick={() => loadProviders(corridor, true)} disabled={weatherLoading}><RefreshCw size={14} /> Refresh providers</button><a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Provider documentation <ArrowUpRight size={12} /></a></section><section className="panel source-card"><span className="source-symbol"><Globe2 size={25} /></span><div className="source-card-title"><h2>Satellite observations</h2><span className={`status-label ${earth?.mode === 'earth_engine' ? 'safe' : 'watch'}`}>{earthLoading ? 'Loading' : earth?.mode === 'earth_engine' ? 'Connected' : 'Setup needed'}</span></div><p>{earth?.note || 'Google Earth Engine: Sentinel-1 radar change, surface elevation and slope.'}</p><dl><dt>Acquired</dt><dd>{date(earth?.acquired_at)}</dd><dt>Scene</dt><dd>{earth?.scene_id || 'No scene loaded'}</dd><dt>Candidate water area</dt><dd>{earth?.candidate_water_fraction != null ? `${(earth.candidate_water_fraction * 100).toFixed(1)}%` : 'Not measured'}</dd></dl><details><summary>Connection instructions</summary><p>Install backend dependencies, authenticate with <code>earthengine authenticate</code>, and set <code>GEE_PROJECT_ID</code> in backend/.env. The Cloud project must be registered for Earth Engine.</p></details><a href="https://developers.google.com/earth-engine/guides/access" target="_blank" rel="noreferrer">Earth Engine documentation <ArrowUpRight size={12} /></a></section><section className="panel source-card"><span className="source-symbol"><Sparkles size={25} /></span><div className="source-card-title"><h2>AI reasoning</h2><span className={`status-label ${status?.gemini_configured ? 'watch' : ''}`}>{status?.gemini_configured ? 'Configured' : 'Rules available'}</span></div><p>Structured advisory drafting and optional composite-image inspection. Every draft records the actual engine and its evidence.</p><dl><dt>Configured model</dt><dd>{status?.gemini_model || 'Not retrieved'}</dd><dt>Last draft mode</dt><dd>{pretty(advisory?.engine_mode) || 'No draft yet'}</dd><dt>Offline behavior</dt><dd>Explicit rule-based draft</dd></dl><details><summary>Connection instructions</summary><p>Set <code>GEMINI_API_KEY</code> in backend/.env and restart the server. Keep keys on the backend.</p></details></section><section className="panel source-card"><span className="source-symbol"><ShieldCheck size={25} /></span><div className="source-card-title"><h2>Model assumptions</h2><span className="status-label watch">Screening model</span></div><p>Curated infrastructure positions, assumed grid dependencies, and simplified surge/backwater hydraulics. Outputs are scenario estimates, not validated forecasts.</p><dl><dt>Validation</dt><dd>No independent field validation</dd><dt>Rainfall conversion</dt><dd>120 km² · C = 0.45 · 24h</dd><dt>Exposure buffers</dt><dd>Illustrative, not flood boundaries</dd></dl><p className="small-note">SAR change is an observation candidate. An AI confidence value is not a calibrated failure probability. No financial disbursement occurs.</p></section></div>}

        <footer className="coast-footer"><span><Waves size={13} /> Built for communities. Designed for earlier action.</span><span>Google Build with AI <i /> Track 05</span></footer>
      </main>
    </div>

    {modal === 'help' && <Modal title="Earlier action starts with clarity." eyebrow="ABOUT CHRONOS COASTAL" onClose={() => setModal(null)}><div className="modal-body"><p className="body-copy">Explore how cyclone surge and river inflow can affect power, hospital continuity, and resupply access. Use the scenario studio to compare conditions, then prepare an advisory.</p><div className="help-steps"><div><span>01</span><strong>Set a scenario</strong><p>Choose a corridor and adjust the environmental inputs.</p></div><div><span>02</span><strong>Trace the impact</strong><p>Inspect the map, service dependencies and resupply windows.</p></div><div><span>03</span><strong>Prepare action</strong><p>Review an evidence-linked draft and test its delivery.</p></div></div><div className="notice-box">Prototype for preparedness exercises. Scenario estimates require local verification. Official warnings and clinical decisions remain with qualified authorities.</div></div></Modal>}
    {modal === 'actions' && <Modal title="Incident action plan" eyebrow="FOR AUTHORITY REVIEW" onClose={() => setModal(null)} wide><div className="modal-body"><p className="body-copy">{data?.apex?.doctrine_summary}</p>{directives.map((d, i) => <article className="directive-card" key={i}><span className={`status-label ${d.priority.startsWith('P0') ? 'critical' : 'watch'}`}>{d.priority.split('_')[0]}</span><div><h3>{pretty(d.action)}</h3><span>{d.target}</span><p>{d.details}</p></div></article>)}<div className="notice-box">Recommendations are based on scenario assumptions. Confirm current road conditions, local resources, and facility requirements before dispatching a response.</div></div></Modal>}
    {modal === 'asset' && selected && <Modal title={selected.name} eyebrow="INFRASTRUCTURE DETAIL" onClose={() => setModal(null)}><div className="modal-body"><div className="asset-detail-metrics"><div><span>Estimated depth</span><strong>{selected.water_depth_m.toFixed(2)}<small> m</small></strong></div><div><span>Ground elevation</span><strong>{selected.elevation_m}<small> m</small></strong></div></div><dl className="detail-list"><dt>Asset ID</dt><dd>{selected.id}</dd><dt>Coordinates</dt><dd>{selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}</dd><dt>Category</dt><dd>{pretty(selected.category)}</dd>{selectedHospital && <><dt>Grid supply</dt><dd>{selectedHospital.grid_mains_powered ? 'Online' : 'Interrupted in scenario'}</dd><dt>Fuel reserve</dt><dd>{selectedHospital.runtime_hours_remaining} hours</dd><dt>Critical care capacity</dt><dd>{selectedHospital.icu_patients} ICU beds</dd></>}</dl>{selectedHospital?.is_dry_but_outaged && <div className="notice-box">This hospital is dry in the scenario, but an upstream power dependency is interrupted. Check backup generation and resupply access.</div>}<div className="notice-box">Elevation, equipment thresholds and network links are curated demonstration assumptions.</div><button className="primary-button" onClick={() => { setTab('overview'); setModal(null); }}>Locate on map <Map size={16} /></button></div></Modal>}
    {selected && tab === 'overview' && !modal && <div className="selected-asset-card"><button className="icon-button" aria-label="Clear asset selection" onClick={() => setSelected(null)}><X size={14} /></button><span className="eyebrow">SELECTED INFRASTRUCTURE</span><strong>{selected.name}</strong><p>{selected.water_depth_m.toFixed(2)} m estimated depth · {selected.elevation_m} m elevation</p><button className="text-button" onClick={() => setModal('asset')}>Inspect dependencies <ArrowRight size={13} /></button></div>}
    {modal === 'advisory' && <Modal title="Prepare an early-action advisory" eyebrow="EVIDENCE → REVIEW → DELIVERY" onClose={() => setModal(null)} wide><div className="modal-body"><div className="advisory-toolbar"><label>Draft language<select value={language} onChange={e => setLanguage(e.target.value)} disabled={generating}><option>English</option><option>Tamil</option><option>Hindi</option></select></label><label className="checkbox-label"><input type="checkbox" checked={inspect} onChange={e => setInspect(e.target.checked)} disabled={generating} /> Include image inspection</label><button className="primary-button" disabled={generating || !data} onClick={generate}>{generating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}{generating ? 'Preparing evidence…' : advisory ? 'Regenerate draft' : 'Generate draft'}</button></div>{!advisory && !generating && <div className="draft-placeholder"><FileText size={35} /><h3>Your next action, clearly expressed.</h3><p>Generate a draft from run {data?.snapshot_id}. {status?.gemini_configured ? 'Gemini will reason over the scenario evidence.' : 'English rule-based drafting is available without an API key.'}</p></div>}{generating && <div className="draft-placeholder"><Loader2 size={32} className="spin" /><h3>Connecting evidence to recommendations</h3><p>Reviewing infrastructure dependencies and response windows…</p></div>}{advisory && !generating && <><div className="draft-document"><div className="draft-meta"><span className="status-label watch">PREPAREDNESS DRAFT</span><span>{advisory.engine_mode === 'gemini_live' ? advisory.model : 'Rule-based · English'} · {date(advisory.created_at)}</span></div><h2>{advisory.title}</h2><p>{advisory.summary}</p><h3>Recommended actions</h3><ol>{advisory.actions.map((action, i) => <li key={i}>{action}</li>)}</ol><div className="public-message"><span className="eyebrow">PUBLIC MESSAGE</span><p>{advisory.public_message}</p></div>{advisory.vision && <div className="vision-evidence"><div><Layers size={17} /><strong>{advisory.vision.image_source === 'earth_engine' ? 'Satellite composite inspection' : 'Synthetic demonstration inspection'}</strong><span className="status-label">{pretty(advisory.vision.engine_mode)}</span></div><p>{advisory.vision.geotechnical_summary}</p><span>Model judgments are uncalibrated. Synthetic fixtures do not constitute observed hazards.</span></div>}{advisory.notice && <div className="notice-box">{advisory.notice}</div>}<div className="draft-evidence">Evidence: {advisory.snapshot_id} · {advisory.advisory_id}<br />Scenario screening; local verification required. No official warning or financial release.</div></div><div className="dispatch-form"><label>Response team<input value={recipient} onChange={e => setRecipient(e.target.value)} maxLength={160} /></label><label>Delivery channel<select value={channel} onChange={e => setChannel(e.target.value)}><option value="test_inbox">In-app test inbox</option><option value="webhook" disabled={!status?.external_dispatch_configured}>Configured webhook</option></select></label></div><div className="dispatch-actions"><a className="secondary-button" href={`/api/operations/advisories/${advisory.advisory_id}/export`} download><ArrowDownToLine size={16} /> Download brief</a><button className="primary-button" disabled={delivering || recipient.trim().length < 3 || !!receiptMatches} onClick={dispatch}>{delivering ? <Loader2 size={16} className="spin" /> : receiptMatches ? <Check size={16} /> : <Send size={16} />}{receiptMatches ? 'Receipt recorded' : delivering ? 'Sending…' : channel === 'test_inbox' ? 'Send to test inbox' : 'Send reviewed advisory'}</button></div>{receiptMatches && <div className="delivery-confirmation" role="status"><Check size={18} /><span>{delivery.channel === 'test_inbox' ? 'Delivered to the in-app test inbox. No external authority was contacted.' : 'Configured webhook accepted the advisory.'}<small>{delivery.delivery_id} · {date(delivery.timestamp)}</small></span></div>}</>}{error && <div className="notice-box" role="alert">{error}</div>}</div></Modal>}
  </div>;
}
