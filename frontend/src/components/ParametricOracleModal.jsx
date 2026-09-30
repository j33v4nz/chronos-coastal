import React, { useState } from 'react';
import { X, FileCheck, ShieldCheck, DollarSign, Database, CheckCircle2, AlertCircle, Copy, Check, Download, Radio, Lock } from 'lucide-react';

export default function ParametricOracleModal({ isOpen, onClose, oracleData, corridorId = 'kochi' }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const voucher = oracleData || {};
  const isTriggered = voucher.threshold_exceeded ?? true;
  const faf = Number(voucher.flooded_area_fraction ?? 0.245);
  const delta = Number(voucher.sar_backscatter_delta_db ?? voucher.delta_backscatter_db ?? -4.15);
  const payout = Number(voucher.payout_amount_usd ?? voucher.disbursement_amount_usd ?? 5000000);
  const voucherId = voucher.voucher_id || 'VOUCHER-SAR-KOCHI-928A';
  const entity = voucher.disbursement_entity || voucher.recipient_entity || `${corridorId.toUpperCase()} Municipal Emergency Pool`;
  const sha256 = voucher.sha256_cryptographic_seal || voucher.disbursement_hash_sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const authorizations = voucher.emergency_authorizations || [
    "Requisition 8x 500m³/h mobile diesel dewatering pumps from regional contractor pool.",
    "Authorize emergency fuel purchase orders for private tanker supply fleets.",
    "Deploy NDRF / State Police inflatable tactical rescue boats to inundated sectors."
  ];

  const handleCopyHash = () => {
    navigator.clipboard.writeText(sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCertificate = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(voucher, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${voucherId}_audit_certificate.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono">
      <div className="bg-[#090e1a] border border-amber-500/40 rounded-2xl max-w-3xl w-full flex flex-col shadow-[0_0_60px_rgba(245,158,11,0.25)] overflow-hidden">

        {/* Header HUD */}
        <div className="px-6 py-4 border-b border-amber-500/30 bg-gradient-to-r from-[#12192c] via-[#1a233d] to-[#12192c] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <ShieldCheck className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-['Chakra_Petch'] font-bold text-base text-slate-100 tracking-wider">
                  PARAMETRIC PROOF ORACLE &amp; CONTINGENCY LIQUIDITY SEAL
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SMART SETTLEMENT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sentinel-1 SAR C-Band Radar Anomaly Verification • Zero-Paperwork Instant Municipal Relief
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">

          {/* Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isTriggered
                ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                : 'bg-amber-950/40 border-amber-500/60 text-amber-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              {isTriggered ? (
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <span className="font-bold text-sm block tracking-wide">
                  {isTriggered ? 'PARAMETRIC DISASTER THRESHOLD VERIFIED & LIQUIDITY RELEASED' : 'MONITORING SATELLITE RADAR ANOMALIES'}
                </span>
                <span className="text-[11px] opacity-80">
                  {isTriggered
                    ? 'Copernicus Sentinel-1 SAR microwave attenuation confirms severe widespread inundation.'
                    : 'Awaiting threshold exceedance (Flooded Area Fraction ≥ 20.0% or Δσ⁰ ≤ -3.5 dB).'}
                </span>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/50 border border-current">
              {isTriggered ? 'DISBURSED' : 'STANDBY'}
            </span>
          </div>

          {/* Metric Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5 relative overflow-hidden">
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span className="flex items-center gap-1 font-bold">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" /> SAR RADAR BACKSCATTER DROP
                </span>
                <span className="text-emerald-400 font-bold">PASS (STRIKE ≤ -3.5 dB)</span>
              </div>
              <div className="text-xl font-bold text-cyan-400 flex items-baseline gap-1.5">
                <span>{delta.toFixed(2)} dB</span>
                <span className="text-[10px] text-slate-500 font-normal">attenuation</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Baseline dry surface: -9.5 dB ➔ Event specular pool: {( -9.5 + delta).toFixed(1)} dB
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5 relative overflow-hidden">
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span className="flex items-center gap-1 font-bold">
                  <Database className="w-3.5 h-3.5 text-amber-400" /> FLOODED AREA FRACTION (FAF)
                </span>
                <span className="text-emerald-400 font-bold">PASS (STRIKE ≥ 20.0%)</span>
              </div>
              <div className="text-xl font-bold text-amber-400 flex items-baseline gap-1.5">
                <span>{(faf * 100).toFixed(1)}%</span>
                <span className="text-[10px] text-slate-500 font-normal">of monitored drainage basin</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Basin coverage: &gt;250 km² estuarine floodplain grid
              </div>
            </div>
          </div>

          {/* Instant Emergency Liquidity Payout Certificate */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#0c1426] via-[#101b33] to-[#0c1426] border border-amber-500/30 space-y-3 shadow-lg">
            <div className="flex justify-between items-center border-b border-slate-700/60 pb-2.5">
              <span className="text-slate-200 font-bold flex items-center gap-2 text-xs">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                AUTOMATED EMERGENCY LIQUIDITY ALLOCATION
              </span>
              <span className="text-emerald-400 font-bold text-base sm:text-lg font-['Chakra_Petch'] flex items-center">
                ${payout.toLocaleString()} USD
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">Beneficiary Entity:</span>
                <strong className="text-slate-100">{entity}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Voucher Identifier:</span>
                <strong className="text-amber-300">{voucherId}</strong>
              </div>
            </div>

            {/* Cryptographic Seal */}
            <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-cyan-400" /> SHA-256 Cryptographic Audit Seal:
                </span>
                <button
                  onClick={handleCopyHash}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <code className="text-cyan-300 text-[10px] break-all block">
                {sha256}
              </code>
            </div>

            {/* Emergency Authorizations */}
            <div className="space-y-1 text-xs">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                Immediate Automated Authorizations:
              </span>
              <ul className="space-y-1">
                {authorizations.map((auth, idx) => (
                  <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-2 bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-amber-400 font-bold shrink-0 mt-0.5">#{idx + 1}</span>
                    <span>{auth}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0d1424] flex items-center justify-between text-xs">
          <button
            onClick={handleDownloadCertificate}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Audit Voucher JSON</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
          >
            Close Oracle
          </button>
        </div>
      </div>
    </div>
  );
}
