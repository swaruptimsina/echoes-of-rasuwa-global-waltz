# CONAE SAOCOM (L-Band) & CSA EODMS (RCM / RADARSAT-1) Access Guide

This guide explains how researchers, educators, and students can inspect and request complementary L-band and C-band SAR data from **CONAE (Comisión Nacional de Actividades Espaciales, Argentina)** and the **Canadian Space Agency (CSA)** to pair with open **NASA–ISRO NISAR** granules.

---

## 1. Why Pair CONAE SAOCOM 1A/1B with NISAR?
- **Shared L-Band Physics ($\lambda \approx 23.5\text{–}24.0\text{ cm}$):** CONAE's SAOCOM 1A (launched 2018) and SAOCOM 1B (launched 2020) operate at $1.275\text{ GHz}$ ($\lambda = 23.5\text{ cm}$), nearly identical to NISAR's L-band radar ($1.257\text{ GHz}$, $\lambda = 24.0\text{ cm}$).
- **Full Quad-Polarization Heritage:** SAOCOM operates operational Stripmap and TOPSAR **Full Quad-Pol ($\text{HH}+\text{HV}+\text{VH}+\text{VV}$)** modes and operational L-band Soil Moisture maps, providing an ideal validation benchmark for NISAR `GCOV` and `SME2` products—especially across South American biomes like our **Pantanal (`pantanal_brazil`)** case study.
- **Constellation Cadence:** Combining SAOCOM's 8-day two-spacecraft repeat cycle with NISAR's 12-day repeat cycle reduces effective L-band observation gaps during rapidly evolving flood events.

---

## 2. Step-by-Step: Browsing the CONAE SAOCOM GeoCatalog (No Login Required for Browse)
1. **Open the Official CONAE GeoCatalog:**
   Navigate to [`https://catalogos.conae.gov.ar/catalogo/catalogoSat.html`](https://catalogos.conae.gov.ar/catalogo/catalogoSat.html).
2. **Define the Area of Interest (AOI):**
   Use the polygon/rectangle tool or enter coordinates for your target basin—for example, our Pantanal floodplain AOI:
   - West: `-57.60°`, South: `-17.90°`, East: `-56.90°`, North: `-17.20°`
3. **Select Sensor & Acquisition Parameters:**
   - **Platform:** `SAOCOM-1A` and/or `SAOCOM-1B`
   - **Instrument Mode:** `SM` (Stripmap, 10 m resolution) or `TN` / `TW` (TOPSAR Narrow / Wide, 30–100 m swath)
   - **Polarization:** `QP` (Quad-Pol) or `DP` (Dual-Pol HH/HV)
4. **Inspect Footprints & Quicklooks:**
   Click any returned swath footprint on the map to inspect the acquisition timestamp, incidence angle range, orbit pass direction (`ASCENDING` / `DESCENDING`), and browse quicklook image.

---

## 3. How to Request Full SAOCOM Level-1 / Level-2 Products for Research
While SAOCOM catalog metadata and browse previews are publicly viewable, full single-look complex (`S1A` / `SLC`) and geocoded backscatter (`GEC` / `GTC`) granules require an approved user account:
1. Register for a scientific/educational account at the CONAE User Services portal ([`https://www.argentina.gob.ar/ciencia/conae`](https://www.argentina.gob.ar/ciencia/conae)).
2. Submit a brief Research/Educational Project Proposal specifying your AOI bounding box, date range, and non-commercial use.
3. Once approved, export the scene IDs from the GeoCatalog and convert them using our pipeline template (`pipeline/ingest_nisar.py`) or SNAP / GDAL into the same `manifest.json` + 16-bit PNG schema used by `DataPassport`.

---

## 4. Accessing CSA RADARSAT Constellation Mission (RCM) & RADARSAT-1 via EODMS
1. **Open the Canadian Space Agency / NRCan EODMS Portal:**
   Navigate to [`https://www.eodms-sgdot.nrcan-rncan.gc.ca/`](https://www.eodms-sgdot.nrcan-rncan.gc.ca/).
2. **For 30-Year Historical Baselines (1995–2013):**
   Select **RADARSAT-1** (open public archive, C-band 5.6 cm HH polarization). Search over **Hubbard Glacier (`[-139.65, 59.85, -139.25, 60.15]`)** or **Yukon–Kuskokwim Delta (`[-164.60, 61.90, -162.80, 63.10]`)** to compare 1990s/2000s terminus positions against 2025–2026 NISAR L-band acquisitions.
   *(Note: Many RADARSAT-1 granules are also mirrored directly in NASA ASF Vertex under dataset `RADARSAT-1`.)*
3. **For 4-Day Rapid Revisit & Compact Polarization (2019–Present):**
   Select **RCM (RADARSAT Constellation Mission)** in EODMS to inspect 4-day C-band repeat series and Compact Polarization (`CTL-R`) products.
