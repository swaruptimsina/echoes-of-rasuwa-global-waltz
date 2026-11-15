import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadSarAcquisitionService() {
  const source = await readFile(
    new URL('../src/services/sarAcquisitionService.ts', import.meta.url),
    'utf8'
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

test('sarAcquisitionService defines the Rasuwa AOI bounds, Case 1 & Case 2 SHA-256 manifests, and 5-Stage Timeline', async () => {
  const svc = await loadSarAcquisitionService();
  assert.equal(svc.RASUWA_AOI_BOUNDS.latMin, 27.8);
  assert.equal(svc.RASUWA_AOI_BOUNDS.latMax, 28.4);
  assert.equal(svc.RASUWA_AOI_BOUNDS.lonMin, 85.1);
  assert.equal(svc.RASUWA_AOI_BOUNDS.lonMax, 85.6);

  // Case 1 Hubbard Glacier NISAR Benchmark (43da... and e83f...)
  const case1 = svc.CRYPTOGRAPHIC_PROVENANCE_MANIFESTS.hubbard_nisar_case1;
  assert.ok(case1.assets[0].sha256.startsWith('43da'));
  assert.ok(case1.assets[1].sha256.startsWith('e83f'));

  // Case 2 Rasuwa Sentinel-1 SAR Browse (4e62... and 351c...)
  const case2 = svc.CRYPTOGRAPHIC_PROVENANCE_MANIFESTS.rasuwa_sentinel1_case2;
  assert.ok(case2.assets[0].sha256.startsWith('4e62'));
  assert.ok(case2.assets[1].sha256.startsWith('351c'));

  // 5-Stage Rasuwa Cascading Failure & Regional Screening Verdict
  assert.equal(svc.FIVE_STAGE_RASUWA_TIMELINE.length, 5);
  assert.match(svc.FIVE_STAGE_RASUWA_TIMELINE[0].rootCauseTitle, /Monsoon Saturation/i);
  assert.match(svc.FIVE_STAGE_RASUWA_TIMELINE[1].rootCauseTitle, /Bedrock Creep/i);
  assert.match(svc.FIVE_STAGE_RASUWA_TIMELINE[2].rootCauseTitle, /Debris Damming/i);
  assert.match(svc.FIVE_STAGE_RASUWA_TIMELINE[3].rootCauseTitle, /Rock-Ice Avalanche/i);
  assert.match(svc.FIVE_STAGE_RASUWA_TIMELINE[4].rootCauseDetail, /Silwal & Dahal/i);

  // Multi-Sensor Physics & Complementary NASA Fleet
  assert.equal(svc.MULTI_SENSOR_PHYSICS_COMPARISON.length, 4);
  assert.equal(svc.COMPLEMENTARY_NASA_FLEET_CARDS.length, 4);
});
