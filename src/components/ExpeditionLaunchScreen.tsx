import React, { useEffect, useRef, useState } from 'react';
import { getCharacterSprite, getPropSprite, getTerrainTile } from '../game/biomePixelArtEngine';
import { ORDERED_GLOBAL_REGIONS } from '../data/globalRegionsAtlas';
import { GlobalRegionId } from '../services/nasaEarthDataService';
import { TRANSLATIONS, type SupportedLocale } from '../i18n/translations';
import { RasuwaStoryAdventure } from './RasuwaStoryAdventure';

interface ExpeditionLaunchScreenProps {
  onStartGame: (
    mode: 'world_atlas' | 'syabrubesi' | 'inside_lab' | 'judge_demo',
    initialRegionId?: GlobalRegionId,
    audioPrefs?: { voiceOn?: boolean; bgmOn?: boolean }
  ) => void;
  onOpen3DLab?: () => void;
  onOpenStoryMode?: () => void;
  onOpenWorkbench?: (aoiId?: string) => void;
  onOpenSciencePrimer?: (
    tab?: 'sar101' | 'polarization' | 'rosetta' | 'hypotheses' | 'future'
  ) => void;
  onOpenResources?: () => void;
  locale?: SupportedLocale;
  onChangeLocale?: (locale: SupportedLocale) => void;
  solvedStoryChapters?: string[];
  onSolvedStoryChaptersChange?: (chapters: string[]) => void;
  requestedStoryChapter?: string | null;
  onConsumeRequestedStoryChapter?: () => void;
  onStartJudgeTour?: () => void;
}

type PreviewSceneMode = 'all' | GlobalRegionId;

export const ExpeditionLaunchScreen: React.FC<ExpeditionLaunchScreenProps> = ({
  onStartGame,
  onOpen3DLab,
  onOpenStoryMode,
  onOpenWorkbench,
  onOpenSciencePrimer,
  onOpenResources,
  locale = 'en',
  onChangeLocale,
  solvedStoryChapters,
  onSolvedStoryChaptersChange,
  requestedStoryChapter,
  onConsumeRequestedStoryChapter,
  onStartJudgeTour,
}) => {
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sceneMode, setSceneMode] = useState<PreviewSceneMode>('rasuwa_nepal');
  const [internalLocale, setInternalLocale] = useState<SupportedLocale>(locale);
  const [launchMode, setLaunchMode] = useState<'storied' | 'classic'>('storied');

  const activeLocale = onChangeLocale ? locale : internalLocale;
  const handleSelectLocale = (next: SupportedLocale) => {
    setInternalLocale(next);
    onChangeLocale?.(next);
  };
  const t = TRANSLATIONS[activeLocale] ?? TRANSLATIONS.en;

  useEffect(() => {
    if (launchMode !== 'classic') return;
    let raf = 0;
    let tick = 0;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = () => {
      if (!prefersReducedMotion) {
        tick++;
      }
      const c = heroCanvasRef.current;
      if (!c) return;
      const W = 448;
      const H = 128;
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
      }
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      const anim = prefersReducedMotion ? 0 : Math.floor(tick / 18) % 4;
      const walkF = (prefersReducedMotion ? 1 : Math.floor(tick / 14) % 2 === 0 ? 1 : 2) as 1 | 2;

      for (let ty = 0; ty < H / 16; ty++) {
        for (let tx = 0; tx < W / 16; tx++) {
          let kind = 'grass';

          if (sceneMode === 'all') {
            if (tx <= 5) {
              kind =
                ty === 5
                  ? tx <= 2
                    ? 'bridge_wood'
                    : 'path'
                  : tx === 1
                    ? 'rapids'
                    : tx === 2
                      ? 'river_cobble'
                      : ty <= 1 && tx >= 4
                        ? 'snow'
                        : 'grass';
            } else if (tx <= 11) {
              kind =
                ty === 5
                  ? 'boardwalk'
                  : tx === 7
                    ? 'corixo_water'
                    : ty >= 3
                      ? 'wetland_marsh'
                      : 'tropical_forest_floor';
            } else if (tx <= 16) {
              kind =
                ty === 5
                  ? 'path'
                  : tx === 12
                    ? 'aqueduct_water'
                    : ty <= 3
                      ? 'orchard_soil'
                      : 'valley_loam';
            } else if (tx <= 22) {
              kind =
                ty === 5
                  ? 'limestone_paving'
                  : tx === 17
                    ? 'asi_water'
                    : ty <= 3
                      ? 'olive_terrace'
                      : 'terra_rossa';
            } else {
              kind =
                ty === 5
                  ? 'boardwalk'
                  : tx === 23
                    ? 'bering_surf'
                    : tx === 24
                      ? 'coastal_mud'
                      : tx >= 26 && ty <= 3
                        ? 'upland_gravel'
                        : 'tundra_moss';
            }
          } else if (sceneMode === 'rasuwa_nepal') {
            kind =
              ty === 5
                ? tx >= 4 && tx <= 8
                  ? 'bridge_wood'
                  : 'path'
                : tx >= 5 && tx <= 7
                  ? tx === 6
                    ? 'rapids'
                    : 'water'
                  : tx === 4 || tx === 8
                    ? 'river_cobble'
                    : tx >= 21 && ty <= 2
                      ? 'glacier_ice'
                      : tx >= 18 && ty <= 3
                        ? 'snow'
                        : 'grass';
          } else if (sceneMode === 'pantanal_brazil') {
            kind =
              ty === 5
                ? 'boardwalk'
                : Math.abs(tx - 8 - Math.round(Math.sin(ty * 0.7))) <= 1
                  ? 'corixo_water'
                  : tx <= 13
                    ? 'wetland_marsh'
                    : tx >= 21 && ty <= 3
                      ? 'peat_soil'
                      : 'tropical_forest_floor';
          } else if (sceneMode === 'san_joaquin_usa') {
            kind =
              ty === 5
                ? tx >= 6 && tx <= 8
                  ? 'bridge_wood'
                  : 'path'
                : tx === 7
                  ? 'aqueduct_water'
                  : tx === 6 || tx === 8
                    ? 'concrete_canal'
                    : tx <= 4
                      ? 'arid_scrub'
                      : tx >= 16 && ty <= 4
                        ? 'orchard_soil'
                        : tx >= 10 && tx <= 14 && ty <= 3
                          ? 'alfalfa_crop'
                          : 'valley_loam';
          } else if (sceneMode === 'hatay_turkiye') {
            kind =
              ty === 5
                ? tx === 6 || tx === 7
                  ? 'bridge_wood'
                  : 'limestone_paving'
                : tx === 6 || tx === 7
                  ? 'asi_water'
                  : tx >= 17 && ty <= 4
                    ? 'olive_terrace'
                    : 'terra_rossa';
          } else {
            kind =
              ty === 5
                ? 'boardwalk'
                : tx <= 5
                  ? 'bering_surf'
                  : tx <= 7
                    ? 'coastal_mud'
                    : tx >= 20 && ty <= 4
                      ? 'upland_gravel'
                      : 'tundra_moss';
          }

          ctx.drawImage(getTerrainTile(kind, anim, tx, ty), tx * 16, ty * 16);
        }
      }

      if (sceneMode === 'all') {
        ctx.drawImage(getPropSprite('buddhist_stupa', anim), 42, 26);
        ctx.drawImage(getPropSprite('palafita_house', anim), 118, 12);
        ctx.drawImage(getPropSprite('subsidence_pole', anim), 214, 14);
        ctx.drawImage(getPropSprite('cay_evi_teahouse', anim), 288, 18);
        ctx.drawImage(getPropSprite('salmon_smokehouse', anim), 382, 24);

        ctx.drawImage(getCharacterSprite('player', 'right', walkF), 64, 72);
        ctx.drawImage(getCharacterSprite('br_indigenous', 'down', 0), 148, 72);
        ctx.drawImage(getCharacterSprite('ca_campesino', 'down', 0), 236, 72);
        ctx.drawImage(getCharacterSprite('tr_geodesist', 'left', walkF), 324, 72);
        ctx.drawImage(getCharacterSprite('ak_yupik_elder', 'left', 0), 408, 72);
      } else if (sceneMode === 'rasuwa_nepal') {
        ctx.drawImage(getPropSprite('laliguras_tree', anim), 20, 16);
        ctx.drawImage(getPropSprite('dhm_nisar_kendra', anim), 142, -6);
        ctx.drawImage(getPropSprite('flood_siren_tower', anim), 268, 28);
        ctx.drawImage(getPropSprite('radar_beacon', anim), 336, 44);
        ctx.drawImage(getCharacterSprite('rudra', 'down', 0), 186, 72);
        ctx.drawImage(getCharacterSprite('player', 'right', walkF), 112, 74);
      } else if (sceneMode === 'pantanal_brazil') {
        ctx.drawImage(getPropSprite('palafita_house', anim), 40, 12);
        ctx.drawImage(getPropSprite('inpe_nisar_estacao', anim), 186, 0);
        ctx.drawImage(getPropSprite('timber_check_dam', anim), 312, 42);
        ctx.drawImage(getCharacterSprite('br_scientist', 'down', 0), 226, 72);
        ctx.drawImage(getCharacterSprite('br_ranger', 'right', walkF), 156, 74);
      } else if (sceneMode === 'san_joaquin_usa') {
        ctx.drawImage(getPropSprite('usgs_hydro_lab', anim), 152, 0);
        ctx.drawImage(getPropSprite('subsidence_pole', anim), 286, 14);
        ctx.drawImage(getPropSprite('mar_recharge_basin', anim), 344, 28);
        ctx.drawImage(getCharacterSprite('ca_hydrologist', 'down', 0), 192, 72);
        ctx.drawImage(getCharacterSprite('ca_campesino', 'right', walkF), 258, 74);
      } else if (sceneMode === 'hatay_turkiye') {
        ctx.drawImage(getPropSprite('hydro_dam', anim), 20, 14);
        ctx.drawImage(getPropSprite('kandilli_nisar_lab', anim), 154, 0);
        ctx.drawImage(getPropSprite('fault_rupture_scar', anim), 296, 26);
        ctx.drawImage(getPropSprite('seismic_retrofit_station', anim), 378, 26);
        ctx.drawImage(getCharacterSprite('tr_afad_engineer', 'right', walkF), 246, 74);
        ctx.drawImage(getCharacterSprite('tr_geodesist', 'down', 0), 192, 72);
      } else {
        ctx.drawImage(getPropSprite('salmon_smokehouse', anim), 118, 22);
        ctx.drawImage(getPropSprite('above_arctic_lab', anim), 188, 0);
        ctx.drawImage(getPropSprite('thermosyphon_array', anim), 312, 26);
        ctx.drawImage(getPropSprite('yupik_stilt_house', anim), 356, 16);
        ctx.drawImage(getCharacterSprite('ak_scientist', 'right', walkF), 232, 74);
        ctx.drawImage(getCharacterSprite('ak_yupik_elder', 'down', 0), 154, 72);
      }

      // Subtle NISAR orbital swath scanline sweeping across the top sky band
      const beamX = prefersReducedMotion ? 224 : ((tick * 2.2) % (W + 120)) - 60;
      const grad = ctx.createLinearGradient(beamX - 36, 0, beamX + 36, 0);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.22)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(beamX - 36, 0, 72, H);

      if (!prefersReducedMotion) {
        raf = requestAnimationFrame(draw);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [sceneMode, launchMode]);

  const activeRegionMeta =
    sceneMode === 'all'
      ? null
      : ORDERED_GLOBAL_REGIONS.find((r) => r.id === sceneMode) || null;

  if (launchMode === 'storied') {
    return (
      <div className="expedition-launch-overlay !p-0 overflow-y-auto items-stretch justify-stretch">
        <div className="w-full min-h-full flex flex-col">
          <RasuwaStoryAdventure
            onStartGame={onStartGame}
            onOpen3DLab={onOpen3DLab}
            onOpenStoryMode={onOpenStoryMode}
            onOpenWorkbench={onOpenWorkbench}
            onOpenSciencePrimer={onOpenSciencePrimer}
            onOpenResources={onOpenResources}
            locale={activeLocale}
            onChangeLocale={handleSelectLocale}
            initialSolvedChapters={solvedStoryChapters}
            onSolvedChaptersChange={onSolvedStoryChaptersChange}
            requestedChapterId={requestedStoryChapter}
            onConsumeRequestedChapter={onConsumeRequestedStoryChapter}
            onStartJudgeTour={onStartJudgeTour}
            onOpenModeOverview={() => setLaunchMode('classic')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="expedition-launch-overlay">
      <div className="expedition-terminal-frame">
        <div className="expedition-top-telemetry">
          <div className="expedition-mission-id">
            <span className="pulse-dot-live" />
            <span>{t.challengeBadge}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Experience Mode" className="flex items-center gap-1">
              <button
                type="button"
                data-testid="mode-storied-adventure"
                onClick={() => setLaunchMode('storied')}
                className="px-2.5 py-0.5 rounded text-[11px] font-mono border cursor-pointer bg-emerald-400 text-slate-950 border-white font-bold"
              >
                ▶ Back to Story Adventure
              </button>
              <button
                type="button"
                data-testid="mode-classic-launch"
                onClick={() => setLaunchMode('classic')}
                className="px-2.5 py-0.5 rounded text-[11px] font-mono border cursor-pointer bg-sky-400 text-slate-950 border-white font-bold"
              >
                🧭 All Modes Overview
              </button>
            </div>
            {/* Language Switcher (EN / NE Draft / ES Draft) */}
            <div role="group" aria-label="Interface Language" className="flex items-center gap-1">
              {(['en', 'ne', 'es'] as const).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => handleSelectLocale(loc)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border cursor-pointer ${
                    activeLocale === loc
                      ? 'bg-amber-400 text-slate-950 border-white font-bold'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  {loc === 'en' ? 'EN' : loc === 'ne' ? 'नेपाली (Draft)' : 'ES (Draft)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {t.draftDisclaimer && (
          <div
            role="note"
            className="mx-3 mt-2 px-3 py-1.5 rounded bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs font-mono"
          >
            {t.draftDisclaimer}
          </div>
        )}

        {/* Interactive Biome Panorama Switcher */}
        <div className="expedition-panorama-wrap">
          <canvas
            ref={heroCanvasRef}
            className="expedition-hero-canvas"
            role="img"
            aria-label="Illustrated pixel-art regional landscapes"
          />
          <div className="expedition-biome-tabs">
            <button
              type="button"
              className={`biome-preview-pill ${sceneMode === 'all' ? 'active' : ''}`}
              onClick={() => setSceneMode('all')}
            >
              🌍 All 5 Biomes
            </button>
            {ORDERED_GLOBAL_REGIONS.map((reg) => (
              <button
                key={reg.id}
                type="button"
                className={`biome-preview-pill ${sceneMode === reg.id ? 'active' : ''}`}
                onClick={() => setSceneMode(reg.id)}
              >
                {reg.flag} {reg.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="expedition-title-section">
          <div className="expedition-kicker flex flex-wrap items-center justify-between gap-2">
            <span>SPOT HIDDEN EARTH CHANGES THROUGH CLOUDS, DARKNESS &amp; TREES</span>
            <span className="text-[11px] text-sky-300 font-mono">{t.waltzMotifNote}</span>
          </div>
          <h1 className="expedition-main-title">ECHOES OF RASUWA: GLOBAL WALTZ</h1>
          <p className="expedition-subtitle">
            Play as Lali to see how <strong>NASA&apos;s NISAR space radar</strong> spots hidden floods, sinking farms, and landslide cracks.
            Compare <strong>real NASA radar photos from Alaska</strong>, check <strong>316+ real NASA satellite scans over Rasuwa</strong>, or jump straight into the 3D Valley Lab!
          </p>
          <p className="launch-challenge-line">
            <a
              href="https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/"
              target="_blank"
              rel="noreferrer"
            >
              2026 challenge: Dancing with the SARs
            </a>{' '}
            • Every map shows a clear label telling you whether it is a <strong>real NASA photo</strong> or a <strong>practice simulation</strong>.
          </p>
          {activeRegionMeta && (
            <p className="launch-secondary-region">
              Selected town: {activeRegionMeta.flag} {activeRegionMeta.name} • Story village game
            </p>
          )}
        </div>

        {/* THREE-DOOR ARCHITECTURE BANNER (Story Mode / Analyst Workbench / Field Expedition) */}
        <div className="px-4 pb-2 grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {onOpenStoryMode && (
            <button
              type="button"
              data-testid="door-story-mode"
              onClick={onOpenStoryMode}
              className="text-left p-3 rounded border-2 border-amber-400/60 bg-slate-900/90 hover:bg-slate-800 transition flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-mono font-bold text-amber-300 uppercase">
                  {t.door1Title}
                </div>
                <p className="text-xs text-slate-300 mt-1">{t.door1Subtitle}</p>
              </div>
              <div className="mt-2 text-xs font-mono font-bold text-amber-200 underline">
                ▶ {t.door1Cta}
              </div>
            </button>
          )}

          {onOpenWorkbench && (
            <button
              type="button"
              data-testid="door-analyst-workbench"
              onClick={() =>
                onOpenWorkbench(sceneMode === 'all' ? 'rasuwa_nepal' : sceneMode)
              }
              className="text-left p-3 rounded border-2 border-sky-400/60 bg-slate-900/90 hover:bg-slate-800 transition flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-mono font-bold text-sky-300 uppercase">
                  {t.door2Title}
                </div>
                <p className="text-xs text-slate-300 mt-1">{t.door2Subtitle}</p>
              </div>
              <div className="mt-2 text-xs font-mono font-bold text-sky-200 underline">
                ▶ {t.door2Cta}
              </div>
            </button>
          )}

          <div className="p-3 rounded border border-slate-700 bg-slate-900/70 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-emerald-300 uppercase">
                {t.door3Title}
              </div>
              <p className="text-xs text-slate-300 mt-1">{t.door3Subtitle}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {onOpenSciencePrimer && (
                <button
                  type="button"
                  data-testid="open-science-primer"
                  onClick={() => onOpenSciencePrimer('sar101')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-mono text-amber-200"
                >
                  🔬 {t.sar101Button}
                </button>
              )}
              {onOpenResources && (
                <button
                  type="button"
                  data-testid="open-resources-drawer"
                  onClick={onOpenResources}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-mono text-sky-200"
                >
                  📚 {t.resourcesButton}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="expedition-cta-grid">
          <button
            type="button"
            data-start="true"
            className="expedition-launch-btn primary judge-launch"
            onClick={() => onStartGame('judge_demo')}
          >
            <span className="cta-title">▶ START GUIDED EVIDENCE TRAIL</span>
            <small>
              6-step simple photo guide • Compare real NASA Alaska radar photos
            </small>
          </button>
          <button
            type="button"
            className="expedition-launch-btn secondary"
            onClick={() => onStartGame('world_atlas')}
          >
            <span className="cta-title">🌍 WORLD RADAR MAP (5 TOWNS)</span>
            <small>
              Explore 5 towns worldwide + live NASA weather &amp; hazard pins
            </small>
          </button>

          <button
            type="button"
            className="expedition-launch-btn secondary"
            onClick={() =>
              onStartGame(
                'syabrubesi',
                sceneMode === 'all' ? 'rasuwa_nepal' : sceneMode
              )
            }
          >
            <span className="cta-title">
              {activeRegionMeta
                ? `${activeRegionMeta.flag} WALK ${activeRegionMeta.name.split(' ')[0].toUpperCase()} 2D TOWN`
                : '🇳🇵 WALK RASUWA 2D TOWN'}
            </span>
            <small>
              Walk around as Lali • Talk to villagers &amp; solve mini-games
            </small>
          </button>

          <button
            type="button"
            className="expedition-launch-btn observatory"
            onClick={() =>
              onStartGame(
                'inside_lab',
                sceneMode === 'all' ? 'rasuwa_nepal' : sceneMode
              )
            }
          >
            <span className="cta-title">🏛️ OPEN 3D VALLEY LAB</span>
            <small>
              Spin 3D hills, drag Before/After radar sliders &amp; test physics
            </small>
          </button>
        </div>

        <div className="expedition-footer-bar">
          <span>
            ⌨️ Controls: Arrow keys / WASD or Click to walk • [SPACE] Talk • [G] World Map • [I] Safety Plan
          </span>
          <span>
            💡 Remember: Space pictures give clues — always double-check on the ground!
          </span>
        </div>
      </div>
    </div>
  );
};
