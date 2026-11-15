// Pure SAR radar physics, state rules, and actionable insights for NISAR "Dancing with the SARs" missions

export interface Vec2 {
  x: number;
  y: number;
}

export type DielectricActionType = 'evacuate' | 'drain' | 'shelter';

export interface DielectricZoneTarget {
  id: number;
  name: string;
  x: number; // normalized 0..100
  y: number; // normalized 0..100
  dbLabel: string;
  moisturePct: number;
  kind: 'water' | 'soaked' | 'dry';
  expectedAction: DielectricActionType;
  scanned: boolean;
  classified: boolean;
}

export interface DielectricFloodMapperState {
  player: Vec2;
  target: Vec2 | null;
  sarViewOn: boolean;
  activeZoneId: number | null;
  zones: DielectricZoneTarget[];
  scannedCount: number;
  classifiedCount: number;
  won: boolean;
  statusText: string;
}

export interface EvacCitizen {
  id: number;
  label: string;
  x: number;
  y: number;
  evacuated: boolean;
}

export interface RollingBoulder {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface EvacuationRunState {
  player: Vec2;
  target: Vec2 | null;
  citizens: EvacCitizen[];
  boulders: RollingBoulder[];
  radarXray: boolean;
  timeRemainingSec: number;
  evacuatedCount: number;
  stunTimerSec: number;
  won: boolean;
}

export interface AvalancheTarget {
  id: number;
  label: string;
  tag: string;
  x: number;
  y: number;
  scanned: boolean;
  locked: boolean;
}

export interface AvalancheSweepState {
  beam: Vec2;
  targets: AvalancheTarget[];
  lockedCount: number;
  won: boolean;
}

export const NASA_DISASTER_ACTIONS: Record<string, { badge: string; tip: string }> = {
  dielectric_flood: {
    badge: 'NISAR Flood & Wet Ground Radar',
    tip: 'Smooth floodwater shows up dark on space radar because waves bounce away like a mirror, while soaked muddy ground lights up bright—helping villages clear drains and move safely before storm clouds clear.',
  },
  creep_hydro: {
    badge: 'NISAR Deep Tree-Seeing Radar + Sentinel-1',
    tip: 'Long radar waves pass right through forest leaves to spot hills slipping a few centimeters, giving dam workers time to inspect cracks and shut water gates early.',
  },
  dam_breach: {
    badge: 'NASA & Partner River-Block Radar',
    tip: 'When falling rocks block a river, smooth trapped water looks dark next to bright rough boulders—warning neighbors to climb to high ground right away.',
  },
  avalanche_sar: {
    badge: 'NISAR Cloud-Seeing Radar + ICESat-2',
    tip: 'Space radar sees straight through dark storm clouds day or night to find broken bridges and show rescue teams safe mountain paths.',
  },
  honest_screening: {
    badge: 'Silwal & Dahal (Zenodo 22730419)',
    tip: 'Space radar is a great early checkup tool when paired with village rain gauges and practice drills—no satellite alone can guess the exact hour a hill will fall.',
  },
  agri_subsidence: {
    badge: 'NISAR Farm Radar + GRACE-FO + SAOCOM',
    tip: 'Long radar waves check how wet crop soil is beneath leaves and spot farmland slowly sinking from heavy well pumping before water canals crack.',
  },
  forest_canopy: {
    badge: 'NISAR Tree-Seeing Radar + NASA GEDI',
    tip: 'Short radar bounces off top leaves, but deep radar passes through the canopy to catch hidden tree-cutting and wildfire burn scars underneath.',
  },
  quake_dam: {
    badge: 'NISAR & NASA OPERA Quake Damage Map',
    tip: 'After an earthquake, before-and-after radar maps show which bridges and dams shifted by centimeters so ambulances only drive on safe roads.',
  },
  ocean_ice: {
    badge: 'Canada RADARSAT + NISAR + ICESat-2',
    tip: 'Oil spills flatten ocean waves so they look dark on radar against choppy sea water, while space radar also tracks melting coasts and moving glacier ice all winter.',
  },
};

export function moveTowardPoint(pos: Vec2, target: Vec2, speedPerSec: number, dt: number): Vec2 {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.8 || dist === 0) {
    return { x: target.x, y: target.y };
  }
  const step = Math.min(dist, speedPerSec * dt);
  return {
    x: Math.max(6, Math.min(94, pos.x + (dx / dist) * step)),
    y: Math.max(12, Math.min(88, pos.y + (dy / dist) * step)),
  };
}

export function createInitialDielectricMapperState(): DielectricFloodMapperState {
  return {
    player: { x: 48, y: 42 },
    target: null,
    sarViewOn: false,
    activeZoneId: null,
    zones: [
      {
        id: 1,
        name: 'Lower Riverbank',
        x: 20,
        y: 72,
        dbLabel: 'Deep Floodwater (100% Wet)',
        moisturePct: 100,
        kind: 'water',
        expectedAction: 'evacuate',
        scanned: false,
        classified: false,
      },
      {
        id: 2,
        name: 'Blocked Canal',
        x: 50,
        y: 66,
        dbLabel: 'Very Muddy Canal (86% Wet)',
        moisturePct: 86,
        kind: 'soaked',
        expectedAction: 'drain',
        scanned: false,
        classified: false,
      },
      {
        id: 3,
        name: 'Wet Gorge Trail',
        x: 79,
        y: 64,
        dbLabel: 'Soaked Slippery Slope (81% Wet)',
        moisturePct: 81,
        kind: 'soaked',
        expectedAction: 'evacuate',
        scanned: false,
        classified: false,
      },
      {
        id: 4,
        name: 'Stone Ridge',
        x: 26,
        y: 36,
        dbLabel: 'Dry Solid Rock (38% Wet)',
        moisturePct: 38,
        kind: 'dry',
        expectedAction: 'shelter',
        scanned: false,
        classified: false,
      },
    ],
    scannedCount: 0,
    classifiedCount: 0,
    won: false,
    statusText: 'Step 1: Click "Turn ON Radar", then click all 4 circles on the map!',
  };
}

export function stepDielectricMapperState(
  state: DielectricFloodMapperState,
  inputVec: Vec2,
  rawDt: number
): DielectricFloodMapperState {
  if (state.won) return state;
  const dt = Math.min(0.05, Math.max(0, rawDt));
  const speed = 42;

  let nextPlayer = { ...state.player };
  let nextTarget = state.target;

  if (Math.abs(inputVec.x) > 0.05 || Math.abs(inputVec.y) > 0.05) {
    const len = Math.hypot(inputVec.x, inputVec.y) || 1;
    nextPlayer = {
      x: Math.max(6, Math.min(94, nextPlayer.x + (inputVec.x / len) * speed * dt)),
      y: Math.max(12, Math.min(88, nextPlayer.y + (inputVec.y / len) * speed * dt)),
    };
    nextTarget = null;
  } else if (nextTarget) {
    nextPlayer = moveTowardPoint(nextPlayer, nextTarget, speed, dt);
    if (Math.hypot(nextPlayer.x - nextTarget.x, nextPlayer.y - nextTarget.y) < 1.2) {
      nextTarget = null;
    }
  }

  let activeZoneId = state.activeZoneId;
  let statusText = state.statusText;
  let scannedCount = 0;
  let classifiedCount = 0;

  const zones = state.zones.map((z) => {
    const dist = Math.hypot(nextPlayer.x - z.x, nextPlayer.y - z.y);
    let scanned = z.scanned;
    if (!scanned && dist < 11) {
      scanned = true;
      activeZoneId = z.id;
      statusText = `Scanned ${z.name} (${z.dbLabel}) — pick its safety action!`;
    } else if (scanned && !z.classified && dist < 11) {
      activeZoneId = z.id;
    }
    if (scanned) scannedCount++;
    if (z.classified) classifiedCount++;
    return scanned === z.scanned ? z : { ...z, scanned };
  });

  if (activeZoneId !== null) {
    const active = zones.find((z) => z.id === activeZoneId);
    if (active?.classified) {
      const nextPending = zones.find((z) => z.scanned && !z.classified);
      activeZoneId = nextPending ? nextPending.id : null;
    }
  }

  return {
    ...state,
    player: nextPlayer,
    target: nextTarget,
    activeZoneId,
    zones,
    scannedCount,
    classifiedCount,
    statusText,
  };
}

export function classifyDielectricZone(
  state: DielectricFloodMapperState,
  zoneId: number,
  action: DielectricActionType
): DielectricFloodMapperState {
  if (state.won) return state;
  const targetZone = state.zones.find((z) => z.id === zoneId);
  if (!targetZone || !targetZone.scanned || targetZone.classified) return state;

  if (targetZone.expectedAction !== action) {
    const hint =
      targetZone.kind === 'water'
        ? 'That spot is deep floodwater—click "Evacuate Zone" to move people away!'
        : targetZone.expectedAction === 'drain'
          ? 'The canal is backed up with muddy water (86% wet)—click "Clear Canal"!'
          : targetZone.kind === 'dry'
            ? 'Dry solid rock is safe—click "Safe Shelter"!'
            : 'Soaked hillside soil (>80% wet) can slide—click "Evacuate Zone"!';
    return { ...state, statusText: hint };
  }

  let classifiedCount = 0;
  const zones = state.zones.map((z) => {
    const updated = z.id === zoneId ? { ...z, classified: true } : z;
    if (updated.classified) classifiedCount++;
    return updated;
  });

  const nextPending = zones.find((z) => z.scanned && !z.classified);
  const won = classifiedCount >= zones.length;
  return {
    ...state,
    zones,
    classifiedCount,
    activeZoneId: nextPending ? nextPending.id : null,
    won,
    statusText: won
      ? 'Great job! All 4 village spots are checked and safe!'
      : `${targetZone.name} saved! Now click the next circle.`,
  };
}

export function createInitialEvacuationRunState(): EvacuationRunState {
  return {
    player: { x: 18, y: 78 },
    target: null,
    citizens: [
      { id: 1, label: 'Customs', x: 26, y: 66, evacuated: false },
      { id: 2, label: 'Trucks', x: 52, y: 76, evacuated: false },
      { id: 3, label: 'Market', x: 74, y: 62, evacuated: false },
      { id: 4, label: 'Bridge', x: 84, y: 42, evacuated: false },
    ],
    boulders: [
      { id: 1, x: 40, y: 20, vx: 6, vy: 22, radius: 5.2 },
      { id: 2, x: 66, y: 36, vx: -5, vy: 24, radius: 5.5 },
    ],
    radarXray: false,
    timeRemainingSec: 45,
    evacuatedCount: 0,
    stunTimerSec: 0,
    won: false,
  };
}

export function stepEvacuationRunState(
  state: EvacuationRunState,
  inputVec: Vec2,
  rawDt: number
): EvacuationRunState {
  if (state.won) return state;
  const dt = Math.min(0.05, Math.max(0, rawDt));
  const stunTimerSec = Math.max(0, state.stunTimerSec - dt);
  const speed = stunTimerSec > 0 ? 16 : 42;

  let nextPlayer = { ...state.player };
  let nextTarget = state.target;

  if (Math.abs(inputVec.x) > 0.05 || Math.abs(inputVec.y) > 0.05) {
    const len = Math.hypot(inputVec.x, inputVec.y) || 1;
    nextPlayer = {
      x: Math.max(6, Math.min(94, nextPlayer.x + (inputVec.x / len) * speed * dt)),
      y: Math.max(12, Math.min(90, nextPlayer.y + (inputVec.y / len) * speed * dt)),
    };
    nextTarget = null;
  } else if (nextTarget) {
    nextPlayer = moveTowardPoint(nextPlayer, nextTarget, speed, dt);
    if (Math.hypot(nextPlayer.x - nextTarget.x, nextPlayer.y - nextTarget.y) < 1.2) {
      nextTarget = null;
    }
  }

  let newStun = stunTimerSec;
  const boulders = state.boulders.map((b) => {
    let nx = b.x + b.vx * dt;
    let ny = b.y + b.vy * dt;
    let vx = b.vx;
    if (nx < 12 || nx > 90) vx = -vx;
    if (ny > 96) {
      ny = 12;
      nx = 18 + ((b.id * 37) % 68);
    }
    if (newStun <= 0 && Math.hypot(nextPlayer.x - nx, nextPlayer.y - ny) < b.radius + 3.2) {
      newStun = 0.65;
    }
    return { ...b, x: nx, y: ny, vx };
  });

  let evacuatedCount = state.evacuatedCount;
  const citizens = state.citizens.map((c) => {
    if (c.evacuated) return c;
    if (Math.hypot(nextPlayer.x - c.x, nextPlayer.y - c.y) < 10.5) {
      evacuatedCount++;
      return { ...c, evacuated: true };
    }
    return c;
  });

  const timeRemainingSec = Math.max(0.1, state.timeRemainingSec - dt);
  const won = evacuatedCount >= citizens.length;

  return {
    ...state,
    player: nextPlayer,
    target: nextTarget,
    citizens,
    boulders,
    timeRemainingSec,
    evacuatedCount,
    stunTimerSec: newStun,
    won,
  };
}

export function createInitialAvalancheSweepState(): AvalancheSweepState {
  return {
    beam: { x: 24, y: 52 },
    targets: [
      { id: 1, label: 'Broken Bridge', tag: 'Shifted >5 m', x: 26, y: 68, scanned: false, locked: false },
      { id: 2, label: 'Rock-Ice Slide', tag: '2 km Ice Fall', x: 52, y: 34, scanned: false, locked: false },
      { id: 3, label: 'Blocked Pond', tag: 'Trapped Water', x: 74, y: 60, scanned: false, locked: false },
      { id: 4, label: 'Safe Ridge Path', tag: 'Rescue Route', x: 82, y: 28, scanned: false, locked: false },
    ],
    lockedCount: 0,
    won: false,
  };
}

export function stepAvalancheSweepBeam(
  state: AvalancheSweepState,
  nextBeam: Vec2,
  lockNearest = false
): AvalancheSweepState {
  if (state.won) return state;
  const clampedBeam = {
    x: Math.max(8, Math.min(92, nextBeam.x)),
    y: Math.max(12, Math.min(88, nextBeam.y)),
  };

  let lockedCount = 0;
  const targets = state.targets.map((t) => {
    const dist = Math.hypot(clampedBeam.x - t.x, clampedBeam.y - t.y);
    const scanned = t.scanned || dist < 17;
    const locked = t.locked || (lockNearest && scanned && dist < 17);
    if (locked) lockedCount++;
    return { ...t, scanned, locked };
  });

  return {
    beam: clampedBeam,
    targets,
    lockedCount,
    won: lockedCount >= targets.length,
  };
}

/* ============================================================================
 * CHAPTER 6 — PRECISION FARMING & AQUIFER SUBSIDENCE (CALIFORNIA SAN JOAQUIN)
 * ============================================================================ */
export type AgriActionType = 'drip_save' | 'recharge_basin' | 'reinforce_canal';

export interface AgriBlockTarget {
  id: number;
  name: string;
  x: number;
  y: number;
  moisturePct: number;
  subsidenceCmYr: number;
  expectedAction: AgriActionType;
  scanned: boolean;
  resolved: boolean;
}

export interface AgriSubsidenceState {
  player: Vec2;
  target: Vec2 | null;
  layerMode: 'moisture' | 'subsidence';
  activeBlockId: number | null;
  blocks: AgriBlockTarget[];
  resolvedCount: number;
  won: boolean;
  statusText: string;
}

export function createInitialAgriSubsidenceState(): AgriSubsidenceState {
  return {
    player: { x: 20, y: 50 },
    target: null,
    layerMode: 'moisture',
    activeBlockId: null,
    blocks: [
      {
        id: 1,
        name: 'Almond Orchards',
        x: 24,
        y: 34,
        moisturePct: 24,
        subsidenceCmYr: 2,
        expectedAction: 'drip_save',
        scanned: false,
        resolved: false,
      },
      {
        id: 2,
        name: 'Corcoran Bowl Well',
        x: 52,
        y: 70,
        moisturePct: 19,
        subsidenceCmYr: 28,
        expectedAction: 'recharge_basin',
        scanned: false,
        resolved: false,
      },
      {
        id: 3,
        name: 'Friant Canal Bank',
        x: 78,
        y: 38,
        moisturePct: 48,
        subsidenceCmYr: 18,
        expectedAction: 'reinforce_canal',
        scanned: false,
        resolved: false,
      },
      {
        id: 4,
        name: 'Family Vegetable Plot',
        x: 74,
        y: 74,
        moisturePct: 29,
        subsidenceCmYr: 4,
        expectedAction: 'drip_save',
        scanned: false,
        resolved: false,
      },
    ],
    resolvedCount: 0,
    won: false,
    statusText: 'Click each of the 4 farm circles to check dry soil or sinking ground!',
  };
}

export function stepAgriSubsidenceState(
  state: AgriSubsidenceState,
  inputVec: Vec2,
  rawDt: number
): AgriSubsidenceState {
  if (state.won) return state;
  const dt = Math.min(0.05, Math.max(0, rawDt));
  const speed = 42;
  let nextPlayer = { ...state.player };
  let nextTarget = state.target;

  if (Math.abs(inputVec.x) > 0.05 || Math.abs(inputVec.y) > 0.05) {
    const len = Math.hypot(inputVec.x, inputVec.y) || 1;
    nextPlayer = {
      x: Math.max(6, Math.min(94, nextPlayer.x + (inputVec.x / len) * speed * dt)),
      y: Math.max(12, Math.min(88, nextPlayer.y + (inputVec.y / len) * speed * dt)),
    };
    nextTarget = null;
  } else if (nextTarget) {
    nextPlayer = moveTowardPoint(nextPlayer, nextTarget, speed, dt);
    if (Math.hypot(nextPlayer.x - nextTarget.x, nextPlayer.y - nextTarget.y) < 1.2) {
      nextTarget = null;
    }
  }

  let activeBlockId = state.activeBlockId;
  let statusText = state.statusText;
  const blocks = state.blocks.map((b) => {
    const dist = Math.hypot(nextPlayer.x - b.x, nextPlayer.y - b.y);
    if (!b.scanned && dist < 12) {
      activeBlockId = b.id;
      statusText = `Checked ${b.name}: ${b.moisturePct}% wet soil · Sinking ${b.subsidenceCmYr} cm/yr`;
      return { ...b, scanned: true };
    }
    if (b.scanned && !b.resolved && dist < 12) {
      activeBlockId = b.id;
    }
    return b;
  });

  if (activeBlockId !== null) {
    const cur = blocks.find((b) => b.id === activeBlockId);
    if (cur?.resolved) {
      activeBlockId = blocks.find((b) => b.scanned && !b.resolved)?.id ?? null;
    }
  }

  return {
    ...state,
    player: nextPlayer,
    target: nextTarget,
    activeBlockId,
    blocks,
    statusText,
  };
}

export function assignAgriBlockAction(
  state: AgriSubsidenceState,
  blockId: number,
  action: AgriActionType
): AgriSubsidenceState {
  if (state.won) return state;
  const target = state.blocks.find((b) => b.id === blockId);
  if (!target || !target.scanned || target.resolved) return state;

  if (target.expectedAction !== action) {
    const hint =
      target.subsidenceCmYr >= 24
        ? `${target.name} is sinking fast (${target.subsidenceCmYr} cm/yr)—click "Refill Underground Water"!`
        : target.subsidenceCmYr >= 15
          ? `${target.name} canal wall is cracking—click "Strengthen Canal Wall"!`
          : `Dry crops (${target.moisturePct}% wet) on steady ground—click "Save Water with Drip"!`;
    return { ...state, statusText: hint };
  }

  let resolvedCount = 0;
  const blocks = state.blocks.map((b) => {
    const updated = b.id === blockId ? { ...b, resolved: true } : b;
    if (updated.resolved) resolvedCount++;
    return updated;
  });

  const won = resolvedCount >= blocks.length;
  const nextPending = blocks.find((b) => b.scanned && !b.resolved);
  return {
    ...state,
    blocks,
    resolvedCount,
    activeBlockId: nextPending ? nextPending.id : null,
    won,
    statusText: won
      ? 'Great job! All 4 farm fields and wells are saved!'
      : `${target.name} fixed! Now click the next farm circle.`,
  };
}

/* ============================================================================
 * CHAPTER 7 — FOREST CANOPY, WILDFIRES & HIDDEN LOGGING (PANTANAL / AMAZON)
 * ============================================================================ */
export type CanopyTagType = 'illegal_cut' | 'burn_scar' | 'intact_peat';

export interface CanopySite {
  id: number;
  name: string;
  x: number;
  y: number;
  hvDb: number;
  expectedTag: CanopyTagType;
  revealed: boolean;
  tagged: boolean;
}

export interface ForestCanopyState {
  band: 'C' | 'L_HV';
  sites: CanopySite[];
  activeSiteId: number | null;
  taggedCount: number;
  won: boolean;
  statusText: string;
}

export function createInitialForestCanopyState(): ForestCanopyState {
  return {
    band: 'C',
    sites: [
      { id: 1, name: 'West Canopy Clearcut', x: 22, y: 26, hvDb: -16.2, expectedTag: 'illegal_cut', revealed: false, tagged: false },
      { id: 2, name: 'North Charcoal Belt', x: 72, y: 24, hvDb: -18.5, expectedTag: 'burn_scar', revealed: false, tagged: false },
      { id: 3, name: 'Corixo Peat Stand', x: 74, y: 74, hvDb: -9.8, expectedTag: 'intact_peat', revealed: false, tagged: false },
      { id: 4, name: 'South Smoke Clearing', x: 26, y: 74, hvDb: -15.4, expectedTag: 'illegal_cut', revealed: false, tagged: false },
    ],
    activeSiteId: null,
    taggedCount: 0,
    won: false,
    statusText: 'Step 1: Click the green "See Under Trees" radar button!',
  };
}

export function switchForestBand(
  state: ForestCanopyState,
  band: 'C' | 'L_HV'
): ForestCanopyState {
  if (band === 'C') {
    return {
      ...state,
      band: 'C',
      statusText: 'Short radar bounces off top leaves—it cannot see hidden fires or cut trees below!',
    };
  }
  const sites = state.sites.map((s) => ({ ...s, revealed: true }));
  const firstPending = sites.find((s) => !s.tagged);
  return {
    ...state,
    band: 'L_HV',
    sites,
    activeSiteId: state.activeSiteId ?? firstPending?.id ?? null,
    statusText: 'Deep radar is ON! Click each box on the map and pick the matching action!',
  };
}

export function tagCanopySite(
  state: ForestCanopyState,
  siteId: number,
  tag: CanopyTagType
): ForestCanopyState {
  if (state.won || state.band !== 'L_HV') return state;
  const site = state.sites.find((s) => s.id === siteId);
  if (!site || !site.revealed || site.tagged) return state;

  if (site.expectedTag !== tag) {
    const hint =
      site.expectedTag === 'intact_peat'
        ? 'Thick healthy trees & trunks are standing here—click "Protect Healthy Forest"!'
        : site.expectedTag === 'burn_scar'
          ? 'Ash and burned ground under smoke—click "Report Wildfire Burn"!'
          : 'Missing trees cleared under the canopy—click "Report Tree Cutting"!';
    return { ...state, statusText: hint };
  }

  let taggedCount = 0;
  const sites = state.sites.map((s) => {
    const u = s.id === siteId ? { ...s, tagged: true } : s;
    if (u.tagged) taggedCount++;
    return u;
  });
  const won = taggedCount >= sites.length;
  const nextPending = sites.find((s) => !s.tagged);
  return {
    ...state,
    sites,
    taggedCount,
    activeSiteId: nextPending ? nextPending.id : null,
    won,
    statusText: won
      ? 'Great job! All 4 hidden forest spots checked!'
      : `${site.name} reported! Click the next forest box.`,
  };
}

/* ============================================================================
 * CHAPTER 8 — EARTHQUAKE FAULT & INFRASTRUCTURE TRIAGE (HATAY, TÜRKIYE)
 * ============================================================================ */
export type QuakeActionType = 'close_bridge' | 'inspect_dam' | 'open_lifeline';

export interface InfraAsset {
  id: number;
  name: string;
  x: number;
  y: number;
  fringeShiftCm: number;
  coherenceGamma: number;
  expectedAction: QuakeActionType;
  inspected: boolean;
  resolved: boolean;
}

export interface QuakeTriageState {
  insarOn: boolean;
  assets: InfraAsset[];
  activeAssetId: number | null;
  resolvedCount: number;
  won: boolean;
  statusText: string;
}

export function createInitialQuakeTriageState(): QuakeTriageState {
  return {
    insarOn: false,
    assets: [
      { id: 1, name: 'Orontes River Bridge', x: 26, y: 62, fringeShiftCm: 42, coherenceGamma: 0.28, expectedAction: 'close_bridge', inspected: false, resolved: false },
      { id: 2, name: 'Yarseli Dam Crest', x: 52, y: 30, fringeShiftCm: 19, coherenceGamma: 0.44, expectedAction: 'inspect_dam', inspected: false, resolved: false },
      { id: 3, name: 'East Bypass Highway', x: 80, y: 26, fringeShiftCm: 1.5, coherenceGamma: 0.89, expectedAction: 'open_lifeline', inspected: false, resolved: false },
      { id: 4, name: 'Olive Grove Fault Line', x: 64, y: 74, fringeShiftCm: 84, coherenceGamma: 0.21, expectedAction: 'close_bridge', inspected: false, resolved: false },
    ],
    activeAssetId: null,
    resolvedCount: 0,
    won: false,
    statusText: 'Step 1: Click "Turn ON Quake Damage Radar", then click all 4 structures!',
  };
}

export function inspectInfraAsset(
  state: QuakeTriageState,
  assetId: number
): QuakeTriageState {
  const assets = state.assets.map((a) => (a.id === assetId ? { ...a, inspected: true } : a));
  const picked = assets.find((a) => a.id === assetId);
  return {
    ...state,
    insarOn: true,
    assets,
    activeAssetId: assetId,
    statusText: picked
      ? `${picked.name}: Ground shifted ${picked.fringeShiftCm} cm — pick the matching safety step below!`
      : state.statusText,
  };
}

export function classifyInfraAsset(
  state: QuakeTriageState,
  assetId: number,
  action: QuakeActionType
): QuakeTriageState {
  if (state.won) return state;
  const asset = state.assets.find((a) => a.id === assetId);
  if (!asset || asset.resolved) return state;

  if (asset.expectedAction !== action) {
    const hint =
      asset.coherenceGamma >= 0.8
        ? 'The ground barely moved (only 1.5 cm)—click "Open Safe Road for Rescue"!'
        : asset.name.includes('Dam')
          ? 'The dam wall shifted 19 cm—click "Send Dam Engineers" to check it!'
          : 'Huge ground shift & cracked ground—click "Close Broken Bridge / Road"!';
    return { ...state, statusText: hint };
  }

  let resolvedCount = 0;
  const assets = state.assets.map((a) => {
    const u = a.id === assetId ? { ...a, inspected: true, resolved: true } : a;
    if (u.resolved) resolvedCount++;
    return u;
  });
  const won = resolvedCount >= assets.length;
  const nextPending = assets.find((a) => !a.resolved);
  return {
    ...state,
    insarOn: true,
    assets,
    resolvedCount,
    activeAssetId: nextPending ? nextPending.id : null,
    won,
    statusText: won
      ? 'Awesome! Ambulances know which roads are safe and engineers are checking the dam!'
      : `${asset.name} checked! Click the next structure.`,
  };
}

/* ============================================================================
 * CHAPTER 9 — OCEAN OIL SLICKS, PERMAFROST THAW & ARCTIC GLACIERS (ALASKA)
 * ============================================================================ */
export type ArcticActionType = 'skim_oil' | 'relocate_dock' | 'monitor_calving';

export interface ArcticTarget {
  id: number;
  name: string;
  x: number;
  y: number;
  sigmaDb: number;
  sensorNote: string;
  expectedAction: ArcticActionType;
  scanned: boolean;
  resolved: boolean;
}

export interface OceanIceState {
  multiSensorOn: boolean;
  targets: ArcticTarget[];
  activeTargetId: number | null;
  resolvedCount: number;
  won: boolean;
  statusText: string;
}

export function createInitialOceanIceState(): OceanIceState {
  return {
    multiSensorOn: false,
    targets: [
      { id: 1, name: 'Dark Harbor Oil Spill', x: 24, y: 66, sigmaDb: -22.8, sensorNote: 'Smooth Oil Mirror', expectedAction: 'skim_oil', scanned: false, resolved: false },
      { id: 2, name: 'Melting Village Coast', x: 64, y: 74, sigmaDb: -7.4, sensorNote: 'Soft Thawing Mud', expectedAction: 'relocate_dock', scanned: false, resolved: false },
      { id: 3, name: 'Hubbard Moving Glacier', x: 76, y: 28, sigmaDb: -4.2, sensorNote: 'Sliding Ice Wall', expectedAction: 'monitor_calving', scanned: false, resolved: false },
      { id: 4, name: 'Ship Lane Oil Slick', x: 46, y: 42, sigmaDb: -21.9, sensorNote: 'Flattened Sea Waves', expectedAction: 'skim_oil', scanned: false, resolved: false },
    ],
    activeTargetId: null,
    resolvedCount: 0,
    won: false,
    statusText: 'Step 1: Click "Turn ON Arctic Radar", then click all 4 boxes!',
  };
}

export function scanArcticTarget(
  state: OceanIceState,
  targetId: number
): OceanIceState {
  const targets = state.targets.map((t) => (t.id === targetId ? { ...t, scanned: true } : t));
  const picked = targets.find((t) => t.id === targetId);
  return {
    ...state,
    multiSensorOn: true,
    targets,
    activeTargetId: targetId,
    statusText: picked
      ? `${picked.name}: ${picked.sensorNote} — pick the matching safety step below!`
      : state.statusText,
  };
}

export function classifyArcticTarget(
  state: OceanIceState,
  targetId: number,
  action: ArcticActionType
): OceanIceState {
  if (state.won) return state;
  const target = state.targets.find((t) => t.id === targetId);
  if (!target || target.resolved) return state;

  if (target.expectedAction !== action) {
    const hint =
      target.sigmaDb <= -20
        ? 'That dark spot is an oil spill flattening ocean waves—click "Clean Up Oil Spill"!'
        : target.name.includes('Glacier')
          ? 'Big glacier ice is sliding fast—click "Watch Falling Icebergs"!'
          : 'Frozen mud by the village dock is melting—click "Strengthen Village Dock"!';
    return { ...state, statusText: hint };
  }

  let resolvedCount = 0;
  const targets = state.targets.map((t) => {
    const u = t.id === targetId ? { ...t, scanned: true, resolved: true } : t;
    if (u.resolved) resolvedCount++;
    return u;
  });
  const won = resolvedCount >= targets.length;
  const nextPending = targets.find((t) => !t.resolved);
  return {
    ...state,
    multiSensorOn: true,
    targets,
    resolvedCount,
    activeTargetId: nextPending ? nextPending.id : null,
    won,
    statusText: won
      ? 'Great job! Ocean spills cleaned and Arctic docks & glaciers are safe!'
      : `${target.name} protected! Click the next Arctic box.`,
  };
}

