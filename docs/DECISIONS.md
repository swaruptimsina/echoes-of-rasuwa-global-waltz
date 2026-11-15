# Architectural & Engineering Decisions (`DECISIONS.md`)

Every significant technical, scientific, and UX decision made during the transformation of **Echoes of Rasuwa: Global Waltz** is recorded here with its alternatives and rationale.

---

## D-01: Zero-Dependency Canvas/SVG Geographic Workbench vs. Heavy Map Library
- **Decision:** Build the interactive **Analyst Workbench** (`src/components/AnalystWorkbench.tsx`) using a high-precision, zero-dependency EPSG:3857/EPSG:4326 Canvas + SVG Geodetic Viewport with NASA GIBS WMTS tile compositing, CMR granule footprint polygon rendering, interactive ROI polygon/box drawing, transect profiling, and synced comparison modes (Swipe, Flicker/Blink, Opacity, Side-by-Side), rather than adding Leaflet or MapLibre GL JS.
- **Alternatives Considered:**
  1. Add `leaflet` + `@types/leaflet` (~145 kB + external CSS + marker icon asset quirks in Vite).
  2. Add `maplibre-gl` (~800 kB gzipped, blowing the 250 kB initial JS budget).
- **Reason:**
  - Keeps external dependency count unchanged and fast, avoids external tile-server style dependencies or broken marker sprites in offline/sandboxed environments, gives pixel-exact access to `Float32Array` / 16-bit raster buffers for log-ratio change detection, stable-ROI noise calibration, and InSAR transect extraction, and guarantees 100% keyboard accessibility (`Arrow` keys for pan/swipe, `+`/`-` for zoom, `Tab` focus stops).

## D-02: Strict Compile-Time & Runtime `DataPassport` Classification
- **Decision:** Require a `classification: DataClassification` prop (`REAL_NISAR_PRODUCT` | `NASA_PUBLISHED_BROWSE` | `CATALOG_METADATA_LIVE` | `CATALOG_SNAPSHOT` | `MODEL_OUTPUT` | `REPORTED_ESTIMATE` | `ILLUSTRATION` | `SIMULATION` | `TEST_FIXTURE`) on every data layer, chart, and image via `DataPassport.tsx`.
- **Alternatives Considered:** Free-text badges or footer-only disclaimers.
- **Reason:** Prevents accidental overclaiming at the point of display. Enforces non-color-only encoding (distinct icon + border pattern + uppercase classification badge + maturity disclaimer for `PROVISIONAL`/`BETA` NISAR products).

## D-03: Real NASA CMR Integration with Dated Bundled Snapshots
- **Decision:** Query NASA's public Common Metadata Repository (`https://cmr.earthdata.nasa.gov/search/granules.json`) directly from the browser (which supports CORS `Access-Control-Allow-Origin: *`), and bundle real, dated CMR responses obtained on 2026-11-13 in `public/nisar-catalog/snapshots.json` as an offline fallback explicitly labeled `CATALOG_SNAPSHOT (2026-11-13)` whenever offline.
- **Alternatives Considered:** Live-only (breaks offline) or synthetic granule lists (violates non-fabrication rule).
- **Reason:** NASA CMR returns real `NISAR_L2_GCOV_PROVISIONAL_V1`, `NISAR_L2_GUNW_PROVISIONAL_V1`, `NISAR_L2_GOFF_PROVISIONAL_V1`, `NISAR_L2_GSLC_PROVISIONAL_V1`, `NISAR_L2_GCOV_BETA_V1`, `NISAR_L2_GUNW_BETA_V1`, `NISAR_UR_L2`, and `NISAR_L3_SME2_PROVISIONAL_V1` granules with public browse PNG URLs (`https://nisar.asf.earthdatacloud.nasa.gov/BROWSE/...`). Bundling the real CMR query output guarantees deterministic offline operation while keeping 100% authentic granule IDs, footprints, and timestamps.

## D-04: Three-Door Launch Architecture Preserving Existing Judge & Game Paths
- **Decision:** Upgrade `ExpeditionLaunchScreen.tsx` to feature three clear audience doors—**Door 1: Story & Guided Evidence Trail (3 min)**, **Door 2: Analyst Workbench & Live NISAR Catalog**, and **Door 3: Field Expedition & 2D/3D Observatory**—while preserving the exact existing button handler `onStartGame('judge_demo')` and label `START GUIDED EVIDENCE TRAIL` tested by `tests/judge-path.test.mjs`.
- **Alternatives Considered:** Replacing the launch screen completely.
- **Reason:** Preserves 100% backward compatibility with all 42 existing automated tests while giving judges and scientists immediate (<10 second) access to the new Analyst Workbench, Scrollytelling Story, and SAR 101 / Science Rosetta tools.

## D-05: Code Splitting via `React.lazy` & Vite `manualChunks`
- **Decision:** Lazy-load heavy views (`Three.js` 3D terrain, Analyst Workbench, Science Primer / Rosetta, Story Mode, Submission & Resources Drawer) and split `three` into a dedicated chunk in `vite.config.ts`.
- **Alternatives Considered:** Single monolithic bundle (was 1,176.79 kB / 336.93 kB gzip).
- **Reason:** Eliminates Vite's >500 kB chunk warning and brings initial JS well under the 250 kB gzipped budget.
