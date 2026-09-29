import React, { useEffect, useRef } from 'react';
import { Terminal, Shield, Zap, Waves, Eye, Truck, FileCheck, Circle } from 'lucide-react';

export default function SwarmMissionFeed({ messages, isConnected }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getAgentIcon = (source) => {
    switch (source) {
      case 'HydroAgent': return <Waves className="w-3.5 h-3.5 text-cyber-blue" />;
      case 'GridCascadeAgent': return <Zap className="w-3.5 h-3.5 text-cyber-amber" />;
      case 'GeotechnicalVisionAgent': return <Eye className="w-3.5 h-3.5 text-cyber-cyan" />;
      case 'LifeSupportLogisticsAgent': return <Truck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ParametricOracleAgent': return <FileCheck className="w-3.5 h-3.5 text-amber-400" />;
      case 'ApexAgent': return <Shield className="w-3.5 h-3.5 text-purple-400" />;
      default: return <Terminal className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyber-red/20 text-cyber-red border border-cyber-red/40 animate-pulse">CRITICAL</span>;
      case 'WARNING':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/40">WARN</span>;
      case 'TACTICAL':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/40">TACTICAL</span>;
      default:
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-500">INFO</span>;
    }
  };

  return (
    <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 shadow-xl flex flex-col h-[320px]">
      <div className="flex items-center justify-between mb-2.5 border-b border-cyber-border/60 pb-2">
        <div className="flex items-center space-x-2 text-slate-200 font-['Chakra_Petch'] font-semibold text-xs tracking-wider">
          <Terminal className="w-4 h-4 text-cyber-cyan" />
          <span>AUTONOMOUS SWARM MISSION CONTROL FEED</span>
        </div>
        <div className="flex items-center space-x-1.5 font-mono text-[10px]">
          <Circle className={`w-2 h-2 ${isConnected ? 'text-emerald-400 fill-emerald-400 animate-pulse' : 'text-slate-600 fill-slate-600'}`} />
          <span className={isConnected ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
            {isConnected ? 'WEBSOCKET LIVE' : 'CONNECTING...'}
          </span>
        </div>
      </div>

      {/* Terminal Message Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px] select-text"
      >
        {messages.length === 0 ? (
          <div className="text-slate-600 text-center py-10 italic">
            Connecting to /ws/tactical-feed... Awaiting swarm agent messages.
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className="p-2 rounded bg-[#090f1d] border border-slate-800/80 hover:border-slate-700 transition space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  {getAgentIcon(msg.source_agent)}
                  <strong className="text-slate-200 font-semibold text-[11px]">
                    {msg.source_agent}
                  </strong>
                </div>
                <div className="flex items-center space-x-1.5">
                  {getSeverityBadge(msg.severity)}
                  <span className="text-slate-500 text-[10px]">
                    {new Date(msg.timestamp || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed pl-5 border-l border-slate-800">
                {msg.summary || JSON.stringify(msg.payload).slice(0, 100)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
