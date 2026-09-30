import React, { useEffect, useRef, useState } from 'react';
import { Activity, ArrowRight, ChevronDown, AlertCircle, Eye, FileText, MapPin, Play, Radio, RefreshCw, Shield, Truck, Waves, X, Zap } from 'lucide-react';
import TacticalMap from './components/TacticalMap';

const DEFAULTS = {
  kochi: { surge: 1.85, inflow: 550, hours: 6 },
  chennai: { surge: 1.8, inflow: 520, hours: 5 },
  mumbai: { surge: 2.1, inflow: 600, hours: 4 },
  odisha: { surge: 3.2, inflow: 880, hours: 6 }
};
const PRESETS = [
  { id: 'baseline', label: 'Baseline', values: { surge: 0.4, inflow: 280, hours: 18 } },
  { id: 'landfall', label: 'Landfall', values: { surge: 1.85, inflow: 550, hours: 6 } },
  { id: 'severe', label: 'Severe event', values: { surge: 2.8, inflow: 950, hours: 3 } }
];
const fmt = (value, places = 1) => Number(value || 0).toFixed(places);
const title = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
function Status({ tone = 'neutral', children }) { return <span className={'status status-' + tone}>{children}</span>; }
function Panel({ title: name, eyebrow, action, children, className = '' }) {
  return <section className={'panel ' + className}><div className="panel-head"><div><span className="eyebrow">{eyebrow}</span><h2>{name}</h2></div>{action}</div>{children}</section>;
}
function Modal({ title: name, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    const escape = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={'modal ' + (wide ? 'modal-wide' : '')} role="dialog" aria-modal="true" aria-label={name}>
      <div className="modal-head"><div><span className="eyebrow">{subtitle}</span><h2>{name}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>
      <div className="modal-body">{children}</div>
    </div>
  </div>;
}
function Slider({ label, unit, value, min, max, step, onChange, id }) {
  return <div className="slider-field"><div className="slider-label"><label htmlFor={id}>{label}</label><strong>{fmt(value, step < 1 ? 2 : 0)} {unit}</strong></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} /><div className="range-ends"><span>{min} {unit}</span><span>{max} {unit}</span></div></div>;
}
function GridPanel({ grid, onInspect }) {
  if (!grid) return <p className="empty">Run a simulation to see grid and hospital status.</p>;
  return <><div className="inline-summary"><Zap size={16} /><span><strong>{grid.tripped_substation_count}</strong> tripped substations</span><span className="inline-divider" /><span><strong>{grid.dark_dry_nodes_count}</strong> dark, dry assets</span></div>
    <div className="item-list">{(grid.hospitals || []).map(hospital => {
      const tone = hospital.hospital_status?.includes('BLACKOUT') ? 'danger' : hospital.on_generator ? 'warning' : 'success';
      return <div className="item-row" key={hospital.id}><div className={'item-icon mark-' + tone}><Activity size={18} /></div><div className="item-info"><strong>{hospital.name}</strong><span>{hospital.icu_patients} ICU beds · {fmt(hospital.water_depth_m, 2)} m water</span></div><div className="item-result"><Status tone={tone}>{tone === 'danger' ? 'Blackout' : hospital.on_generator ? 'Generator' : 'Mains online'}</Status>{hospital.on_generator && <small>{fmt(hospital.runtime_hours_remaining)} h fuel</small>}</div><button className="text-button" onClick={() => onInspect(hospital)} aria-label={'Inspect ' + hospital.name}>Inspect <ArrowRight size={14} /></button></div>;
    })}</div></>;
}
function RoutesPanel({ routes }) {
  if (!routes?.length) return <p className="empty">Run a simulation to see route clearance.</p>;
  return <div className="item-list">{routes.map(route => {
    const blocked = route.is_currently_submerged;
    const window = route.departure_window_remaining_min;
    return <div className="item-row" key={route.corridor_id}><div className="item-icon"><Truck size={18} /></div><div className="item-info"><strong>{route.name}</strong><span>{route.choke_point_name} · {title(route.cargo_type)}</span></div><div className="item-result"><Status tone={blocked ? 'danger' : window !== null && window <= 60 ? 'warning' : 'success'}>{blocked ? 'Blocked' : window !== null && window <= 60 ? 'Closing' : 'Open'}</Status><small>{blocked ? 'Submerged now' : window === null ? 'No breach in horizon' : fmt(window, 0) + ' min to depart'}</small></div></div>;
  })}</div>;
}
function Inspection({ report, loading, error, corridor, surge, asset, onRun, onClose }) {
  const query = new URLSearchParams({ corridor_id: corridor, depth: '0.5', surge: String(surge) });
  return <Modal title="Site inspection" subtitle="Composite map and hazard report" onClose={onClose} wide><div className="modal-actions"><Status tone={report?.engine_mode?.includes('LIVE') ? 'success' : 'neutral'}>{report?.engine_mode?.includes('LIVE') ? 'Gemini 2.5 Flash' : 'Synthetic scenario'}</Status><button className="button button-secondary" onClick={() => onRun(asset)} disabled={loading}><RefreshCw size={15} /> Re-analyze</button></div>{error && <p className="error-line">{error}</p>}{loading ? <p className="empty">Inspecting the selected corridor…</p> : report ? <><div className="inspection-grid"><img src={'/api/tile/preview?' + query.toString()} alt={'Composite map of ' + corridor} /><div><span className="eyebrow">Assessment</span><h3>{report.target_facility}</h3><div className="inspection-risk"><Status tone={report.overall_risk_level === 'CRITICAL' ? 'danger' : 'warning'}>{report.overall_risk_level}</Status><span>{fmt(report.structural_washout_probability * 100, 0)}% modeled washout likelihood</span></div><p>{report.geotechnical_summary}</p><span className="eyebrow">Recommended actions</span><ul>{report.recommended_countermeasures?.map((item, index) => <li key={index}>{item}</li>)}</ul></div></div><h3 className="section-heading">Detected zones</h3><div className="zone-list">{report.detected_hazards?.map((zone, index) => <div className="zone" key={index}><strong>{title(zone.label)}</strong><small>Confidence {fmt(zone.confidence * 100, 0)}% · Box [{zone.box_2d?.join(', ')}]</small><p>{zone.description}</p></div>)}</div></> : <p className="empty">No inspection result yet.</p>}</Modal>;
}
function Oracle({ voucher, onClose }) {
  return <Modal title="Scenario voucher" subtitle="Parametric oracle" onClose={onClose}><p className="muted">This simulated voucher uses modeled inputs. It does not transfer funds or verify satellite observations.</p>{voucher ? <><div className="voucher-amount">USD {Number(voucher.payout_amount_usd || 0).toLocaleString()}<span>modeled payout</span></div><div className="fact-list"><div><span>Status</span><Status tone={voucher.threshold_exceeded ? 'success' : 'neutral'}>{voucher.threshold_exceeded ? 'Threshold met' : 'Monitoring'}</Status></div><div><span>SAR delta (modeled)</span><strong>{fmt(voucher.sar_backscatter_delta_db, 2)} dB</strong></div><div><span>Flooded asset fraction</span><strong>{fmt(voucher.flooded_area_fraction * 100)}%</strong></div><div><span>Recipient</span><strong>{voucher.disbursement_entity}</strong></div><div><span>Voucher</span><strong>{voucher.voucher_id}</strong></div></div><p className="hash">{voucher.sha256_cryptographic_seal}</p></> : <p className="empty">Run a simulation to generate a scenario voucher.</p>}</Modal>;
}
function Evaluations({ onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const load = async (rerun = false) => {
    setRunning(true); setError('');
    try { const response = await fetch(rerun ? '/api/evals/run' : '/api/evals/results', rerun ? { method: 'POST' } : undefined); if (!response.ok) throw new Error('Evaluation request failed (' + response.status + ')'); setData(await response.json()); }
    catch (err) { setError(err.message); } finally { setRunning(false); }
  };
  useEffect(() => { load(); }, []);
  const metrics = data?.headline_metrics;
  return <Modal title="Model checks" subtitle="Evaluation diagnostics" onClose={onClose} wide><div className="modal-actions"><Status tone="warning">Demo reference scenarios</Status><button className="button button-secondary" onClick={() => load(true)} disabled={running}><RefreshCw size={15} /> Run checks</button></div><p className="muted">Reference scenarios and synthetic image fixtures support regression checks. They do not establish field accuracy. There is no independent composite score.</p>{running && <p className="empty">Running checks…</p>}{error && <p className="error-line">{error}</p>}{metrics && <div className="eval-grid"><div><span>Hydrology NSE</span><strong>{fmt(metrics.mean_nash_sutcliffe_efficiency, 3)}</strong></div><div><span>Fixture box overlap</span><strong>{fmt(metrics.vision_macro_mIoU, 3)}</strong></div><div><span>Grid trip F1</span><strong>{fmt(metrics.grid_breaker_trip_f1, 3)}</strong></div><div><span>Route self-check</span><strong>{fmt(metrics.zero_hazard_safety_fidelity, 3)}</strong></div></div>}{data?.physics_and_hydrology?.corridor_evaluations && <div className="eval-table"><div className="table-head"><span>Corridor</span><span>NSE</span><span>RMSE</span><span>Gauges</span></div>{Object.entries(data.physics_and_hydrology.corridor_evaluations).map(([id, row]) => <div className="table-row" key={id}><strong>{title(id)}</strong><span>{fmt(row.metrics.nash_sutcliffe_efficiency, 3)}</span><span>{fmt(row.metrics.rmse_m, 2)} m</span><span>{row.gauge_count}</span></div>)}</div>}</Modal>;
}
function Guide({ onClose, onPreset, onInspect, onOracle }) {
  return <Modal title="Demo guide" subtitle="Walkthrough" onClose={onClose}><div className="guide-list"><div><span>01</span><p><strong>Choose a corridor.</strong> Set a baseline and run the simulation.</p></div><div><span>02</span><p><strong>Increase surge and inflow.</strong> Watch the map, grid, and routes update together.</p></div><div><span>03</span><p><strong>Inspect a hospital.</strong> Review the generated map and scenario hazards.</p></div><div><span>04</span><p><strong>Open the voucher.</strong> Compare the threshold with the modeled payout.</p></div></div><div className="modal-actions"><button className="button button-secondary" onClick={() => { onPreset('baseline'); onClose(); }}>Load baseline</button><button className="button button-secondary" onClick={() => { onClose(); onInspect(); }}>Inspect site</button><button className="button button-primary" onClick={() => { onClose(); onOracle(); }}>View voucher</button></div></Modal>;
}
export default function App() {
  const [corridor, setCorridor] = useState('kochi');
  const [corridors, setCorridors] = useState([]);
  const [inputs, setInputs] = useState(DEFAULTS.kochi);
  const [preset, setPreset] = useState('landfall');
  const [sim, setSim] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [modal, setModal] = useState(null);
  const [asset, setAsset] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectionError, setInspectionError] = useState('');
  const requestId = useRef(0);
  const controller = useRef(null);
  const run = async (values = inputs, id = corridor) => {
    controller.current?.abort();
    const current = ++requestId.current;
    const next = new AbortController();
    controller.current = next;
    setRunning(true); setError('');
    try {
      const response = await fetch('/api/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: next.signal, body: JSON.stringify({ corridor_id: id, ocean_surge_m: values.surge, river_inflow_m3s: values.inflow, hours_to_landfall: values.hours }) });
      if (!response.ok) throw new Error('Simulation failed (' + response.status + ')');
      const data = await response.json();
      if (current === requestId.current) setSim(data);
    } catch (err) { if (err.name !== 'AbortError' && current === requestId.current) setError(err.message); }
    finally { if (current === requestId.current) setRunning(false); }
  };
  useEffect(() => {
    fetch('/api/corridors').then(response => response.ok ? response.json() : []).then(setCorridors).catch(() => setCorridors([]));
    run(DEFAULTS.kochi, 'kochi');
    return () => { controller.current?.abort(); };
  }, []);
  useEffect(() => {
    let socket, timer, disposed = false;
    const connect = () => {
      if (disposed) return;
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(protocol + '//' + location.host + '/ws/tactical-feed');
      socket.onopen = () => { if (!disposed) setConnected(true); };
      socket.onmessage = event => { try { const message = JSON.parse(event.data); if (!disposed && message.id) setMessages(previous => [message, ...previous].slice(0, 80)); } catch { /* Ignore malformed frames. */ } };
      socket.onclose = () => { if (!disposed) { setConnected(false); timer = setTimeout(connect, 3000); } };
      socket.onerror = () => socket.close();
    };
    connect();
    return () => { disposed = true; clearTimeout(timer); socket?.close(); };
  }, []);
  const chooseCorridor = id => { const values = DEFAULTS[id] || DEFAULTS.kochi; setCorridor(id); setInputs(values); setPreset('custom'); setAsset(null); setSim(null); run(values, id); };
  const choosePreset = id => { const values = PRESETS.find(item => item.id === id)?.values || DEFAULTS[corridor]; setPreset(id); setInputs(values); run(values, corridor); };
  const changeInput = (key, value) => { setInputs(previous => ({ ...previous, [key]: value })); setPreset('custom'); };
  const inspect = async (target = asset) => {
    setAsset(target || null); setModal('inspection'); setInspecting(true); setInspectionError(''); setInspection(null);
    try { const response = await fetch('/api/gemini/inspect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ corridor_id: corridor, water_depth_m: 0.5, surge_m: inputs.surge, target_facility: target?.name || null }) }); if (!response.ok) throw new Error('Inspection failed (' + response.status + ')'); setInspection(await response.json()); }
    catch (err) { setInspectionError(err.message); } finally { setInspecting(false); }
  };
  const grid = sim?.grid;
  const routes = sim?.logistics?.routes || [];
  const urgent = routes.filter(route => route.is_currently_submerged || (route.departure_window_remaining_min !== null && route.departure_window_remaining_min <= 60)).length;
  const corridorName = corridors.find(item => item.id === corridor)?.name || title(corridor);
  return <div className="app-shell"><header className="topbar"><div className="brand"><div className="brand-mark"><Waves size={21} /></div><div><strong>CHRONOS</strong><span>COASTAL / SIMULATION WORKSPACE</span></div></div><nav aria-label="Workspace" className="top-nav"><a href="#overview">Overview</a><a href="#infrastructure">Infrastructure</a><a href="#activity">Activity</a></nav><div className="top-actions"><Status tone={connected ? 'success' : 'neutral'}><Radio size={12} /> {connected ? 'Live feed' : 'Reconnecting'}</Status><button className="button button-quiet" onClick={() => setModal('guide')}><FileText size={16} /> Guide</button><button className="button button-quiet" onClick={() => setModal('evals')}><Activity size={16} /> Model checks</button></div></header>
    <main className="workspace" id="overview"><div className="page-intro"><div><span className="eyebrow">MISSION CONTROL / {corridor.toUpperCase()}</span><h1>Coastal resilience overview</h1><p>Explore scenario impacts across water, power, and emergency routes.</p></div><div className="intro-actions"><button className="button button-secondary" onClick={() => inspect()}><Eye size={16} /> Inspect site</button><button className="button button-primary" onClick={() => setModal('oracle')}><Shield size={16} /> View voucher</button></div></div>
      {error && <div className="error-banner"><AlertCircle size={16} /> {error} <button onClick={() => run()}>Retry</button></div>}
      <div className="metric-grid"><div className="metric"><span>Flooded assets</span><div><strong>{sim?.hydro?.flooded_asset_count ?? '—'}</strong><small>of {sim?.hydro?.total_assets ?? '—'}</small></div><Waves size={18} /></div><div className="metric"><span>Grid trips</span><div><strong>{grid?.tripped_substation_count ?? '—'}</strong><small>substations</small></div><Zap size={18} /></div><div className="metric"><span>ICU patients at risk</span><div><strong>{grid ? grid.total_patients_on_dg_risk + grid.total_blacked_out_icu_patients : '—'}</strong><small>modeled</small></div><Activity size={18} /></div><div className="metric"><span>Urgent routes</span><div><strong>{sim ? urgent : '—'}</strong><small>of {routes.length}</small></div><Truck size={18} /></div></div>
      <div className="main-grid"><aside className="control-column"><Panel title="Scenario setup" eyebrow="Inputs" action={<Status>Editable</Status>}><div className="control-body"><label className="select-label" htmlFor="corridor">Coastal corridor</label><div className="select-wrap"><MapPin size={16} /><select id="corridor" value={corridor} onChange={event => chooseCorridor(event.target.value)}>{(corridors.length ? corridors : Object.keys(DEFAULTS).map(id => ({ id, name: title(id) }))).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={15} /></div><div className="preset-label">Quick scenarios</div><div className="preset-row">{PRESETS.map(item => <button key={item.id} className={'preset ' + (preset === item.id ? 'active' : '')} onClick={() => choosePreset(item.id)}>{item.label}</button>)}</div><Slider id="surge" label="Ocean surge" unit="m" value={inputs.surge} min={0} max={5} step={0.05} onChange={value => changeInput('surge', value)} /><Slider id="inflow" label="River inflow" unit="m³/s" value={inputs.inflow} min={50} max={2500} step={25} onChange={value => changeInput('inflow', value)} /><Slider id="hours" label="Hours to landfall" unit="h" value={inputs.hours} min={0.5} max={24} step={0.5} onChange={value => changeInput('hours', value)} /><button className="button button-primary run-button" onClick={() => run()} disabled={running}>{running ? <RefreshCw className="spin" size={17} /> : <Play size={17} />}{running ? 'Running scenario…' : 'Run simulation'}</button><p className="helper">Results are modeled scenarios for exploration.</p></div></Panel><Panel title="Incident priorities" eyebrow="Action plan"><div className="directive-list">{sim?.apex?.tactical_directives?.length ? sim.apex.tactical_directives.slice(0, 4).map((item, index) => <div className="directive" key={index}><span className="directive-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{item.action}</strong><p>{item.details}</p></div></div>) : <p className="empty">Run a scenario to generate priorities.</p>}</div></Panel></aside>
        <div className="content-column"><Panel title={corridorName} eyebrow="Geospatial view" action={<span className="map-key"><i /> Flood extent <i /> Grid links</span>} className="map-panel"><div className="map-frame"><TacticalMap simData={sim} activeCorridor={corridor} onSelectAsset={setAsset} /></div><div className="map-footer"><span><MapPin size={15} /> Select an asset to inspect it</span>{asset && <button className="text-button" onClick={() => inspect(asset)}>Inspect {asset.name} <ArrowRight size={14} /></button>}</div></Panel><div className="lower-grid" id="infrastructure"><Panel title="Power & care" eyebrow="Grid cascade"><GridPanel grid={grid} onInspect={inspect} /></Panel><Panel title="Supply routes" eyebrow="Logistics"><RoutesPanel routes={routes} /></Panel></div></div></div>
      <div id="activity"><Panel title="Activity" eyebrow="Agent event feed" action={<Status tone={connected ? 'success' : 'neutral'}>{connected ? 'Live' : 'Offline'}</Status>} className="feed-panel">{messages.length ? <div className="feed-list">{messages.slice(0, 18).map(message => <div className="feed-row" key={message.id}><div className={'feed-dot priority-' + message.priority} /><div><div className="feed-meta"><strong>{message.sender}</strong><span>{new Date(message.timestamp).toLocaleTimeString()}</span></div><p>{message.payload?.message || title(message.topic)}</p></div></div>)}</div> : <p className="empty">Events will appear after the live connection starts.</p>}</Panel></div><footer className="footer">CHRONOS COASTAL <span>Scenario modeling workspace · Results require field validation before operational use</span></footer></main>
    {modal === 'inspection' && <Inspection report={inspection} loading={inspecting} error={inspectionError} corridor={corridor} surge={inputs.surge} asset={asset} onRun={inspect} onClose={() => setModal(null)} />}
    {modal === 'oracle' && <Oracle voucher={sim?.oracle} onClose={() => setModal(null)} />}
    {modal === 'evals' && <Evaluations onClose={() => setModal(null)} />}
    {modal === 'guide' && <Guide onClose={() => setModal(null)} onPreset={choosePreset} onInspect={inspect} onOracle={() => setModal('oracle')} />}
  </div>;
}
