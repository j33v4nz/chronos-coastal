import React from 'react';
import { Zap, ShieldAlert, Fuel, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function DarkGridMatrix({ simData }) {
  const grid = simData?.grid || {};
  const hospitals = grid.hospitals || [];
  const trippedSubs = grid.tripped_substations || [];

  return (
    <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-cyber-border/60 pb-2">
        <div className="flex items-center space-x-2 text-cyber-amber font-['Chakra_Petch'] font-semibold text-sm">
          <Zap className="w-4 h-4 text-cyber-amber" />
          <span>CASCADING DARK-GRID MATRIX (DAG)</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">IEEE 1584 / ANSI 21</span>
      </div>

      {/* Tripped Substations Alert Banner */}
      <div className="mb-3">
        {trippedSubs.length > 0 ? (
          <div className="bg-cyber-red/10 border border-cyber-red/40 rounded-lg p-2.5 flex items-start space-x-2 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 text-cyber-red shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cyber-red">AUTOMATED PROTECTION TRIPPED:</span>
              <p className="text-slate-300 text-[11px] mt-0.5">
                Water breached 0.4m switchgear threshold at <strong className="text-white">{trippedSubs.join(', ')}</strong>.
                Upstream ANSI 21 distance relays severed secondary distribution feeders.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 flex items-center space-x-2 text-xs font-mono text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>All 220kV / 110kV switchgear plinths clear. Grid fully energized.</span>
          </div>
        )}
      </div>

      {/* Critical Healthcare Facilities Cards */}
      <div className="space-y-3">
        <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
          Downstream Healthcare Facilities:
        </div>

        {hospitals.map((hosp) => {
          const dg = hosp.generator_info || {};
          const isIslanded = hosp.operational_status === 'ISLANDED_ON_EMERGENCY_GENERATOR';
          const isBlackout = hosp.operational_status === 'CATASTROPHIC_BLACKOUT_DG_FLOODED';
          const runtime = dg.runtime_hours_remaining || 0;
          const fuelPct = Math.min(100, Math.max(10, (runtime / 60) * 100));

          return (
            <div
              key={hosp.id}
              className={`p-3 rounded-lg border font-mono text-xs transition ${
                isBlackout
                  ? 'bg-red-950/30 border-cyber-red shadow-[0_0_15px_rgba(255,51,102,0.2)]'
                  : (isIslanded
                      ? 'bg-amber-950/20 border-cyber-amber shadow-[0_0_15px_rgba(255,170,0,0.15)]'
                      : 'bg-[#0f172a] border-cyber-border')
              }`}
            >
              <div className="flex justify-between items-start mb-1.5">
                <div>
                  <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                    {hosp.name}
                  </h4>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>ICU Ventilated Patients: <strong className="text-slate-200">{hosp.icu_patients}</strong></span>
                    <span>•</span>
                    <span>Flood: <strong className={hosp.water_depth_m > 0 ? 'text-cyber-cyan' : 'text-emerald-400'}>{hosp.water_depth_m.toFixed(2)}m</strong></span>
                  </div>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isBlackout
                      ? 'bg-red-500 text-white animate-pulse'
                      : (isIslanded ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40')
                  }`}
                >
                  {isBlackout ? 'BLACKOUT' : (isIslanded ? 'ON DIESEL DG' : 'MAINS ONLINE')}
                </span>
              </div>

              {/* Generator Telemetry Bar */}
              {dg.dg_operational && (
                <div className="mt-2.5 pt-2 border-t border-slate-700/60">
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-slate-300 flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-amber-400" />
                      Fuel Burn: <strong>{dg.fuel_burn_rate_lph} L/h</strong>
                    </span>
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {runtime.toFixed(1)} hrs fuel left
                    </span>
                  </div>

                  {/* Fuel Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        runtime < 14 ? 'bg-cyber-red animate-pulse' : 'bg-cyber-amber'
                      }`}
                      style={{ width: `${fuelPct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>Reserve: {dg.fuel_tank_liters}L</span>
                    {hosp.is_dry_but_outaged && (
                      <span className="text-amber-400 font-semibold">⚠️ Dry ground, but grid feed cut by upstream breaker!</span>
                    )}
                  </div>
                </div>
              )}

              {isBlackout && (
                <div className="mt-2 bg-red-900/40 border border-red-500 p-2 rounded text-red-200 text-[11px]">
                  🚨 <strong>CRITICAL FAILURE:</strong> Generator platform inundated. Emergency ECMO & ventilator power collapsed!
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
