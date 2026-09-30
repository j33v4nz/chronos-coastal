"""
CHRONOS-COASTAL Swarm Message Schemas and Telemetry Contracts
Type-safe Pydantic models for inter-agent communication across the Tactical Priority Event Bus.
"""

from enum import IntEnum
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field


class Priority(IntEnum):
    """Event Bus Priority Levels (Lower value = Higher Priority)"""
    CRITICAL = 0   # Breaker trips, ICU power failures, route drowning
    HIGH = 1       # Hydro threshold warnings, urgent convoy departure
    NORMAL = 2     # Baseline telemetry, routine agent sync
    INFO = 3       # Informational state logs, audit confirmation


class SwarmMessage(BaseModel):
    """Universal envelope for all inter-agent messages on the Priority Event Bus."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender: str
    topic: str
    priority: Priority = Priority.NORMAL
    timestamp_utc: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    payload: Dict[str, Any] = Field(default_factory=dict)

    def to_broadcast_dict(self) -> Dict[str, Any]:
        """Serializes message for real-time WebSocket client streaming."""
        return {
            "id": self.id,
            "sender": self.sender,
            "topic": self.topic,
            "priority": int(self.priority),
            "priority_label": self.priority.name,
            "timestamp": self.timestamp_utc,
            "payload": self.payload
        }


# =============================================================================
# Specialized Schemas: Multimodal Geotechnical AI & Parametric Oracle
# =============================================================================

class GeotechnicalHazard(BaseModel):
    """Individual hazard detected by Gemini 2.5 Flash with normalized 2D bounding box."""
    label: str = Field(description="Classification label: e.g. SLOPE_FAILURE_SCARP, RETENTION_DEPRESSION, ACCESS_WASHOUT")
    box_2d: List[int] = Field(min_length=4, max_length=4, description="Normalized coordinates [ymin, xmin, ymax, xmax] in 0-1000 scale")
    confidence: float = Field(ge=0, le=1, description="Uncalibrated model confidence from 0.0 to 1.0")
    description: str = Field(description="Technical rationale describing geotechnical soil/slope vulnerability")


class GeotechnicalReport(BaseModel):
    """Structured report emitted by Gemini 2.5 Flash or the synthetic fallback engine."""
    corridor_id: str
    target_facility: str
    overall_risk_level: str = Field(description="CRITICAL, HIGH, MODERATE, or LOW")
    structural_washout_probability: float = Field(ge=0, le=1, description="Uncalibrated demonstration risk score (0.0 to 1.0); not a measured failure probability")
    detected_hazards: List[GeotechnicalHazard] = Field(default_factory=list)
    geotechnical_summary: str
    recommended_countermeasures: List[str] = Field(default_factory=list)
    timestamp_utc: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    engine_mode: str = "UNSPECIFIED"


class ParametricLiquidityVoucher(BaseModel):
    """Cryptographically sealed emergency contingency liquidity release voucher."""
    voucher_id: str = Field(default_factory=lambda: f"VOUCHER-SAR-{uuid.uuid4().hex[:8].upper()}")
    corridor_id: str
    corridor_name: str
    timestamp_utc: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    sar_backscatter_delta_db: float
    flooded_area_fraction: float
    threshold_exceeded: bool
    payout_amount_usd: float
    disbursement_entity: str = "Municipal Disaster Emergency Contingency Ledger"
    sha256_cryptographic_seal: str
    emergency_authorizations: List[str] = Field(default_factory=list)


class TacticalDirective(BaseModel):
    """Actionable incident directive issued by the Apex Incident Commander."""
    code: str
    priority: str
    action: str
    target: str
    details: str


class IncidentActionPlan(BaseModel):
    """Master incident action plan synthesizing all swarm intelligence."""
    incident_id: str = Field(default_factory=lambda: f"IAP-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}")
    corridor_id: str
    corridor_name: str
    operational_period: str
    threat_classification: str
    doctrine_summary: str
    damming_jump_m: float
    tripped_substation_count: int
    tripped_substations: List[str]
    critical_patients_at_risk: int
    tactical_directives: List[TacticalDirective]
    timestamp_utc: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
