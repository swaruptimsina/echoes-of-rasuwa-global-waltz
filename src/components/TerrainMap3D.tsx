import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LHENDE_BHOTE_RIVER_PATH } from '../data/rasuwaStoryData';
import { GLOBAL_REGIONS_ATLAS } from '../data/globalRegionsAtlas';
import { GlobalRegionId } from '../services/nasaEarthDataService';
import { RadarLayerMode, Station, TimelinePass, ViewDimension } from '../types';
import {
  buildRegionalRasterCanvas,
  computeRegionalDeformationM,
  getLayerLegendSpec,
  getRegionalDem,
  HATAY_ASI_RIVER,
  sampleRegionalElevationAtUV
} from '../utils/regionalDemGenerator';
import { retroAudio } from '../audio/retroAudioAndVoice';
import { artisticLosHeightKm, uvToSceneXZ } from '../utils/simulatedRadarPhysics';
import { layoutMapBadges, type PlacedMapBadge } from '../utils/mapLabelLayout';

interface TerrainMap3DProps {
  regionId?: GlobalRegionId;
  dimension: ViewDimension;
  onTransitionComplete: (target: '2d' | '3d') => void;
  currentPass: TimelinePass;
  layerMode: RadarLayerMode;
  activeStation: Station;
  onSelectStation: (st: Station) => void;
  playerUV: { u: number; v: number };
  highlightedStationIds?: string[];
  focusTriggerSeq?: number;
}

// Reusable scratch objects to keep render loop allocation-free
const _vec3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Spatial Laplacian smoothing pass to eliminate spiky/artificial DEM facets
 * while preserving natural valley floor and mountain ridge silhouette.
 */
function smoothHeightGrid(
  src: Float32Array,
  cols: number,
  rows: number,
  passes: number,
  alpha = 0.42
): Float32Array {
  let curr = new Float32Array(src);
  let next = new Float32Array(src.length);
  for (let p = 0; p < passes; p++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        let sum = 0;
        let weightSum = 0;
        for (let dr = -1; dr <= 1; dr++) {
          const rr = Math.max(0, Math.min(rows - 1, r + dr));
          for (let dc = -1; dc <= 1; dc++) {
            const cc = Math.max(0, Math.min(cols - 1, c + dc));
            const w = dr === 0 && dc === 0 ? 2.0 : Math.abs(dr) + Math.abs(dc) === 1 ? 1.0 : 0.65;
            sum += curr[rr * cols + cc] * w;
            weightSum += w;
          }
        }
        const avg = sum / weightSum;
        next[idx] = curr[idx] * (1 - alpha) + avg * alpha;
      }
    }
    const tmp = curr;
    curr = next;
    next = tmp;
  }
  return curr;
}

function deterministicRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function minDistToPath(u: number, v: number, path: Array<[number, number]>): number {
  let best = 999;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i];
    const [bx, by] = path[i + 1];
    const vx = bx - ax;
    const vy = by - ay;
    const len2 = vx * vx + vy * vy || 1e-6;
    const t = Math.max(0, Math.min(1, ((u - ax) * vx + (v - ay) * vy) / len2));
    const d = Math.hypot(u - (ax + t * vx), v - (ay + t * vy));
    if (d < best) best = d;
  }
  return best;
}

function createSkyDomeTexture(regionId: GlobalRegionId): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  if (regionId === 'san_joaquin_usa') {
    grad.addColorStop(0.0, '#1e466e');
    grad.addColorStop(0.45, '#5988a8');
    grad.addColorStop(0.75, '#c6baa2');
    grad.addColorStop(1.0, '#6e6456');
  } else if (regionId === 'hatay_turkiye') {
    grad.addColorStop(0.0, '#1a3f63');
    grad.addColorStop(0.46, '#5080a4');
    grad.addColorStop(0.76, '#b8c4ce');
    grad.addColorStop(1.0, '#505c64');
  } else if (regionId === 'pantanal_brazil') {
    grad.addColorStop(0.0, '#184b5c');
    grad.addColorStop(0.48, '#4c8e96');
    grad.addColorStop(0.76, '#a9ccc2');
    grad.addColorStop(1.0, '#36584b');
  } else if (regionId === 'yukon_alaska') {
    grad.addColorStop(0.0, '#1c3b5c');
    grad.addColorStop(0.48, '#537b9c');
    grad.addColorStop(0.76, '#a9c0d1');
    grad.addColorStop(1.0, '#445768');
  } else {
    // High-altitude Himalayan daylight sky over Rasuwa
    grad.addColorStop(0.0, '#173c61');
    grad.addColorStop(0.42, '#427ba3');
    grad.addColorStop(0.72, '#9ec3d6');
    grad.addColorStop(0.88, '#c5d7df');
    grad.addColorStop(1.0, '#3e4e44');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  // Soft sunlit mountain cirrus streaks
  for (let i = 0; i < 18; i++) {
    const cx = deterministicRand(i * 7 + 1) * c.width;
    const cy = 44 + deterministicRand(i * 11 + 3) * 86;
    const w = 60 + deterministicRand(i * 13 + 5) * 140;
    const h = 6 + deterministicRand(i * 17 + 9) * 12;
    const cg = ctx.createRadialGradient(cx, cy, 1, cx, cy, w * 0.55);
    cg.addColorStop(0, 'rgba(255, 250, 238, 0.24)');
    cg.addColorStop(1, 'rgba(255, 250, 238, 0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTerrainMicroBumpTexture(maxAnisotropy: number): {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 256;
  const bCanvas = document.createElement('canvas');
  bCanvas.width = size;
  bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d')!;
  const bImg = bCtx.createImageData(size, size);

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const strata =
        Math.sin((x * 0.08 + y * 0.14)) * 0.35 +
        Math.sin((x * 0.22 - y * 0.19)) * 0.25 +
        deterministicRand(y * size + x) * 0.4;
      const bumpByte = Math.max(0, Math.min(255, Math.round((strata * 0.5 + 0.5) * 255)));
      const roughByte = Math.max(165, Math.min(248, Math.round(195 + (strata - 0.3) * 45)));
      bImg.data[idx] = bImg.data[idx + 1] = bImg.data[idx + 2] = bumpByte;
      bImg.data[idx + 3] = 255;
      rImg.data[idx] = rImg.data[idx + 1] = rImg.data[idx + 2] = roughByte;
      rImg.data[idx + 3] = 255;
    }
  }
  bCtx.putImageData(bImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(7, 7);
  bumpMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(7, 7);
  roughnessMap.anisotropy = maxAnisotropy;

  return { bumpMap, roughnessMap };
}

function createSolarPanelTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0f254f';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  for (let x = 16; x < 256; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 128);
    ctx.stroke();
  }
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  for (let y = 32; y < 128; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createWaterRippleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1e7ba8';
  ctx.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 42; i++) {
    const x = deterministicRand(i * 3.7) * 256;
    const y = deterministicRand(i * 9.1) * 64;
    const w = 16 + deterministicRand(i * 5.3) * 28;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(186, 230, 253, 0.35)' : 'rgba(14, 116, 144, 0.4)';
    ctx.fillRect(x, y, w, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 30);
  grad.addColorStop(0, 'rgba(10, 18, 14, 0.65)');
  grad.addColorStop(1, 'rgba(10, 18, 14, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDioramaPlinthTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#222b28';
  ctx.fillRect(0, 0, 256, 64);
  const bands = ['#2a3531', '#1b2320', '#313d38', '#252e2b'];
  for (let y = 0; y < 64; y += 6) {
    ctx.fillStyle = bands[(y / 6) % bands.length];
    ctx.fillRect(0, y, 256, 4 + Math.sin(y) * 1.5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(4, 1);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Upsample the 160x148 scientific raster with high-quality bilinear interpolation
 * so 3D mountain slopes stay silky and continuous rather than showing square pixels.
 */
function createSmoothTerrainTexture(
  srcCanvas: HTMLCanvasElement,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const hiCanvas = document.createElement('canvas');
  hiCanvas.width = 640;
  hiCanvas.height = 592;
  const hCtx = hiCanvas.getContext('2d')!;
  hCtx.imageSmoothingEnabled = true;
  hCtx.imageSmoothingQuality = 'high';
  hCtx.drawImage(srcCanvas, 0, 0, hiCanvas.width, hiCanvas.height);
  if ('filter' in hCtx) {
    const tmp = document.createElement('canvas');
    tmp.width = hiCanvas.width;
    tmp.height = hiCanvas.height;
    const tCtx = tmp.getContext('2d')!;
    tCtx.drawImage(hiCanvas, 0, 0);
    hCtx.filter = 'blur(1.4px)';
    hCtx.drawImage(tmp, -4, -4, hiCanvas.width + 8, hiCanvas.height + 8);
    hCtx.filter = 'none';
  }

  const tex = new THREE.CanvasTexture(hiCanvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = maxAnisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Handcrafted composite NASA-ISRO NISAR Spacecraft (multi-part group:
 * octagonal gold foil bus, titanium deck, L/S feed horn, dual articulated solar wings,
 * deployable boom struts, curved LatheGeometry 12 m gold mesh parabolic reflector).
 */
function buildCompositeNisarSpacecraft(solarTex: THREE.CanvasTexture): {
  satGroup: THREE.Group;
  swathCone: THREE.Mesh;
} {
  const satGroup = new THREE.Group();

  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    metalness: 0.88,
    roughness: 0.24
  });
  const titaniumMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    metalness: 0.82,
    roughness: 0.28
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    metalness: 0.35,
    roughness: 0.58
  });
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    roughness: 0.22,
    metalness: 0.45
  });
  const meshReflectorMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b',
    metalness: 0.84,
    roughness: 0.26,
    side: THREE.DoubleSide
  });

  // 1. Octagonal MLI foil spacecraft bus
  const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.62, 8), goldFoilMat);
  satGroup.add(bus);

  // 2. Titanium instrument collar & downward radar feed horn
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.14, 12), titaniumMat);
  collar.position.y = -0.36;
  const feedHorn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.28, 12), titaniumMat);
  feedHorn.rotation.x = Math.PI;
  feedHorn.position.y = -0.52;
  satGroup.add(collar, feedHorn);

  // 3. Articulated Solar Wings + Yokes
  for (const side of [-1, 1]) {
    const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.46, 6), titaniumMat);
    yoke.rotation.z = Math.PI / 2;
    yoke.position.set(side * 0.62, 0.05, 0);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.04, 0.66), carbonMat);
    frame.position.set(side * 1.72, 0.05, 0);
    const cells = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.048, 0.6), solarMat);
    cells.position.set(side * 1.72, 0.05, 0);
    satGroup.add(yoke, frame, cells);
  }

  // 4. Deployable carbon-fiber boom + LatheGeometry 12 m parabolic gold mesh drum
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.045, 1.38, 8), carbonMat);
  boom.position.set(0, 0.72, 0.45);
  boom.rotation.x = 0.48;
  satGroup.add(boom);

  const dishProfile = [
    new THREE.Vector2(0.01, 0.0),
    new THREE.Vector2(0.28, 0.03),
    new THREE.Vector2(0.62, 0.1),
    new THREE.Vector2(0.92, 0.22),
    new THREE.Vector2(0.95, 0.25)
  ];
  const dishGeom = new THREE.LatheGeometry(dishProfile, 28);
  const dishMesh = new THREE.Mesh(dishGeom, meshReflectorMat);
  dishMesh.position.set(0, 1.24, 0.86);
  dishMesh.rotation.x = 0.62;
  satGroup.add(dishMesh);

  // 5. Outer tension rim on reflector
  const dishRim = new THREE.Mesh(new THREE.TorusGeometry(0.94, 0.026, 8, 28), carbonMat);
  dishRim.position.set(0, 1.39, 1.04);
  dishRim.rotation.x = Math.PI / 2 + 0.62;
  satGroup.add(dishRim);

  // 6. Subtle translucent radar illumination swath
  const swathGeom = new THREE.ConeGeometry(4.4, 9.8, 28, 1, true);
  const swathMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.085,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const swathCone = new THREE.Mesh(swathGeom, swathMat);
  swathCone.position.set(0, -4.9, 0);
  satGroup.add(swathCone);

  return { satGroup, swathCone };
}

/**
 * Handcrafted stone Tamang Flag House miniature (5 parts pivoted at bottom center)
 */
function buildFlagHouseLandmark(shadowTex: THREE.CanvasTexture): THREE.Group {
  const g = new THREE.Group();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.45, depthWrite: false })
  );
  shadow.position.y = 0.02;

  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.36, 0.52),
    new THREE.MeshStandardMaterial({ color: '#bfb29c', roughness: 0.9, metalness: 0.04 })
  );
  walls.position.y = 0.18;

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.52, 0.26, 4),
    new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.78, metalness: 0.08 })
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 0.48;

  const windowGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.12, 0.54),
    new THREE.MeshStandardMaterial({
      color: '#fde68a',
      emissive: '#f59e0b',
      emissiveIntensity: 0.55,
      roughness: 0.3
    })
  );
  windowGlow.position.set(0.14, 0.2, 0);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.78, 6),
    new THREE.MeshStandardMaterial({ color: '#a16207', roughness: 0.85 })
  );
  pole.position.set(-0.36, 0.39, 0.24);

  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.15, 0.02),
    new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.75 })
  );
  flag.position.set(-0.24, 0.68, 0.24);

  g.add(shadow, walls, roof, windowGlow, pole, flag);
  return g;
}

/**
 * Handcrafted stone valley bridge & gate landmark (4 parts pivoted at bottom center)
 */
function buildBridgeGateLandmark(shadowTex: THREE.CanvasTexture): THREE.Group {
  const g = new THREE.Group();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.85).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.42, depthWrite: false })
  );
  shadow.position.y = 0.02;

  const stoneMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.88, metalness: 0.05 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.35, metalness: 0.65 });

  const pierL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.42), stoneMat);
  pierL.position.set(-0.34, 0.14, 0);
  const pierR = pierL.clone();
  pierR.position.set(0.34, 0.14, 0);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.08, 0.38), stoneMat);
  deck.position.set(0, 0.3, 0);

  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.032, 6, 16, Math.PI), steelMat);
  arch.position.set(0, 0.31, 0);

  g.add(shadow, pierL, pierR, deck, arch);
  return g;
}

interface ProjectedPin {
  station: Station;
  screenX: number;
  screenY: number;
  visible: boolean;
  badge?: PlacedMapBadge;
}

function getShort3DPinName(st: Station): string {
  const names: Record<string, string> = {
    syabrubesi: 'Syabrubesi Dobhan',
    chilime: 'Chilime Terraces',
    timure: 'Timure Canyon',
    rasuwagadhi_hydro: 'Hydropower site',
    miteri_bridge: 'Miteri Bridge',
    purugu_glacier: 'Schematic headwall',
    br_palafita_vila: 'Vila Palafita',
    br_peat_channel: 'Corixo Peatland',
    br_logging_front: 'Logging Frontier',
    ca_hydro_station: 'Hydro Cooperativa',
    ca_corcoran_bowl: 'Corcoran Bowl',
    ca_aqueduct_levee: 'Aqueduct Sag',
    tr_antakya_havus: 'Antakya Basin',
    tr_fault_olive: 'Pazarcık Fault',
    tr_dam_crest: 'Dam Crest',
    ak_yupik_boardwalk: 'Yup’ik Village',
    ak_bluff_erosion: 'Coastal Bluff',
    ak_stable_ridge: 'Gravel Ridge'
  };
  return names[st.id] || st.name.split('&')[0].trim();
}

function getSimulationButtonMeta(regionId: GlobalRegionId): {
  icon: string;
  idleLabel: string;
  runningPrefix: string;
  tooltip: string;
} {
  switch (regionId) {
    case 'hatay_turkiye':
      return {
        icon: '⚡',
        idleLabel: 'SIMULATE FAULT RUPTURE',
        runningPrefix: 'SEISMIC WAVE',
        tooltip: 'Visualize left-lateral fault rupture propagation along the East Anatolian Fault & seismic wave arrival across Antakya and the upstream dam.'
      };
    case 'san_joaquin_usa':
      return {
        icon: '💧',
        idleLabel: 'SIMULATE AQUEDUCT & BOWL',
        runningPrefix: 'HYDRO-SUBSIDENCE',
        tooltip: 'Visualize California Aqueduct gravity conveyance through the Corcoran Clay subsidence trough and MAR recharge basin.'
      };
    case 'pantanal_brazil':
      return {
        icon: '🌊',
        idleLabel: 'SIMULATE FLOOD PULSE',
        runningPrefix: 'FLOOD PULSE',
        tooltip: 'Visualize seasonal tropical flood-pulse propagation beneath gallery forest canopy down the Cuiabá-Paraguay corridor.'
      };
    case 'yukon_alaska':
      return {
        icon: '🌊',
        idleLabel: 'SIMULATE STORM SURGE',
        runningPrefix: 'BERING SURGE',
        tooltip: 'Visualize autumn Bering Sea storm-surge wave action impacting thawing coastal permafrost bluffs vs stable upland ridge.'
      };
    case 'rasuwa_nepal':
    default:
      return {
        icon: '🌊',
        idleLabel: 'SIMULATE DEBRIS CASCADE',
        runningPrefix: 'CASCADE',
        tooltip: 'Illustration only: an authored debris cascade along the schematic river corridor. Not a reconstruction or event forecast.'
      };
  }
}

export const TerrainMap3D: React.FC<TerrainMap3DProps> = ({
  regionId = 'rasuwa_nepal',
  dimension,
  onTransitionComplete,
  currentPass,
  layerMode,
  activeStation,
  onSelectStation,
  playerUV,
  highlightedStationIds = [],
  focusTriggerSeq = 0
}) => {
  const regionDef = GLOBAL_REGIONS_ATLAS[regionId];
  const regDem = getRegionalDem(regionId);
  const regStations = regionDef.stations;
  const regPath =
    regionId === 'rasuwa_nepal' ? LHENDE_BHOTE_RIVER_PATH : regionDef.riverOrFaultPathUV;

  // Scene units follow the declared illustrative DEM extent, not a surveyed map.
  const WORLD_W = regDem.bounds.widthKm;
  const WORLD_D = regDem.bounds.heightKm;
  const uvToWorldXZ = (u: number, v: number) => uvToSceneXZ(regDem.bounds, u, v);
  const mapCameraScale = Math.max(WORLD_W, WORLD_D) / 25.5;
  const elevSpan = Math.max(55, regDem.maxElev - regDem.minElev);
  const baseVerticalExaggeration = regionId === 'rasuwa_nepal' ? 1 :
    (regionId === 'hatay_turkiye' ? 3.8 : regionId === 'san_joaquin_usa' ? 2.8 : 2.3) / (elevSpan / 1000);
  const elevToUnit = (elevM: number) => ((elevM - regDem.minElev) / 1000) * baseVerticalExaggeration;
  const losHeightExaggeration = regionId === 'san_joaquin_usa' ? 460 :
    regionId === 'hatay_turkiye' ? 240 : regionId === 'yukon_alaska' ? 380 : 210;

  const legend = useMemo(() => getLayerLegendSpec(layerMode, regionId), [layerMode, regionId]);
  const simMeta = useMemo(() => getSimulationButtonMeta(regionId), [regionId]);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const [reliefScale, setReliefScale] = useState<number>(1.35);
  const [showCloudDeck3D, setShowCloudDeck3D] = useState<boolean>(false);
  const [cascadeSimProgress, setCascadeSimProgress] = useState<number | null>(null);
  const [morphPercent, setMorphPercent] = useState<number>(0);
  const [controlsCollapsed, setControlsCollapsed] = useState<boolean>(false);
  const [projectedPins, setProjectedPins] = useState<ProjectedPin[]>([]);
  const pinLabelRefs = useRef(new Map<string, HTMLButtonElement>());
  const activeStationIdRef = useRef(activeStation.id);
  activeStationIdRef.current = activeStation.id;

  const sceneObjsRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    terrainGeom: THREE.PlaneGeometry;
    terrainMat: THREE.MeshStandardMaterial;
    wireMesh: THREE.Mesh;
    wireMat: THREE.MeshBasicMaterial;
    cloudMesh: THREE.Mesh;
    satGroup: THREE.Group;
    swathCone: THREE.Mesh;
    playerBeacon: THREE.Group;
    stationMastsGroup: THREE.Group;
    landmarksGroup: THREE.Group;
    treesTrunkMesh: THREE.InstancedMesh | null;
    treesCanopyMesh: THREE.InstancedMesh | null;
    bouldersMesh: THREE.InstancedMesh | null;
    treeAnchors: Array<{ u: number; v: number; scale: number; yaw: number }>;
    boulderAnchors: Array<{ u: number; v: number; scale: number; yaw: number; tilt: number }>;
    riverRibbonMesh: THREE.Mesh | null;
    riverWaterTex: THREE.CanvasTexture | null;
    riverPathPoints: Array<[number, number]>;
    cascadeGroup: THREE.Group;
    seismicRingsGroup: THREE.Group;
    baseHeightsKm: Float32Array;
    dynamicHeightsKm: Float32Array;
    heightsDirty: boolean;
    isSoftwareGl: boolean;
  } | null>(null);

  const animStateRef = useRef<{
    extrude: number;
    reliefMultiplier: number;
    targetReliefMultiplier: number;
    flyFromPos: THREE.Vector3 | null;
    flyToPos: THREE.Vector3 | null;
    flyFromTarget: THREE.Vector3 | null;
    flyToTarget: THREE.Vector3 | null;
    flyProgress: number;
    flyDurationMs: number;
    flyStartTime: number;
    onFlyDone: (() => void) | null;
  }>({
    extrude: 0,
    reliefMultiplier: 1.35,
    targetReliefMultiplier: 1.35,
    flyFromPos: null,
    flyToPos: null,
    flyFromTarget: null,
    flyToTarget: null,
    flyProgress: 1,
    flyDurationMs: 1600,
    flyStartTime: 0,
    onFlyDone: null
  });

  const getStationCameraPose = (st: Station | null, relief: number) => {
    if (!st) {
      return {
        pos: new THREE.Vector3(-4.2 * mapCameraScale, 14.8 * mapCameraScale, 19.2 * mapCameraScale),
        target: new THREE.Vector3(0.2, 1.6 * relief, -0.3)
      };
    }
    const { x, z } = uvToWorldXZ(st.u, st.v);
    const sampledElev = sampleRegionalElevationAtUV(regionId, st.u, st.v);
    const y = elevToUnit(sampledElev) * relief;
    if (st.id === 'purugu_glacier') {
      return {
        pos: new THREE.Vector3(x - 8.2, y + 6.4, z + 7.8),
        target: new THREE.Vector3(x + 0.6, y - 0.3, z - 0.2)
      };
    }
    return {
      pos: new THREE.Vector3(x - 4.8, Math.max(5.2, y + 5.2), z + 8.2),
      target: new THREE.Vector3(x + 0.6, y + 0.35, z - 0.6)
    };
  };

  // Initialize Handcrafted PBR Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 560;

    // Detect software WebGL (SwiftShader / llvmpipe / WARP) for frame pacing & render cost only
    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2') || probe.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param) || '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance'
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const scene = new THREE.Scene();

    const horizonHex =
      regionId === 'san_joaquin_usa'
        ? '#b8ad96'
        : regionId === 'pantanal_brazil'
          ? '#9bc2b8'
          : regionId === 'hatay_turkiye'
            ? '#adbec9'
            : regionId === 'yukon_alaska'
              ? '#a2bacb'
              : '#9dc0d2';

    scene.background = new THREE.Color(horizonHex);
    scene.fog = new THREE.FogExp2(horizonHex, 0.0085);

    // Mandatory studio environment map for realistic metallic & glass highlights
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.2, 220);
    camera.position.set(0, 29.0 * mapCameraScale, 0.02);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.465;
    controls.minDistance = 4.2;
    controls.maxDistance = 46;

    // Cancel scripted fly-to immediately if user begins orbiting manually
    const onControlStart = () => {
      animStateRef.current.flyProgress = 1;
      animStateRef.current.onFlyDone = null;
    };
    controls.addEventListener('start', onControlStart);

    // Atmospheric Sky Dome fading cleanly into horizon fog
    const skyTex = createSkyDomeTexture(regionId);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    const skyGeom = new THREE.SphereGeometry(95, 32, 20);
    const skyDome = new THREE.Mesh(skyGeom, skyMat);
    scene.add(skyDome);

    // Balanced 3-point warm/cool outdoor studio rig
    const hemi = new THREE.HemisphereLight('#dff2ff', '#2c3a2d', 1.12);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight('#fff2d6', 1.85);
    sun.position.set(-18, 28, 16);
    if (!isSoftwareGl) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 4;
      sun.shadow.camera.far = 85;
      sun.shadow.camera.left = -22;
      sun.shadow.camera.right = 22;
      sun.shadow.camera.top = 22;
      sun.shadow.camera.bottom = -22;
      sun.shadow.bias = -0.0005;
      sun.shadow.normalBias = 0.02;
    }
    scene.add(sun);

    const rim = new THREE.DirectionalLight('#93c5fd', 0.45);
    rim.position.set(20, 14, -18);
    scene.add(rim);

    // Build smoothed DEM height grid (removes spiky/blocky artifacts)
    const segW = regDem.cols - 1;
    const segH = regDem.rows - 1;
    const terrainGeom = new THREE.PlaneGeometry(WORLD_W, WORLD_D, segW, segH);
    terrainGeom.rotateX(-Math.PI / 2);

    const vertCount = regDem.cols * regDem.rows;
    const rawHeights = new Float32Array(vertCount);
    for (let r = 0; r < regDem.rows; r++) {
      for (let c = 0; c < regDem.cols; c++) {
        rawHeights[r * regDem.cols + c] = elevToUnit(regDem.elevations[r][c]);
      }
    }
    const baseHeightsKm = smoothHeightGrid(rawHeights, regDem.cols, regDem.rows, 2, 0.36);
    const dynamicHeightsKm = new Float32Array(baseHeightsKm);

    const initialCanvas = buildRegionalRasterCanvas(regionId, layerMode, currentPass, 0, 3);
    const tex = createSmoothTerrainTexture(initialCanvas, maxAniso);

    const { bumpMap: terrainBump, roughnessMap: terrainRough } =
      createTerrainMicroBumpTexture(maxAniso);

    const terrainMat = new THREE.MeshStandardMaterial({
      map: tex,
      bumpMap: terrainBump,
      bumpScale: 0.075,
      roughnessMap: terrainRough,
      roughness: 0.88,
      metalness: 0.04,
      flatShading: false
    });
    const terrainMesh = new THREE.Mesh(terrainGeom, terrainMat);
    terrainMesh.receiveShadow = !isSoftwareGl;
    terrainMesh.castShadow = !isSoftwareGl;
    scene.add(terrainMesh);

    // Grounded sedimentary plinth beneath the geological block (never a thin paper plane)
    const plinthTex = createDioramaPlinthTexture(maxAniso);
    const plinthGeom = new THREE.BoxGeometry(WORLD_W + 0.08, 1.45, WORLD_D + 0.08);
    const plinthMat = new THREE.MeshStandardMaterial({
      map: plinthTex,
      roughness: 0.92,
      metalness: 0.05
    });
    const plinthMesh = new THREE.Mesh(plinthGeom, plinthMat);
    plinthMesh.position.y = -0.74;
    plinthMesh.receiveShadow = !isSoftwareGl;
    scene.add(plinthMesh);

    // Subtle geodetic contour wireframe shown ONLY in retro_wireframe mode
    const wireMat = new THREE.MeshBasicMaterial({
      color: '#d5b66b',
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    const wireMesh = new THREE.Mesh(terrainGeom, wireMat);
    wireMesh.position.y = 0.025;
    wireMesh.visible = layerMode === 'retro_wireframe';
    scene.add(wireMesh);

    // Flowing Glacial River / Channel Ribbon
    let riverRibbonMesh: THREE.Mesh | null = null;
    let riverWaterTex: THREE.CanvasTexture | null = null;
    const riverPathPoints: Array<[number, number]> =
      regionId === 'hatay_turkiye'
        ? HATAY_ASI_RIVER
        : regionId === 'yukon_alaska'
          ? []
          : regPath;
    if (riverPathPoints.length >= 2) {
      const riverPts3D = riverPathPoints.map(([ru, rv]) => {
        const { x, z } = uvToWorldXZ(ru, rv);
        const h = elevToUnit(sampleRegionalElevationAtUV(regionId, ru, rv)) * 1.35 + 0.22;
        return new THREE.Vector3(x, h, z);
      });
      const curve = new THREE.CatmullRomCurve3(riverPts3D);
      const riverGeom = new THREE.TubeGeometry(curve, 52, 0.32, 6, false);
      riverGeom.scale(1, 0.26, 1);
      riverWaterTex = createWaterRippleTexture(maxAniso);
      const riverMat = new THREE.MeshStandardMaterial({
        map: riverWaterTex,
        color: '#0284c7',
        roughness: 0.16,
        metalness: 0.18,
        transparent: true,
        opacity: 0.92
      });
      riverRibbonMesh = new THREE.Mesh(riverGeom, riverMat);
      scene.add(riverRibbonMesh);
    }

    // Instanced Alpine Pines (2-tier canopies + bark trunks) & River Boulders
    const treeAnchors: Array<{ u: number; v: number; scale: number; yaw: number }> = [];
    const boulderAnchors: Array<{ u: number; v: number; scale: number; yaw: number; tilt: number }> = [];
    if (regionId !== 'yukon_alaska') {
      for (let i = 0; i < 420 && treeAnchors.length < 140; i++) {
        const u = 0.06 + deterministicRand(i * 19.3 + 1) * 0.88;
        const v = 0.06 + deterministicRand(i * 23.7 + 5) * 0.88;
        const e = sampleRegionalElevationAtUV(regionId, u, v);
        const normE = (e - regDem.minElev) / elevSpan;
        const riverDist = riverPathPoints.length >= 2 ? minDistToPath(u, v, riverPathPoints) : 1;
        const nearStation = regStations.some((s) => Math.hypot(s.u - u, s.v - v) < 0.055);
        if (normE > 0.08 && normE < 0.66 && riverDist > 0.045 && !nearStation) {
          treeAnchors.push({
            u,
            v,
            scale: 0.85 + deterministicRand(i * 31.1) * 0.3,
            yaw: deterministicRand(i * 41.9) * Math.PI * 2
          });
        }
      }
    }
    if (riverPathPoints.length >= 2) {
      for (let i = 0; i < 180 && boulderAnchors.length < 64; i++) {
        const seg = Math.floor(deterministicRand(i * 11.7) * (riverPathPoints.length - 1));
        const frac = deterministicRand(i * 17.3);
        const [au, av] = riverPathPoints[seg];
        const [bu, bv] = riverPathPoints[Math.min(riverPathPoints.length - 1, seg + 1)];
        const side = (deterministicRand(i * 29.1) - 0.5) * 0.065;
        const u = Math.max(0.03, Math.min(0.97, au + (bu - au) * frac + side));
        const v = Math.max(0.03, Math.min(0.97, av + (bv - av) * frac + side * 0.6));
        boulderAnchors.push({
          u,
          v,
          scale: 0.78 + deterministicRand(i * 37.3) * 0.44,
          yaw: deterministicRand(i * 43.1) * Math.PI * 2,
          tilt: (deterministicRand(i * 53.7) - 0.5) * 0.35
        });
      }
    }

    let treesTrunkMesh: THREE.InstancedMesh | null = null;
    let treesCanopyMesh: THREE.InstancedMesh | null = null;
    if (treeAnchors.length > 0) {
      const trunkGeom = new THREE.CylinderGeometry(0.032, 0.052, 0.26, 6);
      trunkGeom.translate(0, 0.13, 0);
      const trunkMat = new THREE.MeshStandardMaterial({ color: '#4a3228', roughness: 0.92 });
      treesTrunkMesh = new THREE.InstancedMesh(trunkGeom, trunkMat, treeAnchors.length);
      treesTrunkMesh.castShadow = !isSoftwareGl;

      // 3-tier sculpted Himalayan cedar LatheGeometry profile (replaces single primitive cone)
      const canopyProfile = [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.22, 0.04),
        new THREE.Vector2(0.11, 0.14),
        new THREE.Vector2(0.18, 0.18),
        new THREE.Vector2(0.08, 0.3),
        new THREE.Vector2(0.13, 0.34),
        new THREE.Vector2(0.0, 0.54)
      ];
      const canopyGeom = new THREE.LatheGeometry(canopyProfile, 10);
      canopyGeom.translate(0, 0.22, 0);
      const canopyMat = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.9,
        metalness: 0.02
      });
      treesCanopyMesh = new THREE.InstancedMesh(canopyGeom, canopyMat, treeAnchors.length);
      treesCanopyMesh.castShadow = !isSoftwareGl;
      treesCanopyMesh.receiveShadow = !isSoftwareGl;
      treeAnchors.forEach((_, i) => {
        const gHue = 0.35 + deterministicRand(i * 13.7) * 0.05;
        const gSat = 0.46 + deterministicRand(i * 17.1) * 0.18;
        const gLit = 0.16 + deterministicRand(i * 21.3) * 0.09;
        _color.setHSL(gHue, gSat, gLit).convertSRGBToLinear();
        treesCanopyMesh!.setColorAt(i, _color);
      });
      if (treesCanopyMesh.instanceColor) treesCanopyMesh.instanceColor.needsUpdate = true;
      treesTrunkMesh.frustumCulled = false;
      treesCanopyMesh.frustumCulled = false;
      scene.add(treesTrunkMesh, treesCanopyMesh);
    }

    let bouldersMesh: THREE.InstancedMesh | null = null;
    if (boulderAnchors.length > 0) {
      const bGeom = new THREE.DodecahedronGeometry(0.14, 0);
      bGeom.scale(1.25, 0.72, 1.0);
      bGeom.translate(0, 0.06, 0);
      const bMat = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.92,
        metalness: 0.08
      });
      bouldersMesh = new THREE.InstancedMesh(bGeom, bMat, boulderAnchors.length);
      bouldersMesh.receiveShadow = !isSoftwareGl;
      boulderAnchors.forEach((_, i) => {
        const shade = 0.26 + deterministicRand(i * 15.9) * 0.16;
        _color.setRGB(shade * 0.94, shade * 0.98, shade * 1.04).convertSRGBToLinear();
        bouldersMesh!.setColorAt(i, _color);
      });
      if (bouldersMesh.instanceColor) bouldersMesh.instanceColor.needsUpdate = true;
      bouldersMesh.frustumCulled = false;
      scene.add(bouldersMesh);
    }

    // Procedural Cloud / Smoke / Haze Deck Plane
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 256;
    cloudCanvas.height = 256;
    const cctx = cloudCanvas.getContext('2d')!;
    const cImg = cctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const n =
          Math.sin(x * 0.055) * Math.cos(y * 0.055) * 0.45 +
          Math.sin((x * 1.3 + y * 0.9) * 0.11) * 0.3 +
          Math.cos((x - y * 1.4) * 0.17) * 0.15 +
          0.5;
        const i = (y * 256 + x) * 4;
        const isSmoke = regionId === 'pantanal_brazil';
        cImg.data[i] = isSmoke ? 226 : 244;
        cImg.data[i + 1] = isSmoke ? 208 : 249;
        cImg.data[i + 2] = isSmoke ? 188 : 255;
        cImg.data[i + 3] = n > 0.34 ? Math.min(200, Math.round((n - 0.22) * 220)) : 0;
      }
    }
    cctx.putImageData(cImg, 0, 0);
    const cloudTex = new THREE.CanvasTexture(cloudCanvas);
    cloudTex.colorSpace = THREE.SRGBColorSpace;
    const cloudMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_W, WORLD_D, 1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    scene.add(cloudMesh);

    // Handcrafted Composite NISAR Spacecraft
    const solarTex = createSolarPanelTexture(maxAniso);
    const { satGroup, swathCone } = buildCompositeNisarSpacecraft(solarTex);
    satGroup.position.set(0, 16.5, 0);
    scene.add(satGroup);

    // Contact shadow texture shared by grounded props & survey stations
    const contactShadowTex = createContactShadowTexture();

    // Grounded Village & Bridge Landmarks
    const landmarksGroup = new THREE.Group();
    if (regStations.length > 0) {
      const flagHouse = buildFlagHouseLandmark(contactShadowTex);
      flagHouse.userData = { u: regStations[0].u + 0.015, v: regStations[0].v + 0.015 };
      landmarksGroup.add(flagHouse);
    }
    if (regStations.length > 3) {
      const bridgeGate = buildBridgeGateLandmark(contactShadowTex);
      const midSt = regStations[Math.min(regStations.length - 2, 3)];
      bridgeGate.userData = { u: midSt.u - 0.012, v: midSt.v + 0.012 };
      landmarksGroup.add(bridgeGate);
    }
    scene.add(landmarksGroup);

    // Handcrafted Surveyor Brass Tripod + Trihedral Corner-Reflector Stations
    const stationMastsGroup = new THREE.Group();
    const tripodMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.65, roughness: 0.38 });
    const brassMat = new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.85, roughness: 0.22 });
    regStations.forEach((st) => {
      const g = new THREE.Group();
      g.userData = { u: st.u, v: st.v };

      const cShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.75, 0.75).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, opacity: 0.45, depthWrite: false })
      );
      cShadow.position.y = 0.025;

      // Tripod 3 legs
      for (let legIdx = 0; legIdx < 3; legIdx++) {
        const ang = (legIdx * Math.PI * 2) / 3;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.36, 5), tripodMat);
        leg.position.set(Math.cos(ang) * 0.09, 0.16, Math.sin(ang) * 0.09);
        leg.rotation.z = Math.cos(ang) * 0.35;
        leg.rotation.x = -Math.sin(ang) * 0.35;
        g.add(leg);
      }

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.78, 8), brassMat);
      mast.position.y = 0.58;

      const reflector = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18, 0),
        new THREE.MeshStandardMaterial({
          color: st.accentColor,
          emissive: st.accentColor,
          emissiveIntensity: 0.38,
          metalness: 0.78,
          roughness: 0.18
        })
      );
      reflector.position.y = 1.04;

      g.add(cShadow, mast, reflector);
      stationMastsGroup.add(g);
    });
    scene.add(stationMastsGroup);

    // 3D Player Field Position Beacon
    const playerBeacon = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.65, 12),
      new THREE.MeshBasicMaterial({ color: '#facc15', transparent: true, opacity: 0.85 })
    );
    beam.position.y = 0.85;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.42, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#fde047', side: THREE.DoubleSide })
    );
    ring.position.y = 0.05;
    playerBeacon.add(beam, ring);
    scene.add(playerBeacon);

    // 3D Hydrological / Surge / Rupture Particle Group
    const cascadeGroup = new THREE.Group();
    const particleColorA =
      regionId === 'hatay_turkiye'
        ? '#f43f5e'
        : regionId === 'pantanal_brazil'
          ? '#34d399'
          : '#38bdf8';
    const particleColorB =
      regionId === 'hatay_turkiye'
        ? '#facc15'
        : regionId === 'yukon_alaska'
          ? '#bae6fd'
          : '#fb923c';
    for (let i = 0; i < 32; i++) {
      const boulder = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.18 + (i % 3) * 0.07, 0),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? particleColorA : particleColorB,
          roughness: 0.55,
          metalness: 0.15
        })
      );
      boulder.visible = false;
      cascadeGroup.add(boulder);
    }
    scene.add(cascadeGroup);

    // 3D Expanding Wavefront Rings
    const seismicRingsGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const waveRing = new THREE.Mesh(
        new THREE.RingGeometry(0.85, 1.0, 48).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? '#f43f5e' : '#facc15',
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide
        })
      );
      waveRing.visible = false;
      seismicRingsGroup.add(waveRing);
    }
    scene.add(seismicRingsGroup);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    sceneObjsRef.current = {
      renderer,
      scene,
      camera,
      controls,
      terrainGeom,
      terrainMat,
      wireMesh,
      wireMat,
      cloudMesh,
      satGroup,
      swathCone,
      playerBeacon,
      stationMastsGroup,
      landmarksGroup,
      treesTrunkMesh,
      treesCanopyMesh,
      bouldersMesh,
      treeAnchors,
      boulderAnchors,
      riverRibbonMesh,
      riverWaterTex,
      riverPathPoints,
      cascadeGroup,
      seismicRingsGroup,
      baseHeightsKm,
      dynamicHeightsKm,
      heightsDirty: true,
      isSoftwareGl
    };

    const handleResize = () => {
      if (!mountRef.current || !sceneObjsRef.current) return;
      const nw = mountRef.current.clientWidth || 800;
      const nh = mountRef.current.clientHeight || 520;
      sceneObjsRef.current.camera.aspect = nw / nh;
      sceneObjsRef.current.camera.updateProjectionMatrix();
      sceneObjsRef.current.renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let frameCount = 0;
    let lastNow = performance.now();

    function afterDraw(cb: () => void) {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (gl && typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            if (disposed) {
              if (sync) gl.deleteSync(sync);
              return;
            }
            const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (state === gl.UNSIGNALED) {
              timerId = window.setTimeout(poll, 5);
            } else {
              if (sync) gl.deleteSync(sync);
              timerId = window.setTimeout(cb, 80);
            }
          };
          timerId = window.setTimeout(poll, 5);
          return;
        }
      } catch {
        // Fallback when fenceSync is unavailable
      }
      timerId = window.setTimeout(cb, 80);
    }

    const syncInstancedProps = (targetScale: number, showProps: boolean) => {
      const objs = sceneObjsRef.current;
      if (!objs) return;

      if (objs.treesTrunkMesh && objs.treesCanopyMesh) {
        objs.treesTrunkMesh.visible = showProps;
        objs.treesCanopyMesh.visible = showProps;
        if (showProps) {
          objs.treeAnchors.forEach((a, idx) => {
            const { x, z } = uvToWorldXZ(a.u, a.v);
            const y = elevToUnit(sampleRegionalElevationAtUV(regionId, a.u, a.v)) * targetScale;
            _euler.set(0, a.yaw, 0);
            _quat.setFromEuler(_euler);
            _vec3.set(x, Math.max(0, y - 0.03), z);
            _scale.setScalar(a.scale);
            _mat4.compose(_vec3, _quat, _scale);
            objs.treesTrunkMesh!.setMatrixAt(idx, _mat4);
            objs.treesCanopyMesh!.setMatrixAt(idx, _mat4);
          });
          objs.treesTrunkMesh.instanceMatrix.needsUpdate = true;
          objs.treesCanopyMesh.instanceMatrix.needsUpdate = true;
          objs.treesTrunkMesh.computeBoundingSphere();
          objs.treesCanopyMesh.computeBoundingSphere();
        }
      }

      if (objs.bouldersMesh) {
        objs.bouldersMesh.visible = showProps;
        if (showProps) {
          objs.boulderAnchors.forEach((b, idx) => {
            const { x, z } = uvToWorldXZ(b.u, b.v);
            const y = elevToUnit(sampleRegionalElevationAtUV(regionId, b.u, b.v)) * targetScale;
            _euler.set(b.tilt, b.yaw, b.tilt * 0.5);
            _quat.setFromEuler(_euler);
            _vec3.set(x, Math.max(0, y - 0.02), z);
            _scale.setScalar(b.scale);
            _mat4.compose(_vec3, _quat, _scale);
            objs.bouldersMesh!.setMatrixAt(idx, _mat4);
          });
          objs.bouldersMesh.instanceMatrix.needsUpdate = true;
          objs.bouldersMesh.computeBoundingSphere();
        }
      }

      if (objs.riverRibbonMesh && objs.riverPathPoints.length >= 2) {
        objs.riverRibbonMesh.visible = showProps;
        if (showProps) {
          objs.riverRibbonMesh.scale.y = Math.max(0.4, targetScale / 1.35);
        }
      }
    };

    const animate = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.1, Math.max(0.001, (now - lastNow) / 1000));
      lastNow = now;
      frameCount++;
      const objs = sceneObjsRef.current;
      if (!objs) return;

      const st = animStateRef.current;

      // Smoothly damp relief slider transitions
      const nextRelief = THREE.MathUtils.damp(
        st.reliefMultiplier,
        st.targetReliefMultiplier,
        8,
        dt
      );
      if (Math.abs(nextRelief - st.reliefMultiplier) > 0.0005) {
        st.reliefMultiplier = nextRelief;
        objs.heightsDirty = true;
      }

      if (st.flyProgress < 1 && st.flyFromPos && st.flyToPos && st.flyFromTarget && st.flyToTarget) {
        const rawT = Math.min(1, (now - st.flyStartTime) / st.flyDurationMs);
        st.flyProgress = rawT;
        const e = easeInOutCubic(rawT);

        objs.camera.position.lerpVectors(st.flyFromPos, st.flyToPos, e);
        objs.controls.target.lerpVectors(st.flyFromTarget, st.flyToTarget, e);

        if (rawT >= 1 && st.onFlyDone) {
          const cb = st.onFlyDone;
          st.onFlyDone = null;
          cb();
        }
      }

      const posAttr = objs.terrainGeom.attributes.position as THREE.BufferAttribute;
      const targetScale = st.extrude * st.reliefMultiplier;
      const sampleIdx = Math.floor(posAttr.count / 2);
      const expectedSampleY = objs.dynamicHeightsKm[sampleIdx] * targetScale;

      if (objs.heightsDirty || Math.abs(posAttr.getY(sampleIdx) - expectedSampleY) > 0.0005) {
        for (let i = 0; i < posAttr.count; i++) {
          posAttr.setY(i, objs.dynamicHeightsKm[i] * targetScale);
        }
        posAttr.needsUpdate = true;
        objs.terrainGeom.computeVertexNormals();
        objs.heightsDirty = false;
        syncInstancedProps(targetScale, st.extrude > 0.35);
      }

      // Sync grounded village landmarks & surveyor tripods vertically with terrain extrusion
      objs.landmarksGroup.visible = st.extrude > 0.35;
      objs.landmarksGroup.children.forEach((child) => {
        const u = child.userData.u as number;
        const v = child.userData.v as number;
        const { x, z } = uvToWorldXZ(u, v);
        const surfElev = sampleRegionalElevationAtUV(regionId, u, v);
        const y = elevToUnit(surfElev) * targetScale;
        child.position.set(x, Math.max(0, y - 0.02), z);
      });

      objs.stationMastsGroup.visible = st.extrude > 0.35;
      objs.stationMastsGroup.children.forEach((mast, idx) => {
        const u = mast.userData.u as number;
        const v = mast.userData.v as number;
        const { x, z } = uvToWorldXZ(u, v);
        const surfElev = sampleRegionalElevationAtUV(regionId, u, v);
        const y = elevToUnit(surfElev) * targetScale;
        mast.position.set(x, y, z);
        if (mast.children[4]) {
          mast.children[4].rotation.y = now * 0.0014 + idx;
        }
      });

      // Flowing water UV scroll
      if (objs.riverWaterTex) {
        objs.riverWaterTex.offset.x -= dt * 0.35;
      }

      const orbitAngle = now * 0.00032;
      objs.satGroup.position.set(
        Math.sin(orbitAngle) * 5.2,
        9.2 * Math.max(0.55, st.extrude),
        Math.cos(orbitAngle * 0.8) * 4.4
      );
      objs.satGroup.rotation.y = -orbitAngle * 0.5;
      objs.satGroup.visible = st.extrude > 0.18;

      objs.cloudMesh.position.y = (regionId === 'rasuwa_nepal' ? 2.8 : 2.1) * targetScale;

      objs.controls.update();
      objs.renderer.render(objs.scene, objs.camera);

      if (frameCount % 2 === 0 && mountRef.current) {
        const cw = mountRef.current.clientWidth;
        const ch = mountRef.current.clientHeight;
        const nextPins: ProjectedPin[] = regStations.map((station) => {
          const { x, z } = uvToWorldXZ(station.u, station.v);
          const surfElev = sampleRegionalElevationAtUV(regionId, station.u, station.v);
          const y = elevToUnit(surfElev) * targetScale + 1.15;
          const v3 = new THREE.Vector3(x, y, z).project(objs.camera);
          return {
            station,
            screenX: (v3.x * 0.5 + 0.5) * cw,
            screenY: (-v3.y * 0.5 + 0.5) * ch,
            visible: Math.abs(v3.x) <= 1 && Math.abs(v3.y) <= 1 && v3.z >= -1 && v3.z < 1 && st.extrude > 0.55
          };
        });
        const badgePositions = new Map(layoutMapBadges(nextPins.flatMap((pin) => {
          if (!pin.visible) return [];
          const rect = pinLabelRefs.current.get(pin.station.id)?.getBoundingClientRect();
          if (!rect || rect.width <= 0 || rect.height <= 0) return [];
          return [{
            id: pin.station.id,
            anchorX: pin.screenX,
            anchorY: pin.screenY,
            width: rect.width,
            height: rect.height,
            selected: pin.station.id === activeStationIdRef.current
          }];
        }), cw, ch).map((badge) => [badge.id, badge]));
        setProjectedPins(nextPins.map((pin) => ({ ...pin, badge: badgePositions.get(pin.station.id) })));
      }

      if (isSoftwareGl) {
        afterDraw(() => {
          if (!disposed) rafId = requestAnimationFrame(animate);
        });
      } else {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', onControlStart);
      controls.dispose();

      // Dispose all geometries, materials, and textures cleanly
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else if (mat) {
          mat.dispose();
        }
      });
      skyTex.dispose();
      terrainBump.dispose();
      terrainRough.dispose();
      tex.dispose();
      plinthTex.dispose();
      cloudTex.dispose();
      solarTex.dispose();
      contactShadowTex.dispose();
      if (riverWaterTex) riverWaterTex.dispose();
      envTarget.dispose();
      renderer.dispose();
      sceneObjsRef.current = null;
    };
  }, [regionId]);

  // Update the simulation texture and explicitly artistic height warp.
  useEffect(() => {
    const objs = sceneObjsRef.current;
    if (!objs) return;

    const rawWarp = new Float32Array(regDem.rows * regDem.cols);
    // LOS is not vertical motion. This authored warp is for visual explanation only.
    for (let r = 0; r < regDem.rows; r++) {
      const v = r / (regDem.rows - 1);
      for (let c = 0; c < regDem.cols; c++) {
        const u = c / (regDem.cols - 1);
        const idx = r * regDem.cols + c;
        const def = computeRegionalDeformationM(regionId, u, v, currentPass);
        const visualDeformUnits = artisticLosHeightKm(def.losMeters, losHeightExaggeration);
        rawWarp[idx] = Math.max(-0.28, objs.baseHeightsKm[idx] + visualDeformUnits);
      }
    }
    const smoothedWarp = smoothHeightGrid(rawWarp, regDem.cols, regDem.rows, 1, 0.35);
    objs.dynamicHeightsKm.set(smoothedWarp);
    objs.heightsDirty = true;

    const canvas = buildRegionalRasterCanvas(regionId, layerMode, currentPass, 0, 3);
    const maxAniso = Math.min(8, objs.renderer.capabilities.getMaxAnisotropy());
    const newTex = createSmoothTerrainTexture(canvas, maxAniso);
    if (objs.terrainMat.map) objs.terrainMat.map.dispose();
    objs.terrainMat.map = newTex;
    objs.terrainMat.needsUpdate = true;

    objs.wireMesh.visible = layerMode === 'retro_wireframe';
    objs.wireMat.opacity = layerMode === 'retro_wireframe' ? 0.32 : 0.0;
    const swathMat = objs.swathCone.material as THREE.MeshBasicMaterial;
    swathMat.color.set(layerMode === 'lband_insar' ? '#e879f9' : '#38bdf8');
  }, [regionId, layerMode, currentPass, regDem]);

  // Sync Relief Exaggeration, Cloud Deck, and Player Scout 3D Beacon
  useEffect(() => {
    animStateRef.current.targetReliefMultiplier = reliefScale;
    const objs = sceneObjsRef.current;
    if (!objs) return;
    objs.heightsDirty = true;
    const { x, z } = uvToWorldXZ(playerUV.u, playerUV.v);
    const elev = sampleRegionalElevationAtUV(regionId, playerUV.u, playerUV.v);
    const y = elevToUnit(elev) * reliefScale * animStateRef.current.extrude;
    objs.playerBeacon.position.set(x, y, z);
    (objs.cloudMesh.material as THREE.MeshBasicMaterial).opacity =
      showCloudDeck3D ? Math.max(0.28, (currentPass.cloudCoverPct / 100) * 0.72) : 0.0;
  }, [reliefScale, playerUV, showCloudDeck3D, currentPass, regionId]);

  // Smooth 2D <-> 3D Extrusion Transitions
  useEffect(() => {
    const objs = sceneObjsRef.current;
    if (!objs) return;
    const st = animStateRef.current;

    if (dimension === 'transition-to-3d') {
      const dest = getStationCameraPose(activeStation, reliefScale);
      if (objs.isSoftwareGl) {
        st.extrude = 1.0;
        st.flyProgress = 1;
        st.onFlyDone = null;
        objs.camera.position.copy(dest.pos);
        objs.controls.target.copy(dest.target);
        objs.controls.enabled = true;
        objs.heightsDirty = true;
        setMorphPercent(100);
        onTransitionComplete('3d');
        return;
      }

      objs.controls.enabled = false;
      st.extrude = 0.35;
      objs.camera.position.set(0, 28.5 * mapCameraScale, 0.02);
      objs.controls.target.set(0, 0, 0);

      st.flyFromPos = objs.camera.position.clone();
      st.flyToPos = dest.pos;
      st.flyFromTarget = new THREE.Vector3(0, 0, 0);
      st.flyToTarget = dest.target;
      st.flyDurationMs = 700;
      st.flyStartTime = performance.now();
      st.flyProgress = 0;

      const start = performance.now();
      const morphInterval = window.setInterval(() => {
        const p = Math.min(1, (performance.now() - start) / 700);
        const e = easeInOutCubic(p);
        st.extrude = 0.35 + e * 0.65;
        objs.heightsDirty = true;
        setMorphPercent(Math.round(p * 100));
        if (p >= 1) clearInterval(morphInterval);
      }, 16);

      st.onFlyDone = () => {
        clearInterval(morphInterval);
        st.extrude = 1.0;
        objs.heightsDirty = true;
        setMorphPercent(100);
        objs.controls.enabled = true;
        onTransitionComplete('3d');
      };

      return () => clearInterval(morphInterval);
    }

    if (dimension === '3d') {
      st.extrude = 1.0;
      objs.heightsDirty = true;
      objs.controls.enabled = true;
      if (Math.abs(objs.camera.position.z) < 0.2) {
        const dest = getStationCameraPose(activeStation, reliefScale);
        objs.camera.position.copy(dest.pos);
        objs.controls.target.copy(dest.target);
      }
    }

    if (dimension === 'transition-to-2d') {
      objs.controls.enabled = false;
      st.flyFromPos = objs.camera.position.clone();
      st.flyToPos = new THREE.Vector3(0, 28.5 * mapCameraScale, 0.02);
      st.flyFromTarget = objs.controls.target.clone();
      st.flyToTarget = new THREE.Vector3(0, 0, 0);
      st.flyDurationMs = 1100;
      st.flyStartTime = performance.now();
      st.flyProgress = 0;

      const start = performance.now();
      const revInterval = window.setInterval(() => {
        const p = Math.min(1, (performance.now() - start) / 1100);
        st.extrude = 1.0 - easeInOutCubic(p);
        objs.heightsDirty = true;
        setMorphPercent(Math.round((1 - p) * 100));
        if (p >= 1) clearInterval(revInterval);
      }, 16);

      st.onFlyDone = () => {
        clearInterval(revInterval);
        st.extrude = 0.0;
        onTransitionComplete('2d');
      };

      return () => clearInterval(revInterval);
    }
  }, [dimension]);

  const flyCameraToStation = (station: Station | null) => {
    const objs = sceneObjsRef.current;
    if (!objs || dimension !== '3d') return;
    retroAudio.playUiClick(680);
    if (station) onSelectStation(station);
    const dest = getStationCameraPose(station, reliefScale);
    const st = animStateRef.current;
    st.flyFromPos = objs.camera.position.clone();
    st.flyToPos = dest.pos;
    st.flyFromTarget = objs.controls.target.clone();
    st.flyToTarget = dest.target;
    st.flyDurationMs = 1050;
    st.flyStartTime = performance.now();
    st.flyProgress = 0;
  };

  useEffect(() => {
    if (!focusTriggerSeq || dimension !== '3d') return;
    flyCameraToStation(activeStation);
  }, [focusTriggerSeq, dimension, activeStation?.id]);

  const startProcessSimulation = () => {
    retroAudio.playSirenAlert();
    flyCameraToStation(null);
    setCascadeSimProgress(0);
  };

  // Region-Specific 3D Geophysical Process Simulation
  useEffect(() => {
    if (cascadeSimProgress === null) return;
    const objs = sceneObjsRef.current;
    const start = performance.now();
    const duration = 6400;

    const timer = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / duration);
      setCascadeSimProgress(t);

      if (objs) {
        const children = objs.cascadeGroup.children;
        const rings = objs.seismicRingsGroup.children;

        if (regionId === 'yukon_alaska') {
          children.forEach((mesh, idx) => {
            mesh.visible = true;
            const rowFrac = idx / Math.max(1, children.length - 1);
            const wavePhase = ((t * 2.4 + (idx % 3) * 0.25) % 1);
            const u = 0.04 + wavePhase * 0.275;
            const v = 0.1 + rowFrac * 0.8;
            const { x, z } = uvToWorldXZ(u, v);
            const surfElev = sampleRegionalElevationAtUV(regionId, u, v);
            const y = elevToUnit(surfElev) * reliefScale + 0.22 + Math.sin(wavePhase * Math.PI) * 0.28;
            mesh.position.set(x, y, z);
            mesh.rotation.z += 0.14;
          });
          rings.forEach((r) => (r.visible = false));
        } else {
          children.forEach((mesh, idx) => {
            const headT = t * 1.18 - idx * 0.02;
            if (headT < 0 || headT > 1) {
              mesh.visible = false;
              return;
            }
            mesh.visible = true;
            const segFloat = headT * (regPath.length - 1);
            const s0 = Math.min(regPath.length - 2, Math.floor(segFloat));
            const frac = segFloat - s0;
            const [u1, v1] = regPath[s0];
            const [u2, v2] = regPath[s0 + 1];
            const u = u1 + (u2 - u1) * frac;
            const v = v1 + (v2 - v1) * frac;
            const { x, z } = uvToWorldXZ(u, v);
            const elev = sampleRegionalElevationAtUV(regionId, u, v);
            const y = elevToUnit(elev) * reliefScale + 0.26;
            mesh.position.set(
              x + Math.sin(idx * 3.1 + t * 22) * 0.16,
              y + Math.abs(Math.sin(t * 26 + idx)) * 0.2,
              z + Math.cos(idx * 2.7 + t * 22) * 0.16
            );
            mesh.rotation.x += 0.14;
            mesh.rotation.z += 0.12;
          });

          if (regionId === 'hatay_turkiye' || regionId === 'san_joaquin_usa') {
            const centerUV =
              regionId === 'hatay_turkiye' ? { u: 0.62, v: 0.41 } : { u: 0.62, v: 0.49 };
            const { x: cx, z: cz } = uvToWorldXZ(centerUV.u, centerUV.v);
            const cy =
              elevToUnit(sampleRegionalElevationAtUV(regionId, centerUV.u, centerUV.v)) *
                reliefScale +
              0.35;

            rings.forEach((ring, rIdx) => {
              const rPhase = ((t * 2.2 - rIdx * 0.22) % 1 + 1) % 1;
              ring.visible = true;
              const radius = 0.6 + rPhase * 9.5;
              ring.position.set(cx, cy, cz);
              ring.scale.set(radius, radius, 1);
              ((ring as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
                (1 - rPhase) * 0.78;
            });
          } else {
            rings.forEach((r) => (r.visible = false));
          }
        }
      }

      if (t >= 1) {
        clearInterval(timer);
        window.setTimeout(() => {
          if (sceneObjsRef.current) {
            sceneObjsRef.current.cascadeGroup.children.forEach((m) => (m.visible = false));
            sceneObjsRef.current.seismicRingsGroup.children.forEach((m) => (m.visible = false));
          }
          setCascadeSimProgress(null);
        }, 900);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [cascadeSimProgress !== null, regionId, reliefScale]);

  const isTransitioning =
    dimension === 'transition-to-3d' || dimension === 'transition-to-2d';

  return (
    <div className="terrain-3d-workbench">
      <section className="terrain-3d-wrapper" aria-label="3D simulation viewport">
        <div
          ref={mountRef}
          className="terrain-3d-canvas-host"
          aria-label="Illustrative 3D terrain with simulated radar texture"
        />

        {/* Dynamic Region-Accurate 3D Mountain View Banner */}
        {isTransitioning && (
          <div className="retro-morph-banner">
            <div className="morph-title">
              {dimension === 'transition-to-3d'
                ? `🛰️ BUILDING 3D MOUNTAIN VIEW // ${regionDef.name.toUpperCase()} (${Math.round(regDem.minElev)}m → ${Math.round(regDem.maxElev)}m)`
                : `🗺️ SWITCHING BACK TO FLAT 2D MAP // ${regionDef.name.toUpperCase()}`}
            </div>
            <div className="morph-progress-track">
              <div className="morph-progress-fill" style={{ width: `${morphPercent}%` }} />
            </div>
            <div className="morph-sub">
              PRACTICE RADAR MAP (NOT REAL SATELLITE MEASUREMENTS) • {morphPercent}%
            </div>
          </div>
        )}

        {/* Keep displaced badge labels connected to their original projected masts. */}
        {!isTransitioning && (
          <svg
            className="pin-3d-leaders"
            aria-hidden="true"
            focusable="false"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 11 }}
          >
            {projectedPins.map(({ station, screenX, screenY, visible, badge }) => visible && badge && (
              <line
                key={station.id}
                x1={screenX}
                y1={screenY}
                x2={Math.max(badge.x, Math.min(screenX, badge.x + badge.width))}
                y2={Math.max(badge.y, Math.min(screenY, badge.y + badge.height))}
                stroke={station.accentColor}
                strokeWidth={1}
              />
            ))}
          </svg>
        )}

        {/* Projected 3D Station Pins anchored to 3D Corner-Reflector Masts */}
        {!isTransitioning &&
          projectedPins.map(
            ({ station, screenX, screenY, visible, badge }) =>
              visible && (
                <button
                  key={station.id}
                  type="button"
                  ref={(element) => {
                    if (element) pinLabelRefs.current.set(station.id, element);
                    else pinLabelRefs.current.delete(station.id);
                  }}
                  className={`pin-3d-label ${station.id === activeStation.id ? 'selected' : ''}`}
                  data-story-solved={highlightedStationIds?.includes(station.id) ? 'true' : undefined}
                  style={{
                    left: `${badge ? badge.x : screenX}px`,
                    top: `${badge ? badge.y : screenY}px`,
                    transform: 'none',
                    visibility: badge ? 'visible' : 'hidden',
                    borderColor: station.accentColor
                  }}
                  aria-label={`Select ${station.code}: ${station.name}; illustrated elevation ${station.elevationM}m${highlightedStationIds?.includes(station.id) ? ' (Story Mission Solved)' : ''}`}
                  aria-pressed={station.id === activeStation.id}
                  title={`${getShort3DPinName(station)} • Illustrated ${station.elevationM}m${highlightedStationIds?.includes(station.id) ? ' • ✓ Story Solved' : ''}`}
                  onClick={() => flyCameraToStation(station)}
                >
                  <span className="pin-code" style={{ background: station.accentColor }}>
                    {station.code}{highlightedStationIds?.includes(station.id) ? ' ✓' : ''}
                  </span>
                </button>
              )
          )}
      </section>

      {/* Collapsible Bottom Control Dock outside the geographic viewport */}
      <aside className="terrain-3d-instruments" aria-label="3D instruments">
        <div className="terrain-dock-topbar">
          <p className="terrain-station-caption">
            <strong>{activeStation.code} / {activeStation.name}</strong> • Illustrated elevation: {activeStation.elevationM}m (unverified)
          </p>
          <button
            type="button"
            className="retro-chip-btn"
            onClick={() => setControlsCollapsed((c) => !c)}
            aria-expanded={!controlsCollapsed}
          >
            {controlsCollapsed ? '▴ Show 3D Controls' : '▾ Hide 3D Controls'}
          </button>
        </div>

        {!controlsCollapsed && (
          <div className="terrain-dock-grid">
            <div className="terrain-dock-col">
              {/* Camera Fly-To Waypoint Bar */}
              <div className="flyto-bar-3d">
                <button
                  type="button"
                  className="flyto-chip"
                  onClick={() => flyCameraToStation(null)}
                >
                  🦅 Regional Overview
                </button>
                {regStations.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    className={`flyto-chip ${st.id === activeStation.id ? 'active' : ''}`}
                    aria-pressed={st.id === activeStation.id}
                    aria-label={`Fly to ${st.name} (${st.code})`}
                    title={`${st.name} • Illustrated ${st.elevationM}m`}
                    onClick={() => flyCameraToStation(st)}
                  >
                    {st.code}
                  </button>
                ))}
              </div>

              <div className="world-overlay-actions top-left-3d">
                <button
                  type="button"
                  className="retro-chip-btn active-amber"
                  onClick={startProcessSimulation}
                  disabled={cascadeSimProgress !== null}
                  title={simMeta.tooltip}
                >
                  {simMeta.icon}{' '}
                  {cascadeSimProgress !== null
                    ? `${simMeta.runningPrefix} (${Math.round(cascadeSimProgress * 100)}%)`
                    : simMeta.idleLabel}
                </button>

                <button
                  type="button"
                  className={`retro-chip-btn ${showCloudDeck3D ? 'active-cyan' : ''}`}
                  onClick={() => {
                    retroAudio.playUiClick(620);
                    setShowCloudDeck3D((v) => !v);
                  }}
                >
                  ☁️ {showCloudDeck3D ? 'CLOUDS: ON' : 'SHOW CLOUDS'}
                </button>
              </div>

              <details className="terrain-settings">
                <summary>Mountain Height</summary>
                <div className="panel-3d-controls top-right">
                  <label className="relief-slider-row">
                    <span>MOUNTAIN HEIGHT: {(baseVerticalExaggeration * reliefScale).toFixed(1)}×</span>
                    <input
                      type="range"
                      min={0.8}
                      max={2.2}
                      step={0.1}
                      value={reliefScale}
                      onChange={(e) => setReliefScale(parseFloat(e.target.value))}
                    />
                  </label>
                </div>
              </details>
            </div>

            <div className="terrain-dock-col">
              {!isTransitioning && (
                <div className="scientific-legend-overlay three-d-legend">
                  <div className="sci-legend-head">
                    <strong>SIMULATION • {legend.title}</strong>
                    <span>{legend.unit}</span>
                  </div>
                  <div className="sci-legend-bar" style={{ background: legend.gradientCss }} />
                  <div className="sci-legend-ticks">
                    <span>{legend.minLabel}</span>
                    <span>{legend.midLabel}</span>
                    <span>{legend.maxLabel}</span>
                  </div>
                </div>
              )}
              <small className="illustrative-height-note">
                Visual effect only — ARTISTIC LOS→HEIGHT (heights stretched ×{Math.round(losHeightExaggeration * reliefScale)} to help you see, not vertical ground motion).
              </small>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
