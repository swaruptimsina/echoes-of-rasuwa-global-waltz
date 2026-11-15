# Extended Live Q&A Walkthrough Reference (`DEMO_SCRIPT_3MIN.md`)

> **⚠️ DEPRECATED FOR OFFICIAL SPACE APPS PORTAL DEMO LINK — EXTENDED JUDGE / LIVE PITCH WALKTHROUGH ONLY**
>
> **DO NOT upload a 3-minute video to the "Link to Project Demo" field on `spaceappschallenge.org`!** Per the **2026 NASA Space Apps Project Submission Guide**, any Demo video longer than **30 seconds** (or slide deck longer than **7 slides**) is **disqualified from Global Judging**.
> - For the official **Link to Project Demo**, use **[`DEMO_SCRIPT_30S.md`](./DEMO_SCRIPT_30S.md)** (≤ 30 seconds) or **[`slides.md`](./slides.md)** (7 slides).
> - Use this document **only** for live hackathon Q&A, mentor booth demos, or post-hackathon extended walkthroughs.

---

**Target Duration (Live Walkthrough Only):** ~3:00 (180 seconds, ~400 words)

### `[0:00 – 0:25]` Hook: Monsoon Clouds Over Rasuwa & Lali's Story Entry
- **Visual:** Open `ExpeditionLaunchScreen.tsx`. Show **Lali's 9-Chapter Rasuwa Story Adventure** (starting at Syabrubesi Flag House, `1,460 m`), toggle `EN / नेपाली (Draft) / ES (Draft)`, and show the **3-Door Launch Console** (`Story + Waltz`, `Analyst Workbench`, `Field Expedition & 6-Step Photo Guide`).
- **Talking Points:**
  *"During the South Asian monsoon, clouds obscure Nepal's Rasuwa–Bhote Koshi corridor for weeks—including the August 26, 2026 rock–ice avalanche and debris flood. Active microwave radar from NASA–ISRO NISAR, ESA Sentinel-1D, and NASA OPERA pierces clouds and night. **Echoes of Rasuwa: Global Waltz** combines Lali Maya's 9-chapter story and 14 Proof Stories with a quantitative SAR Analyst Workbench and a 5-biome field expedition under one strict rule: every layer carries a **`DataPassport`** so observations, catalog metadata, unverified illustrations, and simulations are never confused."*

### `[0:25 – 0:55]` Lali's Gorge Journey & Door 1 Waltz Sonification
- **Visual:** Step briefly from Syabrubesi (`1,460 m`) → Chilime Hydro (`1,640 m`) → Timure (`1,760 m`) → Miteri Bridge (`1,814 m`), noting the explicit `ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED` tag on local corridor photo cards. Switch to **Door 1 (`StoryScrollyModal.tsx`)** and click **Play 6-Pass Sonification Waltz** while highlighting the synchronized text transcript.
- **Talking Points:**
  *"Learners explore real corridor elevation checkpoints with Lali before diving into Door 1's 8-beat scrollytelling waltz—Reference Pass, Secondary Pass, Differential Change. Our Web Audio sonification maps 12-day HH dB, HV canopy scattering, and coherence loss into a playable 3/4 waltz paired with a full accessible transcript."*

### `[0:55 – 1:55]` Door 2: Analyst Workbench & 26 Aug 2026 Rasuwa Multi-Sensor Datum
- **Visual:** Open **Door 2 (`AnalystWorkbench.tsx`)** and expand **`RasuwaDatumExplorer.tsx`**. Show the `6,803` exact-AOI CMR granules (`4,774.048 km²` HydroBASINS, `272` glacial lakes), click the bundled `P05023` **NISAR GCOV GeoTIFF (`-6.69/+5.77 dB`)**, highlight the **honest NISAR GUNW failure (`9/528` = `1.70%` connected pixels vs. `420/420` control)**, compare **Sentinel-1D (`158/307` = `51.5%` inside UNOSAT `2.53 km²` vs. `4.06%` control)** and **OPERA RTC-S1 (`1.1871 km²`, `48.15%` 2-view observability)**, inspect **GPM IMERG (`0.0 ± 0.24 mm/hr` at `02:52:10Z`)** and **CMR latency clocks (`+3.25d` to `+46.38d`)**, then switch to **Hubbard Glacier (`2025-11-26` vs. `2025-12-08`)** and demonstrate Stable-ROI calibration ($\mu + k\sigma$), MMU filtering, and Relative LOS transects.
- **Talking Points:**
  *"Inside Door 2, our Rasuwa Multi-Sensor Explorer decodes real GeoTIFFs right in the browser with `geotiff.js`. Just as importantly, it models scientific honesty: where NISAR L-band GUNW lost phase continuity at the steep detachment (`9/528` pixels), we refuse to invent a displacement rate and instead cross-check Sentinel-1D coherence, OPERA backscatter consensus, Copernicus GLO-30 slope masking, and GPM IMERG rainfall. Meanwhile, our Workbench queries 2,667 NISAR CMR granules across 6 global AOIs, calibrates Stable-ROI dB thresholds, and compares NASA's real Hubbard Glacier earthquake pair."*

### `[1:55 – 2:30]` Science Lab: SAR 101, 8-Mission Rosetta & Hypothesis Engine
- **Visual:** Open `SciencePrimerModal.tsx` and `ResourcesDrawer.tsx`. Show the Layover ($\alpha \ge \theta_i$) and Freeze–Thaw demos, the **8-Mission Sensor Rosetta** (NASA–ISRO NISAR L/S, ESA Sentinel-1, CSA RCM, CSA RADARSAT-1, CONAE SAOCOM, JAXA ALOS-2, NASA UAVSAR), and the **8-Phenomenon Hypothesis Engine**.
- **Talking Points:**
  *"Because single-channel radar changes are never unique, our Science Lab teaches 5 core SAR physics principles alongside an 8-mission Sensor Rosetta uniting NASA, ISRO, ESA, CSA, CONAE, and JAXA archives, plus a rule-based Hypothesis Engine requiring confounders and falsification tests."*

### `[2:30 – 3:00]` Door 3: 3D Observatory, 6-Step Judge Trail & Verified Open Science
- **Visual:** Open **▶ START GUIDED EVIDENCE TRAIL (`JudgeBriefing.tsx`)**, spin the **3D Valley Lab (`TerrainMap3D.tsx`)**, and close on `npm run verify` output (**59 Node unit tests**, **2 Python tests**, **0 claim-lint errors**).
- **Talking Points:**
  *"Finally, Door 3 connects orbital echoes to community preparedness through our 6-step Judge Evidence Trail, 3D Three.js valley observatory, and 45-minute NGSS lesson plan—strictly disclaiming operational warning claims. Audited by 59 Node tests, Python HDF5 tests, and our automated claim-integrity linter, this is Echoes of Rasuwa: Global Waltz."*
