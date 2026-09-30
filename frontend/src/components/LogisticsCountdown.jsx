import React from 'react';
import { Truck, Timer, AlertOctagon, CheckCircle, Navigation, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function LogisticsCountdown({ simData, logisticsData, hoursToLandfall }) {
  const data = logisticsData || simData?.logistics || {};
  const routes = data?.routes || (Array.isArray(data) ? data : []);

  return (
    <div className="cyber-card corner-bracket rounded-xl p-4 shadow-2xl space-y-3.5">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
        <div className="flex items-center space-x-2 text-cyan-400 font-['Chakra_Petch'] font-bold text-xs tracking-wider">
          <Truck className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>LIFE-SUPPORT LOGISTICS REACHABILITY SOLVER</span>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
          TIME-TO-SUBMERSION (TTS)
        </span>
      </div>

      {/* Cargo Kinematic Grounding Banner */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/30 space-y-0.5">
          <div className="text-cyan-300 font-bold flex items-center gap-1">
            <span>💧</span>
            <span>LIQUID MEDICAL OXYGEN</span>
          </div>
          <div className="text-slate-400">Clearance: <strong className="text-cyan-200">0.20 m (8 in)</strong></div>
          <div className="text-[9px] text-slate-500">Low cryogenic valves (−183°C thermal shock)</div>
        </div>

        <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/30 space-y-0.5">
          <div className="text-amber-300 font-bold flex items-center gap-1">
            <span>⛽</span>
            <span>HEAVY DIESEL TANKER</span>
          </div>
          <div className="text-slate-400">Clearance: <strong className="text-amber-200">0.45 m (18 in)</strong></div>
          <div className="text-[9px] text-slate-500">Engine snorkel intake & hydrodynamic sliding</div>
        </div>
      </div>

      {/* Logistics Corridors List */}
      <div className="space-y-2.5">
        {routes.length === 0 ? (
          <div className="text-slate-500 text-center py-4 font-mono text-xs italic">
            Awaiting logistics reachability solver...
          </div>
        ) : (
          routes.map((corr) => {
            const isSubmerged = corr.is_currently_submerged;
            const isLMO = corr.cargo_type === 'LIQUID_MEDICAL_OXYGEN';
            const windowMins = corr.departure_window_remaining_min;
            const ttsMins = corr.time_to_submersion_min;
            const chokeName = corr.choke_point_name || 'Bottleneck Causeway';
            const critDepth = corr.critical_clearance_depth_m || (isLMO ? 0.20 : 0.45);
            const peakDepth = corr.peak_water_depth_m || 0;

            const isClosingFast = windowMins !== null && windowMins > 0 && windowMins <= 60;
            const isOpen = windowMins !== null && windowMins > 60;
            const isBlocked = isSubmerged || (windowMins !== null && windowMins <= 0);

            return (
              <div
                key={corr.corridor_id || corr.name}
                className={`p-3 rounded-xl border font-mono text-xs transition-all ${
                  isBlocked
                    ? 'bg-rose-950/30 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                    : (isClosingFast
                        ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-[#0a1120] border-slate-800')
                }`}
              >
                {/* Route Header */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-base p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      {isLMO ? '💧' : '⛽'}
                    </span>
                    <div>
                      <span className="font-bold text-slate-100 text-xs font-['Chakra_Petch']">
                        {corr.name}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Choke: <strong className="text-white">{chokeName}</strong> (Elev: {corr.choke_elevation_m}m)
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      isBlocked
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                        : (isClosingFast
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50')
                    }`}
                  >
                    {isBlocked ? 'CORRIDOR SEVERED' : (isClosingFast ? 'DEPART IMMEDIATELY' : 'CORRIDOR OPEN')}
                  </span>
                </div>

                {/* Countdown Box */}
                <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Timer className={`w-4 h-4 ${isBlocked ? 'text-rose-400' : isClosingFast ? 'text-amber-400 animate-spin-slow' : 'text-emerald-400'}`} />
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                        Safe Departure Deadline:
                      </span>
                      <span className="text-sm font-bold">
                        {isBlocked ? (
                          <span className="text-rose-400">WINDOW CLOSED (0 MIN)</span>
                        ) : isClosingFast ? (
                          <span className="text-amber-300 font-extrabold animate-pulse">
                            Closes in {Math.round(windowMins)} minutes
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">
                            {windowMins === null ? 'No breach within horizon' : `Open (${Math.round(windowMins)} min remaining)`}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-[10px]">
                    <span className="text-slate-400 block uppercase">Time to Submersion:</span>
                    <span className="font-bold text-cyan-300">
                      {ttsMins !== null ? `${Math.round(ttsMins)} min` : '> Landfall'}
                    </span>
                  </div>
                </div>

                {/* Peak Head Warning */}
                <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Transit Time: {corr.nominal_travel_time_min} min</span>
                  <span className={peakDepth >= critDepth ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                    Peak Water: {peakDepth.toFixed(2)}m (Max safe: {critDepth.toFixed(2)}m)
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
