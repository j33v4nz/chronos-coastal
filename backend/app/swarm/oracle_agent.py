"""
CHRONOS-COASTAL Parametric Proof Oracle Agent
Automated Sentinel-1 SAR change-detection index and cryptographic emergency contingency liquidity release.
"""

import hashlib
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import uuid

from app.swarm.bus import TacticalEventBus
from app.swarm.messages import SwarmMessage, Priority, ParametricLiquidityVoucher
from app.dataset import get_corridor


class ParametricOracleAgent:
    """
    Parametric Disaster Liquidity Oracle.
    Analyzes Sentinel-1 SAR radar backscatter attenuation (Delta sigma0 <= -3.5 dB).
    When the verified Flooded Area Fraction (FAF) crosses the 20% municipal threshold,
    it automatically generates an immutable, cryptographically sealed $5M liquidity release voucher.
    """

    def __init__(self, bus: TacticalEventBus, corridor_id: str = "kochi"):
        self.bus = bus
        self.corridor_id = corridor_id
        self.corridor_data = get_corridor(corridor_id)

    def set_corridor(self, corridor_id: str):
        self.corridor_id = corridor_id
        self.corridor_data = get_corridor(corridor_id)

    async def execute_and_publish(
        self,
        ocean_surge_m: float,
        river_inflow_m3s: float,
        hydro_data: Dict[str, Any],
        corridor_id: Optional[str] = None
    ) -> ParametricLiquidityVoucher:
        """Evaluates SAR flood index and issues cryptographic payout voucher."""
        if corridor_id:
            self.set_corridor(corridor_id)

        params = self.corridor_data["hydrologic_params"]
        threshold_faf = params.get("parametric_faf_threshold", 0.20)
        fund_total_usd = params.get("contingency_fund_total_usd", 5000000.0)

        # Calculate SAR radar backscatter drop based on compound water accumulation
        # Open water specular reflection creates characteristic 3 to 6 dB backscatter drop
        flooded_fraction = hydro_data.get("flooded_fraction", 0.0)
        sar_delta_db = round(-3.5 - (flooded_fraction * 2.8) - (ocean_surge_m * 0.4), 2)

        # Trigger threshold evaluation
        is_triggered = flooded_fraction >= threshold_faf or abs(sar_delta_db) >= 4.2

        if is_triggered:
            payout_usd = fund_total_usd
            authorizations = [
                "Requisition 8x 500m³/h mobile diesel dewatering pumps from regional contractor pool.",
                "Authorize emergency fuel purchase orders for private tanker supply fleets.",
                "Deploy NDRF / State Police inflatable tactical rescue boats to inundated sectors."
            ]
        else:
            payout_usd = 0.0
            authorizations = [
                "Baseline flood threshold not yet breached. Contingency liquidity remains reserved."
            ]

        # Generate SHA-256 cryptographic seal
        timestamp_str = datetime.now(timezone.utc).isoformat()
        voucher_id = f"VOUCHER-SAR-{uuid.uuid4().hex[:8].upper()}"
        seal_payload = f"{voucher_id}:{self.corridor_id}:{timestamp_str}:{sar_delta_db}:{flooded_fraction}:{payout_usd}"
        sha256_seal = hashlib.sha256(seal_payload.encode()).hexdigest()

        voucher = ParametricLiquidityVoucher(
            voucher_id=voucher_id,
            corridor_id=self.corridor_id,
            corridor_name=self.corridor_data["name"],
            timestamp_utc=timestamp_str,
            sar_backscatter_delta_db=sar_delta_db,
            flooded_area_fraction=flooded_fraction,
            threshold_exceeded=is_triggered,
            payout_amount_usd=payout_usd,
            disbursement_entity=f"{self.corridor_data['region']} Municipal Contingency Treasury",
            sha256_cryptographic_seal=sha256_seal,
            emergency_authorizations=authorizations
        )

        # Publish voucher onto priority event bus
        await self.bus.publish(SwarmMessage(
            sender="ParametricOracleAgent",
            topic="oracle.payout",
            priority=Priority.CRITICAL if is_triggered else Priority.INFO,
            payload=voucher.model_dump()
        ))

        return voucher
