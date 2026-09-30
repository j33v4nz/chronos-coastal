# Adapting Chronos Coastal across BRICS

The prototype is built in an Indian coastal context, with four sample corridors. Its transferable workflow is compound coastal-flood screening → power dependencies → hospital continuity → cargo-specific access windows → a Google Gemini draft for local review. Deployment outside India has not been validated.

For coastal or estuarine pilots in Brazil, China, Russia, South Africa, or other BRICS members, preserve the shared simulation and evidence contracts while replacing the local inputs. Local partners must determine whether the simplified surge/backwater assumptions suit the proposed geography.

1. Define licensed local infrastructure and dependency data in `backend/app/dataset.py`: coordinates, elevations, substations, hospital backup reserves, supply routes, cargo clearances, and travel allowances. Record source licenses, collection dates, and uncertainty.
2. Calibrate hydraulic parameters using local gauges and terrain. Keep units explicit: metres, cubic metres per second, millimetres, minutes, and hours. Scenario estimates must remain separate from official warnings and observations.
3. Regenerate `worker/corridors.json` from the Python `CORRIDORS` mapping. Extend corridor selection in `frontend/src/CoastalDashboard.jsx` and map centres in `frontend/src/components/CoastalMap.jsx`; these currently list the four Indian examples explicitly.
4. Extend the accepted draft languages in both `worker/index.mjs` and `backend/app/operations.py`, then validate translated recommendations with local reviewers. The current interface offers English, Tamil, and Hindi; Portuguese, Russian, Mandarin, and other languages are adaptation work, not already verified features.
5. Configure locally available weather and satellite providers, a server-side Google AI credential, and the appropriate response-team workflow. The public prototype's test inbox is separate from an operational dispatch integration.
6. Run `scripts/check_engine_parity.py`, backend and hosted API checks, browser verification, and independent local scenario validation before using a new corridor.

The current design demonstrates software reuse across local datasets. Field accuracy, regional provider availability, operational authority approval, and deployments in additional BRICS nations remain work for local pilots.
