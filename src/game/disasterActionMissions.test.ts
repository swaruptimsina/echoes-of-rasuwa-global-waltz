import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignAgriBlockAction,
  classifyArcticTarget,
  classifyDielectricZone,
  classifyInfraAsset,
  createInitialAgriSubsidenceState,
  createInitialAvalancheSweepState,
  createInitialDielectricMapperState,
  createInitialEvacuationRunState,
  createInitialForestCanopyState,
  createInitialOceanIceState,
  createInitialQuakeTriageState,
  inspectInfraAsset,
  NASA_DISASTER_ACTIONS,
  scanArcticTarget,
  stepAgriSubsidenceState,
  stepAvalancheSweepBeam,
  stepDielectricMapperState,
  stepEvacuationRunState,
  switchForestBand,
  tagCanopySite,
} from './disasterActionMissions';

test('DielectricFloodMapperState scans all 4 cloud-covered SAR zones and classifies community actions', () => {
  let state = createInitialDielectricMapperState();
  assert.equal(state.won, false);

  for (const z of state.zones) {
    state = { ...state, player: { x: z.x, y: z.y } };
    state = stepDielectricMapperState(state, { x: 0, y: 0 }, 0.02);
    assert.equal(state.zones.find((item) => item.id === z.id)?.scanned, true);
    state = classifyDielectricZone(state, z.id, z.expectedAction);
  }

  assert.equal(state.scannedCount, 4);
  assert.equal(state.classifiedCount, 4);
  assert.equal(state.won, true);
  assert.ok(NASA_DISASTER_ACTIONS.dielectric_flood.badge.includes('NISAR'));
});

test('EvacuationRunState evacuates all 4 village groups to win and updates boulder positions', () => {
  let state = createInitialEvacuationRunState();
  const initialBoulderY = state.boulders[0].y;
  state = stepEvacuationRunState(state, { x: 1, y: 0 }, 0.04);
  assert.notEqual(state.boulders[0].y, initialBoulderY);

  for (const c of state.citizens) {
    state = { ...state, player: { x: c.x, y: c.y } };
    state = stepEvacuationRunState(state, { x: 0, y: 0 }, 0.02);
  }
  assert.equal(state.evacuatedCount, 4);
  assert.equal(state.won, true);
});

test('AvalancheSweepState reveals and locks cloud-covered hazards when swept with L-band beam', () => {
  let state = createInitialAvalancheSweepState();
  assert.equal(state.won, false);

  for (const t of state.targets) {
    state = stepAvalancheSweepBeam(state, { x: t.x, y: t.y }, true);
  }
  assert.equal(state.lockedCount, 4);
  assert.equal(state.won, true);
});

test('AgriSubsidenceState balances soil moisture and sinking aquifer blocks across all 4 farm sectors', () => {
  let state = createInitialAgriSubsidenceState();
  assert.equal(state.won, false);

  for (const b of state.blocks) {
    state = { ...state, player: { x: b.x, y: b.y } };
    state = stepAgriSubsidenceState(state, { x: 0, y: 0 }, 0.02);
    state = assignAgriBlockAction(state, b.id, b.expectedAction);
  }
  assert.equal(state.resolvedCount, 4);
  assert.equal(state.won, true);
  assert.ok(NASA_DISASTER_ACTIONS.agri_subsidence.badge.includes('SAOCOM'));
});

test('ForestCanopyState requires 24 cm L-Band HV before classifying hidden fires and clearcuts', () => {
  let state = createInitialForestCanopyState();
  state = tagCanopySite(state, 1, 'illegal_cut');
  assert.equal(state.taggedCount, 0);

  state = switchForestBand(state, 'L_HV');
  assert.equal(state.band, 'L_HV');
  for (const s of state.sites) {
    state = tagCanopySite(state, s.id, s.expectedTag);
  }
  assert.equal(state.taggedCount, 4);
  assert.equal(state.won, true);
});

test('QuakeTriageState inspects and classifies earthquake bridges, dams, and safe lifelines', () => {
  let state = createInitialQuakeTriageState();
  for (const a of state.assets) {
    state = inspectInfraAsset(state, a.id);
    state = classifyInfraAsset(state, a.id, a.expectedAction);
  }
  assert.equal(state.resolvedCount, 4);
  assert.equal(state.won, true);
});

test('OceanIceState separates -22 dB marine oil slicks from glaciers and permafrost bluffs', () => {
  let state = createInitialOceanIceState();
  for (const t of state.targets) {
    state = scanArcticTarget(state, t.id);
    state = classifyArcticTarget(state, t.id, t.expectedAction);
  }
  assert.equal(state.resolvedCount, 4);
  assert.equal(state.won, true);
});

