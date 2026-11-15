export type PlaybackChannel = 'gemini_audio' | 'web_speech' | 'timer_fallback';

export interface AcquireSpeechOptions {
  speakerId?: string;
  forceReplay?: boolean;
  dedupeWindowMs?: number;
  now?: number;
}

export type AcquireSpeechResult =
  | {
      accepted: true;
      token: number;
      revokedToken: number | null;
      normalizedText: string;
    }
  | {
      accepted: false;
      reason: 'empty' | 'duplicate_active' | 'duplicate_recent';
      activeToken: number | null;
    };

/**
 * Single-instance speaker constraint controller.
 * Ensures at most ONE dialogue utterance and ONE audio playback channel
 * can ever be active at the same time across the entire application, preventing
 * React StrictMode, rapid double-clicks, or scene re-renders from firing dialogue twice.
 */
export class SingleInstanceSpeakerController {
  private nextToken = 1;
  private activeToken: number | null = null;
  private activeSpeakerId: string | null = null;
  private activeText = '';
  private claimedChannel: PlaybackChannel | null = null;
  private lastCommittedText = '';
  private lastCommittedAt = 0;

  public acquire(rawText: string, options: AcquireSpeechOptions = {}): AcquireSpeechResult {
    const normalizedText = rawText.trim().replace(/\s+/g, ' ');
    if (!normalizedText) {
      return {
        accepted: false,
        reason: 'empty',
        activeToken: this.activeToken,
      };
    }

    const now = options.now ?? Date.now();
    const dedupeWindowMs = options.dedupeWindowMs ?? 5000;
    const forceReplay = Boolean(options.forceReplay);

    if (!forceReplay) {
      if (this.activeToken !== null && this.activeText === normalizedText) {
        return {
          accepted: false,
          reason: 'duplicate_active',
          activeToken: this.activeToken,
        };
      }
      if (
        this.lastCommittedText === normalizedText &&
        now - this.lastCommittedAt >= 0 &&
        now - this.lastCommittedAt < dedupeWindowMs
      ) {
        return {
          accepted: false,
          reason: 'duplicate_recent',
          activeToken: this.activeToken,
        };
      }
    }

    const revokedToken = this.activeToken;
    const token = this.nextToken++;
    this.activeToken = token;
    this.activeSpeakerId = options.speakerId ?? 'default';
    this.activeText = normalizedText;
    this.claimedChannel = null;
    this.lastCommittedText = normalizedText;
    this.lastCommittedAt = now;

    return {
      accepted: true,
      token,
      revokedToken,
      normalizedText,
    };
  }

  public isTokenCurrent(token: number): boolean {
    return this.activeToken !== null && this.activeToken === token;
  }

  /**
   * Claims exclusive playback output for a given token so Gemini Audio,
   * Web Speech API, or silent fallback timers can NEVER double-play the same line.
   */
  public claimPlaybackChannel(token: number, channel: PlaybackChannel): boolean {
    if (!this.isTokenCurrent(token)) return false;
    if (this.claimedChannel !== null && this.claimedChannel !== channel) {
      return false;
    }
    this.claimedChannel = channel;
    return true;
  }

  public release(token: number): boolean {
    if (!this.isTokenCurrent(token)) return false;
    this.activeToken = null;
    this.activeSpeakerId = null;
    this.activeText = '';
    this.claimedChannel = null;
    return true;
  }

  public stopAll(): number | null {
    const previous = this.activeToken;
    this.activeToken = null;
    this.activeSpeakerId = null;
    this.activeText = '';
    this.claimedChannel = null;
    return previous;
  }

  public getSnapshot() {
    return {
      activeToken: this.activeToken,
      activeSpeakerId: this.activeSpeakerId,
      activeText: this.activeText,
      claimedChannel: this.claimedChannel,
      lastCommittedText: this.lastCommittedText,
      lastCommittedAt: this.lastCommittedAt,
    };
  }
}
