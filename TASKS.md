# 📋 CHRONOS-COASTAL: Hackathon Task Division & Execution Roadmap

This document outlines the modular task division for **CHRONOS-COASTAL** (Physics-Coupled Compound Inundation & Critical Infrastructure Triaging Swarm). Designed for parallel execution across a 2-4 person team or phased solo development during a national hackathon sprint.

---

## 👥 Track & Role Breakdown

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               CHRONOS-COASTAL WORKSTREAMS                              │
├────────────────────────────┬─────────────────────────────┬─────────────────────────────┤
│ 🌊 Track 1: Physics & Grid │ 🤖 Track 2: Swarm & Backend │ 👁️ Track 3: AI & Oracle      │
│ - Compound Hydro (M1 Curve)│ - FastAPI Gateway           │ - 3-Band GIS Tile Generator │
│ - Power DAG Breakers       │ - Priority Event Bus        │ - Gemini 3.7 Flash Vision   │
│ - Logistics Reachability   │ - WebSocket Broadcaster     │ - Parametric SAR Oracle     │
├────────────────────────────┴─────────────────────────────┴─────────────────────────────┤
│ 🗺️ Track 4: Digital Twin UI (Frontend)   │ 🎙️ Track 5: Pitch & Demo Strategy           │
│ - Leaflet Dark-Matter Geospatial Map     │ - 3-Minute Live Pitch Script                │
│ - Sliders, Fuel Gauges, Telemetry Bar    │ - 3 Fail-Safe Judge Scenarios               │
│ - Inspector & Oracle Modals              │ - Offline Backup Screen Recording           │
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

---

## ⏱️ 24-Hour Hackathon Sprint Timeline

| Time Window | Milestone | Key Deliverable |
| :--- | :--- | :--- |
| **Hours 0 – 3** | **Architecture & Interface Freeze** | Lock Pydantic schemas, asset coordinates, and WebSocket message contracts. |
| **Hours 3 – 8** | **Core Engines (Parallel Sprint 1)** | Complete Hydro solver, NetworkX power DAG, GIS tile synthesizer, and React map shell. |
| **Hours 8 – 14** | **Swarm & Intelligence (Parallel Sprint 2)** | Connect 6 agents over Priority Event Bus; implement Gemini 3.7 Flash + offline fallback. |
| **Hours 14 – 18** | **Digital Twin Integration** | Wire React frontend to FastAPI WebSocket; hook up sliders, dark-grid matrix, and modal popups. |
| **Hours 18 – 21** | **Stress Testing & Failsafe Lockdown** | Run automated test suite (`pytest`), test 100% offline mode, tune slider sensitivity. |
| **Hours 21 – 24** | **Pitch Polish & Live Demo Rehearsal** | Rehearse 3-minute pitch with teleprompter; capture 1080p backup demo video. |

---

## 🛠️ Granular Task Matrix

### Track 1: Physics, Hydrodynamics & Power Grid Modeling
> **Objective:** Deliver mathematically grounded simulations that produce realistic, non-trivial outputs (e.g. compound backwater head jumps, substation breaker trips).

- [ ] **Task 1.1: Pan-India Multi-Corridor Georeferencing (`app/dataset.py`)**
  - **Corridor 1 (Kochi Primary Benchmark)**: PGCIL Pallikkara (25m), Kalamassery 220kV (15m), Vyttila 110kV (5m), Cheranallur 33kV (2.2m), Nettoor 33kV (2.5m), VPS Lakeshore Hospital (3.0m), Aster Medcity (2.0m), Kundannoor Bridge choke point (1.4m).
  - **Corridor 2 (Chennai Adyar Delta)**: Manapakkam 230kV Hub (8m), Guindy 110kV (6m), Saidapet 33kV (3m), MIOT International Hospital (4m), Apollo Speciality Vanagaram (7m), Kathipara Junction choke (2.2m).
  - **Corridor 3 (Mumbai Mithi Estuary)**: Dharavi 220kV Hub (5m), Kurla 110kV (3m), Sion Hospital (4.5m), BKC Financial Node (3m), Western Express Highway bridge choke (2.0m).
  - **Corridor 4 (Odisha Mahanadi Delta)**: Paradip 220kV Coastal Hub (3.5m), Jagatsinghpur Medical Node (6m), Cuttack East 132kV (12m).
  - *Definition of Done (DoD):* Multi-corridor dataset dictionary allowing dynamic loading of any Indian coastal corridor with coordinates, elevations, DAG edges, and choke points.

- [ ] **Task 1.2: Compound Hydrodynamics Solver (`HydroAgent`)**
  - Implement two-boundary hydro equations: Ocean Surge Decay + Inlet Orifice Damming + M1 Backwater Curve.
  - Formula: $\Delta\eta_{\text{dam}} = \frac{1}{2g} (Q / C_d A)^2$; $\text{WSE}(x,y) = \max(\text{Surge}, \Delta\eta_{\text{dam}} + \eta_{\text{backwater}})$.
  - Calculate localized inundation depth $D(x,y) = \max(0, \text{WSE} - Z_{\text{DEM}})$.
  - *DoD:* Unit tests pass verifying low-lying backwater assets flood while elevated inland assets stay dry.

- [ ] **Task 1.3: Directed Acyclic Electrical Grid Cascade (`GridCascadeAgent`)**
  - Build NetworkX DiGraph representing transmission-to-distribution hierarchy.
  - Enforce arc-flash trip threshold at $0.4\text{m}$ water depth.
  - Propagate upstream breaker trips isolating downstream dry assets (e.g. VPS Lakeshore dry at 0.0m flood but loses grid power).
  - Model hospital backup diesel generator burn rate (112.5 L/h on 450 kW ICU load; fuel depletion countdown).
  - *DoD:* Automated test confirms dry hospital triggers generator run and power outage.

- [ ] **Task 1.4: Life-Support Logistics Reachability (`LifeSupportLogisticsAgent`)**
  - Model convoy routes: Liquid Medical Oxygen (LMO) vs Diesel Fuel Tankers.
  - Implement critical water clearance threshold: LMO $d_{\text{crit}} = 0.20\text{m}$ vs Diesel $d_{\text{crit}} = 0.45\text{m}$.
  - Compute Time-to-Submersion (TTS) and dynamic departure window countdowns.
  - *DoD:* Output flags departure deadline before Kundannoor Bridge reaches $0.20\text{m}$.

---

### Track 2: Multi-Agent Swarm Orchestration & Backend Core
> **Objective:** Coordinate asynchronous agent communication, incident synthesis, and real-time streaming.

- [ ] **Task 2.1: Message Schemas & Contracts (`app/swarm/messages.py`)**
  - Define Pydantic models for inter-agent events, telemetry packets, and incident directives.
  - Implement Priority scoring: `CRITICAL` (0), `HIGH` (1), `NORMAL` (2), `INFO` (3).
  - *DoD:* Type-checked schemas for HydroState, GridState, LogisticsOrder, VisionReport, and LiquidityVoucher.

- [ ] **Task 2.2: Asynchronous Priority Event Bus (`app/swarm/bus.py`)**
  - Create `TacticalEventBus` utilizing `asyncio.PriorityQueue`.
  - Provide pub/sub topic routing and WebSocket subscriber broadcast.
  - *DoD:* Inter-agent messages automatically fan out to connected WebSocket clients in priority order.

- [ ] **Task 2.3: Apex Incident Commander Agent (`app/swarm/apex_agent.py`)**
  - Ingest telemetry from Hydro, Grid, Logistics, Vision, and Oracle agents.
  - Enforce the "Defend-in-Place" doctrine (prohibiting chaotic ICU evacuation 6 hours before landfall).
  - Synthesize unified Incident Action Plan (IAP) directives.
  - *DoD:* Returns structured tactical directives with action codes, priorities, and assigned agencies.

- [ ] **Task 2.4: FastAPI REST & WebSocket Server (`app/main.py`)**
  - Endpoints:
    - `POST /api/simulate`: Runs full hydro + grid + logistics + oracle pipeline.
    - `POST /api/gemini/inspect`: Triggers multimodal vision inspection.
    - `GET /api/tile/preview`: Returns composite GIS image.
    - `GET /api/scenarios`: Returns preset simulation configurations.
    - `WS /ws/tactical-feed`: Real-time streaming WebSocket.
    - Static file mounting for built React UI (`frontend/dist`).
  - *DoD:* All REST and WS endpoints respond with $<50\text{ms}$ latency.

---

### Track 3: Gemini 3.7 Flash Multimodal AI & Parametric Oracle
> **Objective:** Build the standout AI novelty (visual geotechnical reasoning) and financial resilience oracle.

- [ ] **Task 3.1: 3-Band Composite GIS Tile Generator (`app/map_generator.py`)**
  - Synthesize synthetic/real GIS rasters into an uncompressed 3-band JPEG:
    - Band 1 (Red): DEM slope gradient $>35^\circ$ (landslide/embankment risk).
    - Band 2 (Green): SAR backscatter change $\Delta\sigma^0 \le -3.5\,\text{dB}$ (soil saturation / standing water).
    - Band 3 (Blue): Vector footprints of critical infrastructure and road corridors.
  - *DoD:* Generates valid 700x700 false-color image representing the target district.

- [ ] **Task 3.2: Gemini 3.7 Flash Multimodal Spatial Inspector (`GeotechnicalVisionAgent`)**
  - Integrate official Google GenAI SDK (`google-genai`).
  - Prompt engineering: Structured multimodal geotechnical audit prompt demanding normalized 2D bounding boxes and slope stability ratings.
  - Enforce Pydantic structured output schema (`GeotechnicalReport`).
  - *DoD:* Gemini returns structural washout probability, depression identification, and confidence score.

- [ ] **Task 3.3: Zero-Downtime Deterministic Fallback Engine**
  - Implement heuristic vision simulator when `GEMINI_API_KEY` is absent or network fails.
  - Compute localized slope angles and depression indices from asset elevations.
  - Guarantee 100% demo uptime under strict offline conditions.
  - *DoD:* System seamlessly switches between live Gemini 3.7 Flash and fallback with identical output schema.

- [ ] **Task 3.4: Parametric Proof Oracle (`ParametricOracleAgent`)**
  - Implement Sentinel-1 SAR change-detection index.
  - Calculate flooded surface fraction and verify trigger threshold.
  - Generate cryptographic emergency payout voucher ($5M USD) with SHA-256 seal.
  - *DoD:* Outputs tamper-proof JSON contingency payout certificate.

---

### Track 4: Cybernetic UI & Digital Twin Dashboard (Frontend)
> **Objective:** Create an electric, high-density, mission-control interface that grabs judges in the first 5 seconds.

- [ ] **Task 4.1: Project Scaffold & Cyberpunk Dark-Mode Theme**
  - Setup Vite + React + Tailwind CSS with dark palette (slate-950, cyan-400, amber-400, rose-500).
  - Build top telemetry ticker (active agents, connected sockets, total ICU patients at risk).
  - *DoD:* High-performance responsive mission-control frame.

- [ ] **Task 4.2: Leaflet Dark-Matter Tactical Canvas & Corridor Switcher (`TacticalMap.jsx`)**
  - Render CartoDB dark matter basemap with 1-click **Pan-India Corridor Switcher**:
    - `📍 Kochi-Vembanad (Primary Calibrated Benchmark)`
    - `📍 Chennai Adyar Delta (Cyclone Michaung / 2015)`
    - `📍 Mumbai Mithi Estuary (Urban Tidal Confluence)`
    - `📍 Odisha Mahanadi Delta (Bay of Bengal Cyclones)`
  - Draw dynamic water inundation circles/polygons with color-coded depth gradients.
  - Render power grid transmission lines as glowing SVG/canvas polylines (green = energized, red pulse = tripped).
  - Interactive popup modals for substations, hospitals, and road choke points.
  - *DoD:* Map re-renders fluidly at 60fps when simulation sliders adjust or corridors switch.

- [ ] **Task 4.3: Simulation Control Panel (`ControlPanel.jsx`)**
  - Three primary sliders: Ocean Storm Surge (0–4m), River Runoff Inflow (100–1200 m³/s), Hours to Landfall (1–24h).
  - Preset scenario buttons:
    1. *Monsoon Baseline* (Normal rain, 0m surge).
    2. *Compound Cyclone Landfall* (2.2m surge + 650 m³/s inflow -> Vyttila trips, Lakeshore DG activates).
    3. *Catastrophic 2018 Deluge* (3.0m surge + 1000 m³/s inflow -> multi-substation collapse).
  - *DoD:* Changing sliders debounces and triggers instantaneous backend re-calculation.

- [ ] **Task 4.4: Dark Grid Matrix & Fuel Burn Gauges (`DarkGridMatrix.jsx`)**
  - List of substations with live breaker status badges (ENERGIZED / ANSI-21-TRIPPED).
  - Hospital emergency cards: VPS Lakeshore and Aster Medcity.
  - Real-time animated generator diesel fuel gauge with hours-of-runtime remaining.
  - *DoD:* Clear visual distinction between "Flooded Asset" and "Dry Asset Outaged by Grid Cascade".

- [ ] **Task 4.5: Logistics Countdown Clocks (`LogisticsCountdown.jsx`)**
  - Side-by-side comparison cards: Liquid Oxygen Tanker vs Diesel Fuel Convoy.
  - Dynamic Time-to-Submersion (TTS) clocks.
  - Kundannoor Bridge status banner (OPEN / CLOSING / IMPASSABLE).
  - *DoD:* Countdown color shifts from green to flashing red as departure window closes.

- [ ] **Task 4.6: Gemini Vision & Parametric Oracle Modals**
  - Modal 1: 3-Band false-color GIS viewer with Gemini 3.7 Flash internal thought stream terminal and detected bounding boxes.
  - Modal 2: Parametric Oracle smart-contract liquidity certificate with verification hash.
  - *DoD:* Interactive one-click inspection modals with slick glassmorphism styling.

- [ ] **Task 4.7: Live Swarm Terminal Feed (`SwarmMissionFeed.jsx`)**
  - Console-style auto-scrolling terminal showing inter-agent priority dialogue over WebSockets.
  - Priority color tags: [CRITICAL: RED], [HIGH: AMBER], [INFO: CYAN].
  - *DoD:* Visual proof of multi-agent autonomy operating in real time.

---

### Track 5: Pitch Strategy, Demo Scenarios & Rehearsal
> **Objective:** Structure a pitch that hooks the judges, proves technical depth, and prevents live demo disasters.

- [ ] **Task 5.1: The 3-Minute Hackathon Pitch Script**
  - *Minute 0:00 – 0:45 (The Hook & Flaw):* "Current flood maps only model sea surge. In the 2018 deluge, 80% of urban collapse was compound backwater damming, and substations don't get wet—they arc-flash at 0.4m, plunging dry hospitals into darkness."
  - *Minute 0:45 – 1:45 (The Live Demo):* Slide surge to 2.2m and rain to 650 m³/s. Point to Vyttila tripping, Lakeshore Hospital losing mains power while dry, and fuel clock ticking down.
  - *Minute 1:45 – 2:30 (The AI Breakthrough):* Open Gemini 3.7 Flash multimodal inspector; show composite SAR/DEM tile reasoning. Show the Parametric Oracle trigger $5M emergency liquidity release.
  - *Minute 2:30 – 3:00 (Pan-India Scale & Commercial Buyer):* "We validated our physics on Kochi's 2018 ground truth, but this is a Pan-India engine. With 1-click on our corridor selector, it deploys to the Adyar delta in Chennai, the Mithi in Mumbai, and the Mahanadi in Odisha. Targeted at NDMA, State Disaster Authorities, and GRID-INDIA to protect India's entire 7,516 km coastline." Council rating: 9.16/10.
  - *DoD:* Pitch rehearsed under 2 minutes 50 seconds.

- [ ] **Task 5.2: In-App Pitch Guide Teleprompter (`PitchGuideModal.jsx`)**
  - Built-in popup modal with step-by-step cue cards for the presenter.
  - One-click buttons that automatically set the exact sliders for each pitch phase.
  - *DoD:* Presenter can click "Next Slide" to auto-pilot the digital twin during judging.

- [ ] **Task 5.3: Offline & Video Backup Lockdown**
  - Record a flawless 2-minute 1080p screen capture video of the complete live demo.
  - Ensure `./run.sh` operates 100% offline without internet access.
  - *DoD:* USB drive ready with video backup; system verified working with Wi-Fi disabled.

---

## 🎯 Verification & Acceptance Checklist

Before presenting to judges:
1. [ ] Run `python3 -m pytest backend/tests -v` — all 6 tests must pass.
2. [ ] Verify frontend production build runs cleanly via `npm run build`.
3. [ ] Test the "Dry Hospital Cascade": Confirm VPS Lakeshore shows 0.0m flood depth, but generator is running and fuel is counting down.
4. [ ] Test the "Logistics Differential": Confirm LMO tanker window closes before Diesel tanker window (due to 0.20m vs 0.45m clearance).
5. [ ] Disconnect Wi-Fi and verify the demo continues running smoothly using the synthetic fallback engine.
