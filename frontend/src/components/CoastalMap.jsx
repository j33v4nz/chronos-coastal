import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, LocateFixed, Waves, Zap, Mountain } from 'lucide-react';

const centers = { chennai: [13.02, 80.20], kochi: [9.9816, 76.315], mumbai: [19.055, 72.86], odisha: [20.285, 86.645] };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default function CoastalMap({ data, corridor, selected, onSelect, earth }) {
  const container = useRef(null);
  const map = useRef(null);
  const group = useRef(null);
  const earthLayer = useRef(null);
  const [power, setPower] = useState(true);
  const [exposure, setExposure] = useState(true);
  const [satellite, setSatellite] = useState(false);
  const [terrain, setTerrain] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const callbacks = useRef({ onSelect });
  callbacks.current = { onSelect };

  useEffect(() => {
    const instance = L.map(container.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView(centers[corridor], 12);
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, <a href="https://www.hotosm.org/">HOT</a>', maxZoom: 19, subdomains: ['a', 'b', 'c'],
    }).addTo(instance);
    tiles.on('tileerror', () => setMapUnavailable(true));
    tiles.on('load', () => { /* Asset overlays remain interactive if a tile fails. */ });
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    group.current = L.layerGroup().addTo(instance);
    map.current = instance;
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (map.current) map.current.setView(centers[corridor] || centers.chennai, corridor === 'odisha' ? 10 : 12);
  }, [corridor]);

  useEffect(() => {
    if (!map.current) return;
    if (earthLayer.current) { map.current.removeLayer(earthLayer.current); earthLayer.current = null; }
    const url = terrain ? earth?.terrain_tile_url : satellite ? earth?.tile_url : null;
    if (url) earthLayer.current = L.tileLayer(url, { opacity: .65, attribution: 'Google Earth Engine / Copernicus' }).addTo(map.current);
  }, [earth, satellite, terrain]);

  useEffect(() => {
    if (!group.current) return;
    group.current.clearLayers();
    const assets = data?.hydro?.assets || [];
    const positions = Object.fromEntries(assets.map(a => [a.id, [a.lat, a.lon]]));
    const tripped = new Set(data?.grid?.tripped_substations || []);
    const hospitals = data?.grid?.hospitals || [];
    if (power) (data?.grid?.edge_statuses || []).forEach(edge => {
      if (positions[edge.source] && positions[edge.target]) L.polyline([positions[edge.source], positions[edge.target]], {
        color: edge.is_energized ? '#268576' : '#e2715c', weight: 2, opacity: .65, dashArray: edge.is_energized ? null : '5 7',
      }).addTo(group.current);
    });
    assets.forEach(a => {
      const h = hospitals.find(hospital => hospital.id === a.id);
      const risk = tripped.has(a.id) || (h && !h.grid_mains_powered) || a.water_depth_m >= .4;
      const color = risk ? '#d46650' : a.water_depth_m > 0 ? '#cf9639' : '#227e6e';
      const symbol = a.type === 'hospital' ? '+' : a.type === 'oxygen_plant' ? 'O₂' : a.type === 'fuel_terminal' ? 'F' : a.type === 'road_choke' ? '↗' : 'ϟ';
      const active = a.id === selected?.id;
      if (exposure && a.water_depth_m > 0) L.circle([a.lat, a.lon], { radius: 350 + Math.min(a.water_depth_m, 3) * 200, weight: 1, color, fillColor: color, fillOpacity: .10, dashArray: '3 4' }).addTo(group.current);
      const icon = L.divIcon({ className: 'coast-marker-host', iconSize: [34, 34], iconAnchor: [17, 17], html: `<div class="coast-marker ${active ? 'selected' : ''}" style="--marker-color:${color}"><span>${symbol}</span></div>` });
      const marker = L.marker([a.lat, a.lon], { icon }).addTo(group.current);
      marker.bindTooltip(`<strong>${escape(a.name)}</strong><br>${a.water_depth_m.toFixed(2)} m scenario depth`, { className: 'coast-tooltip', direction: 'top', offset: [0, -15] });
      marker.on('click', () => callbacks.current.onSelect(a));
    });
  }, [data, power, exposure, selected]);

  useEffect(() => {
    if (selected && map.current) map.current.flyTo([selected.lat, selected.lon], Math.max(map.current.getZoom(), 12), { duration: .5 });
  }, [selected]);

  return <div className="coast-map-wrap">
    <div ref={container} className="coast-map" aria-label="Interactive infrastructure exposure map" />
    <div className="map-heading"><span className="map-live-dot" /> INFRASTRUCTURE EXPOSURE <span className="map-mode">SCENARIO</span></div>
    <div className="map-layer-controls">
      <button className={exposure ? 'active' : ''} onClick={() => setExposure(v => !v)} title="Toggle illustrative asset exposure buffers"><Waves size={15} /> Exposure</button>
      <button className={power ? 'active' : ''} onClick={() => setPower(v => !v)}><Zap size={15} /> Power network</button>
      <button disabled={!earth?.tile_url} className={satellite ? 'active' : ''} onClick={() => { setSatellite(v => !v); setTerrain(false); }} title={earth?.tile_url ? 'Observed SAR change candidates' : 'Connect Earth Engine to enable satellite data'}><Layers size={15} /> SAR</button>
      <button disabled={!earth?.terrain_tile_url} className={terrain ? 'active' : ''} onClick={() => { setTerrain(v => !v); setSatellite(false); }}><Mountain size={15} /> Terrain</button>
    </div>
    <button className="map-locate" aria-label="Recenter map" onClick={() => map.current?.setView(centers[corridor], corridor === 'odisha' ? 10 : 12)}><LocateFixed size={18} /></button>
    {mapUnavailable && <div className="map-offline">Some basemap tiles are unavailable. Asset overlays remain visible.</div>}
    <div className="map-legend"><span><i className="green" /> Operational</span><span><i className="amber" /> Exposed</span><span><i className="red" /> Service at risk</span></div>
    <div className="map-caption">{satellite || terrain ? 'Satellite observations · acquisition dates in Data sources' : 'Illustrative asset buffers · not a mapped flood extent'}</div>
  </div>;
}
