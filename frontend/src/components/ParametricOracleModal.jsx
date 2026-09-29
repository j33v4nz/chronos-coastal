import React from 'react';
import { X, FileCheck, ShieldCheck, DollarSign, Database, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ParametricOracleModal({ isOpen, onClose, oracleData }) {
  if (!isOpen) return null;

  const voucher = oracleData || {};
  const isTriggered = voucher.threshold_exceeded;
  const faf = voucher.flooded_area_fraction || 0;
  const delta = voucher.delta_backscatter_db || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b101d] border border-amber-500/50 rounded-2xl max-w-2xl w-full flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden font-mono">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-cyber-border bg-[#0d1424] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Chakra_Petch'] font-bold text-base text-slate-100">
                PARAMETRIC PROOF ORACLE & AUDIT EXPORT
              </h3>
              <p className="text-xs text-slate-400">
                Sentinel-1 SAR Satellite Radar Change-Detection Automated Liquidity Trigger
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isTriggered
                ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-300'
                : 'bg-amber-950/30 border-amber-500/60 text-amber-300'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {isTriggered ? (
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
              )}
              <div>
                <span className="font-bold text-sm block">
                  {isTriggered ? 'PARAMETRIC TRIGGER VERIFIED & APPROVED' : 'PARAMETRIC STRIKE IN PROGRESS'}
                </span>
                <span className="text-[11px] opacity-80">
                  {isTriggered
                    ? 'Threshold exceedance confirmed by satellite radar backscatter anomaly.'
                    : 'Awaiting minimum surface area flooding fraction threshold.'}
                </span>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/40 border border-current">
              {voucher.trigger_status || 'MONITORING'}
            </span>
          </div>

          {/* Metric Telemetry Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#0d1527] border border-cyber-border rounded-lg space-y-1">
              <span className="text-slate-400 text-[10px] block">SAR RADAR BACKSCATTER DROP:</span>
              <div className="text-lg font-bold text-cyber-cyan flex items-baseline gap-1">
                <span>{delta} dB</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  (Strike: ≤ -3.5 dB)
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Baseline: {voucher.baseline_backscatter_db} dB ➔ Event: {voucher.event_backscatter_db} dB
              </div>
            </div>

            <div className="p-3 bg-[#0d1527] border border-cyber-border rounded-lg space-y-1">
              <span className="text-slate-400 text-[10px] block">FLOODED AREA FRACTION (FAF):</span>
              <div className="text-lg font-bold text-amber-400 flex items-baseline gap-1">
                <span>{(faf * 100).toFixed(1)}%</span>
                <span className="text-[10px] text-slate-500 font-normal">(Strike: ≥ 20.0%)</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Basin: 250 km² Vembanad / Cochin Estuary
              </div>
            </div>
          </div>

          {/* Instant Emergency Liquidity Payout Certificate */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#0d172e] to-[#131f3d] border border-cyber-border/80 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-700/60 pb-2">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                AUTOMATED EMERGENCY LIQUIDITY ALLOCATION
              </span>
              <span className="text-emerald-400 font-bold text-sm">
                ${(voucher.disbursement_amount_usd || 0).toLocaleString()} USD
              </span>
            </div>

            <div className="space-y-1 text-[11px] text-slate-300">
              <div><span className="text-slate-500">Beneficiary:</span> <strong>{voucher.recipient_entity}</strong></div>
              <div><span className="text-slate-500">Voucher ID:</span> <strong>{voucher.voucher_id}</strong></div>
              <div className="truncate"><span className="text-slate-500">SHA-256 Hash:</span> <code className="text-cyber-cyan text-[10px]">{voucher.disbursement_hash_sha256}</code></div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed italic bg-black/30 p-2.5 rounded border border-slate-800">
              "{voucher.audit_notes}"
            </p>
          </div>

          {/* Footer Close */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Close Oracle Inspector
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
