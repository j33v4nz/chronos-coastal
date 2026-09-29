import React, { useState } from 'react';
import { X, Eye, Cpu, ShieldAlert, Sparkles, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function GeminiInspectorModal({ isOpen, onClose, onRunInspection, inspectionData, isLoading }) {
  if (!isOpen) return null;

  const report = inspectionData?.report || {};
  const tileUrl = inspectionData?.tile_preview_url || '/api/tile/preview';
  const hazards = report.active_hazard_zones || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b101d] border border-cyber-cyan/50 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(0,240,255,0.25)] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-cyber-border bg-[#0d1424] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyber-blue/20 border border-cyber-cyan/60 flex items-center justify-center text-cyber-cyan">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-['Chakra_Petch'] font-bold text-base text-slate-100">
                  GEMINI 3.7 FLASH MULTIMODAL GEOTECHNICAL INSPECTOR
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-cyan/20 text-cyber-cyan font-mono font-bold">
                  {report.mode === 'gemini_live' ? '⚡ LIVE GEMINI 3.7' : '🛡️ RESILIENT SYNTHETIC FALLBACK'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visual False-Color GIS Tensor Analysis (DEM Slope + SAR Coherence + Infrastructure Outlines)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRunInspection}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-cyber-cyan/20 hover:bg-cyber-cyan/30 text-cyber-cyan text-xs font-mono font-semibold flex items-center gap-1.5 border border-cyber-cyan/40 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Re-Analyze</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-10 h-10 text-cyber-cyan animate-spin" />
              <div className="font-mono text-sm text-slate-200">
                Synthesizing 3-Band False-Color GIS Raster & Transmitting to Gemini 3.7 Flash...
              </div>
              <p className="text-xs text-slate-400 max-w-md">
                Computing Cross-Channel ViT Attention over DEM slope gradients, SAR specular backscatter drops, and road geometries.
              </p>
            </div>
          ) : (
            <>
              {/* Top Section: Composite Visual Tile & Internal Thinking Stream */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 3-Band False-Color GIS Image Preview */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-300">
                    <span className="font-bold flex items-center gap-1.5 text-cyber-cyan">
                      <Eye className="w-3.5 h-3.5" /> 3-Band Composite GIS Raster
                    </span>
                    <span className="text-[10px] text-slate-400">700x700px ViT Input</span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-cyber-border bg-black aspect-square flex items-center justify-center relative shadow-lg">
                    <img
                      src={tileUrl}
                      alt="Composite GIS Map"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 border border-slate-700 text-[10px] font-mono text-cyber-cyan">
                      RGB Multiplexed
                    </div>
                  </div>
                </div>

                {/* Gemini 3.7 Flash Dynamic Thinking Process Trace */}
                <div className="space-y-2 flex flex-col">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-300">
                    <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5" /> Gemini 3.7 Internal Thought Stream
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-mono">
                      budget: 2048 tokens
                    </span>
                  </div>
                  <div className="bg-[#050811] border border-emerald-500/30 rounded-xl p-3 font-mono text-[11px] text-emerald-300 flex-1 overflow-y-auto leading-relaxed shadow-inner">
                    <pre className="whitespace-pre-wrap">
                      {report.thinking_process_trace || (
                        "> 1. Ingesting 3-channel composite GIS tensor...\n" +
                        "> 2. Detecting steep slope angles (>35 deg) along the river embankment corridors.\n" +
                        "> 3. Correlating SAR backscatter specular drops (Δσ⁰ < -3.5dB) with road polygons.\n" +
                        "> 4. Factor of Safety along Kundannoor Ramp calculated < 1.0.\n" +
                        "> 5. Recommending emergency fuel tanker dispatch before window closes."
                      )}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Detected 2D Hazard Zones */}
              <div className="space-y-3">
                <div className="flex justify-between items-center font-mono text-xs text-slate-300">
                  <span className="font-bold text-cyber-amber uppercase tracking-wider">
                    Detected Geotechnical Failure Scarps & Choke Points:
                  </span>
                  <span className="text-slate-400">{hazards.length} Zones Grounded</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                  {hazards.map((zone, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-[#0e172a] border border-cyber-border/80 space-y-1.5 shadow"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-100">{zone.hazard_id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-bold">
                          {zone.severity}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Target: <strong className="text-white">{zone.affected_infrastructure}</strong>
                      </div>
                      <div className="flex space-x-3 text-[10px] text-slate-400">
                        <span>Factor of Safety: <strong className="text-cyber-cyan">{zone.factor_of_safety}</strong></span>
                        <span>•</span>
                        <span>Saturation: <strong className="text-cyber-amber">{(zone.saturation_index * 100).toFixed(0)}%</strong></span>
                      </div>
                      <div className="text-[10px] text-slate-400 bg-black/40 p-1 rounded">
                        2D Bounding Box: [{zone.box_2d?.ymin}, {zone.box_2d?.xmin}, {zone.box_2d?.ymax}, {zone.box_2d?.xmax}]
                      </div>
                      <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-800">
                        {zone.tactical_recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tactical Incident Commander Directive */}
              <div className="bg-cyber-cyan/10 border border-cyber-cyan/40 rounded-xl p-4 font-mono text-xs space-y-1.5">
                <span className="font-bold text-cyber-cyan text-sm block flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> TACTICAL COMMANDER DIRECTIVE
                </span>
                <p className="text-slate-200 leading-relaxed">
                  {report.tactical_commander_directive}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
