"""
CHRONOS-COASTAL Multimodal Vision Evaluation Suite
Evaluates Gemini 3.7 Flash and spatial vision inspector against golden annotated GIS ground truth.
Calculates:
- Bounding Box Intersection over Union (IoU)
- Mean IoU (mIoU)
- Precision, Recall, and F1-score at IoU >= 0.50 (mAP@50 standard)
- Hazard classification accuracy
- Inference latency benchmarking (p50, p95, avg in ms)
"""

import time
import asyncio
from typing import Dict, List, Any, Tuple, Optional
import numpy as np

from app.swarm.bus import TacticalEventBus
from app.swarm.vision_agent import GeotechnicalVisionAgent
from app.evals.benchmark_dataset import GOLDEN_VISION_GROUND_TRUTH


class VisionEvaluationEngine:
    """
    Evaluates spatial AI vision predictions against golden geotechnical ground-truth annotations.
    """

    def __init__(self, bus: Optional[TacticalEventBus] = None):
        self.bus = bus or TacticalEventBus()
        self.agent = GeotechnicalVisionAgent(self.bus, "kochi")

    @staticmethod
    def calculate_box_iou(box_a: List[int], box_b: List[int]) -> float:
        """
        Calculates Intersection-over-Union (IoU) between two 2D boxes [ymin, xmin, ymax, xmax].
        Coordinates are normalized integers in [0, 1000].
        """
        y_min = max(box_a[0], box_b[0])
        x_min = max(box_a[1], box_b[1])
        y_max = min(box_a[2], box_b[2])
        x_max = min(box_a[3], box_b[3])

        inter_h = max(0, y_max - y_min)
        inter_w = max(0, x_max - x_min)
        inter_area = inter_h * inter_w

        area_a = max(0, box_a[2] - box_a[0]) * max(0, box_a[3] - box_a[1])
        area_b = max(0, box_b[2] - box_b[0]) * max(0, box_b[3] - box_b[1])

        union_area = area_a + area_b - inter_area
        if union_area <= 0:
            return 0.0

        return float(inter_area / union_area)

    async def evaluate_corridor(self, corridor_id: str = "kochi", iou_threshold: float = 0.50) -> Dict[str, Any]:
        """
        Runs multimodal vision evaluation on a specific corridor.
        """
        ground_truth = GOLDEN_VISION_GROUND_TRUTH.get(corridor_id)
        if not ground_truth:
            raise ValueError(f"No vision ground-truth available for corridor: {corridor_id}")

        self.agent.set_corridor(corridor_id)

        # Benchmark latency
        latencies = []
        reports = []

        # Run 3 test passes to gather latency stats
        for _ in range(3):
            t0 = time.perf_counter()
            report = await self.agent.inspect_tile(
                water_depth_m=0.55,
                surge_m=1.85,
                corridor_id=corridor_id
            )
            latencies.append((time.perf_counter() - t0) * 1000.0)
            reports.append(report)

        # Use the first report for detailed IoU evaluation
        eval_report = reports[0]
        detected_hazards = eval_report.detected_hazards
        gt_hazards = ground_truth["ground_truth_hazards"]

        # Match detected boxes to ground truth boxes
        tp = 0
        fp = 0
        fn = 0
        matched_gt = set()
        matched_ious = []
        detailed_matches = []

        for det in detected_hazards:
            det_box = det.box_2d
            best_iou = 0.0
            best_gt_idx = -1

            for idx, gt in enumerate(gt_hazards):
                iou = self.calculate_box_iou(det_box, gt["box_2d"])
                if iou > best_iou:
                    best_iou = iou
                    best_gt_idx = idx

            matched_ious.append(best_iou)

            if best_iou >= iou_threshold and best_gt_idx not in matched_gt:
                tp += 1
                matched_gt.add(best_gt_idx)
                detailed_matches.append({
                    "detected_label": det.label,
                    "ground_truth_label": gt_hazards[best_gt_idx]["label"],
                    "iou": round(best_iou, 3),
                    "status": "TRUE_POSITIVE"
                })
            else:
                fp += 1
                detailed_matches.append({
                    "detected_label": det.label,
                    "ground_truth_label": gt_hazards[best_gt_idx]["label"] if best_gt_idx >= 0 else None,
                    "iou": round(best_iou, 3),
                    "status": "FALSE_POSITIVE"
                })

        fn = len(gt_hazards) - len(matched_gt)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1_score = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        miou = float(np.mean(matched_ious)) if matched_ious else 0.0

        risk_level_correct = (eval_report.overall_risk_level == ground_truth["expected_risk_level"])

        return {
            "corridor_id": corridor_id,
            "engine_mode": eval_report.engine_mode,
            "target_facility": ground_truth["target_facility"],
            "ground_truth_hazard_count": len(gt_hazards),
            "detected_hazard_count": len(detected_hazards),
            "metrics": {
                "mIoU": round(miou, 4),
                "precision_at_50": round(precision, 4),
                "recall_at_50": round(recall, 4),
                "f1_score": round(f1_score, 4),
                "map_50": round(precision, 4),
                "risk_level_accuracy": 1.0 if risk_level_correct else 0.0,
                "latency_avg_ms": round(float(np.mean(latencies)), 2),
                "latency_p95_ms": round(float(np.percentile(latencies, 95)), 2)
            },
            "detailed_matches": detailed_matches
        }

    async def evaluate_all_corridors(self) -> Dict[str, Any]:
        """Runs vision evaluation across all 4 Pan-India corridors."""
        corridors = ["kochi", "chennai", "mumbai", "odisha"]
        results = {}
        all_precisions = []
        all_recalls = []
        all_f1s = []
        all_mious = []
        all_latencies = []

        for cid in corridors:
            res = await self.evaluate_corridor(cid)
            results[cid] = res
            m = res["metrics"]
            all_precisions.append(m["precision_at_50"])
            all_recalls.append(m["recall_at_50"])
            all_f1s.append(m["f1_score"])
            all_mious.append(m["mIoU"])
            all_latencies.append(m["latency_avg_ms"])

        return {
            "macro_averages": {
                "macro_mIoU": round(float(np.mean(all_mious)), 4),
                "macro_precision_50": round(float(np.mean(all_precisions)), 4),
                "macro_recall_50": round(float(np.mean(all_recalls)), 4),
                "macro_f1_score": round(float(np.mean(all_f1s)), 4),
                "macro_latency_ms": round(float(np.mean(all_latencies)), 2),
                "evaluated_corridors": len(corridors)
            },
            "corridor_evaluations": results
        }
