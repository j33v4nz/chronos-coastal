"""
CHRONOS-COASTAL Model Evaluation & Calibration Test Suite
Verifies:
- Hydrologic validation metrics (NSE, RMSE, MAE, R²)
- SciPy hydrodynamic parameter optimization
- Spatial AI vision IoU and mAP@50 metrics
- Grid cascade breaker trip precision/recall
- Logistics safety protocol fidelity
- Gemini fine-tuning JSONL dataset structure
- FastAPI evaluation endpoints (/api/evals/results, /api/evals/run, /api/evals/finetune-dataset)
"""

import os
import json
import asyncio
import pytest
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.evals.physics_calibration import PhysicsCalibrationEngine
from app.evals.vision_eval import VisionEvaluationEngine
from app.evals.swarm_eval import SwarmEvaluationEngine
from app.evals.finetune_dataset_generator import GeminiFineTuneDatasetGenerator
from app.evals.runner import ChronosEvaluationRunner


@pytest.fixture
def client():
    return TestClient(app)


def test_physics_metric_formulas():
    """Verifies standard mathematical formulas for hydrologic validation."""
    obs = np.array([10.0, 12.0, 15.0, 14.0, 11.0])
    sim = np.array([10.2, 11.8, 14.9, 14.2, 10.9])

    nse = PhysicsCalibrationEngine.calculate_nse(obs, sim)
    rmse = PhysicsCalibrationEngine.calculate_rmse(obs, sim)
    mae = PhysicsCalibrationEngine.calculate_mae(obs, sim)
    pbias = PhysicsCalibrationEngine.calculate_pbias(obs, sim)
    r2 = PhysicsCalibrationEngine.calculate_r_squared(obs, sim)

    assert nse > 0.95
    assert rmse < 0.30
    assert mae < 0.25
    assert abs(pbias) < 2.0
    assert r2 > 0.95


@pytest.mark.parametrize("corridor_id", ["kochi", "chennai", "mumbai", "odisha"])
def test_physics_calibration_across_all_corridors(corridor_id):
    """Verifies that all 4 corridors achieve high hydrologic calibration against historical gauges."""
    engine = PhysicsCalibrationEngine(corridor_id)
    res = engine.evaluate_corridor(corridor_id)

    assert res["corridor_id"] == corridor_id
    assert res["gauge_count"] >= 4
    metrics = res["metrics"]
    assert metrics["nash_sutcliffe_efficiency"] > 0.85
    assert metrics["rmse_m"] < 1.5
    assert metrics["mae_m"] < 1.5
    assert metrics["calibration_grade"] in ["EXCEPTIONAL", "VERY_GOOD"]


def test_parameter_fine_tuning_optimization():
    """Verifies SciPy parameter optimization on the Kochi primary benchmark."""
    engine = PhysicsCalibrationEngine("kochi")
    res = engine.fine_tune_parameters()

    assert res["corridor_id"] == "kochi"
    assert res["optimization_success"] is True
    assert "calibrated_parameters" in res
    assert res["calibrated_parameters"]["c_d"] > 0.3
    assert res["calibrated_parameters"]["a_throat_m2"] > 1000.0
    assert res["calibrated_nse"] >= res["baseline_nse"]


def test_box_iou_calculation():
    """Verifies 2D bounding box Intersection-over-Union (IoU) calculation."""
    # Identical boxes -> IoU = 1.0
    box_a = [100, 100, 300, 300]
    box_b = [100, 100, 300, 300]
    assert pytest.approx(VisionEvaluationEngine.calculate_box_iou(box_a, box_b), 0.01) == 1.0

    # Non-overlapping boxes -> IoU = 0.0
    box_c = [400, 400, 600, 600]
    assert VisionEvaluationEngine.calculate_box_iou(box_a, box_c) == 0.0

    # Partial overlap (50% intersection)
    box_d = [100, 100, 300, 200]
    iou = VisionEvaluationEngine.calculate_box_iou(box_a, box_d)
    assert 0.40 < iou < 0.60


def test_vision_evaluation_engine():
    """Verifies multimodal vision evaluation metrics."""
    vision_engine = VisionEvaluationEngine()
    summary = asyncio.run(vision_engine.evaluate_all_corridors())

    assert summary["macro_averages"]["evaluated_corridors"] == 4
    assert summary["macro_averages"]["macro_precision_50"] >= 0.80
    assert summary["macro_averages"]["macro_mIoU"] >= 0.80
    assert summary["macro_averages"]["macro_latency_ms"] < 250.0  # ms


def test_swarm_breaker_trip_and_safety_evaluations():
    """Verifies electrical breaker trip precision/recall and logistics zero-hazard protocol."""
    swarm_engine = SwarmEvaluationEngine()
    res = swarm_engine.evaluate_all()

    assert res["macro_averages"]["mean_breaker_trip_f1"] >= 0.90
    assert res["macro_averages"]["mean_safety_protocol_fidelity"] == 1.0


def test_finetune_dataset_generation(tmp_path):
    """Verifies generation of production-ready Gemini fine-tuning JSONL pairs."""
    test_jsonl = str(tmp_path / "test_finetune.jsonl")
    count = GeminiFineTuneDatasetGenerator.export_to_jsonl(test_jsonl)

    assert count == 100
    assert os.path.exists(test_jsonl)

    with open(test_jsonl, "r", encoding="utf-8") as f:
        first_line = json.loads(f.readline())
        assert "messages" in first_line
        messages = first_line["messages"]
        assert len(messages) == 3
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"
        assert messages[2]["role"] == "model"
        # Validate that model response is valid JSON matching GeotechnicalReport
        model_content = json.loads(messages[2]["content"])
        assert "overall_risk_level" in model_content
        assert "detected_hazards" in model_content


def test_api_evals_endpoints(client):
    """Verifies FastAPI evaluation endpoints."""
    # 1. GET /api/evals/results
    resp = client.get("/api/evals/results")
    assert resp.status_code == 200
    data = resp.json()
    assert "composite_benchmark_score" in data
    assert data["composite_benchmark_score"] >= 80.0
    assert "headline_metrics" in data
    assert data["headline_metrics"]["zero_hazard_safety_fidelity"] == 1.0

    # 2. GET /api/evals/finetune-dataset
    resp_ft = client.get("/api/evals/finetune-dataset?sample_limit=3")
    assert resp_ft.status_code == 200
    data_ft = resp_ft.json()
    assert data_ft["status"] == "READY"
    assert data_ft["total_records"] == 100
    assert len(data_ft["sample_records"]) == 3

    # 3. POST /api/evals/run
    resp_run = client.post("/api/evals/run")
    assert resp_run.status_code == 200
    data_run = resp_run.json()
    assert "composite_benchmark_score" in data_run
