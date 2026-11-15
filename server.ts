import express from 'express';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createTtsEngine,
  DEFAULT_NEURAL_VOICE,
  getVoicePlaybackRate,
  parseNeuralVoice,
  parseTtsRequestBody,
} from './lib/ttsEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DISK_CACHE_DIR = path.join(__dirname, '.tts-cache');

const ttsEngine = createTtsEngine({
  cacheDir: DISK_CACHE_DIR,
  serverless: false,
});

async function loadEnvFilesIntoProcess(): Promise<void> {
  const preExistingEnvKeys = new Set(Object.keys(process.env));
  const envFiles = ['.env', '.env.local'];

  for (const filename of envFiles) {
    try {
      const content = await fs.readFile(path.join(__dirname, filename), 'utf8');
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx <= 0) continue;
        const key = line.slice(0, eqIdx).trim();
        if (!key || preExistingEnvKeys.has(key)) continue;
        let val = line.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    } catch {
      // Optional .env / .env.local not present
    }
  }
}

async function persistGeminiKeyToEnvLocal(apiKey: string): Promise<void> {
  const envLocalPath = path.join(__dirname, '.env.local');
  let lines: string[] = [];
  try {
    const existing = await fs.readFile(envLocalPath, 'utf8');
    lines = existing.split(/\r?\n/);
  } catch {
    lines = [];
  }

  const filtered = lines.filter((line) => !/^\s*GEMINI_API_KEY\s*=/.test(line));
  if (apiKey) {
    filtered.push(`GEMINI_API_KEY="${apiKey.replace(/"/g, '')}"`);
  }
  const cleanOutput =
    filtered.filter((l, idx) => l !== '' || idx < filtered.length - 1).join('\n') + '\n';
  await fs.writeFile(envLocalPath, cleanOutput, 'utf8');
}

async function startServer() {
  await loadEnvFilesIntoProcess();
  ttsEngine.initializeGeminiClient(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => {
    const isProd = process.env.NODE_ENV === 'production';
    res.json({
      ok: true,
      mode: isProd ? 'production' : 'development',
      voice: ttsEngine.buildStatusPayload(DEFAULT_NEURAL_VOICE),
    });
  });

  app.get('/api/tts/status', (req, res) => {
    const requestedNeural = parseNeuralVoice(req.query?.neuralVoice);
    res.json(ttsEngine.buildStatusPayload(requestedNeural));
  });

  app.post('/api/tts/config', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        error:
          'Runtime API key updates are disabled in production; configure GEMINI_API_KEY via server environment variables.',
      });
      return;
    }
    const rawKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
    const persist = Boolean(req.body?.persist);

    ttsEngine.initializeGeminiClient(rawKey || null);
    if (persist) {
      try {
        await persistGeminiKeyToEnvLocal(rawKey);
      } catch (err) {
        console.warn('Could not persist .env.local:', err);
      }
    }

    res.json(ttsEngine.buildStatusPayload(DEFAULT_NEURAL_VOICE));
  });

  app.post('/api/tts', async (req, res) => {
    const parsed = parseTtsRequestBody(req.body);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const audio = await ttsEngine.synthesizeStoryVoice(
        parsed.text,
        parsed.mood,
        parsed.voiceName,
        parsed.neuralVoice
      );
      if (!audio) {
        res.status(200).json({ fallback: true, reason: 'offline_or_unavailable' });
        return;
      }
      const playbackRate = getVoicePlaybackRate(audio.engine);
      res.setHeader('Content-Type', audio.contentType);
      res.setHeader('Content-Length', String(audio.buffer.length));
      res.setHeader('X-Voice-Engine', audio.engine);
      res.setHeader('X-Voice-Playback-Rate', playbackRate);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(audio.buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'TTS generation failed';
      console.error('Story TTS error:', message);
      res.status(200).json({ fallback: true, reason: 'error' });
    }
  });

  const server = http.createServer(app);
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    const status = ttsEngine.buildStatusPayload(DEFAULT_NEURAL_VOICE);
    console.log(
      `Echoes of Rasuwa server listening on http://localhost:${port} [voice=${status.activeEngine}:${status.voice}]`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
