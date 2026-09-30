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
                details=f"Scenario threshold exceeded. Simulated eligibility for ${oracle_voucher.get('payout_amount_usd', 5000000):,.0f} USD contingency funding; no funds have been disbursed. Review dewatering and emergency fuel procurement needs."
            ))

        # 2. Logistics Priority Directives (Oxygen & Diesel Convoys)
        routes = logistics_data.get("routes", [])
        for r in routes:
            dep_min = r["departure_window_remaining_min"]
            cargo = r["cargo_type"]
            choke = r["choke_point_name"]

            if r["is_currently_submerged"]:
                directives.append(TacticalDirective(
                    code="DIR-LOGISTICS-REROUTE",
                    priority="P0_LIFE_CRITICAL",
                    action="DEPLOY_AIR_DROP_OR_HOVERCRAFT",
                    target=f"{cargo} Convoy -> {r['destination_id']}",
                    details=f"{choke} is impassable in the scenario. Review an alternate delivery method and confirm resources with local authorities."
                ))
            elif dep_min is not None and dep_min <= 0.0:
                directives.append(TacticalDirective(
                    code="DIR-LOGISTICS-WINDOW-CLOSED",
                    priority="P0_LIFE_CRITICAL",
                    action="FIND_ALTERNATE_ROUTE",
                    target=f"{cargo} Convoy -> {r['destination_id']}",
                    details=f"The safe departure window has closed at {choke}; the road is not yet submerged."
                ))
            elif dep_min is not None and dep_min <= 60.0:
                directives.append(TacticalDirective(
                    code="DIR-LOGISTICS-IMMEDIATE-DISPATCH",
                    priority="P0_LIFE_CRITICAL",
                    action="ESCORT_CONVOY_NOW",
                    target=f"{cargo} Convoy -> {r['destination_id']}",
                    details=f"Estimated departure window: {dep_min} min across {choke}. Confirm route conditions and review escort needs before dispatch."
                ))
            else:
                directives.append(TacticalDirective(
                    code="DIR-LOGISTICS-STAGE-CONVOY",
                    priority="P2_TACTICAL_STAGING",
                    action="STAGE_STANDBY_CREW",
                    target=f"{cargo} Convoy",
                    details=(f"Departure window remaining: {dep_min} min across {choke}."
                             if dep_min is not None else
                             f"No clearance breach predicted before landfall at {choke}.")
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
                    details=f"The scenario indicates loss of grid supply and generator availability, affecting {h['icu_patients']} ICU beds. Clinical and emergency teams should assess supported power restoration or evacuation."
                ))
            elif h.get("on_generator"):
                directives.append(TacticalDirective(
                    code="DIR-MED-DEFEND-IN-PLACE",
                    priority="P1_LIFE_SUPPORT_SUSTAINMENT",
                    action="SECURE_DIESEL_REFUELING",
                    target=h["name"],
                    details=f"Hospital backup generator has an estimated {h['runtime_hours_remaining']}h fuel reserve. Clinical and emergency teams should assess sustainment versus supported evacuation and confirm a safe replenishment route."
                ))

        # 4. Geotechnical Inspection Directives
        if vision_report and vision_report.get("structural_washout_probability", 0.0) >= 0.60:
            directives.append(TacticalDirective(
                code="DIR-GEOTECH-EMBANKMENT-ARMORING",
                priority="P1_STRUCTURAL_DEFENSE",
                action="DEPLOY_GEOBAG_RIPRAP",
                target=vision_report.get("target_facility", "Critical Facility"),
                details=f"The inspection reports an uncalibrated structural risk score of {vision_report.get('structural_washout_probability')*100:.0f}%. Review image provenance and local conditions before selecting protective measures."
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
            doctrine_summary="Prioritize continuity of critical care. Confirm local conditions, safe access, backup power, and clinically supervised evacuation options before acting.",
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
