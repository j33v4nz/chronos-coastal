import copy

from app.dataset import CORRIDORS
from app.evals.physics_calibration import PhysicsCalibrationEngine
from app.hydro_engine import CompoundHydroEngine


def test_parameter_fitting_does_not_mutate_live_corridor_data():
    before = copy.deepcopy(CORRIDORS["kochi"]["hydrologic_params"])
    live = CompoundHydroEngine("kochi")
    original = live.simulate(1.85, 550)
    result = PhysicsCalibrationEngine("kochi").fine_tune_parameters()
    assert result["optimization_success"]
    assert CORRIDORS["kochi"]["hydrologic_params"] == before
    assert live.simulate(1.85, 550) == original
    assert CompoundHydroEngine("kochi").simulate(1.85, 550) == original
