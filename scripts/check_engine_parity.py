"""Verify the hosted adapter against the Python model, including edge cases."""
import json
import random
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.dataset import CORRIDORS
from app.hydro_engine import CompoundHydroEngine
from app.grid_engine import PowerGridCascadeEngine
from app.logistics_engine import LifeSupportLogisticsEngine


def compare(expected, actual, path="result"):
    if isinstance(expected, dict):
        assert expected.keys() == actual.keys(), f"{path}: schema differs"
        for key in expected:
            compare(expected[key], actual[key], f"{path}.{key}")
    elif isinstance(expected, list):
        assert len(expected) == len(actual), f"{path}: length differs"
        for index, (a, b) in enumerate(zip(expected, actual)):
            compare(a, b, f"{path}[{index}]")
    elif isinstance(expected, float):
        assert abs(expected - actual) <= .00101, f"{path}: {expected} != {actual}"
    else:
        assert expected == actual, f"{path}: {expected!r} != {actual!r}"


def main():
    fixture = json.loads((ROOT / "worker/corridors.json").read_text())
    assert fixture == json.loads(json.dumps(CORRIDORS)), "Hosted corridor data is out of date"
    rng = random.Random(2026)
    inputs = []
    for cid in CORRIDORS:
        cases = [(0, 50, .5, 0, False), (.4, 180, 18, 20, False), (1.85, 550, 6, 150, False),
                 (2.8, 950, 3, 300, True), (5, 2500, 24, 1000, True)]
        cases += [(rng.uniform(0, 5), rng.uniform(50, 2500), rng.uniform(.5, 24), rng.uniform(0, 1000), bool(i % 2)) for i in range(20)]
        for surge, inflow, hours, rain, enabled in cases:
            inputs.append(dict(corridor_id=cid, ocean_surge_m=surge, river_inflow_m3s=inflow,
                               hours_to_landfall=hours, rainfall_mm=rain, include_rainfall_runoff=enabled))
    runner = "import {simulate} from './worker/engine.mjs'; let input=''; for await(const chunk of process.stdin) input+=chunk; process.stdout.write(JSON.stringify(JSON.parse(input).map(simulate)));"
    result = subprocess.run(["node", "--input-type=module", "-e", runner], cwd=ROOT,
                            input=json.dumps(inputs), capture_output=True, text=True, check=True)
    outputs = json.loads(result.stdout)
    for index, (case, hosted) in enumerate(zip(inputs, outputs)):
        cid = case["corridor_id"]
        inflow = case["river_inflow_m3s"] + (case["rainfall_mm"] * 1e-3 * 120 * 1e6 * .45 / (24 * 3600) if case["include_rainfall_runoff"] else 0)
        hydro = CompoundHydroEngine(cid).simulate(case["ocean_surge_m"], inflow, case["hours_to_landfall"])
        grid = PowerGridCascadeEngine(cid).evaluate_cascade(hydro)
        logistics = LifeSupportLogisticsEngine(cid).evaluate_reachability(case["ocean_surge_m"], inflow, case["hours_to_landfall"])
        for key, expected in [("hydro", hydro), ("grid", grid), ("logistics", logistics)]:
            compare(expected, hosted[key], f"case[{index}].{key}")
    print(f"PASS: {len(inputs)} scenarios across 4 corridors; complete hydro, grid and logistics schemas agree within 0.00101.")


if __name__ == "__main__":
    main()
