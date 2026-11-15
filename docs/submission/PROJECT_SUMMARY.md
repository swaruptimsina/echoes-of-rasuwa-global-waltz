# NASA Space Apps 2026 Project Summary: Echoes of Rasuwa — Global Waltz

- **Challenge:** [Dancing with the SARs](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/)
- **Project Title:** Echoes of Rasuwa: Global Waltz — Character-Led SAR Storytelling, Empirical 26 Aug 2026 Rasuwa Datum, Analyst Workbench & 5-Biome Field Expedition
- **Live Application & Repository:** Open-source MIT web application (React 18 + TypeScript + Vite 6 + Three.js + `geotiff.js`) paired with an Express opt-in neural voice server (`server.ts`) and reproducible Python HDF5 ingest pipeline (`pipeline/ingest_nisar.py`).

---

## High-Level Summary (Zumorroda-X Style — Ready for Space Apps Header)

Welcome to **Echoes of Rasuwa: Global Waltz**! For the 2026 NASA Space Apps *"Dancing with the SARs"* challenge, we built an interactive journey that unites human-centered mountain storytelling with real multi-sensor satellite radar science.

Meet **Lali Maya** in Syabrubesi, Nepal (`1,460 m`). When monsoon clouds blind optical satellites over the Rasuwa–Bhote Koshi–Trishuli corridor during the August 26, 2026 (`02:52:10 UTC`) rock–ice avalanche and debris flood, active Synthetic Aperture Radar (SAR) from **NASA–ISRO NISAR** (24 cm L-band & 9.4 cm S-band), **ESA Sentinel-1D**, **NASA OPERA RTC-S1**, **CSA RCM / RADARSAT-1**, **CONAE SAOCOM**, and **JAXA ALOS-2** pierces storm clouds and night.

Our platform guides learners and researchers seamlessly through:
1. **Lali's 9-Chapter Story Adventure & 14 Proof Stories (`RasuwaStoryAdventure.tsx`):** Travel up the Rasuwa gorge—from Syabrubesi (`1,460 m`) to Chilime Hydro (`1,640 m`), Timure Customs (`1,760 m`), Rasuwagadhi 1855 Fort & Miteri Bridge (`1,814 m`), and Upper Langtang (`5,366 m+`)—and onward to San Joaquin, Pantanal, Hatay, and Alaska–Yukon with playable missions and a bilingual community alert preview.
2. **Door 1 · 8-Beat Scrollytelling & 3/4 Waltz Sonification (`StoryScrollyModal.tsx`):** Turns 12-day repeat radar passes into a live Web Audio 3/4 waltz (*"Hear the Surface Change"*) paired with a full accessible text transcript.
3. **Door 2 · Multi-Temporal SAR Analyst Workbench & 26 Aug 2026 Rasuwa Datum Explorer (`AnalystWorkbench.tsx`, `RasuwaDatumExplorer.tsx`):** Queries real NASA CMR granules (**6,803 exact-AOI / 12,931 bbox** in the Rasuwa audit; **2,667 NISAR granules** across 6 AOIs in the explorer snapshot), inspects schema-validated `P05023` NISAR GCOV GeoTIFF subsets (`REAL_NISAR_PRODUCT`), computes log-ratio dB change with Stable-ROI noise calibration ($T = |\mu_{\text{ROI}}| + k\sigma_{\text{ROI}}$), MMU speckle filtering, Marching Squares contours, and relative LOS InSAR transects—while honestly reporting where L-band GUNW phase fails (`9/528` pixels) alongside Sentinel-1D (`158/307`), OPERA (`1.1871 km²`), and GPM IMERG (`0.0 ± 0.24 mm/hr`).
4. **Door 3 · 5-Biome 2D/3D Field Expedition, Science Lab & 6-Step Judge Trail (`TerrainMap3D.tsx`, `JudgeBriefing.tsx`):** Connects orbital radar to local confounders and community preparedness without false operational-warning claims.

---

## What Problem Does It Solve?
Satellite radar tools frequently fall into two extremes: oversimplified color maps that overclaim disaster prediction, or raw 400 MB–4 GB HDF5 archives locked behind specialist scripts. **Echoes of Rasuwa: Global Waltz** bridges both worlds under strict scientific guardrails:
- **Zero Provenance Ambiguity (`DataPassport`):** Every layer, raster, photo, and chart carries an explicit `DataPassport` distinguishing `REAL_NISAR_PRODUCT` (validated `P05023` GCOV manifest), `NASA_PUBLISHED_BROWSE` (Hubbard Glacier `2025-11-26` vs. `2025-12-08`), `CATALOG_METADATA_LIVE` / `CATALOG_SNAPSHOT`, `MODEL_OUTPUT`, `REPORTED_ESTIMATE`, `ILLUSTRATION` (including explicit unverified-origin flags on bundled local incident photos), `SIMULATION`, and `TEST_FIXTURE`.
- **Empirical Honesty About Failure Modes:** Our bundled 26 Aug 2026 Rasuwa datum proves both what works (Sentinel-1D coherence drop inside UNOSAT's `2.53 km²` polygon vs. `4.06%` control false alarms; OPERA 3-view `1.1871 km²` consensus) and what fails (NISAR L-band GUNW retaining only `9/528` connected pixels at the steep source, raw GOFF outliers, `48.15%` terrain observability, and `+3.25d` to `+46.38d` CMR archive latencies).
- **Accessible & Fully Verified (`npm run verify`):** Includes optional, mute-by-default neural voice narration (`msedge-tts` / optional Gemini TTS), `EN` / draft `नेपाली` / draft `Español` UI, color-blind-safe palettes, **59 Node unit tests across 14 files**, **2 Python HDF5 pipeline tests**, and our automated claim-integrity linter (`scripts/check-claims.mjs`).
