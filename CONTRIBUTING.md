# Contributing to Echoes of Rasuwa: Global Waltz

Thank you for contributing to **Echoes of Rasuwa: Global Waltz**, our open-source multi-temporal SAR Analyst Workbench, 8-beat Scrollytelling Narrative, and 5-Biome Field Expedition built for the **2026 NASA Space Apps Challenge ("Dancing with the SARs")**.

## 1. Scientific Integrity & Data Provenance Rules
Every contribution that touches data layers, visualizations, or narrative copy **must** obey our 10 Non-Negotiable Integrity Rules:
1. **Mandatory `DataPassport`:** Every map layer, raster, and chart must render a `<DataPassport />` component (`src/components/DataPassport.tsx`) with an explicit `classification` prop (`REAL_NISAR_PRODUCT`, `NASA_PUBLISHED_REFERENCE`, `PUBLIC_CATALOG_METADATA`, `ANCIL_GIBS`, `ANCIL_POWER`, `ANCIL_EONET`, `SIMULATED_PEDAGOGY`, or `TEST_FIXTURE`).
2. **Strict `REAL_NISAR_PRODUCT` Gate:** Only layers backed by a schema-validated `manifest.json` produced by `pipeline/ingest_nisar.py` from an actual NISAR HDF5 granule may claim `REAL_NISAR_PRODUCT`.
3. **No Operational Warning or Unverified Impact Claims:** Never claim that this educational/analytical application predicted a disaster, issued an operational evacuation alert, or saved a specific number of lives or dollars.
4. **Uncertainty & Confounders:** Any change-detection metric must report its threshold (in dB), Minimum Mapping Unit (MMU), uncertainty bounds ($\pm\text{ km}^2$), and physical confounders (speckle, layover/shadow, dielectric moisture/freeze–thaw, tropospheric delay).

## 2. Development & Verification Workflow
Before opening a pull request, run the full verification suite:
```bash
npm install
npm run verify
python3 -m unittest discover -s pipeline/tests -p "test_*.py" -v
```
All Node unit tests (`tests/*.test.mjs`), TypeScript typechecks (`npm run typecheck`), the automated claim-integrity linter (`scripts/check-claims.mjs`), and Python pipeline tests must pass with zero errors.
