import React from 'react';
import { Sliders, Play, RefreshCw, Zap, ShieldAlert, Waves, Flame, MapPin } from 'lucide-react';

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
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2 text-cyan-400 font-['Chakra_Petch'] font-semibold text-xs tracking-wider">
          <Sliders className="w-3.5 h-3.5" />
          <span>HYDRODYNAMIC & TIME CONTROLS</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">2-BOUNDARY M1 SOLVER</span>
      </div>

      {/* Preset Scenarios Buttons */}
      <div className="mb-3.5">
        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
          Pre-Configured Scenarios:
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onSelectScenario('compound_cyclone_landfall')}
            className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition border ${
              activeScenario === 'compound_cyclone_landfall'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            <span>🌪️ Landfall</span>
          </button>

          <button
            onClick={() => onSelectScenario('catastrophic_2018_deluge')}
            className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition border ${
              activeScenario === 'catastrophic_2018_deluge'
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_10px_rgba(255,51,102,0.2)]'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            <span>🌊 2018 Deluge</span>
          </button>

          <button
            onClick={() => onSelectScenario('baseline_monsoon')}
            className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition border ${
              activeScenario === 'baseline_monsoon'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            <span>☀️ Dry Baseline</span>
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="space-y-3 font-mono text-xs">
        {/* Ocean Surge Slider */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium flex items-center gap-1.5 text-[11px]">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              Ocean Storm Surge Head (η_ocean):
            </span>
            <span className="font-bold text-cyan-300 text-sm">{Number(surge).toFixed(2)}m</span>
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
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>0.0m (Tidal Datum)</span>
            <span>2.0m (Very Severe)</span>
            <span>4.0m (Supercyclone)</span>
          </div>
        </div>

        {/* River Inflow Slider */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium flex items-center gap-1.5 text-[11px]">
              <Flame className="w-3.5 h-3.5 text-blue-400" />
              Fluvial River Runoff (Q_inflow):
            </span>
            <span className="font-bold text-blue-400 text-sm">{Math.round(inflow)} m³/s</span>
          </div>
          <input
            type="range"
            min="100.0"
            max="1200.0"
            step="25.0"
            value={inflow}
            onChange={(e) => setInflow(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>100 m³/s (Base)</span>
            <span>600 m³/s (Monsoon)</span>
            <span>1200 m³/s (Deluge)</span>
          </div>
        </div>

        {/* Landfall Countdown Slider */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium flex items-center gap-1.5 text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Hours to Cyclone Landfall (T_landfall):
            </span>
            <span className="font-bold text-amber-300 text-sm">{Number(hours).toFixed(1)}h</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="24.0"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>1.0h (Imminent)</span>
            <span>6.0h (Critical Triage)</span>
            <span>24.0h (Warning)</span>
          </div>
        </div>
      </div>

      {/* Recalculate Simulation Button */}
      <button
        onClick={onRunSimulation}
        disabled={isLoading}
        className="mt-3.5 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(0,240,255,0.25)] transition disabled:opacity-50 cursor-pointer"
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>CALCULATING COUPLED HYDRO & GRID CASCADE...</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>SOLVE COMPOUND INUNDATION & TRIP CASCADE</span>
          </>
        )}
      </button>
    </div>
  );
}
