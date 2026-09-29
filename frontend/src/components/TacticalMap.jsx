import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const CORRIDOR_CENTERS = {
  kochi: { lat: 9.9816, lon: 76.3150, zoom: 12 },
  chennai: { lat: 13.0200, lon: 80.2000, zoom: 12 },
  mumbai: { lat: 19.0550, lon: 72.8600, zoom: 12 },
  odisha: { lat: 20.2850, lon: 86.6450, zoom: 11 }
};

export default function TacticalMap({ simData, activeCorridor = 'kochi', onSelectAsset }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const center = CORRIDOR_CENTERS[activeCorridor] || CORRIDOR_CENTERS.kochi;
      const map = L.map(mapContainerRef.current, {
        center: [center.lat, center.lon],
        zoom: center.zoom,
        minZoom: 9,
        maxZoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      // CartoDB Dark Matter Basemap
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Top-right zoom control
      L.control.zoom({ position: 'topright' }).addTo(map);

      layersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Fly to new corridor center when corridor changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const center = CORRIDOR_CENTERS[activeCorridor] || CORRIDOR_CENTERS.kochi;
    mapInstanceRef.current.flyTo([center.lat, center.lon], center.zoom, {
      duration: 1.5
    });
  }, [activeCorridor]);

  // Update dynamic layers when simulation data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !layersGroupRef.current) return;

    const layersGroup = layersGroupRef.current;
    layersGroup.clearLayers();

    const hydro = simData?.hydro || {};
    const grid = simData?.grid || {};
    const assets = hydro.assets || [];
    const edgeStatuses = grid.edge_statuses || [];
    const trippedSubstations = new Set(grid.tripped_substations || []);
    const hospitals = grid.hospitals || [];

    // Map asset coordinates for line drawing
    const assetCoordMap = {};
    assets.forEach(a => {
      assetCoordMap[a.id] = [a.lat, a.lon];
    });

    // 1. Draw Inundation Circles (Estuarine Flood Footprint)
    assets.forEach(a => {
      const depth = a.water_depth_m || 0.0;
      if (depth > 0.0) {
        const color = depth >= 0.40 ? '#ef4444' : '#06b6d4';
        const radius = Math.min(35, 14 + depth * 18);
        const opacity = Math.min(0.65, 0.25 + depth * 0.3);

        L.circle([a.lat, a.lon], {
          radius: radius * 35,
          fillColor: color,
          fillOpacity: opacity,
          color: color,
          weight: 1.5,
          opacity: 0.6
        }).addTo(layersGroup);
      }
    });

    // 2. Draw Electrical Power Grid Transmission Lines (DAG Edges)
    edgeStatuses.forEach(edge => {
      const srcCoord = assetCoordMap[edge.source];
      const dstCoord = assetCoordMap[edge.target];

      if (srcCoord && dstCoord) {
        const isEnergized = edge.is_energized;
        const color = isEnergized ? '#00f0ff' : '#f43f5e';
        const weight = isEnergized ? 2.5 : 1.5;
        const dashArray = isEnergized ? null : '6, 6';

        L.polyline([srcCoord, dstCoord], {
          color: color,
          weight: weight,
          opacity: isEnergized ? 0.75 : 0.4,
          dashArray: dashArray
        }).addTo(layersGroup);
      }
    });

    // 3. Draw Asset Markers with Status Badges
    assets.forEach(asset => {
      const isHospital = asset.type === 'hospital';
      const isSubstation = asset.category === 'transmission' || asset.category === 'distribution' || asset.type === 'substation';
      const isSource = asset.category === 'transmission' && asset.elevation_m > 20;
      const isTripped = trippedSubstations.has(asset.id);

      // Hospital specific status
      const hospData = hospitals.find(h => h.id === asset.id);
      const onDg = hospData?.on_generator;
      const dgFlooded = hospData?.hospital_status === 'CATASTROPHIC_BLACKOUT_DG_SUBMERGED';

      let markerBg = '#0ea5e9'; // Blue default
      let iconSymbol = '⚡';
      let pulseClass = '';

      if (isSource) {
        markerBg = '#8b5cf6'; // Purple for 400kV Bulk Intertie
        iconSymbol = '⚡';
      } else if (isHospital) {
        iconSymbol = '🏥';
        if (dgFlooded) {
          markerBg = '#e11d48'; // Crimson blackout
          pulseClass = 'animate-ping';
        } else if (onDg) {
          markerBg = '#f59e0b'; // Amber for running on generator
        } else {
          markerBg = '#10b981'; // Green mains powered
        }
      } else if (isSubstation) {
        if (isTripped) {
          markerBg = '#f43f5e'; // Crimson tripped
          pulseClass = 'animate-ping';
        } else {
          markerBg = '#06b6d4'; // Cyan energized
        }
      } else if (asset.type === 'oxygen_plant') {
        markerBg = '#0284c7';
        iconSymbol = '💨';
      } else if (asset.type === 'fuel_terminal') {
        markerBg = '#d97706';
        iconSymbol = '⛽';
      }

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer">
            ${isTripped || dgFlooded ? `<span class="absolute w-8 h-8 rounded-full bg-rose-500/40 ${pulseClass}"></span>` : ''}
            <div style="background-color: ${markerBg}; box-shadow: 0 0 12px ${markerBg};" class="w-7 h-7 rounded-lg border border-white/80 flex items-center justify-center text-xs font-bold text-white z-10 transition-transform hover:scale-125">
              ${iconSymbol}
            </div>
            <div class="absolute -bottom-4 whitespace-nowrap text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-black/80 text-slate-200 border border-slate-700 pointer-events-none">
              ${asset.id}
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([asset.lat, asset.lon], { icon: customIcon }).addTo(layersGroup);

      // Interactive popup
      const popupHtml = `
        <div class="p-2 text-xs font-sans min-w-[200px] bg-slate-900 text-slate-100 rounded border border-slate-700">
          <div class="font-bold text-cyan-400 mb-1 flex items-center justify-between">
            <span>${asset.name}</span>
            <span class="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-300">${asset.id}</span>
          </div>
          <div class="space-y-0.5 font-mono text-[11px] text-slate-300 border-t border-slate-800 pt-1">
            <div>Elevation: <span class="font-bold text-white">${asset.elevation_m}m</span></div>
            <div>WSE: <span class="font-bold text-cyan-300">${asset.wse_m}m</span></div>
            <div>Flood Depth: <span class="font-bold ${asset.water_depth_m > 0 ? 'text-rose-400' : 'text-emerald-400'}">${asset.water_depth_m}m</span></div>
            ${isSubstation ? `<div>Breaker Status: <span class="font-bold ${isTripped ? 'text-rose-400' : 'text-emerald-400'}">${isTripped ? 'ANSI 21 TRIPPED' : 'ENERGIZED'}</span></div>` : ''}
            ${isHospital && hospData ? `
              <div>Mains Grid: <span class="font-bold ${hospData.grid_mains_powered ? 'text-emerald-400' : 'text-rose-400'}">${hospData.grid_mains_powered ? 'ONLINE' : 'CUT'}</span></div>
              <div>Backup DG: <span class="font-bold ${hospData.on_generator ? 'text-amber-400' : 'text-slate-400'}">${hospData.on_generator ? `ACTIVE (${hospData.runtime_hours_remaining}h left)` : 'STANDBY'}</span></div>
              <div>ICU Patients: <span class="font-bold text-white">${hospData.icu_patients}</span></div>
            ` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'custom-dark-popup' });
      marker.on('click', () => {
        if (onSelectAsset) onSelectAsset(asset);
      });
    });
  }, [simData, activeCorridor]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full bg-[#070b14]" />

      {/* Floating Tactical Overlay HUD */}
      <div className="absolute top-2.5 left-2.5 z-[1000] bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-xl font-mono text-xs flex items-center space-x-3 pointer-events-none">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]"></span>
          <span className="text-[11px] text-slate-300">220kV Grid DAG</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]"></span>
          <span className="text-[11px] text-slate-300">Arc-Flash (&gt;0.4m)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span className="text-[11px] text-slate-300">Hospital on DG</span>
        </div>
      </div>
    </div>
  );
}
