import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LHENDE_BHOTE_RIVER_PATH } from '../data/rasuwaStoryData';
import {
  GLOBAL_REGIONS_ATLAS,
  ORDERED_GLOBAL_REGIONS
} from '../data/globalRegionsAtlas';
import {
  fetchNasaPowerTelemetry,
  getNasaGibsTileUrl,
  GlobalRegionId,
  NasaPowerTelemetry
} from '../services/nasaEarthDataService';
import {
  COMPLEMENTARY_NASA_FLEET_CARDS,
  CRYPTOGRAPHIC_PROVENANCE_MANIFESTS,
  FIVE_STAGE_RASUWA_TIMELINE,
  MULTI_SENSOR_PHYSICS_COMPARISON,
  RASUWA_AOI_BOUNDS,
  VERIFIED_SAR_ACQUISITION_CATALOG
} from '../services/sarAcquisitionService';
import { RadarLayerMode, Station, ViewDimension } from '../types';
import { RASUWA_DATUM_STATIC_FACTS } from '../services/rasuwaDatumService';
import { RasuwaDatumExplorer } from './RasuwaDatumExplorer';
import { layoutMapBadges } from '../utils/mapLabelLayout';
import {
  buildRegionalRasterCanvas,
  computeRegionalDeformationM,
  getLayerLegendSpec,
  getRegionalDem,
  HATAY_ASI_RIVER,
  sampleRegionalElevationAtUV
} from '../utils/regionalDemGenerator';
import {
  OFFICIAL_CHALLENGE_RESOURCES,
  PYTHON_QGIS_RECIPE,
} from '../data/officialResources';
import { TerrainMap3D } from './TerrainMap3D';
import { retroAudio } from '../audio/retroAudioAndVoice';

export type MainframeAppId =
  | 'observatory'
  | 'curtain'
  | 'physics'
  | 'nasa_live'
  | 'resources'
  | 'warning';

interface LabSupercomputerScreenProps {
  isOpen: boolean;
  regionId?: GlobalRegionId;
  onSelectRegion?: (regionId: GlobalRegionId) => void;
  onStepBackToLab: () => void;
  scannedBeaconIds: string[];
  interviewedNpcIds: string[];
  verifiedHypothesisIds?: string[];
  onVerifyHypothesis?: (stationId: string) => void;
  earlyWarningArmed: boolean;
  onArmEarlyWarning: () => void;
  onOpenIncidentPhotos?: (stationId?: string) => void;
  onOpenIntervention?: () => void;
  onOpenWorldAtlas?: () => void;
  onViewed3D?: () => void;
  onReturnToStory?: () => void;
  initialStationId?: string;
  initialDimension?: '2d' | '3d';
  solvedStoryChapters?: string[];
  onJumpToStoryChapter?: (chapterId: string) => void;
}

const STORY_CHAPTER_STATION_BRIDGE: Array<{
  chapterId: string;
  stationId: string;
  title: string;
  fieldAction: string;
}> = [
  {
    chapterId: 'chapter-1',
    stationId: 'syabrubesi',
    title: 'Ch.1 Flood Mapper',
    fieldAction: 'Lali tagged flooded riverbanks & mud canals',
  },
  {
    chapterId: 'chapter-2',
    stationId: 'chilime',
    title: 'Ch.2 Hydro Dam Creep',
    fieldAction: 'Shut 3 gates + locked L-band InSAR fringes',
  },
  {
    chapterId: 'chapter-3',
    stationId: 'timure',
    title: 'Ch.3 Breach Escape',
    fieldAction: 'Warned Timure villagers above boulder jam',
  },
  {
    chapterId: 'chapter-4',
    stationId: 'miteri_bridge',
    title: 'Ch.4 Avalanche Scar',
    fieldAction: 'Swept radar over Miteri border scar',
  },
  {
    chapterId: 'chapter-5',
    stationId: 'purugu_glacier',
    title: 'Ch.5 Screening Verdict',
    fieldAction: 'Adopted rain-gauge + radar regional screening',
  },
];

function getCleanStationLabel(st: Station): string {
  const customMap: Record<string, string> = {
    syabrubesi: 'SYABRUBESI DOBHAN',
    chilime: 'CHILIME TERRACES',
    timure: 'TIMURE CANYON',
    rasuwagadhi_hydro: 'RASUWAGADHI DAM',
    miteri_bridge: 'MITERI BRIDGE',
    purugu_glacier: 'PURUGU GLACIER',
    br_palafita_vila: 'VILA PALAFITA',
    br_peat_channel: 'CORIXO PEAT',
    br_logging_front: 'LOGGING FRONT',
    ca_hydro_station: 'HYDRO COOPERATIVA',
    ca_corcoran_bowl: 'CORCORAN BOWL',
    ca_aqueduct_levee: 'AQUEDUCT LEVEE',
    tr_antakya_havus: 'ANTAKYA BASIN',
    tr_fault_olive: 'PAZARCIK FAULT',
    tr_dam_crest: 'DAM CREST',
    ak_yupik_boardwalk: 'YUP’IK VILLAGE',
    ak_bluff_erosion: 'COASTAL BLUFF',
    ak_stable_ridge: 'GRAVEL RIDGE'
  };
  if (customMap[st.id]) return customMap[st.id];
  return st.name.split('&')[0].trim().slice(0, 18).toUpperCase();
}

export const LabSupercomputerScreen: React.FC<LabSupercomputerScreenProps> = ({
  isOpen,
  regionId = 'rasuwa_nepal',
  onSelectRegion,
  onStepBackToLab,
  scannedBeaconIds,
  verifiedHypothesisIds = [],
  onVerifyHypothesis,
  earlyWarningArmed,
  onArmEarlyWarning,
  onOpenIncidentPhotos,
  onOpenIntervention,
  onOpenWorldAtlas,
  onViewed3D,
  onReturnToStory,
  initialStationId,
  initialDimension = '2d',
  solvedStoryChapters = [],
  onJumpToStoryChapter
}) => {
  const regionDef = GLOBAL_REGIONS_ATLAS[regionId];
  const regDem = useMemo(() => getRegionalDem(regionId), [regionId]);
  const regStations = regionDef.stations;
  const regPasses = regionDef.passes;
  const regPath =
    regionId === 'rasuwa_nepal' ? LHENDE_BHOTE_RIVER_PATH : regionDef.riverOrFaultPathUV;

  const [activeApp, setActiveApp] = useState<MainframeAppId>('observatory');
  const [resourceAgency, setResourceAgency] = useState<
    'ALL' | 'NASA' | 'CSA (Canada)' | 'CONAE (Argentina)'
  >('ALL');
  const [copiedRecipe, setCopiedRecipe] = useState(false);
  const [dimension, setDimension] = useState<ViewDimension>(initialDimension);
  const [focusTriggerSeq, setFocusTriggerSeq] = useState<number>(0);
  const [sideTab, setSideTab] = useState<'dossier' | 'hypothesis'>('dossier');
  const [quizGuessByStation, setQuizGuessByStation] = useState<Record<string, number>>({});
  const [passIndex, setPassIndex] = useState<number>(
    0
  );
  const [layerMode, setLayerMode] = useState<RadarLayerMode>(
    regionId === 'pantanal_brazil' ? 'sar_rgb' : 'lband_insar'
  );
  const [activeStation, setActiveStation] = useState<Station>(
    () =>
      regStations.find((s) => s.id === initialStationId) ||
      regStations[regStations.length - 1]
  );
  const [isAutoWaltz, setIsAutoWaltz] = useState(false);
  const [xrayHoverUV, setXrayHoverUV] = useState<{ u: number; v: number } | null>(null);
  const [rudraConsoleTip, setRudraConsoleTip] = useState<string>(
    `${regionDef.labBuildingName.toUpperCase()} ONLINE! Viewing ${regionDef.name} (${regionDef.coordsLabel}). Click "⛰️ SHOW IN 3D" to explore illustrative relief, or hover on the 2D screen to inspect simulated multi-band values. No local measurement or forecast.`
  );
  const [powerTelemetry, setPowerTelemetry] = useState<NasaPowerTelemetry | null>(null);

  const highlightedStoryStations = useMemo(
    () =>
      STORY_CHAPTER_STATION_BRIDGE.filter((b) => solvedStoryChapters.includes(b.chapterId)).map(
        (b) => b.stationId
      ),
    [solvedStoryChapters]
  );
  const [gibsFailed, setGibsFailed] = useState(false);
  const [gibsLoaded, setGibsLoaded] = useState(false);
  useEffect(() => { setGibsFailed(false); setGibsLoaded(false); }, [regionId]);

  // Split Curtain state
  const [curtainPreset, setCurtainPreset] = useState<'clouds_vs_insar' | 'before_vs_after'>(
    'clouds_vs_insar'
  );
  const [splitPct, setSplitPct] = useState(50);
  const leftCurtainRef = useRef<HTMLCanvasElement | null>(null);
  const rightCurtainRef = useRef<HTMLCanvasElement | null>(null);

  // Physics Lab state
  const [dielectric, setDielectric] = useState(78);
  const [roughnessCm, setRoughnessCm] = useState(1.2);
  const [hasCornerWalls, setHasCornerWalls] = useState(regionId !== 'pantanal_brazil');
  const [hasCanopy, setHasCanopy] = useState(regionId === 'pantanal_brazil');
  const [bandChoice, setBandChoice] = useState<'L' | 'S'>('L');
  const [polChoice, setPolChoice] = useState<'HH' | 'HV' | 'VV'>(
    regionId === 'pantanal_brazil' ? 'HV' : 'HH'
  );
  const physicsCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Early Warning state
  const [creepThresholdMm, setCreepThresholdMm] = useState(18);
  const [moistureTriggerPct, setMoistureTriggerPct] = useState(74);
  const [aiRelayEnabled, setAiRelayEnabled] = useState(true);
  const [nasaSubTab, setNasaSubTab] = useState<
    'rasuwa_datum' | 'fleet' | 'catalog' | 'timeline' | 'multisensor' | 'manifests'
  >('rasuwa_datum');
  const [activeManifestKey, setActiveManifestKey] = useState<
    'hubbard_nisar_case1' | 'rasuwa_sentinel1_case2'
  >('hubbard_nisar_case1');

  const canvas2dRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const defPass =
      regionId === 'rasuwa_nepal'
        ? 0
        : Math.min(2, regPasses.length - 1);
    setPassIndex(defPass);
    setDimension(initialDimension);
    setLayerMode(regionId === 'pantanal_brazil' ? 'sar_rgb' : 'lband_insar');
    setActiveStation(
      regStations.find((s) => s.id === initialStationId) ||
        regStations[regStations.length - 1]
    );
    setRudraConsoleTip(
      `${regionDef.labBuildingName.toUpperCase()} ONLINE! ${regionDef.leadScientistName}: "${regionDef.scientificIntegrity.whySarAloneIsInsufficient}"`
    );
  }, [regionId, initialStationId, initialDimension]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialDimension === '3d') {
      setActiveApp('observatory');
      setDimension('transition-to-3d');
      onViewed3D?.();
    }
    let active = true; setPowerTelemetry(null);
    fetchNasaPowerTelemetry(regionDef.id, regionDef.lat, regionDef.lon).then(data => { if (active) setPowerTelemetry(data); });
    retroAudio.speakMentor(rudraConsoleTip, 'radar');
    return () => { active = false; };
  }, [isOpen, regionDef.id, initialDimension]);

  const safePassIdx = Math.min(passIndex, regPasses.length - 1);
  const currentPass = regPasses[safePassIdx] || regPasses[0];
  const legend = useMemo(() => getLayerLegendSpec(layerMode, regionId), [layerMode, regionId]);

  // Live cursor geodetic telemetry readout
  const cursorReadout = useMemo(() => {
    if (!xrayHoverUV) return null;
    const lat =
      regDem.bounds.latMax - xrayHoverUV.v * (regDem.bounds.latMax - regDem.bounds.latMin);
    const lon =
      regDem.bounds.lonMin + xrayHoverUV.u * (regDem.bounds.lonMax - regDem.bounds.lonMin);
    const elev = Math.round(sampleRegionalElevationAtUV(regionId, xrayHoverUV.u, xrayHoverUV.v));
    const def = computeRegionalDeformationM(regionId, xrayHoverUV.u, xrayHoverUV.v, currentPass);
    return {
      latStr: `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}`,
      lonStr: `${Math.abs(lon).toFixed(3)}°${lon >= 0 ? 'E' : 'W'}`,
      elev,
      losCm: (def.losMeters * 100).toFixed(1),
      isValid: def.isValid !== false
    };
  }, [xrayHoverUV, regDem, regionId, currentPass]);

  // Auto-play time-series waltz
  useEffect(() => {
    if (!isOpen || !isAutoWaltz) return;
    const timer = window.setInterval(() => {
      setPassIndex((prev) => {
        const next = (prev + 1) % regPasses.length;
        const p = regPasses[next];
        setRudraConsoleTip(p.mentorNarration);
        retroAudio.speakMentor(p.mentorNarration, p.mentorMood);
        return next;
      });
    }, 4800);
    return () => clearInterval(timer);
  }, [isOpen, isAutoWaltz, regPasses]);

  // Render High-Resolution 2D Radar Monitor Map + Scientific Vector Overlays
  useEffect(() => {
    if (!isOpen || activeApp !== 'observatory' || dimension !== '2d') return;
    const base = buildRegionalRasterCanvas(regionId, layerMode, currentPass, 0, 3);
    const lensLayer: RadarLayerMode =
      layerMode === 'optical'
        ? regionId === 'pantanal_brazil'
          ? 'sar_rgb'
          : 'lband_insar'
        : 'optical';
    const alt = buildRegionalRasterCanvas(regionId, lensLayer, currentPass, 0, 3);

    let raf = 0;
    let frame = 0;
    const draw = () => {
      frame++;
      const c = canvas2dRef.current;
      if (!c) return;
      // Keep overlays in display pixels so labels and reticles do not get squashed.
      const W = Math.max(1, c.clientWidth);
      const H = Math.max(1, c.clientHeight);
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
      }
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(base, 0, 0, W, H);

      // Contextual Geophysical Vector Overlay (NO random white square dots!)
      if (regionId === 'hatay_turkiye') {
        // Draw Asi (Orontes) River subtle cyan flow trace
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        HATAY_ASI_RIVER.forEach(([ru, rv], idx) => {
          if (idx === 0) ctx.moveTo(ru * W, rv * H);
          else ctx.lineTo(ru * W, rv * H);
        });
        ctx.stroke();

        // Draw East Anatolian Fault Trace (dashed crimson/amber tectonic trace!)
        ctx.strokeStyle = currentPass.index >= 1 ? '#f43f5e' : 'rgba(250, 204, 21, 0.78)';
        ctx.lineWidth = currentPass.index >= 1 ? 3.2 : 2.2;
        ctx.setLineDash([12, 7]);
        ctx.beginPath();
        regPath.forEach(([fu, fv], idx) => {
          if (idx === 0) ctx.moveTo(fu * W, fv * H);
          else ctx.lineTo(fu * W, fv * H);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Fault label along trace
        ctx.font = '700 13px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.fillRect(W * 0.53, H * 0.49, 215, 22);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(W * 0.53, H * 0.49, 215, 22);
        ctx.fillStyle = '#fda4af';
        ctx.fillText('⇌ EAST ANATOLIAN FAULT', W * 0.53 + 7, H * 0.49 + 15);
        ctx.restore();
      } else if (regionId === 'yukon_alaska') {
        // Draw Coastal Bluff Retreat Hazard Line along Bering Sea coast
        ctx.save();
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.85)';
        ctx.lineWidth = 2.6;
        ctx.setLineDash([9, 6]);
        ctx.beginPath();
        regPath.forEach(([bu, bv], idx) => {
          if (idx === 0) ctx.moveTo(bu * W, bv * H);
          else ctx.lineTo(bu * W, bv * H);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else {
        // River / Aqueduct animated streamlines for Nepal, Brazil, California
        ctx.save();
        ctx.strokeStyle =
          currentPass.phaseTag === 'CATASTROPHE'
            ? 'rgba(250, 204, 21, 0.75)'
            : 'rgba(125, 211, 252, 0.65)';
        ctx.lineWidth = 2.6;
        ctx.setLineDash([10, 12]);
        ctx.lineDashOffset = -(frame * 0.8);
        ctx.beginPath();
        regPath.forEach(([pu, pv], idx) => {
          if (idx === 0) ctx.moveTo(pu * W, pv * H);
          else ctx.lineTo(pu * W, pv * H);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Hover Multi-Band X-Ray Looking-Glass Lens!
      if (xrayHoverUV) {
        const lx = xrayHoverUV.u * W;
        const ly = xrayHoverUV.v * H;
        const radius = 98;
        ctx.save();
        ctx.beginPath();
        ctx.arc(lx, ly, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(alt, 0, 0, W, H);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(lx, ly, radius, 0, Math.PI * 2);
        ctx.stroke();

        const lensTitle =
          lensLayer === 'optical'
            ? 'NORMAL PHOTO'
            : lensLayer === 'sar_rgb'
              ? 'TREES & FLOODS RADAR'
              : 'GROUND MOVEMENT RADAR';
        ctx.font = '700 12px "JetBrains Mono", monospace';
        const lw = ctx.measureText(lensTitle).width + 14;
        const lbx = Math.max(8, Math.min(W - lw - 8, lx - lw / 2));
        const lby = ly > radius + 34 ? ly - radius - 26 : ly + radius + 8;
        ctx.fillStyle = 'rgba(4, 12, 26, 0.9)';
        ctx.fillRect(lbx, lby, lw, 20);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(lbx, lby, lw, 20);
        ctx.fillStyle = '#bae6fd';
        ctx.fillText(lensTitle, lbx + 7, lby + 14);
        ctx.restore();
      }

      // North Arrow & Metric Scale Bar (Top-Right of 2D Monitor)
      ctx.save();
      const sbX = W - 156;
      const sbY = 18;
      ctx.fillStyle = 'rgba(4, 10, 24, 0.82)';
      ctx.fillRect(sbX, sbY, 138, 42);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sbX, sbY, 138, 42);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText('▲ N', sbX + 10, sbY + 17);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('10 km', sbX + 68, sbY + 17);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sbX + 12, sbY + 30);
      ctx.lineTo(sbX + 124, sbY + 30);
      ctx.moveTo(sbX + 12, sbY + 25);
      ctx.lineTo(sbX + 12, sbY + 34);
      ctx.moveTo(sbX + 124, sbY + 25);
      ctx.lineTo(sbX + 124, sbY + 34);
      ctx.stroke();
      ctx.restore();

      // Station Radar Reticle Pins & Crisp Badges
      ctx.font = '700 14px "JetBrains Mono", monospace';
      const badgePositions = new Map(
        layoutMapBadges(regStations.map((st) => ({
          id: st.id,
          anchorX: Math.round(st.u * W),
          anchorY: Math.round(st.v * H),
          width: ctx.measureText(`${st.code}${verifiedHypothesisIds.includes(st.id) ? ' ✓' : ''}`).width + 16,
          height: 24,
          selected: st.id === activeStation.id
        })), W, H).map((badge) => [badge.id, badge])
      );
      for (const st of regStations) {
        const sx = Math.round(st.u * W);
        const sy = Math.round(st.v * H);
        const isSel = st.id === activeStation.id;
        const hasBeacon = scannedBeaconIds.includes(st.id);
        const isVerified = verifiedHypothesisIds.includes(st.id);

        // Pulsing outer radar lock ring when selected
        if (isSel) {
          const pulseR = 16 + ((frame * 0.45) % 14);
          ctx.strokeStyle = st.accentColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(sx, sy, pulseR, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Crosshair ticks
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(sx, sy, 9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = hasBeacon ? '#4ade80' : st.accentColor;
        ctx.beginPath();
        ctx.arc(sx, sy, 7.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();

        const tag = `${st.code}${isVerified ? ' ✓' : ''}`;
        const badge = badgePositions.get(st.id);
        if (!badge) continue;
        const padX = 8;
        const boxW = badge.width;
        const boxH = badge.height;
        const bx = badge.x;
        const by = badge.y;

        ctx.fillStyle = isSel ? st.accentColor : 'rgba(4, 10, 24, 0.9)';
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = isSel ? '#f8fafc' : st.accentColor;
        ctx.lineWidth = 1.8;
        ctx.strokeRect(bx, by, boxW, boxH);

        ctx.fillStyle = isSel ? '#020617' : '#f8fafc';
        ctx.fillText(tag, bx + padX, by + 17);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    isOpen,
    regionId,
    activeApp,
    dimension,
    layerMode,
    currentPass,
    activeStation,
    xrayHoverUV,
    scannedBeaconIds,
    verifiedHypothesisIds
  ]);

  // Render Split Curtain when activeApp === 'curtain'
  useEffect(() => {
    if (!isOpen || activeApp !== 'curtain') return;
    const leftMode: RadarLayerMode = curtainPreset === 'clouds_vs_insar' ? 'optical' : 'pixel';
    const rightMode: RadarLayerMode =
      curtainPreset === 'clouds_vs_insar'
        ? regionId === 'pantanal_brazil'
          ? 'sar_rgb'
          : 'lband_insar'
        : 'sar_rgb';
    const lp =
      curtainPreset === 'clouds_vs_insar'
        ? regPasses[Math.min(2, regPasses.length - 1)]
        : regPasses[0];
    const rp =
      curtainPreset === 'clouds_vs_insar'
        ? regPasses[Math.min(2, regPasses.length - 1)]
        : regPasses[regPasses.length - 1];

    const lc = buildRegionalRasterCanvas(regionId, leftMode, lp, 0, 3);
    const rc = buildRegionalRasterCanvas(regionId, rightMode, rp, 0, 3);
    if (leftCurtainRef.current) {
      leftCurtainRef.current.width = lc.width;
      leftCurtainRef.current.height = lc.height;
      leftCurtainRef.current.getContext('2d')!.drawImage(lc, 0, 0);
    }
    if (rightCurtainRef.current) {
      rightCurtainRef.current.width = rc.width;
      rightCurtainRef.current.height = rc.height;
      rightCurtainRef.current.getContext('2d')!.drawImage(rc, 0, 0);
    }
  }, [isOpen, regionId, activeApp, curtainPreset, regPasses]);

  // Physics Sim math + animation
  const wavelengthCm = bandChoice === 'L' ? 24 : 9;
  const relRoughness = roughnessCm / wavelengthCm;
  const fresnelBoost = Math.log10(Math.max(2, dielectric)) / Math.log10(80);
  let scatteringRegime = 'Normal Ground Bounce (Bumpy Soil or Rock)';
  let sigmaDb = -14.0;
  if (hasCornerWalls && dielectric > 45 && roughnessCm < 6) {
    scatteringRegime = 'Super Bright Double-Bounce (Water + Building Walls / Tree Trunks)';
    sigmaDb = polChoice === 'HH' ? 3.2 : polChoice === 'VV' ? 0.8 : -11.5;
  } else if (hasCanopy) {
    scatteringRegime = 'Deep Branch Bounce (Deep Radar Sees Under Leaves)';
    sigmaDb = polChoice === 'HV' ? -10.4 : -8.2;
  } else if (relRoughness < 0.08 && dielectric > 50) {
    scatteringRegime = 'Dark Mirror (Radar Bounces Away from Calm Water or Oil)';
    sigmaDb = -22.8;
  } else {
    sigmaDb =
      -18.5 +
      Math.min(15, relRoughness * 26) +
      fresnelBoost * 5.2 -
      (polChoice === 'HV' ? 6.2 : 0);
  }

  useEffect(() => {
    if (!isOpen || activeApp !== 'physics') return;
    let raf = 0;
    let t = 0;
    const draw = () => {
      t += 0.05;
      const c = physicsCanvasRef.current;
      if (!c) return;
      const W = 440;
      const H = 210;
      if (c.width !== W) {
        c.width = W;
        c.height = H;
      }
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#040b18';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(203, 213, 225, 0.2)';
      for (let cx = 20; cx < W - 20; cx += 46) ctx.fillRect(cx, 58, 38, 10);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('☁️ CLOUDS / SMOKE / NIGHT — TRANSPARENT TO NISAR MICROWAVES', 52, 66);

      ctx.fillStyle = '#2563eb';
      ctx.fillRect(28, 20, 18, 6);
      ctx.fillRect(70, 20, 18, 6);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(48, 16, 20, 14);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(52, 30, 16, 8);

      ctx.fillStyle = dielectric > 50 ? '#0284c7' : '#854d0e';
      ctx.fillRect(0, 165, W, 45);
      for (let x = 0; x < W; x += 6) {
        const b = Math.round(Math.sin(x * 0.23) * roughnessCm * 1.1);
        ctx.fillStyle = dielectric > 50 ? '#38bdf8' : '#ca8a04';
        ctx.fillRect(x, 163 - Math.max(0, b), 5, Math.max(3, b + 3));
      }
      if (hasCornerWalls) {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(245, 114, 36, 51);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(241, 108, 44, 7);
      }
      if (hasCanopy) {
        for (let tx = 175; tx <= 285; tx += 44) {
          ctx.fillStyle = '#15803d';
          ctx.fillRect(tx, 116, 26, 36);
          ctx.fillStyle = '#4ade80';
          ctx.fillRect(tx + 4, 108, 18, 14);
        }
      }

      ctx.strokeStyle = bandChoice === 'L' ? '#e879f9' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t * 14;
      ctx.beginPath();
      ctx.moveTo(62, 38);
      ctx.lineTo(230, 162);
      ctx.stroke();

      if (hasCornerWalls && dielectric > 45 && roughnessCm < 6) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(230, 162);
        ctx.lineTo(245, 148);
        ctx.lineTo(62, 38);
        ctx.stroke();
      } else if (relRoughness < 0.08 && dielectric > 50 && !hasCanopy) {
        ctx.strokeStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(230, 162);
        ctx.lineTo(410, 48);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#4ade80';
        ctx.beginPath();
        ctx.moveTo(230, 152);
        ctx.lineTo(65, 40);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, activeApp, dielectric, roughnessCm, hasCornerWalls, hasCanopy, bandChoice, relRoughness]);

  if (!isOpen) return null;

  const metrics =
    currentPass.phaseTag === 'BASELINE'
      ? activeStation.baselineMetrics
      : currentPass.phaseTag === 'CATASTROPHE' || currentPass.phaseTag === 'FLOOD_2025'
        ? activeStation.catastropheMetrics
        : activeStation.precursorMetrics;

  const toyChecklistComplete = aiRelayEnabled && creepThresholdMm <= 25 && moistureTriggerPct <= 80;

  const triggerSmooth3D = () => {
    if (dimension === '3d' || dimension === 'transition-to-3d') return;
    retroAudio.playWarpTo3D();
    onViewed3D?.();
    setDimension('transition-to-3d');
    const msg = `3D GEODETIC EXTRUSION ENGAGED! Raising ${regionDef.name} (${Math.round(regDem.minElev)}m → ${Math.round(regDem.maxElev)}m) into interactive relief—drag to orbit or simulate geophysical dynamics!`;
    setRudraConsoleTip(msg);
    retroAudio.speakMentor(msg, 'radar');
  };

  const triggerSmooth2D = () => {
    if (dimension === '2d' || dimension === 'transition-to-2d') return;
    retroAudio.playWarpTo2D();
    setDimension('transition-to-2d');
    const msg = `Returning Mainframe viewport to 2D Multi-Band Chart. Move your cursor across the 2D screen to inspect live Lat/Lon/Elevation & Multi-Band X-Ray Lens!`;
    setRudraConsoleTip(msg);
    retroAudio.speakMentor(msg, 'welcome');
  };

  const gibsUrl = getNasaGibsTileUrl(
    regionDef.lat,
    regionDef.lon,
    regionDef.gibsZoom,
    regionDef.gibsDate
  );

  const hyp = activeStation.physicalDriverHypothesis;
  const selectedGuess = quizGuessByStation[activeStation.id];
  const isGuessCorrect =
    selectedGuess === hyp.correctIndex || verifiedHypothesisIds.includes(activeStation.id);

  return (
    <div className="mainframe-overlay">
      <div className="mainframe-bezel-chassis" role="dialog" aria-modal="true" aria-label="Simulated regional radar observatory">
        {/* MODERN FIELD WORKSTATION HEADER */}
        <div className="mainframe-top-bezel">
          <div className="bezel-model-plate" title={regionDef.labBuildingName}>
            <span className="led-dot green" />
            <span className="led-dot cyan" />
            <strong>
              {regionDef.flag} {regionDef.name} — Modern NISAR Field Computer
            </strong>
          </div>

          <div className="bezel-telemetry-counters">
            <span title="Regional radar layers are interactive simulations; real NASA GeoTIFFs, GeoJSONs & portals are under NASA Context & Data.">
              Interactive 2D / 3D Radar Suite
            </span>
            <button
              type="button"
              data-testid="lab-open-real-nasa-btn"
              className="tiny-retro-btn"
              onClick={() => {
                retroAudio.playUiClick(700);
                setActiveApp('nasa_live');
                setNasaSubTab('rasuwa_datum');
              }}
            >
              🛰️ Real 26 Aug NASA GeoTIFFs &amp; GIS
            </button>
            {onOpenWorldAtlas && (
              <button
                type="button"
                className="tiny-retro-btn"
                onClick={() => {
                  retroAudio.playUiClick(660);
                  onStepBackToLab();
                  onOpenWorldAtlas();
                }}
              >
                🌍 Global Map
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onReturnToStory && (
              <button
                type="button"
                className="step-back-lab-btn"
                onClick={() => {
                  retroAudio.playUiClick(520);
                  onReturnToStory();
                }}
              >
                📖 Back to Story
              </button>
            )}
            <button
              type="button"
              className="step-back-lab-btn"
              onClick={() => {
                retroAudio.playUiClick(420);
                onStepBackToLab();
              }}
            >
              ✕ Close (Esc)
            </button>
          </div>
        </div>

        {/* ONE-CLICK GLOBAL BIOME SWITCHER INSIDE COMPUTER */}
        {onSelectRegion && (
          <div className="computer-region-bar" role="region" aria-label="Switch global radar study site">
            <span className="region-bar-label">Study Site:</span>
            {ORDERED_GLOBAL_REGIONS.map((reg) => (
              <button
                key={reg.id}
                type="button"
                data-testid={`comp-region-${reg.id}`}
                aria-pressed={reg.id === regionId}
                onClick={() => {
                  retroAudio.playUiClick(680);
                  onSelectRegion(reg.id);
                }}
                className={`region-pill-btn ${reg.id === regionId ? 'active' : ''}`}
              >
                {reg.flag} {reg.name.split('—')[0].split(',')[0].trim()}
              </button>
            ))}
          </div>
        )}

        {/* USER-FRIENDLY WORKSPACE TABS */}
        <div className="mainframe-fkeys-bar" role="navigation" aria-label="Computer apps">
          {(
            [
              ['observatory', '🗺️ 2D / 3D Valley Map', `2D / 3D ${regionDef.name} map`],
              ['curtain', '🌗 Before / After Slider', 'Slide to compare clouds vs radar'],
              ['physics', '🔬 How Radar Bounces', 'Test wet ground, bumps, oil spills & trees'],
              ['nasa_live', '🛰️ NASA Context & Data', 'Real 26 Aug GeoTIFF rasters, GeoJSON map, L-vs-C coherence & limits'],
              ['resources', '📚 Links & Code', 'NASA Earthdata, ASF Vertex, CSA, CONAE & QGIS'],
              ['warning', '✅ Safety Checklist', 'Practice village safety checklist (just a game)']
            ] as Array<[MainframeAppId, string, string]>
          ).map(([id, label, description]) => (
            <button
              key={id}
              type="button"
              data-testid={`computer-tab-${id}`}
              className={`fkey-btn ${activeApp === id ? 'active' : ''}`}
              title={description}
              aria-pressed={activeApp === id}
              onClick={() => {
                retroAudio.playUiClick(640);
                setActiveApp(id);
              }}
            >
              {label}
            </button>
          ))}
          {onOpenIntervention && (
            <button
              type="button"
              className="fkey-btn action-fkey-btn"
              onClick={() => {
                retroAudio.playBadgeUnlock();
                onOpenIntervention();
              }}
            >
              ⚡ Field Exercise
            </button>
          )}
          {onOpenIncidentPhotos && (
            <button
              type="button"
              className="fkey-btn photo-fkey-btn"
              onClick={() => {
                retroAudio.playUiClick(680);
                onOpenIncidentPhotos(activeStation.id);
              }}
            >
              📷 Site Photos
            </button>
          )}
        </div>

        {/* GIANT INNER WORKSTATION MONITOR SCREEN */}
        <details className="science-details">
          <summary>SIMULATION / illustration • not a warning service<span>Data labels</span></summary>
          <p className="science-boundary">SIMULATION: all regional radar layers, phases, dB values, coherence and scenario steps are generated / author-chosen. DEM, coordinates and elevations are illustration with unverified provenance. Real NASA context is separate under F4. Not a warning service.</p>
        </details>
        <div className="mainframe-crt-screen">
          {activeApp === 'observatory' && (
            <div className="observatory-split-layout">
              {/* LEFT: BIG 2D <-> SMOOTH 3D VIEWPORT */}
              <div className="observatory-main-screen">
                <div className="obs-layer-strip">
                  {(
                    [
                      ['lband_insar', '🌈 Ground Movement Map'],
                      ['sar_rgb', '📡 Trees & Floods Map'],
                      ['sband_moisture', '💧 Wet Soil Map'],
                      ['optical', '☁️ Normal Camera (Clouds Block View)'],
                      ['pixel', '🏔️ Mountain Hills'],
                      ['retro_wireframe', '🟢 Height Lines']
                    ] as Array<[RadarLayerMode, string]>
                  ).map(([m, lbl]) => (
                    <button
                      key={m}
                      type="button"
                      className={`layer-btn ${layerMode === m ? 'active' : ''}`}
                      aria-pressed={layerMode === m}
                      onClick={() => {
                        retroAudio.playRadarPing(m === 'sband_moisture' ? 'S' : 'L');
                        setLayerMode(m);
                      }}
                    >
                      {lbl}
                    </button>
                  ))}

                  <div className="obs-spacer" />

                  {dimension === '2d' ? (
                    <button
                      type="button"
                      className="show-3d-hero-btn compact"
                      onClick={triggerSmooth3D}
                    >
                      ⛰️ SHOW IN 3D
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="return-2d-hero-btn"
                      onClick={triggerSmooth2D}
                    >
                      🖥️ SHOW IN 2D
                    </button>
                  )}
                </div>

                <div className="obs-canvas-stage">
                  {dimension === '2d' ? (
                    <div className="observatory-2d-view">
                      <div className="obs-map-surface">
                      <canvas
                        ref={canvas2dRef}
                        className="mainframe-2d-canvas smooth-radar-canvas"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const u = (e.clientX - rect.left) / rect.width;
                          const v = (e.clientY - rect.top) / rect.height;
                          const hit = regStations.find(
                            (s) => Math.hypot(s.u - u, s.v - v) < 0.085
                          );
                          if (hit) {
                            retroAudio.playRadarPing('L');
                            setActiveStation(hit);
                            setRudraConsoleTip(`${hit.name}: ${hit.nisarInsight}`);
                            retroAudio.speakMentor(hit.nisarInsight, 'radar');
                          }
                        }}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setXrayHoverUV({
                            u: (e.clientX - rect.left) / rect.width,
                            v: (e.clientY - rect.top) / rect.height
                          });
                        }}
                        onMouseLeave={() => setXrayHoverUV(null)}
                      />
                      </div>

                      <div className="obs-map-readouts">
                      {/* Legend and cursor have their own row, not map overlays. */}
                      <div className="scientific-legend-overlay">
                        <div className="sci-legend-head">
                          <strong>SIMULATION • {legend.title}</strong>
                          <span>{legend.unit}</span>
                        </div>
                        <div
                          className="sci-legend-bar"
                          style={{ background: legend.gradientCss }}
                        />
                        <div className="sci-legend-ticks">
                          <span>{legend.minLabel}</span>
                          <span>{legend.midLabel}</span>
                          <span>{legend.maxLabel}</span>
                        </div>
                      </div>

                      {/* Live Cursor Geodetic Readout (Bottom-Right) */}
                      <div className="cursor-geodetic-pill">
                        {cursorReadout ? (
                          <>
                            <span>
                              📍 Location: {cursorReadout.latStr}, {cursorReadout.lonStr}
                            </span>
                            <span>Map height: {cursorReadout.elev}m</span>
                            <strong>{cursorReadout.isValid ? `Ground moved: ${cursorReadout.losCm} cm` : 'Signal scrambled (water or sliding dirt)'}</strong>
                          </>
                        ) : (
                          <span>🔍 Move mouse over the map to peek under clouds</span>
                        )}
                      </div>
                      </div>
                    </div>
                  ) : (
                    <TerrainMap3D
                      regionId={regionId}
                      dimension={dimension}
                      onTransitionComplete={(t) => setDimension(t)}
                      currentPass={currentPass}
                      layerMode={layerMode}
                      activeStation={activeStation}
                      onSelectStation={setActiveStation}
                      playerUV={{ u: activeStation.u, v: activeStation.v }}
                      highlightedStationIds={highlightedStoryStations}
                      focusTriggerSeq={focusTriggerSeq}
                    />
                  )}
                </div>

                {/* 12-Day NISAR Pass Scrubber inside Computer */}
                <div className="timeline-scrubber-bar">
                  <div className="timeline-left-meta">
                    <button
                      type="button"
                      className={`play-waltz-btn ${isAutoWaltz ? 'playing' : ''}`}
                      onClick={() => setIsAutoWaltz((v) => !v)}
                    >
                      {isAutoWaltz ? '⏸ PAUSE' : '▶ WALTZ'}
                    </button>
                    <div className="pass-status-summary">
                      <strong>
                        {currentPass.orbitPass} •{' '}
                        {regionDef.scientificIntegrity.isForwardScenarioSimulated
                          ? 'SIMULATION STEP (NOT AN ACQUISITION)'
                          : 'ILLUSTRATIVE STEP'}
                      </strong>
                      <span>
                        Illustrated obstruction: {currentPass.cloudCoverPct}% • {currentPass.date}
                      </span>
                    </div>
                  </div>

                  <div className="timeline-steps-row">
                    {regPasses.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`time-step-pill phase-${p.phaseTag.toLowerCase()} ${
                          idx === safePassIdx ? 'active' : ''
                        }`}
                        onClick={() => {
                          setIsAutoWaltz(false);
                          setPassIndex(idx);
                          setRudraConsoleTip(p.mentorNarration);
                          retroAudio.speakMentor(p.mentorNarration, p.mentorMood);
                        }}
                      >
                        <span>{p.shortLabel}</span>
                        <span className="t-dot" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Station detail is optional; the map keeps the main workspace. */}
              <details className="observatory-notebook">
                <summary>Spot Notes / {activeStation.code}<span>Simple story &amp; quiz</span></summary>
              <div className="observatory-side-telemetry">
                <div className="station-selector-grid">
                  {regStations.map((st) => {
                    const solved = verifiedHypothesisIds.includes(st.id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        className={`st-mini-btn ${st.id === activeStation.id ? 'active' : ''}`}
                        onClick={() => {
                          retroAudio.playUiClick(600);
                          setActiveStation(st);
                        }}
                      >
                        {st.code} {getCleanStationLabel(st).split(' ')[0]}
                        {solved ? ' ✓' : ''}
                      </button>
                    );
                  })}
                </div>

                <div className="telemetry-card">
                  <div className="telemetry-head">
                    <span>{activeStation.name}</span>
                    <span className={`coh-pill ${metrics.coherence < 0.45 ? 'danger' : 'ok'}`}>
                      Signal Match: {metrics.coherence.toFixed(2)}
                    </span>
                  </div>
                  <div className="st-nepali">
                    {activeStation.nepaliSub} • sample height {activeStation.elevationM}m
                  </div>

                  <div className="pol-bars">
                    <div className="pol-bar-item">
                      <div className="pol-label">
                        <span>Flat Bounce (Water/Walls)</span>
                        <strong>{metrics.hhDb.toFixed(1)} dB</strong>
                      </div>
                      <div className="pol-track">
                        <div
                          className="pol-fill hh"
                          style={{
                            width: `${Math.min(100, Math.max(8, ((metrics.hhDb + 25) / 30) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                    <div className="pol-bar-item">
                      <div className="pol-label">
                        <span>Branch Bounce (Trees)</span>
                        <strong>{metrics.hvDb.toFixed(1)} dB</strong>
                      </div>
                      <div className="pol-track">
                        <div
                          className="pol-fill hv"
                          style={{
                            width: `${Math.min(100, Math.max(8, ((metrics.hvDb + 25) / 30) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="disp-readout">
                    <span>What changed (practice map):</span>
                    <strong>{metrics.displacementText}</strong>
                  </div>
                  {onOpenIncidentPhotos && (
                    <button
                      type="button"
                      className="lab-station-photo-btn"
                      onClick={() => {
                        retroAudio.playUiClick(680);
                        onOpenIncidentPhotos(activeStation.id);
                      }}
                    >
                      📷 See Site Photos: {getCleanStationLabel(activeStation)}
                    </button>
                  )}
                </div>

                {/* Sub-tabs: Simple Story & Limits vs Quick Quiz */}
                <div className="inspector-subtabs">
                  <button
                    type="button"
                    className={`subtab-btn ${sideTab === 'dossier' ? 'active' : ''}`}
                    onClick={() => setSideTab('dossier')}
                  >
                    🏘️ Simple Story &amp; Limits
                  </button>
                  <button
                    type="button"
                    className={`subtab-btn ${sideTab === 'hypothesis' ? 'active' : ''}`}
                    onClick={() => setSideTab('hypothesis')}
                  >
                    🧠 Quick Quiz {isGuessCorrect ? '✅' : '⚡'}
                  </button>
                </div>

                {sideTab === 'dossier' ? (
                  <div className="dossier-scroll">
                    <div className="story-section">
                      <h4>🏘️ Community Livelihood Impact</h4>
                      <p>{activeStation.humanEconomicStory}</p>
                    </div>

                    <div className="story-section">
                      <h4>🛰️ Illustrative radar interpretation</h4>
                      <p>{activeStation.nisarInsight}</p>
                    </div>

                    <div className="story-section radar-highlight">
                      <h4>⚠️ Scientific Limitation &amp; Sensor Fusion</h4>
                      <p>{regionDef.scientificIntegrity.whySarAloneIsInsufficient}</p>
                    </div>

                    {regionId === 'rasuwa_nepal' && (
                      <div className="story-section" data-testid="lab-story-bridge-card">
                        <h4>🧭 Story Field Decisions ↔ 3D Slopes ({highlightedStoryStations.length}/5 Solved)</h4>
                        <div className="flex flex-col gap-1.5 mt-1">
                          {STORY_CHAPTER_STATION_BRIDGE.map((item) => {
                            const isSolved = solvedStoryChapters.includes(item.chapterId);
                            const stationObj = regStations.find((s) => s.id === item.stationId);
                            return (
                              <div key={item.chapterId} className="flex items-center justify-between gap-2 text-[11px] bg-slate-900/80 border border-slate-700/80 rounded px-2 py-1.5">
                                <div className="min-w-0">
                                  <div className="font-bold text-amber-200 truncate">
                                    {isSolved ? '✅ ' : '○ '}{item.title}
                                  </div>
                                  <div className="text-[10px] text-slate-300 truncate">{item.fieldAction}</div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {stationObj && (
                                    <button
                                      type="button"
                                      data-testid={`bridge-focus-${item.stationId}`}
                                      onClick={() => {
                                        retroAudio.playUiClick(680);
                                        setActiveStation(stationObj);
                                        if (dimension !== '3d') {
                                          setDimension('transition-to-3d');
                                          onViewed3D?.();
                                        }
                                        setFocusTriggerSeq((s) => s + 1);
                                      }}
                                      className="px-2 py-0.5 rounded bg-sky-900/90 hover:bg-sky-800 border border-sky-400/60 text-sky-100 text-[10px] font-mono cursor-pointer"
                                    >
                                      3D Focus
                                    </button>
                                  )}
                                  {onJumpToStoryChapter && (
                                    <button
                                      type="button"
                                      onClick={() => onJumpToStoryChapter(item.chapterId)}
                                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-200 text-[10px] font-mono cursor-pointer"
                                    >
                                      Story
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="dossier-scroll">
                    <div className="story-section quiz-box">
                      <span className="quiz-prompt-badge">
                        🔬 SCENARIO REASONING CHECK • {activeStation.code}
                      </span>
                      <p className="quiz-q">{hyp.question}</p>
                      <div className="quiz-options">
                        {hyp.options.map((opt, oIdx) => {
                          const chosen = selectedGuess === oIdx;
                          const showCorrect = isGuessCorrect && oIdx === hyp.correctIndex;
                          const showWrong = chosen && oIdx !== hyp.correctIndex;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              className={`quiz-opt-btn ${
                                showCorrect ? 'correct' : showWrong ? 'wrong' : ''
                              }`}
                              onClick={() => {
                                setQuizGuessByStation((prev) => ({
                                  ...prev,
                                  [activeStation.id]: oIdx
                                }));
                                if (oIdx === hyp.correctIndex) {
                                  retroAudio.playBadgeUnlock();
                                  onVerifyHypothesis?.(activeStation.id);
                                  setRudraConsoleTip(`QUIZ COMPLETE (not field validation)! ${hyp.explanation}`);
                                  retroAudio.speakMentor(hyp.explanation, 'eureka');
                                } else {
                                  retroAudio.playUiClick(280);
                                }
                              }}
                            >
                              {showCorrect ? '✅ ' : showWrong ? '✕ ' : `${String.fromCharCode(65 + oIdx)}. `}
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {(selectedGuess !== undefined || isGuessCorrect) && (
                        <div className={`quiz-feedback ${isGuessCorrect ? 'ok' : 'retry'}`}>
                          {isGuessCorrect
                            ? `✅ ILLUSTRATIVE QUIZ ANSWER: ${hyp.explanation}`
                            : '🔎 Re-check the simulated HH/HV backscatter and wavelength physics above, then try another hypothesis!'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              </details>
            </div>
          )}

          {activeApp === 'curtain' && (
            <div className="lab-body">
              <div className="curtain-toolbar">
                <button
                  type="button"
                  className={`retro-chip-btn ${curtainPreset === 'clouds_vs_insar' ? 'active-cyan' : ''}`}
                  onClick={() => setCurtainPreset('clouds_vs_insar')}
                >
                  👁️ Clouds Blocking Normal Camera vs. Space Radar
                </button>
                <button
                  type="button"
                  className={`retro-chip-btn ${curtainPreset === 'before_vs_after' ? 'active-amber' : ''}`}
                  onClick={() => setCurtainPreset('before_vs_after')}
                >
                  🔄 Compare Before vs. After Change
                </button>
              </div>
              <div className="curtain-stage">
                <canvas ref={rightCurtainRef} className="curtain-canvas-full smooth-radar-canvas" />
                <div
                  className="curtain-left-clip"
                  style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
                >
                  <canvas ref={leftCurtainRef} className="curtain-canvas-full smooth-radar-canvas" />
                </div>
                <div className="curtain-divider-line" style={{ left: `${splitPct}%` }}>
                  <span className="curtain-handle">◀ SLIDE TO COMPARE ▶</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={98}
                  value={splitPct}
                  onChange={(e) => setSplitPct(Number(e.target.value))}
                  className="curtain-invisible-slider" aria-label="Compare normal cloudy camera and practice radar map"
                />
              </div>
              <div className="curtain-caption-row">
                <div className="curtain-tag left">
                  {curtainPreset === 'clouds_vs_insar'
                    ? `CLOUDS IN NORMAL PHOTO (${currentPass.cloudCoverPct}% covered)`
                    : `📅 BEFORE (${regPasses[0]?.shortLabel})`}
                </div>
                <div className="curtain-tag right">
                  {curtainPreset === 'clouds_vs_insar'
                    ? 'PRACTICE RADAR VIEW (SEES THROUGH CLOUDS)'
                    : `⚡ AFTER CHANGE (${regPasses[regPasses.length - 1]?.shortLabel})`}
                </div>
              </div>
            </div>
          )}

          {activeApp === 'physics' && (
            <div className="lab-body two-col">
              <div className="physics-visual-col">
                <canvas ref={physicsCanvasRef} className="physics-sim-canvas" />
                <div className="sigma-readout-box">
                  <div>
                    <span className="muted-label">HOW THE RADAR WAVE BOUNCES • SIMULATION</span>
                    <strong>{scatteringRegime}</strong>
                  </div>
                  <div className="db-pill">Echo: {sigmaDb.toFixed(1)} dB</div>
                </div>
              </div>
              <div className="physics-controls-col">
                <h4>Test How Space Radar Bounces Off Different Surfaces</h4>
                <div className="physics-presets-row">
                  <button
                    type="button"
                    className="shader-pill"
                    onClick={() => {
                      setDielectric(78);
                      setRoughnessCm(0.4);
                      setHasCornerWalls(false);
                      setHasCanopy(false);
                      setBandChoice('L');
                      setPolChoice('VV');
                    }}
                  >
                    🛢️ Smooth Water / Oil (Looks Dark)
                  </button>
                  <button
                    type="button"
                    className="shader-pill"
                    onClick={() => {
                      setDielectric(68);
                      setRoughnessCm(1.5);
                      setHasCornerWalls(true);
                      setHasCanopy(false);
                      setBandChoice('L');
                      setPolChoice('HH');
                    }}
                  >
                    🏘️ Flooded Houses (Super Bright)
                  </button>
                  <button
                    type="button"
                    className="shader-pill"
                    onClick={() => {
                      setDielectric(55);
                      setRoughnessCm(6.0);
                      setHasCornerWalls(false);
                      setHasCanopy(true);
                      setBandChoice('L');
                      setPolChoice('HV');
                    }}
                  >
                    🌳 Thick Forest (Deep Waves See Inside)
                  </button>
                </div>
                <label className="lab-control">
                  <span>How Wet Is the Ground? (3 Dry → 80 Water): <strong>{dielectric}</strong></span>
                  <input type="range" min={3} max={80} value={dielectric} onChange={(e) => setDielectric(Number(e.target.value))} />
                </label>
                <label className="lab-control">
                  <span>How Bumpy Is the Ground? (0.2 Smooth → 18 Rough): <strong>{roughnessCm.toFixed(1)} cm</strong></span>
                  <input type="range" min={0.2} max={18} step={0.2} value={roughnessCm} onChange={(e) => setRoughnessCm(Number(e.target.value))} />
                </label>
                <div className="toggle-pair">
                  <button type="button" className={`shader-pill ${bandChoice === 'L' ? 'selected' : ''}`} onClick={() => setBandChoice('L')}>Deep Wave (24cm)</button>
                  <button type="button" className={`shader-pill ${bandChoice === 'S' ? 'selected' : ''}`} onClick={() => setBandChoice('S')}>Short Wave (9cm)</button>
                  {(['HH', 'HV', 'VV'] as const).map((p) => (
                    <button key={p} type="button" className={`shader-pill ${polChoice === p ? 'selected' : ''}`} onClick={() => setPolChoice(p)}>{p}</button>
                  ))}
                </div>
                <div className="toggle-pair">
                  <label className="check-pill">
                    <input type="checkbox" checked={hasCornerWalls} onChange={(e) => { setHasCornerWalls(e.target.checked); if (e.target.checked) setHasCanopy(false); }} />
                    <span>Double-Bounce (Water + House Walls)</span>
                  </label>
                  <label className="check-pill">
                    <input type="checkbox" checked={hasCanopy} onChange={(e) => { setHasCanopy(e.target.checked); if (e.target.checked) setHasCornerWalls(false); }} />
                    <span>Trees &amp; Leaves in the Way</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeApp === 'nasa_live' && (
            <div className="lab-body">
              <div className="curtain-toolbar" role="tablist" aria-label="NASA Context Sub-Tabs">
                {(
                  [
                    ['rasuwa_datum', '🔬 26 Aug Datum (GeoTIFF & GIS)'],
                    ['fleet', '🛰️ Real Satellites & Limits'],
                    ['catalog', '📂 Real NASA Photo List'],
                    ['timeline', '⏱️ 5-Step Story Timeline'],
                    ['multisensor', '📡 Comparing Satellites'],
                    ['manifests', '🔐 Data File Checks']
                  ] as const
                ).map(([tabKey, tabLabel]) => (
                  <button
                    key={tabKey}
                    type="button"
                    role="tab"
                    aria-selected={nasaSubTab === tabKey}
                    className={`retro-chip-btn ${nasaSubTab === tabKey ? 'active-cyan' : ''}`}
                    onClick={() => setNasaSubTab(tabKey)}
                  >
                    {tabLabel}
                  </button>
                ))}
              </div>

              {nasaSubTab === 'rasuwa_datum' && (
                <RasuwaDatumExplorer />
              )}

              {nasaSubTab === 'fleet' && (
                <div className="lab-body two-col">
                  <div className="physics-visual-col">
                    <div className="gibs-live-card">
                      <div className="gibs-head">
                        <strong>ARCHIVED OBSERVATION • NASA GIBS VIIRS OPTICAL BROWSE</strong>
                        <span>
                          {regionDef.coordsLabel} • requested archive date {regionDef.gibsDate} •{' '}
                          <a href={gibsUrl} target="_blank" rel="noreferrer">
                            Exact NASA tile
                          </a>
                        </span>
                      </div>
                      <img
                        src={gibsUrl}
                        alt={`NASA GIBS ${regionDef.name}`}
                        className="gibs-tile-img"
                        onLoad={() => setGibsLoaded(true)}
                        onError={() => setGibsFailed(true)}
                        style={{ display: gibsFailed ? 'none' : undefined }}
                      />
                      <small>
                        {gibsFailed
                          ? 'NASA imagery unavailable. No simulated image substituted.'
                          : gibsLoaded
                            ? 'Archived tile loaded. Regional context only; tile extent is not co-registered to this schematic DEM.'
                            : 'Requesting archived NASA optical tile…'}
                      </small>
                    </div>
                  </div>

                  <div className="physics-controls-col">
                    <h4>🔬 Data Provenance, Complementary NASA Fleet &amp; Limitations</h4>
                    <div className="provenance-list">
                      <div className="prov-item">
                        <strong>SIMULATION • Radar quantity:</strong>{' '}
                        {regionDef.scientificIntegrity.measuredRadarObservable}
                      </div>
                      <div className="prov-item">
                        <strong>🧠 Physical Interpretation:</strong>{' '}
                        {regionDef.scientificIntegrity.physicalInterpretation}
                      </div>
                      <div className="prov-item warn">
                        <strong>⚠️ Scientific Limitation:</strong>{' '}
                        {regionDef.scientificIntegrity.whySarAloneIsInsufficient}
                      </div>
                      <div className="prov-item">
                        <strong>Proposed complementary missions (not integrated here):</strong>{' '}
                        {regionDef.scientificIntegrity.complementaryNasaDatasets.join(' • ')}
                      </div>
                      {powerTelemetry && (
                        <div className="prov-item ok">
                          <strong>
                            {powerTelemetry.sourceLabel} • {powerTelemetry.dataPeriod} • fetched{' '}
                            {powerTelemetry.fetchedAtIso || 'not fetched'}:
                          </strong>{' '}
                          Peak climatological rain {powerTelemetry.peakPrecipMmDay.toFixed(2)} mm/d
                          • Peak dimensionless wetness index × 100{' '}
                          {Math.round(powerTelemetry.peakSurfaceWetness * 100)}% • Mean Temp{' '}
                          {powerTelemetry.meanTempC.toFixed(1)}°C
                        </div>
                      )}
                      {COMPLEMENTARY_NASA_FLEET_CARDS.map((card) => (
                        <div key={card.id} className="prov-item">
                          <strong>
                            {card.mission} ({card.instrument}):
                          </strong>{' '}
                          {card.rasuwaCorroborationRole} — <em>{card.whySarNeedsIt}</em>{' '}
                          <a href={card.officialUrl} target="_blank" rel="noreferrer">
                            Mission portal
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {nasaSubTab === 'catalog' && (
                <div className="physics-controls-col">
                  <h4>
                    📂 Verified SAR Acquisition Catalog • ASF Data Search Vertex (AOI:{' '}
                    {RASUWA_AOI_BOUNDS.latMin}–{RASUWA_AOI_BOUNDS.latMax}°N,{' '}
                    {RASUWA_AOI_BOUNDS.lonMin}–{RASUWA_AOI_BOUNDS.lonMax}°E)
                  </h4>
                  <div className="provenance-list">
                    {VERIFIED_SAR_ACQUISITION_CATALOG.map((acq) => (
                      <div key={acq.id} className="prov-item">
                        <strong>
                          [{acq.provenanceTier.toUpperCase()}] {acq.mission} • {acq.acquisitionDate}{' '}
                          • {acq.bandAndWavelength} (λ/2 = {acq.halfWavelengthFringeCm} cm):
                        </strong>{' '}
                        <code>{acq.granuleId}</code> ({acq.productType}, {acq.orbitDirection},{' '}
                        {acq.trackFrame}){' '}
                        {acq.sha256Prefix ? `• SHA-256: ${acq.sha256Prefix}… ` : ''}—{' '}
                        {acq.scientificNote}{' '}
                        <a href={acq.vertexSearchUrl} target="_blank" rel="noreferrer">
                          Verify in Archive
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {nasaSubTab === 'timeline' && (
                <div className="physics-controls-col">
                  <h4>
                    ⏱️ 5-Stage Rasuwa Cascading Failure &amp; Regional Screening Verdict (Silwal
                    &amp; Dahal / Zenodo 22730419)
                  </h4>
                  <div className="provenance-list">
                    {FIVE_STAGE_RASUWA_TIMELINE.map((st) => (
                      <div
                        key={st.stageNumber}
                        className={`prov-item ${st.stageNumber === 5 ? 'warn' : ''}`}
                      >
                        <strong>
                          [{st.provenanceTier.toUpperCase()}] {st.zoneName} — {st.rootCauseTitle}:
                        </strong>{' '}
                        {st.destructionSummary} <em>{st.rootCauseDetail}</em> Corroboration:{' '}
                        {st.corroboratingDataset} (
                        <a href={st.sourceUrl} target="_blank" rel="noreferrer">
                          {st.sourceCitation}
                        </a>
                        )
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {nasaSubTab === 'multisensor' && (
                <div className="physics-controls-col">
                  <h4>
                    📡 Multi-Sensor SAR Corroboration: NISAR L-Band (24 cm) vs. Sentinel-1 C-Band
                    (5.6 cm), CONAE SAOCOM &amp; CSA RCM
                  </h4>
                  <div className="provenance-list">
                    {MULTI_SENSOR_PHYSICS_COMPARISON.map((sensor) => (
                      <div key={sensor.id} className="prov-item">
                        <strong>
                          {sensor.missionName} ({sensor.agency}) • {sensor.band} (λ ={' '}
                          {sensor.wavelengthCm} cm, λ/2 = {sensor.halfWavelengthCm} cm,{' '}
                          {sensor.repeatCycleDays}-day repeat):
                        </strong>{' '}
                        {sensor.canopyAndIcePenetration} <em>Steep relief:</em>{' '}
                        {sensor.steepReliefBehavior} <em>Role:</em> {sensor.rasuwaRole}{' '}
                        <a href={sensor.resourceUrl} target="_blank" rel="noreferrer">
                          Agency Docs
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {nasaSubTab === 'manifests' && (
                <div className="physics-controls-col">
                  <div className="curtain-toolbar">
                    <button
                      type="button"
                      className={`retro-chip-btn ${
                        activeManifestKey === 'hubbard_nisar_case1' ? 'active-cyan' : ''
                      }`}
                      onClick={() => setActiveManifestKey('hubbard_nisar_case1')}
                    >
                      🔐 Case 1: Hubbard Glacier NISAR (provenance.json • 43da… / e83f…)
                    </button>
                    <button
                      type="button"
                      className={`retro-chip-btn ${
                        activeManifestKey === 'rasuwa_sentinel1_case2' ? 'active-amber' : ''
                      }`}
                      onClick={() => setActiveManifestKey('rasuwa_sentinel1_case2')}
                    >
                      🔐 Case 2: Rasuwa Sentinel-1 Browse (rasuwa-provenance.json • 4e62… / 351c…)
                    </button>
                  </div>
                  {(() => {
                    const manifest = CRYPTOGRAPHIC_PROVENANCE_MANIFESTS[activeManifestKey];
                    return (
                      <div className="provenance-list">
                        <div className="prov-item ok">
                          <strong>{manifest.title}</strong> • Classification:{' '}
                          <code>{manifest.classification}</code> • Manifest JSON:{' '}
                          <a href={manifest.manifestUrl} target="_blank" rel="noreferrer">
                            {manifest.manifestUrl}
                          </a>
                        </div>
                        <div className="prov-item">
                          <strong>Geographic Scope:</strong> {manifest.geographicScope}
                        </div>
                        <div className="prov-item">
                          <strong>Credit &amp; Attribution:</strong> {manifest.credit} (
                          <a href={manifest.sourcePage} target="_blank" rel="noreferrer">
                            Source Link
                          </a>
                          )
                        </div>
                        <div className="prov-item warn">
                          <strong>Scientific Limitations:</strong> {manifest.limitations}
                        </div>
                        {manifest.assets.map((asset) => (
                          <div key={asset.sha256} className="prov-item">
                            <strong>
                              Acquisition {asset.acquisitionDate}{' '}
                              {asset.role ? `(${asset.role})` : ''}:
                            </strong>{' '}
                            SHA-256 <code>{asset.sha256}</code> • Asset:{' '}
                            <a href={asset.localPath} target="_blank" rel="noreferrer">
                              {asset.localPath}
                            </a>{' '}
                            ({asset.widthPx}×{asset.heightPx} px)
                          </div>
                        ))}
                        <div className="prov-item ok" style={{ marginTop: 8 }}>
                          <strong>📦 Bundled Rasuwa Multi-Sensor Research Datum (26 Aug 2026):</strong>{' '}
                          {RASUWA_DATUM_STATIC_FACTS.cmrExactGranules.toLocaleString()} exact-AOI CMR granules across{' '}
                          {RASUWA_DATUM_STATIC_FACTS.catchmentAreaKm2} km² HydroBASINS catchment ({RASUWA_DATUM_STATIC_FACTS.glacialLakesCount} glacial lakes).{' '}
                          Sentinel-1D coherence flagged <code>{RASUWA_DATUM_STATIC_FACTS.s1dTargetFlagged}</code> target vs{' '}
                          <code>{RASUWA_DATUM_STATIC_FACTS.s1dControlFalseAlarms}</code> control false alarms; OPERA RTC-S1 consensus flagged{' '}
                          <code>{RASUWA_DATUM_STATIC_FACTS.operaConsensusEventKm2} km²</code> ({RASUWA_DATUM_STATIC_FACTS.operaTwoViewObservabilityPct}% 2-view observable); NISAR GUNW event phase kept{' '}
                          <code>{RASUWA_DATUM_STATIC_FACTS.nisarPhaseValidSource}</code> pixels (honest failure diagnosis); GPM IMERG at collapse ={' '}
                          <code>{RASUWA_DATUM_STATIC_FACTS.imergEventHalfHourMmHr.toFixed(1)} mm/hr</code>. Open <strong>SAR Workbench</strong> to inspect the live GeoTIFF rasters.
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {activeApp === 'resources' && (
            <div className="lab-body" data-testid="computer-resources-view">
              <div className="resources-hero-banner">
                <div>
                  <h4>🛰️ Official NASA, CSA &amp; CONAE SAR Data Portals &amp; Workflows</h4>
                  <p>
                    Direct links to real satellite archives (Earthdata, ASF Vertex, NISAR User Guide, ARSET EN/ES, StoryMaps, UAVSAR), partner constellations (CSA RCM &amp; RADARSAT-1, CONAE SAOCOM), and reproducible Python + QGIS recipes.
                  </p>
                </div>
                <a
                  href="https://search.asf.alaska.edu/#/?polygon=POLYGON((-122.05%2046.65,-121.45%2046.65,-121.45%2047.05,-122.05%2047.05,-122.05%2046.65))&dataset=NISAR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="deploy-warning-btn"
                >
                  ⛰️ Open Mount Rainier (Nov 10, 2025) in ASF Vertex
                </a>
              </div>

              <div className="curtain-toolbar" role="group" aria-label="Filter official resources by space agency">
                {(['ALL', 'NASA', 'CSA (Canada)', 'CONAE (Argentina)'] as const).map((ag) => (
                  <button
                    key={ag}
                    type="button"
                    aria-pressed={resourceAgency === ag}
                    className={`retro-chip-btn ${resourceAgency === ag ? 'active-cyan' : ''}`}
                    onClick={() => {
                      retroAudio.playUiClick(620);
                      setResourceAgency(ag);
                    }}
                  >
                    {ag}
                  </button>
                ))}
              </div>

              <div className="resources-grid">
                {OFFICIAL_CHALLENGE_RESOURCES.filter(
                  (r) => resourceAgency === 'ALL' || r.agency === resourceAgency
                ).map((res) => (
                  <div key={res.id} className="prov-item resource-card">
                    <div className="resource-card-head">
                      <span className="resource-agency-tag">{res.agency}</span>
                      <a href={res.url} target="_blank" rel="noopener noreferrer">
                        Open Portal ↗
                      </a>
                    </div>
                    <strong>{res.title}</strong>
                    <p>{res.description}</p>
                    <small>Used here: {res.howUsedInApp}</small>
                  </div>
                ))}
              </div>

              <div className="prov-item resource-code-box">
                <div className="resource-card-head">
                  <strong>🐍 Python (asf_search) + QGIS Workflow &amp; SAOCOM ONE CLICK Profile</strong>
                  <button
                    type="button"
                    className="tiny-retro-btn"
                    onClick={() => {
                      if (navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(PYTHON_QGIS_RECIPE).catch(() => {});
                      }
                      setCopiedRecipe(true);
                      window.setTimeout(() => setCopiedRecipe(false), 1800);
                    }}
                  >
                    {copiedRecipe ? '✓ Copied Snippet' : '📋 Copy Python + QGIS Code'}
                  </button>
                </div>
                <pre className="resource-pre">{PYTHON_QGIS_RECIPE}</pre>
                <p>
                  <strong>Partner Tip:</strong> Register a <strong>ONE CLICK Login Profile</strong> at{' '}
                  <code>catalogos.conae.gov.ar</code> for L-band SAOCOM scenes, or explore CSA’s open RADARSAT-1 archive &amp; 4-day RCM maritime/ecosystem monitoring. Non-endorsement notice: NASA does not endorse non-U.S. entities.
                </p>
              </div>
            </div>
          )}

          {activeApp === 'warning' && (
            <div className="lab-body two-col">
              <div className="impact-ledger-col">
                <h4>{regionDef.flag} {regionDef.name} — Stakes &amp; Multi-Region Synthesis</h4>
                <p style={{ color: 'var(--game-text)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  {regionDef.communityStakesSummary}
                </p>
                <div className="stat-cards-grid" style={{ marginTop: 10 }}>
                  {ORDERED_GLOBAL_REGIONS.map((r) => (
                    <div key={r.id} className="stat-box cyan">
                      <strong>{r.flag} Illustration</strong>
                      <span>{r.name.split(' ')[0]} • not measured accuracy</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="warning-builder-col">
                <h4>Practice Safety Plan (Just a Game • No Real Alarm)</h4>
                <label className="lab-control">
                  <span>How much ground movement starts a check? (Practice setting): <strong>{creepThresholdMm} mm</strong></span>
                  <input type="range" min={8} max={45} value={creepThresholdMm} onChange={(e) => setCreepThresholdMm(Number(e.target.value))} />
                </label>
                <label className="lab-control">
                  <span>How wet must soil get before a check? (Practice setting): <strong>{moistureTriggerPct}%</strong></span>
                  <input type="range" min={50} max={95} value={moistureTriggerPct} onChange={(e) => setMoistureTriggerPct(Number(e.target.value))} />
                </label>
                <label className="check-pill">
                  <input type="checkbox" checked={aiRelayEnabled} onChange={(e) => setAiRelayEnabled(e.target.checked)} />
                  <span>Combine Space Radar + Village Rain Gauges &amp; Neighbors</span>
                </label>
                <div className={`triage-result-banner ${toyChecklistComplete ? 'good' : 'bad'}`}>
                  {toyChecklistComplete
                    ? 'Practice checklist ready! Remember: this is just a game, not a real warning system.'
                    : '⚠️ Set ground movement ≤ 25 mm and turn ON Village Rain Gauges above!'}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="deploy-warning-btn"
                    disabled={!toyChecklistComplete}
                    onClick={() => {
                      retroAudio.playBadgeUnlock();
                      onArmEarlyWarning();
                      const msg = `Practice plan saved for ${regionDef.name}! (This is only a classroom game, not a real alarm.)`;
                      setRudraConsoleTip(msg);
                      retroAudio.speakMentor(msg, 'eureka');
                    }}
                  >
                    {earlyWarningArmed ? 'PRACTICE PLAN SAVED ✓' : 'SAVE PRACTICE PLAN'}
                  </button>
                  {onOpenIntervention && (
                    <button
                      type="button"
                      className="deploy-warning-btn"
                      onClick={onOpenIntervention}
                    >
                      ⚡ OPEN VILLAGE PRACTICE PLAN
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Optional mentor note; long narration stays out of the map chrome. */}
        <div className="mainframe-bottom-bezel">
          <details className="mainframe-mentor">
            <summary>Field note / {regionDef.leadScientistName}</summary>
            <p>{rudraConsoleTip}</p>
          </details>
          <button
            type="button"
            className="tiny-retro-btn"
            onClick={() => retroAudio.speakMentor(rudraConsoleTip, 'radar')}
          >
            🔊 Replay Voice
          </button>
        </div>
      </div>
    </div>
  );
};
