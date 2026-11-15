// Real NASA / ASF / NISAR / OPERA / Sentinel-1D / GPM IMERG / Copernicus DEM Datum Registry
// Backed by verified files in public/rasuwa-datum/ (from rasuwa_sar_impact_datum) and
// validated against src/data/nisarProducts.ts ProductManifest rules.

import {
  validateProductManifest,
  type DataClassification,
  type ProductManifest,
  type ProductMaturity,
} from '../data/nisarProducts';

export interface BundledRasuwaGeoTiffPreset {
  id: string;
  title: string;
  shortLabel: string;
  publicPath: string;
  bandIndex: number;
  classification: DataClassification;
  maturity: ProductMaturity;
  sensor: string;
  granuleId: string;
  acquisitionWindow: string;
  crs: string;
  shapeLabel: string;
  units: string;
  sha256: string;
  interpretationLimit: string;
  sourceUrl: string;
}

export const BUNDLED_RASUWA_GEOTIFF_PRESETS: BundledRasuwaGeoTiffPreset[] = [
  {
    id: 'nisar_event_source_gcov',
    title: 'NISAR L2 GCOV Event Source Change (HH Δγ⁰ dB)',
    shortLabel: 'NISAR GCOV Δγ⁰ (Aug 19→31)',
    publicPath: '/rasuwa-datum/geotiff/nisar_event_source_gcov_change.tif',
    bandIndex: 0,
    classification: 'REAL_NISAR_PRODUCT',
    maturity: 'PROVISIONAL',
    sensor: 'NASA–ISRO NISAR L-Band (24 cm)',
    granuleId:
      'NISAR_L2_PR_GCOV_028_098_A_016_4005_DHDH_A_20260819T233918 → 029_098_20260831T233918',
    acquisitionWindow: '2026-08-19 to 2026-08-31 UTC (12-day event pair)',
    crs: 'EPSG:32645',
    shapeLabel: '168 × 198 × 7',
    units: 'dB (10·log10 post/pre)',
    sha256: '154552ce2830630aa64bd75d667200ea022ca8c99d0126e48485b1c71dba8d7f',
    interpretationLimit:
      'Event-source HH gamma-0 widened to p05/p95 -6.69/+5.77 dB vs control -3.19/+3.14 dB. Exploratory backscatter change only—not classified as debris, water, or displacement.',
    sourceUrl:
      'https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_028_098_A_016_4005_DHDH_A_20260819T233918_20260819T233953_P05023_N_F_J_001/NISAR_L2_PR_GCOV_028_098_A_016_4005_DHDH_A_20260819T233918_20260819T233953_P05023_N_F_J_001.h5',
  },
  {
    id: 'nisar_quiet_source_gcov',
    title: 'NISAR L2 GCOV Quiet Null Source (HH Δγ⁰ dB)',
    shortLabel: 'NISAR GCOV Quiet Null (Jul 14→26)',
    publicPath: '/rasuwa-datum/geotiff/nisar_quiet_source_gcov_change.tif',
    bandIndex: 0,
    classification: 'REAL_NISAR_PRODUCT',
    maturity: 'PROVISIONAL',
    sensor: 'NASA–ISRO NISAR L-Band (24 cm)',
    granuleId:
      'NISAR_L2_PR_GCOV_025_098_A_016_4005_DHDH_A_20260714T233920 → 026_098_20260726T233919',
    acquisitionWindow: '2026-07-14 to 2026-07-26 UTC (pre-event quiet null)',
    crs: 'EPSG:32645',
    shapeLabel: '168 × 198 × 7',
    units: 'dB (10·log10 post/pre)',
    sha256: '4a4389977c159298b1a6e7d0ac4798e6e7c777bc1fdb5d4bd7d3b6027906d111',
    interpretationLimit:
      'Matched pre-event quiet baseline over identical source grid for false-alarm and background variance comparison.',
    sourceUrl:
      'https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_025_098_A_016_4005_DHDH_A_20260714T233920_20260714T233954_P05023_F_F_J_001/NISAR_L2_PR_GCOV_025_098_A_016_4005_DHDH_A_20260714T233920_20260714T233954_P05023_F_F_J_001.h5',
  },
  {
    id: 'nisar_event_source_gunw',
    title: 'NISAR L2 GUNW Event Source Subset (9/528 Connected Pixels)',
    shortLabel: 'NISAR GUNW Failure Subset (Aug 19→31)',
    publicPath: '/rasuwa-datum/geotiff/nisar_event_source_gunw.tif',
    bandIndex: 0,
    classification: 'REAL_NISAR_PRODUCT',
    maturity: 'PROVISIONAL',
    sensor: 'NASA–ISRO NISAR L-Band InSAR (80 m)',
    granuleId:
      'NISAR_L2_PR_GUNW_028_098_A_016_029_4000_SH_20260819T233918_20260831T233952_P05023_N_F_J_001',
    acquisitionWindow: '2026-08-19 to 2026-08-31 UTC',
    crs: 'EPSG:32645',
    shapeLabel: '22 × 24 × 10',
    units: 'Phase / Coherence / Connected Components',
    sha256: '92088153c44dd46ccf4c163e2b085b16ea0b11b9e32a38680af46b1caa005199',
    interpretationLimit:
      'DIAGNOSED FAILURE: Median L-band coherence fell from 0.2188 to 0.1021; connected unwrapped phase survived in only 9/528 pixels (1.70%). Do not report LOS displacement.',
    sourceUrl:
      'https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GUNW_PROVISIONAL_V1/NISAR_L2_PR_GUNW_028_098_A_016_029_4000_SH_20260819T233918_20260819T233953_20260831T233918_20260831T233952_P05023_N_F_J_001/NISAR_L2_PR_GUNW_028_098_A_016_029_4000_SH_20260819T233918_20260819T233953_20260831T233918_20260831T233952_P05023_N_F_J_001.h5',
  },
  {
    id: 'opera_t085_vv_change',
    title: 'OPERA L2 RTC-S1 Path 085 Event VV Change (30 m dB)',
    shortLabel: 'OPERA RTC-S1 Path 085 VV Δγ⁰',
    publicPath: '/rasuwa-datum/geotiff/opera_t085_event_vv_change_db.tif',
    bandIndex: 0,
    classification: 'MODEL_OUTPUT',
    maturity: 'VALIDATED',
    sensor: 'NASA OPERA RTC-S1 (Sentinel-1D C-Band)',
    granuleId:
      'OPERA_L2_RTC-S1_T085-180590-IW2_20260816T122147Z → 20260828T122148Z_S1D_30_v1.0',
    acquisitionWindow: '2026-08-16 vs 2026-08-28 UTC (30 m posting)',
    crs: 'EPSG:32645',
    shapeLabel: '304 × 690 × 1',
    units: 'dB (VV gamma-0 post minus pre)',
    sha256: 'e0ba45e2bb3f7b99731fe90dafa56e31fb9aeb326f88ffe26e92e4e8aeabdbad',
    interpretationLimit:
      'Backscatter change without speckle filtering; part of 3-view consensus (1.1871 km² flagged across 48.15% observable reference). Invalid steep terrain is unknown, not unchanged.',
    sourceUrl: 'https://hyp3-docs.asf.alaska.edu/guides/opera_rtc_product_guide',
  },
  {
    id: 'copernicus_glo30_dem',
    title: 'Copernicus GLO-30 Digital Surface Model (30 m Subset)',
    shortLabel: 'Copernicus GLO-30 DEM (30 m)',
    publicPath: '/rasuwa-datum/geotiff/copernicus_glo30.tif',
    bandIndex: 0,
    classification: 'NASA_PUBLISHED_BROWSE',
    maturity: 'VALIDATED',
    sensor: 'Copernicus GLO-30 DSM',
    granuleId: 'Copernicus_DSM_COG_10_N28_00_E085_00_DEM',
    acquisitionWindow: 'Static Terrain Reference (85.35–85.56°E, 28.24–28.32°N)',
    crs: 'EPSG:4326',
    shapeLabel: '288 × 756 × 1',
    units: 'Elevation (m)',
    sha256: '08ce7050c1cd8c69abe0c77a46947d6e99b25310e3da3ed817d7fd4521a5ff95',
    interpretationLimit:
      'Used to compute slope screening (5–60° stable reference; >70° masked) for OPERA RTC-S1 and Sentinel-1D analyses.',
    sourceUrl:
      'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N28_00_E085_00_DEM/Copernicus_DSM_COG_10_N28_00_E085_00_DEM.tif',
  },
];

export interface LVsCCoherenceSummary {
  l_band_target_delta: number;
  l_band_control_delta: number;
  l_band_difference_of_changes: number;
  c_band_target_delta: number;
  c_band_control_delta: number;
  c_band_difference_of_changes: number;
  absolute_coherence_directly_comparable: boolean;
  provenance_label: string;
  l_band: {
    sensor: string;
    quiet_pair: [string, string];
    event_pair: [string, string];
    quiet_target_median: number;
    event_target_median: number;
    quiet_control_median: number;
    event_control_median: number;
    event_phase_valid_pixels: number;
    event_phase_total_pixels: number;
  };
  c_band: {
    sensor: string;
    quiet_pair: [string, string];
    event_pair: [string, string];
    quiet_target_median: number;
    event_target_median: number;
    target_valid_pixels: number;
    target_fraction_event_lower_than_quiet: number;
  };
  comparison_limit: string;
}

export interface LatencyClockRow {
  mission_product: string;
  first_post_acquisition_utc: string;
  acquisition_offset_days: number | null;
  product_generation_offset_days: number | null;
  archive_insertion_offset_days: number | null;
  producer_granule_id: string;
  maturity: string;
  usability_for_this_study: string;
  interpretation: string;
}

export interface RainfallSeriesData {
  provenance_label: string;
  series: Array<{
    date_utc: string;
    imerg_mm_day: number;
    power_corrected_mm_day: number;
  }>;
  native_imerg_event_half_hour: Array<{
    run: string;
    granule_id: string;
    time_start_utc: string;
    time_end_utc: string;
    precipitation_rate_mm_hr: number;
    random_error_mm_hr: number;
  }>;
  limitations: string;
}

export interface StoryHookItem {
  id: string;
  provenance_label: string;
  sentences: string[];
}

export interface CoherenceScreeningMaskSummary {
  observable: string;
  threshold: number;
  mmu_pixels: number;
  mmu_area_km2: number;
  target_valid_pixels: number;
  target_filtered_anomaly_pixels: number;
  target_filtered_anomaly_fraction: number;
  control_valid_pixels: number;
  control_filtered_false_alarm_pixels: number;
  control_filtered_false_alarm_fraction: number;
  limitations: string[];
}

export interface RasuwaDatumBundle {
  coherence: LVsCCoherenceSummary | null;
  latencyRows: LatencyClockRow[];
  rainfall: RainfallSeriesData | null;
  screeningMask: CoherenceScreeningMaskSummary | null;
  storyHooks: StoryHookItem[];
}

export const RASUWA_DATUM_STATIC_FACTS = {
  eventUtc: '2026-08-26T02:52:10Z',
  catchmentAreaKm2: 4774.048,
  glacialLakesCount: 272,
  cmrExactGranules: 6803,
  cmrBboxGranules: 12931,
  s1dTargetFlagged: '158/307 (51.5%)',
  s1dControlFalseAlarms: '1,225/30,161 (4.06%)',
  nisarPhaseValidSource: '9/528 (1.70%)',
  nisarPhaseValidControl: '420/420 (100%)',
  operaConsensusEventKm2: 1.1871,
  operaQuietNullKm2: 0.1080,
  operaTwoViewObservabilityPct: 48.15,
  imergEventHalfHourMmHr: 0.0,
} as const;

let cachedBundlePromise: Promise<RasuwaDatumBundle> | null = null;

async function fetchJsonSafe<T>(url: string): Promise<T | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return (await resp.json()) as T;
  } catch {
    return null;
  }
}

export function loadRasuwaDatumBundle(): Promise<RasuwaDatumBundle> {
  if (cachedBundlePromise) return cachedBundlePromise;
  cachedBundlePromise = (async () => {
    const [coherence, latency, rainfall, screeningMask, storyHooks] = await Promise.all([
      fetchJsonSafe<LVsCCoherenceSummary>('/rasuwa-datum/handoff/l_vs_c_coherence.json'),
      fetchJsonSafe<{ rows: LatencyClockRow[] }>('/rasuwa-datum/handoff/latency_table.json'),
      fetchJsonSafe<RainfallSeriesData>('/rasuwa-datum/handoff/rainfall_timeseries.json'),
      fetchJsonSafe<CoherenceScreeningMaskSummary>(
        '/rasuwa-datum/handoff/coherence_loss_screening_mask.json'
      ),
      fetchJsonSafe<StoryHookItem[]>('/rasuwa-datum/handoff/story_hooks.json'),
    ]);

    return {
      coherence,
      latencyRows: latency?.rows ?? [],
      rainfall,
      screeningMask,
      storyHooks: storyHooks ?? [],
    };
  })();
  return cachedBundlePromise;
}

export async function fetchValidatedRasuwaProductManifest(): Promise<ProductManifest | null> {
  const raw = await fetchJsonSafe<unknown>('/nisar-products/rasuwa_nepal/manifest.json');
  if (!raw) return null;
  const check = validateProductManifest(raw);
  return check.valid && check.manifest ? check.manifest : null;
}
