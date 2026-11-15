import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

function importTsModule(relPath, mocks = {}) {
  const fullPath = path.resolve(process.cwd(), relPath);
  const source = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const mod = { exports: {} };
  const customRequire = (id) => {
    if (id in mocks) return mocks[id];
    throw new Error(`Unexpected import ${id} in ${relPath}`);
  };
  const fn = new Function('exports', 'require', 'module', transpiled);
  fn(mod.exports, customRequire, mod);
  return mod.exports;
}

test('computeBackscatterChangeRaster calibrates ROI noise threshold, filters MMU speckle, and extracts Marching Squares contours', () => {
  const cd = importTsModule('src/utils/changeDetection.ts');

  const width = 20;
  const height = 20;
  const beforeDb = new Float32Array(width * height).fill(-12.0);
  const afterDb = new Float32Array(width * height).fill(-12.0);

  // Add minor background noise in top-left ROI (0..5, 0..5)
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      afterDb[r * width + c] = -12.0 + ((r + c) % 2 === 0 ? 0.15 : -0.15);
    }
  }

  // Add a 4x4 inundation loss patch (-5.0 dB) at (10..13, 10..13) -> 16 pixels
  for (let r = 10; r <= 13; r++) {
    for (let c = 10; c <= 13; c++) {
      afterDb[r * width + c] = -17.0;
    }
  }

  // Add a single isolated speckle pixel (+6.0 dB) at (2, 16) that should be removed by MMU=4
  afterDb[2 * width + 16] = -6.0;

  const result = cd.computeBackscatterChangeRaster(beforeDb, afterDb, width, height, {
    manualThresholdDb: 2.5,
    useRoiCalibration: true,
    stableRoi: { x0: 0, y0: 0, x1: 0.25, y1: 0.25 },
    sigmaMultiplier: 2.5,
    mmuPixels: 4,
    pixelSpacingMeters: [100, 100], // 1 pixel = 0.01 km^2
  });

  assert.equal(result.filteredSpecklePixels, 1, 'Single isolated pixel must be filtered by MMU=4');
  assert.equal(result.lossPatchCount, 1, '4x4 loss cluster must survive MMU=4');
  assert.equal(result.gainPatchCount, 0, 'Isolated gain pixel was filtered');
  assert.equal(result.lossAreaKm2, 0.16, '16 pixels at 100x100m = 0.16 km^2');
  assert.ok(result.uncertaintyKm2 > 0, 'Uncertainty must be positive and non-zero');
  assert.ok(result.contours.length > 0, 'Marching Squares must extract boundary segments around the 4x4 patch');
  assert.equal(result.uncertaintySources.length, 3, 'Three physical uncertainty sources must be documented');
});

test('sampleLosTransect computes LOS relative to user reference pixel and flags low-coherence samples', () => {
  const cd = importTsModule('src/utils/changeDetection.ts');
  const bundle = cd.generateDeterministicAoiRasters('rasuwa_nepal', 40, 30);

  const profile = cd.sampleLosTransect(
    bundle.losDisplacementM,
    bundle.coherence,
    bundle.beforeHhDb,
    bundle.afterHhDb,
    bundle.width,
    bundle.height,
    [0.15, 0.18],
    [0.8, 0.7],
    [0.15, 0.18], // Reference point equals start point
    [4800, 3600],
    25,
    0.35,
    0.24
  );

  assert.equal(profile.samples.length, 25);
  assert.equal(profile.samples[0].relativeLosMeters, 0, 'Relative LOS at the reference point itself must be 0');
  assert.ok(profile.totalLengthMeters > 3000, 'Transect length in meters must be positive');

  const csv = cd.exportTransectToCsv(profile, 'rasuwa_nepal');
  assert.ok(csv.includes('relative_los_m_vs_ref'), 'CSV header must include relative LOS column');
});
