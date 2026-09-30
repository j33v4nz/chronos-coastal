import React from 'react';
import { Zap, ShieldAlert, Fuel, Clock, AlertTriangle, CheckCircle2, Eye, Activity } from 'lucide-react';

export default function DarkGridMatrix({ simData, gridData, hydroData, onInspectHospital }) {
  const grid = gridData || simData?.grid || {};
  const hospitals = grid.hospitals || [];
  const trippedSubs = grid.tripped_substations || [];
  const darkDryNodes = grid.dark_dry_nodes || [];

  return (
    <div className="cyber-card corner-bracket rounded-xl p-4 shadow-2xl space-y-4">

      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
        <div className="flex items-center space-x-2 text-amber-400 font-['Chakra_Petch'] font-bold text-xs tracking-wider">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>CASCADING DARK-GRID MATRIX (NETWORKX DAG)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono font-bold">
            IEEE 1584 / ANSI 21 & 87
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 font-mono">
            TRIP: 0.35M-0.45M
          </span>
        </div>
      </div>

      {/* Tripped Breakers Alert Banner */}
      <div>
        {trippedSubs.length > 0 ? (
          <div className="bg-rose-950/30 border border-rose-500/50 rounded-xl p-3 flex items-start space-x-3 text-xs font-mono shadow-[0_0_15px_rgba(244,63,94,0.15)]">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-rose-300 text-xs uppercase tracking-wider">
                  DIELECTRIC BREAKDOWN: {trippedSubs.length} SUBSTATIONS TRIPPED
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  CRITICAL CASCADE
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Water breached 0.40m plinth clearance at <strong className="text-white font-bold">{trippedSubs.join(', ')}</strong>.
                Upstream ANSI 21 distance relays severed 220kV feeders to isolate faults, plunging dry inland downstream nodes into blackout.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-xl p-2.5 flex items-center space-x-2.5 text-xs font-mono text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">All 400kV / 220kV / 110kV switchgear plinths clear. Main grid transmission energized.</span>
          </div>
        )}
      </div>

      {/* Critical Healthcare Facilities (Defend-in-Place Lifelines) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            Healthcare Facility Life-Support Monitors:
          </span>
          <span>{hospitals.length} Tracked Hospitals</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          {hospitals.map((hosp) => {
            const isMains = hosp.grid_mains_powered;
            const onDg = hosp.on_generator;
            const isBlackout = hosp.hospital_status === 'CATASTROPHIC_BLACKOUT_DG_SUBMERGED';
            const runtime = hosp.runtime_hours_remaining || 0;
            const fuelLiters = hosp.diesel_reserve_liters || 0;
            const burnRate = hosp.burn_rate_lph || 112.5;
            const fuelPct = Math.min(100, Math.max(8, (runtime / 60) * 100));

            return (
              <div
                key={hosp.id}
                className={`p-3 rounded-xl border transition-all ${
                  isBlackout
                    ? 'bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse'
                    : (onDg
                        ? 'bg-amber-950/25 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-[#0a1120] border-slate-800 hover:border-slate-700')
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5 font-['Chakra_Petch']">
                      <span>{hosp.name}</span>
                    </h4>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>ICU Patients: <strong className="text-white font-bold">{hosp.icu_patients}</strong></span>
                      <span>•</span>
                      <span>Flood: <strong className={hosp.water_depth_m > 0 ? 'text-rose-400' : 'text-emerald-400'}>{hosp.water_depth_m.toFixed(2)}m</strong></span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isBlackout
                        ? 'bg-rose-500 text-white animate-pulse'
                        : (onDg
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40')
                    }`}
                  >
                    {isBlackout ? 'BLACKOUT (DG FLOODED)' : (onDg ? 'ON DIESEL DG' : 'GRID ONLINE')}
                  </span>
                </div>

                {/* Substation Outage Notice for Dry Hospital */}
                {hosp.is_dry_but_outaged && (
                  <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 mb-2 leading-tight">
                    ⚡ <strong>Dry Ground Outage:</strong> Facility physically dry (Elev: {hosp.elevation_m}m), but power severed by upstream substation breaker trip.
                  </div>
                )}

                {/* Fuel & Runtime Progress Bar */}
                {onDg && !isBlackout && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-300 flex items-center gap-1">
                        <Fuel className="w-3 h-3 text-amber-400" />
                        Burn: <strong>{burnRate} L/h</strong> ({fuelLiters}L total)
                      </span>
                      <span className="text-amber-300 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {runtime.toFixed(1)} hrs runway
                      </span>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-700/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
                        style={{ width: `${fuelPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Card Action */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">DG Pad: {hosp.dg_pad_elevation_m}m MSL</span>
                  {onInspectHospital && (
                    <button
                      onClick={() => onInspectHospital(hosp)}
                      className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 flex items-center gap-1 transition"
                    >
                      <Eye className="w-2.5 h-2.5" />
                      <span>Audit Spatial Pad</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
