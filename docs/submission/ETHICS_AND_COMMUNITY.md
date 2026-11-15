# Ethics, Scientific Humility & Community Stewardship (`ETHICS_AND_COMMUNITY.md`)

## 1. Respectful Representation of Disaster-Affected Communities
Our case studies span real places where communities face severe environmental hazards: **Rasuwa District (Nepal)**, the **Pantanal (Brazil)**, the **San Joaquin Valley (USA)**, **Hatay Province (Türkiye)**, and the **Yukon–Kuskokwim Delta (Alaska)**. In designing both the Analyst Workbench and the 5-Biome Field Expedition, we enforce strict ethical guardrails:
1. **No Fabrication of Casualty or Financial-Saving Claims:** We never invent or display unverified casualty figures, displaced-population counts, or speculative dollar amounts "saved" by our software.
2. **Clear Separation of Real Photographs vs. Fictional Pedagogical Characters:**
   - Every real archival or satellite photograph in `IncidentPhotoModal.tsx` and `public/nisar-reference/` carries its exact date, source URL, photographer/agency credit, and license from `docs/sources-ledger.json`.
   - Every in-game NPC dialogue and pixel-art village map in `FieldExpeditionViewport.tsx` is explicitly badged as a **culture-inspired educational composite scenario (`SIMULATED_PEDAGOGY`)**, never impersonating real named disaster survivors or official government spokespeople.

## 2. Never Claiming Operational Early Warning or Deterministic Prediction
A core ethical principle of remote-sensing communication is recognizing the boundary between **scientific observation** and **operational emergency warning**:
- **What NISAR Can Do:** Systematically map surface backscatter changes ($\Delta\sigma^0$ in dB), polarimetric scattering ratios ($\text{HH}/\text{HV}$), and 12-day relative Line-of-Sight displacement ($\Delta d_{\text{LOS}}$) through clouds, helping scientists and local agencies identify flood extents, slow slope creep, or aquifer subsidence bowls.
- **What NISAR Cannot Do:** Predict the exact day or hour an earthquake, landslide, or glacial lake outburst flood will occur, or replace official national hydrological and meteorological warning systems (such as Nepal's DHM, Brazil's CEMADEN/INPE, USGS, Türkiye's AFAD, or NOAA/NWS).
- Every screen in our app reinforces this distinction: **"Observable ≠ Interpretation • Detection ≠ Earthquake/Collapse Timing Prediction."**

## 3. Data Sovereignty, Accessibility & Open Science
- **Zero-Barrier Open Access:** All code, unit tests, and educational materials are released under the **MIT License** with zero paywalls, zero login gates, and zero mandatory AI API keys—interactive neural voice narration works out-of-the-box via built-in Edge Neural / Web Speech fallback (with optional `GEMINI_API_KEY` TTS tier), while all scientific analysis and `DataPassport` checks remain 100% deterministic with zero LLM calls.
- **Inclusive Multimodal & Color-Blind-Safe Design:** All quantitative maps use color-blind-safe palettes (`Viridis`, `Cividis`, `Diverging Blue–Orange`), non-color-only symbol/border encodings on `DataPassport` badges, keyboard-operable compare sliders, screen-reader live summaries, and a text transcript accompanying the Web Audio time-series sonification.
- **Multilingual Draft Support (`EN` / `NE` / `ES`):** Provides English alongside clearly labeled machine-assisted draft Nepali and Spanish interfaces so local Rasuwa educators and Latin American SAR learners can navigate the 3-door launch experience while inviting native-speaker community review.
