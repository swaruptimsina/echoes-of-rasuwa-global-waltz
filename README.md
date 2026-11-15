# Echoes of Rasuwa: Global Waltz // NISAR Multi-Temporal SAR Story, Forensic Datum & Analyst Workbench

**2026 NASA Space Apps Challenge Submission — Challenge: ["Dancing with the SARs"](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/)**

**Echoes of Rasuwa: Global Waltz** combines an interactive character-led pixel-art story (**Lali's 9-Chapter Rasuwa Adventure** across real Himalayan valley landmarks from **Syabrubesi 1,460 m** to **Upper Langtang–Lhende 5,366 m+**), an **Empirical 26 Aug 2026 Multi-Sensor Rasuwa Datum Explorer**, an **8-Beat Scrollytelling Sonata** (3/4 waltz data sonification), a **Multi-Temporal SAR Analyst Workbench**, a **3D WebGL Terrain Observatory**, and a **5-Biome Global Expedition**. It connects **NASA–ISRO NISAR** L-band ($\lambda = 24\text{ cm}$) and S-band ($\lambda = 9.4\text{ cm}$) observations—alongside **CSA RADARSAT Constellation Mission (RCM)**, **RADARSAT-1**, **CONAE SAOCOM**, **ESA Sentinel-1D & OPERA RTC-S1**, **JAXA ALOS-2**, **GPM IMERG**, and **NASA UAVSAR**—to real-world surface change, uncertainty quantification, and community preparedness discussions.

---

## 1. Core Interactive Modules

Upon launching the application (`http://localhost:3000`), users can explore **Lali's Rasuwa Story Adventure**, launch the **60-Second Guided Judge Evidence Trail**, or enter any of the analytical and educational portals:

1. **Lali's 9-Chapter Rasuwa Story & Place-Grounded Missions (`src/components/RasuwaStoryAdventure.tsx`, `src/components/RasuwaPlayableMissions.tsx`)**
   - Unskippable, story-driven pixel expedition through five empirical Rasuwa corridor waypoints (**Syabrubesi 1,460 m**, **Chilime Hydro 1,640 m**, **Timure Customs 1,760 m**, **Rasuwagadhi 1855 Fort & Miteri Bridge 1,814 m**, **Upper Langtang–Lhende 5,366 m+**), plus 9 playable mini-missions, a **14-Case Proof Story Archive**, and mute-by-default human-like neural Voice narration (`en-US-AnaNeural` via `msedge-tts` or optional Gemini TTS in `server.ts`).
2. **26 Aug 2026 Rasuwa Multi-Sensor Datum Explorer (`src/components/RasuwaDatumExplorer.tsx`, `public/rasuwa-datum/handoff/`)**
   - Real bundled GeoTIFF, GeoJSON, WebP, and JSON audit across the **`4,774.048 km²` HydroBASINS system** and **`6,803` exact NASA CMR granules**: NISAR L-band GUNW (`9/528` = `1.70%` connected unwrapped phase in the chaotic upper detachment vs `420/420` control—teaching honest L-band GUNW limits), schema-validated NISAR L-band GCOV `P05023` subset (`public/nisar-products/rasuwa_nepal/manifest.json`), Sentinel-1D HyP3 (`158/307` = `51.5%` inside UNOSAT `2.53 km²` vs `4.06%` control), OPERA RTC-S1 (`1.1871 km²` 3-view consensus / `48.15%` 2-view observability), GPM IMERG (`0.0 ± 0.24 mm/hr` at the `02:52:10 UTC` collapse instant), and real archive CMR latencies (`+3.25d` to `+46.38d`).
3. **Door 1 · 8-Beat Scrollytelling Story & Sonata (`src/components/StoryScrollyModal.tsx`)**
   - Guided 8-act narrative in 3/4 orbital waltz cadence linking monsoon-clouded **Rasuwa–Bhotekoshi–Trishuli Gorge (Nepal)** to the **Hubbard Glacier Mw 7.0 Earthquake (Alaska–Yukon)** with mute-by-default Web Audio time-series sonification and accessible transcripts.
4. **Door 2 · Multi-Temporal SAR Analyst Workbench (`src/components/AnalystWorkbench.tsx`)**
   - Live NASA CMR catalog (`provider=ASF`) + offline snapshot (`public/nisar-catalog/cmr-snapshot-2026-11-13.json`) across 6 global AOIs, JPL D-102255 18-/20-token granule ID parser (`parseNisarGranuleId`) & Event Pair Finder, calibrated log-ratio dB change detection with Marching Squares contours (`src/utils/changeDetection.ts`), relative LOS transect profiler, Swipe/Flicker/Opacity/Side-by-Side modes, color-blind-safe palettes, GeoJSON/CSV/PNG exports, and rule-based Hypothesis Engine / Sensor Rosetta.
5. **Door 3 · 60-Second Judge Trail, 3D Valley Lab & 5-Biome Expedition (`src/components/JudgeBriefing.tsx`, `src/components/LabSupercomputerScreen.tsx`, `src/components/FieldExpeditionViewport.tsx`)**
   - Direct comparison of the real NASA Earth Observatory NISAR Hubbard Glacier pair (`2025-11-26` vs `2025-12-08`) paired with WebGL Three.js 3D terrain lighting and 5 global biome stations (Nepal, Brazil, USA, Türkiye, Alaska).

---

## 2. Scientific Integrity & The 9-Tier `DataPassport` Taxonomy

Every map layer, raster, and chart in the application renders `<DataPassport />` (`src/components/DataPassport.tsx`) enforcing a strict 9-classification provenance taxonomy:

| Classification Code | Definition & Enforcement |
|---|---|
| `REAL_NISAR_PRODUCT` | Reserved **exclusively** for layers backed by a schema-validated `manifest.json` produced by `pipeline/ingest_nisar.py` from a real NISAR HDF5 granule (`public/nisar-products/rasuwa_nepal/manifest.json` validated via `validateProductManifest`). |
| `NASA_PUBLISHED_BROWSE` | Official NASA Earth Observatory published NISAR reference imagery (`public/nisar-reference/hubbard-2025-11-26.jpg` and `hubbard-2025-12-08.jpg`). |
| `CATALOG_METADATA_LIVE` | Live NASA CMR granule metadata (`provider=ASF`), NASA EONET events, NASA POWER climatology, or GIBS WMTS overlays queried at runtime. |
| `CATALOG_SNAPSHOT` | Committed offline NASA CMR metadata snapshot (`public/nisar-catalog/cmr-snapshot-2026-11-13.json`) and bundled Rasuwa multi-sensor GeoTIFF/JSON archives. |
| `MODEL_OUTPUT` | Client-side deterministic raster, stable-ROI threshold (`T = |μ| + kσ`), MMU, or multi-sensor scientific computation outputs. |
| `REPORTED_ESTIMATE` | Published hazard or socioeconomic context metrics explicitly attributed to external source citations. |
| `ILLUSTRATION` | Character art, 2D canvas environments, and bundled field photos explicitly flagged when source EXIF/location metadata is unverified. |
| `SIMULATION` | Physics-informed pedagogical radar/InSAR simulation layers in the 2D/3D Observatory and Hypothesis Engine. |
| `TEST_FIXTURE` | Deterministic co-registered dB & GUNW LOS rasters enabling browser-side numeric calibration without claiming live satellite ingestion. |

---

## 3. Quickstart & Verification Commands

### Web Application, Voice Server & Test Suite
```bash
cp .env.example .env.local   # Optional: add GEMINI_API_KEY; Edge Neural TTS works out-of-the-box without a key
npm install
npm run dev                  # Starts Express + Vite server on http://localhost:3000 (/api/tts & /api/health)
npm run verify               # Runs TypeScript typecheck + 59 Node unit tests (14 files) + Claim-Integrity Linter + Vite build
NODE_ENV=production npm start  # Serves built dist/ + /api/health + /api/tts in hardened production mode
```

### Python NISAR HDF5 Ingest Pipeline (`pipeline/ingest_nisar.py`)
```bash
# Run pipeline unit tests (no credentials or external HDF5 required)
python -m unittest discover -s pipeline/tests -p "test_*.py" -v

# Generate a schema-validated synthetic fixture bundle
python pipeline/ingest_nisar.py --synthetic-fixture --aoi rasuwa_nepal --product GCOV --out pipeline/output_demo
```

---

## 4. Repository Documentation & Submission Index

- **Space Apps Submission Kit (`docs/submission/`):**
  - [`SUBMISSION_COPY_READY.md`](docs/submission/SUBMISSION_COPY_READY.md) · [`COMPETITIVE_COMPARISON_2026.md`](docs/submission/COMPETITIVE_COMPARISON_2026.md)
  - [`PROJECT_SUMMARY.md`](docs/submission/PROJECT_SUMMARY.md) · [`HOW_WE_USED_NISAR.md`](docs/submission/HOW_WE_USED_NISAR.md) · [`SCIENCE_METHODS.md`](docs/submission/SCIENCE_METHODS.md) · [`LIMITATIONS_AND_NEXT_STEPS.md`](docs/submission/LIMITATIONS_AND_NEXT_STEPS.md) · [`FUTURE_NISAR_APPLICATIONS.md`](docs/submission/FUTURE_NISAR_APPLICATIONS.md) · [`ETHICS_AND_COMMUNITY.md`](docs/submission/ETHICS_AND_COMMUNITY.md)
  - [`DEMO_SCRIPT_30S.md`](docs/submission/DEMO_SCRIPT_30S.md) · [`VIDEO_STORYBOARD.md`](docs/submission/VIDEO_STORYBOARD.md) · [`SLIDES_OUTLINE.md`](docs/submission/SLIDES_OUTLINE.md) · [`slides.md`](docs/submission/slides.md) · [`SCREENSHOT_SHOTLIST.md`](docs/submission/SCREENSHOT_SHOTLIST.md) · [`JUDGES_QA.md`](docs/submission/JUDGES_QA.md) · [`CHECKLIST.md`](docs/submission/CHECKLIST.md) · [`JUDGING_MAP.md`](docs/submission/JUDGING_MAP.md)
- **Science, Resources & Educator Guides:**
  - [`docs/RESOURCE_MAP.md`](docs/RESOURCE_MAP.md) · [`docs/SAOCOM_REQUEST_GUIDE.md`](docs/SAOCOM_REQUEST_GUIDE.md) · [`docs/educator/LESSON_PLAN_45MIN.md`](docs/educator/LESSON_PLAN_45MIN.md) · [`pipeline/notebooks/sar_change_tutorial.ipynb`](pipeline/notebooks/sar_change_tutorial.ipynb)
- **Research Data Pack & Deployment Config:**
  - [`research/rasuwa_sar_impact_datum.zip`](research/rasuwa_sar_impact_datum.zip) ([`research/README.md`](research/README.md)) · [`netlify.toml`](netlify.toml)
- **Governance, Provenance & Reviews:**
  - [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/AI_DISCLOSURE.md`](docs/AI_DISCLOSURE.md) · [`docs/DECISIONS.md`](docs/DECISIONS.md) · [`docs/WORK_LOG.md`](docs/WORK_LOG.md) · [`docs/HUMAN_TODO.md`](docs/HUMAN_TODO.md) · [`docs/REVIEWS/`](docs/REVIEWS/)