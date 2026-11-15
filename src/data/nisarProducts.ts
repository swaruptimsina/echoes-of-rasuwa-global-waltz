// Validated NISAR Product Loader, Manifest Schema & Honest Fallback Ladder
// Enforces Integrity Rules 1, 2, 4 & 6:
// - Every layer/chart/image must declare an explicit DataClassification.
// - REAL_NISAR_PRODUCT is permitted ONLY when a validated manifest entry exists with
//   granuleId, collectionShortName, crid, acquisition times, processingLevel, units,
//   nodata/mask rules, retrievedAt, and SHA-256 of both input and output.

export type DataClassification =
  | 'REAL_NISAR_PRODUCT'
  | 'NASA_PUBLISHED_BROWSE'
  | 'CATALOG_METADATA_LIVE'
  | 'CATALOG_SNAPSHOT'
  | 'MODEL_OUTPUT'
  | 'REPORTED_ESTIMATE'
  | 'ILLUSTRATION'
  | 'SIMULATION'
  | 'TEST_FIXTURE';

export type ProductMaturity = 'PROVISIONAL' | 'BETA' | 'VALIDATED' | 'BROWSE' | 'N/A';

export type NisarProductType = 'GCOV' | 'GUNW' | 'GOFF' | 'GSLC' | 'SME2';

export interface QuantizedRasterLayerSpec {
  id: string;
  title: string;
  hdf5DatasetPath: string;
  units: string;
  polarization?: 'HH' | 'HV' | 'VV' | 'VH' | 'SH' | 'DH' | 'N/A';
  width: number;
  height: number;
  scale: number;
  offset: number;
  nodataValue: number;
  validMin: number;
  validMax: number;
  previewPngPath?: string;
  quantizedUint16Path?: string;
  outputSha256: string;
}

export interface ProductManifest {
  schemaVersion: '1.0';
  classification: DataClassification;
  aoiId: string;
  granuleId: string;
  secondaryGranuleId?: string;
  collectionShortName: string;
  productType: NisarProductType;
  processingLevel: 'L2' | 'L3';
  maturity: ProductMaturity;
  crid: string;
  track: number;
  frame: number;
  orbitDirection: 'A' | 'D';
  radarWavelengthMeters: number;
  losConventionNote: string;
  acquisitionStartUtc: string;
  acquisitionEndUtc: string;
  secondaryAcquisitionStartUtc?: string;
  secondaryAcquisitionEndUtc?: string;
  epsg3857Bounds: [number, number, number, number]; // [minX, minY, maxX, maxY]
  wgs84Bounds: [number, number, number, number]; // [west, south, east, north]
  units: string;
  nodataRule: string;
  maskRule: string;
  ionosphereTroposphereNote?: string;
  retrievedAtUtc: string;
  processedAtUtc: string;
  pipelineCommand: string;
  softwareVersions: Record<string, string>;
  inputHdf5Sha256: string;
  outputManifestSha256: string;
  sourceUrl: string;
  userGuideUrl: string;
  license: string;
  credit: string;
  qualityNotes: string[];
  layers: QuantizedRasterLayerSpec[];
}

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
  downgradedClassification?: DataClassification;
  manifest?: ProductManifest;
}

const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function validateProductManifest(raw: unknown): ManifestValidationResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Manifest must be a non-null JSON object.'] };
  }
  const m = raw as Record<string, unknown>;

  const reqStrings: Array<keyof ProductManifest> = [
    'granuleId',
    'collectionShortName',
    'productType',
    'processingLevel',
    'maturity',
    'crid',
    'acquisitionStartUtc',
    'acquisitionEndUtc',
    'units',
    'nodataRule',
    'maskRule',
    'retrievedAtUtc',
    'inputHdf5Sha256',
    'outputManifestSha256',
    'sourceUrl',
    'license',
    'credit'
  ];

  for (const field of reqStrings) {
    if (typeof m[field] !== 'string' || String(m[field]).trim().length === 0) {
      errors.push(`Missing or empty required string field: ${String(field)}`);
    }
  }

  if (typeof m.granuleId === 'string' && !m.granuleId.startsWith('NISAR_')) {
    errors.push('granuleId must start with "NISAR_" per JPL D-102255 naming convention.');
  }

  if (typeof m.acquisitionStartUtc === 'string' && !ISO_UTC_RE.test(m.acquisitionStartUtc)) {
    errors.push('acquisitionStartUtc must be a valid ISO-8601 UTC timestamp.');
  }
  if (typeof m.acquisitionEndUtc === 'string' && !ISO_UTC_RE.test(m.acquisitionEndUtc)) {
    errors.push('acquisitionEndUtc must be a valid ISO-8601 UTC timestamp.');
  }
  if (typeof m.retrievedAtUtc === 'string' && !ISO_UTC_RE.test(m.retrievedAtUtc)) {
    errors.push('retrievedAtUtc must be a valid ISO-8601 UTC timestamp.');
  }

  if (typeof m.inputHdf5Sha256 !== 'string' || !SHA256_HEX_RE.test(m.inputHdf5Sha256)) {
    errors.push('inputHdf5Sha256 must be a 64-character hexadecimal SHA-256 digest.');
  }
  if (typeof m.outputManifestSha256 !== 'string' || !SHA256_HEX_RE.test(m.outputManifestSha256)) {
    errors.push('outputManifestSha256 must be a 64-character hexadecimal SHA-256 digest.');
  }

  if (
    !Array.isArray(m.wgs84Bounds) ||
    m.wgs84Bounds.length !== 4 ||
    m.wgs84Bounds.some((v) => typeof v !== 'number' || !Number.isFinite(v))
  ) {
    errors.push('wgs84Bounds must be a 4-element finite numeric array [west, south, east, north].');
  }

  if (!Array.isArray(m.layers) || m.layers.length === 0) {
    errors.push('layers must be a non-empty array of QuantizedRasterLayerSpec.');
  } else {
    m.layers.forEach((layer, idx) => {
      const l = layer as Record<string, unknown>;
      if (typeof l?.id !== 'string' || !l.id) errors.push(`layers[${idx}].id is required.`);
      if (typeof l?.hdf5DatasetPath !== 'string' || !l.hdf5DatasetPath.startsWith('/science/')) {
        errors.push(`layers[${idx}].hdf5DatasetPath must start with "/science/".`);
      }
      if (typeof l?.outputSha256 !== 'string' || !SHA256_HEX_RE.test(l.outputSha256)) {
        errors.push(`layers[${idx}].outputSha256 must be a 64-character SHA-256 hex digest.`);
      }
      if (typeof l?.scale !== 'number' || !Number.isFinite(l.scale) || l.scale === 0) {
        errors.push(`layers[${idx}].scale must be a non-zero finite number.`);
      }
      if (typeof l?.nodataValue !== 'number' || !Number.isFinite(l.nodataValue)) {
        errors.push(`layers[${idx}].nodataValue must be a finite number.`);
      }
    });
  }

  // Integrity Rule 2: REAL_NISAR_PRODUCT is ONLY allowed if 0 validation errors AND not marked synthetic/fixture
  const isSynthetic =
    String(m.pipelineCommand || '').includes('--synthetic') ||
    m.classification === 'TEST_FIXTURE' ||
    m.classification === 'SIMULATION';

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const typed = m as unknown as ProductManifest;
  if (typed.classification === 'REAL_NISAR_PRODUCT' && isSynthetic) {
    return {
      valid: false,
      errors: [
        'Cannot classify synthetic or test-fixture data as REAL_NISAR_PRODUCT (Integrity Rule 2).'
      ],
      downgradedClassification: 'TEST_FIXTURE'
    };
  }

  return { valid: true, errors: [], manifest: typed };
}

/**
 * Decodes a 16-bit quantized unsigned integer raster into physical Float32 values.
 * Invalid / nodata pixels are set to NaN (never silently filled with 0).
 */
export function decode16BitRasterToFloat32(
  uint16Data: Uint16Array,
  spec: Pick<QuantizedRasterLayerSpec, 'scale' | 'offset' | 'nodataValue' | 'validMin' | 'validMax'>
): { values: Float32Array; validCount: number; nodataCount: number } {
  const out = new Float32Array(uint16Data.length);
  let validCount = 0;
  let nodataCount = 0;

  for (let i = 0; i < uint16Data.length; i++) {
    const raw = uint16Data[i];
    if (raw === spec.nodataValue) {
      out[i] = Number.NaN;
      nodataCount++;
      continue;
    }
    const val = raw * spec.scale + spec.offset;
    if (!Number.isFinite(val) || val < spec.validMin || val > spec.validMax) {
      out[i] = Number.NaN;
      nodataCount++;
    } else {
      out[i] = val;
      validCount++;
    }
  }

  return { values: out, validCount, nodataCount };
}

export interface FallbackLadderStatus {
  aoiId: string;
  activeTier: 'REAL_NISAR_PRODUCT' | 'NASA_PUBLISHED_BROWSE' | 'CATALOG_METADATA_LIVE' | 'CATALOG_SNAPSHOT' | 'SIMULATION';
  summaryText: string;
  ingestCommand: string;
}

export function resolveAoiLayerLadder(
  aoiId: string,
  validatedManifests: ProductManifest[],
  hasBrowsePair: boolean,
  catalogStatus: 'live' | 'snapshot' | 'none'
): FallbackLadderStatus {
  const realForAoi = validatedManifests.find(
    (m) => m.aoiId === aoiId && m.classification === 'REAL_NISAR_PRODUCT'
  );
  const ingestCommand = `python3 pipeline/ingest_nisar.py search --aoi ${aoiId} --product GCOV && python3 pipeline/ingest_nisar.py fetch --aoi ${aoiId}`;

  if (realForAoi) {
    return {
      aoiId,
      activeTier: 'REAL_NISAR_PRODUCT',
      summaryText: `Validated local NISAR ${realForAoi.productType} product (${realForAoi.granuleId}, ${realForAoi.maturity}) loaded with SHA-256 verified manifest.`,
      ingestCommand
    };
  }
  if (hasBrowsePair) {
    return {
      aoiId,
      activeTier: 'NASA_PUBLISHED_BROWSE',
      summaryText:
        'NASA-published false-color NISAR GSLC browse imagery loaded (qualitative visual comparison; run offline HDF5 pipeline for calibrated pixel math).',
      ingestCommand
    };
  }
  if (catalogStatus === 'live') {
    return {
      aoiId,
      activeTier: 'CATALOG_METADATA_LIVE',
      summaryText:
        'Live NASA CMR granule footprints, dates & public ASF quicklooks loaded; local calibrated HDF5 raster not yet ingested (requires Earthdata Login).',
      ingestCommand
    };
  }
  if (catalogStatus === 'snapshot') {
    return {
      aoiId,
      activeTier: 'CATALOG_SNAPSHOT',
      summaryText:
        'Dated NASA CMR catalog snapshot (2026-11-13) loaded with real granule IDs & footprints; local calibrated HDF5 raster not yet ingested.',
      ingestCommand
    };
  }
  return {
    aoiId,
    activeTier: 'SIMULATION',
    summaryText:
      'No calibrated NISAR HDF5 raster ingested locally for this AOI. Displaying explicitly labeled educational simulation / test fixture.',
    ingestCommand
  };
}

export function getMaturityDisclaimer(
  classification: DataClassification,
  maturity: ProductMaturity = 'N/A'
): string {
  if (maturity === 'PROVISIONAL') {
    return 'PROVISIONAL NISAR PRODUCT: Calibrated and validated at a limited set of sites. Intended for exploration and process studies—not rigorous validation or operational hazard warnings.';
  }
  if (maturity === 'BETA') {
    return 'BETA NISAR PRODUCT: Early sample release intended for format familiarization and pipeline testing—not for scientific research or hazard decisions.';
  }
  switch (classification) {
    case 'REAL_NISAR_PRODUCT':
      return 'Calibrated NISAR Level-2 product ingested via verified HDF5 manifest. Exploratory analysis only—not an operational warning.';
    case 'NASA_PUBLISHED_BROWSE':
      return 'Archived NASA-rendered browse imagery. Qualitative surface-roughness comparison only; no calibrated dB or displacement scale.';
    case 'CATALOG_METADATA_LIVE':
      return 'Live granule metadata and public browse quicklooks queried from NASA CMR (provider=ASF).';
    case 'CATALOG_SNAPSHOT':
      return 'Dated snapshot of real NASA CMR granule metadata (retrieved 2026-11-13) for offline reliability.';
    case 'MODEL_OUTPUT':
      return 'Assimilated climatological model output (NASA POWER MERRA-2/GEOS)—coarse grid, not a local weather station or river gauge.';
    case 'REPORTED_ESTIMATE':
      return 'Externally curated event report or preliminary agency SitRep—not measured by this application.';
    case 'TEST_FIXTURE':
      return 'Synthetic HDF5 / Float32 test fixture generated for offline change-detection math verification—NOT a satellite observation.';
    case 'ILLUSTRATION':
      return 'Author-created schematic terrain, fictional character, or unverified local photograph—not surveyed field evidence.';
    case 'SIMULATION':
      return 'Procedural radar scenario for educational reasoning—not measured backscatter or interferometric phase.';
  }
}
