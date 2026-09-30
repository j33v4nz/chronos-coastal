import React, { useState } from 'react';
import { X, Presentation, Clock, CheckCircle2, ArrowRight, Play, Eye, FileCheck, MapPin } from 'lucide-react';

export default function PitchGuideModal({
  isOpen,
  onClose,
  activeCorridor,
  onSelectCorridor,
  onTriggerScenario,
  onTriggerGemini,
  onTriggerOracle
}) {
  if (!isOpen) return null;

  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      time: "0:00 – 0:45",
      title: "The Trap & The Core Problem",
      tagline: "Why standard flood tools fail and people die in cyclones",
      screenCue: "Point at Header telemetry & baseline sliders showing calm conditions before compound surge.",
      script: `Judges, every flood tool in this hackathon will show you a blue circle on a map and call it a flood. That is NOT how people die in cyclones. During Cyclone Michaung and the Kerala Deluge, 80% of damage happened 15 kilometers inland because swollen river runoff met ocean surge at the river mouth and backed up into the city. Worse: when one coastal substation flooded at just 40cm, upstream breakers tripped, plunging dry hospitals miles inland into blackout. This is CHRONOS-COASTAL: the first physics-coupled compound inundation and cascading resilience twin.`,
      actionLabel: "Load Baseline Conditions (0.4m surge / 280 m³/s)",
      onAction: () => {
        onTriggerScenario('baseline_monsoon');
      }
    },
    {
      time: "0:45 – 1:30",
      title: "Compound Flooding & Cascading Dark-Grid",
      tagline: "Watch backwater pool 8km inland and trip 220kV breakers",
      screenCue: "Click 'Execute Scene' to trigger +1.85m surge & 550 m³/s inflow. Point at backwater pooling +3.1m inland, Nettoor breaker trip, and Lakeshore DG ignition.",
      script: `Watch what happens when ocean surge reaches +1.85m while monsoon runoff swells to 550 m³/s. Notice the coastline has manageable water, but 8km inland along the estuary delta, water has backed up by 3.1 meters. Look at Nettoor Substation—water breaches the 0.4m switchgear threshold. Automated ANSI 21 distance relays trip! Now look at VPS Lakeshore Hospital: the hospital is completely dry on higher ground (elevation 3.0m). But its grid power is DEAD. The hospital switches to emergency diesel with fuel counting down.`,
      actionLabel: "Simulate Compound Landfall (+1.85m / 550 m³/s)",
      onAction: () => {
        onTriggerScenario('compound_cyclone_landfall');
      }
    },
    {
      time: "1:30 – 2:00",
      title: "Life-Support Logistics Clearance Clocks",
      tagline: "Oxygen convoys drown before diesel fuel tankers",
      screenCue: "Point at Logistics Countdown HUD showing Liquid Oxygen departure window shutting 1h 10m earlier than diesel tankers.",
      script: `You cannot evacuate an entire ventilator ICU 6 hours before a cyclone. You must defend in place. Look at the Logistics Countdown: Liquid Medical Oxygen tankers have low-slung cryogenic valves that drown at just 20cm of water. Heavy diesel trucks can ford 45cm. Notice that Kundannoor Bridge reaches 20cm in 200 minutes—the Oxygen departure window closes over an hour before the fuel convoy! Chronos gives commanders the exact minute convoys must roll.`,
      actionLabel: "Inspect Logistics Countdown Clocks",
      onAction: () => {}
    },
    {
      time: "2:00 – 2:30",
      title: "Gemini 3.7 Flash Multimodal Spatial Audit",
      tagline: "Inspecting DEM slope, SAR backscatter & asset pads",
      screenCue: "Click 'Execute Scene' to open Gemini 3.7 Inspector. Point at 2D bounding boxes and the real-time thought stream detecting embankment scour.",
      script: `Instead of text-in, text-out chatbots, Chronos passes an uncompressed 3-band composite false-color GIS tensor directly into Gemini 3.7 Flash: Red is DEM slope gradient >35°, Green is Sentinel-1 SAR radar backscatter saturation, and Blue is critical infrastructure vector pads. Watch the live thought stream: Gemini inspects the riverbank, locates toe scour scarps along the ICU approach ramp with normalized 2D bounding boxes, and specifies exact geobag riprap countermeasures.`,
      actionLabel: "Launch Gemini 3.7 Multimodal Inspector",
      onAction: () => {
        if (onTriggerGemini) onTriggerGemini();
      }
    },
    {
      time: "2:30 – 3:00",
      title: "Parametric Oracle & Pan-India Scale",
      tagline: "Instant $5M liquidity & protecting 7,516 km of coastline",
      screenCue: "Click 'Execute Scene' to open Parametric Oracle. Point at $5M instant voucher with SHA-256 seal, then switch corridors to Chennai, Mumbai, or Odisha.",
      script: `Chronos doesn't stop at prediction—it automates disaster liquidity. Sentinel-1 SAR change detection confirms a backscatter drop of -3.8dB over 24% of the basin. The Parametric Oracle verifies the threshold and executes an instant $5M contingency liquidity release to the municipal emergency pool within minutes. Crucially judges: this is not a one-city toy. We benchmarked our physics on Kochi's 2018 ground truth, but our pipeline is geography-agnostic. With one click on our corridor switcher, the exact same engine models the Adyar river in Chennai, the Mithi in Mumbai, and the Mahanadi in Odisha—delivering an operational shield for India's entire 7,516 km coastline. Thank you.`,
      actionLabel: "Trigger Parametric Oracle Verification",
      onAction: () => {
        if (onTriggerOracle) onTriggerOracle();
      }
    }
  ];

  const current = steps[activeStep];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
      <div className="bg-[#0b101d] border border-emerald-500/50 rounded-2xl max-w-3xl w-full flex flex-col shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-[#0d1424] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Chakra_Petch'] font-bold text-base text-slate-100 flex items-center gap-2">
                <span>3-MINUTE HACKATHON PITCH TELEPROMPTER</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  NATIONAL SCRIPT
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                The Domino Narrative: High-Stakes Judge Psychology Walkthrough
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="grid grid-cols-5 border-b border-slate-800 bg-slate-950/60">
          {steps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`py-2 px-2 text-center border-r border-slate-800 last:border-r-0 transition cursor-pointer ${
                activeStep === idx
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border-b-2 border-b-emerald-400'
                  : idx < activeStep
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600'
              }`}
            >
              <div className="text-[10px] text-slate-400">{s.time}</div>
              <div className="text-[11px] truncate">Step {idx + 1}</div>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Phase Badge & Title */}
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold mb-1">
              <Clock className="w-4 h-4" />
              <span>{current.time}</span>
              <span>•</span>
              <span className="uppercase tracking-wider text-slate-400">{current.tagline}</span>
            </div>
            <h4 className="font-['Chakra_Petch'] font-bold text-xl text-white">
              {current.title}
            </h4>
          </div>

          {/* Teleprompter Script Card */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-slate-200 leading-relaxed text-sm shadow-inner relative">
            <span className="absolute top-2 right-3 text-[10px] text-slate-400 font-mono">
              READ VERBATIM TO JUDGES
            </span>
            <p className="italic font-sans text-slate-100">
              "{current.script}"
            </p>
          </div>

          {/* Visual Presentation Cue for Pitcher */}
          {current.screenCue && (
            <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-2 text-xs">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider shrink-0 mt-0.5">
                ON-SCREEN CUE
              </span>
              <span className="text-slate-300 font-mono text-[11px] leading-snug">
                {current.screenCue}
              </span>
            </div>
          )}

          {/* Interactive Action Trigger */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
            <div className="text-xs text-emerald-300 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Pitch Automation: {current.actionLabel}</span>
            </div>
            <button
              onClick={current.onAction}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute Scene</span>
            </button>
          </div>

          {/* 1-Click Corridor Switcher in Step 5 */}
          {activeStep === 4 && (
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl space-y-2">
              <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Pan-India Live Corridor Demonstrations:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onSelectCorridor('chennai')}
                  className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400 text-slate-200 text-xs font-mono transition text-left cursor-pointer"
                >
                  📍 Chennai Adyar
                </button>
                <button
                  onClick={() => onSelectCorridor('mumbai')}
                  className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400 text-slate-200 text-xs font-mono transition text-left cursor-pointer"
                >
                  📍 Mumbai Mithi
                </button>
                <button
                  onClick={() => onSelectCorridor('odisha')}
                  className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400 text-slate-200 text-xs font-mono transition text-left cursor-pointer"
                >
                  📍 Odisha Mahanadi
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-[#0d1424] flex items-center justify-between">
          <button
            onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            Previous Cue
          </button>

          <span className="text-xs text-slate-400">
            Cue {activeStep + 1} of {steps.length}
          </span>

          {activeStep < steps.length - 1 ? (
            <button
              onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <span>Next Cue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <span>Complete Walkthrough</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
