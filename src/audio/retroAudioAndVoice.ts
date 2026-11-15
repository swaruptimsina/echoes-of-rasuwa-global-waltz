// Relaxing Himalayan Soundscape, Sweet Girl Guide Voice & Radar Field Audio Engine
import { SingleInstanceSpeakerController } from './singleInstanceSpeaker';

export type BgmStyle = 'relaxing' | 'retro';

function normalizeNepaliPronunciation(text: string): string {
  return text
    .replace(/नमस्ते\s*\(?Namaste\)?/gi, 'Namaste')
    .replace(/धेरै धन्यवाद/gi, 'Dhanyabad')
    .replace(/L-band/gi, 'L band')
    .replace(/S-band/gi, 'S band')
    .replace(/C-band/gi, 'C band')
    .replace(/InSAR/g, 'In-SAR')
    .replace(/NISAR/g, 'Nye-sar')
    .replace(/m³/g, 'cubic meters')
    .replace(/km²/g, 'square kilometers')
    .replace(/mm\/hr/gi, 'millimeters per hour')
    .replace(/cm\/yr/gi, 'centimeters per year')
    .replace(/[•·]/g, ', ')
    .replace(/\s*[→↔]\s*/g, ' to ')
    .replace(/εr/g, 'dielectric constant')
    .replace(/γ/g, 'coherence');
}

class RetroAudioAndVoiceEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;

  public sfxEnabled = true;
  public bgmEnabled = false;
  public bgmStyle: BgmStyle = 'relaxing';
  public voiceEnabled = true;

  private mouthCallback: ((open: boolean) => void) | null = null;
  private speakingChangeCallback: ((speaking: boolean) => void) | null = null;
  private mouthInterval: number | null = null;
  private fallbackTimer: number | null = null;

  public unlock() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.55;
      this.masterGain.connect(this.ctx.destination);

      this.bgmFilter = this.ctx.createBiquadFilter();
      this.bgmFilter.type = 'lowpass';
      this.bgmFilter.frequency.value = 1150;
      this.bgmFilter.Q.value = 0.5;

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.065;
      this.bgmFilter.connect(this.bgmGain);
      this.bgmGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }

  public onMouthState(cb: ((open: boolean) => void) | null) {
    this.mouthCallback = cb;
  }

  public onSpeakingState(cb: ((speaking: boolean) => void) | null) {
    this.speakingChangeCallback = cb;
  }

  private duckBgm(duck: boolean) {
    if (!this.ctx || !this.bgmGain) return;
    const now = this.ctx.currentTime;
    this.bgmGain.gain.cancelScheduledValues(now);
    const target = duck ? 0.015 : this.bgmStyle === 'relaxing' ? 0.065 : 0.055;
    this.bgmGain.gain.linearRampToValueAtTime(target, now + 0.3);
  }

  public setBgmStyle(style: BgmStyle) {
    this.bgmStyle = style;
    if (this.bgmEnabled) {
      this.startBgmLoop();
    }
  }

  public startRelaxingStoryBgm(): boolean {
    this.bgmStyle = 'relaxing';
    if (!this.bgmEnabled) {
      return this.toggleBgm(true);
    }
    return true;
  }

  public toggleBgm(force?: boolean): boolean {
    this.unlock();
    this.bgmEnabled = force !== undefined ? force : !this.bgmEnabled;
    if (this.bgmEnabled) {
      this.startBgmLoop();
    } else {
      this.stopBgmLoop();
    }
    return this.bgmEnabled;
  }

  private startBgmLoop() {
    this.stopBgmLoop();
    if (this.bgmStyle === 'relaxing') {
      this.startRelaxingHimalayanBgm();
      return;
    }

    // Nostalgic Himalayan Pentatonic 16-bit sequence
    const leadNotes = [
      587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 523.25,
      587.33, 659.25, 523.25, 440.0, 523.25, 587.33, 659.25, 0,
      659.25, 783.99, 880.0, 1046.5, 880.0, 783.99, 659.25, 587.33,
      523.25, 587.33, 523.25, 440.0, 392.0, 440.0, 587.33, 0
    ];
    const bassNotes = [
      146.83, 220.0, 293.66, 220.0, 130.81, 196.0, 261.63, 196.0,
      174.61, 261.63, 349.23, 261.63, 146.83, 220.0, 293.66, 220.0
    ];

    this.bgmTimer = window.setInterval(() => {
      if (!this.bgmEnabled || !this.ctx || !this.bgmFilter || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const lead = leadNotes[this.bgmStep % leadNotes.length];
      const bass = bassNotes[Math.floor(this.bgmStep / 2) % bassNotes.length];

      if (lead > 0) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(lead, now);
        osc.frequency.linearRampToValueAtTime(lead * 1.004, now + 0.16);
        osc.frequency.linearRampToValueAtTime(lead, now + 0.3);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.24, now + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.33);
        osc.connect(g);
        g.connect(this.bgmFilter);
        osc.start(now);
        osc.stop(now + 0.35);
      }

      if (this.bgmStep % 2 === 0 && bass > 0) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bass, now);
        bGain.gain.setValueAtTime(0.001, now);
        bGain.gain.linearRampToValueAtTime(0.2, now + 0.02);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
        bOsc.connect(bGain);
        bGain.connect(this.bgmFilter);
        bOsc.start(now);
        bOsc.stop(now + 0.65);
      }

      this.bgmStep++;
    }, 340);
  }

  private startRelaxingHimalayanBgm() {
    // Cool, subtle ambient Himalayan bansuri & soft mountain harp pad
    const flutePhrases = [
      587.33, 0, 659.25, 0, 783.99, 0, 659.25, 587.33,
      440.0, 0, 493.88, 0, 587.33, 0, 0, 0,
      587.33, 0, 783.99, 0, 880.0, 0, 783.99, 659.25,
      493.88, 0, 440.0, 0, 392.0, 0, 0, 0
    ];
    const harpArp = [
      196.0, 293.66, 392.0, 493.88,
      220.0, 329.63, 440.0, 523.25,
      146.83, 220.0, 293.66, 369.99,
      196.0, 293.66, 392.0, 440.0
    ];

    this.bgmTimer = window.setInterval(() => {
      if (!this.bgmEnabled || !this.ctx || !this.bgmFilter || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const flute = flutePhrases[this.bgmStep % flutePhrases.length];
      const harp = harpArp[this.bgmStep % harpArp.length];

      if (flute > 0) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(flute * 0.994, now);
        osc.frequency.linearRampToValueAtTime(flute, now + 0.16);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.14, now + 0.18);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.05);
        osc.connect(g);
        g.connect(this.bgmFilter);
        osc.start(now);
        osc.stop(now + 1.08);
      }

      if (harp > 0) {
        const hOsc = this.ctx.createOscillator();
        const hGain = this.ctx.createGain();
        hOsc.type = 'sine';
        hOsc.frequency.setValueAtTime(harp, now);
        hGain.gain.setValueAtTime(0.001, now);
        hGain.gain.linearRampToValueAtTime(0.11, now + 0.04);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
        hOsc.connect(hGain);
        hGain.connect(this.bgmFilter);
        hOsc.start(now);
        hOsc.stop(now + 1.28);
      }

      this.bgmStep++;
    }, 560);
  }

  private stopBgmLoop() {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  public playUiClick(pitch = 660) {
    if (!this.sfxEnabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.setValueAtTime(pitch * 1.18, now + 0.035);
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playFootstep(onSnow = false) {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    const base = onSnow ? 290 + Math.random() * 60 : 145 + Math.random() * 35;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.045);
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playRadarPing(band: 'L' | 'S' = 'L') {
    if (!this.sfxEnabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    const startFreq = band === 'L' ? 420 : 840;
    const endFreq = band === 'L' ? 980 : 1560;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.18);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.44);
  }

  public playWarpTo3D() {
    if (!this.sfxEnabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const arp = [293.66, 369.99, 440, 587.33, 659.25, 880];
    arp.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.075;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.27);
    });
  }

  public playWarpTo2D() {
    if (!this.sfxEnabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const arp = [880, 659.25, 587.33, 440, 369.99, 293.66];
    arp.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.065;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  public playBadgeUnlock() {
    if (!this.sfxEnabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.09;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.11, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (i === 3 ? 0.5 : 0.18));
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + (i === 3 ? 0.52 : 0.2));
    });
  }

  public playDiscoveryChime() {
    this.playBadgeUnlock();
  }

  public playBlip() {
    this.playUiClick(340);
  }

  public playSirenAlert() {
    if (!this.sfxEnabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.36;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.linearRampToValueAtTime(860, t + 0.18);
      osc.frequency.linearRampToValueAtTime(520, t + 0.34);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.36);
    }
  }

  public playRetroTalkBlip(moodPitch = 250) {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    const f = moodPitch + (Math.random() * 55 - 25);
    osc.frequency.setValueAtTime(f, now);
    g.gain.setValueAtTime(0.028, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.042);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  private speechSessionId = 0;
  private currentStoryAudio: HTMLAudioElement | null = null;
  private ttsAudioCache = new Map<string, { url: string; playbackRate: number; engine: string }>();
  private ttsPendingFetches = new Map<
    string,
    Promise<{ url: string; playbackRate: number; engine: string } | null>
  >();
  private ttsUnavailable = false;
  private pendingAutoplayCleanup: (() => void) | null = null;
  private voiceStatusListeners = new Set<(engine: string) => void>();
  public neuralVoiceId = 'en-US-AnaNeural';
  public activeVoiceEngine = 'edge-neural:en-US-AnaNeural';

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('rasuwa_neural_voice');
        if (saved && /^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/.test(saved)) {
          this.neuralVoiceId = saved;
          this.activeVoiceEngine = `edge-neural:${saved}`;
        }
      } catch {
        // Ignore restricted storage contexts
      }
    }
  }

  public onVoiceEngineChange(cb: (engine: string) => void): () => void {
    this.voiceStatusListeners.add(cb);
    cb(this.activeVoiceEngine);
    return () => {
      this.voiceStatusListeners.delete(cb);
    };
  }

  private setActiveVoiceEngine(engine: string) {
    if (this.activeVoiceEngine === engine) return;
    this.activeVoiceEngine = engine;
    this.voiceStatusListeners.forEach((cb) => {
      try {
        cb(engine);
      } catch {
        // Ignore listener errors
      }
    });
  }

  public setNeuralVoiceId(voiceId: string) {
    this.neuralVoiceId = voiceId;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('rasuwa_neural_voice', voiceId);
      } catch {
        // Ignore restricted storage contexts
      }
    }
    this.clearVoiceCache();
  }

  public clearVoiceCache() {
    for (const entry of this.ttsAudioCache.values()) {
      try {
        URL.revokeObjectURL(entry.url);
      } catch {
        // Ignore revoke errors
      }
    }
    this.ttsAudioCache.clear();
    this.prefetchQueue = [];
    this.ttsUnavailable = false;
    this.ttsCooldownUntil = 0;
  }

  private clearPendingAutoplayRetry() {
    if (this.pendingAutoplayCleanup) {
      this.pendingAutoplayCleanup();
      this.pendingAutoplayCleanup = null;
    }
  }

  private playRadioKeyChirp() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1050, now);
    osc.frequency.setValueAtTime(1320, now + 0.03);
    g.gain.setValueAtTime(0.035, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  private readonly singleSpeaker = new SingleInstanceSpeakerController();
  private isCurrentlySpeaking = false;

  private cancelActivePlaybackOnly() {
    this.speechSessionId++;
    this.isCurrentlySpeaking = false;
    this.clearPendingAutoplayRetry();
    if (this.currentStoryAudio) {
      try {
        this.currentStoryAudio.onplay = null;
        this.currentStoryAudio.onended = null;
        this.currentStoryAudio.onerror = null;
        this.currentStoryAudio.pause();
        this.currentStoryAudio.currentTime = 0;
      } catch {
        // Ignore cleanup errors on stopped audio elements
      }
      this.currentStoryAudio = null;
    }
    if (this.mouthInterval !== null) {
      clearInterval(this.mouthInterval);
      this.mouthInterval = null;
    }
    if (this.fallbackTimer !== null) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.duckBgm(false);
    this.mouthCallback?.(false);
    this.speakingChangeCallback?.(false);
  }

  public stopSpeaking() {
    this.singleSpeaker.stopAll();
    this.cancelActivePlaybackOnly();
  }

  private ttsCooldownUntil = 0;
  private activeLiveSpeechFetchCount = 0;

  private async fetchGeminiVoiceUrl(
    cleanSpeech: string,
    _mood: 'warm' | 'curious' | 'gentle' | 'joy',
    isLiveSpeech = false
  ): Promise<{ url: string; playbackRate: number; engine: string } | null> {
    if (this.ttsUnavailable || Date.now() < this.ttsCooldownUntil || typeof fetch === 'undefined') {
      return null;
    }
    const unifiedMood = 'joy';
    const voiceChoice = this.neuralVoiceId;
    const key = `Zephyr:${voiceChoice}:${unifiedMood}:${cleanSpeech}`;
    const cached = this.ttsAudioCache.get(key);
    if (cached) return cached;

    const existing = this.ttsPendingFetches.get(key);
    if (existing) {
      return existing;
    }

    if (isLiveSpeech) {
      this.activeLiveSpeechFetchCount++;
    }

    const requestPromise = (async () => {
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: cleanSpeech,
              mood: unifiedMood,
              voice: 'Zephyr',
              neuralVoice: voiceChoice,
            }),
          });

          if (res.status === 503) {
            this.ttsUnavailable = true;
            return null;
          }
          if (!res.ok) {
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 250));
              continue;
            }
            return null;
          }
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('audio/')) {
            this.ttsCooldownUntil = Date.now() + 8_000;
            return null;
          }

          const blob = await res.blob();
          if (!blob.size) return null;
          const engine = res.headers.get('x-voice-engine') || 'gemini-tts';
          const rateHeader = Number(res.headers.get('x-voice-playback-rate') || '');
          const playbackRate =
            Number.isFinite(rateHeader) && rateHeader > 0
              ? rateHeader
              : engine.startsWith('edge-neural')
                ? 1.0
                : 1.1;

          this.setActiveVoiceEngine(engine);

          const objectUrl = URL.createObjectURL(blob);
          if (this.ttsAudioCache.size >= 150) {
            const oldestKey = this.ttsAudioCache.keys().next().value;
            if (oldestKey) {
              const oldEntry = this.ttsAudioCache.get(oldestKey);
              if (oldEntry) URL.revokeObjectURL(oldEntry.url);
              this.ttsAudioCache.delete(oldestKey);
            }
          }
          const entry = { url: objectUrl, playbackRate, engine };
          this.ttsAudioCache.set(key, entry);
          return entry;
        }
        return null;
      } catch {
        return null;
      } finally {
        if (isLiveSpeech) {
          this.activeLiveSpeechFetchCount = Math.max(0, this.activeLiveSpeechFetchCount - 1);
        }
        this.ttsPendingFetches.delete(key);
      }
    })();

    this.ttsPendingFetches.set(key, requestPromise);
    return requestPromise;
  }

  private prefetchQueue: Array<{ text: string; mood: 'warm' | 'curious' | 'gentle' | 'joy' }> = [];
  private isDrainingPrefetch = false;

  /**
   * Queues neural / Gemini TTS audio warming sequentially so lines play instantly without flooding.
   */
  public prefetchStoryGirl(
    text: string,
    _mood: 'warm' | 'curious' | 'gentle' | 'joy' = 'joy'
  ) {
    if (
      !this.voiceEnabled ||
      !text.trim() ||
      this.ttsUnavailable ||
      Date.now() < this.ttsCooldownUntil
    ) {
      return;
    }
    const cleanSpeech = normalizeNepaliPronunciation(text);
    const unifiedMood = 'joy';
    const key = `Zephyr:${this.neuralVoiceId}:${unifiedMood}:${cleanSpeech}`;
    if (this.ttsAudioCache.has(key) || this.ttsPendingFetches.has(key)) return;
    if (!this.prefetchQueue.some((q) => q.text === cleanSpeech)) {
      this.prefetchQueue.push({ text: cleanSpeech, mood: unifiedMood });
    }
    if (!this.isDrainingPrefetch) {
      this.isDrainingPrefetch = true;
      void (async () => {
        try {
          while (this.prefetchQueue.length > 0 && Date.now() >= this.ttsCooldownUntil) {
            // Yield while live speech is fetching so active scenes never wait behind prefetch
            while (this.activeLiveSpeechFetchCount > 0) {
              await new Promise((r) => setTimeout(r, 180));
            }
            const next = this.prefetchQueue.shift();
            if (!next) break;
            await this.fetchGeminiVoiceUrl(next.text, 'joy', false);
            await new Promise((r) => setTimeout(r, 150));
          }
        } finally {
          this.isDrainingPrefetch = false;
        }
      })();
    }
  }

  private speakNaturalFallback(
    cleanSpeech: string,
    _mood: 'warm' | 'curious' | 'gentle' | 'joy',
    sessionId: number,
    speakerToken: number,
    startMouthAnim: () => void,
    finishSpeech: () => void
  ) {
    if (
      sessionId !== this.speechSessionId ||
      !this.singleSpeaker.isTokenCurrent(speakerToken)
    ) {
      return;
    }
    const hasSpeechApi =
      'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    if (!hasSpeechApi) {
      finishSpeech();
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    const isNaturalFemale = (name: string) =>
      !/male|daniel|george|ryan|rishi|guy|david|mark|alex|fred|bruce|ralph|arthur|oliver|espeak|festival|mbrola|flite/i.test(
        name
      );

    const preferred =
      voices.find(
        (v) =>
          isNaturalFemale(v.name) &&
          /Natural|Online/i.test(v.name) &&
          /en/i.test(v.lang)
      ) ||
      voices.find(
        (v) =>
          isNaturalFemale(v.name) &&
          /Zephyr|Kore|Aria|Jenny|Neerja|Swara|Sonia|Libby|Ana|Maisie|Google UK English Female|Google US English|Samantha|Zira/i.test(
            v.name
          )
      ) ||
      voices.find((v) => isNaturalFemale(v.name) && /en[-_](IN|GB|US|AU)/i.test(v.lang)) ||
      voices.find((v) => /en/i.test(v.lang) && !/espeak|festival/i.test(v.name));

    if (voices.length === 0) {
      if (!this.singleSpeaker.claimPlaybackChannel(speakerToken, 'timer_fallback')) {
        return;
      }
      startMouthAnim();
      const durationMs = Math.min(4200, Math.max(1200, cleanSpeech.length * 36));
      this.fallbackTimer = window.setTimeout(finishSpeech, durationMs);
      return;
    }

    if (!this.singleSpeaker.claimPlaybackChannel(speakerToken, 'web_speech')) {
      return;
    }
    this.setActiveVoiceEngine('browser-fallback');
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(cleanSpeech);
    if (preferred) utter.voice = preferred;
    utter.pitch = 1.08;
    utter.rate = 1.02;
    utter.volume = 1.0;
    utter.onstart = startMouthAnim;
    utter.onend = finishSpeech;
    utter.onerror = finishSpeech;
    window.speechSynthesis.speak(utter);
  }

  /**
   * Natural clear child guide voice powered by Human Neural / Gemini TTS (/api/tts)
   * guarded by SingleInstanceSpeakerController so dialogue never fires twice.
   */
  public speakStoryGirl(
    text: string,
    _mood: 'warm' | 'curious' | 'gentle' | 'joy' = 'joy',
    forceReplay = false
  ) {
    const cleanSpeech = normalizeNepaliPronunciation(text);
    if (!this.voiceEnabled || !cleanSpeech.trim()) {
      this.stopSpeaking();
      return;
    }

    const lock = this.singleSpeaker.acquire(cleanSpeech, {
      speakerId: 'lali_girl',
      forceReplay,
      dedupeWindowMs: 5000,
    });
    if (!lock.accepted) {
      return;
    }

    const speakerToken = lock.token;
    this.cancelActivePlaybackOnly();
    this.unlock();
    this.isCurrentlySpeaking = true;

    const sessionId = ++this.speechSessionId;
    const unifiedMood = 'joy';

    let toggle = false;
    const startMouthAnim = () => {
      if (
        sessionId !== this.speechSessionId ||
        !this.singleSpeaker.isTokenCurrent(speakerToken)
      ) {
        return;
      }
      this.duckBgm(true);
      this.speakingChangeCallback?.(true);
      if (this.mouthInterval !== null) clearInterval(this.mouthInterval);
      this.mouthInterval = window.setInterval(() => {
        if (
          sessionId !== this.speechSessionId ||
          !this.singleSpeaker.isTokenCurrent(speakerToken)
        ) {
          return;
        }
        toggle = !toggle;
        this.mouthCallback?.(toggle);
      }, 115);
    };

    const finishSpeech = () => {
      if (
        sessionId !== this.speechSessionId ||
        !this.singleSpeaker.isTokenCurrent(speakerToken)
      ) {
        return;
      }
      this.singleSpeaker.release(speakerToken);
      this.isCurrentlySpeaking = false;
      if (this.mouthInterval !== null) {
        clearInterval(this.mouthInterval);
        this.mouthInterval = null;
      }
      if (this.fallbackTimer !== null) {
        clearTimeout(this.fallbackTimer);
        this.fallbackTimer = null;
      }
      this.currentStoryAudio = null;
      this.duckBgm(false);
      this.mouthCallback?.(false);
      this.speakingChangeCallback?.(false);
    };

    void (async () => {
      const audioEntry = await this.fetchGeminiVoiceUrl(cleanSpeech, unifiedMood, true);
      if (
        sessionId !== this.speechSessionId ||
        !this.singleSpeaker.isTokenCurrent(speakerToken)
      ) {
        return;
      }

      if (audioEntry) {
        const audio = new Audio(audioEntry.url);
        audio.volume = 1.0;
        audio.playbackRate = audioEntry.playbackRate;
        this.currentStoryAudio = audio;
        let neuralStarted = false;
        audio.onplay = () => {
          if (!this.singleSpeaker.claimPlaybackChannel(speakerToken, 'gemini_audio')) {
            audio.pause();
            return;
          }
          neuralStarted = true;
          startMouthAnim();
        };
        audio.onended = finishSpeech;
        audio.onerror = () => {
          if (
            !neuralStarted &&
            sessionId === this.speechSessionId &&
            this.singleSpeaker.isTokenCurrent(speakerToken)
          ) {
            this.speakNaturalFallback(
              cleanSpeech,
              unifiedMood,
              sessionId,
              speakerToken,
              startMouthAnim,
              finishSpeech
            );
          } else if (neuralStarted) {
            finishSpeech();
          }
        };
        try {
          await audio.play();
          return;
        } catch (playErr) {
          if (
            neuralStarted ||
            sessionId !== this.speechSessionId ||
            !this.singleSpeaker.isTokenCurrent(speakerToken)
          ) {
            return;
          }
          const isAutoplayBlocked =
            playErr instanceof DOMException
              ? playErr.name === 'NotAllowedError'
              : /notallowed|interact|autoplay/i.test(String(playErr));
          if (isAutoplayBlocked && typeof window !== 'undefined') {
            this.clearPendingAutoplayRetry();
            const unlockAndPlay = () => {
              this.clearPendingAutoplayRetry();
              if (
                sessionId !== this.speechSessionId ||
                !this.singleSpeaker.isTokenCurrent(speakerToken)
              ) {
                return;
              }
              void audio.play().catch(() => {
                this.speakNaturalFallback(
                  cleanSpeech,
                  unifiedMood,
                  sessionId,
                  speakerToken,
                  startMouthAnim,
                  finishSpeech
                );
              });
            };
            window.addEventListener('pointerdown', unlockAndPlay, { once: true });
            window.addEventListener('keydown', unlockAndPlay, { once: true });
            this.pendingAutoplayCleanup = () => {
              window.removeEventListener('pointerdown', unlockAndPlay);
              window.removeEventListener('keydown', unlockAndPlay);
            };
            return;
          }
        }
      }

      this.speakNaturalFallback(
        cleanSpeech,
        unifiedMood,
        sessionId,
        speakerToken,
        startMouthAnim,
        finishSpeech
      );
    })();
  }

  public speakMentor(
    text: string,
    _mood: 'welcome' | 'radar' | 'warning' | 'somber' | 'eureka' = 'welcome'
  ) {
    if (!this.voiceEnabled || !text.trim()) return;
    this.unlock();
    this.playRadioKeyChirp();
    // Use Lali's consistent Zephyr / AnaNeural human voice throughout the entire game
    this.speakStoryGirl(text, 'joy');
  }
}

export const retroAudio = new RetroAudioAndVoiceEngine();

