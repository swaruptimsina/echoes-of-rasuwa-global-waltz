import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

async function loadBundledCjsModule(relPath) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'echoes-netlify-fn-'));
  const bundlePath = path.join(tmpDir, 'bundle.cjs');
  const prevNodePath = process.env.NODE_PATH;

  await esbuild.build({
    entryPoints: [path.join(ROOT_DIR, relPath)],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['msedge-tts', 'ws'],
    outfile: bundlePath,
  });

  process.env.NODE_PATH = path.join(ROOT_DIR, 'node_modules');
  const require = createRequire(import.meta.url);
  require('node:module')._initPaths();
  const mod = require(bundlePath);

  return {
    mod,
    cleanup: async () => {
      if (prevNodePath === undefined) delete process.env.NODE_PATH;
      else process.env.NODE_PATH = prevNodePath;
      await fs.rm(tmpDir, { recursive: true, force: true });
    },
  };
}

test('netlify.toml routes /api/* to serverless TTS function before SPA fallback', async () => {
  const toml = await fs.readFile(path.join(ROOT_DIR, 'netlify.toml'), 'utf8');

  assert.match(toml, /\[functions\]/);
  assert.match(toml, /directory\s*=\s*"netlify\/functions"/);
  assert.match(toml, /node_bundler\s*=\s*"esbuild"/);
  assert.match(toml, /external_node_modules\s*=\s*\[[^\]]*"msedge-tts"[^\]]*"ws"[^\]]*\]/);

  assert.doesNotMatch(toml, /to\s*=\s*"\/404\.html"/);
  const apiRedirectIdx = toml.indexOf('from = "/api/*"');
  const spaRedirectIdx = toml.indexOf('from = "/*"');
  assert.ok(apiRedirectIdx >= 0, 'Missing /api/* redirect in netlify.toml');
  assert.ok(spaRedirectIdx > apiRedirectIdx, '/api/* redirect must precede /* SPA fallback');
  assert.match(toml, /to\s*=\s*"\/\.netlify\/functions\/tts\?route=:splat"/);
  assert.match(toml, /force\s*=\s*true/);
});

test('lib/ttsEngine helpers normalize requests, sanitize SSML, and preserve WAV framing', async () => {
  const loaded = await loadBundledCjsModule('lib/ttsEngine.ts');
  try {
    const engineMod = loaded.mod;

    assert.equal(
      engineMod.cleanTextForEdgeSsml('Hi 😊! Rock & ice < 5 > 2 "Lali\'s"  test'),
      'Hi ! Rock and ice less than 5 greater than 2 Lali’s test'
    );

    assert.equal(
      engineMod.parseNeuralVoice('en-IN-NeerjaExpressiveNeural'),
      'en-IN-NeerjaExpressiveNeural'
    );
    assert.equal(engineMod.parseNeuralVoice('invalid-voice'), 'en-US-AnaNeural');

    const emptyReq = engineMod.parseTtsRequestBody({ text: '   ' });
    assert.deepEqual(emptyReq, { error: 'Missing speech text' });

    const longReq = engineMod.parseTtsRequestBody({
      text: `  ${'A'.repeat(700)}  `,
      mood: 'joy',
      voice: 'Kore',
      neuralVoice: 'en-GB-MaisieNeural',
    });
    assert.equal(longReq.text.length, 600);
    assert.equal(longReq.mood, 'joy');
    assert.equal(longReq.voiceName, 'Kore');
    assert.equal(longReq.neuralVoice, 'en-GB-MaisieNeural');

    assert.equal(engineMod.getVoicePlaybackRate('edge-neural:en-US-AnaNeural'), '1.0');
    assert.equal(engineMod.getVoicePlaybackRate('gemini-3.8-flash-lite-tts'), '1.1');

    const wrapped = engineMod.ensureWavBuffer(Buffer.from([1, 2, 3, 4]));
    assert.equal(wrapped.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wrapped.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wrapped.length, 48);

    const alreadyWav = Buffer.from('RIFF\x24\x00\x00\x00WAVEfmt ', 'latin1');
    assert.equal(engineMod.ensureWavBuffer(alreadyWav), alreadyWav);
  } finally {
    await loaded.cleanup();
  }
});

test('bundled Netlify TTS handler serves status, health, production config guard, and input validation', async () => {
  const prevGemini = process.env.GEMINI_API_KEY;
  const prevGoogle = process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;

  const loaded = await loadBundledCjsModule('netlify/functions/tts.ts');
  try {
    const handler = loaded.mod.default;
    assert.equal(typeof handler, 'function');

    const optRes = await handler(
      new Request('https://rasuwa.netlify.app/api/tts', { method: 'OPTIONS' })
    );
    assert.equal(optRes.status, 204);

    const healthRes = await handler(
      new Request('https://rasuwa.netlify.app/.netlify/functions/tts?route=health')
    );
    assert.equal(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.equal(healthJson.ok, true);
    assert.equal(healthJson.runtime, 'netlify-function');
    assert.equal(healthJson.voice.activeEngine, 'edge-neural');
    assert.equal(healthJson.voice.voice, 'en-US-AnaNeural');

    const statusRes = await handler(
      new Request(
        'https://rasuwa.netlify.app/.netlify/functions/tts?route=tts/status&neuralVoice=en-IN-NeerjaExpressiveNeural'
      )
    );
    assert.equal(statusRes.status, 200);
    const statusJson = await statusRes.json();
    assert.equal(statusJson.neuralVoice, 'en-IN-NeerjaExpressiveNeural');
    assert.equal(statusJson.model, 'en-IN-NeerjaExpressiveNeural');

    const configRes = await handler(
      new Request('https://rasuwa.netlify.app/.netlify/functions/tts?route=tts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'test-key' }),
      })
    );
    assert.equal(configRes.status, 403);

    const methodRes = await handler(
      new Request('https://rasuwa.netlify.app/.netlify/functions/tts?route=tts', {
        method: 'GET',
      })
    );
    assert.equal(methodRes.status, 405);

    const emptyTextRes = await handler(
      new Request('https://rasuwa.netlify.app/.netlify/functions/tts?route=tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '   ' }),
      })
    );
    assert.equal(emptyTextRes.status, 400);

    const badJsonRes = await handler(
      new Request('https://rasuwa.netlify.app/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid-json',
      })
    );
    assert.equal(badJsonRes.status, 400);

    const oversizedRes = await handler(
      new Request('https://rasuwa.netlify.app/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'x'.repeat(40000) }),
      })
    );
    assert.equal(oversizedRes.status, 413);

    const missingRouteRes = await handler(
      new Request('https://rasuwa.netlify.app/.netlify/functions/tts?route=unknown')
    );
    assert.equal(missingRouteRes.status, 404);
  } finally {
    if (prevGemini !== undefined) process.env.GEMINI_API_KEY = prevGemini;
    if (prevGoogle !== undefined) process.env.GOOGLE_API_KEY = prevGoogle;
    await loaded.cleanup();
  }
});
