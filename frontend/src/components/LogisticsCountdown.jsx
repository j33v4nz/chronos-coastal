import React from 'react';
import { Truck, Timer, AlertOctagon, CheckCircle, Navigation } from 'lucide-react';

export default function LogisticsCountdown({ simData }) {
  const corridors = simData?.logistics || [];

  return (
    <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-cyber-border/60 pb-2">
        <div className="flex items-center space-x-2 text-cyber-cyan font-['Chakra_Petch'] font-semibold text-sm">
          <Truck className="w-4 h-4 text-cyber-cyan" />
          <span>LIFE-SUPPORT LOGISTICS REACHABILITY SOLVER</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">TIME-TO-SUBMERSION (TTS)</span>
      </div>

      <div className="space-y-3">
        {corridors.map((corr) => {
          const isViable = corr.route_viable_now;
          const isLMO = corr.cargo_type === 'LIQUID_MEDICAL_OXYGEN';
          const windowMins = corr.departure_window?.latest_min;
          const bottleneck = corr.critical_bottleneck || 'Clear';

          return (
            <div
              key={corr.corridor_id}
              className={`p-3 rounded-lg border font-mono text-xs transition ${
                !isViable
                  ? 'bg-red-950/20 border-cyber-red/60'
                  : (windowMins !== null && windowMins <= 45
                      ? 'bg-amber-950/20 border-cyber-amber/60'
                      : 'bg-[#0f172a] border-cyber-border')
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{isLMO ? '💧' : '⛽'}</span>
                    <span className="font-bold text-slate-100 text-xs">{corr.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Critical Axle Clearance: <strong className="text-cyber-cyan">{corr.critical_depth_m}m</strong> ({isLMO ? 'Cryogenic Valve Limit' : 'Diesel Hydrolock Limit'})
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      !isViable
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : (windowMins !== null && windowMins <= 45
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40')
                    }`}
                  >
                    {isViable ? 'ROUTE OPEN' : 'ROUTE CHOKED'}
                  </span>
                </div>
              </div>

              {/* Countdown & Bottleneck Card */}
              <div className="bg-[#090f1d] p-2 rounded border border-cyber-border/70 flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2">
                  <Timer className={`w-4 h-4 ${!isViable ? 'text-cyber-red' : 'text-cyber-cyan'}`} />
                  <div>
                    <span className="text-[10px] text-slate-400 block">SAFE DEPARTURE DEADLINE:</span>
                    <span className="font-bold text-xs text-slate-200">
                      {windowMins !== null && windowMins > 0 ? (
                        <span className="text-amber-400 font-mono">Closes in {windowMins} minutes</span>
                      ) : (
                        isViable ? "Open > 120 mins" : "IMPASSABLE NOW"
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">CRITICAL CHOKE POINT:</span>
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 justify-end">
                    <Navigation className="w-3 h-3 text-cyber-blue" />
                    {bottleneck}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed italic border-l-2 border-cyber-cyan/50 pl-2">
                {corr.operational_advice}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
