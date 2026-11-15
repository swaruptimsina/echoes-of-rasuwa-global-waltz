# Adversarial Persona Review 1: SAR Physicist & InSAR Geodesist

## Reviewer Profile
- **Domain:** L/S/C-band Synthetic Aperture Radar physics, repeat-pass interferometry (GUNW), Radiometric Terrain Correction (GCOV), polarimetric scattering (HH/HV/VV), and Himalayan relief distortions.

## Audit Findings & Verification
1. **Wavelength & Fringe Mathematics ($\lambda/2$):**
   - Verified in `src/utils/simulatedRadarPhysics.ts`, `src/science/sensorRosetta.ts`, and `src/services/sarAcquisitionService.ts`:
     - NISAR L-band ($\lambda = 24.0\text{ cm}$) correctly yields $\Delta d_{\text{LOS}} = \lambda/2 = 12.0\text{ cm}$ per $2\pi$ phase cycle (`losToPhaseCycles(0.12) === 1`).
     - Copernicus Sentinel-1 and CSA RCM C-band ($\lambda = 5.6\text{ cm}$) correctly yield $\lambda/2 = 2.8\text{ cm}$ per $2\pi$ phase cycle.
     - CONAE SAOCOM 1A/1B L-band ($\lambda = 23.5\text{ cm}$, $1.275\text{ GHz}$) correctly yields $\lambda/2 = 11.75\text{ cm}$.
2. **InSAR Reference Pixel ($R$), Coherence ($\gamma < 0.35$), and 1D Line-of-Sight (LOS):**
   - Verified in `src/utils/changeDetection.ts` and `src/components/AnalystWorkbench.tsx`:
     - All displacement transects explicitly subtract the user-selected Reference Pixel $R$ (`relativeLosMm = sampleLosMm - refLosMm`), mask decorrelated pixels ($\gamma < 0.35$), and warn against interpreting 1D LOS motion as 3D vertical/horizontal vectors without ascending + descending track combination.
3. **3D Terrain Artistic Extrusion Disclosure:**
   - Verified in `src/components/TerrainMap3D.tsx`: `ARTISTIC LOS→HEIGHT` disclosure explicitly states that mapping LOS displacement to vertical mesh height is an educational visualization aid, not vertical ground motion.
4. **Silwal & Dahal (Zenodo 22730419) Regional Screening Verdict:**
   - Verified across Zone 5 (`DHM Geomatics Kendra`), `sarAcquisitionService.ts`, and `SciencePrimerModal.tsx`: pre-failure slope motion was measurable in hindsight (>5 m L-band pixel offset; up to 40 cm C-band LOS creep Jul 7–Aug 24), but numerous non-failing slopes in the upper catchment exhibited similar multi-meter motion. Therefore, SAR is presented strictly as a regional screening and triage tool to prioritize in-situ instrumentation—never as a standalone automated evacuation siren.

## Status
- **PASS (0 Blocking Physics Defects)**
