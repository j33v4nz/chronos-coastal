import React, { useState } from 'react';
import { Waves, Zap, ShieldAlert, Cpu, Eye, FileCheck, Presentation, MapPin, ChevronDown, BarChart3, Radio } from 'lucide-react';

export default function Header({
  simData,
  activeCorridor,
  onSelectCorridor,
  corridors,
  onOpenPitchGuide,
  onOpenGeminiInspector,
  onOpenParametricOracle,
  onOpenModelEvals,
  isLoading
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const hydro = simData?.hydro || {};
  const grid = simData?.grid || {};
  const damming = hydro?.estuarine_damming_jump_m || 0;
  const trippedCount = grid?.tripped_substation_count || 0;
  const icuAtRisk = (grid?.total_patients_on_dg_risk || 0) + (grid?.total_blacked_out_icu_patients || 0);

  const corridorMetadata = {
    kochi: { name: 'Kochi-Vembanad', sub: 'Kerala 2018 Deluge Benchmark', state: 'KL', tag: 'PRIMARY BENCHMARK' },
    chennai: { name: 'Chennai Adyar', sub: 'Cyclone Michaung 2023', state: 'TN', tag: 'BAY OF BENGAL' },
    mumbai: { name: 'Mumbai Mithi', sub: 'Tidal Wall / Monsoon Surge', state: 'MH', tag: 'ARABIAN SEA' },
    odisha: { name: 'Odisha Mahanadi', sub: 'Cyclone Fani & Delta Inflow', state: 'OD', tag: 'SUPER CYCLONE' }
  };

  const currentInfo = corridorMetadata[activeCorridor] || corridorMetadata.kochi;

  return (
    <header className="h-16 px-4 bg-[#080d19]/95 backdrop-blur-md border-b border-cyan-900/40 flex items-center justify-between z-30 shadow-[0_4px_25px_rgba(0,0,0,0.6)] select-none">

      {/* Brand & Active Corridor Selector */}
      <div className="flex items-center space-x-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-8 h-8 rounded-lg bg-cyan-500/20 radar-glow"></span>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-0.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center">
              <span className="text-lg">🌊</span>
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-['Chakra_Petch',sans-serif] text-base font-bold tracking-wider text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                CHRONOS-COASTAL
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                v2.0 TWIN
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wide flex items-center gap-1.5">
              <span>PAN-INDIA DISASTER SWARM</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                7,516 KM COASTAL SHIELD
              </span>
            </div>
          </div>
        </div>

        {/* 1-Click Pan-India Corridor Switcher */}
        <div className="relative ml-2">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="px-3 py-1.5 rounded-lg bg-[#0e172a] border border-cyan-500/30 hover:border-cyan-400/60 text-slate-200 text-xs font-mono flex items-center space-x-2 hover:bg-[#131f38] transition shadow-md"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <div className="text-left">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5 text-[11px]">
                <span>{currentInfo.name}</span>
                <span className="px-1 py-0.2 rounded text-[8px] bg-slate-800 text-slate-300 font-normal">
                  {currentInfo.state}
                </span>
              </div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 rounded-xl bg-[#0b1222] border border-cyan-500/40 shadow-2xl p-1 z-50 animate-fade-in font-mono text-xs">
              <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                Select Coastal Corridor:
              </div>
              {Object.entries(corridorMetadata).map(([cid, meta]) => (
                <button
                  key={cid}
                  onClick={() => {
                    onSelectCorridor(cid);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg flex items-start space-x-2 transition ${
                    activeCorridor === cid
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="mt-0.5 text-xs">{activeCorridor === cid ? '📍' : '○'}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">{meta.name}</span>
                      <span className="text-[8px] px-1 rounded bg-slate-900 text-cyan-400 border border-slate-700 font-mono">
                        {meta.tag}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{meta.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Real-time Telemetry Indicators */}
      <div className="hidden lg:flex items-center space-x-2.5 font-mono text-xs">
        <div className="bg-[#0b1224] border border-slate-800/90 rounded-lg px-2.5 py-1 flex items-center space-x-2 shadow-inner">
          <Waves className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 text-[10px] uppercase">Backwater Jump:</span>
          <span className={`font-bold text-xs ${damming > 1.5 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}`}>
            +{damming.toFixed(2)}m
          </span>
        </div>

        <div className="bg-[#0b1224] border border-slate-800/90 rounded-lg px-2.5 py-1 flex items-center space-x-2 shadow-inner">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 text-[10px] uppercase">Tripped Breakers:</span>
          <span className={`font-bold text-xs ${trippedCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {trippedCount} ANSI 21
          </span>
        </div>

        <div className="bg-[#0b1224] border border-slate-800/90 rounded-lg px-2.5 py-1 flex items-center space-x-2 shadow-inner">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-slate-400 text-[10px] uppercase">ICU At Risk:</span>
          <span className={`font-bold text-xs ${icuAtRisk > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {icuAtRisk} Beds
          </span>
        </div>

        <div className="bg-[#0b1224] border border-slate-800/90 rounded-lg px-2.5 py-1 flex items-center space-x-2 shadow-inner">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            6 AGENTS
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Pitch Guide Button */}
        <button
          onClick={onOpenPitchGuide}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/50 text-amber-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition transform hover:-translate-y-0.5"
          title="Interactive 3-minute hackathon pitch teleprompter"
        >
          <Presentation className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
          <span>Pitch Guide</span>
        </button>

        {/* Model Evals Button */}
        <button
          onClick={onOpenModelEvals}
          className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/50 text-purple-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 hover:bg-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition transform hover:-translate-y-0.5"
          title="Empirical validation against historical gauges, mAP@50, and Gemini fine-tuning"
        >
          <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
          <span>Model Evals (99.4)</span>
        </button>

        {/* Gemini Vision Inspector Button */}
        <button
          onClick={onOpenGeminiInspector}
          className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/50 text-cyan-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 hover:bg-cyan-500/25 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition transform hover:-translate-y-0.5"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>Gemini Vision</span>
        </button>

        {/* Parametric Oracle Button */}
        <button
          onClick={onOpenParametricOracle}
          className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 hover:bg-emerald-500/25 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition transform hover:-translate-y-0.5"
        >
          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>SAR Oracle ($5M)</span>
        </button>
      </div>
    </header>
  );
}
