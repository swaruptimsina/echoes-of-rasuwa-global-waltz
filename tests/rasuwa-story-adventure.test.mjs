import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('RasuwaStoryAdventure implements an unskippable Lali-guided 5-Chapter story flow and Finale council', async () => {
  const source = await readFile(
    new URL('../src/components/RasuwaStoryAdventure.tsx', import.meta.url),
    'utf8'
  );

  // Unskippable intro & Lali Hamri Gai character guide + Flag House
  assert.ok(!source.includes('story-skip-btn'), 'Opening story must be unskippable');
  assert.match(source, /LaliGirlAvatar/);
  assert.match(source, /lali_girl/);
  assert.match(source, /lali_cow/);
  assert.match(source, /PASANG TAMANG/);
  assert.match(source, /Syabrubesi \(1,460 m\)/);
  assert.match(source, /Flag House/);

  // Sweet girl voice + relaxing story BGM
  assert.match(source, /speakStoryGirl/);
  assert.match(source, /startRelaxingStoryBgm/);

  // 5 Cascading Causes & Chapters
  assert.match(source, /Cause 1: Antecedent Monsoon Saturation/);
  assert.match(source, /Cause 2: Pre-Collapse Bedrock Creep/);
  assert.match(source, /Cause 3: Temporary Debris Damming & 7-Min Breach/);
  assert.match(source, /Cause 4: Massive Rock-Ice Avalanche Plunge/);
  assert.match(source, /Cause 5: The Screening vs\. Prediction Verdict/);

  // Silwal & Dahal (Zenodo 22730419) scientific humility verdict
  assert.match(source, /22730419/);
  assert.match(source, /regional screening/i);

  // Finale Scene with Global Community Council & Play Again
  assert.match(source, /FinalScene/);
  assert.match(source, /PLAY AGAIN \(RESTART STORY\)/);
});

test('TerrainMap3D uses handcrafted PBR environment lighting, sky dome, and software-WebGL pacing', async () => {
  const terrain3d = await readFile(
    new URL('../src/components/TerrainMap3D.tsx', import.meta.url),
    'utf8'
  );

  assert.match(terrain3d, /RoomEnvironment/);
  assert.match(terrain3d, /ACESFilmicToneMapping/);
  assert.match(terrain3d, /isSoftwareGl/);
  assert.match(terrain3d, /afterDraw/);
  assert.match(terrain3d, /smoothHeightGrid/);
  assert.match(terrain3d, /InstancedMesh/);
  assert.doesNotMatch(terrain3d, /new THREE\.GridHelper/, 'Remove retro cyan GridHelper from 3D terrain');
});

test('Official NASA Space Apps 2026 resources and real Gemini female voice TTS are integrated', async () => {
  const resources = await readFile(
    new URL('../src/components/ResourcesDrawer.tsx', import.meta.url),
    'utf8'
  );
  const audio = await readFile(
    new URL('../src/audio/retroAudioAndVoice.ts', import.meta.url),
    'utf8'
  );
  const server =
    (await readFile(new URL('../server.ts', import.meta.url), 'utf8')) +
    '\n' +
    (await readFile(new URL('../lib/ttsEngine.ts', import.meta.url), 'utf8'));

  // Official NASA, CSA, and CONAE challenge resources
  assert.match(resources, /Mount Rainier/);
  assert.match(resources, /Python & QGIS/);
  assert.match(resources, /ONE CLICK Login Profile/);
  assert.match(resources, /Oil Slicks/i);
  assert.match(resources, /Wildfires/i);

  // Natural child Gemini TTS + original NISAR playable missions + clean opening UI
  assert.match(server, /gemini-3\.8-flash-lite-tts/);
  assert.match(server, /gemini-3\.8-flash-tts/);
  assert.match(server, /Masha/);
  assert.match(server, /\/api\/tts/);
  assert.match(server, /prebuiltVoiceConfig/);
  assert.match(audio, /\/api\/tts/);
  assert.match(audio, /Zephyr/);
  assert.match(audio, /prefetchStoryGirl/);
  assert.match(audio, /speechSessionId/);

  const story = await readFile(
    new URL('../src/components/RasuwaStoryAdventure.tsx', import.meta.url),
    'utf8'
  );
  assert.ok(!story.includes('intro-hear-lali-btn'), 'Remove unnecessary Hear Lali button on opening stage');

  const playable = await readFile(
    new URL('../src/components/RasuwaPlayableMissions.tsx', import.meta.url),
    'utf8'
  );
  assert.match(playable, /DielectricFloodMapperPlayable/);
  assert.match(playable, /BreachRunPlayable/);
  assert.match(playable, /AvalancheSweepPlayable/);
});

test('All 5 hackathon upgrade pillars are wired cleanly across Workbench, Missions, 3D Lab, Community SMS, and Judge Tour', async () => {
  const workbench = await readFile(
    new URL('../src/components/AnalystWorkbench.tsx', import.meta.url),
    'utf8'
  );
  assert.match(workbench, /inspectGeoTiffFromFile/);
  assert.match(workbench, /createSampleSarFloat32TiffBuffer/);
  assert.match(workbench, /workbench-geotiff-card/);
  assert.match(workbench, /workbench-refresh-cmr-btn/);

  const playable = await readFile(
    new URL('../src/components/RasuwaPlayableMissions.tsx', import.meta.url),
    'utf8'
  );
  assert.match(playable, /evaluateInsarWaveAlignment/);
  assert.match(playable, /sampleWaveAlignmentTraces/);
  assert.match(playable, /ch2-wave-oscilloscope/);

  const lab = await readFile(
    new URL('../src/components/LabSupercomputerScreen.tsx', import.meta.url),
    'utf8'
  );
  assert.match(lab, /lab-story-bridge-card/);
  assert.match(lab, /highlightedStationIds/);

  const bilingual = await readFile(
    new URL('../src/components/BilingualAlertPreview.tsx', import.meta.url),
    'utf8'
  );
  assert.match(bilingual, /तामाङ/);
  assert.match(bilingual, /नेपाली/);

  const tour = await readFile(
    new URL('../src/components/JudgeTourOverlay.tsx', import.meta.url),
    'utf8'
  );
  assert.match(tour, /judge-tour-overlay/);
  assert.match(tour, /phase_lock/);
  assert.match(tour, /workbench_geotiff/);
});

test('Scene 1 renders Lali on the ground outside Flag House, story beats show single full-screen visuals, and Proof Archive exposes 12 cases', async () => {
  const story = await readFile(
    new URL('../src/components/RasuwaStoryAdventure.tsx', import.meta.url),
    'utf8'
  );

  // Lali standing outside Flag House on the ground in scene-intro
  assert.match(story, /ctx\.drawImage\(getCharacterSprite\('lali_girl', 'down', walkF\), 176, 132 \+ laliBounce/);
  assert.match(story, /ctx\.fillText\('LALI', 178, 126 \+ laliBounce\)/);

  // Single full-screen visual per scene (hide pixel canvas during exploreScene and evidence full-image beats)
  assert.match(story, /isEvidenceFullImageBeat/);
  assert.match(story, /hideBackdropCanvas/);

  // 12 Evidence Proof Stories + Archive Modal
  assert.match(story, /EVIDENCE_PROOF_STORIES/);
  assert.match(story, /story-proof-archive-btn/);
  assert.match(story, /proof-archive-modal/);
  assert.match(story, /proof-hubbard-earthquake/);
  assert.match(story, /proof-alaska-permafrost/);

  // Transparent/semi-transparent overlays behind story & proof text blocks (no heavy opaque black veil)
  assert.match(story, /bg-slate-950\/20 backdrop-blur-sm/);
  assert.match(story, /bg-slate-950\/22 backdrop-blur-md/);
  assert.doesNotMatch(story, /from-slate-950\/75 via-slate-950\/10 to-slate-950\/90/);

  // Single-instance speaker lock wired into audio engine
  const audio = await readFile(
    new URL('../src/audio/retroAudioAndVoice.ts', import.meta.url),
    'utf8'
  );
  assert.match(audio, /SingleInstanceSpeakerController/);
  assert.match(audio, /claimPlaybackChannel/);
});

test('Human Neural Voice (Edge AnaNeural) and runtime Gemini AI Studio key config are integrated end-to-end', async () => {
  const server =
    (await readFile(new URL('../server.ts', import.meta.url), 'utf8')) +
    '\n' +
    (await readFile(new URL('../lib/ttsEngine.ts', import.meta.url), 'utf8'));
  const audio = await readFile(
    new URL('../src/audio/retroAudioAndVoice.ts', import.meta.url),
    'utf8'
  );
  const story = await readFile(
    new URL('../src/components/RasuwaStoryAdventure.tsx', import.meta.url),
    'utf8'
  );

  // Server provides multi-tier Gemini (3.8 & 2.5) + zero-key Edge Neural (en-US-AnaNeural) + .env loading
  assert.match(server, /msedge-tts/);
  assert.match(server, /en-US-AnaNeural/);
  assert.match(server, /gemini-2\.5-flash-preview-tts/);
  assert.match(server, /loadEnvFilesIntoProcess/);
  assert.match(server, /\/api\/tts\/config/);
  assert.match(server, /X-Voice-Engine/);
  assert.match(server, /cleanTextForEdgeSsml/);

  // Client tracks active engine, respects per-engine playbackRate, and does not downgrade NotAllowedError to WebSpeech
  assert.match(audio, /setNeuralVoiceId/);
  assert.match(audio, /clearVoiceCache/);
  assert.match(audio, /x-voice-engine/);
  assert.match(audio, /NotAllowedError/);

  // Story menu exposes Neural Voice persona switcher & optional Gemini AI Studio key setup
  assert.match(story, /story-voice-engine-badge/);
  assert.match(story, /story-voice-select/);
  assert.match(story, /story-gemini-key-toggle/);
});



