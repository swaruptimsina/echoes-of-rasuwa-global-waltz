import test from 'node:test';
import assert from 'node:assert/strict';
import { SingleInstanceSpeakerController } from './singleInstanceSpeaker';

test('single-instance speaker blocks duplicate triggers while active and within dedupe window', () => {
  const ctrl = new SingleInstanceSpeakerController();

  const first = ctrl.acquire('Namaste! Welcome to Syabrubesi.', {
    speakerId: 'lali_girl',
    now: 1000,
    dedupeWindowMs: 5000,
  });
  assert.equal(first.accepted, true);
  if (!first.accepted) throw new Error('expected first speech to be accepted');

  // StrictMode double-invoke or immediate second effect firing with identical text
  const duplicateWhileActive = ctrl.acquire('  Namaste!   Welcome to Syabrubesi. ', {
    speakerId: 'lali_girl',
    now: 1020,
    dedupeWindowMs: 5000,
  });
  assert.equal(duplicateWhileActive.accepted, false);
  if (duplicateWhileActive.accepted) throw new Error('expected duplicate to be blocked');
  assert.equal(duplicateWhileActive.reason, 'duplicate_active');

  // Release first speech and verify immediate re-fire within 5s window is still suppressed
  assert.equal(ctrl.release(first.token), true);
  const duplicateRecent = ctrl.acquire('Namaste! Welcome to Syabrubesi.', {
    speakerId: 'lali_girl',
    now: 2500,
    dedupeWindowMs: 5000,
  });
  assert.equal(duplicateRecent.accepted, false);
  if (duplicateRecent.accepted) throw new Error('expected recent duplicate to be blocked');
  assert.equal(duplicateRecent.reason, 'duplicate_recent');

  // Force replay (manual Voice On button) overrides dedupe cleanly
  const replay = ctrl.acquire('Namaste! Welcome to Syabrubesi.', {
    speakerId: 'lali_girl',
    forceReplay: true,
    now: 2600,
  });
  assert.equal(replay.accepted, true);
});

test('new speaker line preempts active speaker and prevents stale token playback', () => {
  const ctrl = new SingleInstanceSpeakerController();

  const line1 = ctrl.acquire('Heavy rain soaked the hills.', { speakerId: 'lali_girl', now: 1000 });
  assert.equal(line1.accepted, true);
  if (!line1.accepted) throw new Error('expected line1 accepted');

  const line2 = ctrl.acquire('Meet NASA-ISRO NISAR radar.', { speakerId: 'lali_girl', now: 1500 });
  assert.equal(line2.accepted, true);
  if (!line2.accepted) throw new Error('expected line2 accepted');
  assert.equal(line2.revokedToken, line1.token);

  assert.equal(ctrl.isTokenCurrent(line1.token), false);
  assert.equal(ctrl.isTokenCurrent(line2.token), true);
  assert.equal(ctrl.claimPlaybackChannel(line1.token, 'gemini_audio'), false);
  assert.equal(ctrl.claimPlaybackChannel(line2.token, 'gemini_audio'), true);
});

test('single token allows only one playback channel so audio + speechSynthesis never double-fire', () => {
  const ctrl = new SingleInstanceSpeakerController();
  const req = ctrl.acquire('Gate 1 is locked!', { speakerId: 'lali_girl', now: 4000 });
  assert.equal(req.accepted, true);
  if (!req.accepted) throw new Error('expected request accepted');

  assert.equal(ctrl.claimPlaybackChannel(req.token, 'gemini_audio'), true);
  // Once Gemini audio starts playing, fallback Web Speech cannot also claim the same token
  assert.equal(ctrl.claimPlaybackChannel(req.token, 'web_speech'), false);
  assert.equal(ctrl.claimPlaybackChannel(req.token, 'timer_fallback'), false);
});
