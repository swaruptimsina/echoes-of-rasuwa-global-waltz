# 45-Minute Classroom & Workshop Lesson Plan: "Dancing with the SARs"

- **Target Audience:** High-school Earth Science / Physics (Grades 10–12), Introductory Undergraduate Remote Sensing, or Community Preparedness Workshops
- **Duration:** 45 Minutes
- **Prerequisites:** Web browser (Desktop or Mobile); no prior radar physics or coding required
- **Primary Standards Alignment:** NGSS HS-ESS2-2 (Analyze geoscience data to make the claim that one change to Earth's surface can create feedbacks), NGSS HS-PS4-5 (Wave properties in technological devices)

---

## 1. Learning Objectives
By the end of this 45-minute session, students will be able to:
1. **Explain Active vs. Passive Sensing:** Articulate why Synthetic Aperture Radar (SAR) at L-band ($\lambda = 24\text{ cm}$) and S-band ($\lambda = 9.4\text{ cm}$) penetrates monsoon cloud cover and forest canopies where optical cameras are blocked.
2. **Decode Multi-Polarimetric Backscatter:** Distinguish specular open-water inundation ($\text{HH}$ and $\text{HV}$ drop in dB) from sub-canopy flooded forest ($\text{HH}$ double-bounce spike) and rough landslide debris fans.
3. **Calibrate Change Thresholds & Uncertainty:** Use a Stable Reference ROI to set a decibel threshold $T = |\mu_{\text{ROI}}| + k\sigma_{\text{ROI}}$, filter isolated speckle via a Minimum Mapping Unit (MMU), and report changed area in $\text{km}^2 \pm \text{uncertainty}$.
4. **Practice Scientific Humility (Falsification & Confounders):** Identify at least two non-hazard confounders (e.g., topographic layover/shadow, freeze–thaw dielectric shift, tropospheric phase delay) before recommending a community preparedness action.

---

## 2. Minute-by-Minute Instructional Plan

### Part I: The Monsoon Curtain & 8-Beat Story Mode (0:00 – 10:00)
- **Activity:** Click **Door 1 · 8-Beat Story Mode** on the Launch Screen.
- **Instructor Prompt:** *"Why couldn't optical satellites see the Rasuwa gorge during peak monsoon cloud cover? How does NISAR's 12-day orbital repeat act like a 3/4 waltz?"*
- **Multimodal Exercise:** Click **Play 6-Pass Sonification Waltz** (and read the synchronized text transcript table). Ask students to identify which pass corresponds to valley-floor inundation (Pass #5, where pitch drops to 220 Hz and coherence $\gamma$ drops to 0.22).
- **Provenance Check:** Point out the **DataPassport** badge on Beat 3 (`NASA_PUBLISHED_REFERENCE` for Hubbard Glacier) versus Beat 4 (`TEST_FIXTURE` paired with `PUBLIC_CATALOG_METADATA` for Rasuwa).

### Part II: SAR 101 Physics Lab & Sensor Rosetta (10:00 – 20:00)
- **Activity:** Click **SAR 101 · Polarization & Sensor Rosetta**.
- **Hands-On Physics Exploration:**
  1. In **Demo 1 (Speckle & ENL)**, slide the Equivalent Number of Looks $L$ from $1$ to $16$. Observe how noise standard deviation drops as $5.57 / \sqrt{L}\text{ dB}$.
  2. In **Demo 2 (Side-Looking Geometry & Layover)**, set terrain slope $\alpha = 42^\circ$ and radar incidence angle $\theta_i = 38^\circ$. Discuss why $\alpha \ge \theta_i$ triggers geometric layover.
  3. In **Tab 3 (Sensor Rosetta)**, select *Dense Forest / Sub-Canopy Wetland* and observe why L-band missions (**NISAR L-Band**, **CONAE SAOCOM**, **ALOS-2**, **UAVSAR**) rank above C-band missions (**Sentinel-1**, **CSA RCM**) for forest canopy penetration.

### Part III: Multi-Temporal SAR Analyst Workbench (20:00 – 35:00)
- **Activity:** Open **Door 2 · SAR Analyst Workbench**.
- **Guided Analyst Lab:**
  1. Select **Rasuwa–Bhotekoshi–Trishuli Corridor, Nepal** in the AOI menu. Inspect the real NASA CMR granules in the left panel (`NISAR_L2_GCOV_PROVISIONAL_V1` and `NISAR_L2_GUNW_PROVISIONAL_V1`).
  2. Toggle **Auto-Calibrate from Stable ROI** on and off, and adjust the **Minimum Mapping Unit (MMU)** slider from `1 px` to `10 px`. Record how many isolated speckle pixels are suppressed.
  3. Switch the Observable to **GUNW Relative LOS (m)** and inspect the **InSAR Relative LOS Transect (A → B vs Ref R)**. Click **Shift Reference Pixel (R)** to see why InSAR phase measures *relative* Line-of-Sight motion rather than absolute vertical height.
  4. Switch AOI to **Hubbard Glacier & Yakutat Bay, Alaska** and click **NASA Published Reference Pair** to compare the real Nov 26, 2025 and Dec 8, 2025 NISAR acquisitions across the Dec 6 Mw 7.0 earthquake.
  5. Click **Log to Expedition** to record your workbench findings into the Field Logbook.

### Part IV: Field Ground-Truth & Community Preparedness Synthesis (35:00 – 45:00)
- **Activity:** Return to the Launch Screen and click **▶ START GUIDED EVIDENCE TRAIL** (or deploy to the Rasuwa pixel field).
- **Discussion & Wrap-Up:** Complete the 4-question evidence worksheet in the Observatory Notebook and discuss why satellite radar is a powerful *screening and monitoring tool* that must be paired with local meteorology, DEM layover masks, and ground-truth inspection before issuing community advisories.

---

## 3. Student Worksheet & Answer Key

### Question 1 (Polarimetry & Double-Bounce)
**Prompt:** In the Brazilian Pantanal AOI, an area beneath standing gallery forest shows a $+4.9\text{ dB}$ *increase* in $\text{HH}$ backscatter while an adjacent open marsh shows a $-5.6\text{ dB}$ *decrease* in $\text{HH}$. Both areas are flooded. Why do their radar echoes move in opposite directions?
- **Answer Key:** Calm open water acts as a specular mirror, reflecting microwave pulses away from the side-looking radar and causing a strong backscatter loss ($-\text{dB}$). Beneath standing trees, L-band waves ($\lambda = 24\text{ cm}$) penetrate the leafy crown, bounce off the smooth water surface onto the vertical tree trunk (or vice versa), and reflect directly back toward the radar via **dihedral double-bounce**, causing a strong $+\text{dB}$ increase in $\text{HH}$.

### Question 2 (Speckle & Calibration)
**Prompt:** Why is it scientifically invalid to set a change threshold of $\pm 0.2\text{ dB}$ on a single-look SAR image without a Minimum Mapping Unit (MMU) filter?
- **Answer Key:** Coherent radar echoes suffer from multiplicative speckle noise ($\sigma \approx 5.57\text{ dB}$ for $L=1$ look, or $\sim 1.0\text{–}1.5\text{ dB}$ after multi-looking). A $\pm 0.2\text{ dB}$ threshold lies deep inside the random speckle noise floor, flagging thousands of unphysical single-pixel false alarms. Calibrating $T = |\mu_{\text{ROI}}| + k\sigma_{\text{ROI}}$ over a stable reference area and filtering patches smaller than the MMU separates coherent physical change from random interference.

### Question 3 (InSAR Line-of-Sight & Confounders)
**Prompt:** An interferogram (GUNW) over a steep mountain valley shows a $6\text{ cm}$ phase gradient between 1,800 m and 3,200 m elevation across a single 12-day pair. List two physical explanations *other* than pre-failure landslide slope creep, and explain how to test them.
- **Answer Key:**
  1. **Stratified Tropospheric Water-Vapor Delay:** Atmospheric moisture correlated with topography delays the radar phase linearly with elevation. *Test:* Check whether the phase gradient appears symmetrically on both sides of stable bedrock ridges and whether it fluctuates randomly in sign across subsequent 12-day passes.
  2. **Geometric Layover / Foreshortening or Soil-Moisture/Freeze–Thaw Phase Bias:** Steep slopes facing the radar ($\alpha \ge \theta_i$) fold over in slant range, and freeze–thaw dielectric shifts alter penetration depth. *Test:* Check the RTC local incidence layover mask, compare ascending vs. descending tracks, and check NASA POWER / MERRA-2 temperatures against $0^\circ\text{C}$.
