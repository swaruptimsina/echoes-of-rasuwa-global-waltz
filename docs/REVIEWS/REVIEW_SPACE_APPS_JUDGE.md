# Adversarial Persona Review 2: 2026 NASA Space Apps Judge ("Dancing with the SARs")

## Reviewer Profile
- **Domain:** 2026 NASA Space Apps Challenge judging criteria (**Impact**, **Creativity**, **Validity**, **Relevance**, **Presentation**).

## Audit Findings & Verification
1. **Preservation of the 6-Step Judge Briefing & Five-Tier Provenance Standard:**
   - Verified in `src/components/JudgeBriefing.tsx` and `tests/judge-path.test.mjs`: all 6 steps (`Problem`, `Observation`, `Evidence`, `Interpretation`, `Possible action`, `Limitations`) work with zero audio or keyboard shortcuts required.
   - Five-Tier Provenance (`observation`, `reported`, `model output`, `simulation`, `illustration`) plus compile-time `DataPassport` badges are surfaced across every map layer, chart, and photo.
2. **Storyline & Pasang Tamang Flag House Opening:**
   - Verified in `src/game/worldMapData.ts` and `src/game/regionalMapsBuilder.ts`: the player spawns at Syabrubesi Dobhan (1,460 m) outside the traditional Tamang Flag House (`🇳🇵`) with Pasang Tamang's bilingual Nepali/English greeting and the 5-Stage Guided Trail through Syabrubesi, Chilime, Timure, Miteri Bridge, and the DHM Geomatics Kendra.
3. **Official NASA, ESA, CSA & CONAE Challenge Resources:**
   - Verified in `src/services/sarAcquisitionService.ts`, `src/services/nisarCatalogService.ts`, `src/components/LabSupercomputerScreen.tsx` (Tab F4 sub-tabs), and `src/components/ResourcesDrawer.tsx`:
     - Case 1 Hubbard Glacier NISAR GSLC benchmark (`provenance.json`, SHA-256 `43da...` and `e83f...`).
     - Case 2 Rasuwa Sentinel-1 SAR browse (`rasuwa-provenance.json`, SHA-256 `4e62...` and `351c...`).
     - Live NASA CMR & ASF Data Search Vertex catalog (AOI: 27.8–28.4°N, 85.1–85.6°E).
     - Live NASA POWER climatology (`PRECTOTCORR`, `GWETTOP`, `GWETROOT`, `T2M`), NASA EONET v3, and NASA GIBS WMTS true-color tiles.
     - Complementary NASA Fleet cards (**SWOT**, **GPM IMERG**, **GRACE-FO**, **ICESat-2**) and international SAR partners (**CONAE SAOCOM 1A/1B**, **CSA RCM & RADARSAT-1**).
4. **3/4 Orbital Waltz Motif:**
   - Verified in `src/components/StoryScrollyModal.tsx` and `src/components/AnalystWorkbench.tsx`: 12-day repeat-pass timeline and mute-by-default 3/4 waltz time-series sonification with synchronized accessible text transcript table.

## Status
- **PASS (All 5 Space Apps Judging Criteria Addressed & Documented)**
