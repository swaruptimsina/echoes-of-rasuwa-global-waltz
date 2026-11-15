import React, { useEffect, useRef, useState } from 'react';
import {
  AgriActionType,
  AgriSubsidenceState,
  ArcticActionType,
  assignAgriBlockAction,
  AvalancheSweepState,
  CanopyTagType,
  classifyArcticTarget,
  classifyDielectricZone,
  classifyInfraAsset,
  createInitialAgriSubsidenceState,
  createInitialAvalancheSweepState,
  createInitialDielectricMapperState,
  createInitialEvacuationRunState,
  createInitialForestCanopyState,
  createInitialOceanIceState,
  createInitialQuakeTriageState,
  DielectricActionType,
  DielectricFloodMapperState,
  EvacuationRunState,
  ForestCanopyState,
  inspectInfraAsset,
  NASA_DISASTER_ACTIONS,
  OceanIceState,
  QuakeActionType,
  QuakeTriageState,
  scanArcticTarget,
  stepAgriSubsidenceState,
  stepAvalancheSweepBeam,
  stepDielectricMapperState,
  stepEvacuationRunState,
  switchForestBand,
  tagCanopySite,
} from '../game/disasterActionMissions';
import {
  CharacterPaletteId,
  getCharacterSprite,
  getPropSprite,
  getTerrainTile
} from '../game/biomePixelArtEngine';
import { retroAudio } from '../audio/retroAudioAndVoice';
import {
  evaluateInsarWaveAlignment,
  sampleWaveAlignmentTraces,
} from '../utils/insarPhaseAlignment';

/* ============================================================================
 * REUSABLE SIMPLE MISSION EXPLANATION + HINT BAR
 * ============================================================================ */
const MissionSimpleGuide: React.FC<{
  whatWeAreDoing: string;
  nasaToolUsed: string;
  hintText: string;
  showHint: boolean;
  onToggleHint: () => void;
}> = ({ whatWeAreDoing, nasaToolUsed, hintText, showHint, onToggleHint }) => (
  <div className="px-3 py-1.5 rounded-lg bg-slate-950/20 backdrop-blur-sm border border-white/25 flex flex-col gap-1 [text-shadow:0_1px_5px_rgba(0,0,0,0.98)]">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-white leading-snug">
        <strong className="text-amber-300">Mission:</strong> {whatWeAreDoing}{' '}
        <span className="text-sky-200 font-semibold">({nasaToolUsed})</span>
      </p>
      <button
        type="button"
        data-testid="mission-hint-btn"
        onClick={() => {
          retroAudio.playUiClick(740);
          onToggleHint();
        }}
        className={`px-2.5 py-1 rounded-md border text-[11px] font-bold cursor-pointer transition shrink-0 ${
          showHint
            ? 'border-amber-300 bg-amber-400 text-slate-950 shadow [text-shadow:none]'
            : 'border-amber-300/75 bg-slate-950/30 hover:bg-slate-900/50 text-amber-200'
        }`}
      >
        {showHint ? '💡 Hide Hint' : '💡 Hint'}
      </button>
    </div>
    {showHint && (
      <div
        data-testid="mission-hint-box"
        className="px-2.5 py-1 rounded bg-amber-950/35 backdrop-blur-sm border border-amber-300/75 text-amber-100 text-[11px] font-medium"
      >
        <strong>👉 Step-by-Step Hint:</strong> {hintText}
      </div>
    )}
  </div>
);

function getFacingDir(dx: number, dy: number): 'down' | 'up' | 'left' | 'right' {
  if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) return 'down';
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'down' : 'up';
}

/* ============================================================================
 * 1. CHAPTER 1 — NISAR DIELECTRIC & MOISTURE RADAR MAPPER (REAL PIXEL VALLEY)
 * ============================================================================ */
export const DielectricFloodMapperPlayable: React.FC<{
  solved: boolean;
  onSolve: () => void;
}> = ({ solved, onSolve }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<DielectricFloodMapperState>(createInitialDielectricMapperState());
  const keysRef = useRef<Set<string>>(new Set());
  const solvedFiredRef = useRef<boolean>(solved);
  const [sarOn, setSarOn] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hud, setHud] = useState({
    scanned: solved ? 4 : 0,
    classified: solved ? 4 : 0,
    activeZoneId: null as number | null,
    status: solved
      ? 'All 4 village spots checked and safe!'
      : 'Step 1: Click "Turn ON Radar", then click or walk Lali to all 4 glowing circles!',
  });

  useEffect(() => {
    solvedFiredRef.current = solved;
  }, [solved]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        keysRef.current.add(e.code);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const onBlur = () => keysRef.current.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastDraw = 0;
    let tick = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastDraw < 42) return;
      lastDraw = now;
      const rawDt = (now - last) / 1000;
      last = now;
      tick++;

      const keys = keysRef.current;
      const ix =
        (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) -
        (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      const iy =
        (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) -
        (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);

      const prev = stateRef.current;
      const next = stepDielectricMapperState({ ...prev, sarViewOn: sarOn }, { x: ix, y: iy }, rawDt);
      stateRef.current = next;

      if (next.scannedCount > prev.scannedCount) {
        retroAudio.playRadarPing('L');
      }
      if (next.won && !solvedFiredRef.current) {
        solvedFiredRef.current = true;
        onSolve();
      }

      if (
        next.scannedCount !== prev.scannedCount ||
        next.classifiedCount !== prev.classifiedCount ||
        next.activeZoneId !== prev.activeZoneId ||
        next.statusText !== prev.statusText
      ) {
        setHud({
          scanned: next.scannedCount,
          classified: next.classifiedCount,
          activeZoneId: next.activeZoneId,
          status: next.statusText,
        });
      }

      const c = canvasRef.current;
      if (c) {
        const W = 720;
        const H = 336;
        if (c.width !== W || c.height !== H) {
          c.width = W;
          c.height = H;
        }
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          const anim = Math.floor(tick / 14) % 4;
          const cols = Math.ceil(W / 16);
          const rows = Math.ceil(H / 16);

          // Sky + Himalayan mountain horizon across top strip
          const skyGrad = ctx.createLinearGradient(0, 0, 0, 64);
          skyGrad.addColorStop(0, sarOn ? '#0c2742' : '#23456b');
          skyGrad.addColorStop(1, sarOn ? '#164e63' : '#94bdb9');
          ctx.fillStyle = skyGrad;
          ctx.fillRect(0, 0, W, 64);

          ctx.fillStyle = sarOn ? '#334155' : '#64748b';
          ctx.beginPath();
          ctx.moveTo(0, 64);
          ctx.quadraticCurveTo(95, 16, 190, 40);
          ctx.quadraticCurveTo(300, 10, 410, 44);
          ctx.quadraticCurveTo(540, 12, 720, 48);
          ctx.lineTo(720, 64);
          ctx.closePath();
          ctx.fill();

          // Real pixel-art Syabrubesi riverbank, stone trail, and canal terrain
          for (let ty = 4; ty < rows; ty++) {
            for (let tx = 0; tx < cols; tx++) {
              let kind = 'grass';
              if (tx <= 14 && ty >= 11) {
                kind = tx === 8 || tx === 9 ? 'rapids' : 'water';
              } else if (tx === 15 && ty >= 11) {
                kind = 'river_cobble';
              } else if (ty === 9 || (tx >= 20 && tx <= 24 && ty >= 11)) {
                kind = 'path';
              } else if (ty <= 5 && tx <= 18) {
                kind = 'scree';
              }
              ctx.drawImage(getTerrainTile(kind, anim, tx, ty), tx * 16, ty * 16);
            }
          }

          ctx.drawImage(getPropSprite('tamang_stone_house', anim), 116, 48);
          ctx.drawImage(getPropSprite('lali_cow', anim), 206, 94);
          ctx.drawImage(getPropSprite('prayer_flags', anim), 302, 74);
          ctx.drawImage(getPropSprite('laliguras_tree', anim), 596, 54);

          // Overlay NISAR Dielectric backscatter tint OR drifting storm clouds
          if (sarOn) {
            ctx.fillStyle = 'rgba(2, 132, 199, 0.30)';
            ctx.fillRect(0, H * 0.56, W * 0.34, H * 0.44);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
            ctx.fillRect(W * 0.36, H * 0.45, W * 0.64, H * 0.55);
            ctx.fillStyle = 'rgba(16, 185, 129, 0.20)';
            ctx.fillRect(0, 64, W * 0.45, H * 0.32);
          } else {
            ctx.fillStyle = 'rgba(226, 232, 240, 0.36)';
            for (let i = 0; i < 6; i++) {
              ctx.beginPath();
              ctx.arc(((i * 150 + tick * 0.5) % (W + 120)) - 60, 74 + (i % 3) * 68, 44, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Compact top-left lens badge
          ctx.fillStyle = 'rgba(2, 6, 23, 0.62)';
          ctx.fillRect(14, 10, 240, 22);
          ctx.fillStyle = sarOn ? '#7dd3fc' : '#f8fafc';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(sarOn ? 'NASA NISAR + OPERA WATER RADAR: ON' : 'STORM CLOUDS (TURN ON RADAR)', 22, 24);

          // 4 Radar zones
          for (const z of next.zones) {
            const zx = (z.x / 100) * W;
            const zy = 48 + (z.y / 100) * (H - 58);
            const revealed = sarOn || z.scanned;

            ctx.beginPath();
            ctx.arc(zx, zy, 14, 0, Math.PI * 2);
            ctx.fillStyle = z.classified
              ? '#10b981'
              : z.scanned
                ? '#f59e0b'
                : revealed
                  ? '#38bdf8'
                  : 'rgba(15, 23, 42, 0.72)';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.font = 'bold 11px sans-serif';
            const badge = z.classified ? `✓ ${z.name}` : z.name;
            const bw = ctx.measureText(badge).width + 10;
            ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
            ctx.fillRect(zx - bw / 2, zy - 31, bw, 15);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(badge, zx, zy - 20);

            if (revealed) {
              ctx.font = 'bold 10px sans-serif';
              const simpleClue =
                z.kind === 'water'
                  ? 'Flooded Water'
                  : z.kind === 'soaked'
                    ? 'Muddy Canal'
                    : 'Dry Safe Hill';
              const sub = `${simpleClue} (${z.moisturePct}% wet)`;
              const sw = ctx.measureText(sub).width + 10;
              ctx.fillStyle = 'rgba(2, 6, 23, 0.76)';
              ctx.fillRect(zx - sw / 2, zy + 16, sw, 14);
              ctx.fillStyle = z.kind === 'water' ? '#7dd3fc' : z.kind === 'dry' ? '#a7f3d0' : '#fde68a';
              ctx.fillText(sub, zx, zy + 26);
            }
          }

          if (next.target) {
            ctx.beginPath();
            ctx.arc((next.target.x / 100) * W, 48 + (next.target.y / 100) * (H - 58), 7, 0, Math.PI * 2);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Crisp normal-scale Lali Maya pixel sprite (20x28 proportional to house & cow)
          const lx = (next.player.x / 100) * W;
          const ly = 48 + (next.player.y / 100) * (H - 58);
          const moving =
            Math.abs(next.player.x - prev.player.x) > 0.02 ||
            Math.abs(next.player.y - prev.player.y) > 0.02;
          const dir = getFacingDir(next.player.x - prev.player.x, next.player.y - prev.player.y);
          const walkFrame: 0 | 1 | 2 = !moving ? 0 : Math.floor(tick / 6) % 2 === 0 ? 1 : 2;

          ctx.beginPath();
          ctx.arc(lx, ly + 3, 11 + (tick % 12) * 0.25, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(251, 191, 36, 0.26)';
          ctx.fill();
          ctx.strokeStyle = sarOn ? '#38bdf8' : '#fbbf24';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          const spr = getCharacterSprite('lali_girl', dir, walkFrame);
          ctx.drawImage(spr, Math.round(lx - 10), Math.round(ly - 22), 20, 28);
          ctx.textAlign = 'left';
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sarOn, onSolve]);

  const activeZone = stateRef.current.zones.find((z) => z.id === hud.activeZoneId) ?? null;

  const handleClassify = (action: DielectricActionType) => {
    if (!activeZone) return;
    const updated = classifyDielectricZone(stateRef.current, activeZone.id, action);
    stateRef.current = updated;
    if (updated.classifiedCount > hud.classified) {
      retroAudio.playUiClick(820);
    } else {
      retroAudio.playUiClick(300);
    }
    setHud({
      scanned: updated.scannedCount,
      classified: updated.classifiedCount,
      activeZoneId: updated.activeZoneId,
      status: updated.statusText,
    });
    if (updated.won && !solvedFiredRef.current) {
      solvedFiredRef.current = true;
      onSolve();
    }
  };

  const expectedActionForActiveZone: DielectricActionType | null = activeZone
    ? activeZone.kind === 'water'
      ? 'evacuate'
      : activeZone.kind === 'soaked'
        ? 'drain'
        : 'shelter'
    : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 text-xs">
      <MissionSimpleGuide
        whatWeAreDoing="Rain clouds block normal cameras (0% view). Click 'Turn ON Radar' to see how wet the ground is, then click all 4 circles and pick the matching safety button!"
        nasaToolUsed="NASA-ISRO NISAR & OPERA Water Radar"
        hintText={
          !sarOn
            ? 'First click the glowing blue "☁️ Turn ON Radar" button below so Lali can see through the clouds!'
            : activeZone && !activeZone.classified
              ? `For "${activeZone.name}" (${activeZone.moisturePct}% wet): click "${
                  expectedActionForActiveZone === 'evacuate'
                    ? 'Evacuate Zone'
                    : expectedActionForActiveZone === 'drain'
                      ? 'Clear Canal'
                      : 'Safe Shelter'
                }" below!`
              : 'Click directly on any of the 4 circles on the map (or use Arrow keys / WASD) to walk Lali there!'
        }
        showHint={showHint}
        onToggleHint={() => setShowHint((v) => !v)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-950/20 backdrop-blur-sm border border-white/25 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
        <span className="font-semibold text-amber-200">{hud.status}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="ch1-sar-toggle-btn"
            onClick={() => {
              retroAudio.playRadarPing('L');
              setSarOn((v) => !v);
            }}
            className={`px-2.5 py-1 rounded border font-bold cursor-pointer [text-shadow:none] ${
              sarOn
                ? 'border-sky-300 bg-sky-500 text-slate-950'
                : 'border-sky-300 bg-slate-950/65 text-sky-200 ring-2 ring-sky-300/85 shadow-lg'
            }`}
          >
            {sarOn ? '🛰️ Radar View ON' : '☁️ Turn ON Radar'}
          </button>
          <span className="tabular-nums text-emerald-300 font-bold">
            Tagged: {hud.classified}/4
          </span>
          {!solved && (
            <button
              type="button"
              data-testid="ch1-quick-solve-btn"
              onClick={() => {
                stateRef.current = {
                  ...stateRef.current,
                  sarViewOn: true,
                  scannedCount: 4,
                  classifiedCount: 4,
                  won: true,
                  zones: stateRef.current.zones.map((z) => ({ ...z, scanned: true, classified: true })),
                };
                setSarOn(true);
                setHud({
                  scanned: 4,
                  classified: 4,
                  activeZoneId: null,
                  status: 'All 4 zones mapped into village safety actions!',
                });
                onSolve();
              }}
              className="px-2 py-1 rounded bg-slate-950/24 backdrop-blur-sm hover:bg-slate-800 border border-white/30 text-amber-200 cursor-pointer"
            >
              Auto-Tag
            </button>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        data-testid="playable-flood-canvas"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = Math.max(4, Math.min(96, (((e.clientY - rect.top) / rect.height) * 336 - 48) / (336 - 58) * 100));
          stateRef.current = { ...stateRef.current, target: { x, y } };
        }}
        className="w-full flex-1 min-h-[320px] sm:min-h-[410px] rounded-xl border border-white/25 cursor-crosshair block shadow-2xl"
      />

      {activeZone && !activeZone.classified && (
        <div className="px-3 py-2 rounded-lg border border-amber-300/75 bg-slate-950/24 backdrop-blur-sm flex flex-wrap items-center justify-between gap-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
          <div>
            <span className="font-bold text-amber-200">{activeZone.name}:</span>{' '}
            <span className="text-sky-200">
              {activeZone.kind === 'water'
                ? '🌊 Flooded Riverbank (92% wet) → Needs Evacuation'
                : activeZone.kind === 'soaked'
                  ? '💧 Soaked Muddy Ground → Needs Canal Drain'
                  : '🏠 Dry Solid Ridge (19% wet) → Safe Shelter'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 [text-shadow:none]">
            <button
              type="button"
              data-testid="ch1-action-evacuate"
              onClick={() => handleClassify('evacuate')}
              className={`px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-semibold cursor-pointer ${
                expectedActionForActiveZone === 'evacuate' ? 'ring-2 ring-amber-300' : ''
              }`}
            >
              Evacuate Zone {expectedActionForActiveZone === 'evacuate' ? '✨' : ''}
            </button>
            <button
              type="button"
              data-testid="ch1-action-drain"
              onClick={() => handleClassify('drain')}
              className={`px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold cursor-pointer ${
                expectedActionForActiveZone === 'drain' ? 'ring-2 ring-white' : ''
              }`}
            >
              Clear Canal {expectedActionForActiveZone === 'drain' ? '✨' : ''}
            </button>
            <button
              type="button"
              data-testid="ch1-action-shelter"
              onClick={() => handleClassify('shelter')}
              className={`px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold cursor-pointer ${
                expectedActionForActiveZone === 'shelter' ? 'ring-2 ring-white' : ''
              }`}
            >
              Safe Shelter {expectedActionForActiveZone === 'shelter' ? '✨' : ''}
            </button>
          </div>
        </div>
      )}

      {solved && (
        <div className="px-3 py-1.5 rounded-lg border border-emerald-400/70 bg-emerald-950/60 text-xs text-emerald-100">
          <strong>{NASA_DISASTER_ACTIONS.dielectric_flood.badge}:</strong>{' '}
          {NASA_DISASTER_ACTIONS.dielectric_flood.tip}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 2. CHAPTER 2 — OPEN RIVER & HYDRO DAM SCENE WITH ANIMATED SLUICE GATES
 * ============================================================================ */
export const CreepHydroPlayable: React.FC<{
  solved: boolean;
  onSolve: () => void;
}> = ({ solved, onSolve }) => {
  const damCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [band, setBand] = useState<'C' | 'L'>(solved ? 'L' : 'C');
  const [datePass, setDatePass] = useState<number>(solved ? 100 : 20);
  const [spotsFound, setSpotsFound] = useState<number[]>(solved ? [1, 2, 3] : []);
  const [gatesClosed, setGatesClosed] = useState<number[]>(solved ? [1, 2, 3] : []);
  const [closingGateAnim, setClosingGateAnim] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  const gatesRef = useRef(gatesClosed);
  const bandRef = useRef(band);
  const datePassRef = useRef(datePass);
  const waveEval = evaluateInsarWaveAlignment(band, datePass, 40, band === 'C' ? 0.55 : 0);
  const waveTraces = sampleWaveAlignmentTraces(band, datePass, 56, 40);
  const waveEvalRef = useRef(waveEval);
  const gateDropRef = useRef<Record<number, number>>({
    1: solved ? 1 : 0,
    2: solved ? 1 : 0,
    3: solved ? 1 : 0,
  });

  useEffect(() => {
    gatesRef.current = gatesClosed;
  }, [gatesClosed]);
  useEffect(() => {
    bandRef.current = band;
  }, [band]);
  useEffect(() => {
    datePassRef.current = datePass;
  }, [datePass]);
  useEffect(() => {
    waveEvalRef.current = waveEval;
  }, [waveEval]);

  useEffect(() => {
    if (!solved && spotsFound.length >= 3 && gatesClosed.length >= 3) {
      onSolve();
    }
  }, [solved, spotsFound.length, gatesClosed.length, onSolve]);

  const creepCm = Math.round((datePass / 100) * 40);

  const handleShutGate = (gate: number) => {
    retroAudio.playUiClick(520 + gate * 60);
    setClosingGateAnim(gate);
    setGatesClosed((p) => (p.includes(gate) ? p : [...p, gate]));
    window.setTimeout(() => {
      setClosingGateAnim((curr) => (curr === gate ? null : curr));
    }, 1100);
  };

  const handleActivateLBand = () => {
    retroAudio.playRadarPing('L');
    setBand('L');
    setDatePass(100);
    setSpotsFound([1, 2, 3]);
  };

  // Full-screen animated Chilime Hydropower Dam + InSAR Rainbow Fringe canvas
  useEffect(() => {
    let raf = 0;
    let lastDraw = 0;
    let tick = 0;

    const renderDam = (now: number) => {
      raf = requestAnimationFrame(renderDam);
      if (now - lastDraw < 42) return;
      lastDraw = now;
      tick++;
      const c = damCanvasRef.current;
      if (c) {
        const W = 760;
        const H = 336;
        if (c.width !== W || c.height !== H) {
          c.width = W;
          c.height = H;
        }
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          const anim = Math.floor(tick / 10) % 4;
          const closed = gatesRef.current;
          const curBand = bandRef.current;
          const wavePct = datePassRef.current / 100;

          // Smoothly animate each steel sluice gate shutter dropping down
          for (const g of [1, 2, 3]) {
            const target = closed.includes(g) ? 1 : 0;
            gateDropRef.current[g] += (target - gateDropRef.current[g]) * 0.14;
          }

          // Sky + snow ridges
          const sky = ctx.createLinearGradient(0, 0, 0, 120);
          sky.addColorStop(0, curBand === 'L' ? '#132a46' : '#23456b');
          sky.addColorStop(1, curBand === 'L' ? '#365b7d' : '#94bdb9');
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, W, 120);

          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.moveTo(0, 120);
          ctx.quadraticCurveTo(110, 38, 220, 74);
          ctx.quadraticCurveTo(360, 22, 480, 68);
          ctx.quadraticCurveTo(620, 28, 760, 76);
          ctx.lineTo(760, 120);
          ctx.closePath();
          ctx.fill();

          // Foregrounds & Bhote Koshi River Gorge
          const cols = Math.ceil(W / 16);
          const rows = Math.ceil(H / 16);
          for (let ty = 7; ty < rows; ty++) {
            for (let tx = 0; tx < cols; tx++) {
              let kind = 'grass';
              if (tx >= 17 && tx <= 30) {
                kind = ty >= 11 ? 'rapids' : 'water';
              } else if (tx === 16 || tx === 31) {
                kind = 'river_cobble';
              } else if (ty === 15 && tx < 16) {
                kind = 'path';
              } else if (ty <= 10 && tx >= 33) {
                kind = 'alpine_scree';
              }
              ctx.drawImage(getTerrainTile(kind, anim, tx, ty), tx * 16, ty * 16);
            }
          }

          // Pixel trees & hillside forest covering the creeping slope
          ctx.drawImage(getPropSprite('laliguras_tree', anim), 36, 98);
          ctx.drawImage(getPropSprite('laliguras_tree', anim), 94, 110);
          ctx.drawImage(getPropSprite('laliguras_tree', anim), 618, 92);
          ctx.drawImage(getPropSprite('laliguras_tree', anim), 676, 114);
          ctx.drawImage(getPropSprite('radar_beacon', anim), 178, 124);

          // InSAR Radar Visualization over hillside (speckle noise clears into crisp fringes as phase aligns!)
          const wEval = waveEvalRef.current;
          if (curBand === 'L') {
            // Rainbow InSAR interferogram fringes showing creeping slope beneath trees!
            const cx = 610;
            const cy = 152;
            const fringeColors = ['#38bdf8', '#22c55e', '#facc15', '#f97316', '#f43f5e'];
            const fringeAlphaHex = wEval.isPhaseLocked ? '48' : '28';
            for (let ring = 4; ring >= 0; ring--) {
              const r = (24 + ring * 18) * (0.55 + wavePct * 0.5);
              ctx.beginPath();
              ctx.ellipse(cx, cy, r * 1.4, r * 0.72, -0.18, 0, Math.PI * 2);
              ctx.fillStyle = `${fringeColors[ring]}${fringeAlphaHex}`;
              ctx.fill();
              ctx.strokeStyle = fringeColors[(ring + Math.floor(tick / 12)) % fringeColors.length];
              ctx.lineWidth = wEval.isPhaseLocked ? 2.5 : 1.6;
              ctx.stroke();
            }
            if (wEval.speckleNoiseRatio > 0.16) {
              const grainCount = Math.round(wEval.speckleNoiseRatio * 48);
              ctx.fillStyle = 'rgba(226, 232, 240, 0.28)';
              for (let i = 0; i < grainCount; i++) {
                const sx = 490 + ((i * 43 + tick * 4) % 240);
                const sy = 90 + ((i * 29 + tick * 2) % 105);
                ctx.fillRect(sx, sy, 2, 2);
              }
            }
            ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
            ctx.fillRect(450, 14, 294, 18);
            ctx.fillStyle = wEval.isPhaseLocked ? '#6ee7b7' : '#fef08a';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(
              wEval.isPhaseLocked
                ? `INSAR PHASE LOCKED (${wEval.fringeCycles} fringes · +${wEval.userDisplacementCm} cm)`
                : `TUNING L-BAND FRINGES (${wEval.alignmentPct}% aligned)`,
              458,
              27
            );
          } else {
            // Short-band radar speckle blocked by forest canopy
            ctx.fillStyle = 'rgba(226, 232, 240, 0.28)';
            for (let i = 0; i < 48; i++) {
              const sx = 490 + ((i * 37 + tick * 3) % 240);
              const sy = 90 + ((i * 23 + tick * 2) % 105);
              ctx.fillRect(sx, sy, 3, 3);
            }
          }

          // Concrete & Steel Chilime Hydro Dam Wall spanning river center (x: 272..496, y: 128..208)
          ctx.fillStyle = '#475569';
          ctx.fillRect(264, 134, 240, 62);
          ctx.fillStyle = '#64748b';
          ctx.fillRect(264, 134, 240, 10);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(264, 194, 240, 6);

          // 3 Animated Steel Intake Sluice Gates drawn directly inside the dam!
          [1, 2, 3].forEach((gate, i) => {
            const gx = 286 + i * 74;
            const gy = 148;
            const gw = 48;
            const gh = 48;
            const drop = gateDropRef.current[gate] ?? 0;
            const isShut = closed.includes(gate);

            // Recess bay
            ctx.fillStyle = '#0c4a6e';
            ctx.fillRect(gx, gy, gw, gh);

            // Pouring whitewater waterfall while gate is open
            if (drop < 0.92) {
              const openH = gh * (1 - drop);
              ctx.fillStyle = '#38bdf8';
              ctx.fillRect(gx + 4, gy + gh * drop, gw - 8, openH);
              ctx.fillStyle = '#e0f2fe';
              const sprayY = ((tick * 4 + i * 11) % Math.max(8, Math.floor(openH))) + gy + gh * drop;
              ctx.fillRect(gx + 8, sprayY, gw - 16, 4);
              // Downstream splash
              ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
              ctx.fillRect(gx + 2, gy + gh + 2, gw - 4, 6 + (tick % 4));
            }

            // Steel shutter sliding down
            const gateH = Math.max(9, Math.round(gh * drop));
            ctx.fillStyle = isShut ? '#059669' : '#64748b';
            ctx.fillRect(gx, gy, gw, gateH);
            ctx.strokeStyle = isShut ? '#6ee7b7' : '#fbbf24';
            ctx.lineWidth = 2;
            ctx.strokeRect(gx, gy, gw, gateH);

            // Gate ribs
            ctx.fillStyle = isShut ? '#047857' : '#475569';
            for (let ry = gy + 6; ry < gy + gateH - 4; ry += 10) {
              ctx.fillRect(gx + 3, ry, gw - 6, 3);
            }

            // Gate badge above bay
            ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
            ctx.fillRect(gx - 2, gy - 17, gw + 4, 14);
            ctx.fillStyle = isShut ? '#6ee7b7' : '#fde047';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(isShut ? `GATE #${gate} SHUT` : `TAP GATE #${gate}`, gx + gw / 2, gy - 7);
          });
          ctx.textAlign = 'left';

          // Normal-scale Lali Maya + Engineer Bikram standing on the riverbank pier
          const laliSpr = getCharacterSprite('lali_girl', 'right', tick % 30 < 15 ? 0 : 1);
          const engSpr = getCharacterSprite('engineer', 'left', 0);
          ctx.drawImage(laliSpr, 212, 212, 20, 28);
          ctx.drawImage(engSpr, 514, 212, 20, 28);
          ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
          ctx.fillRect(204, 200, 36, 11);
          ctx.fillRect(504, 200, 44, 11);
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('LALI', 212, 208);
          ctx.fillStyle = '#bae6fd';
          ctx.fillText('BIKRAM', 508, 208);
        }
      }
    };
    raf = requestAnimationFrame(renderDam);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 text-xs">
      <MissionSimpleGuide
        whatWeAreDoing="The mountain above Chilime Dam is slowly creeping! Click the 3 steel dam gates (on the dam or buttons below) to seal the water, then click NISAR Deep Radar to reveal rainbow movement rings under the trees!"
        nasaToolUsed="NASA-ISRO NISAR Deep L-Band Wave Radar"
        hintText={
          gatesClosed.length < 3
            ? `Click Gates #1, #2, and #3 directly on the dam (or click the bottom Shut Intake buttons: ${gatesClosed.length}/3 shut), then click NISAR Deep Radar!`
            : 'Now click the glowing blue "🛰️ NISAR Deep Radar (Sees Under Trees)" button at the top to finish!'
        }
        showHint={showHint}
        onToggleHint={() => setShowHint((v) => !v)}
      />

      {/* Slim Translucent Top Radar Band & Wave Alignment Bar */}
      <div className="px-3 py-1.5 rounded-lg bg-slate-950/20 backdrop-blur-sm border border-white/25 flex flex-wrap items-center justify-between gap-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
        <div className="flex items-center gap-1.5 [text-shadow:none]">
          <button
            type="button"
            onClick={() => {
              retroAudio.playRadarPing('S');
              setBand('C');
            }}
            className={`px-2 py-1 rounded border font-bold cursor-pointer ${
              band === 'C'
                ? 'border-amber-300 bg-amber-400 text-slate-950'
                : 'border-white/30 bg-slate-950/60 text-stone-200'
            }`}
          >
            Short Radar (Blocked)
          </button>
          <button
            type="button"
            data-testid="ch2-lband-btn"
            onClick={handleActivateLBand}
            className={`px-2.5 py-1 rounded border font-bold cursor-pointer transition ${
              band === 'L'
                ? 'border-sky-300 bg-sky-400 text-slate-950 shadow-md'
                : 'border-sky-300 bg-slate-950/65 text-sky-200 ring-2 ring-sky-300/85 shadow-lg'
            }`}
          >
            🛰️ NISAR Deep Radar (Sees Under Trees)
          </button>
        </div>

        <div className="flex-1 min-w-[200px] flex items-center gap-2">
          <span className="text-[11px] text-sky-200 whitespace-nowrap font-semibold">
            {band === 'L' ? `Wave Shift: +${creepCm} cm` : 'Align Radar Waves:'}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={datePass}
            onChange={(e) => setDatePass(Number(e.target.value))}
            aria-label="Mountain Movement Timeline"
            className="flex-1 accent-amber-400 cursor-pointer"
          />
          <span className="tabular-nums text-emerald-300 font-bold whitespace-nowrap">
            Found {spotsFound.length}/3 · Gates {gatesClosed.length}/3
          </span>
        </div>
      </div>

      {/* Live Dual-Wave InSAR Phase-Matching Oscilloscope (IKEA Effect) */}
      <div
        data-testid="ch2-wave-oscilloscope"
        className="px-3 py-1.5 rounded-lg bg-slate-950/65 border border-sky-400/35 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5 min-w-[230px]">
          <svg
            viewBox="0 0 220 38"
            className="w-44 sm:w-56 h-9 shrink-0 rounded bg-slate-900/90 border border-slate-700/80"
            role="img"
            aria-label={`Pass 1 vs Pass 2 radar wave alignment: ${waveEval.alignmentPct}%`}
          >
            <line x1="4" y1="19" x2="216" y2="19" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.6"
              strokeDasharray="4 2"
              points={waveTraces
                .map((pt) => `${(4 + pt.xNorm * 212).toFixed(1)},${(19 - pt.referenceY * 13).toFixed(1)}`)
                .join(' ')}
            />
            <polyline
              fill="none"
              stroke={waveEval.isPhaseLocked ? '#34d399' : '#fbbf24'}
              strokeWidth="2"
              points={waveTraces
                .map((pt) => `${(4 + pt.xNorm * 212).toFixed(1)},${(19 - pt.repeatShiftedY * 13).toFixed(1)}`)
                .join(' ')}
            />
          </svg>
          <div className="text-[11px] font-mono leading-tight">
            <div className="flex items-center gap-1.5">
              <span className={waveEval.isPhaseLocked ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                Phase Lock: <span className="tabular-nums">{waveEval.alignmentPct}%</span>
              </span>
              <span className="text-slate-400">
                (Speckle {Math.round(waveEval.speckleNoiseRatio * 100)}%)
              </span>
            </div>
            <div className="text-[10px] text-sky-200 tabular-nums">
              {band === 'L' ? 'NISAR L-Band λ=24cm (12cm/fringe)' : 'C-Band λ=5.6cm (2.8cm/fringe)'} · Δφ {waveEval.phaseDifferenceRad.toFixed(2)} rad
            </div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-300 flex items-center gap-3">
          <span><strong className="text-sky-300">---</strong> Pass 1 Ref</span>
          <span><strong className={waveEval.isPhaseLocked ? 'text-emerald-300' : 'text-amber-300'}>───</strong> Pass 2 Repeat</span>
          <span className={`px-2 py-0.5 rounded font-bold ${waveEval.isPhaseLocked ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
            {waveEval.isPhaseLocked ? '✓ FRINGES LOCKED' : 'ALIGN SLIDER →'}
          </span>
        </div>
      </div>

      {/* Full-Screen Animated Pixel Hydro Dam Stage + Slope Hotspots */}
      <div className="relative flex-1 min-h-[320px] sm:min-h-[410px] w-full rounded-xl border border-white/25 overflow-hidden shadow-2xl">
        <canvas
          ref={damCanvasRef}
          data-testid="playable-hydro-canvas"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * 760;
            const py = ((e.clientY - rect.top) / rect.height) * 336;
            if (py >= 115 && py <= 230) {
              if (px >= 272 && px <= 345) handleShutGate(1);
              else if (px > 345 && px <= 420) handleShutGate(2);
              else if (px > 420 && px <= 496) handleShutGate(3);
            }
          }}
          className="w-full h-full block cursor-pointer"
        />

        {/* Live Gate-Closing Animation Toast */}
        {closingGateAnim !== null && (
          <div
            data-testid="gate-closing-toast"
            className="absolute left-1/2 top-3 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-300 text-emerald-100 font-bold shadow-xl pointer-events-none"
          >
            ⚙️ Lowering Steel Dam Gate #{closingGateAnim}... Water Flow Sealed!
          </div>
        )}

        {/* Slope Creep Hotspots */}
        {[
          { id: 1, left: '15%', top: '26%', need: 25, label: '+14 cm Hill Crack' },
          { id: 2, left: '82%', top: '24%', need: 55, label: '+28 cm Ridge Slip' },
          { id: 3, left: '82%', top: '54%', need: 80, label: '+40 cm Dam Slope' },
        ].map((sp) => {
          const visible = (band === 'L' && datePass >= sp.need) || spotsFound.includes(sp.id);
          const found = spotsFound.includes(sp.id);
          return (
            <button
              key={sp.id}
              type="button"
              data-testid={`ch2-epoch-${sp.id}`}
              disabled={!visible}
              onClick={() => {
                retroAudio.playRadarPing('L');
                setSpotsFound((p) => (p.includes(sp.id) ? p : [...p, sp.id]));
              }}
              style={{ left: sp.left, top: sp.top }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg border font-bold shadow-lg transition ${
                found
                  ? 'border-emerald-400 bg-emerald-950/85 text-emerald-200'
                  : visible
                    ? 'border-amber-300 bg-rose-600/95 text-white ring-2 ring-amber-300/85 cursor-pointer'
                    : 'border-white/30 bg-slate-950/24 backdrop-blur-sm text-stone-200 cursor-not-allowed'
              }`}
            >
              {found ? `✓ ${sp.label}` : visible ? `Tap ${sp.label}` : band === 'C' ? '🌳 Hidden by Trees' : 'Slide Wave'}
            </button>
          );
        })}

        {/* Compact Sluice Status Indicator Over Bottom Center */}
        <div
          data-testid="hydro-gates-visualizer"
          className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/24 backdrop-blur-sm border border-white/25 pointer-events-none"
        >
          {[1, 2, 3].map((gate) => {
            const isShut = gatesClosed.includes(gate);
            return (
              <span
                key={gate}
                className={`text-[10px] font-bold ${isShut ? 'text-emerald-300' : 'text-amber-200'}`}
              >
                Gate #{gate}: {isShut ? '🔒 SHUT' : '🌊 OPEN'}
              </span>
            );
          })}
        </div>
      </div>

      {/* Slim Bottom Hydro Gate Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((gate) => {
          const closed = gatesClosed.includes(gate);
          return (
            <button
              key={gate}
              type="button"
              data-testid={`ch2-gate-${gate}`}
              onClick={() => handleShutGate(gate)}
              className={`py-2 px-3 rounded-lg border font-bold cursor-pointer transition shadow-md ${
                closed
                  ? 'border-emerald-400 bg-emerald-900/80 text-emerald-100'
                  : 'border-rose-300 bg-rose-900/75 hover:bg-rose-800 text-white ring-2 ring-rose-300/80'
              }`}
            >
              {closed ? `✓ Gate #${gate} Shut (Locked)` : `🚪 Shut Intake #${gate}`}
            </button>
          );
        })}
      </div>

      {solved && (
        <div className="px-3 py-1.5 rounded-lg border border-emerald-400/70 bg-emerald-950/60 text-xs text-emerald-100">
          <strong>{NASA_DISASTER_ACTIONS.creep_hydro.badge}:</strong> {NASA_DISASTER_ACTIONS.creep_hydro.tip}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 3. CHAPTER 3 — 7-MINUTE DAM BREACH EVACUATION RUN (REAL LALI CHARACTER!)
 * ============================================================================ */
export const BreachRunPlayable: React.FC<{
  solved: boolean;
  onSolve: () => void;
}> = ({ solved, onSolve }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<EvacuationRunState>(createInitialEvacuationRunState());
  const keysRef = useRef<Set<string>>(new Set());
  const solvedFiredRef = useRef<boolean>(solved);
  const [radarOn, setRadarOn] = useState(false);
  const [evacCount, setEvacCount] = useState(solved ? 4 : 0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    solvedFiredRef.current = solved;
  }, [solved]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        keysRef.current.add(e.code);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const onBlur = () => keysRef.current.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastDraw = 0;
    let tick = 0;

    const citizenSpriteTypes: CharacterPaletteId[] = ['elder', 'engineer', 'rudra', 'ca_campesino'];

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastDraw < 42) return;
      lastDraw = now;
      const rawDt = (now - last) / 1000;
      last = now;
      tick++;
      const keys = keysRef.current;
      const ix =
        (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) -
        (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      const iy =
        (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) -
        (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);

      const prev = stateRef.current;
      const next = stepEvacuationRunState({ ...prev, radarXray: radarOn }, { x: ix, y: iy }, rawDt);
      stateRef.current = next;

      if (next.evacuatedCount > prev.evacuatedCount) {
        retroAudio.playUiClick(780);
        setEvacCount(next.evacuatedCount);
      }
      if (next.won && !solvedFiredRef.current) {
        solvedFiredRef.current = true;
        onSolve();
      }

      const c = canvasRef.current;
      if (c) {
        const W = 720;
        const H = 336;
        if (c.width !== W || c.height !== H) {
          c.width = W;
          c.height = H;
        }
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          const anim = Math.floor(tick / 14) % 4;
          const cols = Math.ceil(W / 16);
          const rows = Math.ceil(H / 16);

          // Mountain sky horizon
          const sky = ctx.createLinearGradient(0, 0, 0, 56);
          sky.addColorStop(0, '#1e3a5f');
          sky.addColorStop(1, '#7ea8be');
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, W, 56);

          for (let ty = 3; ty < rows; ty++) {
            for (let tx = 0; tx < cols; tx++) {
              let kind = 'river_cobble';
              if (ty <= 5) kind = 'grass';
              else if (ty >= 16 && tx < 20) kind = 'water';
              else if (ty >= 16) kind = 'alpine_scree';
              else if (tx >= 12 && tx <= 14) kind = 'path';
              ctx.drawImage(getTerrainTile(kind, anim, tx, ty), tx * 16, ty * 16);
            }
          }

          ctx.drawImage(getPropSprite('house_red', anim), 40, 108);
          ctx.drawImage(getPropSprite('tamang_stone_house', anim), 540, 96);
          ctx.drawImage(getPropSprite('flood_debris_scar', anim), 348, 256);

          if (radarOn) {
            ctx.fillStyle = 'rgba(2, 6, 23, 0.36)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('RADAR: Dark Trapped Water Pond', 16, 296);
            ctx.fillStyle = '#fde68a';
            ctx.fillText('RADAR: Bright Fallen Rock Pile', W * 0.54, 296);
          }

          ctx.fillStyle = 'rgba(6, 78, 59, 0.72)';
          ctx.fillRect(10, 8, 250, 22);
          ctx.fillStyle = '#a7f3d0';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText('▲ HIGH GROUND SAFE SHELTER', 18, 23);

          // Villagers waiting for Lali to warn them (crisp 20x28 proportional scale!)
          next.citizens.forEach((cit, idx) => {
            const cx = (cit.x / 100) * W;
            const cy = 44 + (cit.y / 100) * (H - 54);

            ctx.beginPath();
            ctx.arc(cx, cy + 3, 11, 0, Math.PI * 2);
            ctx.fillStyle = cit.evacuated ? 'rgba(16, 185, 129, 0.45)' : 'rgba(245, 158, 11, 0.45)';
            ctx.fill();
            ctx.strokeStyle = cit.evacuated ? '#34d399' : '#fde047';
            ctx.lineWidth = 1.6;
            ctx.stroke();

            const vSpr = getCharacterSprite(citizenSpriteTypes[idx % citizenSpriteTypes.length], 'down', 0);
            ctx.drawImage(vSpr, Math.round(cx - 10), Math.round(cy - 22), 20, 28);

            const tag = cit.evacuated ? `✓ ${cit.label} SAFE!` : `📣 Warn ${cit.label}`;
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            const tw = ctx.measureText(tag).width + 10;
            ctx.fillStyle = cit.evacuated ? 'rgba(6, 78, 59, 0.85)' : 'rgba(2, 6, 23, 0.72)';
            ctx.fillRect(cx - tw / 2, cy - 37, tw, 14);
            ctx.fillStyle = cit.evacuated ? '#a7f3d0' : '#fde68a';
            ctx.fillText(tag, cx, cy - 27);
          });

          // Rolling boulders
          for (const b of next.boulders) {
            const bx = (b.x / 100) * W;
            const by = 44 + (b.y / 100) * (H - 54);
            ctx.beginPath();
            ctx.arc(bx, by, 10, 0, Math.PI * 2);
            ctx.fillStyle = radarOn ? '#f97316' : '#78716c';
            ctx.fill();
            ctx.strokeStyle = '#292524';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Real Lali Maya pixel character at normal 20x28 scale
          const lx = (next.player.x / 100) * W;
          const ly = 44 + (next.player.y / 100) * (H - 54);
          const moving =
            Math.abs(next.player.x - prev.player.x) > 0.02 ||
            Math.abs(next.player.y - prev.player.y) > 0.02;
          const dir = getFacingDir(next.player.x - prev.player.x, next.player.y - prev.player.y);
          const walkFrame: 0 | 1 | 2 = !moving ? 0 : Math.floor(tick / 5) % 2 === 0 ? 1 : 2;

          ctx.beginPath();
          ctx.arc(lx, ly + 3, 12, 0, Math.PI * 2);
          ctx.fillStyle =
            next.stunTimerSec > 0 ? 'rgba(244, 63, 94, 0.45)' : 'rgba(250, 204, 21, 0.30)';
          ctx.fill();
          ctx.strokeStyle = next.stunTimerSec > 0 ? '#f43f5e' : '#fde047';
          ctx.lineWidth = 1.8;
          ctx.stroke();

          const laliSpr = getCharacterSprite('lali_girl', dir, walkFrame);
          ctx.drawImage(laliSpr, Math.round(lx - 10), Math.round(ly - 22), 20, 28);

          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
          ctx.fillRect(lx - 18, ly - 35, 36, 12);
          ctx.fillStyle = '#fde047';
          ctx.fillText('LALI', lx, ly - 26);
          ctx.textAlign = 'left';
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [radarOn, onSolve]);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 text-xs">
      <MissionSimpleGuide
        whatWeAreDoing="Falling rocks blocked the river for 7 minutes! Click on each of the 4 villagers (or use Arrow keys / WASD) so Lali runs over and warns them to climb to high ground!"
        nasaToolUsed="NASA & Partner River-Block Detector"
        hintText="Click directly on each villager with a yellow '📣 Warn' label above their head so Lali runs to all 4 of them! Watch out for rolling grey boulders!"
        showHint={showHint}
        onToggleHint={() => setShowHint((v) => !v)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-950/20 backdrop-blur-sm border border-white/25 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
        <span className="text-amber-200 font-semibold">
          Click any villager (or use Arrow keys) to make Lali run and warn all 4 neighbors!
        </span>
        <div className="flex items-center gap-2 [text-shadow:none]">
          <button
            type="button"
            data-testid="ch3-classify-btn"
            onClick={() => {
              retroAudio.playRadarPing('S');
              setRadarOn((v) => !v);
            }}
            className={`px-2.5 py-1 rounded border font-bold cursor-pointer ${
              radarOn
                ? 'border-sky-300 bg-sky-500 text-slate-950'
                : 'border-sky-300/80 bg-slate-950/60 text-sky-200'
            }`}
          >
            {radarOn ? '🛰️ Radar View ON' : '🛰️ Turn ON Radar'}
          </button>
          <span className="tabular-nums text-emerald-300 font-bold">
            Warned: {evacCount}/4
          </span>
          {!solved && (
            <button
              type="button"
              data-testid="ch3-quick-solve-btn"
              onClick={() => {
                stateRef.current = {
                  ...stateRef.current,
                  evacuatedCount: 4,
                  won: true,
                  citizens: stateRef.current.citizens.map((c) => ({ ...c, evacuated: true })),
                };
                setEvacCount(4);
                onSolve();
              }}
              className="px-2 py-1 rounded bg-slate-950/24 backdrop-blur-sm hover:bg-slate-800 border border-white/30 text-amber-200 cursor-pointer"
            >
              Auto-Assist
            </button>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        data-testid="playable-evac-canvas"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = Math.max(4, Math.min(96, (((e.clientY - rect.top) / rect.height) * 336 - 44) / (336 - 54) * 100));
          stateRef.current = { ...stateRef.current, target: { x, y } };
        }}
        className="w-full flex-1 min-h-[320px] sm:min-h-[410px] rounded-xl border border-white/25 cursor-crosshair block shadow-2xl"
      />

      {solved && (
        <div className="px-3 py-1.5 rounded-lg border border-emerald-400/70 bg-emerald-950/60 text-xs text-emerald-100">
          <strong>{NASA_DISASTER_ACTIONS.dam_breach.badge}:</strong> {NASA_DISASTER_ACTIONS.dam_breach.tip}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 4. CHAPTER 4 — CLOUD-PIERCING NISAR L-BAND RADAR SWEEP (REAL PIXEL GORGE)
 * ============================================================================ */
export const AvalancheSweepPlayable: React.FC<{
  solved: boolean;
  onSolve: () => void;
}> = ({ solved, onSolve }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<AvalancheSweepState>(createInitialAvalancheSweepState());
  const solvedFiredRef = useRef<boolean>(solved);
  const [lockedCount, setLockedCount] = useState(solved ? 4 : 0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    solvedFiredRef.current = solved;
  }, [solved]);

  useEffect(() => {
    let raf = 0;
    let lastDraw = 0;
    let tick = 0;
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (now - lastDraw < 42) return;
      lastDraw = now;
      tick++;
      const c = canvasRef.current;
      const st = stateRef.current;
      if (c) {
        const W = 760;
        const H = 336;
        if (c.width !== W || c.height !== H) {
          c.width = W;
          c.height = H;
        }
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          const anim = Math.floor(tick / 14) % 4;
          const cols = Math.ceil(W / 16);
          const rows = Math.ceil(H / 16);

          // Thick optical storm clouds layer
          ctx.fillStyle = 'rgba(203, 213, 225, 0.92)';
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
          for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.arc(((i * 120 + tick * 0.4) % (W + 100)) - 50, 62 + (i % 3) * 82, 56, 0, Math.PI * 2);
            ctx.fill();
          }

          // Faint guide rings through clouds so players never have to guess where to sweep
          for (const t of st.targets) {
            if (t.locked) continue;
            const tx = (t.x / 100) * W;
            const ty = (t.y / 100) * H;
            ctx.beginPath();
            ctx.arc(tx, ty, 18 + (tick % 20) * 0.5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(2, 132, 199, 0.55)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Cut circular L-band SAR cloud-piercing window around beam revealing the pixel canyon
          const bx = (st.beam.x / 100) * W;
          const by = (st.beam.y / 100) * H;
          ctx.save();
          ctx.beginPath();
          ctx.arc(bx, by, 102, 0, Math.PI * 2);
          ctx.clip();

          for (let ty = 0; ty < rows; ty++) {
            for (let tx = 0; tx < cols; tx++) {
              let kind = 'alpine_scree';
              if (tx >= 11 && tx <= 15) kind = ty === 11 || ty === 12 ? 'bridge_wood' : 'rapids';
              else if (ty <= 4) kind = 'snow';
              else if (tx >= 32) kind = 'grass';
              ctx.drawImage(getTerrainTile(kind, anim, tx, ty), tx * 16, ty * 16);
            }
          }
          ctx.drawImage(getPropSprite('buddhist_stupa', anim), 560, 72);
          ctx.drawImage(getCharacterSprite('lali_girl', 'right', 0), 128, 172, 20, 28);
          ctx.fillStyle = 'rgba(12, 31, 46, 0.25)';
          ctx.fillRect(0, 0, W, H);

          for (const t of st.targets) {
            if (t.locked) continue;
            const tx = (t.x / 100) * W;
            const ty = (t.y / 100) * H;
            ctx.beginPath();
            ctx.arc(tx, ty, 13, 0, Math.PI * 2);
            ctx.fillStyle = '#f59e0b';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(t.label, tx, ty - 17);
            ctx.fillStyle = '#7dd3fc';
            ctx.font = '10px sans-serif';
            ctx.fillText(t.tag, tx, ty + 21);
          }
          ctx.restore();

          // Locked beacons visible cleanly
          for (const t of st.targets) {
            if (!t.locked) continue;
            const tx = (t.x / 100) * W;
            const ty = (t.y / 100) * H;
            ctx.beginPath();
            ctx.arc(tx, ty, 11, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            const badgeText = `✓ ${t.label}`;
            ctx.font = 'bold 11px sans-serif';
            const tw = ctx.measureText(badgeText).width + 12;
            ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
            ctx.fillRect(tx - tw / 2, ty - 31, tw, 16);
            ctx.fillStyle = '#a7f3d0';
            ctx.textAlign = 'center';
            ctx.fillText(badgeText, tx, ty - 19);
          }

          ctx.beginPath();
          ctx.arc(bx, by, 102, 0, Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.textAlign = 'left';
        }
      }
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  const updateBeam = (e: React.MouseEvent<HTMLCanvasElement>, lock: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const next = stepAvalancheSweepBeam(stateRef.current, { x, y }, lock);
    if (next.lockedCount > stateRef.current.lockedCount) {
      retroAudio.playRadarPing('L');
      setLockedCount(next.lockedCount);
    }
    stateRef.current = next;
    if (next.won && !solvedFiredRef.current) {
      solvedFiredRef.current = true;
      onSolve();
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 text-xs">
      <MissionSimpleGuide
        whatWeAreDoing="Thick storm clouds hide the broken bridge and avalanche path! Move your mouse like a radar flashlight to see through the clouds, and click the 4 pulsing blue rings to guide rescue helicopters!"
        nasaToolUsed="NASA-ISRO NISAR All-Weather Cloud-Piercing Radar"
        hintText="Look for the 4 pulsing blue circles on the white clouds and click each one (or click 'Auto-Lock' if you want to advance right away)!"
        showHint={showHint}
        onToggleHint={() => setShowHint((v) => !v)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-950/20 backdrop-blur-sm border border-white/25 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
        <span className="text-amber-200 font-semibold">
          Move your radar flashlight over the 4 pulsing blue rings &amp; click each one!
        </span>
        <div className="flex items-center gap-2 [text-shadow:none]">
          <span className="tabular-nums text-emerald-300 font-bold">
            Locked: {lockedCount}/4
          </span>
          {!solved && (
            <button
              type="button"
              data-testid="ch4-quick-solve-btn"
              onClick={() => {
                stateRef.current = {
                  ...stateRef.current,
                  lockedCount: 4,
                  won: true,
                  targets: stateRef.current.targets.map((t) => ({ ...t, scanned: true, locked: true })),
                };
                setLockedCount(4);
                onSolve();
              }}
              className="px-2 py-1 rounded bg-slate-950/24 backdrop-blur-sm hover:bg-slate-800 border border-white/30 text-amber-200 cursor-pointer"
            >
              Auto-Lock
            </button>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        data-testid="playable-avalanche-canvas"
        onMouseMove={(e) => updateBeam(e, false)}
        onClick={(e) => updateBeam(e, true)}
        className="w-full flex-1 min-h-[320px] sm:min-h-[410px] rounded-xl border border-white/25 cursor-crosshair block shadow-2xl"
      />

      {solved && (
        <div className="px-3 py-1.5 rounded-lg border border-emerald-400/70 bg-emerald-950/60 text-xs text-emerald-100">
          <strong>{NASA_DISASTER_ACTIONS.avalanche_sar.badge}:</strong> {NASA_DISASTER_ACTIONS.avalanche_sar.tip}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 5. CHAPTER 6 — PRECISION FARMING & AQUIFER SUBSIDENCE (SAN JOAQUIN VALLEY)
 * ============================================================================ */
export const AgriSubsidencePlayable: React.FC<{
  solved: boolean;
  onSolve: () => void;
}> = ({ solved, onSolve }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<AgriSubsidenceState>(createInitialAgriSubsidenceState());
  const keysRef = useRef<Set<string>>(new Set());
  const solvedFiredRef = useRef<boolean>(solved);
  const [layer, setLayer] = useState<'moisture' | 'subsidence'>('moisture');
  const [showHint, setShowHint] = useState(false);
  const [hud, setHud] = useState({
    resolved: solved ? 4 : 0,
    activeBlockId: null as number | null,
    status: solved
      ? 'All 4 farm & aquifer blocks balanced with NISAR & SAOCOM data!'
      : 'Click any of the 4 farm circles to walk Lali there and pick the matching farm fix!',
  });

  useEffect(() => {
    solvedFiredRef.current = solved;
  }, [solved]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        keysRef.current.add(e.code);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const onBlur = () => keysRef.current.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastDraw = 0;
    let tick = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastDraw < 42) return;
      lastDraw = now;
      const rawDt = (now - last) / 1000;
      last = now;
      tick++;

      const keys = keysRef.current;
      const ix =
        (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) -
        (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      const iy =
        (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) -
        (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);

      const prev = stateRef.current;
      const next = stepAgriSubsidenceState({ ...prev, layerMode: layer }, { x: ix, y: iy }, rawDt);
      stateRef.current = next;

      if (
        next.resolvedCount !== prev.resolvedCount ||
        next.activeBlockId !== prev.activeBlockId ||
        next.statusText !== prev.statusText
      ) {
        setHud({
          resolved: next.resolvedCount,
          activeBlockId: next.activeBlockId,
          status: next.statusText,
        });
      }
      if (next.won && !solvedFiredRef.current) {
        solvedFiredRef.current = true;
        onSolve();
      }

      const c = canvasRef.current;
      if (c) {
        const W = 720;
        const H = 264;
        if (c.width !== W || c.height !== H) {
          c.width = W;
          c.height = H;
        }
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          const anim = Math.floor(tick / 14) % 4;
          const cols = Math.ceil(W / 16);
          const rows = Math.ceil(H / 16);

          for (let ty = 0; ty < rows; ty++) {
            for (let tx = 0; tx < cols; tx++) {
              let kind = 'grass';
              if (tx >= 29 && tx <= 31) kind = 'water';
              else if (ty === 8) kind = 'path';
              else if (tx >= 16 && tx <= 25 && ty >= 9) kind = 'river_cobble';
              ctx.drawImage(getTerrainTile(kind, anim, tx, ty), tx * 16, ty * 16);
            }
          }

          // Crop plot furrows & farm shed
          ctx.fillStyle = 'rgba(217, 119, 6, 0.28)';
          for (let r = 0; r < 4; r++) {
            ctx.fillRect(64, 44 + r * 14, 150, 6);
            ctx.fillRect(465, 158 + r * 14, 155, 6);
          }
          ctx.drawImage(getPropSprite('house_red', anim), 30, 128);
          ctx.drawImage(getPropSprite('radar_beacon', anim), 356, 102);

          // Layer heatmap overlay: SMAP/NISAR Soil Moisture OR InSAR Subsidence Bowl
          if (layer === 'subsidence') {
            ctx.fillStyle = 'rgba(244, 63, 94, 0.34)';
            ctx.beginPath();
            ctx.ellipse(W * 0.52, H * 0.7, 120, 56, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fb7185';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
            ctx.fillRect(W * 0.7, 0, W * 0.14, H);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.26)';
            ctx.fillRect(44, 24, 200, 100);
          }

          ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
          ctx.fillRect(10, 8, 224, 22);
          ctx.fillStyle = layer === 'moisture' ? '#7dd3fc' : '#fda4af';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(
            layer === 'moisture' ? 'FARM RADAR: SOIL WETNESS' : 'FARM RADAR: SINKING GROUND',
            16,
            23
          );

          for (const b of next.blocks) {
            const bx = (b.x / 100) * W;
            const by = (b.y / 100) * H;
            ctx.beginPath();
            ctx.arc(bx, by, 15, 0, Math.PI * 2);
            ctx.fillStyle = b.resolved ? '#10b981' : b.scanned ? '#f59e0b' : '#38bdf8';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.font = 'bold 11px sans-serif';
            const title = b.resolved ? `✓ ${b.name}` : b.name;
            const tw = ctx.measureText(title).width + 12;
            ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
            ctx.fillRect(bx - tw / 2, by - 33, tw, 15);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(title, bx, by - 22);

            const metric =
              layer === 'moisture' ? `${b.moisturePct}% Wet Soil` : `Sinking ${b.subsidenceCmYr} cm/yr`;
            const mw = ctx.measureText(metric).width + 10;
            ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
            ctx.fillRect(bx - mw / 2, by + 17, mw, 14);
            ctx.fillStyle = b.subsidenceCmYr >= 18 ? '#fda4af' : '#bae6fd';
            ctx.fillText(metric, bx, by + 27);
          }

          // Crisp normal-scale Lali Maya sprite (20x28 px)
          const lx = (next.player.x / 100) * W;
          const ly = (next.player.y / 100) * H;
          const moving =
            Math.abs(next.player.x - prev.player.x) > 0.02 ||
            Math.abs(next.player.y - prev.player.y) > 0.02;
          const dir = getFacingDir(next.player.x - prev.player.x, next.player.y - prev.player.y);
          const walkFrame: 0 | 1 | 2 = !moving ? 0 : Math.floor(tick / 6) % 2 === 0 ? 1 : 2;

          ctx.beginPath();
          ctx.arc(lx, ly + 3, 11, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
          ctx.fill();
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          const laliSpr = getCharacterSprite('lali_girl', dir, walkFrame);
          ctx.drawImage(laliSpr, Math.round(lx - 10), Math.round(ly - 22), 20, 28);
          ctx.textAlign = 'left';
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [layer, onSolve]);

  const activeBlock = stateRef.current.blocks.find((b) => b.id === hud.activeBlockId) ?? null;

  const handleAssign = (action: AgriActionType) => {
    if (!activeBlock) return;
    const next = assignAgriBlockAction(stateRef.current, activeBlock.id, action);
    stateRef.current = next;
    retroAudio.playUiClick(next.resolvedCount > hud.resolved ? 780 : 300);
    setHud({
      resolved: next.resolvedCount,
      activeBlockId: next.activeBlockId,
      status: next.statusText,
    });
    if (next.won && !solvedFiredRef.current) {
      solvedFiredRef.current = true;
      onSolve();
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 text-xs">
      <MissionSimpleGuide
        whatWeAreDoing="Some farm fields are dry while pumping too much underground water makes the ground sink! Walk Lali to each of the 4 farm spots and pick the highlighted fix!"
        nasaToolUsed="NASA NISAR + CONAE SAOCOM Farm Radar"
        hintText={
          activeBlock && !activeBlock.resolved
            ? `For "${activeBlock.name}": click the button marked with ✨ (${
                activeBlock.expectedAction === 'drip_save'
                  ? 'Save Water with Drip'
                  : activeBlock.expectedAction === 'recharge_basin'
                    ? 'Refill Underground Water'
                    : 'Strengthen Canal Wall'
              })!`
            : 'Click on any of the 4 blue/orange circles on the farm map so Lali walks over to check it!'
        }
        showHint={showHint}
        onToggleHint={() => setShowHint((v) => !v)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-950/20 backdrop-blur-sm border border-white/25 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
        <span className="font-semibold text-amber-200">{hud.status}</span>
        <div className="flex items-center gap-2 [text-shadow:none]">
          <button
            type="button"
            data-testid="ch6-layer-btn"
            onClick={() => {
              retroAudio.playRadarPing('L');
              setLayer((m) => (m === 'moisture' ? 'subsidence' : 'moisture'));
            }}
            className="px-2.5 py-1 rounded border border-sky-400 bg-slate-950/60 hover:bg-slate-800 text-sky-200 font-bold cursor-pointer"
          >
            {layer === 'moisture' ? '💧 Wet Soil View (Switch to Sinking Ground)' : '📉 Sinking Ground View ON'}
          </button>
          <span className="tabular-nums text-emerald-300 font-bold">Saved: {hud.resolved}/4</span>
          {!solved && (
            <button
              type="button"
              data-testid="ch6-quick-solve-btn"
              onClick={() => {
                stateRef.current = {
                  ...stateRef.current,
                  resolvedCount: 4,
                  won: true,
                  blocks: stateRef.current.blocks.map((b) => ({ ...b, scanned: true, resolved: true })),
                };
                setHud({ resolved: 4, activeBlockId: null, status: 'All 4 farm fields and wells saved!' });
                onSolve();
              }}
              className="px-2 py-1 rounded bg-slate-950/24 backdrop-blur-sm hover:bg-slate-800 border border-white/30 text-amber-200 cursor-pointer"
            >
              Auto-Plan
            </button>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        data-testid="playable-agri-canvas"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          stateRef.current = { ...stateRef.current, target: { x, y } };
        }}
        className="w-full flex-1 min-h-[320px] sm:min-h-[410px] rounded-xl border border-white/25 cursor-crosshair block shadow-2xl"
      />

      {activeBlock && !activeBlock.resolved && (
        <div className="px-3 py-2 rounded-lg border border-amber-300/75 bg-slate-950/24 backdrop-blur-sm flex flex-wrap items-center justify-between gap-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
          <div>
            <span className="font-bold text-amber-200">{activeBlock.name}:</span>{' '}
            <span className="text-sky-200">
              {activeBlock.expectedAction === 'drip_save'
                ? '🌱 Dry Crops (24% wet) → Needs Drip Watering'
                : activeBlock.expectedAction === 'recharge_basin'
                  ? '📉 Ground Sinking Fast (28 cm/yr) → Needs Underground Water Refill'
                  : '🚰 Canal Wall Cracking (18 cm/yr) → Needs Stronger Wall'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleAssign('drip_save')}
              className={`px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer ${
                activeBlock.expectedAction === 'drip_save' ? 'ring-2 ring-amber-300' : ''
              }`}
            >
              Save Water with Drip {activeBlock.expectedAction === 'drip_save' ? '✨' : ''}
            </button>
            <button
              type="button"
              onClick={() => handleAssign('recharge_basin')}
              className={`px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold cursor-pointer ${
                activeBlock.expectedAction === 'recharge_basin' ? 'ring-2 ring-white' : ''
              }`}
            >
              Refill Underground Water {activeBlock.expectedAction === 'recharge_basin' ? '✨' : ''}
            </button>
            <button
              type="button"
              onClick={() => handleAssign('reinforce_canal')}
              className={`px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer ${
                activeBlock.expectedAction === 'reinforce_canal' ? 'ring-2 ring-amber-300' : ''
              }`}
            >
              Strengthen Canal Wall {activeBlock.expectedAction === 'reinforce_canal' ? '✨' : ''}
            </button>
          </div>
        </div>
      )}

      {solved && (
        <div className="px-3 py-2 rounded-lg border border-emerald-400/70 bg-emerald-950/85 text-xs text-emerald-100">
          <strong>{NASA_DISASTER_ACTIONS.agri_subsidence.badge}:</strong> {NASA_DISASTER_ACTIONS.agri_subsidence.tip}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 6. CHAPTER 7 — FOREST CANOPY, WILDFIRES & HIDDEN LOGGING (PANTANAL / AMAZON)
 * ============================================================================ */
const FOREST_SIMPLE_CLUES: Record<number, { clue: string; actionLabel: string }> = {
  1: { clue: '🪓 Cut Tree Trunks Under Leaves', actionLabel: '🪓 Report Tree Cutting' },
  2: { clue: '🔥 Smoking Wildfire Ash', actionLabel: '🔥 Report Wildfire Burn' },
  3: { clue: '🌿 Healthy Standing Trees', actionLabel: '🌿 Protect Healthy Forest' },
  4: { clue: '🪓 Hidden Logging Road', actionLabel: '🪓 Report Tree Cutting' },
};

export const ForestCanopyPlayable: React.FC<{
  solved: boolean;
  onSolve: () => void;
}> = ({ solved, onSolve }) => {
  const [sim, setSim] = useState<ForestCanopyState>(() => {
    const init = createInitialForestCanopyState();
    return solved
      ? {
          ...init,
          band: 'L_HV',
          taggedCount: 4,
          won: true,
          sites: init.sites.map((s) => ({ ...s, revealed: true, tagged: true })),
          statusText: 'Great job! All 4 hidden forest spots checked!',
        }
      : init;
  });
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (sim.won && !solved) onSolve();
  }, [sim.won, solved, onSolve]);

  const activeSite = sim.sites.find((s) => s.id === sim.activeSiteId) ?? null;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 text-xs">
      <MissionSimpleGuide
        whatWeAreDoing="Short radar bounces off top leaves, hiding loggers and fires below! Click the green 'Deep Radar (See Under Trees)' button, then click each of the 4 boxes and pick the matching action!"
        nasaToolUsed="NASA-ISRO NISAR Tree-Seeing Radar"
        hintText={
          sim.band === 'C'
            ? 'Step 1: Click the green button "🛰️ Deep Radar (See Under Trees)" below so you can see under the leaves!'
            : activeSite && !activeSite.tagged
              ? `Step 2: For "${activeSite.name}" (${FOREST_SIMPLE_CLUES[activeSite.id]?.clue}): click "${FOREST_SIMPLE_CLUES[activeSite.id]?.actionLabel} ✨" at the bottom!`
              : 'Step 2: Click any red/orange forest box on the map to check what is hiding under the trees!'
        }
        showHint={showHint}
        onToggleHint={() => setShowHint((v) => !v)}
      />

      <div className="px-3 py-1.5 rounded-lg bg-slate-950/20 backdrop-blur-sm border border-white/25 flex flex-wrap items-center justify-between gap-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
        <div className="flex items-center gap-1.5 [text-shadow:none]">
          <button
            type="button"
            onClick={() => {
              retroAudio.playRadarPing('S');
              setSim((s) => switchForestBand(s, 'C'));
            }}
            className={`px-2.5 py-1 rounded border font-bold cursor-pointer ${
              sim.band === 'C'
                ? 'border-amber-300 bg-amber-400 text-slate-950'
                : 'border-white/30 bg-slate-950/60 text-stone-200'
            }`}
          >
            Short Radar (Blocked by Leaves)
          </button>
          <button
            type="button"
            data-testid="ch7-lband-btn"
            onClick={() => {
              retroAudio.playRadarPing('L');
              setSim((s) => switchForestBand(s, 'L_HV'));
            }}
            className={`px-2.5 py-1 rounded border font-bold cursor-pointer ${
              sim.band === 'L_HV'
                ? 'border-emerald-300 bg-emerald-400 text-slate-950'
                : 'border-emerald-400 bg-slate-950/65 text-emerald-200 ring-2 ring-emerald-300/85 shadow-lg'
            }`}
          >
            🛰️ Deep Radar (See Under Trees)
          </button>
        </div>
        <span className="text-amber-200 font-semibold">{sim.statusText}</span>
        <div className="flex items-center gap-2 [text-shadow:none]">
          <span className="tabular-nums text-emerald-300 font-bold">Protected: {sim.taggedCount}/4</span>
          {!solved && (
            <button
              type="button"
              data-testid="ch7-quick-solve-btn"
              onClick={() => {
                setSim((prev) => ({
                  ...prev,
                  band: 'L_HV',
                  taggedCount: 4,
                  won: true,
                  sites: prev.sites.map((s) => ({ ...s, revealed: true, tagged: true })),
                  statusText: 'Great job! All 4 hidden forest spots checked!',
                }));
                onSolve();
              }}
              className="px-2 py-1 rounded bg-slate-950/24 backdrop-blur-sm hover:bg-slate-800 border border-white/30 text-amber-200 cursor-pointer"
            >
              Auto-Scan
            </button>
          )}
        </div>
      </div>

      {/* Unobstructed Rainforest Canopy Stage */}
      <div className="relative flex-1 min-h-[320px] sm:min-h-[410px] rounded-xl border border-white/25 overflow-hidden bg-emerald-950 shadow-2xl">
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            sim.band === 'C' ? 'bg-emerald-900/90 opacity-95' : 'bg-slate-950/24 backdrop-blur-sm opacity-60'
          }`}
        />
        {/* Decorative canopy silhouettes */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-around opacity-35 text-4xl">
          <span>🌳</span>
          <span>🌲</span>
          <span>🌴</span>
          <span>🌳</span>
        </div>

        {sim.sites.map((site) => {
          const isSelected = sim.activeSiteId === site.id;
          const clue = FOREST_SIMPLE_CLUES[site.id]?.clue ?? '';
          return (
            <button
              key={site.id}
              type="button"
              data-testid={`ch7-site-${site.id}`}
              disabled={!site.revealed}
              onClick={() => {
                retroAudio.playRadarPing('L');
                setSim((prev) => ({
                  ...prev,
                  activeSiteId: site.id,
                  statusText: `${site.name}: ${clue} — click the matching button below!`,
                }));
              }}
              style={{ left: `${site.x}%`, top: `${site.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg border font-bold whitespace-nowrap shadow-lg transition cursor-pointer ${
                site.tagged
                  ? 'border-emerald-400 bg-emerald-950/95 text-emerald-200'
                  : site.revealed
                    ? isSelected
                      ? 'border-amber-300 bg-amber-400 text-slate-950 ring-2 ring-amber-200'
                      : 'border-rose-400 bg-rose-950/92 text-rose-100 hover:scale-105'
                    : 'border-emerald-700 bg-emerald-900/80 text-emerald-200 cursor-not-allowed'
              }`}
            >
              <div>
                {site.tagged
                  ? `✓ ${site.name}`
                  : site.revealed
                    ? site.name
                    : '🌿 Hidden Under Leaves (Click Deep Radar)'}
              </div>
              {site.revealed && !site.tagged && (
                <div className="text-[10px] opacity-95 font-semibold">{clue}</div>
              )}
            </button>
          );
        })}
      </div>

      {activeSite && !activeSite.tagged && sim.band === 'L_HV' && (
        <div className="px-3 py-2 rounded-lg border border-amber-300/75 bg-slate-950/24 backdrop-blur-sm flex flex-wrap items-center justify-between gap-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
          <span className="font-bold text-amber-200">
            {activeSite.name} — {FOREST_SIMPLE_CLUES[activeSite.id]?.clue}:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['illegal_cut', '🪓 Report Tree Cutting'],
                ['burn_scar', '🔥 Report Wildfire Burn'],
                ['intact_peat', '🌿 Protect Healthy Forest'],
              ] as Array<[CanopyTagType, string]>
            ).map(([tag, label]) => {
              const isMatch = activeSite.expectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const next = tagCanopySite(sim, activeSite.id, tag);
                    retroAudio.playUiClick(next.taggedCount > sim.taggedCount ? 780 : 300);
                    setSim(next);
                  }}
                  className={`px-2.5 py-1 rounded border font-semibold cursor-pointer ${
                    isMatch
                      ? 'bg-emerald-600 hover:bg-emerald-500 border-amber-300 text-white ring-2 ring-amber-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-stone-500 text-stone-100'
                  }`}
                >
                  {label} {isMatch ? '✨' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {solved && (
        <div className="px-3 py-2 rounded-lg border border-emerald-400/70 bg-emerald-950/85 text-xs text-emerald-100">
          <strong>{NASA_DISASTER_ACTIONS.forest_canopy.badge}:</strong> {NASA_DISASTER_ACTIONS.forest_canopy.tip}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 7. CHAPTER 8 — EARTHQUAKE FAULT & DAM INFRASTRUCTURE TRIAGE (HATAY)
 * ============================================================================ */
const QUAKE_SIMPLE_CLUES: Record<number, { clue: string; actionLabel: string }> = {
  1: { clue: '⚠️ Bridge Shifted 42 cm (Cracked!)', actionLabel: '🚧 Close Broken Bridge / Road' },
  2: { clue: '⚠️ Dam Wall Tilted 19 cm', actionLabel: '🛠️ Send Dam Engineers' },
  3: { clue: '✅ Solid Road (Only 1.5 cm shift)', actionLabel: '🚑 Open Safe Road for Rescue' },
  4: { clue: '⚠️ Road Split 84 cm by Quake!', actionLabel: '🚧 Close Broken Bridge / Road' },
};

export const QuakeTriagePlayable: React.FC<{
  solved: boolean;
  onSolve: () => void;
}> = ({ solved, onSolve }) => {
  const [sim, setSim] = useState<QuakeTriageState>(() => {
    const init = createInitialQuakeTriageState();
    return solved
      ? {
          ...init,
          insarOn: true,
          resolvedCount: 4,
          won: true,
          assets: init.assets.map((a) => ({ ...a, inspected: true, resolved: true })),
          statusText: 'Awesome! Ambulances know which roads are safe and engineers are checking the dam!',
        }
      : init;
  });
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (sim.won && !solved) onSolve();
  }, [sim.won, solved, onSolve]);

  const activeAsset = sim.assets.find((a) => a.id === sim.activeAssetId) ?? null;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 text-xs">
      <MissionSimpleGuide
        whatWeAreDoing="After an earthquake, ambulances need to know which bridges broke and which roads are safe! Click 'Turn ON Quake Damage Radar' to see how many centimeters the ground moved, then click all 4 boxes and pick the highlighted safety button!"
        nasaToolUsed="NASA NISAR + OPERA Quake Ground-Shift Map"
        hintText={
          !sim.insarOn
            ? 'Step 1: Click "🛰️ Turn ON Quake Damage Radar" on the left so the map shows how much each bridge or road moved!'
            : activeAsset && !activeAsset.resolved
              ? `Step 2: For "${activeAsset.name}" (${QUAKE_SIMPLE_CLUES[activeAsset.id]?.clue}): click "${QUAKE_SIMPLE_CLUES[activeAsset.id]?.actionLabel} ✨" at the bottom!`
              : 'Step 2: Click on each of the 4 bridge/dam boxes on the map and choose the button marked with ✨!'
        }
        showHint={showHint}
        onToggleHint={() => setShowHint((v) => !v)}
      />

      <div className="px-3 py-1.5 rounded-lg bg-slate-950/20 backdrop-blur-sm border border-white/25 flex flex-wrap items-center justify-between gap-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
        <button
          type="button"
          data-testid="ch8-insar-btn"
          onClick={() => {
            retroAudio.playRadarPing('L');
            setSim((s) => ({
              ...s,
              insarOn: !s.insarOn,
              statusText: !s.insarOn
                ? 'Quake Radar ON! Click each of the 4 bridges/dams on the map below!'
                : 'Click Turn ON Quake Damage Radar to see ground movement!',
            }));
          }}
          className={`px-2.5 py-1 rounded border font-bold cursor-pointer [text-shadow:none] ${
            sim.insarOn
              ? 'border-rose-300 bg-rose-500 text-white'
              : 'border-sky-400 bg-slate-950/65 text-sky-200 ring-2 ring-sky-300/85 shadow-lg'
          }`}
        >
          {sim.insarOn ? '🌈 Quake Damage Radar ON' : '🛰️ Turn ON Quake Damage Radar'}
        </button>
        <span className="text-amber-200 font-semibold">{sim.statusText}</span>
        <div className="flex items-center gap-2 [text-shadow:none]">
          <span className="tabular-nums text-emerald-300 font-bold">Checked: {sim.resolvedCount}/4</span>
          {!solved && (
            <button
              type="button"
              data-testid="ch8-quick-solve-btn"
              onClick={() => {
                setSim((prev) => ({
                  ...prev,
                  insarOn: true,
                  resolvedCount: 4,
                  won: true,
                  assets: prev.assets.map((a) => ({ ...a, inspected: true, resolved: true })),
                  statusText: 'Awesome! Ambulances know which roads are safe and engineers are checking the dam!',
                }));
                onSolve();
              }}
              className="px-2 py-1 rounded bg-slate-950/24 backdrop-blur-sm hover:bg-slate-800 border border-white/30 text-amber-200 cursor-pointer"
            >
              Auto-Check
            </button>
          )}
        </div>
      </div>

      <div className="relative flex-1 min-h-[320px] sm:min-h-[410px] rounded-xl border border-white/25 overflow-hidden bg-slate-900 shadow-2xl">
        {/* Stylized East Anatolian Fault Line & Interferogram Bands */}
        <svg viewBox="0 0 800 300" className="absolute inset-0 w-full h-full pointer-events-none">
          <rect width="800" height="300" fill={sim.insarOn ? '#17153b' : '#334155'} />
          {sim.insarOn && (
            <g opacity="0.45">
              <ellipse cx="420" cy="185" rx="220" ry="95" fill="none" stroke="#f43f5e" strokeWidth="8" />
              <ellipse cx="420" cy="185" rx="165" ry="68" fill="none" stroke="#facc15" strokeWidth="7" />
              <ellipse cx="420" cy="185" rx="105" ry="42" fill="none" stroke="#38bdf8" strokeWidth="7" />
            </g>
          )}
          <path d="M90 250 Q310 180 480 145 T720 80" stroke={sim.insarOn ? '#f43f5e' : '#94a3b8'} strokeWidth="4" strokeDasharray="10 6" fill="none" />
          <path d="M50 180 Q240 160 440 210 T760 225" stroke="#0284c7" strokeWidth="14" fill="none" opacity="0.65" />
        </svg>

        {sim.assets.map((asset) => {
          const isSelected = sim.activeAssetId === asset.id;
          const clue = QUAKE_SIMPLE_CLUES[asset.id]?.clue ?? '';
          return (
            <button
              key={asset.id}
              type="button"
              data-testid={`ch8-asset-${asset.id}`}
              onClick={() => {
                retroAudio.playRadarPing('L');
                setSim((s) => inspectInfraAsset(s, asset.id));
              }}
              style={{ left: `${asset.x}%`, top: `${asset.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg border font-bold shadow-lg transition cursor-pointer ${
                asset.resolved
                  ? 'border-emerald-400 bg-emerald-950/95 text-emerald-200'
                  : isSelected
                    ? 'border-amber-300 bg-amber-400 text-slate-950 ring-2 ring-white'
                    : 'border-stone-500 bg-slate-950/90 text-stone-100 hover:border-amber-300'
              }`}
            >
              <div>{asset.resolved ? `✓ ${asset.name}` : asset.name}</div>
              {(sim.insarOn || asset.inspected) && (
                <div className="text-[10px] opacity-95">{clue}</div>
              )}
            </button>
          );
        })}
      </div>

      {activeAsset && !activeAsset.resolved && (
        <div className="px-3 py-2 rounded-lg border border-amber-300/75 bg-slate-950/24 backdrop-blur-sm flex flex-wrap items-center justify-between gap-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
          <span className="font-bold text-amber-200">
            {activeAsset.name} — {QUAKE_SIMPLE_CLUES[activeAsset.id]?.clue}:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['close_bridge', '🚧 Close Broken Bridge / Road'],
                ['inspect_dam', '🛠️ Send Dam Engineers'],
                ['open_lifeline', '🚑 Open Safe Road for Rescue'],
              ] as Array<[QuakeActionType, string]>
            ).map(([act, label]) => {
              const isMatch = activeAsset.expectedAction === act;
              return (
                <button
                  key={act}
                  type="button"
                  onClick={() => {
                    const next = classifyInfraAsset(sim, activeAsset.id, act);
                    retroAudio.playUiClick(next.resolvedCount > sim.resolvedCount ? 780 : 300);
                    setSim(next);
                  }}
                  className={`px-2.5 py-1 rounded border font-semibold cursor-pointer ${
                    isMatch
                      ? 'bg-emerald-600 hover:bg-emerald-500 border-amber-300 text-white ring-2 ring-amber-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-stone-500 text-stone-100'
                  }`}
                >
                  {label} {isMatch ? '✨' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {solved && (
        <div className="px-3 py-2 rounded-lg border border-emerald-400/70 bg-emerald-950/85 text-xs text-emerald-100">
          <strong>{NASA_DISASTER_ACTIONS.quake_dam.badge}:</strong> {NASA_DISASTER_ACTIONS.quake_dam.tip}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 8. CHAPTER 9 — OCEAN OIL SLICKS, PERMAFROST THAW & ARCTIC GLACIERS (ALASKA)
 * ============================================================================ */
const ARCTIC_SIMPLE_CLUES: Record<number, { clue: string; actionLabel: string }> = {
  1: { clue: '🛢️ Dark Smooth Oil Spill on Water', actionLabel: '🛢️ Clean Up Oil Spill' },
  2: { clue: '🏘️ Melting Coast Near Village Dock', actionLabel: '🏘️ Strengthen Village Dock' },
  3: { clue: '🧊 Fast-Moving Glacier Ice Wall', actionLabel: '🧊 Watch Falling Icebergs' },
  4: { clue: '🛢️ Oil Spill in Ship Lane', actionLabel: '🛢️ Clean Up Oil Spill' },
};

export const OceanIcePlayable: React.FC<{
  solved: boolean;
  onSolve: () => void;
}> = ({ solved, onSolve }) => {
  const [sim, setSim] = useState<OceanIceState>(() => {
    const init = createInitialOceanIceState();
    return solved
      ? {
          ...init,
          multiSensorOn: true,
          resolvedCount: 4,
          won: true,
          targets: init.targets.map((t) => ({ ...t, scanned: true, resolved: true })),
          statusText: 'Great job! Ocean spills cleaned and Arctic docks & glaciers are safe!',
        }
      : init;
  });
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (sim.won && !solved) onSolve();
  }, [sim.won, solved, onSolve]);

  const activeTarget = sim.targets.find((t) => t.id === sim.activeTargetId) ?? null;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 text-xs">
      <MissionSimpleGuide
        whatWeAreDoing="In the dark Arctic winter, space radar still sees clearly! Oil spills flatten ocean waves (looking dark on radar), while glaciers and melting coasts move fast. Click 'Turn ON Arctic Radar', click all 4 boxes, and pick the highlighted response!"
        nasaToolUsed="Canada RADARSAT + NASA NISAR Arctic Radar"
        hintText={
          !sim.multiSensorOn
            ? 'Step 1: Click "🌑 Dark Winter (Turn ON Arctic Radar)" on the left to see the ocean and ice!'
            : activeTarget && !activeTarget.resolved
              ? `Step 2: For "${activeTarget.name}" (${ARCTIC_SIMPLE_CLUES[activeTarget.id]?.clue}): click "${ARCTIC_SIMPLE_CLUES[activeTarget.id]?.actionLabel} ✨" below!`
              : 'Step 2: Click on each of the 4 boxes on the Arctic map and pick the button marked with ✨!'
        }
        showHint={showHint}
        onToggleHint={() => setShowHint((v) => !v)}
      />

      <div className="px-3 py-1.5 rounded-lg bg-slate-950/20 backdrop-blur-sm border border-white/25 flex flex-wrap items-center justify-between gap-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
        <button
          type="button"
          data-testid="ch9-arctic-btn"
          onClick={() => {
            retroAudio.playRadarPing('L');
            setSim((s) => ({
              ...s,
              multiSensorOn: !s.multiSensorOn,
              statusText: !s.multiSensorOn
                ? 'Arctic Radar ON! Click all 4 boxes below!'
                : 'Click Turn ON Arctic Radar to see oil spills and moving ice!',
            }));
          }}
          className={`px-2.5 py-1 rounded border font-bold cursor-pointer [text-shadow:none] ${
            sim.multiSensorOn
              ? 'border-sky-300 bg-sky-400 text-slate-950'
              : 'border-sky-400 bg-slate-950/65 text-sky-200 ring-2 ring-sky-300/85 shadow-lg'
          }`}
        >
          {sim.multiSensorOn ? '🛰️ Arctic Radar ON' : '🌑 Dark Winter (Turn ON Arctic Radar)'}
        </button>
        <span className="text-amber-200 font-semibold">{sim.statusText}</span>
        <div className="flex items-center gap-2 [text-shadow:none]">
          <span className="tabular-nums text-emerald-300 font-bold">Secured: {sim.resolvedCount}/4</span>
          {!solved && (
            <button
              type="button"
              data-testid="ch9-quick-solve-btn"
              onClick={() => {
                setSim((prev) => ({
                  ...prev,
                  multiSensorOn: true,
                  resolvedCount: 4,
                  won: true,
                  targets: prev.targets.map((t) => ({ ...t, scanned: true, resolved: true })),
                  statusText: 'All 4 ocean oil slick & Arctic cryosphere missions secured!',
                }));
                onSolve();
              }}
              className="px-2 py-1 rounded bg-slate-950/24 backdrop-blur-sm hover:bg-slate-800 border border-white/30 text-amber-200 cursor-pointer"
            >
              Auto-Secure
            </button>
          )}
        </div>
      </div>

      <div className="relative flex-1 min-h-[320px] sm:min-h-[410px] rounded-xl border border-white/25 overflow-hidden bg-slate-950 shadow-2xl">
        <svg viewBox="0 0 800 300" className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Deep Arctic Ocean + Tundra Bluff + Glacier */}
          <rect width="800" height="300" fill={sim.multiSensorOn ? '#0c2742' : '#0f172a'} />
          <path d="M390 300 Q450 180 560 155 T800 95 L800 300 Z" fill="#475569" />
          <path d="M510 0 Q575 75 645 95 T800 120 L800 0 Z" fill="#e2e8f0" opacity="0.88" />
          {sim.multiSensorOn && (
            <>
              <ellipse cx="195" cy="195" rx="76" ry="30" fill="#020617" stroke="#38bdf8" strokeWidth="2" />
              <ellipse cx="368" cy="126" rx="64" ry="22" fill="#020617" stroke="#38bdf8" strokeWidth="2" />
            </>
          )}
        </svg>

        {sim.targets.map((target) => {
          const isSelected = sim.activeTargetId === target.id;
          const clue = ARCTIC_SIMPLE_CLUES[target.id]?.clue ?? '';
          return (
            <button
              key={target.id}
              type="button"
              data-testid={`ch9-target-${target.id}`}
              onClick={() => {
                retroAudio.playRadarPing('L');
                setSim((s) => scanArcticTarget(s, target.id));
              }}
              style={{ left: `${target.x}%`, top: `${target.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg border font-bold shadow-lg transition cursor-pointer ${
                target.resolved
                  ? 'border-emerald-400 bg-emerald-950/95 text-emerald-200'
                  : isSelected
                    ? 'border-amber-300 bg-amber-400 text-slate-950 ring-2 ring-white'
                    : 'border-sky-400/70 bg-slate-950/90 text-sky-100 hover:border-amber-300'
              }`}
            >
              <div>{target.resolved ? `✓ ${target.name}` : target.name}</div>
              {(sim.multiSensorOn || target.scanned) && (
                <div className="text-[10px] opacity-95">{clue}</div>
              )}
            </button>
          );
        })}
      </div>

      {activeTarget && !activeTarget.resolved && (
        <div className="px-3 py-2 rounded-lg border border-amber-300/75 bg-slate-950/24 backdrop-blur-sm flex flex-wrap items-center justify-between gap-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
          <span className="font-bold text-amber-200">
            {activeTarget.name} — {ARCTIC_SIMPLE_CLUES[activeTarget.id]?.clue}:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['skim_oil', '🛢️ Deploy Oil Skimmer Boom'],
                ['relocate_dock', '🏘️ Reinforce Bluff Dock'],
                ['monitor_calving', '🧊 Track Glacier Calving'],
              ] as Array<[ArcticActionType, string]>
            ).map(([act, label]) => {
              const isMatch = activeTarget.expectedAction === act;
              return (
                <button
                  key={act}
                  type="button"
                  onClick={() => {
                    const next = classifyArcticTarget(sim, activeTarget.id, act);
                    retroAudio.playUiClick(next.resolvedCount > sim.resolvedCount ? 780 : 300);
                    setSim(next);
                  }}
                  className={`px-2.5 py-1 rounded border font-semibold cursor-pointer ${
                    isMatch
                      ? 'bg-emerald-600 hover:bg-emerald-500 border-amber-300 text-white ring-2 ring-amber-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-stone-500 text-stone-100'
                  }`}
                >
                  {label} {isMatch ? '✨' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {solved && (
        <div className="px-3 py-2 rounded-lg border border-emerald-400/70 bg-emerald-950/85 text-xs text-emerald-100">
          <strong>{NASA_DISASTER_ACTIONS.ocean_ice.badge}:</strong> {NASA_DISASTER_ACTIONS.ocean_ice.tip}
        </div>
      )}
    </div>
  );
};


