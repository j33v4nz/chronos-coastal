# Chronos Coastal

Chronos Coastal is a prototype workspace for exploring compound coastal flooding scenarios. It combines a simplified water model with power grid, hospital, and supply route simulations across four sample corridors: Kochi, Chennai, Mumbai, and Odisha.

The interface shows how a change in surge or river inflow can affect modeled assets, substations, hospital power, and route departure windows. It also includes a generated map tile, an optional Gemini 2.5 Flash inspection path, a deterministic offline inspection fallback, and a simulated parametric voucher.

**Scope:** This is a demonstration model. Its sample corridor data, generated imagery, and evaluation fixtures are not independently verified operational data. Outputs must not be used to direct emergency response or authorize payments.

## Run locally

Requirements: Python 3.10+, Node.js 18+, npm, and network access for the first dependency install.

    bash run.sh

The launcher creates backend/.env if needed, installs Python dependencies in a temporary virtual environment, builds the frontend in executable temporary storage, and serves the app at http://localhost:8000. The build step copies only static files back into frontend/dist. This supports workspaces mounted without executable permissions.

For live model inspection, set GEMINI_API_KEY in backend/.env or the process environment. If no key is set or the request fails, the app uses a labeled synthetic fallback. The live request uses gemini-2.5-flash.

For separate development servers:

    python3 -m venv /tmp/chronos-dev-venv
    /tmp/chronos-dev-venv/bin/python -m pip install -r backend/requirements.txt
    PYTHONPATH=backend /tmp/chronos-dev-venv/bin/python -m uvicorn app.main:app --reload

    cd frontend
    npm ci
    npm run dev

The Vite server runs on http://localhost:5173 and proxies API and WebSocket requests to port 8000. On a filesystem mounted with noexec or without symlink support, copy the frontend directory to /tmp before installing and running Vite.

## Workspace

- **Scenario setup:** choose a corridor, use a preset or adjust surge, river inflow, and landfall horizon, then run the simulation.
- **Map:** inspect modeled flood depth and power links; select an asset for its details.
- **Power and care:** view tripped substations, hospital grid status, generator runtime, and ICU exposure.
- **Supply routes:** see whether modeled clearance is open, closing, or blocked. “No breach in horizon” means the simulated water depth stays below the route limit through landfall.
- **Activity:** read the live agent event feed.
- **Site inspection:** view a generated composite tile, hazard boxes, and actions. Results show whether the model path was live or synthetic.
- **Scenario voucher:** inspect a simulated payout threshold and voucher record. No funds are transferred.
- **Model checks:** run diagnostic checks using reference scenarios and synthetic fixtures.

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
