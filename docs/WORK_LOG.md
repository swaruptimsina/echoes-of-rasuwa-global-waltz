# Work Log & Pre-Event Baseline vs. Event-Period Disclosure

This document records the strict boundary between the **pre-event baseline** (the imported repository `swaruptimsina/nasa` / `nASA_FINAL.zip`) and **event-period work** performed from 2026-11-13 onward, in accordance with the 2026 NASA Space Apps Challenge Participant FAQs and Team Formation Guide.

> **Important Compliance Note:** Official 2026 NASA Space Apps guidance states that project work should not begin before November 14, 2026 at 9:00 a.m. local time, that any pre-existing code or assets must be disclosed, and that only Local Leads / Global Organizers can determine eligibility. Neither this document nor the application certifies competition eligibility.

---

## 1. Pre-Event Baseline Inventory (Imported Snapshot)

All files present in the initial repository import prior to agent execution:

- **Core App & Entry:**
  - `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`, `README.md`
  - `src/main.tsx`, `src/App.tsx`, `src/types.ts`
  - `src/App.css`, `src/judge.css`, `src/game-theme.css`, `src/observatory.css`
- **Existing Components (`src/components/`):**
  - `ExpeditionLaunchScreen.tsx` — biome panorama and launch entry points
  - `JudgeBriefing.tsx` — 6-step guided evidence trail with Hubbard Glacier NISAR browse comparison (2025-11-26 vs 2025-12-08)
  - `FieldExpeditionViewport.tsx` — 2D pixel-art regional expedition canvas
  - `FieldGroundTruthModal.tsx` — simulated corner-reflector alignment and fictional NPC radio modal
  - `LabSupercomputerScreen.tsx` — diegetic 2D/3D observatory with simulated radar layers and NASA context
  - `TerrainMap3D.tsx` — Three.js 3D terrain mesh and projected station markers
  - `ImpactInterventionModal.tsx` — educational community-action checklist and worksheet exporter
  - `IncidentPhotoModal.tsx` — local asset viewer with provenance/permission caveats
  - `PixelWorldGlobeScreen.tsx` — 5-region global atlas with live NASA POWER and EONET v3 fetches
- **Existing Data, Services & Utilities:**
  - `src/data/globalRegionsAtlas.ts`, `src/data/rasuwaDem.json`, `src/data/rasuwaQuestsAndPhotos.ts`, `src/data/rasuwaStoryData.ts`
  - `src/game/biomePixelArtEngine.ts`, `src/game/regionalMapsBuilder.ts`, `src/game/worldMapData.ts`
  - `src/services/nasaEarthDataService.ts` — NASA POWER climatology, EONET v3 events, GIBS WMTS tile builder
  - `src/utils/mapLabelLayout.ts`, `src/utils/regionalDemGenerator.ts`, `src/utils/simulatedRadarPhysics.ts`, `src/utils/terrainHydrology.ts`
  - `src/audio/retroAudioAndVoice.ts`
- **Existing Assets & Provenance (`public/` & `docs/`):**
  - `public/nisar-reference/hubbard-2025-11-26.jpg`, `public/nisar-reference/hubbard-2025-12-08.jpg`, `public/nisar-reference/provenance.json`
  - `public/incident_photos/*` (21 local image files, flagged as unverified local illustrations)
  - `docs/PRE_EDIT_AUDIT.md`, `docs/NASA_RESOURCE_HANDOFF.md`, `docs/JUDGE_WALKTHROUGH.md`, `docs/SCIENCE_AND_PROVENANCE.md`, `docs/SCIENCE_RESEARCH.md`
  - `docs/claim-changes.json`, `docs/research-ledger.json`, `docs/sources-ledger.json`, `docs/source-evidence/*`, `docs/qa/*`
- **Existing Automated Tests (`tests/`):**
  - `components-integrity.test.mjs`, `data-integrity.test.mjs`, `game-theme.test.mjs`, `judge-path.test.mjs`, `map-label-layout.test.mjs`, `nasa-service.test.mjs`, `observatory-layout.test.mjs`, `simulation-consistency.test.mjs` (42 subtests passing at baseline).

---

## 2. Event-Period Work Log (Timestamped Additions & Upgrades)

### 2026-11-13T16:05Z — Phase 0: Baseline Audit, Architecture & Governance
- Verified baseline `npm run typecheck` and `npm test` (42/42 subtests pass).
- Queried live NASA CMR (`https://cmr.earthdata.nasa.gov/search/collections.json` and `granules.json`) for real `provider=ASF` NISAR collections (`NISAR_L2_GCOV_PROVISIONAL_V1`, `NISAR_L2_GUNW_PROVISIONAL_V1`, `NISAR_L2_GOFF_PROVISIONAL_V1`, `NISAR_L2_GSLC_PROVISIONAL_V1`, `NISAR_UR_L2`, `NISAR_L3_SME2_PROVISIONAL_V1`, plus Beta collections).
- Created `docs/WORK_LOG.md`, `docs/AI_DISCLOSURE.md`, `docs/DECISIONS.md`, `docs/HUMAN_TODO.md`, `docs/ARCHITECTURE.md`, and `docs/AGENT_LEDGER.md`.
- Updated `vite.config.ts` to support port 3000 dev server, configurable `VITE_BASE_PATH`, and vendor chunk splitting.
