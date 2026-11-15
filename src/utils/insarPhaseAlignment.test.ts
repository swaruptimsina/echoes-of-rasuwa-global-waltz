import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateInsarWaveAlignment,
  getBandWavelengthCm,
  sampleWaveAlignmentTraces,
  wrapPhaseSignedRad,
} from './insarPhaseAlignment';

test('wavelength and half-wavelength constants match physical L-band and C-band SAR', () => {
  assert.equal(getBandWavelengthCm('L'), 24.0);
  assert.equal(getBandWavelengthCm('C'), 5.6);
  const lMetrics = evaluateInsarWaveAlignment('L', 100, 40.0);
  assert.equal(lMetrics.halfWavelengthCm, 12.0);
  assert.equal(lMetrics.isPhaseLocked, true);
  assert.equal(lMetrics.alignmentPct, 100);
});

test('wrapped phase always stays within [-pi, pi]', () => {
  for (const angle of [-15.2, -Math.PI, -0.5, 0, Math.PI, 9.7, 25.1]) {
    const w = wrapPhaseSignedRad(angle);
    assert.ok(w >= -Math.PI && w <= Math.PI, `expected ${w} in [-pi, pi]`);
  }
});

test('L-band alignment converges cleanly while short C-band under trees stays blocked', () => {
  const low = evaluateInsarWaveAlignment('L', 20, 40.0);
  const locked = evaluateInsarWaveAlignment('L', 95, 40.0);
  assert.ok(locked.alignmentPct > low.alignmentPct);
  assert.ok(locked.speckleNoiseRatio < low.speckleNoiseRatio);
  assert.equal(locked.isPhaseLocked, true);

  const cBlocked = evaluateInsarWaveAlignment('C', 100, 40.0);
  assert.equal(cBlocked.isPhaseLocked, false);
  assert.ok(cBlocked.alignmentPct < 80);
});

test('wave trace samples match length and synchronize at 100% alignment', () => {
  const aligned = sampleWaveAlignmentTraces('L', 100, 32, 40.0);
  assert.equal(aligned.length, 32);
  for (const pt of aligned) {
    assert.ok(Math.abs(pt.residualY) < 1e-6, `expected zero residual at 100%, got ${pt.residualY}`);
  }
});
