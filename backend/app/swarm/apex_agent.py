"""
CHRONOS-COASTAL Apex Incident Commander Agent
Synthesizes all multi-agent swarm intelligence into an Incident Action Plan (IAP)
under the 'Defend-in-Place' critical care doctrine.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import uuid
from app.swarm.bus import TacticalEventBus
from app.swarm.messages import SwarmMessage, Priority, IncidentActionPlan, TacticalDirective
from app.dataset import get_corridor


class ApexAgent:
    """
    Incident Commander arbitrating multi-agent priorities.
    Synthesizes real-time tactical directives across emergency agencies (SDMA, Fire & Rescue, Power Grid, Health Department).
    Enforces the Defend-in-Place doctrine: sustain ICUs with fuel and liquid oxygen instead of lethal last-minute transit.
    """

    def __init__(self, bus: TacticalEventBus, corridor_id: str = "kochi"):
        self.bus = bus
        self.corridor_id = corridor_id

    def set_corridor(self, corridor_id: str):
        self.corridor_id = corridor_id

    async def synthesize_iap(
        self,
        hydro_data: Dict[str, Any],
        grid_data: Dict[str, Any],
        logistics_data: Dict[str, Any],
        vision_report: Optional[Dict[str, Any]] = None,
        oracle_voucher: Optional[Dict[str, Any]] = None,
        corridor_id: Optional[str] = None
    ) -> IncidentActionPlan:
        """Synthesizes a master Incident Action Plan (IAP) and broadcasts it to the swarm."""
        if corridor_id:
            self.set_corridor(corridor_id)

        corridor_meta = get_corridor(self.corridor_id)
        directives: List[TacticalDirective] = []

        # 1. Financial Liquidity Directive (from Parametric Oracle)
        if oracle_voucher and oracle_voucher.get("threshold_exceeded"):
            directives.append(TacticalDirective(
                code="DIR-FINANCE-LIQUIDITY-RELEASE",
                priority="P1_STRATEGIC_RESOURCES",
                action="COMMANDEER_HIGH_VOLUME_DEWATERING_PUMPS",
                target="Municipal Disaster Fund",
                details=f"Parametric Oracle confirmed SAR threshold exceedance. Instant liquidity of ${oracle_voucher.get('payout_amount_usd', 5000000):,.0f} USD released. Commandeer 8x 500m³/h diesel pumps for sub-basins."
            ))

        # 2. Logistics Priority Directives (Oxygen & Diesel Convoys)
        routes = logistics_data.get("routes", [])
        for r in routes:
            dep_min = r["departure_window_remaining_min"]
            cargo = r["cargo_type"]
            choke = r["choke_point_name"]

            if dep_min <= 0.0 or r["is_currently_submerged"]:
                directives.append(TacticalDirective(
                    code="DIR-LOGISTICS-REROUTE",
                    priority="P0_LIFE_CRITICAL",
                    action="DEPLOY_AIR_DROP_OR_HOVERCRAFT",
                    target=f"{cargo} Convoy -> {r['destination_id']}",
                    details=f"{choke} is impassable. Road corridor severed. Activate State Police air-bridge or NDRF inflatable pontoon boats."
                ))
            elif dep_min <= 60.0:
                directives.append(TacticalDirective(
                    code="DIR-LOGISTICS-IMMEDIATE-DISPATCH",
                    priority="P0_LIFE_CRITICAL",
                    action="ESCORT_CONVOY_NOW",
                    target=f"{cargo} Convoy -> {r['destination_id']}",
                    details=f"Departure deadline closing in {dep_min} min! Police tactical escort cleared for heavy convoy across {choke} immediately."
                ))
            else:
                directives.append(TacticalDirective(
                    code="DIR-LOGISTICS-STAGE-CONVOY",
                    priority="P2_TACTICAL_STAGING",
                    action="STAGE_STANDBY_CREW",
                    target=f"{cargo} Convoy",
                    details=f"Departure window remaining: {dep_min} min across {choke}. Pre-stage heavy military tankers at origin depot."
                ))

        # 3. Healthcare Life-Support Directives
        hospitals = grid_data.get("hospitals", [])
        for h in hospitals:
            if h.get("hospital_status") == "CATASTROPHIC_BLACKOUT_DG_SUBMERGED":
                directives.append(TacticalDirective(
                    code="DIR-MED-BLACKOUT-TRIAGE",
                    priority="P0_LIFE_CRITICAL",
                    action="DISPATCH_MOBILE_GENERATOR_BARGES",
                    target=h["name"],
                    details=f"CATASTROPHIC BLACKOUT: Generator alternator submerged! {h['icu_patients']} ICU patients without ventilator power. Deploy flood-clearance military mobile DG sets immediately."
                ))
            elif h.get("on_generator"):
                directives.append(TacticalDirective(
                    code="DIR-MED-DEFEND-IN-PLACE",
                    priority="P1_LIFE_SUPPORT_SUSTAINMENT",
                    action="SECURE_DIESEL_REFUELING",
                    target=h["name"],
                    details=f"DO NOT EVACUATE ICU. Hospital is dry, but running on backup DG with {h['runtime_hours_remaining']}h fuel runway. Continuous diesel replenishment required before access corridor drowns."
                ))

        # 4. Geotechnical Inspection Directives
        if vision_report and vision_report.get("structural_washout_probability", 0.0) >= 0.60:
            directives.append(TacticalDirective(
                code="DIR-GEOTECH-EMBANKMENT-ARMORING",
                priority="P1_STRUCTURAL_DEFENSE",
                action="DEPLOY_GEOBAG_RIPRAP",
                target=vision_report.get("target_facility", "Critical Facility"),
                details=f"Gemini 3.7 Flash detected slope washout probability of {vision_report.get('structural_washout_probability')*100:.0f}%. Mobilize 500 sandbags and riprap geotextile along river embankment."
            ))

        # Threat classification
        tripped_substations = grid_data.get("tripped_substations", [])
        patients_at_risk = grid_data.get("total_patients_on_dg_risk", 0) + grid_data.get("total_blacked_out_icu_patients", 0)

        if len(tripped_substations) >= 3 or grid_data.get("total_blacked_out_icu_patients", 0) > 0:
            threat = "TIER-1 CATASTROPHIC COMPOUND GRID-HEALTHCARE COLLAPSE"
        elif len(tripped_substations) >= 1:
            threat = "TIER-2 SEVERE ESTUARINE BACKWATER DAMMING & GRID TRIP"
        else:
            threat = "TIER-3 LOCALIZED FLOOD MONITORING"

        iap = IncidentActionPlan(
            corridor_id=self.corridor_id,
            corridor_name=corridor_meta["name"],
            operational_period=f"{datetime.now(timezone.utc).strftime('%H:%M')} - {(datetime.now(timezone.utc)).strftime('%H:%M')} +6H",
            threat_classification=threat,
            doctrine_summary="DO NOT ATTEMPT MASS ICU EVACUATION. Execute Defend-in-Place doctrine via precision logistics departure windows.",
            damming_jump_m=hydro_data.get("estuarine_damming_jump_m", 0.0),
            tripped_substation_count=len(tripped_substations),
            tripped_substations=tripped_substations,
            critical_patients_at_risk=patients_at_risk,
            tactical_directives=directives
        )

        # Broadcast IAP onto the priority event bus
        await self.bus.publish(SwarmMessage(
            sender="ApexAgent",
            topic="directive.iap",
            priority=Priority.CRITICAL,
            payload=iap.model_dump()
        ))

        return iap
