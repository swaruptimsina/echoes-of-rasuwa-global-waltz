# Super Intelligence (SI) / Artificial Intelligence (AI) Disclosure

In compliance with the **2026 NASA Space Apps Challenge Submission Guide & Participant FAQs** (*"Use of Super Intelligence (SI)"*: teams must clearly disclose how SI tools were used during development and acknowledge any SI-generated images, video, audio, code, or metadata, without generating or modifying NASA logos or mission identifiers), this document discloses how SI / AI tools were used and where deterministic code & human verification govern the output.

---

## 1. How SI / AI Tools Were Used in Development

1. **Code Architecture & Engineering (Human-Directed Coding Assistant):**
   - Used an SI coding assistant during software architecture, debugging, and verification to implement and refine:
     - The interactive **Lali-Guided Rasuwa Story Adventure** (`src/components/RasuwaStoryAdventure.tsx`), 9 interactive mission chapters (`src/components/RasuwaPlayableMissions.tsx`), and 14-item Proof Archive.
     - The **Live NASA CMR NISAR Catalog Browser**, **Coverage Atlas**, and **Event Pair Finder** (`src/services/nisarCatalogService.ts`).
     - The **Rasuwa Multi-Sensor Datum Explorer** (`src/components/RasuwaDatumExplorer.tsx`, `src/services/rasuwaDatumService.ts`) displaying real GeoTIFF/GeoJSON/coherence audits from the 2026-08-26 Rasuwa event.
     - The strict **Data Passport** provenance system (`src/components/DataPassport.tsx`) and product manifest validator (`src/data/nisarProducts.ts`).
     - The **Analyst Workbench** (`src/components/AnalystWorkbench.tsx`) with interactive before/after comparison, log-ratio/dB change detection, Marching Squares contours, area uncertainty bounds, InSAR transect profiling, and GeoJSON/CSV/PNG export.
     - The rule-based **Hypothesis Engine**, **Polarization Explorer**, **Sensor & Frequency Rosetta**, and **SAR 101 Interactive Primer** (`src/science/hypotheses.ts`, `src/components/SciencePrimerModal.tsx`).
     - The **8-Beat Scrollytelling Story & 3/4 Waltz Sonification** (`src/components/StoryScrollyModal.tsx`).
     - The offline Python HDF5 ingestion pipeline (`pipeline/ingest_nisar.py`) and synthetic HDF5 test fixtures (`pipeline/tests/`).
     - Automated claim linting (`scripts/check-claims.mjs`) and unit tests (`tests/*.test.mjs`).
2. **Runtime Voice Synthesis (`server.ts` `/api/tts` — Opt-In Audio Only):**
   - **Mute-by-Default:** Audio narration only activates when a user explicitly enables Voice/Story narration in the UI (`Voice On`). All learning labs, quizzes, data tables, and `JudgeBriefing` remain 100% functional with audio muted.
   - **Zero-Key Neural Default (Tier 2):** Built-in `msedge-tts` synthesis (`en-US-AnaNeural`, with selectable `en-US-AvaNeural`, `en-US-EmmaNeural`, `en-GB-MaisieNeural`, `en-IN-NeerjaExpressiveNeural`) provides human-like voice narration without requiring user credentials, falling back gracefully to browser Web Speech if offline.
   - **Optional Gemini TTS Tier (Tier 1):** When a developer or host configures `GEMINI_API_KEY` (via `.env` / server environment, disabled from public runtime mutation when `NODE_ENV=production`), `server.ts` routes character voice requests to Gemini TTS (`gemini-3.8-flash-lite-tts` / `gemini-3.8-flash-tts` / `gemini-2.5-flash-preview-tts`) via `@google/genai`, reading pre-authored fixed dialogue scripts—never generating unverified scientific claims via an LLM.
   - **Demo Video Audio Credit:** Voiceover narration in our 30-second Space Apps demo video is generated using synthetic neural text-to-speech (`en-US-AvaNeural` / `msedge-tts`), explicitly credited as SI-synthesized audio in metadata and on-screen captioning, with zero likeness to persons under 18.
3. **Literature & Provenance Audit:**
   - Used SI-assisted literature cross-checking (`docs/SCIENCE_AND_PROVENANCE.md`, `docs/SCIENCE_RESEARCH.md`) against primary sources (NASA Earth Observatory, ASF NISAR Data User Guide, NDRRMA Situation Reports, ICIMOD synthesis reports, UNOSAT, and HydroBASINS) alongside automated claim-integrity linting (`scripts/check-claims.mjs`).
4. **Draft Localization (i18n):**
   - Machine-assisted draft UI translations in Nepali (`ne`) and Spanish (`es`), explicitly labeled in the UI as *"Machine-assisted draft — requires native-speaker review"*.

---

## 2. What SI / AI Tools Did NOT Do (Strict Scientific Guardrails)

- **Zero Runtime LLM Decision/Text Generation:** Neither the scientific Hypothesis Engine (`src/science/hypotheses.ts`), Sensor Rosetta (`src/science/sensorRosetta.ts`), `DataPassport` gatekeeper (`src/data/nisarProducts.ts`), nor `changeDetection.ts` calls any generative LLM at runtime. All scientific formulas, thresholds, and explanatory dialogue are 100% deterministic, auditable, and version-controlled.
- **Zero Fabricated Satellite Imagery & Zero SI-Modified NASA Branding:** No generative image model is used to invent satellite observations or modify NASA logos/insignias. All Hubbard Glacier browse JPEGs carry SHA-256 checksums (`public/nisar-reference/provenance.json`), Rasuwa GeoTIFFs/manifests derive directly from NASA/ESA/Copernicus/UNOSAT/GPM datasets (`public/rasuwa-datum/handoff/`, `public/nisar-products/rasuwa_nepal/manifest.json`), and illustrative pixel art / educational scenes are explicitly tagged `SIMULATED_PEDAGOGY`.
- **Zero Operational Claims:** All educational simulations, scenario steps, and hypothetical community-action worksheets are explicitly tagged `SIMULATION` or `ILLUSTRATION`.
