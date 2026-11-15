import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadTsModule(relPath) {
  const source = await readFile(new URL(relPath, import.meta.url), 'utf8');
  // Strip local type/value imports when testing standalone module logic
  const stripped = source.replace(/import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?/g, '');
  const code = ts.transpileModule(stripped, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

test('validateProductManifest accepts valid manifests and blocks synthetic fixtures from claiming REAL_NISAR_PRODUCT', async () => {
  const { validateProductManifest, decode16BitRasterToFloat32, resolveAoiLayerLadder } = await loadTsModule(
    '../src/data/nisarProducts.ts'
  );

  const validSha = 'a'.repeat(64);
  const baseManifest = {
    schemaVersion: '1.0',
    classification: 'REAL_NISAR_PRODUCT',
    aoiId: 'rasuwa_nepal',
    granuleId: 'NISAR_L2_PR_GCOV_026_098_A_016_4005_DHDH_A_20260819T233918_20260819T233952_P05023_N_F_J_001',
    collectionShortName: 'NISAR_L2_GCOV_PROVISIONAL_V1',
    productType: 'GCOV',
    processingLevel: 'L2',
    maturity: 'PROVISIONAL',
    crid: 'P05023',
    track: 98,
    frame: 16,
    orbitDirection: 'A',
    radarWavelengthMeters: 0.238404,
    losConventionNote: 'Derived from HDF5 centerFrequency',
    acquisitionStartUtc: '2026-08-19T23:39:18Z',
    acquisitionEndUtc: '2026-08-19T23:39:52Z',
    epsg3857Bounds: [9484420, 3255300, 9534510, 3305800],
    wgs84Bounds: [85.2, 28.05, 85.65, 28.45],
    units: 'dB (10 log10 gamma0)',
    nodataRule: '65535 -> NaN',
    maskRule: 'Shadow/layover masked',
    retrievedAtUtc: '2026-11-13T16:15:00Z',
    processedAtUtc: '2026-11-13T16:15:05Z',
    pipelineCommand: 'python3 pipeline/ingest_nisar.py process-gcov --input raw.h5 --aoi rasuwa_nepal',
    softwareVersions: { python: '3.11' },
    inputHdf5Sha256: validSha,
    outputManifestSha256: validSha,
    sourceUrl: 'https://cmr.earthdata.nasa.gov/search/granules.json',
    userGuideUrl: 'https://nisar-docs.asf.alaska.edu/',
    license: 'NASA Open Data',
    credit: 'NASA/JPL/ISRO',
    qualityNotes: ['PROVISIONAL'],
    layers: [
      {
        id: 'gcov_hh_db',
        title: 'HH dB',
        hdf5DatasetPath: '/science/LSAR/GCOV/grids/frequencyA/HHHH',
        units: 'dB',
        polarization: 'HH',
        width: 2,
        height: 2,
        scale: 0.001,
        offset: -35,
        nodataValue: 65535,
        validMin: -35,
        validMax: 10,
        outputSha256: validSha
      }
    ]
  };

  const resOk = validateProductManifest(baseManifest);
  assert.equal(resOk.valid, true);
  assert.equal(resOk.errors.length, 0);

  // Synthetic command cannot claim REAL_NISAR_PRODUCT
  const resSyntheticClaim = validateProductManifest({
    ...baseManifest,
    pipelineCommand: 'python3 pipeline/ingest_nisar.py process-gcov --synthetic'
  });
  assert.equal(resSyntheticClaim.valid, false);
  assert.equal(resSyntheticClaim.downgradedClassification, 'TEST_FIXTURE');

  // Missing SHA-256 fails validation
  const resBadSha = validateProductManifest({
    ...baseManifest,
    inputHdf5Sha256: 'not-a-sha256'
  });
  assert.equal(resBadSha.valid, false);
  assert.ok(resBadSha.errors.some((e) => e.includes('inputHdf5Sha256')));

  // Test 16-bit raster decoding and nodata preservation
  const uint16 = new Uint16Array([20000, 30000, 65535]);
  const decoded = decode16BitRasterToFloat32(uint16, {
    scale: 0.001,
    offset: -35,
    nodataValue: 65535,
    validMin: -35,
    validMax: 10
  });
  assert.equal(decoded.validCount, 2);
  assert.equal(decoded.nodataCount, 1);
  assert.ok(Math.abs(decoded.values[0] - -15) < 1e-4);
  assert.ok(Math.abs(decoded.values[1] - -5) < 1e-4);
  assert.ok(Number.isNaN(decoded.values[2]), 'Nodata pixel must decode to NaN, never 0');

  // Test honest fallback ladder
  const ladderReal = resolveAoiLayerLadder('rasuwa_nepal', [baseManifest], false, 'snapshot');
  assert.equal(ladderReal.activeTier, 'REAL_NISAR_PRODUCT');
  const ladderSnap = resolveAoiLayerLadder('rasuwa_nepal', [], false, 'snapshot');
  assert.equal(ladderSnap.activeTier, 'CATALOG_SNAPSHOT');
});

test('parseNisarGranuleId and rankPrePostEventPairs parse real NASA CMR NISAR granules accurately', async () => {
  const { parseNisarGranuleId, rankPrePostEventPairs } = await loadTsModule(
    '../src/services/nisarCatalogService.ts'
  );
  const snapshotRaw = JSON.parse(
    await readFile(new URL('../public/nisar-catalog/cmr-snapshot-2026-11-13.json', import.meta.url), 'utf8')
  );

  const rasuwaGranules = snapshotRaw.regions.rasuwa_nepal.granules.map((g) => ({
    ...g,
    parsed: parseNisarGranuleId(g.granuleId)
  }));
  assert.ok(rasuwaGranules.length > 50, 'Snapshot must contain real CMR Rasuwa granules');

  for (const g of rasuwaGranules.slice(0, 20)) {
    assert.equal(g.parsed.valid, true, `Granule ID must parse cleanly: ${g.granuleId}`);
    assert.ok(['GCOV', 'GUNW', 'GOFF', 'GSLC', 'SME2'].includes(g.parsed.productType));
    assert.ok(['A', 'D'].includes(g.parsed.orbitDirection));
    assert.ok(g.parsed.relativeOrbitTrack > 0);
  }

  const pairs = rankPrePostEventPairs(rasuwaGranules, '2026-08-26');
  assert.ok(pairs.length > 0, 'Event Pair Finder must identify pre/post pairs over Rasuwa');
  assert.ok(pairs[0].score >= pairs[pairs.length - 1].score, 'Pairs must be sorted by score descending');
});
