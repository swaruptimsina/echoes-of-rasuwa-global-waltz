import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

function transpileToDataUrl(tsSource, replacements = {}) {
  let code = ts.transpileModule(tsSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText;

  for (const [specifier, resolvedUrl] of Object.entries(replacements)) {
    code = code
      .replaceAll(`'${specifier}'`, `'${resolvedUrl}'`)
      .replaceAll(`"${specifier}"`, `"${resolvedUrl}"`);
  }

  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}

async function loadNisarProductsModule() {
  const source = await readFile(path.join(ROOT_DIR, 'src/data/nisarProducts.ts'), 'utf8');
  return import(transpileToDataUrl(source));
}

async function loadRasuwaDatumServiceModule() {
  const nisarSrc = await readFile(path.join(ROOT_DIR, 'src/data/nisarProducts.ts'), 'utf8');
  const nisarUrl = transpileToDataUrl(nisarSrc);

  const datumSrc = await readFile(path.join(ROOT_DIR, 'src/services/rasuwaDatumService.ts'), 'utf8');
  const datumUrl = transpileToDataUrl(datumSrc, {
    '../data/nisarProducts': nisarUrl
  });
  return import(datumUrl);
}

async function loadGeotiffInspectorModule() {
  const geotiffUrl = import.meta.resolve('geotiff');
  const inspectorSrc = await readFile(path.join(ROOT_DIR, 'src/utils/geotiffInspector.ts'), 'utf8');
  const inspectorUrl = transpileToDataUrl(inspectorSrc, {
    geotiff: geotiffUrl
  });
  return import(inspectorUrl);
}

test('rasuwa_nepal NISAR manifest passes strict validateProductManifest as REAL_NISAR_PRODUCT', async () => {
  const { validateProductManifest } = await loadNisarProductsModule();
  const manifestRaw = JSON.parse(
    await readFile(path.join(PUBLIC_DIR, 'nisar-products/rasuwa_nepal/manifest.json'), 'utf8')
  );

  const result = validateProductManifest(manifestRaw);
  assert.equal(result.valid, true, `Expected valid manifest, got errors: ${result.errors.join('; ')}`);
  assert.ok(result.manifest);
  assert.equal(result.manifest.classification, 'REAL_NISAR_PRODUCT');
  assert.equal(result.manifest.aoiId, 'rasuwa_nepal');
  assert.equal(result.manifest.productType, 'GCOV');
  assert.equal(result.manifest.maturity, 'PROVISIONAL');
  assert.equal(result.manifest.crid, 'P05023');
  assert.equal(result.manifest.track, 98);
  assert.equal(result.manifest.frame, 16);
});

test('all bundled rasuwa-datum GeoTIFFs, handoff JSONs, WebPs, and GIS GeoJSONs exist on disk and match static facts', async () => {
  const { BUNDLED_RASUWA_GEOTIFF_PRESETS, RASUWA_DATUM_STATIC_FACTS } = await loadRasuwaDatumServiceModule();

  assert.ok(BUNDLED_RASUWA_GEOTIFF_PRESETS.length >= 5);
  for (const preset of BUNDLED_RASUWA_GEOTIFF_PRESETS) {
    const relPath = preset.publicPath.replace(/^\/+/, '');
    const fullPath = path.join(PUBLIC_DIR, relPath);
    const info = await stat(fullPath);
    assert.ok(info.size > 1000, `Expected non-empty GeoTIFF at ${fullPath}`);
    assert.match(preset.sha256, /^[0-9a-f]{64}$/i);
  }

  const requiredAssets = [
    'rasuwa-datum/handoff/l_vs_c_coherence.json',
    'rasuwa-datum/handoff/latency_table.json',
    'rasuwa-datum/handoff/rainfall_timeseries.json',
    'rasuwa-datum/handoff/coherence_loss_screening_mask.json',
    'rasuwa-datum/handoff/story_hooks.json',
    'rasuwa-datum/handoff/change_mask.json',
    'rasuwa-datum/handoff/subtle_change_results.json',
    'rasuwa-datum/handoff/provenance.json',
    'rasuwa-datum/handoff/cband_coherence_comparison.webp',
    'rasuwa-datum/handoff/lband_coherence_comparison.webp',
    'rasuwa-datum/handoff/coherence_loss_screening_mask.webp',
    'rasuwa-datum/handoff/sar_change_overlay.webp',
    'rasuwa-datum/gis/connected_system_aoi.geojson',
    'rasuwa-datum/gis/hazard_screening.geojson',
    'rasuwa-datum/gis/subareas.geojson',
    'rasuwa-datum/gis/unosat_detachment.geojson'
  ];

  for (const relPath of requiredAssets) {
    const info = await stat(path.join(PUBLIC_DIR, relPath));
    assert.ok(info.size > 0, `Expected asset ${relPath}`);
  }

  const coherence = JSON.parse(
    await readFile(path.join(PUBLIC_DIR, 'rasuwa-datum/handoff/l_vs_c_coherence.json'), 'utf8')
  );
  assert.equal(coherence.l_band.event_phase_valid_pixels, 9);
  assert.equal(coherence.l_band.event_phase_total_pixels, 528);
  assert.equal(RASUWA_DATUM_STATIC_FACTS.nisarPhaseValidSource, '9/528 (1.70%)');

  const screeningMask = JSON.parse(
    await readFile(
      path.join(PUBLIC_DIR, 'rasuwa-datum/handoff/coherence_loss_screening_mask.json'),
      'utf8'
    )
  );
  assert.equal(screeningMask.target_filtered_anomaly_pixels, 158);
  assert.equal(screeningMask.target_valid_pixels, 307);
  assert.equal(screeningMask.control_filtered_false_alarm_pixels, 1225);
  assert.equal(screeningMask.control_valid_pixels, 30161);

  const rainfall = JSON.parse(
    await readFile(path.join(PUBLIC_DIR, 'rasuwa-datum/handoff/rainfall_timeseries.json'), 'utf8')
  );
  assert.ok(Array.isArray(rainfall.native_imerg_event_half_hour));
  assert.equal(rainfall.native_imerg_event_half_hour[0].precipitation_rate_mm_hr, 0.0);
});

test('geotiffInspector.inspectBundledGeoTiff parses real bundled NISAR, OPERA, and Copernicus GeoTIFFs', async () => {
  const { inspectBundledGeoTiff } = await loadGeotiffInspectorModule();
  const { BUNDLED_RASUWA_GEOTIFF_PRESETS } = await loadRasuwaDatumServiceModule();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    const relPath = urlStr.replace(/^\/+/, '');
    const buf = await readFile(path.join(PUBLIC_DIR, relPath));
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    };
  };

  try {
    for (const preset of BUNDLED_RASUWA_GEOTIFF_PRESETS) {
      const summary = await inspectBundledGeoTiff(
        preset.publicPath,
        preset.shortLabel,
        preset.bandIndex
      );
      assert.equal(summary.sourceKind, 'BUNDLED_NASA_GEOTIFF');
      assert.equal(summary.sourceName, preset.shortLabel);
      assert.ok(summary.width > 0 && summary.height > 0);
      assert.ok(summary.bandCount >= 1);
      assert.ok(summary.validPixels > 0, `Expected valid pixels in ${preset.publicPath}`);
      assert.ok(Number.isFinite(summary.minVal));
      assert.ok(Number.isFinite(summary.maxVal));
      assert.ok(summary.previewGrid instanceof Float32Array && summary.previewGrid.length > 0);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnalystWorkbench, StoryScrollyModal, RasuwaStoryAdventure, LabSupercomputerScreen, and RasuwaDatumExplorer integrate real Rasuwa datum components cleanly', async () => {
  const [workbenchSrc, storySrc, adventureSrc, labSrc, explorerSrc] = await Promise.all([
    readFile(path.join(ROOT_DIR, 'src/components/AnalystWorkbench.tsx'), 'utf8'),
    readFile(path.join(ROOT_DIR, 'src/components/StoryScrollyModal.tsx'), 'utf8'),
    readFile(path.join(ROOT_DIR, 'src/components/RasuwaStoryAdventure.tsx'), 'utf8'),
    readFile(path.join(ROOT_DIR, 'src/components/LabSupercomputerScreen.tsx'), 'utf8'),
    readFile(path.join(ROOT_DIR, 'src/components/RasuwaDatumExplorer.tsx'), 'utf8')
  ]);

  assert.match(workbenchSrc, /BUNDLED_RASUWA_GEOTIFF_PRESETS/);
  assert.match(workbenchSrc, /inspectBundledGeoTiff/);
  assert.match(workbenchSrc, /fetchValidatedRasuwaProductManifest/);
  assert.match(workbenchSrc, /workbench-rasuwa-datum-panel/);
  assert.doesNotMatch(workbenchSrc, /classification:\s*['"]REAL_NISAR_PRODUCT['"]/);

  assert.match(storySrc, /6,803/);
  assert.match(storySrc, /4,774\.048 km²/);
  assert.match(storySrc, /9\/528/);
  assert.match(storySrc, /158\/307/);

  assert.match(adventureSrc, /story-real-datum-btn/);
  assert.match(adventureSrc, /story-real-datum-modal/);
  assert.match(adventureSrc, /proof-rasuwa-l-vs-c-2026/);
  assert.match(adventureSrc, /proof-rasuwa-opera-imerg-2026/);
  assert.match(adventureSrc, /RasuwaDatumExplorer/);

  assert.match(labSrc, /RASUWA_DATUM_STATIC_FACTS/);
  assert.match(labSrc, /NASA Context & Data/);
  assert.match(labSrc, /lab-open-real-nasa-btn/);
  assert.match(labSrc, /rasuwa_datum/);
  assert.match(labSrc, /RasuwaDatumExplorer/);
  assert.match(labSrc, /SIMULATION/);

  assert.match(explorerSrc, /rasuwa-datum-explorer/);
  assert.match(explorerSrc, /rasuwa-geotiff-canvas/);
  assert.match(explorerSrc, /rasuwa-gis-canvas/);
  assert.match(explorerSrc, /connected_system_aoi\.geojson/);
  assert.match(explorerSrc, /unosat_detachment\.geojson/);
  assert.doesNotMatch(explorerSrc, /classification:\s*['"]REAL_NISAR_PRODUCT['"]/);

  const biomeSrc = await readFile(
    path.join(ROOT_DIR, 'src/game/biomePixelArtEngine.ts'),
    'utf8'
  );
  assert.match(biomeSrc, /kind === 'alpine_scree' \|\| kind === 'scree'/);
});
