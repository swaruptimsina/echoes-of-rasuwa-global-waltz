import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export type StoryVoiceMood = 'warm' | 'curious' | 'gentle' | 'joy';
export type TtsModelName =
  | 'gemini-3.8-flash-lite-tts'
  | 'gemini-3.8-flash-tts'
  | 'gemini-2.5-flash-preview-tts';

export type NeuralVoiceId =
  | 'en-US-AnaNeural'
  | 'en-GB-MaisieNeural'
  | 'en-IN-NeerjaExpressiveNeural'
  | 'en-US-AvaNeural'
  | 'en-US-EmmaNeural';

export const DEFAULT_NEURAL_VOICE: NeuralVoiceId = 'en-US-AnaNeural';

export const NEURAL_VOICE_PROSODY: Record<NeuralVoiceId, { pitch: string; rate: string }> = {
  'en-US-AnaNeural': { pitch: '+3Hz', rate: '+5%' },
  'en-GB-MaisieNeural': { pitch: '+2Hz', rate: '+4%' },
  'en-IN-NeerjaExpressiveNeural': { pitch: '+2Hz', rate: '+5%' },
  'en-US-AvaNeural': { pitch: '+2Hz', rate: '+5%' },
  'en-US-EmmaNeural': { pitch: '+2Hz', rate: '+5%' },
};

export const ALLOWED_NEURAL_VOICES = Object.keys(NEURAL_VOICE_PROSODY) as NeuralVoiceId[];
const ALLOWED_GEMINI_VOICES = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'] as const;

export const LALI_UNIFIED_VOICE_STYLE =
  'Happy excited 7-year-old human girl speaking brightly and briskly—sparkling cheerful energy like Masha from Masha and the Bear, crystal clear words and natural human cadence.';

export const MOOD_STYLES: Record<StoryVoiceMood, string> = {
  warm: LALI_UNIFIED_VOICE_STYLE,
  curious: LALI_UNIFIED_VOICE_STYLE,
  gentle: LALI_UNIFIED_VOICE_STYLE,
  joy: LALI_UNIFIED_VOICE_STYLE,
};

export interface CachedAudioResult {
  buffer: Buffer;
  contentType: 'audio/wav' | 'audio/mpeg';
  engine: string;
}

export interface TtsStatusPayload {
  available: boolean;
  activeEngine: 'gemini-tts' | 'edge-neural';
  geminiConfigured: boolean;
  geminiHealthy: boolean;
  model: string;
  persona: 'natural-child-guide';
  voice: string;
  neuralVoice: NeuralVoiceId;
  cachedLines: number;
}

export interface TtsEngineOptions {
  cacheDir?: string;
  serverless?: boolean;
  reuseEdgeSocket?: boolean;
  edgeConnectionTimeoutMs?: number;
  edgeSynthesisTimeoutMs?: number;
  edgeStreamTimeoutMs?: number;
  edgeBudgetMs?: number;
  geminiAttemptTimeoutMs?: number;
}

export interface ParsedTtsRequest {
  text: string;
  mood: StoryVoiceMood;
  voiceName: string;
  neuralVoice: NeuralVoiceId;
}

const MAX_CACHE_ENTRIES = 300;
const MAX_CONCURRENT_GEMINI_TTS = 3;
const MAX_CONCURRENT_EDGE_TTS = 2;

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
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

export function cleanTextForEdgeSsml(text: string): string {
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

/**
 * Gemini unary generateContent returns a complete WAV file (RIFF header, 24kHz mono 16-bit).
 * As a defensive safeguard, wrap with a 44-byte RIFF header only if headerless PCM is returned.
 */
export function ensureWavBuffer(raw: Buffer): Buffer {
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

export function parseNeuralVoice(raw: unknown): NeuralVoiceId {
  return typeof raw === 'string' && ALLOWED_NEURAL_VOICES.includes(raw as NeuralVoiceId)
    ? (raw as NeuralVoiceId)
    : DEFAULT_NEURAL_VOICE;
}

export function parseTtsRequestBody(body: unknown): ParsedTtsRequest | { error: string } {
  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const rawText = typeof payload.text === 'string' ? payload.text.trim() : '';
  if (!rawText) {
    return { error: 'Missing speech text' };
  }

  const rawMood = payload.mood;
  const mood: StoryVoiceMood =
    rawMood === 'curious' || rawMood === 'gentle' || rawMood === 'joy' ? rawMood : 'warm';
  const rawVoice = payload.voice;
  const voiceName =
    typeof rawVoice === 'string' &&
    (ALLOWED_GEMINI_VOICES as readonly string[]).includes(rawVoice)
      ? rawVoice
      : 'Zephyr';

  return {
    text: rawText.slice(0, 600),
    mood,
    voiceName,
    neuralVoice: parseNeuralVoice(payload.neuralVoice),
  };
}

export function getVoicePlaybackRate(engine: string): string {
  return engine.startsWith('edge-neural') ? '1.0' : '1.1';
}

function createConcurrencyLimiter(maxConcurrent: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  return async function withLimit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= maxConcurrent) {
      await new Promise<void>((resolve) => {
        queue.push(resolve);
      });
    }
    active++;
    try {
      return await fn();
    } finally {
      active--;
      const next = queue.shift();
      if (next) next();
    }
  };
}

export function createTtsEngine(options: TtsEngineOptions = {}) {
  const serverless = Boolean(options.serverless);
  const diskCacheDir = options.cacheDir ?? path.join(os.tmpdir(), 'echoes-of-rasuwa-tts-cache');
  const reuseEdgeSocket = options.reuseEdgeSocket ?? !serverless;
  const edgeConnectionTimeoutMs = options.edgeConnectionTimeoutMs ?? (serverless ? 3500 : 7000);
  const edgeSynthesisTimeoutMs = options.edgeSynthesisTimeoutMs ?? (serverless ? 5500 : 12000);
  const edgeStreamTimeoutMs = options.edgeStreamTimeoutMs ?? (serverless ? 6000 : 12000);
  const edgeBudgetMs = options.edgeBudgetMs ?? (serverless ? 7800 : 25000);
  const geminiAttemptTimeoutMs = options.geminiAttemptTimeoutMs ?? (serverless ? 4500 : 15000);

  const ttsCache = new Map<string, CachedAudioResult>();
  const inFlightTts = new Map<string, Promise<CachedAudioResult | null>>();
  const modelCooldownUntil = new Map<TtsModelName, number>();
  const edgeWorkerPool: MsEdgeTTS[] = [];

  const withGeminiLimit = createConcurrencyLimiter(MAX_CONCURRENT_GEMINI_TTS);
  const withEdgeLimit = createConcurrencyLimiter(MAX_CONCURRENT_EDGE_TTS);

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

  function getCacheFilePath(key: string, ext: 'wav' | 'mp3'): string {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return path.join(diskCacheDir, `${hash}.${ext}`);
  }

  async function readDiskCache(key: string, ext: 'wav' | 'mp3'): Promise<Buffer | null> {
    const minBytes = ext === 'wav' ? 44 : 128;
    try {
      const buf = await fs.readFile(getCacheFilePath(key, ext));
      return buf.length > minBytes ? buf : null;
    } catch {
      return null;
    }
  }

  async function writeDiskCache(key: string, ext: 'wav' | 'mp3', buf: Buffer): Promise<void> {
    try {
      await fs.mkdir(diskCacheDir, { recursive: true });
      await fs.writeFile(getCacheFilePath(key, ext), buf);
    } catch {
      // Non-fatal if disk cache cannot be written (e.g. constrained environment)
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

  async function callGeminiTtsModel(
    model: TtsModelName,
    text: string,
    mood: StoryVoiceMood,
    voiceName: string
  ): Promise<Buffer> {
    if (!ai) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    return withGeminiLimit(async () => {
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

      const response = await withTimeout(
        ai!.models.generateContent({
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
        }),
        geminiAttemptTimeoutMs,
        `Gemini TTS model ${model} timed out`
      );

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const audioPart = parts.find((part) => part.inlineData?.data);
      const base64Audio = audioPart?.inlineData?.data;
      if (!base64Audio) {
        throw new Error('Gemini TTS returned no audio payload');
      }
      return ensureWavBuffer(Buffer.from(base64Audio, 'base64'));
    });
  }

  async function synthesizeEdgeAudioOnce(
    ssmlText: string,
    neuralVoice: NeuralVoiceId,
    timeoutCapMs: number
  ): Promise<Buffer> {
    const connTimeout = Math.min(edgeConnectionTimeoutMs, timeoutCapMs);
    const synthTimeout = Math.min(edgeSynthesisTimeoutMs, timeoutCapMs);
    const streamTimeout = Math.min(edgeStreamTimeoutMs, timeoutCapMs);
    const tts =
      (reuseEdgeSocket ? edgeWorkerPool.pop() : undefined) ??
      new MsEdgeTTS({ connectionTimeoutMs: connTimeout, synthesisTimeoutMs: synthTimeout });
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
        }, streamTimeout);

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
      if (reuseEdgeSocket && edgeWorkerPool.length < MAX_CONCURRENT_EDGE_TTS) {
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

    return withEdgeLimit(async () => {
      const deadline = Date.now() + edgeBudgetMs;
      for (let attempt = 0; attempt < 2; attempt++) {
        const remaining = deadline - Date.now();
        if (attempt > 0 && remaining < 2200) {
          return null;
        }
        try {
          return await synthesizeEdgeAudioOnce(ssmlText, neuralVoice, remaining);
        } catch (err) {
          if (attempt === 1) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('Edge Neural TTS fallback error:', msg);
            return null;
          }
          await delayMs(120);
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

    const overallDeadline = serverless ? now + 4800 : Number.POSITIVE_INFINITY;
    for (const model of activeCandidates) {
      if (Date.now() >= overallDeadline) break;
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

  function buildStatusPayload(neuralVoice: NeuralVoiceId = DEFAULT_NEURAL_VOICE): TtsStatusPayload {
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

  initializeGeminiClient(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

  return {
    initializeGeminiClient,
    synthesizeStoryVoice,
    buildStatusPayload,
  };
}
