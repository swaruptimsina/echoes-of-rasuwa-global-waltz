import type { DataClassification } from '../data/nisarProducts';

export type SafePaletteId = 'viridis' | 'cividis' | 'diverging_blue_orange';

export interface RoiBox {
  x0: number; // normalized [0, 1]
  y0: number;
  x1: number;
  y1: number;
}

export interface ChangeDetectionOptions {
  /** Manual threshold in dB (used when useRoiCalibration is false) */
  manualThresholdDb: number;
  /** Whether to calibrate threshold from stable ROI statistics: |mean| + k * std */
  useRoiCalibration: boolean;
  /** Stable reference ROI box in normalized coordinates [0, 1] */
  stableRoi: RoiBox;
  /** Multiplier k on stable-ROI standard deviation (default 2.0) */
  sigmaMultiplier: number;
  /** Minimum mapping unit in pixels (patches smaller than this are filtered as speckle) */
  mmuPixels: number;
  /** Pixel ground spacing in meters (east-west, north-south) */
  pixelSpacingMeters: [number, number];
}

export interface ChangePatch {
  id: number;
  changeClass: -1 | 1; // -1 = backscatter loss (e.g. smooth water/inundation), +1 = backscatter gain (e.g. rough debris/double-bounce)
  pixelCount: number;
  areaKm2: number;
  centroidNorm: [number, number];
  bboxNorm: [number, number, number, number];
  meanDeltaDb: number;
}

export interface ContourSegment {
  x1: number; // grid coordinates [0, width]
  y1: number; // grid coordinates [0, height]
  x2: number;
  y2: number;
  changeClass: -1 | 1;
}

export interface ChangeDetectionResult {
  width: number;
  height: number;
  deltaDb: Float32Array;
  classifiedMask: Int8Array; // -1 = loss, 0 = stable/filtered, +1 = gain
  effectiveThresholdDb: number;
  roiStats: {
    meanDb: number;
    stdDb: number;
    sampleCount: number;
  };
  lossAreaKm2: number;
  gainAreaKm2: number;
  totalChangedAreaKm2: number;
  uncertaintyKm2: number;
  lossPatchCount: number;
  gainPatchCount: number;
  filteredSpecklePixels: number;
  patches: ChangePatch[];
  contours: ContourSegment[];
  uncertaintySources: string[];
}

export interface TransectSample {
  index: number;
  fraction: number;
  distanceMeters: number;
  normX: number;
  normY: number;
  rawLosMeters: number;
  relativeLosMeters: number;
  coherence: number;
  wrappedPhaseRad: number;
  isCoherent: boolean;
  beforeBackscatterDb: number;
  afterBackscatterDb: number;
  deltaBackscatterDb: number;
}

export interface TransectProfileResult {
  samples: TransectSample[];
  referencePointNorm: [number, number];
  referenceLosMeters: number;
  totalLengthMeters: number;
  maxAbsRelativeLosMeters: number;
  meanCoherence: number;
  unreliableFraction: number;
}

export interface SyntheticAoiRasterBundle {
  aoiId: string;
  classification: DataClassification;
  width: number;
  height: number;
  bbox: [number, number, number, number]; // [west, south, east, north]
  pixelSpacingMeters: [number, number];
  beforeDate: string;
  afterDate: string;
  beforeHhDb: Float32Array;
  afterHhDb: Float32Array;
  beforeHvDb: Float32Array;
  afterHvDb: Float32Array;
  losDisplacementM: Float32Array;
  coherence: Float32Array;
  defaultStableRoi: RoiBox;
  defaultTransect: {
    start: [number, number];
    end: [number, number];
    ref: [number, number];
  };
  physicalNarrative: string;
}

/**
 * Compute stable-area ROI mean and standard deviation on a delta-dB grid.
 */
export function computeRoiStats(
  deltaDb: Float32Array,
  width: number,
  height: number,
  roi: RoiBox
): { meanDb: number; stdDb: number; sampleCount: number } {
  const c0 = Math.max(0, Math.min(width - 1, Math.floor(Math.min(roi.x0, roi.x1) * width)));
  const c1 = Math.max(c0, Math.min(width - 1, Math.ceil(Math.max(roi.x0, roi.x1) * width)));
  const r0 = Math.max(0, Math.min(height - 1, Math.floor(Math.min(roi.y0, roi.y1) * height)));
  const r1 = Math.max(r0, Math.min(height - 1, Math.ceil(Math.max(roi.y0, roi.y1) * height)));

  let sum = 0;
  let count = 0;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const v = deltaDb[r * width + c];
      if (Number.isFinite(v)) {
        sum += v;
        count++;
      }
    }
  }

  if (count === 0) {
    return { meanDb: 0, stdDb: 1.0, sampleCount: 0 };
  }

  const meanDb = sum / count;
  let sqDiffSum = 0;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const v = deltaDb[r * width + c];
      if (Number.isFinite(v)) {
        const d = v - meanDb;
        sqDiffSum += d * d;
      }
    }
  }
  const variance = count > 1 ? sqDiffSum / (count - 1) : 0;
  return {
    meanDb: Number(meanDb.toFixed(4)),
    stdDb: Number(Math.sqrt(variance).toFixed(4)),
    sampleCount: count,
  };
}

/**
 * Trace Marching Squares contour segments around pixels matching targetClass (-1 or +1).
 */
export function traceMarchingSquaresContours(
  classifiedMask: Int8Array,
  width: number,
  height: number,
  targetClass: -1 | 1
): ContourSegment[] {
  const segments: ContourSegment[] = [];

  for (let r = 0; r < height - 1; r++) {
    for (let c = 0; c < width - 1; c++) {
      const tl = classifiedMask[r * width + c] === targetClass ? 1 : 0;
      const tr = classifiedMask[r * width + (c + 1)] === targetClass ? 1 : 0;
      const br = classifiedMask[(r + 1) * width + (c + 1)] === targetClass ? 1 : 0;
      const bl = classifiedMask[(r + 1) * width + c] === targetClass ? 1 : 0;

      const state = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (state === 0 || state === 15) continue;

      const top: [number, number] = [c + 0.5, r];
      const right: [number, number] = [c + 1, r + 0.5];
      const bottom: [number, number] = [c + 0.5, r + 1];
      const left: [number, number] = [c, r + 0.5];

      const addSeg = (p1: [number, number], p2: [number, number]) => {
        segments.push({
          x1: p1[0],
          y1: p1[1],
          x2: p2[0],
          y2: p2[1],
          changeClass: targetClass,
        });
      };

      switch (state) {
        case 1:
        case 14:
          addSeg(left, bottom);
          break;
        case 2:
        case 13:
          addSeg(bottom, right);
          break;
        case 3:
        case 12:
          addSeg(left, right);
          break;
        case 4:
        case 11:
          addSeg(top, right);
          break;
        case 5:
          addSeg(left, top);
          addSeg(bottom, right);
          break;
        case 6:
        case 9:
          addSeg(top, bottom);
          break;
        case 7:
        case 8:
          addSeg(left, top);
          break;
        case 10:
          addSeg(top, right);
          addSeg(left, bottom);
          break;
      }
    }
  }

  return segments;
}

/**
 * Perform log-ratio / dB backscatter change detection between two co-registered grids,
 * with optional stable-ROI noise calibration, MMU connected-component speckle filtering,
 * area uncertainty estimation, and Marching Squares contour extraction.
 */
export function computeBackscatterChangeRaster(
  beforeDb: Float32Array,
  afterDb: Float32Array,
  width: number,
  height: number,
  options: ChangeDetectionOptions
): ChangeDetectionResult {
  if (beforeDb.length !== width * height || afterDb.length !== width * height) {
    throw new Error(`Input raster dimensions do not match width*height (${width}x${height}).`);
  }

  const n = width * height;
  const deltaDb = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const b = beforeDb[i];
    const a = afterDb[i];
    deltaDb[i] = Number.isFinite(b) && Number.isFinite(a) ? a - b : NaN;
  }

  const roiStats = computeRoiStats(deltaDb, width, height, options.stableRoi);
  const calibratedThreshold = Math.max(
    0.5,
    Math.abs(roiStats.meanDb) + Math.max(0.5, options.sigmaMultiplier) * Math.max(0.15, roiStats.stdDb)
  );
  const effectiveThresholdDb = Number(
    (options.useRoiCalibration ? calibratedThreshold : Math.max(0.25, options.manualThresholdDb)).toFixed(2)
  );

  // Initial raw threshold mask
  const rawMask = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    const d = deltaDb[i];
    if (!Number.isFinite(d)) {
      rawMask[i] = 0;
    } else if (d <= -effectiveThresholdDb) {
      rawMask[i] = -1;
    } else if (d >= effectiveThresholdDb) {
      rawMask[i] = 1;
    } else {
      rawMask[i] = 0;
    }
  }

  // Connected-components labeling (4-neighbor) + Minimum Mapping Unit (MMU) filter
  const visited = new Uint8Array(n);
  const classifiedMask = new Int8Array(n);
  const patches: ChangePatch[] = [];
  let filteredSpecklePixels = 0;
  let nextPatchId = 1;

  const pixelAreaKm2 =
    (Math.max(1, options.pixelSpacingMeters[0]) * Math.max(1, options.pixelSpacingMeters[1])) / 1_000_000;
  const mmu = Math.max(1, Math.round(options.mmuPixels));

  const queue = new Int32Array(n);
  for (let idx = 0; idx < n; idx++) {
    const cls = rawMask[idx];
    if (cls === 0 || visited[idx]) continue;

    let head = 0;
    let tail = 0;
    queue[tail++] = idx;
    visited[idx] = 1;

    const componentIndices: number[] = [];
    let sumX = 0;
    let sumY = 0;
    let sumDelta = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    while (head < tail) {
      const curr = queue[head++];
      componentIndices.push(curr);
      const r = Math.floor(curr / width);
      const c = curr % width;
      sumX += c;
      sumY += r;
      sumDelta += deltaDb[curr];
      if (c < minX) minX = c;
      if (c > maxX) maxX = c;
      if (r < minY) minY = r;
      if (r > maxY) maxY = r;

      const neighbors = [
        r > 0 ? (r - 1) * width + c : -1,
        r < height - 1 ? (r + 1) * width + c : -1,
        c > 0 ? r * width + (c - 1) : -1,
        c < width - 1 ? r * width + (c + 1) : -1,
      ];

      for (const nb of neighbors) {
        if (nb >= 0 && !visited[nb] && rawMask[nb] === cls) {
          visited[nb] = 1;
          queue[tail++] = nb;
        }
      }
    }

    if (componentIndices.length < mmu) {
      filteredSpecklePixels += componentIndices.length;
      continue;
    }

    for (const cIdx of componentIndices) {
      classifiedMask[cIdx] = cls as -1 | 1;
    }

    const pCount = componentIndices.length;
    patches.push({
      id: nextPatchId++,
      changeClass: cls as -1 | 1,
      pixelCount: pCount,
      areaKm2: Number((pCount * pixelAreaKm2).toFixed(4)),
      centroidNorm: [
        Number((sumX / pCount / width).toFixed(4)),
        Number((sumY / pCount / height).toFixed(4)),
      ],
      bboxNorm: [
        Number((minX / width).toFixed(4)),
        Number((minY / height).toFixed(4)),
        Number(((maxX + 1) / width).toFixed(4)),
        Number(((maxY + 1) / height).toFixed(4)),
      ],
      meanDeltaDb: Number((sumDelta / pCount).toFixed(2)),
    });
  }

  let lossPixels = 0;
  let gainPixels = 0;
  let boundaryPixels = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const i = r * width + c;
      const cls = classifiedMask[i];
      if (cls === -1) lossPixels++;
      else if (cls === 1) gainPixels++;
      if (cls !== 0) {
        const isEdge =
          r === 0 ||
          r === height - 1 ||
          c === 0 ||
          c === width - 1 ||
          classifiedMask[(r - 1) * width + c] !== cls ||
          classifiedMask[(r + 1) * width + c] !== cls ||
          classifiedMask[r * width + (c - 1)] !== cls ||
          classifiedMask[r * width + (c + 1)] !== cls;
        if (isEdge) boundaryPixels++;
      }
    }
  }

  const lossAreaKm2 = Number((lossPixels * pixelAreaKm2).toFixed(3));
  const gainAreaKm2 = Number((gainPixels * pixelAreaKm2).toFixed(3));
  const totalChangedAreaKm2 = Number((lossAreaKm2 + gainAreaKm2).toFixed(3));
  // Uncertainty combines boundary mixed-pixel margin (+/- 0.5 * perimeter pixels) + residual speckle noise floor (~12%)
  const perimeterUncertaintyKm2 = boundaryPixels * 0.5 * pixelAreaKm2;
  const uncertaintyKm2 = Number(
    Math.max(pixelAreaKm2, perimeterUncertaintyKm2 + totalChangedAreaKm2 * 0.12).toFixed(3)
  );

  const lossContours = traceMarchingSquaresContours(classifiedMask, width, height, -1);
  const gainContours = traceMarchingSquaresContours(classifiedMask, width, height, 1);

  return {
    width,
    height,
    deltaDb,
    classifiedMask,
    effectiveThresholdDb,
    roiStats,
    lossAreaKm2,
    gainAreaKm2,
    totalChangedAreaKm2,
    uncertaintyKm2,
    lossPatchCount: patches.filter((p) => p.changeClass === -1).length,
    gainPatchCount: patches.filter((p) => p.changeClass === 1).length,
    filteredSpecklePixels,
    patches: patches.sort((a, b) => b.areaKm2 - a.areaKm2),
    contours: [...lossContours, ...gainContours],
    uncertaintySources: [
      `Residual multiplicative speckle variance after ${mmu}-pixel Minimum Mapping Unit filter (${filteredSpecklePixels} isolated pixels suppressed).`,
      `Topographic foreshortening/layover and local incidence-angle variations where terrain slope approaches the radar look angle (~33°–47°).`,
      `Dielectric confounders: rainfall soil-moisture wetting, freeze–thaw transitions, or vegetation phenology shifts between pass dates.`,
    ],
  };
}

/**
 * Sample an InSAR Line-of-Sight (LOS) displacement & backscatter transect between two points,
 * always referenced relative to a user-selected reference point (never claiming absolute vertical motion).
 */
export function sampleLosTransect(
  losGridM: Float32Array,
  coherenceGrid: Float32Array,
  beforeDb: Float32Array,
  afterDb: Float32Array,
  width: number,
  height: number,
  startNorm: [number, number],
  endNorm: [number, number],
  refNorm: [number, number],
  extentMeters: [number, number],
  numSamples = 40,
  coherenceCutoff = 0.35,
  wavelengthMeters = 0.24 // NISAR L-band 24 cm
): TransectProfileResult {
  const sampleAt = (grid: Float32Array, nx: number, ny: number): number => {
    const c = Math.max(0, Math.min(width - 1, Math.round(nx * (width - 1))));
    const r = Math.max(0, Math.min(height - 1, Math.round(ny * (height - 1))));
    return grid[r * width + c];
  };

  const refLos = sampleAt(losGridM, refNorm[0], refNorm[1]);
  const referenceLosMeters = Number.isFinite(refLos) ? refLos : 0;

  const dxMeters = (endNorm[0] - startNorm[0]) * extentMeters[0];
  const dyMeters = (endNorm[1] - startNorm[1]) * extentMeters[1];
  const totalLengthMeters = Math.hypot(dxMeters, dyMeters);

  const samples: TransectSample[] = [];
  let maxAbsRel = 0;
  let cohSum = 0;
  let lowCohCount = 0;

  const count = Math.max(2, numSamples);
  for (let i = 0; i < count; i++) {
    const frac = i / (count - 1);
    const nx = startNorm[0] + frac * (endNorm[0] - startNorm[0]);
    const ny = startNorm[1] + frac * (endNorm[1] - startNorm[1]);

    const rawLos = sampleAt(losGridM, nx, ny);
    const relLos = Number.isFinite(rawLos) ? rawLos - referenceLosMeters : 0;
    const coh = Math.max(0, Math.min(1, sampleAt(coherenceGrid, nx, ny)));
    const bDb = sampleAt(beforeDb, nx, ny);
    const aDb = sampleAt(afterDb, nx, ny);

    // Wrapped phase in [-pi, pi): phi = ((4*pi / lambda) * relLos) wrapped
    const rawPhase = ((4 * Math.PI) / wavelengthMeters) * relLos;
    const wrappedPhaseRad = Math.atan2(Math.sin(rawPhase), Math.cos(rawPhase));
    const isCoherent = coh >= coherenceCutoff;

    if (!isCoherent) lowCohCount++;
    if (isCoherent && Math.abs(relLos) > maxAbsRel) {
      maxAbsRel = Math.abs(relLos);
    }
    cohSum += coh;

    samples.push({
      index: i,
      fraction: Number(frac.toFixed(4)),
      distanceMeters: Number((frac * totalLengthMeters).toFixed(1)),
      normX: Number(nx.toFixed(4)),
      normY: Number(ny.toFixed(4)),
      rawLosMeters: Number(rawLos.toFixed(4)),
      relativeLosMeters: Number(relLos.toFixed(4)),
      coherence: Number(coh.toFixed(3)),
      wrappedPhaseRad: Number(wrappedPhaseRad.toFixed(3)),
      isCoherent,
      beforeBackscatterDb: Number(bDb.toFixed(2)),
      afterBackscatterDb: Number(aDb.toFixed(2)),
      deltaBackscatterDb: Number((aDb - bDb).toFixed(2)),
    });
  }

  return {
    samples,
    referencePointNorm: refNorm,
    referenceLosMeters: Number(referenceLosMeters.toFixed(4)),
    totalLengthMeters: Number(totalLengthMeters.toFixed(1)),
    maxAbsRelativeLosMeters: Number(maxAbsRel.toFixed(4)),
    meanCoherence: Number((cohSum / count).toFixed(3)),
    unreliableFraction: Number((lowCohCount / count).toFixed(3)),
  };
}

/**
 * Evaluate color-blind-safe colormaps (Viridis, Cividis, Diverging Blue-Orange).
 * Never uses red-green encoding.
 */
export function evaluateSafePalette(value01: number, palette: SafePaletteId): [number, number, number] {
  const t = Math.max(0, Math.min(1, Number.isFinite(value01) ? value01 : 0));

  const lerpStops = (stops: Array<[number, number, number]>): [number, number, number] => {
    const scaled = t * (stops.length - 1);
    const idx = Math.min(stops.length - 2, Math.floor(scaled));
    const frac = scaled - idx;
    const a = stops[idx];
    const b = stops[idx + 1];
    return [
      Math.round(a[0] + (b[0] - a[0]) * frac),
      Math.round(a[1] + (b[1] - a[1]) * frac),
      Math.round(a[2] + (b[2] - a[2]) * frac),
    ];
  };

  if (palette === 'cividis') {
    return lerpStops([
      [0, 32, 76],
      [49, 68, 107],
      [102, 105, 112],
      [159, 146, 112],
      [219, 193, 100],
      [253, 234, 69],
    ]);
  }

  if (palette === 'diverging_blue_orange') {
    // Color-blind-safe Blue (negative/loss) -> Neutral Slate/Ivory (zero) -> Amber/Orange (positive/gain)
    return lerpStops([
      [16, 78, 139],
      [58, 134, 196],
      [148, 193, 228],
      [236, 238, 240],
      [246, 193, 119],
      [230, 126, 34],
      [168, 62, 12],
    ]);
  }

  // Default: Viridis
  return lerpStops([
    [68, 1, 84],
    [59, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
  ]);
}

/**
 * Generate deterministic, physically grounded synthetic raster bundles for each AOI
 * so the interactive workbench can run real numeric change detection, ROI calibration,
 * and LOS transect profiling in the browser. Explicitly tagged as TEST_FIXTURE.
 */
export function generateDeterministicAoiRasters(
  aoiId: string,
  width = 72,
  height = 48
): SyntheticAoiRasterBundle {
  const n = width * height;
  const beforeHhDb = new Float32Array(n);
  const afterHhDb = new Float32Array(n);
  const beforeHvDb = new Float32Array(n);
  const afterHvDb = new Float32Array(n);
  const losDisplacementM = new Float32Array(n);
  const coherence = new Float32Array(n);

  // Deterministic pseudo-random speckle helper in [-1, 1]
  const hashNoise = (r: number, c: number, seed: number): number => {
    const s = Math.sin((r * 131.7 + c * 293.3 + seed * 71.9) * 0.17) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };

  for (let r = 0; r < height; r++) {
    const ny = r / (height - 1);
    for (let c = 0; c < width; c++) {
      const nx = c / (width - 1);
      const i = r * width + c;
      const n1 = hashNoise(r, c, 1) * 0.65;
      const n2 = hashNoise(r, c, 2) * 0.65;

      if (aoiId === 'hubbard_glacier') {
        // Glacier terminus + Yakutat Bay fjord
        const distToChannel = Math.abs(nx - (0.48 + 0.14 * Math.sin(ny * Math.PI * 1.4)));
        const baseHh = distToChannel < 0.18 ? -9.5 : -13.2;
        beforeHhDb[i] = baseHh + n1;
        beforeHvDb[i] = baseHh - 6.5 + n1 * 0.8;
        // Coseismic / post-earthquake ice fracturing (+dB gain) + meltwater lead (-dB loss)
        const fractureLobe = Math.exp(-((nx - 0.52) ** 2 / 0.018 + (ny - 0.46) ** 2 / 0.025));
        const leadLobe = Math.exp(-((nx - 0.31) ** 2 / 0.01 + (ny - 0.68) ** 2 / 0.016));
        const delta = fractureLobe * 4.8 - leadLobe * 4.4 + n2 * 0.7;
        afterHhDb[i] = beforeHhDb[i] + delta;
        afterHvDb[i] = beforeHvDb[i] + delta * 0.85;
        losDisplacementM[i] =
          -0.28 * fractureLobe + 0.09 * Math.sin(nx * 4) * Math.cos(ny * 3) + n1 * 0.008;
        coherence[i] = Math.max(0.18, Math.min(0.95, 0.84 - fractureLobe * 0.42 - leadLobe * 0.55));
      } else if (aoiId === 'pantanal_brazil') {
        // Wetland floodplain: specular open water (-dB) vs flooded forest double-bounce (+dB)
        const riverSpine = Math.abs(ny - (0.5 + 0.18 * Math.sin(nx * Math.PI * 2)));
        const baseHh = riverSpine < 0.08 ? -18.5 : -11.4;
        beforeHhDb[i] = baseHh + n1;
        beforeHvDb[i] = baseHh - 5.2 + n1 * 0.7;
        const openFloodLobe = Math.exp(-((nx - 0.36) ** 2 / 0.028 + (ny - 0.52) ** 2 / 0.024));
        const canopyBounceLobe = Math.exp(-((nx - 0.68) ** 2 / 0.025 + (ny - 0.44) ** 2 / 0.026));
        const delta = -openFloodLobe * 5.6 + canopyBounceLobe * 4.9 + n2 * 0.6;
        afterHhDb[i] = beforeHhDb[i] + delta;
        // Note: HV stays high in canopy but drops in open flood
        afterHvDb[i] = beforeHvDb[i] - openFloodLobe * 4.8 + canopyBounceLobe * 1.4;
        losDisplacementM[i] = 0.04 * canopyBounceLobe - 0.02 * openFloodLobe + n1 * 0.005;
        coherence[i] = Math.max(0.15, Math.min(0.92, 0.78 - openFloodLobe * 0.58 + canopyBounceLobe * 0.06));
      } else if (aoiId === 'san_joaquin_usa') {
        // Agricultural subsidence bowl + irrigation backscatter change
        const bowl = Math.exp(-((nx - 0.52) ** 2 / 0.055 + (ny - 0.5) ** 2 / 0.045));
        const fieldPatch = Math.exp(-((nx - 0.32) ** 2 / 0.014 + (ny - 0.38) ** 2 / 0.014));
        const harvestPatch = Math.exp(-((nx - 0.68) ** 2 / 0.015 + (ny - 0.64) ** 2 / 0.015));
        beforeHhDb[i] = -12.0 + Math.sin(nx * 18) * 0.9 + n1 * 0.5;
        beforeHvDb[i] = -18.2 + Math.cos(ny * 18) * 0.8 + n1 * 0.5;
        afterHhDb[i] = beforeHhDb[i] + fieldPatch * 4.1 - harvestPatch * 3.9 + n2 * 0.45;
        afterHvDb[i] = beforeHvDb[i] + fieldPatch * 3.6 - harvestPatch * 3.5 + n2 * 0.45;
        losDisplacementM[i] = -0.19 * bowl + n1 * 0.004;
        coherence[i] = Math.max(0.35, Math.min(0.96, 0.88 - 0.22 * (fieldPatch + harvestPatch)));
      } else if (aoiId === 'hatay_turkiye') {
        // Strike-slip fault rupture antisymmetric LOS + urban corridor coherence drop
        const faultLine = nx - (0.48 + (ny - 0.5) * 0.28);
        const distFault = Math.abs(faultLine);
        const ruptureEnvelope = Math.exp(-(distFault ** 2) / 0.03) * Math.exp(-((ny - 0.5) ** 2) / 0.09);
        const sign = faultLine >= 0 ? 1 : -1;
        const damageCorridor = Math.exp(-(distFault ** 2) / 0.0045) * Math.exp(-((ny - 0.5) ** 2) / 0.05);
        beforeHhDb[i] = -8.8 + n1 * 0.55;
        beforeHvDb[i] = -15.0 + n1 * 0.55;
        afterHhDb[i] = beforeHhDb[i] - damageCorridor * 4.6 + (ruptureEnvelope * 2.9 * (sign > 0 ? 1 : 0)) + n2 * 0.55;
        afterHvDb[i] = beforeHvDb[i] + damageCorridor * 3.4 + n2 * 0.5;
        losDisplacementM[i] = sign * 0.34 * ruptureEnvelope + n1 * 0.006;
        coherence[i] = Math.max(0.14, Math.min(0.94, 0.86 - damageCorridor * 0.65));
      } else if (aoiId === 'yukon_alaska') {
        // Active-layer permafrost thaw subsidence + thermokarst lake expansion
        const lakeLobe = Math.exp(-((nx - 0.42) ** 2 / 0.02 + (ny - 0.55) ** 2 / 0.02));
        const thawSlope = Math.exp(-((nx - 0.64) ** 2 / 0.03 + (ny - 0.42) ** 2 / 0.028));
        beforeHhDb[i] = -12.6 + n1 * 0.6;
        beforeHvDb[i] = -18.4 + n1 * 0.6;
        afterHhDb[i] = beforeHhDb[i] - lakeLobe * 5.1 + thawSlope * 3.8 + n2 * 0.55;
        afterHvDb[i] = beforeHvDb[i] - lakeLobe * 4.2 + thawSlope * 2.9 + n2 * 0.55;
        losDisplacementM[i] = -0.11 * (lakeLobe * 0.6 + thawSlope) + n1 * 0.005;
        coherence[i] = Math.max(0.22, Math.min(0.92, 0.82 - lakeLobe * 0.52 - thawSlope * 0.18));
      } else {
        // Default: rasuwa_nepal — Trishuli gorge inundation (-dB specular loss) + Timure/Chilime debris fan (+dB rough backscatter gain) + slope LOS deformation
        const valleyAxis = 0.48 + 0.12 * Math.sin(ny * Math.PI * 1.5);
        const distValley = Math.abs(nx - valleyAxis);
        const baseHh = distValley < 0.09 ? -14.2 : -9.8 - distValley * 4.0;
        beforeHhDb[i] = baseHh + n1;
        beforeHvDb[i] = baseHh - 6.0 + n1 * 0.8;

        // Inundation pocket along valley floor (specular drop in HH & HV)
        const floodPocket = Math.exp(-((nx - valleyAxis) ** 2 / 0.007 + (ny - 0.62) ** 2 / 0.032));
        // Rough landslide / debris fan on eastern gorge wall (+dB increase in HH & HV)
        const debrisLobe = Math.exp(-((nx - (valleyAxis + 0.14)) ** 2 / 0.012 + (ny - 0.38) ** 2 / 0.024));

        const deltaHh = -floodPocket * 5.8 + debrisLobe * 4.9 + n2 * 0.65;
        const deltaHv = -floodPocket * 4.5 + debrisLobe * 5.2 + n2 * 0.6;

        afterHhDb[i] = beforeHhDb[i] + deltaHh;
        afterHvDb[i] = beforeHvDb[i] + deltaHv;
        losDisplacementM[i] = -0.16 * debrisLobe - 0.04 * floodPocket + n1 * 0.005;
        coherence[i] = Math.max(0.16, Math.min(0.94, 0.85 - floodPocket * 0.56 - debrisLobe * 0.44));
      }
    }
  }

  const metadataByAoi: Record<
    string,
    {
      bbox: [number, number, number, number];
      pixelSpacingMeters: [number, number];
      beforeDate: string;
      afterDate: string;
      narrative: string;
    }
  > = {
    rasuwa_nepal: {
      bbox: [85.2, 28.05, 85.45, 28.3],
      pixelSpacingMeters: [120, 120],
      beforeDate: '2026-08-06',
      afterDate: '2026-08-30',
      narrative:
        'Synthetic TEST_FIXTURE co-registered to the Rasuwa–Trishuli corridor (120 m grid). Models valley-floor specular inundation (-dB backscatter loss) alongside rough debris-lobe scattering (+dB gain) and relative Line-of-Sight slope motion.',
    },
    hubbard_glacier: {
      bbox: [-139.65, 59.85, -139.25, 60.15],
      pixelSpacingMeters: [150, 150],
      beforeDate: '2025-11-26',
      afterDate: '2025-12-08',
      narrative:
        'Synthetic TEST_FIXTURE companion grid paired with the real NASA Earth Observatory NISAR Hubbard Glacier reference images (Nov 26 vs Dec 8, 2025 across the Dec 6 Mw 7.0 earthquake).',
    },
    pantanal_brazil: {
      bbox: [-57.6, -17.9, -56.9, -17.2],
      pixelSpacingMeters: [180, 180],
      beforeDate: '2026-01-12',
      afterDate: '2026-02-17',
      narrative:
        'Synthetic TEST_FIXTURE illustrating L-band canopy penetration in the Pantanal: open floodwater causes specular backscatter loss (-dB), whereas flooded gallery forest produces strong trunk–water double-bounce gain (+dB in HH).',
    },
    san_joaquin_usa: {
      bbox: [-120.2, 36.0, -119.3, 36.8],
      pixelSpacingMeters: [200, 200],
      beforeDate: '2026-01-09',
      afterDate: '2026-02-14',
      narrative:
        'Synthetic TEST_FIXTURE illustrating high-coherence L-band InSAR aquifer subsidence bowl (-LOS displacement) alongside parcel-scale agricultural harvesting and irrigation backscatter shifts.',
    },
    hatay_turkiye: {
      bbox: [36.0, 36.1, 36.6, 36.7],
      pixelSpacingMeters: [150, 150],
      beforeDate: '2026-01-01',
      afterDate: '2026-02-06',
      narrative:
        'Synthetic TEST_FIXTURE illustrating antisymmetric strike-slip fault LOS phase gradient across a fault trace with localized low-coherence decorrelation along the rupture axis.',
    },
    yukon_alaska: {
      bbox: [-164.6, 61.9, -162.8, 63.1],
      pixelSpacingMeters: [180, 180],
      beforeDate: '2026-01-02',
      afterDate: '2026-02-07',
      narrative:
        'Synthetic TEST_FIXTURE illustrating seasonal active-layer permafrost thaw subsidence (-LOS) and thermokarst lake expansion (-dB specular loss).',
    },
  };

  const meta = metadataByAoi[aoiId] ?? metadataByAoi.rasuwa_nepal;

  return {
    aoiId,
    classification: 'TEST_FIXTURE',
    width,
    height,
    bbox: meta.bbox,
    pixelSpacingMeters: meta.pixelSpacingMeters,
    beforeDate: meta.beforeDate,
    afterDate: meta.afterDate,
    beforeHhDb,
    afterHhDb,
    beforeHvDb,
    afterHvDb,
    losDisplacementM,
    coherence,
    defaultStableRoi: { x0: 0.06, y0: 0.08, x1: 0.24, y1: 0.28 },
    defaultTransect: {
      start: [0.18, 0.28],
      end: [0.82, 0.68],
      ref: [0.15, 0.18],
    },
    physicalNarrative: meta.narrative,
  };
}

/**
 * Export detected change patches as a GeoJSON FeatureCollection with provenance properties.
 */
export function exportChangePolygonsToGeoJSON(
  result: ChangeDetectionResult,
  bbox: [number, number, number, number],
  metadata: {
    aoiId: string;
    beforeDate: string;
    afterDate: string;
    classification: DataClassification;
    granuleBefore?: string;
    granuleAfter?: string;
  }
): string {
  const [west, south, east, north] = bbox;
  const lonSpan = east - west;
  const latSpan = north - south;

  const features = result.patches.map((patch) => {
    const [nx0, ny0, nx1, ny1] = patch.bboxNorm;
    const x0 = Number((west + nx0 * lonSpan).toFixed(5));
    const x1 = Number((west + nx1 * lonSpan).toFixed(5));
    // Note: grid row 0 is north, row height-1 is south
    const yNorth = Number((north - ny0 * latSpan).toFixed(5));
    const ySouth = Number((north - ny1 * latSpan).toFixed(5));

    return {
      type: 'Feature',
      id: `patch-${patch.id}`,
      properties: {
        patchId: patch.id,
        changeDirection: patch.changeClass === -1 ? 'BACKSCATTER_LOSS_DB' : 'BACKSCATTER_GAIN_DB',
        areaKm2: patch.areaKm2,
        pixelCount: patch.pixelCount,
        meanDeltaDb: patch.meanDeltaDb,
        effectiveThresholdDb: result.effectiveThresholdDb,
        aoiId: metadata.aoiId,
        beforeDate: metadata.beforeDate,
        afterDate: metadata.afterDate,
        dataClassification: metadata.classification,
        granuleBefore: metadata.granuleBefore ?? 'N/A',
        granuleAfter: metadata.granuleAfter ?? 'N/A',
        disclaimer:
          'Backscatter change polygon requires ancillary optical/DEM/field verification before attributing to a unique physical hazard.',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [x0, yNorth],
            [x1, yNorth],
            [x1, ySouth],
            [x0, ySouth],
            [x0, yNorth],
          ],
        ],
      },
    };
  });

  return JSON.stringify(
    {
      type: 'FeatureCollection',
      metadata: {
        generatedAt: new Date().toISOString(),
        aoiId: metadata.aoiId,
        classification: metadata.classification,
        lossAreaKm2: result.lossAreaKm2,
        gainAreaKm2: result.gainAreaKm2,
        totalChangedAreaKm2: result.totalChangedAreaKm2,
        uncertaintyKm2: result.uncertaintyKm2,
        uncertaintySources: result.uncertaintySources,
      },
      features,
    },
    null,
    2
  );
}

/**
 * Export transect profile samples to CSV format.
 */
export function exportTransectToCsv(profile: TransectProfileResult, aoiId: string): string {
  const header = [
    'sample_index',
    'aoi_id',
    'distance_m',
    'norm_x',
    'norm_y',
    'raw_los_m',
    'relative_los_m_vs_ref',
    'coherence',
    'is_coherent',
    'wrapped_phase_rad',
    'before_db',
    'after_db',
    'delta_db',
  ].join(',');

  const rows = profile.samples.map((s) =>
    [
      s.index,
      aoiId,
      s.distanceMeters,
      s.normX,
      s.normY,
      s.rawLosMeters,
      s.relativeLosMeters,
      s.coherence,
      s.isCoherent,
      s.wrappedPhaseRad,
      s.beforeBackscatterDb,
      s.afterBackscatterDb,
      s.deltaBackscatterDb,
    ].join(',')
  );

  return [header, ...rows].join('\n');
}

export interface WorkbenchPermalinkState {
  aoiId: string;
  compareMode: 'swipe' | 'flicker' | 'opacity' | 'side_by_side';
  polarization: 'HH' | 'HV' | 'HH_HV_RATIO' | 'GUNW_LOS';
  thresholdDb: number;
  useRoiCalibration: boolean;
  mmuPixels: number;
  palette: SafePaletteId;
}

export function encodeWorkbenchPermalinkHash(state: WorkbenchPermalinkState): string {
  const params = new URLSearchParams();
  params.set('wb_aoi', state.aoiId);
  params.set('wb_mode', state.compareMode);
  params.set('wb_pol', state.polarization);
  params.set('wb_thr', state.thresholdDb.toFixed(2));
  params.set('wb_roi', state.useRoiCalibration ? '1' : '0');
  params.set('wb_mmu', String(state.mmuPixels));
  params.set('wb_pal', state.palette);
  return `#workbench?${params.toString()}`;
}

export function decodeWorkbenchPermalinkHash(hash: string): Partial<WorkbenchPermalinkState> | null {
  if (!hash || !hash.includes('wb_')) return null;
  const qIndex = hash.indexOf('?');
  const query = qIndex >= 0 ? hash.slice(qIndex + 1) : hash.replace(/^#/, '');
  const params = new URLSearchParams(query);
  const aoiId = params.get('wb_aoi') || undefined;
  const compareMode = params.get('wb_mode') as WorkbenchPermalinkState['compareMode'] | null;
  const polarization = params.get('wb_pol') as WorkbenchPermalinkState['polarization'] | null;
  const thrRaw = params.get('wb_thr');
  const roiRaw = params.get('wb_roi');
  const mmuRaw = params.get('wb_mmu');
  const palette = params.get('wb_pal') as SafePaletteId | null;

  return {
    ...(aoiId ? { aoiId } : {}),
    ...(compareMode && ['swipe', 'flicker', 'opacity', 'side_by_side'].includes(compareMode)
      ? { compareMode }
      : {}),
    ...(polarization && ['HH', 'HV', 'HH_HV_RATIO', 'GUNW_LOS'].includes(polarization)
      ? { polarization }
      : {}),
    ...(thrRaw && Number.isFinite(Number(thrRaw)) ? { thresholdDb: Number(thrRaw) } : {}),
    ...(roiRaw !== null ? { useRoiCalibration: roiRaw === '1' } : {}),
    ...(mmuRaw && Number.isFinite(Number(mmuRaw)) ? { mmuPixels: Number(mmuRaw) } : {}),
    ...(palette && ['viridis', 'cividis', 'diverging_blue_orange'].includes(palette) ? { palette } : {}),
  };
}

/**
 * Generate a plain-language screen-reader summary of the active map change detection state.
 */
export function generateScreenReaderChangeSummary(
  aoiTitle: string,
  beforeDate: string,
  afterDate: string,
  result: ChangeDetectionResult,
  classification: DataClassification
): string {
  return (
    `SAR change analysis for ${aoiTitle} between ${beforeDate} and ${afterDate} ` +
    `(Data classification: ${classification}). ` +
    `Using an effective threshold of plus or minus ${result.effectiveThresholdDb} decibels ` +
    `and a minimum mapping unit filter that removed ${result.filteredSpecklePixels} isolated speckle pixels, ` +
    `backscatter decreased across ${result.lossAreaKm2} square kilometers (${result.lossPatchCount} patches) ` +
    `and increased across ${result.gainAreaKm2} square kilometers (${result.gainPatchCount} patches). ` +
    `Total detected change area is ${result.totalChangedAreaKm2} plus or minus ${result.uncertaintyKm2} square kilometers.`
  );
}
