# System Architecture (`ARCHITECTURE.md`)

**Echoes of Rasuwa: Global Waltz** combines a real **NASA CMR / NISAR Level-2 Data & Analysis Spine** with a **Multi-Audience Interactive Experience** (Guided Story, Analyst Workbench, SAR 101 Science Rosetta, and 5-Region Pixel Field Expedition + 2D/3D Observatory).

---

## 1. High-Level Module Map

```text
├── public/
│   ├── nisar-reference/          # Unchanged NASA Earth Observatory Hubbard Glacier GSLC browse pair + SHA-256 provenance.json
│   ├── nisar-catalog/            # Real dated NASA CMR granule snapshots (rasuwa_nepal, hubbard_glacier, pantanal, san_joaquin, hatay, yukon)
│   └── nisar-products/           # Validated ingested product manifests & 16-bit quantized rasters produced by pipeline/ingest_nisar.py
├── pipeline/                     # Offline Python >= 3.11 HDF5 ingestion CLI for GCOV, GUNW, GOFF
│   ├── ingest_nisar.py           # Subcommands: search, fetch, process-gcov, process-gunw, process-goff, snapshot-catalog, manifest
│   ├── requirements.txt          # asf_search, h5py, numpy, scipy, pyproj, rasterio, Pillow
│   ├── README.md                 # 10-minute Earthdata Login quickstart
│   ├── notebooks/                # SAR Python tutorial notebook inspired by CSA & ASF NISAR docs
│   └── tests/                    # Offline synthetic HDF5 generator & unit tests (test_pipeline.py)
├── scripts/
│   └── check-claims.mjs          # Automated claim & integrity linter run during npm test
├── src/
│   ├── components/
│   │   ├── DataPassport.tsx      # Mandatory provenance badge + modal enforcing classification, maturity (PROVISIONAL/BETA), units, masks, SHA-256
│   │   ├── AnalystWorkbench.tsx  # Map-first NISAR catalog browser, Event Pair Finder, log-ratio change detector, InSAR transect & exporter
│   │   ├── StoryScrollyModal.tsx # 8-beat Nepal-to-Global scrollytelling experience + Web Audio time-series sonification
│   │   ├── SciencePrimerModal.tsx# SAR 101 interactive physics demos, Polarization Explorer, Sensor Rosetta & Hypothesis Engine UI
│   │   ├── ResourcesDrawer.tsx   # Grouped official Space Apps "Dancing with the SARs" resources & how we used each
│   │   ├── ExpeditionLaunchScreen.tsx # 3-Door Launch (Story / Analyst Workbench / Field Expedition) + radar-echo Waltz motif
│   │   ├── JudgeBriefing.tsx     # Deterministic 6-step guided evidence trail
│   │   ├── LabSupercomputerScreen.tsx # Diegetic 2D/3D observatory
│   │   ├── TerrainMap3D.tsx      # Three.js 3D terrain mesh (lazy-loaded)
│   │   └── ...                   # FieldExpeditionViewport, PixelWorldGlobeScreen, ImpactInterventionModal, IncidentPhotoModal
│   ├── data/
│   │   └── nisarProducts.ts      # Runtime validator for ProductManifest, 16-bit raster Float32Array loader & fallback ladder
│   ├── services/
│   │   ├── nisarCatalogService.ts# Live NASA CMR granule & collection search, NISAR filename parser (JPL D-102255), Event Pair Finder
│   │   └── nasaEarthDataService.ts # NASA POWER climatology, EONET v3 open events, GIBS WMTS verified layers
│   ├── science/
│   │   ├── hypotheses.ts         # Rule-based Hypothesis Engine (8 surface-change types, signatures, confounders, falsification criteria)
│   │   └── sensorRosetta.ts      # Multi-agency SAR comparison (NISAR L/S, Sentinel-1, RCM, RADARSAT-1, SAOCOM, ALOS-2, UAVSAR)
│   ├── utils/
│   │   └── changeDetection.ts    # Pure log-ratio / dB change detection, stable-ROI threshold calibration, connected-components & Marching Squares contours
│   └── i18n/
│       └── translations.ts       # English + flagged machine-assisted draft Nepali (ne) and Spanish (es) UI strings
└── tests/                        # Node test runner suites (integrity, math, CMR parser, manifest validator, change detection, claims linter)
```

---

## 2. Non-Negotiable Data Classification & Fallback Ladder

Every visual layer, chart, and numeric readout requires a `DataPassport` with one of:
1. `REAL_NISAR_PRODUCT` — Only when a validated `ProductManifest` exists with granule ID, collection short name, CRID, timestamps, units, nodata/mask rules, and input/output SHA-256 hashes.
2. `NASA_PUBLISHED_BROWSE` — Unchanged NASA-published browse imagery (e.g., Hubbard Glacier 2025-11-26 & 2025-12-08 GSLC browse pair, or public ASF Earthdata Cloud browse PNGs).
3. `CATALOG_METADATA_LIVE` / `CATALOG_SNAPSHOT` — Real NASA CMR granule metadata (footprints, acquisition times, track/frame/mode, browse links) fetched live or loaded from a dated snapshot.
4. `MODEL_OUTPUT` — NASA POWER MERRA-2/GEOS climatological model output.
5. `REPORTED_ESTIMATE` — NASA EONET v3 curated event reports or attributed literature/government SitRep figures.
6. `SIMULATION` / `ILLUSTRATION` / `TEST_FIXTURE` — Procedural scenarios, schematic DEMs, fictional NPCs, and synthetic unit-test fixtures.
