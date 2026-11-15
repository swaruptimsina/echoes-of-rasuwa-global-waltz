// Live NASA CMR NISAR Catalog Browser, Filename Parser (JPL D-102255), Coverage Atlas & Event Pair Finder
// Connects keyless NASA Common Metadata Repository (CMR) APIs (provider=ASF) with dated offline snapshot fallback.

import { DataClassification, NisarProductType, ProductMaturity } from '../data/nisarProducts';

export type CatalogAoiId =
  | 'rasuwa_nepal'
  | 'hubbard_glacier'
  | 'pantanal_brazil'
  | 'san_joaquin_usa'
  | 'hatay_turkiye'
  | 'yukon_alaska';

export interface ParsedNisarGranuleMeta {
  valid: boolean;
  granuleId: string;
  isPairedProduct: boolean;
  level: 'L1' | 'L2' | 'L3' | 'UNKNOWN';
  processingType: 'PR' | 'UR' | 'UNKNOWN';
  productType: NisarProductType | 'UNKNOWN';
  cycle: number;
  secondaryCycle?: number;
  relativeOrbitTrack: number;
  orbitDirection: 'A' | 'D' | 'UNKNOWN';
  frame: number;
  modeBandwidthCode: string;
  polarizationCode: string;
  polarizationLabel: string;
  startDateTimeUtc: string;
  endDateTimeUtc: string;
  secondaryStartDateTimeUtc?: string;
  secondaryEndDateTimeUtc?: string;
  crid: string;
  maturity: ProductMaturity;
  coverageIndicator: 'F' | 'P' | 'UNKNOWN';
  processingCenter: 'JPL' | 'ISRO' | 'UNKNOWN';
}

export interface NisarCatalogGranule {
  granuleId: string;
  collectionShortName: string;
  timeStart: string;
  timeEnd: string;
  sizeMB: number;
  browseUrl: string | null;
  downloadUrl: string | null;
  polygon: string;
  orbitDirection: 'A' | 'D' | 'UNKNOWN';
  parsed: ParsedNisarGranuleMeta;
}

export interface AoiCatalogResponse {
  aoiId: string;
  name: string;
  bbox: string; // "west,south,east,north"
  eventDate: string;
  classification: Extract<DataClassification, 'CATALOG_METADATA_LIVE' | 'CATALOG_SNAPSHOT'>;
  retrievedAt: string;
  collectionCounts: Record<string, number>;
  totalGranules: number;
  granules: NisarCatalogGranule[];
}

export interface RankedEventPair {
  id: string;
  kind: 'SINGLE_PAIR_GCOV' | 'NATIVE_PAIR_GUNW' | 'NATIVE_PAIR_GOFF';
  preGranule: NisarCatalogGranule;
  postGranule?: NisarCatalogGranule;
  score: number;
  temporalBaselineDays: number;
  sameTrack: boolean;
  sameFrame: boolean;
  sameDirection: boolean;
  sameModeAndPol: boolean;
  insarCompatible: boolean;
  headline: string;
  explanation: string;
  warnings: string[];
}

export const NISAR_CMR_COLLECTIONS = [
  'NISAR_L2_GCOV_PROVISIONAL_V1',
  'NISAR_L2_GUNW_PROVISIONAL_V1',
  'NISAR_L2_GOFF_PROVISIONAL_V1',
  'NISAR_L2_GSLC_PROVISIONAL_V1',
  'NISAR_L3_SME2_PROVISIONAL_V1',
  'NISAR_UR_L2',
  'NISAR_L2_GCOV_BETA_V1',
  'NISAR_L2_GUNW_BETA_V1',
  'NISAR_L2_GOFF_BETA_V1',
  'NISAR_L2_GSLC_BETA_V1'
] as const;

export const CATALOG_AOI_PRESETS: Record<
  CatalogAoiId,
  { name: string; bbox: string; eventDate: string; eventDescription: string }
> = {
  rasuwa_nepal: {
    name: 'Rasuwa–Langtang Corridor, Nepal',
    bbox: '85.20,28.05,85.65,28.45',
    eventDate: '2026-08-26',
    eventDescription: 'Reported 26 August 2026 Langtang Lirung rock–ice avalanche & Bhote Koshi debris flood'
  },
  hubbard_glacier: {
    name: 'Hubbard Glacier / St. Elias Mountains, Yukon–Alaska',
    bbox: '-140.0,59.7,-138.8,60.5',
    eventDate: '2025-12-06',
    eventDescription: '6 December 2025 M7.0 St. Elias earthquake & Hubbard Glacier avalanche debris'
  },
  pantanal_brazil: {
    name: 'Pantanal & Southern Amazon, Brazil',
    bbox: '-57.8,-18.1,-56.9,-17.3',
    eventDate: '2026-08-15',
    eventDescription: 'Seasonal wetland flood pulse & dry-season understory fire/logging dynamics'
  },
  san_joaquin_usa: {
    name: 'San Joaquin Central Valley, California',
    bbox: '-120.0,35.8,-119.1,36.4',
    eventDate: '2026-07-15',
    eventDescription: 'Summer irrigation groundwater pumping & aquifer-system subsidence bowl'
  },
  hatay_turkiye: {
    name: 'Hatay–Pazarcık Fault Corridor, Türkiye',
    bbox: '36.6,36.8,37.5,37.6',
    eventDate: '2026-02-06',
    eventDescription: 'East Anatolian Fault interseismic/postseismic strain & Asi River valley deformation'
  },
  yukon_alaska: {
    name: "Yukon–Kuskokwim Yup'ik Coast, Alaska",
    bbox: '-164.2,60.8,-162.8,61.6',
    eventDate: '2026-08-01',
    eventDescription: 'Late-summer active-layer permafrost thaw subsidence & coastal bluff erosion'
  }
};

function formatCompactTimestampToIso(compact: string): string {
  // Format: YYYYMMDDTHHMMSS -> YYYY-MM-DDTHH:MM:SSZ
  if (!/^\d{8}T\d{6}$/.test(compact)) return compact;
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(9, 11)}:${compact.slice(11, 13)}:${compact.slice(13, 15)}Z`;
}

function describePolarizationCode(pol: string): string {
  switch (pol) {
    case 'DHDH':
      return 'Dual-Pol HH+HV (Horizontal transmit, H+V receive)';
    case 'DVDV':
      return 'Dual-Pol VV+VH (Vertical transmit, V+H receive)';
    case 'QPDH':
      return 'Quad-Pol / Dual-H Split-Band (HH, HV, VH, VV)';
    case 'SH':
    case 'SHNA':
      return 'Single-Pol HH (Horizontal co-pol)';
    case 'SV':
    case 'SVNA':
      return 'Single-Pol VV (Vertical co-pol)';
    case 'DH':
      return 'Dual-Pol HH+HV Pair';
    default:
      return `Polarization Mode ${pol}`;
  }
}

/**
 * Parses a NISAR Level-2 / Level-3 granule ID according to JPL D-102255 / ASF NISAR Data User Guide.
 * Verified against real NASA CMR granules:
 * - Single acquisition (18 tokens):
 *   NISAR_L2_PR_GCOV_033_098_A_016_4005_DHDH_A_20261018T233918_20261018T233952_P05023_N_F_J_001
 * - Paired acquisition (20 tokens):
 *   NISAR_L2_PR_GUNW_008_131_D_057_010_4000_SH_20251225T065857_20251225T065920_20260118T065858_20260118T065921_X05010_N_P_J_001
 */
export function parseNisarGranuleId(rawId: string): ParsedNisarGranuleMeta {
  const cleanId = rawId.replace(/\.h5$/i, '').trim();
  const tokens = cleanId.split('_');

  const fallback: ParsedNisarGranuleMeta = {
    valid: false,
    granuleId: cleanId,
    isPairedProduct: false,
    level: 'UNKNOWN',
    processingType: 'UNKNOWN',
    productType: 'UNKNOWN',
    cycle: 0,
    relativeOrbitTrack: 0,
    orbitDirection: 'UNKNOWN',
    frame: 0,
    modeBandwidthCode: '',
    polarizationCode: '',
    polarizationLabel: 'Unknown',
    startDateTimeUtc: '',
    endDateTimeUtc: '',
    crid: '',
    maturity: 'N/A',
    coverageIndicator: 'UNKNOWN',
    processingCenter: 'UNKNOWN'
  };

  if (tokens[0] !== 'NISAR' || tokens.length < 18) {
    return fallback;
  }

  const level = (['L1', 'L2', 'L3'].includes(tokens[1]) ? tokens[1] : 'UNKNOWN') as ParsedNisarGranuleMeta['level'];
  const processingType = (['PR', 'UR'].includes(tokens[2]) ? tokens[2] : 'UNKNOWN') as ParsedNisarGranuleMeta['processingType'];
  const prod = tokens[3] as NisarProductType;
  const productType: ParsedNisarGranuleMeta['productType'] = ['GCOV', 'GUNW', 'GOFF', 'GSLC', 'SME2'].includes(prod)
    ? prod
    : 'UNKNOWN';

  const cycle = Number.parseInt(tokens[4], 10);
  const relativeOrbitTrack = Number.parseInt(tokens[5], 10);
  const orbitDirection = (tokens[6] === 'A' || tokens[6] === 'D' ? tokens[6] : 'UNKNOWN') as 'A' | 'D' | 'UNKNOWN';
  const frame = Number.parseInt(tokens[7], 10);

  if (!Number.isFinite(cycle) || !Number.isFinite(relativeOrbitTrack) || !Number.isFinite(frame)) {
    return fallback;
  }

  const isPaired = productType === 'GUNW' || productType === 'GOFF' || tokens.length >= 20;

  if (isPaired && tokens.length >= 20) {
    const secondaryCycle = Number.parseInt(tokens[8], 10);
    const modeBandwidthCode = tokens[9];
    const polarizationCode = tokens[10];
    const startDateTimeUtc = formatCompactTimestampToIso(tokens[11]);
    const endDateTimeUtc = formatCompactTimestampToIso(tokens[12]);
    const secondaryStartDateTimeUtc = formatCompactTimestampToIso(tokens[13]);
    const secondaryEndDateTimeUtc = formatCompactTimestampToIso(tokens[14]);
    const crid = tokens[15];
    const coverageIndicator = (tokens[17] === 'F' || tokens[17] === 'P' ? tokens[17] : 'UNKNOWN') as 'F' | 'P' | 'UNKNOWN';
    const processingCenter = tokens[18] === 'J' ? 'JPL' : tokens[18] === 'I' ? 'ISRO' : 'UNKNOWN';
    const maturity: ProductMaturity = crid.startsWith('P')
      ? 'PROVISIONAL'
      : crid.startsWith('X')
        ? 'BETA'
        : 'VALIDATED';

    return {
      valid: true,
      granuleId: cleanId,
      isPairedProduct: true,
      level,
      processingType,
      productType,
      cycle,
      secondaryCycle: Number.isFinite(secondaryCycle) ? secondaryCycle : undefined,
      relativeOrbitTrack,
      orbitDirection,
      frame,
      modeBandwidthCode,
      polarizationCode,
      polarizationLabel: describePolarizationCode(polarizationCode),
      startDateTimeUtc,
      endDateTimeUtc,
      secondaryStartDateTimeUtc,
      secondaryEndDateTimeUtc,
      crid,
      maturity,
      coverageIndicator,
      processingCenter
    };
  }

  // Single acquisition (18 tokens)
  const modeBandwidthCode = tokens[8];
  const polarizationCode = tokens[9];
  const startDateTimeUtc = formatCompactTimestampToIso(tokens[11]);
  const endDateTimeUtc = formatCompactTimestampToIso(tokens[12]);
  const crid = tokens[13];
  const coverageIndicator = (tokens[15] === 'F' || tokens[15] === 'P' ? tokens[15] : 'UNKNOWN') as 'F' | 'P' | 'UNKNOWN';
  const processingCenter = tokens[16] === 'J' ? 'JPL' : tokens[16] === 'I' ? 'ISRO' : 'UNKNOWN';
  const maturity: ProductMaturity = crid.startsWith('P')
    ? 'PROVISIONAL'
    : crid.startsWith('X')
      ? 'BETA'
      : 'VALIDATED';

  return {
    valid: true,
    granuleId: cleanId,
    isPairedProduct: false,
    level,
    processingType,
    productType,
    cycle,
    relativeOrbitTrack,
    orbitDirection,
    frame,
    modeBandwidthCode,
    polarizationCode,
    polarizationLabel: describePolarizationCode(polarizationCode),
    startDateTimeUtc,
    endDateTimeUtc,
    crid,
    maturity,
    coverageIndicator,
    processingCenter
  };
}

let cachedSnapshotPromise: Promise<any> | null = null;

async function loadBundledCmrSnapshot(): Promise<any> {
  if (!cachedSnapshotPromise) {
    cachedSnapshotPromise = fetch('/nisar-catalog/cmr-snapshot-2026-11-13.json').then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }
  return cachedSnapshotPromise;
}

/**
 * Queries live NASA CMR for NISAR granules in a bounding box, falling back to the dated
 * real CMR snapshot if offline or blocked.
 */
export async function fetchNisarCatalogForAoi(
  aoiId: CatalogAoiId,
  forceSnapshot = false
): Promise<AoiCatalogResponse> {
  const preset = CATALOG_AOI_PRESETS[aoiId];

  if (!forceSnapshot) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5500);
      const targetCollections = [
        'NISAR_L2_GCOV_PROVISIONAL_V1',
        'NISAR_L2_GUNW_PROVISIONAL_V1',
        'NISAR_L2_GOFF_PROVISIONAL_V1',
        'NISAR_UR_L2',
        'NISAR_L2_GCOV_BETA_V1',
        'NISAR_L2_GUNW_BETA_V1'
      ];
      const shortNameParams = targetCollections.map((c) => `short_name[]=${encodeURIComponent(c)}`).join('&');
      const url = `https://cmr.earthdata.nasa.gov/search/granules.json?provider=ASF&${shortNameParams}&bounding_box=${preset.bbox}&page_size=60&sort_key=-start_date`;

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const totalHitsHeader = Number.parseInt(res.headers.get('CMR-Hits') || '0', 10);
        const data = await res.json();
        const entries: any[] = data?.feed?.entry || [];
        if (entries.length > 0) {
          const collectionCounts: Record<string, number> = {};
          const granules: NisarCatalogGranule[] = entries.map((e) => {
            const gid = String(e.title || '');
            const parsed = parseNisarGranuleId(gid);
            const col =
              targetCollections.find((c) =>
                JSON.stringify(e.links || []).includes(c)
              ) || (parsed.maturity === 'BETA' ? `NISAR_L2_${parsed.productType}_BETA_V1` : parsed.processingType === 'UR' ? 'NISAR_UR_L2' : `NISAR_L2_${parsed.productType}_PROVISIONAL_V1`);
            collectionCounts[col] = (collectionCounts[col] || 0) + 1;
            const browseLinks = (e.links || [])
              .map((l: any) => String(l.href || ''))
              .filter((href: string) => href.startsWith('https://') && href.endsWith('.png'));
            const dataLinks = (e.links || [])
              .map((l: any) => String(l.href || ''))
              .filter((href: string) => href.startsWith('https://') && href.endsWith('.h5'));
            const poly = e.polygons?.[0]?.[0] || '';
            return {
              granuleId: gid,
              collectionShortName: col,
              timeStart: String(e.time_start || parsed.startDateTimeUtc),
              timeEnd: String(e.time_end || parsed.endDateTimeUtc),
              sizeMB: Math.round(Number(e.granule_size || 0) * 100) / 100,
              browseUrl: browseLinks[0] || null,
              downloadUrl: dataLinks[0] || null,
              polygon: poly,
              orbitDirection: parsed.orbitDirection,
              parsed
            };
          });

          // Enrich with snapshot counts/event-window granules so historical event pairs are always present
          try {
            const snap = await loadBundledCmrSnapshot();
            const snapReg = snap?.regions?.[aoiId];
            if (snapReg) {
              const seen = new Set(granules.map((g) => g.granuleId));
              for (const sg of snapReg.granules || []) {
                if (!seen.has(sg.granuleId)) {
                  seen.add(sg.granuleId);
                  granules.push({
                    ...sg,
                    parsed: parseNisarGranuleId(sg.granuleId)
                  });
                }
              }
              return {
                aoiId,
                name: preset.name,
                bbox: preset.bbox,
                eventDate: preset.eventDate,
                classification: 'CATALOG_METADATA_LIVE',
                retrievedAt: new Date().toISOString(),
                collectionCounts: snapReg.collectionCounts || collectionCounts,
                totalGranules: Math.max(totalHitsHeader, snapReg.totalGranules || granules.length),
                granules
              };
            }
          } catch {
            // Snapshot enrichment optional when live succeeded
          }

          return {
            aoiId,
            name: preset.name,
            bbox: preset.bbox,
            eventDate: preset.eventDate,
            classification: 'CATALOG_METADATA_LIVE',
            retrievedAt: new Date().toISOString(),
            collectionCounts,
            totalGranules: Math.max(totalHitsHeader, granules.length),
            granules
          };
        }
      }
    } catch {
      // Fall through to dated snapshot
    }
  }

  const snap = await loadBundledCmrSnapshot();
  const reg = snap?.regions?.[aoiId];
  const rawGranules: any[] = reg?.granules || [];
  const granules: NisarCatalogGranule[] = rawGranules.map((g) => ({
    ...g,
    parsed: parseNisarGranuleId(g.granuleId)
  }));

  return {
    aoiId,
    name: preset.name,
    bbox: preset.bbox,
    eventDate: preset.eventDate,
    classification: 'CATALOG_SNAPSHOT',
    retrievedAt: String(snap?.retrievedAt || '2026-11-13T16:12:00Z'),
    collectionCounts: reg?.collectionCounts || {},
    totalGranules: Number(reg?.totalGranules || granules.length),
    granules
  };
}

/**
 * Ranks pre/post acquisition pairs and native GUNW/GOFF pairs around an event date.
 * Explains track/frame/direction compatibility and temporal baseline in plain language.
 */
export function rankPrePostEventPairs(
  granules: NisarCatalogGranule[],
  eventDateIso: string
): RankedEventPair[] {
  const eventMs = Date.parse(eventDateIso.includes('T') ? eventDateIso : `${eventDateIso}T12:00:00Z`);
  if (!Number.isFinite(eventMs)) return [];

  const results: RankedEventPair[] = [];

  // 1. Native paired products (GUNW / GOFF) whose reference & secondary span or sit near the event
  const pairedGranules = granules.filter(
    (g) =>
      g.parsed.valid &&
      g.parsed.isPairedProduct &&
      (g.parsed.productType === 'GUNW' || g.parsed.productType === 'GOFF')
  );

  for (const pg of pairedGranules) {
    const t1 = Date.parse(pg.parsed.startDateTimeUtc);
    const t2 = Date.parse(pg.parsed.secondaryStartDateTimeUtc || pg.timeEnd);
    if (!Number.isFinite(t1) || !Number.isFinite(t2)) continue;
    const baselineDays = Math.max(1, Math.round(Math.abs(t2 - t1) / 86_400_000));
    const spansEvent = t1 <= eventMs && t2 >= eventMs - 14 * 86_400_000;
    const distDays = Math.min(Math.abs(t1 - eventMs), Math.abs(t2 - eventMs)) / 86_400_000;

    let score = spansEvent ? 96 : Math.max(55, Math.round(90 - distDays * 0.4));
    if (baselineDays <= 12) score += 4;
    else if (baselineDays <= 24) score += 2;

    const warnings: string[] = [];
    if (pg.parsed.productType === 'GUNW' && baselineDays > 24) {
      warnings.push(
        `Longer temporal baseline (${baselineDays} days) increases L-band temporal decorrelation risk on steep or vegetated slopes.`
      );
    }
    if (pg.parsed.maturity === 'PROVISIONAL' || pg.parsed.maturity === 'BETA') {
      warnings.push(
        `${pg.parsed.maturity} product (${pg.parsed.crid}): ionospheric/tropospheric layers are provided in the HDF5 cube but not subtracted by default.`
      );
    }

    results.push({
      id: pg.granuleId,
      kind: pg.parsed.productType === 'GUNW' ? 'NATIVE_PAIR_GUNW' : 'NATIVE_PAIR_GOFF',
      preGranule: pg,
      score: Math.min(100, score),
      temporalBaselineDays: baselineDays,
      sameTrack: true,
      sameFrame: true,
      sameDirection: true,
      sameModeAndPol: true,
      insarCompatible: true,
      headline: `Native ${pg.parsed.productType} Pair • Track ${pg.parsed.relativeOrbitTrack}${pg.parsed.orbitDirection} Frame ${pg.parsed.frame} (${baselineDays}d baseline)`,
      explanation: spansEvent
        ? `Directly spans or brackets the ${eventDateIso.slice(0, 10)} target window on identical orbital geometry (Track ${pg.parsed.relativeOrbitTrack}${pg.parsed.orbitDirection}, Frame ${pg.parsed.frame}, ${pg.parsed.polarizationCode}).`
        : `Co-registered ${pg.parsed.productType} interferometric/offset pair on Track ${pg.parsed.relativeOrbitTrack}${pg.parsed.orbitDirection}, Frame ${pg.parsed.frame} (${pg.parsed.startDateTimeUtc.slice(0, 10)} → ${(pg.parsed.secondaryStartDateTimeUtc || pg.timeEnd).slice(0, 10)}).`,
      warnings
    });
  }

  // 2. Single-acquisition GCOV / GSLC pairs bracketing or adjacent to the event date
  const singleGcov = granules.filter(
    (g) => g.parsed.valid && !g.parsed.isPairedProduct && (g.parsed.productType === 'GCOV' || g.parsed.productType === 'GSLC')
  );

  for (let i = 0; i < singleGcov.length; i++) {
    for (let j = i + 1; j < singleGcov.length; j++) {
      const a = singleGcov[i];
      const b = singleGcov[j];
      if (a.parsed.productType !== b.parsed.productType) continue;

      const ta = Date.parse(a.timeStart);
      const tb = Date.parse(b.timeStart);
      if (!Number.isFinite(ta) || !Number.isFinite(tb)) continue;

      const [pre, post, tPre, tPost] = ta <= tb ? [a, b, ta, tb] : [b, a, tb, ta];
      const baselineDays = Math.round((tPost - tPre) / 86_400_000);
      if (baselineDays < 6 || baselineDays > 90) continue;

      const sameTrack = pre.parsed.relativeOrbitTrack === post.parsed.relativeOrbitTrack;
      const sameFrame = pre.parsed.frame === post.parsed.frame;
      const sameDirection = pre.parsed.orbitDirection === post.parsed.orbitDirection;
      const sameModeAndPol =
        pre.parsed.modeBandwidthCode === post.parsed.modeBandwidthCode &&
        pre.parsed.polarizationCode === post.parsed.polarizationCode;

      // Only include pairs with at least same direction or same track to avoid noise
      if (!sameDirection) continue;

      const bracketsEvent = tPre <= eventMs + 2 * 86_400_000 && tPost >= eventMs - 2 * 86_400_000;
      let score = 50;
      if (sameTrack) score += 20;
      if (sameFrame) score += 15;
      if (sameModeAndPol) score += 10;
      if (bracketsEvent) score += 15;
      if (baselineDays === 12) score += 8;
      else if (baselineDays <= 24) score += 4;

      const warnings: string[] = [];
      if (!sameTrack || !sameFrame) {
        warnings.push(
          `Geometry mismatch (Track ${pre.parsed.relativeOrbitTrack}/Frame ${pre.parsed.frame} vs Track ${post.parsed.relativeOrbitTrack}/Frame ${post.parsed.frame}): incompatible for InSAR phase; incidence-angle differences will bias backscatter log-ratio.`
        );
      }
      if (!sameModeAndPol) {
        warnings.push(
          `Mode/polarization mismatch (${pre.parsed.modeBandwidthCode}/${pre.parsed.polarizationCode} vs ${post.parsed.modeBandwidthCode}/${post.parsed.polarizationCode}): compare only shared polarization channels.`
        );
      }

      results.push({
        id: `${pre.granuleId}__${post.granuleId}`,
        kind: 'SINGLE_PAIR_GCOV',
        preGranule: pre,
        postGranule: post,
        score: Math.min(99, score),
        temporalBaselineDays: baselineDays,
        sameTrack,
        sameFrame,
        sameDirection,
        sameModeAndPol,
        insarCompatible: sameTrack && sameFrame && sameDirection && sameModeAndPol,
        headline: `${pre.parsed.productType} Pair • ${pre.timeStart.slice(0, 10)} → ${post.timeStart.slice(0, 10)} (${baselineDays}d, Track ${pre.parsed.relativeOrbitTrack}${pre.parsed.orbitDirection})`,
        explanation:
          sameTrack && sameFrame
            ? `Exact repeat-pass geometry (Track ${pre.parsed.relativeOrbitTrack}${pre.parsed.orbitDirection}, Frame ${pre.parsed.frame}, ${pre.parsed.polarizationCode}) with ${baselineDays}-day separation${bracketsEvent ? ' bracketing the target date' : ''}.`
            : `Adjacent-track comparison (${baselineDays} days apart); use only for qualitative browse inspection due to incidence-angle change.`,
        warnings
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 12);
}

/**
 * Generates an official ASF Vertex deep link for a bounding box and date window.
 */
export function buildAsfVertexDeepLink(
  bboxStr: string,
  startDate = '2025-11-01',
  endDate = '2026-11-15'
): string {
  const [w, s, e, n] = bboxStr.split(',').map((v) => Number.parseFloat(v.trim()));
  const poly = `POLYGON((${w} ${s},${e} ${s},${e} ${n},${w} ${n},${w} ${s}))`;
  return `https://search.asf.alaska.edu/#/?dataset=NISAR&polygon=${encodeURIComponent(poly)}&start=${encodeURIComponent(startDate)}T00:00:00Z&end=${encodeURIComponent(endDate)}T23:59:59Z`;
}

/**
 * Generates an official NASA Earthdata Search deep link with collection short name and spatial box.
 */
export function buildEarthdataSearchDeepLink(
  collectionShortName = 'NISAR_L2_GCOV_PROVISIONAL_V1',
  bboxStr = '85.20,28.05,85.65,28.45'
): string {
  return `https://search.earthdata.nasa.gov/search?q=${encodeURIComponent(collectionShortName)}&sb[0]=${encodeURIComponent(bboxStr)}`;
}

/**
 * Builds a reproducible Python asf_search + CLI pipeline command snippet for selected granules.
 */
export function buildAsfDownloadSnippet(
  aoiId: string,
  granules: NisarCatalogGranule[]
): string {
  const ids = granules.slice(0, 2).map((g) => g.granuleId);
  const idList = ids.map((id) => `"${id}"`).join(', ');
  return `# 1. Reproducible ASF Earthdata Download & Local HDF5 Calibration (Requires free NASA Earthdata Login in ~/.netrc)
import asf_search as asf

results = asf.granule_search([${idList}])
print(f"Found {len(results)} NISAR HDF5 granules on ASF Earthdata Cloud")
session = asf.ASFSession() # Uses ~/.netrc (machine urs.earthdata.nasa.gov)
results.download(path="data/raw/", session=session)

# 2. Crop to AOI (${aoiId}), extract calibrated GCOV dB / GUNW LOS + coherence masks, and write validated manifest:
# python3 pipeline/ingest_nisar.py process-gcov --input data/raw/${ids[0] || 'NISAR_L2_PR_GCOV.h5'}.h5 --aoi ${aoiId}`;
}
