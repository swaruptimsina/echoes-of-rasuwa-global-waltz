# 7-Slide Presentation Deck Outline (`SLIDES_OUTLINE.md`)

> **2026 NASA Space Apps Compliance Notice:** Official Space Apps rules limit slide decks to **no more than 7 slides total (including title and intro slides)**, written in **English**, and require **Team Name**, **Team Member Names**, **Selected Challenge**, **Project Visuals**, **User Experience**, and **NASA + Partner Agency Data Citations**. Exceeding 7 slides disqualifies the submission from Global Judging.

---

## Slide 1: Title, Team & Core Mission — "Dancing with the SARs"
- **Required Metadata:** Project Name (`Echoes of Rasuwa: Global Waltz`), Team Name (`[YOUR TEAM NAME]`), Team Members (`[TEAM MEMBER NAMES & ROLES]`), Challenge (`2026 NASA Space Apps Challenge — Dancing with the SARs`).
- **Headline:** Turning Multi-Temporal Orbital Radar into Human Storytelling, Quantitative Analysis & Honest Science.
- **Visual:** `docs/qa/screenshots/r1-launch-desktop.png` (Launch Console & Story Mode entry).
- **Key Point:** Bridges the gap between uncalibrated "pretty radar maps" and inaccessible 4 GB HDF5 archives with a mandatory `DataPassport` on every layer.

## Slide 2: Inspiration & Real-World Problem — Monsoon Optical Blindness in Rasuwa
- **Headline:** Why Syabrubesi (`1,460 m`) to Upper Langtang (`5,366 m+`) Needs Cloud-Piercing Radar.
- **Visual:** Split visual comparing monsoon optical cloud blindness vs. Rasuwa station progression (`Syabrubesi 1,460 m → Chilime 1,640 m → Timure 1,760 m → Miteri Bridge 1,814 m → Upper Langtang 5,366 m+`).
- **Key Point:** During the August 26, 2026 (`02:52:10 UTC`) Rasuwa–Bhote Koshi rock–ice avalanche and debris flood, optical sensors struggled under monsoon clouds—yet SAR alone is frequently misread without uncertainty, false-alarm controls, and local context.

## Slide 3: User Experience — Lali's 9-Chapter Story & 3-Door Architecture
- **Headline:** One Platform, Four Entry Points for Students, Educators, Analysts & Judges.
- **Visual:** `docs/qa/screenshots/r1-story-sonification.png` + `docs/qa/screenshots/observatory-3d.png`.
- **Key Point:**
  - **Lali's Rasuwa Story Adventure:** 9 interactive chapters (5 Rasuwa stops + 4 global biomes), 14 Proof Stories, playable missions, and bilingual community alert preview (with bundled local incident photos transparently tagged `ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED`).
  - **Door 1:** 8-Beat Scrollytelling + Web Audio **3/4 Waltz Sonification** & accessible text transcript.
  - **Door 2:** Multi-Temporal SAR Analyst Workbench & Rasuwa Multi-Sensor Datum Explorer.
  - **Door 3:** 5-Biome 2D/3D Field Expedition, Science Lab & 60-second **6-Step Guided Evidence Trail**.

## Slide 4: Empirical 26 Aug 2026 Rasuwa Multi-Sensor Audit (Honest NISAR Limits + Synergy)
- **Headline:** Real Telemetry Across `4,774.048 km²` HydroBASINS & `6,803` Exact-AOI CMR Granules.
- **Visual:** `public/rasuwa-datum/handoff/lband_coherence_comparison.webp` & `public/rasuwa-datum/handoff/cband_coherence_comparison.webp`.
- **Key Point:**
  - **NISAR L2 GCOV (`P05023`, `REAL_NISAR_PRODUCT`):** Range-read HDF5 HH $\gamma^0$ change widened to `-6.69 / +5.77 dB` vs. `-3.19 / +3.14 dB` control.
  - **NISAR L2 GUNW Honest Failure Audit:** Source coherence dropped `0.2188 → 0.1021`, retaining connected phase in only **`9/528` (`1.70%`)** pixels vs. **`420/420`** control—so no NISAR displacement is claimed.
  - **Companion Sensors Fill the Gap:** **Sentinel-1D** flagged **`158/307` (`51.5%`)** UNOSAT detachment (`2.53 km²`) vs. **`1,225/30,161` (`4.06%`)** false alarms; **OPERA RTC-S1** flagged **`1.1871 km²`** (`48.15%` 2-view terrain observability); **GPM IMERG** measured **`0.0 ± 0.24 mm/hr`** at `02:52:10Z` (refuting a collapse-instant cloudburst); CMR latency ranged `+3.25d` to `+46.38d`.

## Slide 5: Door 2 — Quantitative SAR Analyst Workbench & 6-AOI Global Explorer
- **Headline:** Calibrated Log-Ratio dB Math, Stable-ROI Thresholds & Real Hubbard Glacier Reference.
- **Visual:** `docs/qa/screenshots/r1-workbench-desktop.png` & `docs/qa/screenshots/r1-workbench-hubbard.png`.
- **Key Point:** Queries **2,667 NISAR CMR granules** across 6 AOIs (Rasuwa 316, Hubbard 624, San Joaquin 713, Hatay 397, Yukon 376, Pantanal 241), pairs same-track passes via JPL D-102255 parsing, decodes GeoTIFFs client-side (`geotiff.js`), computes $T_{\text{dB}} = |\mu_{\text{ROI}}| + k\sigma_{\text{ROI}}$, filters speckle via 4-neighbor MMU + Marching Squares, plots relative LOS transects ($\gamma < 0.35$ masked), and compares the real **Hubbard Glacier `2025-11-26 → 2025-12-08`** pair.

## Slide 6: Multi-Agency Science Lab — 8-Mission Rosetta & 8-Phenomenon Hypothesis Engine
- **Headline:** Teaching Why Single-Channel Radar Cannot Prove a Unique Cause.
- **Visual:** `docs/qa/screenshots/r1-science-rosetta.png`.
- **Key Point:** 5 SAR 101 physics labs (speckle ENL, layover, dielectric freeze–thaw, roughness vs. $\lambda$, phase wrapping), Polarization Explorer, **8-Mission Sensor Rosetta** (NASA–ISRO NISAR L/S, ESA Sentinel-1, CSA RCM 4-day & RADARSAT-1 open archive, CONAE SAOCOM L-band quad-pol, JAXA ALOS-2, NASA UAVSAR), and an **8-Phenomenon Hypothesis Engine** enforcing confounders and falsification criteria.

## Slide 7: Open Science, Verification & NASA + Partner Data Citations
- **Headline:** Verified Reproducibility (`59` Node Tests + `2` Python Tests + `0` Claim Violations) & Global Impact.
- **Visual:** Clean architecture summary + `DataPassport` badge strip + verified NASA/Partner logo-free text citations.
- **Key Point:**
  - **Verified Quality:** `npm run verify` passes TypeScript strict check, `59` Node unit tests, `2` Python HDF5 tests (`pipeline/ingest_nisar.py`), Vite build, and `scripts/check-claims.mjs`.
  - **NASA Data:** NISAR (`GCOV`/`GUNW`/`GOFF`/`GSLC`/`SME2`), Hubbard Glacier Earth Observatory pair, OPERA RTC-S1/DSWx, GPM IMERG, GIBS, POWER, EONET, UAVSAR, ARSET.
  - **Partner Data:** ISRO (S-band/Bhoonidhi), ESA Sentinel-1D & Copernicus GLO-30 DEM, CSA RCM & RADARSAT-1, CONAE SAOCOM, JAXA ALOS-2, UNOSAT, ICIMOD, HydroBASINS, NDRRMA.
  - **Accessibility & Ethics:** MIT open source, color-blind palettes, opt-in neural TTS (`msedge-tts`/Gemini), `EN`/draft `NE`/`ES` UI, zero operational prediction claims.
