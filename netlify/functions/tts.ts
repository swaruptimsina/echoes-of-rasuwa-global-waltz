import os from 'node:os';
import path from 'node:path';
import {
  createTtsEngine,
  DEFAULT_NEURAL_VOICE,
  getVoicePlaybackRate,
  parseNeuralVoice,
  parseTtsRequestBody,
} from '../../lib/ttsEngine';

const ttsEngine = createTtsEngine({
  cacheDir: path.join(os.tmpdir(), 'echoes-of-rasuwa-tts-cache'),
  serverless: true,
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function resolveRoutePath(req: Request): { url: URL; routePath: string } {
  const url = new URL(req.url);
  const routeParam = (url.searchParams.get('route') ?? '').replace(/^\/+|\/+$/g, '');
  const rawPath = routeParam ? `/${routeParam}` : url.pathname;
  const routePath =
    rawPath
      .replace(/^\/\.netlify\/functions\/tts(?=\/|$)/, '')
      .replace(/^\/api(?=\/|$)/, '')
      .replace(/\/+$/, '') || '/';
  return { url, routePath };
}

async function readJsonBody(req: Request): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  let rawText = '';
  try {
    rawText = await req.text();
  } catch {
    return { ok: false, response: jsonResponse({ error: 'Invalid request body' }, 400) };
  }

  if (Buffer.byteLength(rawText, 'utf8') > 32 * 1024) {
    return { ok: false, response: jsonResponse({ error: 'Request payload too large' }, 413) };
  }
  if (!rawText.trim()) {
    return { ok: true, body: {} };
  }

  try {
    return { ok: true, body: JSON.parse(rawText) as unknown };
  } catch {
    return { ok: false, response: jsonResponse({ error: 'Invalid JSON request body' }, 400) };
  }
}

/**
 * Netlify serverless entrypoint handling /api/tts, /api/tts/status, /api/tts/config, and /api/health.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'GET, POST, OPTIONS',
      },
    });
  }

  const { url, routePath } = resolveRoutePath(req);

  if (routePath === '/health') {
    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }
    return jsonResponse({
      ok: true,
      mode: 'production',
      runtime: 'netlify-function',
      voice: ttsEngine.buildStatusPayload(DEFAULT_NEURAL_VOICE),
    });
  }

  if (routePath === '/tts/status' || routePath === '/status' || (routePath === '/' && req.method === 'GET')) {
    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }
    const requestedNeural = parseNeuralVoice(url.searchParams.get('neuralVoice'));
    return jsonResponse(ttsEngine.buildStatusPayload(requestedNeural));
  }

  if (routePath === '/tts/config' || routePath === '/config') {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }
    return jsonResponse(
      {
        error:
          'Runtime API key updates are disabled in production; configure GEMINI_API_KEY via Netlify environment variables.',
      },
      403
    );
  }

  if (routePath === '/tts' || (routePath === '/' && req.method === 'POST')) {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const bodyResult = await readJsonBody(req);
    if ('response' in bodyResult) {
      return bodyResult.response;
    }

    const parsed = parseTtsRequestBody(bodyResult.body);
    if ('error' in parsed) {
      return jsonResponse({ error: parsed.error }, 400);
    }

    try {
      const audio = await ttsEngine.synthesizeStoryVoice(
        parsed.text,
        parsed.mood,
        parsed.voiceName,
        parsed.neuralVoice
      );
      if (!audio) {
        return jsonResponse({ fallback: true, reason: 'offline_or_unavailable' });
      }
      const playbackRate = getVoicePlaybackRate(audio.engine);
      return new Response(new Uint8Array(audio.buffer), {
        status: 200,
        headers: {
          'Content-Type': audio.contentType,
          'Content-Length': String(audio.buffer.length),
          'X-Voice-Engine': audio.engine,
          'X-Voice-Playback-Rate': playbackRate,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'TTS generation failed';
      console.error('Netlify Story TTS error:', message);
      return jsonResponse({ fallback: true, reason: 'error' });
    }
  }

  return jsonResponse({ error: 'Not found' }, 404);
}
