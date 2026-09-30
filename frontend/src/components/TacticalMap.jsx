import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CENTERS = {
  kochi: [9.9816, 76.3150, 12],
  chennai: [13.0200, 80.2000, 12],
  mumbai: [19.0550, 72.8600, 12],
  odisha: [20.2850, 86.6450, 11]
};
const clean = value => String(value ?? '—');

export default function TacticalMap({ simData, activeCorridor = 'kochi', onSelectAsset }) {
  const container = useRef(null);
  const map = useRef(null);
  const layers = useRef(null);

  useEffect(() => {
    if (!container.current) return;
    const [lat, lon, zoom] = CENTERS[activeCorridor] || CENTERS.kochi;
    map.current = L.map(container.current, { center: [lat, lon], zoom, minZoom: 9, maxZoom: 16, zoomControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map.current);
    L.control.zoom({ position: 'topright' }).addTo(map.current);
    layers.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; layers.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const [lat, lon, zoom] = CENTERS[activeCorridor] || CENTERS.kochi;
    map.current.setView([lat, lon], zoom);
  }, [activeCorridor]);

  useEffect(() => {
    if (!layers.current) return;
    layers.current.clearLayers();
    const assets = simData?.hydro?.assets || [];
    const grid = simData?.grid || {};
    const coordinates = new Map(assets.map(asset => [asset.id, [asset.lat, asset.lon]]));
    const tripped = new Set(grid.tripped_substations || []);
    const hospitals = new Map((grid.hospitals || []).map(hospital => [hospital.id, hospital]));

    assets.forEach(asset => {
      const depth = Number(asset.water_depth_m || 0);
      if (depth > 0) L.circle([asset.lat, asset.lon], {
        radius: Math.min(1200, 350 + depth * 220),
        stroke: false,
        fillColor: depth >= 0.4 ? '#c4695c' : '#6fa9b2',
        fillOpacity: Math.min(.25, .10 + depth * .05),
        interactive: false
      }).addTo(layers.current);
    });
    (grid.edge_statuses || []).forEach(edge => {
      const from = coordinates.get(edge.source);
      const to = coordinates.get(edge.target);
      if (from && to) L.polyline([from, to], {
        color: edge.is_energized ? '#6aaba0' : '#cf897c',
        weight: edge.is_energized ? 2 : 2.5,
        opacity: .75,
        dashArray: edge.is_energized ? undefined : '5 5',
        interactive: false
      }).addTo(layers.current);
    });
    assets.forEach(asset => {
      const hospital = hospitals.get(asset.id);
      const isHospital = asset.type === 'hospital';
      const isTripped = tripped.has(asset.id);
      const blackout = hospital?.hospital_status?.includes('BLACKOUT');
      const color = blackout || isTripped ? '#bd6359' : hospital?.on_generator ? '#c89a4e' : isHospital ? '#4d9c73' : '#337e77';
      const marker = L.circleMarker([asset.lat, asset.lon], {
        radius: isHospital ? 9 : 7,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 1
      }).addTo(layers.current);
      const tooltip = document.createElement('span');
      tooltip.textContent = asset.name;
      marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -6], className: 'map-asset-label' });
      const popup = document.createElement('div');
      const heading = document.createElement('strong');
      heading.textContent = asset.name;
      popup.append(heading);
      const addLine = (label, value) => {
        const line = document.createElement('div');
        line.textContent = label + ': ' + clean(value);
        popup.append(line);
      };
      addLine('Asset', asset.id);
      addLine('Flood depth', clean(asset.water_depth_m) + ' m');
      addLine('Elevation', clean(asset.elevation_m) + ' m');
      if (hospital) addLine('Power', blackout ? 'Blackout' : hospital.on_generator ? 'Generator' : 'Mains');
      if (isTripped) addLine('Breaker', 'Tripped');
      marker.bindPopup(popup);
      marker.on('click', () => onSelectAsset?.(asset));
    });
  }, [simData, activeCorridor, onSelectAsset]);

  return <div className="map-container" ref={container} style={{ width: '100%', height: '100%' }} aria-label="Coastal asset map" />;
}
