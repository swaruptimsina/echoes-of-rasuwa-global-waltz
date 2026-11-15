# Honest Limitations, Uncertainties & Next Steps (`LIMITATIONS_AND_NEXT_STEPS.md`)

Scientific integrity requires stating clearly what our platform **does** and **does not** do today.

## 1. Current Technical & Scientific Limitations
1. **Browser Rasters vs. Multi-Gigabyte HDF5 Granules:**
   - Individual NISAR Level-2 `GCOV` and `GUNW` HDF5 granules range from **400 MB to >4 GB** per scene and require authenticated NASA Earthdata Login tokens (`~/.netrc`) for raw HDF5 download from ASF DAAC.
   - Consequently, our zero-credential browser deployment pairs **real unauthenticated NASA CMR metadata & public ASF `_LATLON.png` browse quicklooks (`PUBLIC_CATALOG_METADATA`)** and **real NASA Earth Observatory NISAR Hubbard Glacier reference images (`NASA_PUBLISHED_REFERENCE`)** with **deterministic co-registered synthetic dB & LOS physics grids (`TEST_FIXTURE`)** so any judge or student can test numeric threshold calibration, MMU filtering, and LOS transects immediately in the browser.
   - To run the exact same workbench on full-resolution calibrated float32 HDF5 slices (`REAL_NISAR_PRODUCT`), users run `pipeline/ingest_nisar.py --hdf5 <path>` locally.
2. **Provisional & Beta Data Maturity (`CRID` Disclaimers):**
   - Early-archive NISAR granules in NASA CMR (`2025-10` through `2026-10`) carry `PROVISIONAL` (`P05012`, `P05023`) or `BETA` (`X05007`, `X05010`) Composite Release Identifiers. Radiometric calibration, polarimetric cross-talk, ionospheric correction, and geolocation accuracy remain subject to algorithm updates prior to `VALIDATED` science releases.
3. **Single-Look-Direction LOS Ambiguity:**
   - A single ascending or descending interferogram (`GUNW`) measures displacement only along the 1D radar Line-of-Sight (LOS). Without combining ascending + descending tracks (and/or azimuth pixel offsets from `GOFF`), vertical subsidence cannot be uniquely separated from east–west horizontal motion.
4. **12-Day Temporal Sampling & Confounders:**
   - NISAR's 12-day exact repeat cycle provides synoptic seasonal and pre/post-event coverage, but it cannot resolve sub-diurnal flash-flood hydrographs or predict the exact timing of a slope or glacial collapse.
   - Backscatter changes are non-unique: wind-roughened water, freeze–thaw dielectric shifts ($\varepsilon_r$ dropping from $\sim 25$ to $\sim 4$ below $0^\circ\text{C}$), and topographic layover/shadow on steep canyon walls can mimic or mask hazard signatures.

## 2. Concrete Roadmap & Next Steps
1. **Cloud-Native Zarr / COG Range-Request Streaming:** Integrate Earthdata Cloud S3 / HTTPS byte-range virtual raster (`kerchunk` / `VirtualiZarr`) streaming via a lightweight proxy so authenticated researchers can slice `/science/LSAR/GCOV/grids/frequencyA/HHHH` sub-windows on the fly without downloading full 2 GB HDF5 files.
2. **Joint Ascending + Descending 2D/3D Vector Decomposition:** Extend `sampleLosTransect()` to ingest paired Ascending (Track 155) and Descending (Track 032) `GUNW` + `GOFF` granules simultaneously to invert for Vertical ($d_U$) and East–West ($d_E$) displacement components.
3. **Human Native-Speaker Review of Nepali (`ne`) and Spanish (`es`) Translations:** Partner with bilingual geoscience educators in Nepal (Tribhuvan University / DHM) and Latin America (CONAE / NASA ARSET) to review and expand our machine-assisted draft UI translations.
