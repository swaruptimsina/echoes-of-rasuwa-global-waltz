# 2026 NASA Space Apps Challenge — Copy-Paste-Ready Project Submission Form (`SUBMISSION_COPY_READY.md`)

> **Before Submitting on `spaceappschallenge.org` (Deadline: Sunday, November 15 at 11:59 p.m. local time):**
> - Replace all bracketed placeholders (`[YOUR TEAM NAME]`, `[TEAM MEMBER NAMES & ROLES]`, `[PUBLIC DEMO URL]`, `[PUBLIC REPO URL]`, `[LIVE APP URL]`) before pasting.
> - Confirm all team members are confirmed participants at the **same Local Event** (or Universal Event), check both **Terms and Conditions** and **Confirm All Work is Original**, and verify **zero likenesses (images, video, or audio) of persons under 18 years old** appear anywhere in the demo or app.
> - **2026 Demo Compliance Gate:** Your **Link to Project Demo** MUST be **either** a publicly accessible video **≤ 30 seconds** (e.g., `docs/submission/Echoes_of_Rasuwa_Demo_30s.mp4`) **or** a publicly accessible English slide deck **≤ 7 slides** (e.g., exported from `docs/submission/slides.md`). Exceeding 30 seconds or 7 slides disqualifies the project from Global Judging.
> - **Recommended Web Filter Check:** If hosting a new web domain for **Link to Final Project**, submit the **FortiGuard Web Filter Classification form** (`https://www.fortiguard.com/faq/wfratingsubmit`, Category: *Education* or *Web-based Application*, Company Name: `N/A`) so judges are not blocked by institutional firewalls.

---

## Field 1: Project Name
```text
Echoes of Rasuwa: Global Waltz
```

---

## Field 2: High-Level Project Summary
*(Copy-paste directly into the Space Apps "High-Level Project Summary" box — ~185 words)*

```text
Welcome to Echoes of Rasuwa: Global Waltz—an open-source platform for the 2026 "Dancing with the SARs" challenge that turns multi-temporal orbital radar into human-centered storytelling, quantitative analysis, and honest science.

Meet Lali Maya in Syabrubesi, Nepal (1,460 m). When thick monsoon clouds blind optical satellites over the Rasuwa–Bhote Koshi corridor during the August 26, 2026 rock–ice avalanche and debris flood, active Synthetic Aperture Radar (SAR) from NASA–ISRO NISAR, ESA Sentinel-1D, and NASA OPERA pierces storm clouds and night. Yet radar images alone are easily misread. So we built a unified experience combining: (1) Lali's 9-chapter interactive story & 14 Proof Stories alongside an 8-beat 3/4 waltz data sonification; (2) a quantitative SAR Analyst Workbench + Rasuwa Multi-Sensor Datum Explorer querying 6,803 exact-AOI CMR granules across a 4,774.048 km² catchment; and (3) a 5-biome pixel-art Field Expedition & 3D Terrain Lab.

Every layer enforces a mandatory DataPassport—even proving empirically where NISAR L-band interferometric phase fails (only 9/528 connected pixels at the steep source) while companion Sentinel-1D, OPERA RTC-S1, and GPM IMERG fill the picture without false warning claims.
```

---

## Field 3: Link to Project Demo
*(Paste ONE publicly accessible URL—no login, password, or request-access wall!)*

- **Option A (Recommended — ≤ 30s Video):** `[PUBLIC YOUTUBE / GOOGLE DRIVE LINK TO docs/submission/Echoes_of_Rasuwa_Demo_30s.mp4 — STRICTLY <= 30 SECONDS, English captions + SI neural audio credit]`
- **Option B (Alternative — ≤ 7-Slide English Deck):** `[PUBLIC GOOGLE DRIVE / GITHUB PAGES PDF LINK TO docs/submission/slides.md EXPORT — STRICTLY <= 7 SLIDES]`

---

## Field 4: Link to Final Project
*(Paste publicly accessible URLs requiring zero login/registration)*

- **Primary Live Web App:** `[DEPLOYED PUBLIC WEB URL — e.g. https://echoes-of-rasuwa.onrender.com or Vercel/Fly.io URL]`
- **Public Source Code Repository (MIT):** `https://github.com/swaruptimsina/echoes-of-rasuwa-global-waltz`

---

## Field 5: Detailed Project Description
*(Copy-paste directly into the Space Apps "Detailed Project Description" box)*

```markdown
### The Inspiration
On August 26, 2026 (`02:52:10 UTC` / `08:37 NST`), a major rock–ice avalanche and debris flood struck Nepal's transboundary Rasuwa–Bhote Koshi–Trishuli corridor. During South Asia's monsoon season, dense convective clouds frequently blind passive optical satellites (MODIS, Landsat, Sentinel-2) right when mountain valleys need clarity.

Synthetic Aperture Radar (SAR)—led by **NASA–ISRO NISAR** (24 cm L-band and 9.4 cm S-band)—sees right through clouds and darkness. Yet public SAR tools suffer from two opposite failures: either oversimplified "scary red heatmaps" that claim impossible disaster prediction, or multi-gigabyte HDF5 archives trapped behind command-line barriers. Inspired by the real communities along Rasuwa's gorge and the global rhythm of NISAR's 12-day repeat orbit ("Dancing with the SARs"), we asked: *Can one open-source web platform welcome a student or local educator with a compelling story while giving a radar scientist full quantitative precision—and complete honesty about what radar cannot measure?*

---

### What It Does — Character-Led Places, Research & Three Doors
**Echoes of Rasuwa: Global Waltz** opens as an accessible story-driven expedition led by **Lali Maya** from her Flag House in Syabrubesi and seamlessly connects to three complementary doors:

1. **Lali's 9-Chapter Interactive Story Adventure & 14 Proof Stories (`RasuwaStoryAdventure` & `RasuwaPlayableMissions`):**
   - **Act 1 (Rasuwa Corridor, Chapters 1–5):** Players travel station-by-station up the Bhote Koshi–Lhende gorge alongside local teaching guides—inspecting antecedent monsoon saturation at **Syabrubesi Confluence (1,460 m)**, closing steel intake gates during concealed sub-canopy slope creep at **Chilime 111 MW Hydro Intake (1,640 m)**, running a warning drill during temporary river damming at **Timure Customs & Dry Port (1,760 m)**, sweeping cloud-piercing radar over the historic **1855 Rasuwagadhi Fort & Miteri Bridge (1,814 m)**, and examining hanging permafrost headwalls up to **Upper Langtang–Purugu Crown (5,366 m+)** before visiting the **3D Himalayan Science Lab** to learn why satellite radar is regional screening, not an automated siren.
   - **Act 2 (Global World Missions, Chapters 6–9) & 14 Proof Stories:** Lali's journey expands worldwide across four companion biomes—**San Joaquin Valley, USA** (groundwater pumping & aquifer subsidence), **Pantanal & Southern Amazon, Brazil** (24 cm L-band sub-canopy flooding & deforestation), **Hatay Fault Corridor, Türkiye** (post-earthquake bridge & dam triage), and **Yukon–Kuskokwim / Hubbard Glacier, Alaska** (active-layer permafrost thaw, coastal oil slicks, and the real **2025-11-26 → 2025-12-08 NASA NISAR Hubbard Glacier Mw 7.0 earthquake pair**).

2. **Door 1 · 8-Beat Scrollytelling Narrative & 3/4 Waltz Data Sonification (`StoryScrollyModal`):**
   - Structures orbital repeat-pass physics like a 3/4 waltz (*Measure 1: Reference Pass → Measure 2: Secondary Pass → Measure 3: Differential Change*).
   - Includes a live Web Audio **6-Pass Time-Series Sonification** (*"Hear the Surface Change"*), mapping HH dB intensity to pitch, HV volume scattering to harmony, and interferometric coherence loss to dissonance—paired with a full accessible text transcript and per-beat `DataPassport` tags.

3. **Door 2 · Multi-Temporal SAR Analyst Workbench & Rasuwa Multi-Sensor Datum Explorer (`AnalystWorkbench` & `RasuwaDatumExplorer`):**
   - Queries **live NASA CMR** (`cmr.earthdata.nasa.gov/search/granules.json?provider=ASF`, backed by a verified offline snapshot of **2,667 NISAR granules** across 6 AOIs: Rasuwa 316, Hubbard Glacier 624, San Joaquin 713, Hatay 397, Yukon–Kuskokwim 376, Pantanal 241), parses 18-token (`GCOV`, `GSLC`, `SME2`) and 20-token (`GUNW`, `GOFF`) JPL D-102255 granule IDs, matches same-track/same-frame pre/post pairs, and generates `asf_search` Python snippets and Earthdata/Vertex deep links.
   - Performs client-side **log-ratio dB differencing** ($10\log_{10}(I_{\text{after}}/I_{\text{before}})$), **Stable-ROI noise calibration** ($T_{\text{dB}} = |\mu_{\text{ROI}}| + k\sigma_{\text{ROI}}$), **4-neighbor Minimum Mapping Unit (MMU)** speckle filtering, **Marching Squares vector contouring**, area $\pm$ uncertainty estimation ($\text{km}^2 \pm \delta A$), **InSAR relative Line-of-Sight (LOS) transect profiling** relative to a user-chosen Reference Pixel $R$ with coherence masking ($\gamma < 0.35$), **GeoJSON / CSV / stamped PNG exports**, and **GeoTIFF binary raster inspection** via `geotiff.js`.
   - Embeds our **26 Aug 2026 Rasuwa Multi-Sensor Research Explorer**, rendering 5 real bundled GeoTIFF rasters (NISAR GCOV event/quiet, NISAR GUNW failure subset, OPERA RTC-S1 Path 085, Copernicus GLO-30 DEM), 4 interactive GeoJSON boundaries, L-band vs. C-band coherence plates, GPM IMERG rainfall charts, and CMR archive latency clocks.

4. **Door 3 · 5-Biome 2D/3D Field Expedition, Science Lab & 6-Step Judge Trail (`FieldExpeditionViewport`, `TerrainMap3D`, `SciencePrimerModal`, `JudgeBriefing`):**
   - Offers a **60-second Guided Evidence Trail (`JudgeBriefing`)** comparing the real NASA Hubbard Glacier NISAR browse pair, a **Three.js 3D Terrain Observatory** with collision-aware station badges, **5 interactive SAR 101 physics labs** (speckle ENL, layover $\alpha \ge \theta_i$, dielectric moisture/freeze–thaw, surface roughness vs. $\lambda$, and phase wrapping), an **8-Mission Sensor Rosetta** (NASA–ISRO NISAR L & S, ESA Sentinel-1, CSA RCM, CSA RADARSAT-1, CONAE SAOCOM, JAXA ALOS-2, NASA UAVSAR), and an **8-Phenomenon Hypothesis Engine** enforcing falsification criteria and confounders.

---

### Our Empirical 26 Aug 2026 Rasuwa Multi-Sensor Research Findings
Rather than forcing NISAR to look perfect where mountain geometry breaks it, we audited real multi-sensor satellite and catalog data over the Rasuwa–Bhote Koshi system (**`4,774.048 km²`** HydroBASINS catchment, **`272`** glacial lakes, **`6,803` exact-AOI / `12,931` bounding-box CMR granules**) around `2026-08-26T02:52:10Z`:

- **NISAR L-Band GUNW (`P05023`, Track 98, `2026-08-19 → 2026-08-31`) — Honest Diagnosed Failure:** At the steep upper source, median L-band coherence dropped from **`0.2188`** (quiet pair `2026-07-14 → 2026-07-26`) to **`0.1021`**, while the spatial control stayed stable (`0.8616 → 0.8464`). Connected unwrapped phase survived in only **`9 of 528` pixels (`1.70%`)** versus **`420/420` (`100%`)** in control (and Track 48 yielded zero pixels passing both subswath validity checks). Raw `GOFF` layer-1 offsets were outlier-dominated (`0.2206` median correlation). **Therefore, we explicitly refuse to publish a NISAR displacement number at the source.**
- **NISAR L-Band GCOV (`P05023`, Track 98 Frame 16, `168 × 198 × 7` GeoTIFF, `EPSG:32645`):** Authenticated range-read HDF5 subset (`/science/LSAR/GCOV/grids/frequencyA/HHHH`, schema-validated as `REAL_NISAR_PRODUCT`) showed HH $\gamma^0$ change widening to p05/p95 **`-6.69 / +5.77 dB`** at the event source versus **`-3.19 / +3.14 dB`** in the exploratory control—reported strictly as exploratory calibrated backscatter change.
- **Sentinel-1D C-Band VV HyP3 Burst InSAR (`2026-08-16 → 2026-08-28` vs. quiet `2026-08-04 → 2026-08-16`):** Paired median coherence shifted `-0.1313` (`0.5129 → 0.3950`) inside the independently mapped preliminary **UNOSAT** detachment polygon (**`2.53 km²`**) while the `0.3–1.5 km` local control ring gained `+0.1841`. Control-calibrated 5th-percentile thresholding (`-0.1262`) with a 4-pixel MMU (`0.0256 km²`) flagged **`158/307` (`51.5%`)** target pixels versus **`1,225/30,161` (`4.06%`)** control false alarms.
- **NASA OPERA L2 RTC-S1 (`30 m`) & Copernicus GLO-30 DEM:** Three-view VV/VH backscatter consensus flagged **`1.1871 km²`** (`0.1080 km²` in the quiet null run), with **`48.15%`** 2-view radar observability over steep Himalayan relief (`>70°` masked).
- **GPM IMERG (`V07C` Early/Late) & NASA POWER:** At the collapse half-hour (`02:30–02:59Z`), native IMERG precipitation was **`0.0 ± 0.24 mm/hr`**, refuting an instantaneous local storm cloudburst trigger while earlier monsoon days (e.g., `2026-08-21` POWER `15.64 mm/d`, `2026-08-22` `12.10 mm/d`) document antecedent wetting.
- **CMR Archive Latency Clocks:** Sentinel-1D SLC arrived **`+2.40d`** post-event (`+3.25d` CMR insertion); NISAR L2 Track 48 arrived **`+2.42d`** (`+4.03d` to `+4.14d` CMR); OPERA RTC-S1 arrived **`+2.40d`** (`+46.38d` CMR); OPERA DSWx-S1 arrived **`+16.89d`** (`+47.23d` CMR)—proving why retrospective archive availability is not operational warning time.

---

### Real Himalayan Corridor & Global Place Evidences
Every layer across the app enforces a strict **`DataPassport`** badge separating real observations from pedagogy:
- **`REAL_NISAR_PRODUCT`:** Range-read `P05023` Rasuwa GCOV subset (`public/nisar-products/rasuwa_nepal/manifest.json`) verified with SHA-256 checksums, plus local HDF5 ingestion via `pipeline/ingest_nisar.py`.
- **`NASA_PUBLISHED_BROWSE`:** Unchanged NASA Earth Observatory NISAR L-band browse pair over **Hubbard Glacier, Alaska** (`2025-11-26` vs. `2025-12-08`, SHA-256 verified) plus Copernicus GLO-30 DEM reference.
- **`CATALOG_METADATA_LIVE` / `CATALOG_SNAPSHOT`:** Real NASA CMR footprints and browse quicklooks across Rasuwa (`1,460–5,366 m+`), Hubbard Glacier, Pantanal, San Joaquin, Hatay, and Yukon–Kuskokwim.
- **`MODEL_OUTPUT` & `REPORTED_ESTIMATE`:** NASA OPERA RTC-S1 consensus, NASA POWER climatology, GPM IMERG, NASA EONET pins, UNOSAT preliminary detachment polygon, ICIMOD/NDRRMA situation reports, and Silwal & Dahal (`Zenodo 22730419`) screening synthesis.
- **`ILLUSTRATION` & `SIMULATION` (Honest Photo & Scene Caveat):** Our 12 bundled corridor photo cards (`public/incident_photos/` showing Syabrubesi, Chilime, Timure, Rasuwagadhi Fort, Miteri Bridge, Langtang, and global comparison scenes) are explicitly labeled **`ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED`** until external origin/reuse permissions are confirmed, and our 2D/3D village maps & interactive radar labs are clearly tagged as educational simulations rather than surveyed field truth.

---

### How We Built It — Technical Architecture
- **Frontend Web Platform:** React 18, TypeScript, Vite 6, Tailwind CSS, Three.js (`TerrainMap3D` PBR observatory), `geotiff.js` (client-side binary GeoTIFF decoder), Web Audio API (3/4 waltz sonification), custom HTML5 Canvas 2D pixel-art engine, Marching Squares vector contouring, and deterministic change-detection math (`src/utils/changeDetection.ts`).
- **Node/Express Server & Opt-In Accessibility Audio (`server.ts`):** Serves production static bundles and `/api/tts` using zero-key `msedge-tts` neural voices (plus optional developer-configured `GEMINI_API_KEY` TTS reading pre-authored scripts) with mute-by-default accessibility and browser Web Speech fallback.
- **Offline Python Science Pipeline (`pipeline/ingest_nisar.py` & `pipeline/notebooks/sar_change_tutorial.ipynb`):** Reads real Earthdata NISAR L2 `GCOV`/`GUNW` HDF5 arrays (`/science/LSAR/...`), converts linear $\gamma^0$ to dB, emits 16-bit quantized rasters + SHA-256 verified `manifest.json` files, and includes synthetic HDF5 tests (`pipeline/tests/test_pipeline.py`).
- **Automated Verification & Integrity Guardrails (`npm run verify`):** Runs strict TypeScript checks, **59 Node unit tests across 14 test files**, Python HDF5 pipeline tests, Vite production build, and **`scripts/check-claims.mjs`** (an automated scientific claim-integrity linter scanning `src/` and `docs/submission/` for zero unsupported casualty, financial, operational-warning, or physics overclaims).

---

### Challenges & Honest Scientific Limits We Ran Into
1. **Steep Himalayan Layover & Phase Decorrelation:** On 5,000 m+ Himalayan relief, NISAR L-band GUNW lost connected phase (`9/528` pixels) and raw GOFF offsets spiked; OPERA RTC-S1 observed only `48.15%` of steep reference terrain across two views. Rather than hiding that failure, we turned it into a core scientific lesson.
2. **Multi-Gigabyte Authenticated HDF5s vs. Zero-Login Browser Access:** Full NISAR granules span 400 MB–4 GB behind Earthdata `.netrc`. We solved this via pre-extracted range-read `P05023` GeoTIFF subsets + a strict `DataPassport` fallback ladder (`REAL_NISAR_PRODUCT` → `NASA_PUBLISHED_BROWSE` → `CATALOG_METADATA` → `TEST_FIXTURE`/`SIMULATION`) + reproducible Python CLI ingest.
3. **Provisional Maturity & Archive Latency:** Early NISAR collections carry `PROVISIONAL` (`P05012`/`P05023`) and `BETA` (`X05010`) CRIDs, and CMR catalog latency varied from `+3.25d` (Sentinel-1D) to `+46.38d` (OPERA RTC-S1). We built CRID disclaimers and latency clocks directly into the UI.
4. **Catalog Gaps Across Partner Missions:** ALOS-2 ScanSAR, NISAR S-band (`Bhoonidhi`), CSA RCM, and CONAE SAOCOM returned zero post-event CMR/ASF granules in our snapshot; we explicitly distinguish catalog/access gaps from zero acquisitions.

---

### Accomplishments We're Proud Of
- **Zero-Compromise Scientific Honesty:** Passing `scripts/check-claims.mjs` (0 violations), `59/59` Node unit tests, and `2/2` Python pipeline tests while diagnosing real `9/528` L-band phase failure alongside `158/307` (`51.5%`) Sentinel-1D screening and `0.0 mm/hr` GPM IMERG refutation.
- **True Bridge Between Joyful Story & Quantitative Tool:** A middle-school student can walk with Lali Maya from Syabrubesi (`1,460 m`) to Miteri Bridge (`1,814 m`), hear a 3/4 radar waltz, and seamlessly click into calibrated Stable-ROI dB thresholding, GeoTIFF inspection, and Marching Squares GeoJSON export.
- **Full Multi-Agency Synergy & Educator Readiness:** Integrates all 13 official NASA, CSA, and CONAE challenge resources plus a 45-Minute NGSS Lesson Plan, color-blind-safe palettes (`Viridis`, `Cividis`, `Diverging Blue–Orange`), and `EN` / draft `नेपाली` / draft `Español` accessibility.

---

### What We Learned
- **Observable ≠ Interpretation ≠ Prediction:** Coherence loss (`γ < 0.15`) or backscatter widening (`-6.69/+5.77 dB`) detects surface change—not debris thickness, flood depth, or collapse timing. Even `4.06%` (`1,225/30,161`) false-alarm rates in stable terrain show why regional SAR screening must pair with rain gauges, optical checks, and local engineers.
- **Multi-Sensor Choreography ("Global Waltz"):** No single radar frequency solves every biome—24 cm L-band unlocks tropical canopies and gradual slope creep, 5.6 cm C-band (Sentinel-1D / CSA RCM) captures rapid coherence changes and high-latitude 4-day monitoring, 9.4 cm S-band (ISRO) bridges crops and snow, and GPM IMERG + GLO-30 DEM test meteorological and topographic confounders.

---

### What's Next
- **Cloud-Native Earthdata S3 Byte-Range Streaming:** Add lightweight `VirtualiZarr` / `kerchunk` HTTPS range streaming so authenticated analysts slice live `/science/LSAR/GCOV/...` windows on the fly without downloading 4 GB HDF5s.
- **Dual-Geometry Vector Inversion:** Combine Ascending (Track 98 / 155) and Descending (Track 48 / 032) `GUNW`/`GOFF` orbits to separate vertical ($d_U$) from east–west ($d_E$) displacement where coherence holds.
- **Community & Educator Co-Review:** Partner with native Nepali, Tamang, and Spanish geoscience educators to validate our draft translations (`src/i18n/translations.ts`) and verify or replace local `ILLUSTRATION` incident photographs with consented, dated field archives.
```

---

## Field 6: Use of Super Intelligence (SI)
*(Copy-paste directly into the Space Apps "Use of Super Intelligence (SI)" box — matches `docs/AI_DISCLOSURE.md`)*

```text
We used Super Intelligence (SI) tools responsibly as an engineering, accessibility, and documentation assistant while keeping all scientific math, data pipelines, and provenance gates 100% deterministic and human-verified:

1. Code Architecture, Debugging & Literature Cross-Check (SI Coding Assistant): Assisted human developers in refactoring React/TypeScript UI components, Three.js terrain rendering, the offline Python HDF5 ingest pipeline, unit tests (59 Node + 2 Python tests), and auditing copy against primary sources (NASA Earth Observatory, ASF NISAR guides, NDRRMA, ICIMOD, UNOSAT, HydroBASINS) alongside our automated claim-integrity linter (`scripts/check-claims.mjs`).
2. Audio Accessibility & Demo Video Narration (SI-Synthesized Voice): The web app's optional, mute-by-default narrative voice uses neural text-to-speech (`msedge-tts` / `en-US-AnaNeural`, with optional server-side Gemini TTS reading pre-authored fixed scripts—never LLM-generated science). Voiceover audio in our 30-second demo video uses SI neural TTS (`en-US-AvaNeural`), explicitly credited as SI-synthesized audio in video metadata and on-screen captioning, with zero likeness to persons under 18.
3. Draft Localization (i18n): Machine-assisted draft UI translations in Nepali (`ne`) and Spanish (`es`), explicitly labeled in the interface as requiring native-speaker review.

What SI Did NOT Do: Zero generative LLM calls run inside our Hypothesis Engine, Sensor Rosetta, DataPassport validator, or SAR change-detection math. Zero SI image generation was used to invent satellite imagery or create/modify any NASA logos, flags, or mission identifiers. All illustrative pixel art and unverified incident photos are explicitly labeled as simulations/illustrations.
```

---

## Field 7: NASA Data
*(Copy-paste directly into the Space Apps "NASA Data" box)*

```text
1. NASA–ISRO NISAR Level-2 & Level-3 Archive via NASA Common Metadata Repository (CMR) & Alaska Satellite Facility (ASF) DAAC:
   - Live CMR Granule API (`https://cmr.earthdata.nasa.gov/search/granules.json?provider=ASF`) & ASF Data Search Vertex (`https://search.asf.alaska.edu/#/?dataset=NISAR`), querying `NISAR_L2_GCOV_PROVISIONAL_V1`, `NISAR_L2_GUNW_PROVISIONAL_V1`, `NISAR_L2_GOFF_PROVISIONAL_V1`, `NISAR_L2_GSLC_PROVISIONAL_V1`, `NISAR_L3_SME2_PROVISIONAL_V1`, `NISAR_UR_L2`, and `BETA` collections across 6 global AOIs (2,667 NISAR browser snapshot granules; 6,803 exact-AOI / 12,931 bounding-box multi-sensor CMR records in the Rasuwa audit).
   - Authenticated range-read HDF5 L2 GCOV (`P05023`, Track 98 Frame 16 Ascending, 2026-08-19 -> 2026-08-31 & quiet null 2026-07-14 -> 2026-07-26) and L2 GUNW/GOFF (`P05023`) subsets over Rasuwa–Langtang (`https://nisar.asf.earthdatacloud.nasa.gov/`).
   - NASA Earthdata Search (`https://search.earthdata.nasa.gov/search?q=NISAR`) & NISAR Data User Guide / JPL D-102255 (`https://nisar.jpl.nasa.gov/data/products/`).
2. NASA Earth Observatory Published NISAR L-Band Browse Pair (Hubbard Glacier Mw 7.0 Earthquake, 2025-11-26 & 2025-12-08):
   - `https://science.nasa.gov/earth/earth-observatory/landslide-and-avalanche-debris-litter-hubbard-glacier/` (Eric Fielding & Gustavo H. X. Shiroma, JPL NISAR Algorithm Development Team; prepared by Lauren Dauphin; SHA-256 verified).
3. NASA OPERA (Observational Products for End-Users from Remote Sensing Analysis):
   - `OPERA L2 RTC-S1` (`OPERA_L2_RTC-S1_T085-180590-IW2`, 30 m VV/VH backscatter consensus GeoTIFF & `OPERA_L3_DSWx-S1` catalog latency audit; `https://hyp3-docs.asf.alaska.edu/guides/opera_rtc_product_guide`).
4. NASA GPM IMERG V07C Precipitation (`GPM_3IMERGHHE.07` & `GPM_3IMERGHHL.07`):
   - Half-hourly (`2026-08-26 02:30–02:59Z`) and daily precipitation context (`https://data.gesdisc.earthdata.nasa.gov/`).
5. NASA POWER Climatology & Daily Meteorology/Soil Wetness API (`https://power.larc.nasa.gov/` — MERRA-2 `PRECTOTCORR`, `T2M`, `RH2M`, `GWETTOP`, `GWETROOT`, `SFMC`).
6. NASA GIBS WMTS (`https://worldview.earthdata.nasa.gov/` — VIIRS/MODIS true-color cloud context, Blue Marble Shaded Relief, GPM IMERG overlay).
7. NASA EONET v3 Natural Events API (`https://eonet.gsfc.nasa.gov/docs/v3`).
8. NASA JPL UAVSAR Polarimetric Postcards (`https://uavsar.jpl.nasa.gov/`), NISAR Science StoryMaps (`https://nisar.jpl.nasa.gov/science/overview/`), NISAR Applications White Papers (`https://nisar.jpl.nasa.gov/science/applications/`), and NASA ARSET English & Spanish SAR Trainings (`https://appliedsciences.nasa.gov/what-we-do/capacity-building/arset`).
```

---

## Field 8: Space Agency Partner Data and Other References
*(Copy-paste directly into the Space Apps "Space Agency Partner Data and Other References" box)*

```text
Space Agency Partner Data & Portals:
1. ISRO (Indian Space Research Organisation): NISAR S-Band SAR (9.4 cm / 3.2 GHz) mission parameters and Bhoonidhi portal catalog reference (`https://bhoonidhi.nrsc.gov.in/`) integrated in our Sensor Rosetta and CMR latency audit.
2. ESA / European Commission Copernicus Sentinel-1D & Copernicus GLO-30 DEM: Sentinel-1D VV HyP3 Burst InSAR coherence time-series (`S1D_IW_SLC`, `2026-08-04 -> 2026-08-16` quiet & `2026-08-16 -> 2026-08-28` event pairs; `https://search.asf.alaska.edu/#/?dataset=SENTINEL-1`) and Copernicus GLO-30 30 m Digital Surface Model (`Copernicus_DSM_COG_10_N28_00_E085_00_DEM`) for slope screening.
3. CSA (Canadian Space Agency):
   - RADARSAT Constellation Mission (RCM) C-band 4-day repeat & compact-pol mission profile (`https://www.asc-csa.gc.ca/eng/satellites/radarsat/`).
   - RADARSAT-1 Open Historical Archive (1995–2013; `https://www.asc-csa.gc.ca/eng/satellites/radarsat1/`).
   - CSA SAR Python & QGIS Processing Tutorial (`https://www.asc-csa.gc.ca/eng/satellites/radarsat/technical-features/sar-tutorial.asp`).
4. CONAE (Argentina): SAOCOM 1A/1B L-band (23.5 cm) quad-pol catalog integration & ONE CLICK registration workflow (`https://catalogos.conae.gov.ar/catalogo/catalogoSat.html`, `docs/SAOCOM_REQUEST_GUIDE.md`).
5. JAXA (Japan Aerospace Exploration Agency): ALOS-2 PALSAR-2 ScanSAR profile and 24-month CMR catalog availability check.

Scientific, Humanitarian & Open-Source References:
- UNOSAT Preliminary Optical Detachment Mapping (`2.53 km²` target validation footprint for the 26 Aug 2026 event).
- HydroBASINS Level-12 Catchment Geometry (`4,774.048 km²` Rasuwa–Bhote Koshi–Trishuli basin) & Glacial Lake Inventory (`272` glacial lakes).
- ICIMOD Knowledge Portal (`https://www.icimod.org/kyirong-rasuwa-flood-2026-nepal-china-border`) & Nepal NDRRMA Situation Report #01 (`2026-09-01`, `https://ndrrma.gov.np/mediafiles/rasuwa/Rasuwa_Flood_SitRep_Temp_ENG_01_01092026.pdf`).
- Scientific Literature Synthesis: Silwal & Dahal (`Zenodo 22730419` regional SAR screening vs. non-failing slope false alarms); Roy et al. (`10.1007/s12524-026-02611-x`); Kutoğlu et al. (`10.3390/rs18213727`).
- Open-Source Libraries (MIT / Apache / BSD): React 18, TypeScript, Vite 6, Tailwind CSS, Three.js, `geotiff.js`, `msedge-tts`, Python `h5py` / `rasterio` / `asf_search`, and custom Marching Squares & Web Audio sonification engines.
```
