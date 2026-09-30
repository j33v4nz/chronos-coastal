import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Eye, Zap, Waves, AlertTriangle } from 'lucide-react';

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

  // Layer toggles
  const [showFlood, setShowFlood] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

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

      // CartoDB Dark Matter Basemap with smooth vector rendering
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

  // Update dynamic layers when simulation data changes or toggles change
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
    if (showFlood) {
      assets.forEach(a => {
        const depth = a.water_depth_m || 0.0;
        if (depth > 0.0) {
          const color = depth >= 0.40 ? '#f43f5e' : depth >= 0.20 ? '#06b6d4' : '#10b981';
          const radius = Math.min(45, 16 + depth * 22);
          const opacity = Math.min(0.70, 0.25 + depth * 0.35);

          L.circle([a.lat, a.lon], {
            radius: radius * 35,
            fillColor: color,
            fillOpacity: opacity,
            color: color,
            weight: 1.5,
            opacity: 0.8
          }).addTo(layersGroup);
        }
      });
    }

    // 2. Draw Electrical Power Grid Transmission Lines (DAG Edges)
    if (showGrid) {
      edgeStatuses.forEach(edge => {
        const srcCoord = assetCoordMap[edge.source];
        const dstCoord = assetCoordMap[edge.target];

        if (srcCoord && dstCoord) {
          const isEnergized = edge.is_energized;
          const color = isEnergized ? '#00f0ff' : '#f43f5e';
          const weight = isEnergized ? 2.5 : 1.8;
          const dashArray = isEnergized ? null : '6, 6';

          L.polyline([srcCoord, dstCoord], {
            color: color,
            weight: weight,
            opacity: isEnergized ? 0.85 : 0.45,
            dashArray: dashArray
          }).addTo(layersGroup);
        }
      });
    }

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
      let haloPulse = '';

      if (isSource) {
        markerBg = '#8b5cf6'; // Purple for 400kV Bulk Intertie
        iconSymbol = '⚡';
      } else if (isHospital) {
        iconSymbol = '🏥';
        if (dgFlooded) {
          markerBg = '#e11d48'; // Crimson blackout
          haloPulse = 'animate-ping';
        } else if (onDg) {
          markerBg = '#f59e0b'; // Amber for running on generator
          haloPulse = 'animate-pulse';
        } else {
          markerBg = '#10b981'; // Green mains powered
        }
      } else if (isSubstation) {
        if (isTripped) {
          markerBg = '#f43f5e'; // Crimson tripped
          haloPulse = 'animate-ping';
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
          <div class="relative flex items-center justify-center cursor-pointer group">
            ${isTripped || dgFlooded ? `<span class="absolute w-9 h-9 rounded-full bg-rose-500/40 ${haloPulse}"></span>` : ''}
            ${onDg && !dgFlooded ? `<span class="absolute w-8 h-8 rounded-full bg-amber-400/30 ${haloPulse}"></span>` : ''}
            <div style="background-color: ${markerBg}; box-shadow: 0 0 14px ${markerBg};" class="w-7 h-7 rounded-lg border border-white/90 flex items-center justify-center text-xs font-bold text-white z-10 transition-transform group-hover:scale-125">
              ${iconSymbol}
            </div>
            ${showLabels ? `
              <div class="absolute -bottom-4 whitespace-nowrap text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-black/90 text-cyan-200 border border-slate-700 pointer-events-none shadow-md">
                ${asset.id}
              </div>
            ` : ''}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([asset.lat, asset.lon], { icon: customIcon }).addTo(layersGroup);

      // Interactive popup
      const popupHtml = `
        <div class="p-2.5 text-xs font-sans min-w-[220px] bg-[#0c1220] text-slate-100 rounded-lg border border-cyan-500/40 shadow-2xl">
          <div class="font-bold text-cyan-300 mb-1 flex items-center justify-between font-['Chakra_Petch']">
            <span>${asset.name}</span>
            <span class="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-300 border border-slate-700">${asset.id}</span>
          </div>
          <div class="space-y-1 font-mono text-[11px] text-slate-300 border-t border-slate-800/80 pt-1.5">
            <div class="flex justify-between">Elevation: <span class="font-bold text-white">${asset.elevation_m}m</span></div>
            <div class="flex justify-between">Water Surface: <span class="font-bold text-cyan-300">${asset.wse_m}m</span></div>
            <div class="flex justify-between">Inundation Depth: <span class="font-bold ${asset.water_depth_m > 0 ? 'text-rose-400' : 'text-emerald-400'}">${asset.water_depth_m}m</span></div>
            ${isSubstation ? `
              <div class="flex justify-between border-t border-slate-800/60 pt-1">
                <span>Relay Protection:</span>
                <span class="font-bold px-1 rounded text-[10px] ${isTripped ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}">
                  ${isTripped ? 'ANSI 21 TRIPPED' : 'ENERGIZED'}
                </span>
              </div>
            ` : ''}
            ${isHospital && hospData ? `
              <div class="border-t border-slate-800/60 pt-1 space-y-0.5">
                <div class="flex justify-between">Mains Grid: <span class="font-bold ${hospData.grid_mains_powered ? 'text-emerald-400' : 'text-rose-400'}">${hospData.grid_mains_powered ? 'ONLINE' : 'CUT'}</span></div>
                <div class="flex justify-between">Backup DG: <span class="font-bold ${hospData.on_generator ? 'text-amber-300' : 'text-slate-400'}">${hospData.on_generator ? `ACTIVE (${hospData.runtime_hours_remaining}h fuel)` : 'STANDBY'}</span></div>
                <div class="flex justify-between">ICU Ventilated: <span class="font-bold text-white">${hospData.icu_patients}</span></div>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'custom-dark-popup' });
      marker.on('click', () => {
        if (onSelectAsset) onSelectAsset(asset);
      });
    });
  }, [simData, activeCorridor, showFlood, showGrid, showLabels]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full bg-[#050811]" />

      {/* Floating Tactical Layer Toggles HUD (Top Left) */}
      <div className="absolute top-2.5 left-2.5 z-[1000] bg-[#0c1424]/90 backdrop-blur-md border border-cyan-500/30 rounded-xl px-3 py-2 shadow-2xl font-mono text-xs flex items-center space-x-3 select-none">
        <div className="flex items-center space-x-1.5 pr-2 border-r border-slate-700/60 text-cyan-300 font-bold font-['Chakra_Petch']">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>LAYERS</span>
        </div>

        <button
          onClick={() => setShowFlood(!showFlood)}
          className={`flex items-center space-x-1.5 px-2 py-1 rounded text-[11px] transition ${
            showFlood ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Waves className="w-3 h-3 text-cyan-400" />
          <span>Inundation</span>
        </button>

        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`flex items-center space-x-1.5 px-2 py-1 rounded text-[11px] transition ${
            showGrid ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span>220kV Grid</span>
        </button>

        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`flex items-center space-x-1.5 px-2 py-1 rounded text-[11px] transition ${
            showLabels ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Eye className="w-3 h-3 text-purple-400" />
          <span>Labels</span>
        </button>
      </div>

      {/* Floating Depth & Status Legend (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-[#0c1424]/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-2xl font-mono text-[10px] space-y-1.5 select-none pointer-events-none">
        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1 border-b border-slate-800 pb-1">
          Tactical Flood & Grid Legend
        </div>
        <div className="flex items-center justify-between space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">&lt; 0.20m (Passable)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span className="text-slate-300">0.20m (LMO Choke)</span>
          </div>
        </div>
        <div className="flex items-center justify-between space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]"></span>
            <span className="text-slate-300">&ge; 0.40m (ANSI 21 Trip)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-slate-300">Hospital DG</span>
          </div>
        </div>
      </div>
    </div>
  );
}
