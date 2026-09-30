import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Shield, Zap, Waves, Eye, Truck, FileCheck, Circle, Filter, ChevronDown, ChevronRight, Activity, ArrowDown } from 'lucide-react';

export default function SwarmMissionFeed({ messages = [], isConnected = false }) {
  const scrollRef = useRef(null);
  const [filter, setFilter] = useState('ALL'); // ALL, CRITICAL, DIRECTIVES, GRID
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const getAgentMeta = (agentName) => {
    const name = agentName || '';
    if (name.includes('Hydro')) {
      return {
        label: 'Hydro Agent',
        icon: Waves,
        color: 'text-cyan-400',
        border: 'border-cyan-500/40',
        bg: 'bg-cyan-950/30',
        badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
      };
    }
    if (name.includes('Grid')) {
      return {
        label: 'Grid Cascade',
        icon: Zap,
        color: 'text-amber-400',
        border: 'border-amber-500/40',
        bg: 'bg-amber-950/30',
        badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
      };
    }
    if (name.includes('Vision') || name.includes('Geotechnical')) {
      return {
        label: 'Gemini 3.7 Vision',
        icon: Eye,
        color: 'text-purple-400',
        border: 'border-purple-500/40',
        bg: 'bg-purple-950/30',
        badge: 'bg-purple-500/10 text-purple-300 border-purple-500/30'
      };
    }
    if (name.includes('Logistics') || name.includes('LifeSupport')) {
      return {
        label: 'Logistics Convoy',
        icon: Truck,
        color: 'text-emerald-400',
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-950/30',
        badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
      };
    }
    if (name.includes('Oracle') || name.includes('Parametric')) {
      return {
        label: 'Parametric Oracle',
        icon: FileCheck,
        color: 'text-amber-300',
        border: 'border-amber-400/40',
        bg: 'bg-amber-950/30',
        badge: 'bg-amber-400/10 text-amber-300 border-amber-400/30'
      };
    }
    if (name.includes('Apex') || name.includes('Commander')) {
      return {
        label: 'Apex Commander',
        icon: Shield,
        color: 'text-rose-400',
        border: 'border-rose-500/40',
        bg: 'bg-rose-950/30',
        badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
      };
    }
    return {
      label: name || 'System Node',
      icon: Terminal,
      color: 'text-slate-400',
      border: 'border-slate-700/50',
      bg: 'bg-slate-900/40',
      badge: 'bg-slate-800 text-slate-300 border-slate-700'
    };
  };

  const getPriorityBadge = (priorityLabel, severity) => {
    const p = (priorityLabel || severity || 'NORMAL').toUpperCase();
    if (p === 'CRITICAL') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse tracking-wide">
          CRITICAL
        </span>
      );
    }
    if (p === 'HIGH' || p === 'WARNING' || p === 'WARN') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 tracking-wide">
          HIGH
        </span>
      );
    }
    if (p === 'TACTICAL') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 tracking-wide">
          TACTICAL
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700">
        NORMAL
      </span>
    );
  };

  const filteredMessages = messages.filter((m) => {
    const sender = m.sender || m.source_agent || '';
    const priority = (m.priority_label || m.severity || '').toUpperCase();
    const topic = m.topic || '';

    if (filter === 'CRITICAL') {
      return priority === 'CRITICAL';
    }
    if (filter === 'DIRECTIVES') {
      return sender.includes('Apex') || topic.includes('directive') || topic.includes('iap');
    }
    if (filter === 'GRID') {
      return sender.includes('Grid') || topic.includes('grid') || topic.includes('hospital');
    }
    return true;
  });

  const formatMessageBody = (msg) => {
    if (msg.payload?.message) {
      return <span>{msg.payload.message}</span>;
    }
    if (msg.payload?.tactical_directives && Array.isArray(msg.payload.tactical_directives)) {
      return (
        <div className="space-y-1">
          <div className="text-cyan-300 font-semibold flex items-center gap-1">
            <span>Apex Incident Action Directives:</span>
          </div>
          <div className="space-y-0.5 text-slate-300 pl-2 border-l border-cyan-500/30">
            {msg.payload.tactical_directives.slice(0, 3).map((d, i) => (
              <div key={i} className="text-[10px]">
                ▸ {typeof d === 'string' ? d : d.directive || d.action || JSON.stringify(d)}
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (msg.summary) {
      return <span>{msg.summary}</span>;
    }
    if (msg.topic === 'telemetry.hydro' && msg.payload) {
      return (
        <span>
          Estuarine Damming: <strong className="text-cyan-300">+{Number(msg.payload.estuarine_damming_jump_m || 0).toFixed(2)}m</strong> • Inflow: <strong className="text-cyan-300">{msg.payload.river_inflow_m3s} m³/s</strong> • Flooded: <strong className="text-amber-400">{(Number(msg.payload.flooded_fraction || 0) * 100).toFixed(1)}%</strong>
        </span>
      );
    }
    if (msg.topic === 'telemetry.grid' && msg.payload) {
      return (
        <span>
          Substations Tripped: <strong className="text-rose-400">{msg.payload.tripped_substation_count || 0}</strong> • Dry Inland Outaged: <strong className="text-amber-400">{msg.payload.dark_dry_nodes_count || 0}</strong> • Hospitals on DG: <strong className="text-cyan-300">{msg.payload.total_hospitals_on_dg || 0}</strong>
        </span>
      );
    }
    if (msg.topic === 'telemetry.logistics' && msg.payload) {
      return (
        <span>
          Supply Corridors: <strong className="text-emerald-400">{msg.payload.active_routes_count || 0} Active</strong> • Submerged: <strong className="text-rose-400">{msg.payload.severed_routes_count || 0} Severed</strong>
        </span>
      );
    }
    if (msg.payload && Object.keys(msg.payload).length > 0) {
      return <span className="text-slate-400">{JSON.stringify(msg.payload).slice(0, 140)}...</span>;
    }
    return <span>{msg.topic || 'Event dispatched'}</span>;
  };

  return (
    <div className="cyber-card corner-bracket rounded-xl p-3.5 shadow-xl flex flex-col h-[340px] border border-cyan-900/40 relative">
      {/* HUD Header */}
      <div className="flex items-center justify-between mb-2.5 border-b border-cyan-900/60 pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-['Chakra_Petch'] font-bold text-xs text-slate-100 tracking-wider">
                AUTONOMOUS SWARM CONTROL FEED
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800">
                {messages.length} PKTS
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800">
            <Circle className={`w-2 h-2 ${isConnected ? 'text-emerald-400 fill-emerald-400 animate-pulse' : 'text-rose-500 fill-rose-500'}`} />
            <span className={isConnected ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
              {isConnected ? 'BUS SYNC' : 'OFFLINE'}
            </span>
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
            className={`p-1 rounded text-[10px] border transition flex items-center gap-1 ${
              autoScroll
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <ArrowDown className={`w-3 h-3 ${autoScroll ? 'animate-bounce' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center space-x-1.5 mb-2 font-mono text-[10px] pb-1 border-b border-slate-800/60">
        <span className="text-slate-500 flex items-center gap-1 text-[9px] uppercase tracking-wider">
          <Filter className="w-2.5 h-2.5" /> Filter:
        </span>
        {['ALL', 'CRITICAL', 'DIRECTIVES', 'GRID'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-2 py-0.5 rounded transition cursor-pointer ${
              filter === tab
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Terminal Message Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px] select-text custom-scrollbar"
      >
        {filteredMessages.length === 0 ? (
          <div className="text-slate-600 text-center py-12 italic font-mono text-xs flex flex-col items-center justify-center space-y-2">
            <Activity className="w-6 h-6 text-slate-700 animate-spin" />
            <span>Connecting to /ws/tactical-feed... Awaiting swarm agent telemetries.</span>
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const senderName = msg.sender || msg.source_agent || 'UnknownAgent';
            const meta = getAgentMeta(senderName);
            const Icon = meta.icon;
            const isExpanded = expandedIdx === idx;

            return (
              <div
                key={msg.id || idx}
                className={`p-2 rounded-lg border transition space-y-1.5 ${meta.bg} ${meta.border} hover:border-cyan-500/60 shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <div className={`p-1 rounded ${meta.badge}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <strong className={`font-semibold text-[11px] ${meta.color}`}>
                      {senderName}
                    </strong>
                    {msg.topic && (
                      <span className="text-[9px] text-slate-500 font-mono hidden sm:inline">
                        [{msg.topic}]
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {getPriorityBadge(msg.priority_label, msg.severity)}
                    <span className="text-slate-400 text-[10px]">
                      {new Date(msg.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="text-slate-200 text-[11px] leading-relaxed pl-2 border-l-2 border-slate-700/80">
                  {formatMessageBody(msg)}
                </div>

                {msg.payload && Object.keys(msg.payload).length > 0 && (
                  <div className="pt-0.5">
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      className="text-[9px] text-slate-500 hover:text-cyan-400 flex items-center gap-0.5 cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                      <span>{isExpanded ? 'Hide Payload' : 'Inspect JSON'}</span>
                    </button>
                    {isExpanded && (
                      <pre className="mt-1 p-2 rounded bg-black/60 border border-slate-800 text-[9px] text-cyan-300 font-mono overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(msg.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
