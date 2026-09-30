# Chronos Coastal

Chronos Coastal is a prototype workspace for exploring compound coastal flooding scenarios. It combines a simplified water model with power grid, hospital, and supply route simulations across four sample corridors: Kochi, Chennai, Mumbai, and Odisha.

The interface shows how surge, river inflow, and optional rainfall runoff affect modeled assets, substations, hospital power, and route departure windows. It can load Open-Meteo forecasts and, when configured, Earth Engine observations. Users can prepare an evidence-linked advisory and send it to an in-app test inbox. A configured webhook can receive reviewed advisories.

**Scope:** This is a demonstration model. Its sample corridor data, generated imagery, and evaluation fixtures are not independently verified operational data. Outputs must not be used to direct emergency response or authorize payments.

## Run locally

Requirements: Python 3.12+ (verified on 3.14), Node.js 18+, npm, and network access for the first dependency install.

    bash run.sh

The launcher creates backend/.env from the example if needed, installs missing Python dependencies in an isolated environment, builds the current frontend, and serves the app at http://localhost:8000. It creates an isolated virtual environment in executable temporary storage and builds the frontend there, supporting noexec workspace mounts. Set CHRONOS_VENV_DIR to choose persistent storage. After the initial install/build, CHRONOS_SKIP_BUILD=1 bash run.sh starts offline without package downloads.

For live model inspection and advisory drafting, set GEMINI_API_KEY in backend/.env or the process environment. Set GEMINI_MODEL to a model available to your account. If no key is set or the request fails, the app labels the offline inspection or rule-based draft. To load satellite observations, install backend/requirements-earth-engine.txt, configure GEE_PROJECT_ID and authenticate Earth Engine on the server.

For separate development servers:

    python3 -m venv /tmp/chronos-dev-venv
    /tmp/chronos-dev-venv/bin/python -m pip install -r backend/requirements-lock.txt
    PYTHONPATH=backend /tmp/chronos-dev-venv/bin/python -m uvicorn app.main:app --reload

    cd frontend
    npm ci
    npm run dev

The Vite server runs on http://localhost:5173 and proxies API and WebSocket requests to port 8000.

## Workspace

- **Scenario setup:** choose a corridor, use a preset or adjust surge, river inflow, rainfall, and landfall horizon, then run the simulation.
- **Map:** inspect modeled assets and, when configured, separately labeled satellite observations.
- **Power and care:** view tripped substations, hospital grid status, generator runtime, and ICU exposure.
- **Supply routes:** see whether modeled clearance is open, closing, or blocked. “No breach in horizon” means the simulated water depth stays below the route limit through landfall.
- **Advisories:** generate a reviewable draft, export a brief, and test delivery in-app. External dispatch requires a configured webhook.
- **Site inspection:** include a model inspection in an advisory. Results identify whether the image came from Earth Engine or a synthetic fixture.
- **Model checks and simulated voucher:** available through the API. No funds are transferred.

## Architecture

The FastAPI app in backend/app/main.py coordinates the hydro, grid, logistics, vision, oracle, and incident plan modules under backend/app/. The React and Leaflet workspace lives in frontend/src/. The launcher builds the frontend into frontend/dist, which FastAPI serves.

Key endpoints:

| Endpoint | Purpose |
| --- | --- |
| POST /api/simulate | Run one corridor scenario |
| GET /api/corridors | List sample corridors |
| POST /api/gemini/inspect | Inspect a generated composite tile |
| GET /api/tile/preview | Preview a composite tile |
| POST /api/oracle/verify | Generate a simulated voucher |
| POST /api/operations/simulate | Run a scenario for the operations dashboard |
| GET /api/operations/weather/{corridor} | Load a labeled weather forecast |
| GET /api/operations/earth/{corridor} | Load optional satellite observations |
| POST /api/operations/advisories | Prepare a draft from a scenario snapshot |
| POST /api/operations/dispatch | Deliver a draft to the test inbox or configured webhook |
| GET /api/evals/results | Get the latest diagnostic result |
| POST /api/evals/run | Rerun diagnostic checks |
| GET /api/evals/finetune-dataset | Preview generated example records |
| WS /ws/tactical-feed | Stream agent events |

## Verification

    PYTHONPATH=backend /tmp/chronos-dev-venv/bin/python -m pytest backend/tests -q
    cd frontend && npm run build

The evaluation suite calculates hydrology errors against reference gauge values, checks grid and route behavior, and measures overlap with synthetic vision fixtures. It does not establish field accuracy or a valid composite model score. The generated training examples are synthetic examples, not a production fine-tuning dataset.

## Current limitations

The corridor topology and hydrologic parameters are sample data in code. The map tile is generated from those inputs rather than raw satellite or DEM imagery. The parametric SAR delta is modeled from the simulated flooded fraction. Independent data provenance, calibration, image annotations, and field validation would be needed for operational claims.

See [TASKS.md](TASKS.md) for the original hackathon planning notes.

Reused components and data providers are cited in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). [BRICS_APPLICABILITY.md](BRICS_APPLICABILITY.md) explains how to replace local corridor data, calibrate assumptions, and extend languages for additional BRICS contexts. The current sample corridors remain in India; additional-country deployments are not claimed. Hackathon eligibility depends on the organizers' dates and the team's development history; repository timestamps alone do not establish it.

## Public prototype and deployment

The public demo is published at [Chronos Coastal](https://chronos-coastal.jeevangeorge2030i.chatgpt.site). Its browser dashboard uses the hosted adapter in `worker/`, with D1 storage scoped to each browser session. The adapter implements the same screening hydrology, power cascade, and logistics equations as Python. `scripts/check_engine_parity.py` compares complete outputs for 100 deterministic scenarios across all four corridors.

The hosted demo supports scenario controls, infrastructure inspection, forecast context, advisory drafting, brief export, and test inbox receipts. Live Google Gemini 3.5 Flash Lite advisory generation and evidence export were verified on the public prototype. Its credential is held as a server secret. Every draft records whether Gemini succeeded or the explicitly labeled rule-based fallback was used. External dispatch, Earth Engine authentication, diagnostic APIs and WebSocket events run in the Python backend. Provider status is explicit in the interface.

To build the hosted package:

    npm --prefix frontend ci
    npm run build
    npm run test:hosted
    python scripts/check_engine_parity.py

`dist/client`, `dist/server/index.js`, and `dist/.openai/hosting.json` form the deployable package. Keep the D1 binding named `DB`. Configure an optional Gemini key as a server secret; never put credentials in frontend code.

For the complete Python server, `docker compose up --build` serves port 8000 and persists records in a named volume. The image build, dashboard, health endpoint, and simulation were verified in GitHub Actions.

Scenario snapshots, immutable advisory drafts, and delivery receipts persist in SQLite under CHRONOS_DATA_DIR (defaults to temporary storage). Set that directory to a persistent volume for long-term use. Each record category retains at most 1,000 records locally and 100 records per browser session on the hosted demo.

## Submission materials

The `submission/` directory contains the PDF deck, narration, and a manifest with artifact sizes and verification status. The MP4 demo and complete source archive are attached to the [submission release](https://github.com/j33v4nz/ggl/releases/tag/v1.1.0-google-ai). The presentation can also be downloaded from the prototype’s About dialog. The deck must remain below the submission form's 5 MB limit. Public video sharing is complete only once its YouTube or Google Drive link is verified without authentication.

To regenerate media after installing `scripts/requirements-media.txt` and providing FFmpeg, Chromium and Noto Sans fonts:

    python scripts/verify_browser.py
    python scripts/create_deck.py
    python scripts/create_demo.py narrate
    python scripts/create_demo.py record
    python scripts/create_demo.py render

To verify the Google AI integration after configuring the hosted server secret:

    python scripts/verify_google_ai.py

This check requires a successful live Gemini advisory, a visible model label, and an exported brief marked `gemini_live`; fallback output does not pass it.

The video records the public prototype. Narration is generated from `submission/demo-narration.md` using a voice service. Provider credentials and private account content are never sent by the media scripts.
