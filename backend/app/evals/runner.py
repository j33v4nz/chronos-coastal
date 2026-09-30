"""
CHRONOS-COASTAL Master Evaluation Runner
Orchestrates hydrologic calibration, multimodal vision evals, swarm cascade benchmarks,
and exports the fine-tuning dataset.
"""

import os
import json
import time
import asyncio
from typing import Dict, Any

from app.evals.physics_calibration import PhysicsCalibrationEngine
from app.evals.vision_eval import VisionEvaluationEngine
from app.evals.swarm_eval import SwarmEvaluationEngine
from app.evals.finetune_dataset_generator import GeminiFineTuneDatasetGenerator

RESULTS_FILE = os.path.join(os.path.dirname(__file__), "evaluation_results.json")
FINETUNE_FILE = os.path.join(os.path.dirname(__file__), "gemini_finetune_data.jsonl")


class ChronosEvaluationRunner:
    """
    Executes full evaluation harness and produces comprehensive benchmark scorecard.
    """

    def __init__(self):
        self.physics_engine = PhysicsCalibrationEngine("kochi")
        self.vision_engine = VisionEvaluationEngine()
        self.swarm_engine = SwarmEvaluationEngine()

    async def run_full_evaluation(self) -> Dict[str, Any]:
        start_time = time.time()
        corridors = ["kochi", "chennai", "mumbai", "odisha"]

        # 1. Hydrologic & Physics Calibration across all corridors
        physics_results = {}
        for cid in corridors:
            p_eval = self.physics_engine.evaluate_corridor(cid)
            physics_results[cid] = p_eval

        # Parameter fine-tuning optimization on primary benchmark (Kochi)
        param_tuning = self.physics_engine.fine_tune_parameters()

        # 2. Multimodal Vision Evaluation across all corridors
        vision_results = await self.vision_engine.evaluate_all_corridors()

        # 3. Swarm Cascade & Logistics Safety Evaluation
        swarm_results = self.swarm_engine.evaluate_all()

        # 4. Generate & verify fine-tuning dataset
        num_finetune_records = GeminiFineTuneDatasetGenerator.export_to_jsonl(FINETUNE_FILE)

        # 5. Compute Composite Benchmark Score (out of 100)
        mean_nse = sum(p["metrics"]["nash_sutcliffe_efficiency"] for p in physics_results.values()) / len(corridors)
        macro_map50 = vision_results["macro_averages"]["macro_precision_50"]
        macro_miou = vision_results["macro_averages"]["macro_mIoU"]
        grid_f1 = swarm_results["macro_averages"]["mean_breaker_trip_f1"]
        safety_fidelity = swarm_results["macro_averages"]["mean_safety_protocol_fidelity"]

        # Weighted composite score
        # 30% Hydrologic NSE + 25% Vision mAP@50 + 20% Vision mIoU + 15% Grid Trip F1 + 10% Logistics Safety
        composite_score = (
            (mean_nse * 30.0) +
            (macro_map50 * 25.0) +
            (macro_miou * 20.0) +
            (grid_f1 * 15.0) +
            (safety_fidelity * 10.0)
        )

        elapsed_seconds = round(time.time() - start_time, 2)

        summary = {
            "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "evaluation_duration_seconds": elapsed_seconds,
            "composite_benchmark_score": round(composite_score, 2),
            "benchmark_rating": "GRADE_A_EXCELLENCE" if composite_score >= 90.0 else "GRADE_B_STRONG",
            "headline_metrics": {
                "mean_nash_sutcliffe_efficiency": round(mean_nse, 4),
                "vision_macro_map_50": round(macro_map50, 4),
                "vision_macro_mIoU": round(macro_miou, 4),
                "grid_breaker_trip_f1": round(grid_f1, 4),
                "zero_hazard_safety_fidelity": round(safety_fidelity, 4),
                "mean_inference_latency_ms": vision_results["macro_averages"]["macro_latency_ms"],
                "total_corridors_evaluated": len(corridors),
                "fine_tuning_pairs_generated": num_finetune_records
            },
            "physics_and_hydrology": {
                "corridor_evaluations": physics_results,
                "parameter_fine_tuning": param_tuning
            },
            "multimodal_vision": vision_results,
            "swarm_and_cascades": swarm_results,
            "finetune_dataset": {
                "status": "READY",
                "file_path": FINETUNE_FILE,
                "record_count": num_finetune_records,
                "model_target": "gemini-3.7-flash"
            }
        }

        # Cache results to disk
        try:
            with open(RESULTS_FILE, "w", encoding="utf-8") as f:
                json.dump(summary, f, indent=2)
        except Exception as e:
            pass

        return summary

    @classmethod
    def get_cached_or_run(cls) -> Dict[str, Any]:
        """Returns cached results if available, else executes run."""
        if os.path.exists(RESULTS_FILE):
            try:
                with open(RESULTS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        runner = cls()
        return asyncio.run(runner.run_full_evaluation())


if __name__ == "__main__":
    runner = ChronosEvaluationRunner()
    result = asyncio.run(runner.run_full_evaluation())
    print(f"Evaluation complete! Composite score: {result['composite_benchmark_score']}/100")
    print(f"Metrics: {json.dumps(result['headline_metrics'], indent=2)}")
