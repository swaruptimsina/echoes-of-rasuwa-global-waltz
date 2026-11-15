import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

function importTsModule(relPath) {
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
  const fn = new Function('exports', 'require', 'module', transpiled);
  fn(mod.exports, () => {}, mod);
  return mod.exports;
}

test('Hypothesis Engine covers all 8 surface-change phenomena with confounders and falsification criteria and never claims 100% certainty', () => {
  const hypMod = importTsModule('src/science/hypotheses.ts');
  const keys = Object.keys(hypMod.SURFACE_CHANGE_HYPOTHESES);
  assert.equal(keys.length, 8, 'Must include all 8 surface-change phenomena');

  for (const key of keys) {
    const h = hypMod.SURFACE_CHANGE_HYPOTHESES[key];
    assert.ok(h.candidateDrivers.length >= 2, `${key} must list multiple candidate drivers`);
    assert.ok(h.confounders.length >= 2, `${key} must list confounders`);
    assert.ok(h.discriminatingTests.length >= 2, `${key} must list discriminating tests`);
    assert.ok(h.falsificationCriteria.length >= 1, `${key} must list falsification criteria`);
  }

  const ranked = hypMod.evaluateCandidateHypotheses({
    meanDeltaHhDb: -5.2,
    meanDeltaHvDb: -4.1,
    meanCoherence: 0.25,
    maxAbsLosMeters: 0.03,
    terrainSlopeDeg: 3,
  });

  assert.equal(ranked[0].hypothesis.id, 'flooding_wetlands', 'Low-slope strong HH drop should rank flooding_wetlands first');
  assert.ok(ranked[0].confidenceScore < 100, 'Confidence score must never reach 100%');
});

test('Sensor Rosetta covers all 8 SAR missions (NISAR L/S, Sentinel-1, CSA RCM, RADARSAT-1, CONAE SAOCOM, JAXA ALOS-2, NASA UAVSAR) and recommends L-band for dense forest', () => {
  const rosMod = importTsModule('src/science/sensorRosetta.ts');
  const missions = Object.keys(rosMod.SAR_MISSION_ROSETTA);
  assert.equal(missions.length, 8);
  assert.ok(missions.includes('NISAR_L'));
  assert.ok(missions.includes('NISAR_S'));
  assert.ok(missions.includes('CSA_RCM_C'));
  assert.ok(missions.includes('CSA_RADARSAT1_C'));
  assert.ok(missions.includes('CONAE_SAOCOM_L'));
  assert.ok(missions.includes('NASA_UAVSAR_L'));

  const recs = rosMod.recommendSensorsForTask({
    canopyDensity: 'dense_forest',
    needSubWeeklyRevisit: false,
    needMultiDecadeBaseline: false,
    needFreeImmediateDownload: true,
  });

  assert.equal(recs[0].sensor.band, 'L-Band', 'Dense forest with open download must recommend an L-Band sensor first');
});
