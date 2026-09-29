import React from 'react';
import { Waves, Zap, ShieldAlert, Cpu, Eye, FileCheck, Presentation, MapPin, ChevronDown } from 'lucide-react';

export default function Header({
  simData,
  activeCorridor,
  onSelectCorridor,
  corridors,
  onOpenPitchGuide,
  onOpenGeminiInspector,
  onOpenParametricOracle,
  isLoading
}) {
  const hydro = simData?.hydro || {};
  const grid = simData?.grid || {};
  const damming = hydro?.estuarine_damming_jump_m || 0;
  const trippedCount = grid?.tripped_substation_count || 0;
  const icuAtRisk = (grid?.total_patients_on_dg_risk || 0) + (grid?.total_blacked_out_icu_patients || 0);

  const corridorNames = {
    kochi: 'Kochi Estuary (Benchmark)',
    chennai: 'Chennai Adyar Delta',
    mumbai: 'Mumbai Mithi Creek',
    odisha: 'Odisha Mahanadi Delta'
  };

  return (
    <header className="border-b border-slate-800 bg-[#0a0f1d]/90 backdrop-blur-md sticky top-0 z-40 px-4 py-2.5 flex items-center justify-between shadow-lg">
      {/* Brand & Corridor Switcher */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
          <Waves className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-['Chakra_Petch'] font-bold text-lg tracking-wider text-slate-100 flex items-center gap-1.5">
              CHRONOS<span className="text-cyan-400">-COASTAL</span>
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-400/30 font-mono font-semibold">
              PAN-INDIA SWARM
            </span>

            {/* 1-Click Pan-India Corridor Switcher */}
            <div className="relative inline-block">
              <select
                value={activeCorridor}
                onChange={(e) => onSelectCorridor(e.target.value)}
                className="text-[11px] font-mono font-semibold bg-slate-900 border border-emerald-500/50 text-emerald-400 rounded-lg px-2.5 py-1 appearance-none pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)] hover:border-emerald-400 transition"
              >
                <option value="kochi">📍 Kochi (Kerala - 2018 Deluge)</option>
                <option value="chennai">📍 Chennai (TN - Michaung / Adyar)</option>
                <option value="mumbai">📍 Mumbai (MH - Mithi Tidal Lock)</option>
                <option value="odisha">📍 Odisha (OD - Mahanadi Surge)</option>
              </select>
              <ChevronDown className="w-3 h-3 text-emerald-400 absolute right-2 top-2 pointer-events-none" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Physics-Coupled Compound Inundation & Critical Infrastructure Triaging Engine
          </p>
        </div>
      </div>

      {/* Real-time Telemetry Indicators */}
      <div className="hidden lg:flex items-center space-x-3 font-mono text-xs">
        <div className="bg-[#0e1628] border border-slate-800 rounded px-2.5 py-1.5 flex items-center space-x-1.5">
          <Waves className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 text-[11px]">Backwater Jump:</span>
          <span className={`font-bold ${damming > 1.5 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>
            +{damming.toFixed(2)}m
          </span>
        </div>

        <div className="bg-[#0e1628] border border-slate-800 rounded px-2.5 py-1.5 flex items-center space-x-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 text-[11px]">Tripped Subs:</span>
          <span className={`font-bold ${trippedCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {trippedCount} Breakers
          </span>
        </div>

        <div className="bg-[#0e1628] border border-slate-800 rounded px-2.5 py-1.5 flex items-center space-x-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-slate-400 text-[11px]">ICU At Risk:</span>
          <span className={`font-bold ${icuAtRisk > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {icuAtRisk} Patients
          </span>
        </div>

        <div className="bg-[#0e1628] border border-slate-800 rounded px-2.5 py-1.5 flex items-center space-x-1.5 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-emerald-400 font-semibold text-[11px]">6 AGENTS ACTIVE</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Pitch Guide Button */}
        <button
          onClick={onOpenPitchGuide}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center space-x-1.5 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition"
          title="Interactive 3-minute hackathon pitch teleprompter"
        >
          <Presentation className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
          <span>Pitch Guide</span>
        </button>

        {/* Gemini Vision Inspector Button */}
        <button
          onClick={onOpenGeminiInspector}
          className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 hover:text-cyan-200 text-xs font-semibold flex items-center space-x-1.5 hover:bg-cyan-500/25 transition"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>Gemini Vision</span>
        </button>

        {/* Parametric Oracle Button */}
        <button
          onClick={onOpenParametricOracle}
          className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-semibold flex items-center space-x-1.5 hover:bg-emerald-500/25 transition"
        >
          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>SAR Oracle ($5M)</span>
        </button>
      </div>
    </header>
  );
}
