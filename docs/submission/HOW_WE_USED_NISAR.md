# How We Used NISAR & Partner Space-Agency SAR Data (`HOW_WE_USED_NISAR.md`)

## 1. Real Empirical 26 Aug 2026 Rasuwa Multi-Sensor Audit (`public/rasuwa-datum/` & `public/nisar-products/rasuwa_nepal/`)
We anchored our centerpiece Nepal corridor case around the August 26, 2026 (`02:52:10 UTC`) Rasuwa–Bhote Koshi rock–ice avalanche and debris flood across a **`4,774.048 km²`** HydroBASINS catchment containing **`272`** glacial lakes and **`6,803` exact-AOI (`12,931` bounding-box)** NASA CMR multi-sensor records:

1. **Schema-Validated `REAL_NISAR_PRODUCT` L2 GCOV Subset (`P05023`):**
   - `public/nisar-products/rasuwa_nepal/manifest.json` passes `validateProductManifest()` as `REAL_NISAR_PRODUCT` (`PROVISIONAL`, CRID `P05023`, Track 98, Frame 16 Ascending, wavelength `0.238404 m`).
   - Authenticated HDF5 byte-range subsetting over the Langtang/Rasuwa source (`/science/LSAR/GCOV/grids/frequencyA/HHHH`, `168 × 198 × 7` GeoTIFF in `EPSG:32645`, `2026-08-19` → `2026-08-31` event vs. `2026-07-14` → `2026-07-26` quiet null) is decoded directly in the browser via `geotiff.js` (`src/utils/geotiffInspector.ts` & `src/components/RasuwaDatumExplorer.tsx`).
   - Event-source HH $\gamma^0$ change widened to p05/p95 **`-6.69 / +5.77 dB`** compared to **`-3.19 / +3.14 dB`** in the exploratory control—disclosed strictly as exploratory backscatter change.
2. **Diagnosed Failure Audit of NISAR L2 `GUNW` & `GOFF` (`P05023`):**
   - In the event-spanning NISAR L-band GUNW pair (`2026-08-19` → `2026-08-31`), source median coherence dropped from **`0.2188`** (`2026-07-14` → `2026-07-26` quiet pair) to **`0.1021`**, while the exploratory control stayed stable (`0.8616 → 0.8464`).
   - Connected unwrapped phase survived in only **`9 of 528` (`1.70%`)** source 80 m pixels versus **`420/420` (`100%`)** in control (and Track 48 had `0` passing source pixels). Raw `GOFF` layer-1 offsets yielded median correlation `0.2206` with hundreds-of-meters outliers. Accordingly, we report **no NISAR displacement rate** at the source.
3. **Companion Sentinel-1D, NASA OPERA RTC-S1, GPM IMERG & Copernicus GLO-30:**
   - **Sentinel-1D C-Band VV HyP3 Burst InSAR (`2026-08-16` → `2026-08-28` vs. quiet `2026-08-04` → `2026-08-16`):** Median coherence changed `-0.1313` (`0.5129 → 0.3950`) inside the independent preliminary **UNOSAT** detachment polygon (`2.53 km²`) vs. `+0.1841` in the `0.3–1.5 km` ring; control-calibrated 5th-percentile thresholding (`-0.1262`, 4-pixel MMU = `0.0256 km²`) flagged **`158/307` (`51.5%`)** target pixels vs. **`1,225/30,161` (`4.06%`)** control false alarms.
   - **NASA OPERA L2 RTC-S1 (`30 m`):** 3-view VV/VH consensus flagged **`1.1871 km²`** (`0.1080 km²` quiet null) across **`48.15%`** 2-view radar observability screened via **Copernicus GLO-30 DEM** (`5–60°` reference, `>70°` masked).
   - **GPM IMERG (`V07C` Early/Late) & NASA POWER:** Native IMERG recorded **`0.0 ± 0.24 mm/hr`** during the collapse half-hour (`2026-08-26 02:30–02:59Z`, containing `02:52:10Z`), refuting a local storm cloudburst trigger while documenting antecedent monsoon wetting (`15.64 mm/d` POWER on Aug 21).
   - **CMR Latency Clocks (`latency_table.json`):** Measured exact acquisition-to-CMR archive delays (`+3.25d` Sentinel-1D, `+4.03d`–`+4.14d` NISAR Track 48, `+46.38d` OPERA RTC-S1, `+47.23d` OPERA DSWx-S1) so archive latencies are never conflated with warning lead time.

---

## 2. Live NASA CMR Discovery Across 6 Global Areas of Interest (`public/nisar-catalog/cmr-snapshot-2026-11-13.json`)
In addition to the 6,803-granule Rasuwa multi-sensor audit, our Analyst Workbench queries the live **NASA Common Metadata Repository (CMR)** (`https://cmr.earthdata.nasa.gov/search/granules.json?provider=ASF`) with a dated offline snapshot containing **2,667 real NISAR granules** across all 6 global biomes:
- **Rasuwa–Langtang Corridor, Nepal (`85.20,28.05,85.65,28.45`):** **316 NISAR granules** (`GCOV`, `GUNW`, `GOFF`, `GSLC`, `SME2`, `UR_L2`, and `BETA`).
- **Hubbard Glacier / St. Elias, Alaska–Yukon (`-140.0,59.7,-138.8,60.5`):** **624 NISAR granules** bracketing the Dec 6, 2025 Mw 7.0 earthquake, paired with the SHA-256 verified **NASA Earth Observatory NISAR L-band browse pair (`2025-11-26` vs. `2025-12-08`)** in `public/nisar-reference/`.
- **Companion Global Biomes:** **San Joaquin Valley (`713`)**, **Hatay Fault Corridor (`397`)**, **Yukon–Kuskokwim Coast (`376`)**, and **Pantanal & Southern Amazon (`241`)**.

---

## 3. JPL D-102255 Granule Parser, Event Pair Finder & Python HDF5 Pipeline
- **`parseNisarGranuleId()` & `rankPrePostEventPairs()` (`src/services/nisarCatalogService.ts`):** Specification-compliant parsing of 18-token (`GCOV`, `GSLC`, `SME2`) and 20-token (`GUNW`, `GOFF`) JPL D-102255 granule IDs, surfacing `PROVISIONAL` (`P05012`, `P05023`) and `BETA` (`X05007`, `X05010`) CRID disclaimers and matching same-track/same-frame pre/post pairs.
- **Reproducible HDF5 Ingest CLI (`pipeline/ingest_nisar.py`):** Reads real Earthdata NISAR L2 `GCOV` (`/science/LSAR/GCOV/grids/frequencyA/{HHHH,HVHV,VVVV}`) and `GUNW` HDF5 structures, converts $\gamma^0$ to dB, writes quantized rasters with SHA-256 checksums, and unlocks `REAL_NISAR_PRODUCT` manifests.

---

## 4. Partner Space-Agency Integration (ISRO, ESA, CSA, CONAE & JAXA)
- **ISRO:** Modeled NISAR S-band (`9.4 cm / 3.2 GHz`) capabilities and Bhoonidhi portal reference (`https://bhoonidhi.nrsc.gov.in/`), transparently noting where S-band granules are outside CMR/ASF distribution.
- **ESA / Copernicus:** Processed Sentinel-1D HyP3 coherence & Copernicus GLO-30 DEM slope screening in the Rasuwa datum, plus Sentinel-1 C-band (`5.55 cm`) in the 8-Mission Sensor Rosetta (`src/science/sensorRosetta.ts`).
- **CSA (Canadian Space Agency):** Integrated **RADARSAT Constellation Mission (RCM)** (4-day repeat, compact-pol), **RADARSAT-1** (1995–2013 open HH baseline), and the **CSA Python & QGIS SAR Tutorial** into `SciencePrimerModal.tsx`, `ResourcesDrawer.tsx`, and `pipeline/notebooks/sar_change_tutorial.ipynb`.
- **CONAE (Argentina) & JAXA:** Integrated **SAOCOM 1A/1B** (`23.5 cm` quad-pol, `docs/SAOCOM_REQUEST_GUIDE.md`) and **ALOS-2 PALSAR-2 ScanSAR** (`24-month` CMR gap audit in `latency_table.json`), always distinguishing unsupported catalog access from zero mission acquisitions.
