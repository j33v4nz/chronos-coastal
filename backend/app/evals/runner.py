"""
CHRONOS-COASTAL Diagnostic Runner
Runs reference-scenario checks and exports synthetic example records.
"""

import os
import json
import time
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

        # 5. Summarize reference-scenario diagnostics
        mean_nse = sum(p["metrics"]["nash_sutcliffe_efficiency"] for p in physics_results.values()) / len(corridors)
        macro_map50 = vision_results["macro_averages"]["macro_precision_50"]
        macro_miou = vision_results["macro_averages"]["macro_mIoU"]
        grid_f1 = swarm_results["macro_averages"]["mean_breaker_trip_f1"]
        safety_fidelity = swarm_results["macro_averages"]["mean_safety_protocol_fidelity"]

        # These reference scenarios and synthetic vision fixtures are useful for
        # regression checks, but cannot support a real-world composite accuracy score.

        elapsed_seconds = round(time.time() - start_time, 2)

        summary = {
            "evaluation_version": 2,
            "validation_scope": "DEMO_REFERENCE_SCENARIOS",
            "validation_note": "Reference scenarios and synthetic vision fixtures are not independent field validation.",
            "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "evaluation_duration_seconds": elapsed_seconds,
            "composite_benchmark_score": None,
            "benchmark_rating": "NOT_FIELD_VALIDATED",
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
                "model_target": "synthetic-example-records"
            }
        }

        # Cache results to disk
        try:
            with open(RESULTS_FILE, "w", encoding="utf-8") as f:
                json.dump(summary, f, indent=2)
        except Exception as e:
            pass

        return summary

if __name__ == "__main__":
    import asyncio
    runner = ChronosEvaluationRunner()
    result = asyncio.run(runner.run_full_evaluation())
    print("Reference-scenario diagnostics complete.")
    print(f"Metrics: {json.dumps(result['headline_metrics'], indent=2)}")
