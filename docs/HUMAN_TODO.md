# Human Action Checklist (`HUMAN_TODO.md`)

These items require human credentials, legal/organizer confirmation, or external submission actions that an automated coding agent cannot perform on your behalf.

---

## 1. Run Offline Calibrated NISAR HDF5 Ingestion (Requires Free NASA Earthdata Login)
NASA CMR catalog search and public browse PNGs work in the browser without login, but downloading full Level-2 HDF5 science granules (`GCOV`, `GUNW`, `GOFF`) from ASF Earthdata Cloud requires your personal NASA Earthdata Login (`~/.netrc` or `EARTHDATA_TOKEN`).

Run the provided pipeline locally in 3 commands:
```bash
# 1. Create Python 3.11+ virtual environment and install dependencies
python3 -m venv .venv && source .venv/bin/activate
pip install -r pipeline/requirements.txt

# 2. Configure ~/.netrc with your NASA Earthdata Login:
# machine urs.earthdata.nasa.gov login <YOUR_USERNAME> password <YOUR_PASSWORD>
# chmod 600 ~/.netrc

# 3. Search, fetch, and process a real Rasuwa or Hubbard Glacier GCOV/GUNW pair into public/nisar-products/
python3 pipeline/ingest_nisar.py search --aoi rasuwa_nepal --product GCOV
python3 pipeline/ingest_nisar.py fetch --granule NISAR_L2_PR_GCOV_026_098_A_044_4005_DHDH_A_20260819T123626_20260819T123701_P05023_N_F_J_001 --aoi rasuwa_nepal
python3 pipeline/ingest_nisar.py process-gcov --input data/raw/*.h5 --aoi rasuwa_nepal --bbox 85.20 28.05 85.65 28.45
```
Once `public/nisar-products/<aoi>/<granule-id>/manifest.json` is generated and passes SHA-256 & schema validation, the Analyst Workbench automatically unlocks the `REAL_NISAR_PRODUCT` badge for that granule.

## 2. Confirm Pre-Event Baseline Eligibility with Your Space Apps Local Lead
- Per `docs/PRE_EDIT_AUDIT.md` and `docs/WORK_LOG.md`, share the split between the pre-event baseline and hackathon-period work with your NASA Space Apps Local Lead / organizers.
- Ensure `docs/AI_DISCLOSURE.md` is summarized in your project submission form's SI/AI usage field.

## 3. Confirm Open-Source License & Local Photo Permissions
- Review the committed root `LICENSE` (**MIT License**; optionally add CC BY 4.0 note for original documentation if desired) and confirm that all team members consent.
- Verify or replace any unverified local incident photos in `public/incident_photos/` before public redistribution outside the hackathon demo; until verified, keep their visible `ILLUSTRATION — unverified origin/permissions` labels intact.

## 4. Native-Speaker Review of Nepali & Spanish Draft Translations
- Have a consenting native Nepali speaker (and Tamang community reviewer for local place/cultural references) and Spanish speaker review the machine-assisted draft strings in `src/i18n/translations.ts`.

## 5. Upload Demo & Submit on spaceappschallenge.org (2026 Rules Verified)
- Upload the **30-second (or less) Demo Video** (`docs/submission/Echoes_of_Rasuwa_Demo_30s.mp4`) **or** exported **7-slide Deck** (`docs/submission/slides.md`) to YouTube/Google Drive/GitHub Pages with **completely public access** (no login/request-access wall).
- Push this repository to a public GitHub URL (never committing `.env.local` or `.tts-cache/`) and deploy the live web server (e.g., Render / Railway / Fly.io via `npm run build && NODE_ENV=production npm start`) or static preview so **Link to Final Project** opens immediately.
- Paste the finalized answers from `docs/submission/SUBMISSION_COPY_READY.md` into your team's Project tab (checking both **Terms & Conditions** and **Confirm All Work is Original** checkboxes) before Sunday, November 15 at 11:59 p.m. local time.
