import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSampleSarFloat32TiffBuffer,
  inspectCogFromUrl,
  inspectGeoTiffFromArrayBuffer,
} from './geotiffInspector';

test('sample Float32 SAR TIFF round-trips cleanly through geotiff parser with expected dB range', async () => {
  const buf = createSampleSarFloat32TiffBuffer(72, 48);
  const summary = await inspectGeoTiffFromArrayBuffer(buf, 'sample_s1_rasuwa.tif', 'SAMPLE_SYNTHETIC_TIFF');

  assert.equal(summary.width, 72);
  assert.equal(summary.height, 48);
  assert.equal(summary.bandCount, 1);
  assert.equal(summary.bitsPerSample, 32);
  assert.equal(summary.sampleFormatLabel, 'Float32 (IEEE-754)');
  assert.equal(summary.nodataPixels, 0);
  assert.equal(summary.validPixels, 72 * 48);
  // Water channel should sit near -21.5 dB and double-bounce village near -3.1 dB
  assert.ok(summary.minVal <= -20.0 && summary.minVal >= -23.0, `unexpected min ${summary.minVal}`);
  assert.ok(summary.maxVal >= -4.5 && summary.maxVal <= -2.5, `unexpected max ${summary.maxVal}`);
});

test('inspectCogFromUrl validates URL scheme before network fetch', async () => {
  await assert.rejects(() => inspectCogFromUrl('ftp://invalid.example.com/test.tif'), /valid http/i);
});
