# Third-party components and sources

Chronos Coastal's repository license is [MIT](LICENSE). The following reused components retain their own licenses. Package versions are recorded in `frontend/package-lock.json`, `backend/requirements-lock.txt`, and the optional requirements files; upstream notices shipped with those packages remain applicable.

| Component | Use | License / primary source |
| --- | --- | --- |
| React and React DOM | Browser interface | MIT — [React](https://github.com/facebook/react) |
| Leaflet | Interactive map | BSD-2-Clause — [Leaflet](https://github.com/Leaflet/Leaflet) |
| Lucide React | Interface icons | ISC — [Lucide](https://github.com/lucide-icons/lucide) |
| Vite and its React plugin | Browser build | MIT — [Vite](https://github.com/vitejs/vite), [React plugin](https://github.com/vitejs/vite-plugin-react) |
| Tailwind CSS, PostCSS, Autoprefixer | Stylesheet tooling | MIT — [Tailwind](https://github.com/tailwindlabs/tailwindcss), [PostCSS](https://github.com/postcss/postcss), [Autoprefixer](https://github.com/postcss/autoprefixer) |
| FastAPI | Python HTTP API | MIT — [FastAPI](https://github.com/fastapi/fastapi) |
| Uvicorn | Python application server | BSD-3-Clause — [Uvicorn](https://github.com/encode/uvicorn) |
| Pydantic | Request and response validation | MIT — [Pydantic](https://github.com/pydantic/pydantic) |
| NetworkX | Infrastructure dependency graph | BSD-3-Clause — [NetworkX](https://github.com/networkx/networkx) |
| NumPy | Numerical calculations | BSD-3-Clause; bundled components have additional notices — [NumPy](https://github.com/numpy/numpy) |
| SciPy | Diagnostic calibration | BSD-3-Clause; bundled numerical libraries have additional notices — [SciPy](https://github.com/scipy/scipy) |
| Pillow | Synthetic image rendering | MIT-CMU — [Pillow](https://github.com/python-pillow/Pillow) |
| HTTPX and python-dotenv | Provider HTTP requests and environment loading | BSD-3-Clause — [HTTPX](https://github.com/encode/httpx), [python-dotenv](https://github.com/theskumar/python-dotenv) |
| websockets | Python event streaming | BSD-3-Clause — [websockets](https://github.com/python-websockets/websockets) |
| pytest | Backend verification | MIT — [pytest](https://github.com/pytest-dev/pytest) |
| Google Gen AI SDK | Python Gemini integration | Apache-2.0 — [Google Gen AI](https://github.com/googleapis/python-genai) |
| Google Earth Engine Python API | Optional satellite integration | Apache-2.0 — [Earth Engine](https://github.com/google/earthengine-api/blob/master/LICENSE) |
| esbuild | Hosted worker packaging | MIT — [esbuild](https://github.com/evanw/esbuild) |
| Playwright | Browser verification and recording | Apache-2.0 — [Playwright](https://github.com/microsoft/playwright) |
| ReportLab | PDF deck generation | BSD — [ReportLab](https://www.reportlab.com/) |
| edge-tts | Demo narration tooling | LGPL-3.0 — [edge-tts](https://github.com/rany2/edge-tts) |

## Map, weather, fonts, and hosted services

- The visible basemap credits [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) and [HOT](https://www.hotosm.org/). OpenStreetMap data is under ODbL; tiles are served by OpenStreetMap France's HOT endpoint. Basemap display does not establish infrastructure or flood-data accuracy.
- Forecast context comes from [Open-Meteo](https://open-meteo.com/en/docs), whose [data license is CC BY 4.0](https://github.com/open-meteo/open-meteo). Forecast retrieval time and provider mode are displayed in the interface.
- Browser typography uses [DM Sans](https://github.com/googlefonts/dm-fonts) and [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope). The PDF uses [Noto Sans](https://github.com/notofonts/latin-greek-cyrillic). These fonts use the SIL Open Font License.
- Hosted advisory generation calls the [Google Gemini API](https://ai.google.dev/gemini-api/docs/api-key). This is an external service, not project-owned model weights. Every draft records its actual engine mode. The provider key is held only in the hosting runtime as a secret.
- Optional Earth Engine observations are governed by the [Earth Engine catalog](https://developers.google.com/earth-engine/datasets) and each selected collection's terms. The public prototype does not currently retrieve satellite observations.
- Chromium and FFmpeg are external tools used to generate the submitted video; their source projects and build-specific licenses are available at [Chromium](https://www.chromium.org/) and [FFmpeg](https://ffmpeg.org/legal.html). They are not included in the repository source archive.

Infrastructure, gauge references, and imagery fixtures in this repository are demonstration inputs with no independent field provenance supplied. They must not be described as validated government, hospital, satellite, or emergency-response measurements. The deck includes actual screenshots of the public prototype; narration is generated using the declared voice tooling.
