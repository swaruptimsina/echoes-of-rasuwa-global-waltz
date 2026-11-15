# Scientific & Quantitative Methods (`SCIENCE_METHODS.md`)

## 1. Radiometric Backscatter Scaling & Log-Ratio Change Detection
Synthetic Aperture Radar backscatter intensity exhibits multiplicative coherent speckle noise. Subtracting raw linear intensity ($I_2 - I_1$) produces variance proportional to mean brightness ($\text{Var}(I) \propto \langle I \rangle^2$), causing false positives on bright foreshortened mountain slopes.

In both `pipeline/ingest_nisar.py` and `src/utils/changeDetection.ts`, linear radiometric terrain-corrected backscatter ($\gamma^0$ or $\sigma^0$) is converted to decibels:
$$\sigma^0_{\text{dB}} = 10 \log_{10}(\sigma^0_{\text{linear}})$$
and multi-temporal change is evaluated as the logarithmic ratio:
$$\Delta\sigma^0_{\text{dB}}(x, y) = \sigma^0_{\text{after,dB}}(x, y) - \sigma^0_{\text{before,dB}}(x, y) = 10 \log_{10}\left(\frac{\sigma^0_{\text{after}}(x, y)}{\sigma^0_{\text{before}}(x, y)}\right)$$
In logarithmic space, multiplicative speckle becomes additive zero-mean noise with standard deviation $\sigma_{\text{speckle}} \approx \frac{5.57}{\sqrt{L}}\text{ dB}$, where $L$ is the Equivalent Number of Looks (ENL). Applied to our range-read **NISAR L2 GCOV `P05023` Track 98** subset over Rasuwa (`2026-08-19` → `2026-08-31`), source HH $\gamma^0$ change widened to p05/p95 **`-6.69 / +5.77 dB`** compared with **`-3.19 / +3.14 dB`** in the spatial control.

---

## 2. Control-Calibrated Thresholds & Stable-ROI Noise Floors ($T = |\mu_{\text{ROI}}| + k\sigma_{\text{ROI}}$)
Rather than using arbitrary visual color stretches, both our interactive Workbench and our 26 Aug 2026 Rasuwa coherence audit calibrate thresholds against stable reference terrain:
- **Workbench Stable-ROI Calibration (`computeRoiStats()`):** Evaluates empirical mean $\mu_{\text{ROI}}$ and standard deviation $\sigma_{\text{ROI}}$ of $\Delta\sigma^0_{\text{dB}}$ inside a Stable Reference ROI:
  $$T_{\text{dB}} = \max\left(0.5,\; |\mu_{\text{ROI}}| + k \cdot \sigma_{\text{ROI}}\right)$$
  with $k \in [1.0, 4.5]$ (default $k = 2.5$). Pixels with $\Delta\sigma^0_{\text{dB}} \le -T_{\text{dB}}$ flag backscatter loss (`-1`), while $\Delta\sigma^0_{\text{dB}} \ge +T_{\text{dB}}$ flag backscatter gain (`+1`).
- **26 Aug 2026 Sentinel-1D Control-Calibrated Screening (`coherence_loss_screening_mask.json`):** Uses the empirical 5th percentile (`-0.1262`) of event-minus-quiet VV normalized coherence across valid land control pixels outside a `300 m` buffer of the independent **UNOSAT** detachment polygon (`2.53 km²`), explicitly measuring both target detection (**`158/307` = `51.5%`**) and control false alarms (**`1,225/30,161` = `4.06%`**).

---

## 3. Minimum Mapping Unit (MMU), Area Uncertainty & Topographic Observability
To suppress isolated single-pixel speckle excursions:
- **Connected-Components MMU Filtering:** `computeBackscatterChangeRaster()` runs a 4-connectivity breadth-first flood fill and discards patches smaller than `mmuPixels` (default `6` pixels in Workbench; `4` pixels = `0.0256 km²` in the Sentinel-1D screening mask).
- **Area & Uncertainty Bounds:** Surviving patches report area $A_{\text{patch}} = N_{\text{pixels}} \cdot \frac{\Delta x \cdot \Delta y}{10^6}\;\text{km}^2$ with $\pm\delta A$ combining perimeter mixed-pixel boundary ambiguity ($\pm 0.5 \cdot N_{\text{perimeter}} \cdot A_{\text{pixel}}$) and a $12\%$ radiometric floor, vectorized via **Marching Squares** (`traceMarchingSquaresContours`).
- **Multi-View Consensus & Steep-Terrain Censoring:** In the **NASA OPERA L2 RTC-S1 (`30 m`)** Rasuwa audit (`change_mask.json`), requiring agreement across $\ge 2$ valid radar views flagged **`1.1871 km²`** (`0.1080 km²` in the quiet null test), while explicitly disclosing that **only `48.15%`** of the steep reference terrain had 2-view observability after **Copernicus GLO-30 DEM** slope screening (`5–60°` reference, `>70°` masked). Unobserved layover/shadow terrain is *unknown*, never treated as unchanged.

---

## 4. InSAR Relative Line-of-Sight (LOS) Profiling & Honest Coherence Limits
In `sampleLosTransect()`, unwrapped displacement (`GUNW`) is referenced to a user-selected **Reference Pixel $R$**:
$$\Delta d_{\text{LOS, rel}}(s) = d_{\text{LOS}}(s) - d_{\text{LOS}}(R)$$
with wrapped phase reconstructed using $\lambda = 0.24\text{ m}$ ($1\text{ fringe} = \lambda/2 = 12.0\text{ cm}$ in L-band vs. $2.8\text{ cm}$ in C-band; longer L-band wavelength reduces—not eliminates—phase aliasing across steep gradients). Samples with coherence below $\gamma_{\text{cutoff}} = 0.35$ are flagged decorrelated (`isCoherent = false`).

In our empirical audit of **NISAR L2 GUNW (`P05023`, `2026-08-19 → 2026-08-31`)**, median target coherence fell from `0.2188` to `0.1021` and connected unwrapped phase survived in only **`9/528` (`1.70%`)** source pixels (vs. **`420/420` (`100%`)** in control). Consistent with our scientific integrity rules, **no NISAR displacement or pre-event velocity is inferred where phase continuity collapses**.

---

## 5. Multi-Band Falsification & Non-Uniqueness (`src/science/hypotheses.ts` & `geotiffInspector.ts`)
- **8-Phenomenon Hypothesis Engine:** Every candidate interpretation lists physical confounders (dielectric wetting, freeze–thaw $\varepsilon_r$ shifts, topographic layover/shadow, tropospheric/ionospheric delay, surface roughness) and falsification tests. For example, **GPM IMERG `V07C`** recorded **`0.0 ± 0.24 mm/hr`** at `2026-08-26 02:30–02:59Z` (`02:52:10Z` collapse), falsifying an instantaneous storm-cloudburst trigger.
- **Client-Side Binary GeoTIFF Verification (`geotiffInspector.ts`):** Parses all 5 bundled Rasuwa GeoTIFFs (`EPSG:32645` / `EPSG:4326`) directly in-browser via `geotiff.js`, computing exact min/max/p02/p98/mean statistics without server-side fabrication.
