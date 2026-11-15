import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DISK_CACHE_DIR = path.join(__dirname, '.tts-cache');

type StoryVoiceMood = 'warm' | 'curious' | 'gentle' | 'joy';
type TtsModelName =
  | 'gemini-3.8-flash-lite-tts'
  | 'gemini-3.8-flash-tts'
  | 'gemini-2.5-flash-preview-tts';

export type NeuralVoiceId =
  | 'en-US-AnaNeural'
  | 'en-GB-MaisieNeural'
  | 'en-IN-NeerjaExpressiveNeural'
  | 'en-US-AvaNeural'
  | 'en-US-EmmaNeural';

const DEFAULT_NEURAL_VOICE: NeuralVoiceId = 'en-US-AnaNeural';

const NEURAL_VOICE_PROSODY: Record<NeuralVoiceId, { pitch: string; rate: string }> = {
  'en-US-AnaNeural': { pitch: '+3Hz', rate: '+5%' },
  'en-GB-MaisieNeural': { pitch: '+2Hz', rate: '+4%' },
  'en-IN-NeerjaExpressiveNeural': { pitch: '+2Hz', rate: '+5%' },
  'en-US-AvaNeural': { pitch: '+2Hz', rate: '+5%' },
  'en-US-EmmaNeural': { pitch: '+2Hz', rate: '+5%' },
};

const ALLOWED_NEURAL_VOICES = Object.keys(NEURAL_VOICE_PROSODY) as NeuralVoiceId[];

const LALI_UNIFIED_VOICE_STYLE =
  'Happy excited 7-year-old human girl speaking brightly and briskly—sparkling cheerful energy like Masha from Masha and the Bear, crystal clear words and natural human cadence.';

const MOOD_STYLES: Record<StoryVoiceMood, string> = {
  warm: LALI_UNIFIED_VOICE_STYLE,
  curious: LALI_UNIFIED_VOICE_STYLE,
  gentle: LALI_UNIFIED_VOICE_STYLE,
  joy: LALI_UNIFIED_VOICE_STYLE,
};

interface CachedAudioResult {
  buffer: Buffer;
  contentType: 'audio/wav' | 'audio/mpeg';
  engine: string;
}

const MAX_CACHE_ENTRIES = 300;
const MAX_CONCURRENT_GEMINI_TTS = 3;
const MAX_CONCURRENT_EDGE_TTS = 2;
const ttsCache = new Map<string, CachedAudioResult>();
const inFlightTts = new Map<string, Promise<CachedAudioResult | null>>();
const modelCooldownUntil = new Map<TtsModelName, number>();

let ai: GoogleGenAI | null = null;
let geminiAuthInvalidUntil = 0;

function initializeGeminiClient(rawKey?: string | null): boolean {
  const cleanKey = rawKey?.trim() ?? '';
  modelCooldownUntil.clear();
  geminiAuthInvalidUntil = 0;
  if (!cleanKey) {
    ai = null;
    return false;
  }
  ai = new GoogleGenAI({
    apiKey: cleanKey,
    apiVersion: 'v1beta',
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
  return true;
}

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

initializeGeminiClient(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

let activeGeminiRequests = 0;
const geminiQueue: Array<() => void> = [];

async function withGeminiConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (activeGeminiRequests >= MAX_CONCURRENT_GEMINI_TTS) {
    await new Promise<void>((resolve) => {
      geminiQueue.push(resolve);
    });
  }
  activeGeminiRequests++;
  try {
    return await fn();
  } finally {
    activeGeminiRequests--;
    const next = geminiQueue.shift();
    if (next) next();
  }
}

let activeEdgeRequests = 0;
const edgeQueue: Array<() => void> = [];

async function withEdgeConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (activeEdgeRequests >= MAX_CONCURRENT_EDGE_TTS) {
    await new Promise<void>((resolve) => {
      edgeQueue.push(resolve);
    });
  }
  activeEdgeRequests++;
  try {
    return await fn();
  } finally {
    activeEdgeRequests--;
    const next = edgeQueue.shift();
    if (next) next();
  }
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaOrRateError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|RESOURCE_EXHAUSTED|quota/i.test(msg);
}

function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /API_KEY_INVALID|API key not valid|401|403|PERMISSION_DENIED/i.test(msg);
}

function isNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /404|NOT_FOUND|is not found/i.test(msg);
}

function getCacheFilePath(key: string, ext: 'wav' | 'mp3'): string {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return path.join(DISK_CACHE_DIR, `${hash}.${ext}`);
}

async function readDiskCache(
  key: string,
  ext: 'wav' | 'mp3'
): Promise<Buffer | null> {
  const minBytes = ext === 'wav' ? 44 : 128;
  try {
    const buf = await fs.readFile(getCacheFilePath(key, ext));
    return buf.length > minBytes ? buf : null;
  } catch {
    return null;
  }
}

async function writeDiskCache(
  key: string,
  ext: 'wav' | 'mp3',
  buf: Buffer
): Promise<void> {
  try {
    await fs.mkdir(DISK_CACHE_DIR, { recursive: true });
    await fs.writeFile(getCacheFilePath(key, ext), buf);
  } catch {
    // Non-fatal if disk cache cannot be written
  }
}

function setCacheEntry(key: string, ext: 'wav' | 'mp3', entry: CachedAudioResult) {
  if (ttsCache.has(key)) {
    ttsCache.delete(key);
  } else if (ttsCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ttsCache.keys().next().value;
    if (oldestKey) ttsCache.delete(oldestKey);
  }
  ttsCache.set(key, entry);
  void writeDiskCache(key, ext, entry.buffer);
}

/**
 * Gemini unary generateContent returns a complete WAV file (RIFF header, 24kHz mono 16-bit).
 * As a defensive safeguard, wrap with a 44-byte RIFF header only if headerless PCM is returned.
 */
function ensureWavBuffer(raw: Buffer): Buffer {
  if (
    raw.length >= 12 &&
    raw.toString('ascii', 0, 4) === 'RIFF' &&
    raw.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return raw;
  }
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + raw.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(raw.length, 40);
  return Buffer.concat([header, raw]);
}

async function callGeminiTtsModel(
  model: TtsModelName,
  text: string,
  mood: StoryVoiceMood,
  voiceName: string
): Promise<Buffer> {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  return withGeminiConcurrencyLimit(async () => {
    const styleInstruction = MOOD_STYLES[mood] ?? LALI_UNIFIED_VOICE_STYLE;
    const isPreview25 = model === 'gemini-2.5-flash-preview-tts';
    const contents = isPreview25
      ? [
          {
            role: 'user',
            parts: [
              {
                text: `Speak brightly and naturally as an excited 7-year-old human girl guide: ${text}`,
              },
            ],
          },
        ]
      : [
          {
            role: 'user',
            parts: [
              {
                text,
                speechMetadata: {
                  style: styleInstruction,
                },
              },
            ],
          },
        ];

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const audioPart = parts.find((part) => part.inlineData?.data);
    const base64Audio = audioPart?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('Gemini TTS returned no audio payload');
    }
    return ensureWavBuffer(Buffer.from(base64Audio, 'base64'));
  });
}

function cleanTextForEdgeSsml(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/</g, ' less than ')
    .replace(/>/g, ' greater than ')
    .replace(/"/g, '')
    .replace(/'/g, '’')
    .replace(/\s+/g, ' ')
    .trim();
}

const edgeWorkerPool: MsEdgeTTS[] = [];

async function synthesizeEdgeAudioOnce(
  ssmlText: string,
  neuralVoice: NeuralVoiceId
): Promise<Buffer> {
  const tts = edgeWorkerPool.pop() ?? new MsEdgeTTS({ connectionTimeoutMs: 7000, synthesisTimeoutMs: 12000 });
  const prosody = NEURAL_VOICE_PROSODY[neuralVoice] ?? NEURAL_VOICE_PROSODY[DEFAULT_NEURAL_VOICE];

  try {
    await tts.setMetadata(neuralVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(ssmlText, {
      pitch: prosody.pitch,
      rate: prosody.rate,
      volume: 100,
    });

    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const timer = setTimeout(() => {
        audioStream.destroy(new Error('Edge neural synthesis timed out'));
        reject(new Error('Edge neural synthesis timed out'));
      }, 12_000);

      audioStream.on('data', (chunk: Buffer | Uint8Array) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      audioStream.on('end', () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });
      audioStream.on('error', (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    if (audioBuffer.length < 128) {
      throw new Error('Edge neural TTS returned empty audio');
    }
    if (edgeWorkerPool.length < MAX_CONCURRENT_EDGE_TTS) {
      edgeWorkerPool.push(tts);
    } else {
      tts.close();
    }
    return audioBuffer;
  } catch (err) {
    try {
      tts.close();
    } catch {
      // Ignore cleanup errors on failed Edge socket
    }
    throw err;
  }
}

async function callEdgeNeuralTts(
  text: string,
  neuralVoice: NeuralVoiceId
): Promise<Buffer | null> {
  const ssmlText = cleanTextForEdgeSsml(text);
  if (!ssmlText) return null;

  return withEdgeConcurrencyLimit(async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await synthesizeEdgeAudioOnce(ssmlText, neuralVoice);
      } catch (err) {
        if (attempt === 1) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('Edge Neural TTS fallback error:', msg);
          return null;
        }
        await delayMs(150);
      }
    }
    return null;
  });
}

async function tryGeminiSynthesis(
  text: string,
  mood: StoryVoiceMood,
  unifiedVoice: string
): Promise<CachedAudioResult | null> {
  if (!ai || Date.now() < geminiAuthInvalidUntil) {
    return null;
  }

  const geminiCacheKey = `human-v4:${unifiedVoice}:joy:${text}`;
  const cached = ttsCache.get(geminiCacheKey);
  if (cached) {
    return cached;
  }

  const diskCached = await readDiskCache(geminiCacheKey, 'wav');
  if (diskCached) {
    const entry: CachedAudioResult = {
      buffer: diskCached,
      contentType: 'audio/wav',
      engine: 'gemini-3.8-flash-lite-tts',
    };
    ttsCache.set(geminiCacheKey, entry);
    return entry;
  }

  // Low-latency Flash Lite TTS primary, Voice Design model backup, plus 2.5 preview compatibility
  const candidates: TtsModelName[] = [
    'gemini-3.8-flash-lite-tts',
    'gemini-3.8-flash-tts',
    'gemini-2.5-flash-preview-tts',
  ];
  const now = Date.now();
  const activeCandidates = candidates.filter(
    (model) => (modelCooldownUntil.get(model) ?? 0) <= now
  );
  if (activeCandidates.length === 0) {
    return null;
  }

  for (const model of activeCandidates) {
    try {
      const wavBuffer = await callGeminiTtsModel(model, text, mood, unifiedVoice);
      const entry: CachedAudioResult = {
        buffer: wavBuffer,
        contentType: 'audio/wav',
        engine: model,
      };
      setCacheEntry(geminiCacheKey, 'wav', entry);
      return entry;
    } catch (err) {
      if (isAuthError(err)) {
        geminiAuthInvalidUntil = Date.now() + 60_000;
        break;
      }
      if (isNotFoundError(err)) {
        modelCooldownUntil.set(model, Date.now() + 300_000);
      } else if (isQuotaOrRateError(err)) {
        modelCooldownUntil.set(model, Date.now() + 30_000);
      }
      await delayMs(120);
    }
  }
  return null;
}

async function synthesizeStoryVoice(
  text: string,
  mood: StoryVoiceMood,
  _voiceName: string,
  neuralVoice: NeuralVoiceId = DEFAULT_NEURAL_VOICE
): Promise<CachedAudioResult | null> {
  const unifiedVoice = 'Zephyr';
  const geminiHealthy = Boolean(ai) && Date.now() >= geminiAuthInvalidUntil;
  const edgeCacheKey = `edge-v2:${neuralVoice}:joy:${text}`;
  const activeKey = geminiHealthy ? `human-v4:${unifiedVoice}:joy:${text}` : edgeCacheKey;

  const existingInFlight = inFlightTts.get(activeKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const task = (async (): Promise<CachedAudioResult | null> => {
    // Tier 1: Gemini Native Audio TTS (when GEMINI_API_KEY is configured and healthy)
    if (geminiHealthy) {
      const geminiResult = await tryGeminiSynthesis(text, mood, unifiedVoice);
      if (geminiResult) {
        return geminiResult;
      }
    }

    // Tier 2: Expressive Zero-Key Human Neural TTS (en-US-AnaNeural & presets)
    const cachedEdge = ttsCache.get(edgeCacheKey);
    if (cachedEdge) {
      return cachedEdge;
    }

    const diskEdge = await readDiskCache(edgeCacheKey, 'mp3');
    if (diskEdge) {
      const entry: CachedAudioResult = {
        buffer: diskEdge,
        contentType: 'audio/mpeg',
        engine: `edge-neural:${neuralVoice}`,
      };
      ttsCache.set(edgeCacheKey, entry);
      return entry;
    }

    const mp3Buffer = await callEdgeNeuralTts(text, neuralVoice);
    if (mp3Buffer) {
      const entry: CachedAudioResult = {
        buffer: mp3Buffer,
        contentType: 'audio/mpeg',
        engine: `edge-neural:${neuralVoice}`,
      };
      setCacheEntry(edgeCacheKey, 'mp3', entry);
      return entry;
    }

    return null;
  })();

  inFlightTts.set(activeKey, task);
  try {
    return await task;
  } finally {
    inFlightTts.delete(activeKey);
  }
}

function buildStatusPayload(neuralVoice: NeuralVoiceId = DEFAULT_NEURAL_VOICE) {
  const now = Date.now();
  const geminiHealthy = Boolean(ai) && now >= geminiAuthInvalidUntil;
  const activeGeminiModel =
    (modelCooldownUntil.get('gemini-3.8-flash-lite-tts') ?? 0) <= now
      ? 'gemini-3.8-flash-lite-tts'
      : (modelCooldownUntil.get('gemini-3.8-flash-tts') ?? 0) <= now
        ? 'gemini-3.8-flash-tts'
        : 'gemini-2.5-flash-preview-tts';

  return {
    available: true,
    activeEngine: geminiHealthy ? 'gemini-tts' : 'edge-neural',
    geminiConfigured: Boolean(ai),
    geminiHealthy,
    model: geminiHealthy ? activeGeminiModel : neuralVoice,
    persona: 'natural-child-guide',
    voice: geminiHealthy ? 'Zephyr' : neuralVoice,
    neuralVoice,
    cachedLines: ttsCache.size,
  };
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
  const cleanOutput = filtered.filter((l, idx) => l !== '' || idx < filtered.length - 1).join('\n') + '\n';
  await fs.writeFile(envLocalPath, cleanOutput, 'utf8');
}

async function startServer() {
  await loadEnvFilesIntoProcess();
  initializeGeminiClient(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => {
    const isProd = process.env.NODE_ENV === 'production';
    res.json({
      ok: true,
      mode: isProd ? 'production' : 'development',
      voice: buildStatusPayload(DEFAULT_NEURAL_VOICE),
    });
  });

  app.get('/api/tts/status', (req, res) => {
    const requestedNeural =
      typeof req.query?.neuralVoice === 'string' &&
      ALLOWED_NEURAL_VOICES.includes(req.query.neuralVoice as NeuralVoiceId)
        ? (req.query.neuralVoice as NeuralVoiceId)
        : DEFAULT_NEURAL_VOICE;
    res.json(buildStatusPayload(requestedNeural));
  });

  app.post('/api/tts/config', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        error: 'Runtime API key updates are disabled in production; configure GEMINI_API_KEY via server environment variables.',
      });
      return;
    }
    const rawKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
    const persist = Boolean(req.body?.persist);

    initializeGeminiClient(rawKey || null);
    if (persist) {
      try {
        await persistGeminiKeyToEnvLocal(rawKey);
      } catch (err) {
        console.warn('Could not persist .env.local:', err);
      }
    }

    res.json(buildStatusPayload(DEFAULT_NEURAL_VOICE));
  });

  app.post('/api/tts', async (req, res) => {
    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!rawText) {
      res.status(400).json({ error: 'Missing speech text' });
      return;
    }

    const cleanText = rawText.slice(0, 600);
    const rawMood = req.body?.mood;
    const mood: StoryVoiceMood =
      rawMood === 'curious' || rawMood === 'gentle' || rawMood === 'joy' ? rawMood : 'warm';
    const voiceName =
      typeof req.body?.voice === 'string' &&
      ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'].includes(req.body.voice)
        ? req.body.voice
        : 'Zephyr';
    const neuralVoice: NeuralVoiceId =
      typeof req.body?.neuralVoice === 'string' &&
      ALLOWED_NEURAL_VOICES.includes(req.body.neuralVoice as NeuralVoiceId)
        ? (req.body.neuralVoice as NeuralVoiceId)
        : DEFAULT_NEURAL_VOICE;

    try {
      const audio = await synthesizeStoryVoice(cleanText, mood, voiceName, neuralVoice);
      if (!audio) {
        res.status(200).json({ fallback: true, reason: 'offline_or_unavailable' });
        return;
      }
      const playbackRate = audio.engine.startsWith('edge-neural') ? '1.0' : '1.1';
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
    const status = buildStatusPayload(DEFAULT_NEURAL_VOICE);
    console.log(
      `Echoes of Rasuwa server listening on http://localhost:${port} [voice=${status.activeEngine}:${status.voice}]`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
