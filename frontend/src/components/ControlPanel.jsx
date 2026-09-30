import React from 'react';
import { Sliders, Play, RefreshCw, Zap, ShieldAlert, Waves, Flame, Clock, Sparkles } from 'lucide-react';

export default function ControlPanel({
  surge,
  setSurge,
  inflow,
  setInflow,
  hours,
  setHours,
  activeCorridor,
  onSelectCorridor,
  onRunSimulation,
  onSelectScenario,
  activeScenario,
  isLoading
}) {
  // Live hydrodynamic head jump preview: delta_eta_dam approx
  const approxDamming = Math.max(0, (0.0000022 * (inflow ** 2)) + (surge * 0.45));

  return (
    <div className="cyber-card corner-bracket rounded-xl p-3.5 shadow-2xl relative">

      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 border-b border-cyan-900/40 pb-2">
        <div className="flex items-center space-x-2 text-cyan-400 font-['Chakra_Petch'] font-bold text-xs tracking-wider">
          <Sliders className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
          <span>HYDRODYNAMIC & BOUNDARY CONTROLS</span>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
          2-BOUNDARY M1 SOLVER
        </span>
      </div>

      {/* Preset Scenarios Buttons */}
      <div className="mb-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Pre-Configured Scenarios:</span>
          </label>
          <span className="text-[9px] text-slate-500 font-mono">1-Click Historical Setup</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onSelectScenario('compound_cyclone_landfall')}
            className={`px-2 py-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition border ${
              activeScenario === 'compound_cyclone_landfall'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-[#0b1220] border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-[#0f172a]'
            }`}
          >
            <span className="text-sm mb-0.5">🌪️</span>
            <span className="text-[10px] font-bold">Cyclone Landfall</span>
            <span className="text-[8px] text-slate-400 font-mono">Surge + Inflow</span>
          </button>

          <button
            onClick={() => onSelectScenario('catastrophic_2018_deluge')}
            className={`px-2 py-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition border ${
              activeScenario === 'catastrophic_2018_deluge'
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'bg-[#0b1220] border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-[#0f172a]'
            }`}
          >
            <span className="text-sm mb-0.5">🌊</span>
            <span className="text-[10px] font-bold">Historical Deluge</span>
            <span className="text-[8px] text-slate-400 font-mono">Extreme Runoff</span>
          </button>

          <button
            onClick={() => onSelectScenario('baseline_monsoon')}
            className={`px-2 py-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition border ${
              activeScenario === 'baseline_monsoon'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-[#0b1220] border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-[#0f172a]'
            }`}
          >
            <span className="text-sm mb-0.5">☀️</span>
            <span className="text-[10px] font-bold">Dry Baseline</span>
            <span className="text-[8px] text-slate-400 font-mono">Tidal Steady</span>
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="space-y-3 font-mono text-xs">
        {/* Ocean Surge Slider */}
        <div className="bg-[#090f1d] p-2.5 rounded-lg border border-slate-800/80 hover:border-cyan-500/30 transition">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium flex items-center gap-1.5 text-[11px]">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ocean Storm Surge (η_ocean):</span>
            </span>
            <span className="font-bold text-cyan-300 text-sm px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/60">
              +{Number(surge).toFixed(2)} m
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="4.0"
            step="0.05"
            value={surge}
            onChange={(e) => setSurge(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
            <span>0.0m (Tidal Datum)</span>
            <span>2.0m (Very Severe)</span>
            <span>4.0m (Supercyclone)</span>
          </div>
        </div>

        {/* River Inflow Slider */}
        <div className="bg-[#090f1d] p-2.5 rounded-lg border border-slate-800/80 hover:border-blue-500/30 transition">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium flex items-center gap-1.5 text-[11px]">
              <Flame className="w-3.5 h-3.5 text-blue-400" />
              <span>Upstream River Inflow (Q_river):</span>
            </span>
            <span className="font-bold text-blue-300 text-sm px-1.5 py-0.2 rounded bg-blue-950/60 border border-blue-800/60">
              {Number(inflow).toFixed(0)} m³/s
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="1500"
            step="25"
            value={inflow}
            onChange={(e) => setInflow(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
          />
          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
            <span>50 m³/s (Base Flow)</span>
            <span>600 m³/s (Flash Flood)</span>
            <span>1500 m³/s (Catastrophic)</span>
          </div>
        </div>

        {/* Landfall Countdown Slider */}
        <div className="bg-[#090f1d] p-2.5 rounded-lg border border-slate-800/80 hover:border-purple-500/30 transition">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Hours Until Peak Landfall (T_peak):</span>
            </span>
            <span className="font-bold text-purple-300 text-sm px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-800/60">
              T - {Number(hours).toFixed(1)} hrs
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="24.0"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
          />
          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
            <span>T-1h (Imminent)</span>
            <span>T-6h (Tactical Window)</span>
            <span>T-24h (Early Warning)</span>
          </div>
        </div>

        {/* Estimated Damming Head Bar */}
        <div className="p-2 rounded bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[10px]">
          <span className="text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Computed Estuarine Damming Head Jump:
          </span>
          <span className="font-bold text-cyan-300 font-mono text-xs">
            +{approxDamming.toFixed(2)} m
          </span>
        </div>
      </div>

      {/* Big Action Simulation Trigger Button */}
      <button
        onClick={onRunSimulation}
        disabled={isLoading}
        className={`w-full mt-3.5 py-2.5 px-4 rounded-xl font-['Chakra_Petch',sans-serif] font-bold text-xs tracking-wider flex items-center justify-center space-x-2 transition ${
          isLoading
            ? 'bg-cyan-900/60 text-cyan-400 cursor-not-allowed border border-cyan-800/50'
            : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 text-black font-extrabold hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] border border-cyan-300/60 active:scale-[0.99]'
        }`}
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
            <span>PROPAGATING HYDRO-ELECTRIC CASCSADE...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-black text-black" />
            <span>SOLVE COMPOUND INUNDATION & SWARM CASCSADE</span>
          </>
        )}
      </button>

    </div>
  );
}
