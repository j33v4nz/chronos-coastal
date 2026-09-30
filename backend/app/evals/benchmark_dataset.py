"""
CHRONOS-COASTAL Evaluation Benchmark Dataset
Golden ground-truth datasets for model calibration, evaluation (evals), and fine-tuning.
Calibrated against real-world cyclonic and estuarine flood events across 4 national corridors:
1. Kochi (Kerala Deluge August 2018)
2. Chennai (Cyclone Michaung Dec 2023 & Deluge 2015)
3. Mumbai (Mithi River Deluge 2005 / Monsoonal Tidal Locks)
4. Odisha (Super Cyclone 1999 & Cyclone Fani 2019)
"""

from typing import Dict, List, Any

# ==============================================================================
# 1. Historical Hydrological Gauge Ground-Truth (Observed vs Simulated Validation)
# ==============================================================================
HISTORICAL_HYDRO_GAUGES: Dict[str, Dict[str, Any]] = {
    "kochi": {
        "event_name": "Kerala Deluge August 2018 (Peak Runoff)",
        "ocean_surge_m": 1.85,
        "river_inflow_m3s": 550.0,
        "gauges": [
            {
                "gauge_id": "G_ALUVA",
                "name": "Aluva Manappuram Gauge (Periyar)",
                "elevation_m": 8.0,
                "observed_wse_m": 11.20,
                "distance_from_coast_km": 16.5,
                "distance_along_river_km": 2.0,
            },
            {
                "gauge_id": "G_ELOOR",
                "name": "Eloor Industrial Ferry Gauge (Periyar)",
                "elevation_m": 4.5,
                "observed_wse_m": 7.45,
                "distance_from_coast_km": 11.0,
                "distance_along_river_km": 6.5,
            },
            {
                "gauge_id": "G_CHERANALLUR",
                "name": "Cheranallur Backwater Gauge",
                "elevation_m": 2.2,
                "observed_wse_m": 4.65,
                "distance_from_coast_km": 7.5,
                "distance_along_river_km": 9.5,
            },
            {
                "gauge_id": "G_VYTTILA",
                "name": "Vyttila Hub / Chilavannoor Canal Gauge",
                "elevation_m": 5.0,
                "observed_wse_m": 5.40,
                "distance_from_coast_km": 6.2,
                "distance_along_river_km": 13.0,
            },
            {
                "gauge_id": "G_NETTOOR",
                "name": "Nettoor Estuarine Gauge (Vembanad)",
                "elevation_m": 2.5,
                "observed_wse_m": 4.80,
                "distance_from_coast_km": 5.0,
                "distance_along_river_km": 14.5,
            },
            {
                "gauge_id": "G_BARMOUTH",
                "name": "Cochin Barmouth Harbour Gauge",
                "elevation_m": 0.0,
                "observed_wse_m": 1.85,
                "distance_from_coast_km": 0.5,
                "distance_along_river_km": 20.0,
            }
        ],
        "recorded_tripped_substations": ["F1_WillingdonFuel", "S5_Cheranallur", "S6_Nettoor"],
        "recorded_generator_ignited_hospitals": ["H1_Lakeshore"],
        "recorded_blackout_hospitals": ["H2_Aster"],
        "recorded_choked_roads": ["R1_Kundannoor", "R2_Container"],
    },
    "chennai": {
        "event_name": "Cyclone Michaung December 2023",
        "ocean_surge_m": 2.20,
        "river_inflow_m3s": 800.0,
        "gauges": [
            {
                "gauge_id": "G_CHEMBARAMBAKKAM",
                "name": "Chembarambakkam Outfall Gauge",
                "elevation_m": 16.0,
                "observed_wse_m": 19.80,
                "distance_from_coast_km": 22.0,
                "distance_along_river_km": 2.0,
            },
            {
                "gauge_id": "G_MANAPAKKAM",
                "name": "Manapakkam / MIOT Bridge Gauge",
                "elevation_m": 5.5,
                "observed_wse_m": 8.70,
                "distance_from_coast_km": 11.5,
                "distance_along_river_km": 9.0,
            },
            {
                "gauge_id": "G_JAFFARKHANPET",
                "name": "Jaffarkhanpet Causeways",
                "elevation_m": 3.8,
                "observed_wse_m": 6.85,
                "distance_from_coast_km": 8.0,
                "distance_along_river_km": 13.0,
            },
            {
                "gauge_id": "G_KOTTURPURAM",
                "name": "Kotturpuram River Bend Gauge",
                "elevation_m": 2.0,
                "observed_wse_m": 4.90,
                "distance_from_coast_km": 4.5,
                "distance_along_river_km": 17.0,
            },
            {
                "gauge_id": "G_ADYAR_ESTUARY",
                "name": "Adyar Estuary Creek Bar",
                "elevation_m": 0.0,
                "observed_wse_m": 2.20,
                "distance_from_coast_km": 0.3,
                "distance_along_river_km": 21.0,
            }
        ],
        "recorded_tripped_substations": ["CH_S4_Saidapet"],
        "recorded_generator_ignited_hospitals": ["CH_H1_MIOT"],
        "recorded_blackout_hospitals": [],
        "recorded_choked_roads": ["CH_R1_Kathipara", "CH_R2_MountPoonamallee"],
    },
    "mumbai": {
        "event_name": "Mumbai Mithi Monsoon Deluge / High Tide Wall",
        "ocean_surge_m": 2.50,
        "river_inflow_m3s": 900.0,
        "gauges": [
            {
                "gauge_id": "G_VIHAR",
                "name": "Vihar Lake Spillway Gauge",
                "elevation_m": 32.0,
                "observed_wse_m": 35.60,
                "distance_from_coast_km": 14.0,
                "distance_along_river_km": 1.5,
            },
            {
                "gauge_id": "G_SAKI_NAKA",
                "name": "Saki Naka Bridge Gauge",
                "elevation_m": 8.5,
                "observed_wse_m": 11.90,
                "distance_from_coast_km": 9.5,
                "distance_along_river_km": 6.0,
            },
            {
                "gauge_id": "G_KURLA",
                "name": "Kurla / Bail Bazar Gauge",
                "elevation_m": 3.5,
                "observed_wse_m": 6.75,
                "distance_from_coast_km": 6.0,
                "distance_along_river_km": 11.0,
            },
            {
                "gauge_id": "G_BKC",
                "name": "BKC / Dharavi Confluence Gauge",
                "elevation_m": 2.0,
                "observed_wse_m": 5.10,
                "distance_from_coast_km": 3.5,
                "distance_along_river_km": 14.5,
            },
            {
                "gauge_id": "G_MAHIM",
                "name": "Mahim Creek Outfall Gauge",
                "elevation_m": 0.0,
                "observed_wse_m": 2.50,
                "distance_from_coast_km": 0.2,
                "distance_along_river_km": 17.5,
            }
        ],
        "recorded_tripped_substations": ["MU_S1_Dharavi", "MU_S2_Kurla", "MU_S3_BKC"],
        "recorded_generator_ignited_hospitals": ["MU_H1_Sion"],
        "recorded_blackout_hospitals": [],
        "recorded_choked_roads": ["MU_R1_SionBandra", "MU_R2_WEH_Kalanagar"],
    },
    "odisha": {
        "event_name": "Cyclone Fani & Mahanadi Coastal Storm Surge",
        "ocean_surge_m": 2.80,
        "river_inflow_m3s": 750.0,
        "gauges": [
            {
                "gauge_id": "G_NARAJ",
                "name": "Naraj Barrage Outfall (Mahanadi)",
                "elevation_m": 24.0,
                "observed_wse_m": 27.90,
                "distance_from_coast_km": 65.0,
                "distance_along_river_km": 5.0,
            },
            {
                "gauge_id": "G_TIRTOL",
                "name": "Tirtol Deltaic Gauge",
                "elevation_m": 8.0,
                "observed_wse_m": 11.60,
                "distance_from_coast_km": 30.0,
                "distance_along_river_km": 35.0,
            },
            {
                "gauge_id": "G_KUJANG",
                "name": "Kujang Estuarine Gauge",
                "elevation_m": 3.0,
                "observed_wse_m": 6.40,
                "distance_from_coast_km": 14.0,
                "distance_along_river_km": 55.0,
            },
            {
                "gauge_id": "G_PARADIP",
                "name": "Paradip Port Estuary Gauge",
                "elevation_m": 0.0,
                "observed_wse_m": 2.80,
                "distance_from_coast_km": 0.5,
                "distance_along_river_km": 72.0,
            }
        ],
        "recorded_tripped_substations": ["OD_F1_IOCLRefinery", "OD_S2_Paradip", "OD_S3_Ersama"],
        "recorded_generator_ignited_hospitals": ["OD_H1_ParadipPort"],
        "recorded_blackout_hospitals": [],
        "recorded_choked_roads": ["OD_R1_SH12_ParadipCuttack"],
    }
}


# ==============================================================================
# 2. Golden Geotechnical Vision Ground-Truth (Bounding Boxes & Hazard Labels)
# Normalized [ymin, xmin, ymax, xmax] in [0, 1000] range
# ==============================================================================
GOLDEN_VISION_GROUND_TRUTH: Dict[str, Dict[str, Any]] = {
    "kochi": {
        "target_facility": "VPS Lakeshore Hospital",
        "ground_truth_hazards": [
            {
                "label": "SLOPE_FAILURE_SCARP",
                "box_2d": [340, 410, 480, 520],
                "risk_category": "SLOPE_STABILITY",
                "min_confidence": 0.85
            },
            {
                "label": "TOPOLOGICAL_DEPRESSION_DG_PAD",
                "box_2d": [260, 240, 310, 290],
                "risk_category": "INUNDATION_POOLING",
                "min_confidence": 0.80
            },
            {
                "label": "ACCESS_CORRIDOR_WASH_VULNERABILITY",
                "box_2d": [370, 0, 420, 680],
                "risk_category": "CORRIDOR_INTEGRITY",
                "min_confidence": 0.85
            }
        ],
        "expected_risk_level": "CRITICAL"
    },
    "chennai": {
        "target_facility": "MIOT International Hospital",
        "ground_truth_hazards": [
            {
                "label": "ADYAR_EMBANKMENT_SCOUR",
                "box_2d": [310, 380, 450, 490],
                "risk_category": "SLOPE_STABILITY",
                "min_confidence": 0.85
            },
            {
                "label": "SUBSTATION_BASEMENT_INUNDATION",
                "box_2d": [220, 210, 290, 270],
                "risk_category": "INUNDATION_POOLING",
                "min_confidence": 0.80
            }
        ],
        "expected_risk_level": "HIGH"
    },
    "mumbai": {
        "target_facility": "Sion Hospital / Kurla Corridor",
        "ground_truth_hazards": [
            {
                "label": "MITHI_ESTUARY_TIDAL_BACKWATER_POOL",
                "box_2d": [350, 390, 500, 510],
                "risk_category": "SLOPE_STABILITY",
                "min_confidence": 0.85
            },
            {
                "label": "HOSPITAL_BASEMENT_FLOOD_RISK",
                "box_2d": [240, 220, 320, 290],
                "risk_category": "INUNDATION_POOLING",
                "min_confidence": 0.80
            }
        ],
        "expected_risk_level": "HIGH"
    },
    "odisha": {
        "target_facility": "Paradip Port Hospital & Coastal Refinery",
        "ground_truth_hazards": [
            {
                "label": "DELTAIC_LEVEE_BREACH_RISK",
                "box_2d": [300, 360, 460, 480],
                "risk_category": "SLOPE_STABILITY",
                "min_confidence": 0.85
            },
            {
                "label": "REFINERY_COASTAL_DIKE_OVERTOPPING",
                "box_2d": [200, 180, 280, 260],
                "risk_category": "INUNDATION_POOLING",
                "min_confidence": 0.80
            }
        ],
        "expected_risk_level": "HIGH"
    }
}
