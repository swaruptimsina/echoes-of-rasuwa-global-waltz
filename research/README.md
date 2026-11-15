# Rasuwa–Bhotekoshi SAR Impact Datum Archive (`rasuwa_sar_impact_datum.zip`)

This directory stores the curated research data archive [`rasuwa_sar_impact_datum.zip`](./rasuwa_sar_impact_datum.zip) (`71,869,707` bytes / ~`68.54 MiB`, **418 files**, **106.50 MB** uncompressed) backing the **26 August 2026 Langtang Lirung rock–ice collapse & Bhote Koshi–Trishuli cascade** empirical case study integrated into **Echoes of Rasuwa: Global Waltz**.

## What Is Inside `rasuwa_sar_impact_datum.zip`
- **Synthesis & Scientific Guardrails:** `PACKAGE_INDEX.md`, `README.md`, `FINDINGS.md`, `AGENCY_BRIEF.md`, `METHOD_CARD.md`, `00_event_facts.md`, `01_questions.md`, `methods.md`, `negative_results.md`, `limitations.md`, `expert_review_questions.md`, `site_selection.md` (`R1–R6`, `A1–A3` 9-site scorecard), and `release_validation.json` (`"status": "PASS"`, `"inventory_rows": 6803`, `"credential_or_signed_url_hits": []`).
- **Canonical Catalog Inventory:** `inventory.csv` (`6,803` exact-AOI CMR granule rows retained from `12,931` bounding-box records).
- **Web Handoff Assets (`game_handoff/`):** Pre-extracted web GeoTIFF/GeoJSON/WebP/JSON derivatives already wired into [`public/rasuwa-datum/`](../public/rasuwa-datum/) for zero-login in-browser visualization via `src/services/rasuwaDatumService.ts` and `src/components/RasuwaDatumExplorer.tsx`.
- **NISAR L2 Range-Read Subsets (`data/processed/nisar_lband/`):** Byte-range extracted `GCOV`, `GUNW`, and `GOFF` GeoTIFF + NPZ subsets, QA summaries, and `subset_findings.json` documenting the honest `9/528` (`1.70%`) L-band connected-phase failure at the steep upper source.
- **Sentinel-1D HyP3 & OPERA L2 RTC-S1 Runs (`data/processed/s1d_hyp3/`, `data/processed/opera_change/`):** C-band coherence change products (`158/307` target vs `1,225/30,161` control) and 3-view OPERA backscatter consensus (`1.1871 km²`, `48.15%` 2-view observability).
- **Meteorological & Reproducibility Scripts (`scripts/`, `tests/`):** GPM IMERG V07C (`0.0 ± 0.24 mm/hr` at collapse), NASA POWER climatology, HydroBASINS/UNOSAT geometries, and validation scripts.

> **Deployment Note:** Stored under `research/` rather than `public/` so static web builds (`npm run build` / Netlify `dist/`) remain fast while keeping the complete reproducible archive versioned in GitHub.
