# Offline NISAR Level-2 HDF5 Ingestion Pipeline (`pipeline/`)

This offline Python (≥ 3.11) pipeline searches NASA CMR / ASF, downloads real NISAR Level-2 HDF5 products (`GCOV`, `GUNW`, `GOFF`) using your personal NASA Earthdata Login, crops and reprojects to EPSG:3857/WGS84 for any AOI, extracts physical quantities with quality/coherence masks, and writes a SHA-256 verified `manifest.json` + 16-bit quantized rasters + 8-bit preview PNGs into `public/nisar-products/<aoi>/<granule-id>/`.

> **Scientific Credits & References:**
> - **ASF NISAR Data User Guide:** https://nisar-docs.asf.alaska.edu/
> - **JPL D-102255 / SDS Product Specifications:** GCOV (`/science/LSAR/GCOV/grids/frequencyA/`), GUNW (`/science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram/`), GOFF (`/science/LSAR/GOFF/grids/frequencyA/pixelOffsets/`).
> - **Canadian Space Agency (CSA) SAR Python Tutorial:** Inspired by CSA's open-source SAR log-ratio & speckle-filtering notebook workflow (`pipeline/notebooks/sar_change_tutorial.ipynb`).

---

## 10-Minute Quickstart (Human Operator)

### 1. Set Up Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r pipeline/requirements.txt
```

### 2. Configure NASA Earthdata Credentials (Never Commit Credentials!)
Create `~/.netrc` with permissions `0600` (or export `EARTHDATA_TOKEN`):
```bash
cat << 'EOF' > ~/.netrc
machine urs.earthdata.nasa.gov
  login <YOUR_EARTHDATA_USERNAME>
  password <YOUR_EARTHDATA_PASSWORD>
EOF
chmod 600 ~/.netrc
```

### 3. Run Subcommands
```bash
# Search live NASA CMR for Rasuwa or Hubbard Glacier NISAR L2 granules
python3 pipeline/ingest_nisar.py search --aoi rasuwa_nepal --product GCOV

# Refresh offline CMR catalog snapshot for all 6 AOIs
python3 pipeline/ingest_nisar.py snapshot-catalog --output public/nisar-catalog/cmr-snapshot-2026-11-13.json

# Download a specific granule HDF5 via asf_search / Earthdata bearer session
python3 pipeline/ingest_nisar.py fetch --granule NISAR_L2_PR_GCOV_026_098_A_016_4005_DHDH_A_20260819T233918_20260819T233952_P05023_N_F_J_001 --out-dir data/raw

# Process GCOV HDF5 -> calibrated dB backscatter (10 * log10(gamma0)), RGB composite, 16-bit raster & manifest
python3 pipeline/ingest_nisar.py process-gcov --input data/raw/NISAR_L2_PR_GCOV_*.h5 --aoi rasuwa_nepal --bbox 85.20 28.05 85.65 28.45

# Process GUNW HDF5 -> LOS displacement (m) using dataset radarWavelength, coherence mask, wrapped fringes & iono/tropo layers
python3 pipeline/ingest_nisar.py process-gunw --input data/raw/NISAR_L2_PR_GUNW_*.h5 --aoi rasuwa_nepal --bbox 85.20 28.05 85.65 28.45

# Process GOFF HDF5 -> pixel-offset slant-range/azimuth displacement magnitude & direction
python3 pipeline/ingest_nisar.py process-goff --input data/raw/NISAR_L2_PR_GOFF_*.h5 --aoi hubbard_glacier --bbox -140.0 59.7 -138.8 60.5
```

### 4. Run Offline Synthetic HDF5 Pipeline Tests
No Earthdata Login or network connection is required to verify the HDF5 parser, wavelength/LOS conversion, nodata handling, 16-bit quantization, and SHA-256 manifest builder:
```bash
python3 -m unittest discover -s pipeline/tests -p "test_*.py" -v
```
*(Synthetic outputs are automatically stamped `"classification": "TEST_FIXTURE"` and `--synthetic` so they can never be mistaken for `REAL_NISAR_PRODUCT` in the web app.)*
