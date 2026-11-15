import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Play,
  Square,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { DataPassport, type DataPassportProps } from './DataPassport';

export interface StoryScrollyModalProps {
  onClose: () => void;
  onOpenWorkbench: (aoiId?: string) => void;
  onOpenSciencePrimer: (tab?: 'sar101' | 'polarization' | 'rosetta' | 'hypotheses' | 'future') => void;
  onStartExpedition: () => void;
}

interface StoryBeat {
  beatNumber: number;
  waltzMeasure: string;
  title: string;
  subtitle: string;
  narrativeParagraphs: string[];
  keyTakeaway: string;
  aoiLinkId: string;
  passport: DataPassportProps;
}

const STORY_BEATS: StoryBeat[] = [
  {
    beatNumber: 1,
    waltzMeasure: 'Measure 1/8 · The Monsoon Curtain',
    title: '1. The Question: How Do You Map a Mountain Gorge Through Monsoon Clouds?',
    subtitle: 'Why optical satellites go blind during peak Himalayan hazards while active radar sees through clouds',
    narrativeParagraphs: [
      'During the July–September South Asian monsoon, dense convective cloud decks shroud the Bhotekoshi–Trishuli corridor in Rasuwa District, Nepal (28.18°N, 85.35°E) for weeks at a time. When glacial-lake outburst floods, transboundary debris flows, or slope failures strike steep river gorges, passive optical sensors (Landsat, Sentinel-2, MODIS) frequently return opaque white cloud masks.',
      'Synthetic Aperture Radar (SAR) solves the cloud problem by transmitting its own coherent microwave pulses (wavelength λ = 24 cm in L-band, λ = 9.4 cm in S-band, λ = 5.6 cm in C-band) and recording the amplitude and phase of the returning ground echo—day or night, through cloud, smoke, and rain.',
    ],
    keyTakeaway:
      'Active microwave pulses penetrate cloud cover; the analytical challenge shifts from "waiting for a clear sky" to decoding dielectric permittivity, surface roughness, and viewing geometry.',
    aoiLinkId: 'rasuwa_nepal',
    passport: {
      classification: 'MODEL_OUTPUT',
      title: 'NASA GIBS MODIS & GPM IMERG Monsoon Context',
      granuleId: 'MODIS_Terra_CorrectedReflectance_TrueColor / IMERG_Precipitation_Rate',
      collectionShortName: 'NASA EOSDIS GIBS Standard WMTS',
      acquisitionDates: '2026-07-01 to 2026-09-01 Monsoon Window',
      crid: 'GIBS_WMTS',
      units: 'Optical True Color + Passive/Active Microwave Rain Rate',
      maskRule: 'Synoptic Global EPSG:4326 Tiles',
      sourceUrl: 'https://worldview.earthdata.nasa.gov/',
      credit: 'NASA EOSDIS Worldview & GIBS (2026)',
    },
  },
  {
    beatNumber: 2,
    waltzMeasure: 'Measure 2/8 · The 12-Day Orbital Waltz',
    title: '2. The Instrument: NASA–ISRO NISAR and the 240 km SweepSAR Waltz',
    subtitle: 'Dual-frequency L-Band (24 cm) + S-Band (9.4 cm) repeating every 12 days',
    narrativeParagraphs: [
      'Launched in 2025, the joint NASA–ISRO Synthetic Aperture Radar (NISAR) mission pairs a 24 cm L-band radar built by NASA JPL with a 9.4 cm S-band radar built by ISRO SAC aboard a single observatory feeding a 12-meter deployable mesh reflector.',
      'Using SweepSAR (transmit on full aperture, receive via digital beamforming across multiple sub-swaths), NISAR images a 240 km wide swath at 3–20 m resolution, returning to the exact same orbital track every 12 days on both ascending and descending passes.',
    ],
    keyTakeaway:
      'Like a 3/4 waltz (1: Reference Pass → 2: Secondary Pass → 3: Differential Interferogram & Log-Ratio Change), NISAR turns isolated radar snapshots into a continuous 12-day planetary heartbeat.',
    aoiLinkId: 'rasuwa_nepal',
    passport: {
      classification: 'CATALOG_SNAPSHOT',
      title: 'NASA CMR NISAR Level-2 Archive Catalog (ASF DAAC)',
      maturity: 'PROVISIONAL',
      granuleId: 'NISAR_L2_PR_GCOV_015_155_A_008_2005_DHDH_A_20260806T123338_20260806T123413_P05012_N_F_J_001',
      collectionShortName: 'NISAR_L2_GCOV_PROVISIONAL_V1',
      acquisitionDates: '2025-10 to 2026-10 (316 CMR Granules over Rasuwa BBox)',
      crid: 'P05012 / X05010',
      units: 'L-Band (1.257 GHz / 24 cm) · DHDH (HH+HV) & SH',
      maskRule: 'Ascending Track 155 / Frame 008 & Descending Track 032 / Frame 098',
      sourceUrl:
        'https://cmr.earthdata.nasa.gov/search/granules.json?provider=ASF&short_name=NISAR_L2_GCOV_PROVISIONAL_V1',
      credit: 'NASA/JPL-Caltech/ASF DAAC (2026)',
    },
  },
  {
    beatNumber: 3,
    waltzMeasure: 'Measure 3/8 · Real Coseismic Cryosphere Anchor',
    title: '3. Published NISAR Reference: The Hubbard Glacier Mw 7.0 Earthquake Pair',
    subtitle: 'Comparing real Nov 26, 2025 and Dec 8, 2025 NISAR acquisitions across the Dec 6 earthquake',
    narrativeParagraphs: [
      'To ground our analytical pipeline in verified NASA-published NISAR imagery, we examine the Hubbard Glacier / Yakutat Bay pair captured on November 26, 2025 and December 8, 2025—bracketing the December 6, 2025 Mw 7.0 strike-slip earthquake along the Fairweather–Queen Charlotte fault system.',
      'Across the 12-day repeat interval, the L-band radar captures both coseismic ice fracturing and calving-margin reorganization at the tidewater terminus, backed by 624 real NISAR granules in the NASA CMR archive over the Yakutat/Hubbard bounding box.',
    ],
    keyTakeaway:
      'Every visualization in this platform separates NASA-published reference imagery (NASA_PUBLISHED_BROWSE) from catalog metadata and synthetic physics fixtures.',
    aoiLinkId: 'hubbard_glacier',
    passport: {
      classification: 'NASA_PUBLISHED_BROWSE',
      title: 'NASA Earth Observatory Published NISAR L-Band Pair',
      maturity: 'BROWSE',
      granuleId: 'hubbard-2025-11-26.jpg / hubbard-2025-12-08.jpg',
      collectionShortName: 'NASA Earth Observatory NISAR Reference',
      acquisitionDates: '2025-11-26 vs 2025-12-08 UTC (12-Day Repeat)',
      crid: 'Published Reference',
      units: 'L-Band (24 cm) · Multi-Pol Reference Visualization',
      maskRule: '800×800 px Reference Pair + 624 CMR Granules',
      sourceUrl:
        'https://science.nasa.gov/earth/earth-observatory/glacier-aftereffects-of-the-hubbard-earthquake/',
      credit: 'NASA Earth Observatory / JPL-Caltech / ASF / USGS (2026)',
    },
  },
  {
    beatNumber: 4,
    waltzMeasure: 'Measure 4/8 · Log-Ratio Change Detection',
    title: '4. Before vs. After in Rasuwa: Quantifying dB Backscatter Shifts',
    subtitle: 'Why radar change detection uses 10·log10(I_after / I_before) and Stable-ROI noise calibration',
    narrativeParagraphs: [
      'Because coherent radar speckle is multiplicative in linear power, subtracting raw pixel brightness produces noisy false alarms in bright terrain. Instead, SAR analysts compute the logarithmic ratio in decibels: Δσ⁰_dB = σ⁰_after(dB) - σ⁰_before(dB) = 10·log10(I_after / I_before).',
      'In our Rasuwa–Bhotekoshi retrospective datum pack (6,803 exact-AOI CMR granules across a 4,774.048 km² HydroBASINS catchment), Sentinel-1D HyP3 coherence dropped from 0.5129 to 0.3950 inside the preliminary UNOSAT detachment (flagging 158/307 target pixels vs 1,225/30,161 control false alarms), while 3-view OPERA RTC-S1 flagged 1.1871 km² across 48.15% observable terrain—and NISAR GUNW honestly failed phase continuity (9/528 pixels) at the steep source.',
    ],
    keyTakeaway:
      'Never report a single deterministic change number without its threshold T (dB), Minimum Mapping Unit (MMU), false-alarm rate, and explicit terrain-observability limits.',
    aoiLinkId: 'rasuwa_nepal',
    passport: {
      classification: 'TEST_FIXTURE',
      title: 'Co-Registered L-Band GCOV Backscatter Change Grid',
      granuleId: 'SYNTH_RASUWA_NEPAL_2026-08-06_2026-08-30',
      collectionShortName: 'SYNTHETIC_WORKBENCH_FIXTURE',
      acquisitionDates: '2026-08-06 vs 2026-08-30 (Bracketing Aug 2026 Monsoon Window)',
      crid: 'SYNTHETIC_FIXTURE',
      units: 'L-Band (24 cm) · HH & HV Calibrated dB Fixture (120 m grid)',
      maskRule: 'Log-ratio dB differencing + Stable-ROI 2.5σ threshold + MMU speckle filter',
      sourceUrl:
        'https://search.asf.alaska.edu/#/?dataset=NISAR&polygon=POLYGON((85.2%2028.05,85.45%2028.05,85.45%2028.3,85.2%2028.3,85.2%2028.05))',
      credit: 'Echoes of Rasuwa Workbench (2026) paired with NASA CMR',
    },
  },
  {
    beatNumber: 5,
    waltzMeasure: 'Measure 5/8 · Polarimetry & InSAR Phase',
    title: '5. Separating Water from Debris: HH Double-Bounce, HV Volume & GUNW Phase',
    subtitle: 'How polarization and interferometric coherence resolve ambiguous single-channel echoes',
    narrativeParagraphs: [
      'A single radar channel cannot tell whether a bright echo is a flooded gallery forest or a boulder landslide fan. Comparing polarizations resolves the ambiguity: open standing water acts as a smooth mirror that reflects radar energy away (-5 to -8 dB drop in both HH and HV), whereas water beneath standing trees creates a dihedral trunk–water corner reflector that spikes HH (+4 to +7 dB) relative to HV.',
      'Meanwhile, NISAR Level-2 GUNW (Geocoded Unwrapped Interferogram) measures relative Line-of-Sight (LOS) range changes (1 fringe = λ/2 = 12.0 cm in L-band) relative to a stable reference point—tracking millimeter-to-centimeter slope creep or aquifer subsidence wherever coherence γ ≥ 0.35.',
    ],
    keyTakeaway:
      'Combine amplitude (HH, HV, HH/HV ratio) with interferometric coherence (γ) and relative LOS phase (Δϕ) to separate water ponding, canopy disturbance, and crustal strain.',
    aoiLinkId: 'pantanal_brazil',
    passport: {
      classification: 'CATALOG_SNAPSHOT',
      title: 'NISAR Level-2 GCOV & GUNW Multi-Pol Archive',
      maturity: 'PROVISIONAL',
      granuleId:
        'NISAR_L2_PR_GUNW_015_155_A_008_008_4000_SH_20260725T123338_20260725T123412_20260806T123338_20260806T123413_P05012_N_F_J_001',
      collectionShortName: 'NISAR_L2_GUNW_PROVISIONAL_V1',
      acquisitionDates: '2026-07-25 → 2026-08-06 (12-Day Interferometric Pair)',
      crid: 'P05012',
      units: '80 m GUNW Unwrapped Phase (rad) / 20 m GCOV Backscatter',
      maskRule: 'Ascending Track 155 · Frame 008 · Coherence γ ≥ 0.35',
      sourceUrl: 'https://nisar.jpl.nasa.gov/data/products/',
      credit: 'NASA/JPL-Caltech (2025) NISAR Data User Guide',
    },
  },
  {
    beatNumber: 6,
    waltzMeasure: 'Measure 6/8 · The Multi-Mission Rosetta',
    title: '6. One Planet, Eight Radars: NISAR L/S, Sentinel-1, CSA RCM/RADARSAT-1 & CONAE SAOCOM',
    subtitle:
      'Matching radar wavelength (24 cm vs 9.4 cm vs 5.6 cm) and constellation cadence to the science question',
    narrativeParagraphs: [
      'No single satellite answers every Earth-observation question. While NISAR L-band (24 cm) excels at penetrating dense forest canopies and maintaining 12-day interferometric coherence over vegetated slopes, Canadian Space Agency (CSA) RADARSAT Constellation Mission (RCM, C-band 5.6 cm) provides 4-day constellation revisits and compact polarization, and CSA RADARSAT-1 extends historical baselines back to 1995.',
      'Similarly, Argentina CONAE SAOCOM 1A/1B provides operational L-band (23.5 cm) quad-pol coverage over the Americas, ESA Sentinel-1 provides open 6–12 day C-band continuity, and NASA UAVSAR provides 1–2 m airborne full quad-pol testbeds.',
    ],
    keyTakeaway:
      'Use the Sensor Rosetta to choose the right wavelength, polarization, and revisit cadence for your biome and timescale.',
    aoiLinkId: 'san_joaquin_usa',
    passport: {
      classification: 'CATALOG_SNAPSHOT',
      title: 'Multi-Mission SAR Rosetta & Cross-Archive Catalog',
      granuleId: 'NISAR_L / NISAR_S / SENTINEL1_C / CSA_RCM / RADARSAT1 / SAOCOM_L / ALOS2 / UAVSAR',
      collectionShortName: 'Multi-Agency SAR Archives',
      acquisitionDates: '1995–2026 Multi-Mission Archive',
      crid: 'MULTI_MISSION',
      units: 'L-Band (24 cm), S-Band (9.4 cm), C-Band (5.6 cm)',
      maskRule: '1.6 m (UAVSAR) to 100 m (ScanSAR)',
      sourceUrl: 'https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/',
      credit: 'NASA, ISRO, CSA, CONAE, ESA & JAXA SAR Mission Documentation (2026)',
    },
  },
  {
    beatNumber: 7,
    waltzMeasure: 'Measure 7/8 · Confounders & Falsification',
    title: '7. Scientific Humility: Confounders, Geometric Layover & Falsification Criteria',
    subtitle: 'Why an honest SAR analyst always tests alternative physical explanations',
    narrativeParagraphs: [
      'A dark patch on a SAR image can be floodwater—or radar shadow behind a steep ridge, smooth dry alluvium, or frozen soil whose dielectric constant dropped from ε ≈ 25 to ε ≈ 4. At the exact Rasuwa collapse moment (2026-08-26T02:52:10Z), native half-hour GPM IMERG measured 0.0 mm/hr (±0.24 mm/hr), refuting a localized rainstorm trigger.',
      'Every hypothesis in our Workbench and Field Expedition carries explicit confounders, discriminating tests (comparing ascending vs. descending tracks, checking RTC layover masks, or checking acquisition vs. 3.25–46.38 day CMR archive insertion clocks), and falsification criteria.',
    ],
    keyTakeaway:
      'SAR measures physical electromagnetic scattering and range change—attributing those signals to a hazard requires testing confounders and integrating ancillary observations.',
    aoiLinkId: 'hatay_turkiye',
    passport: {
      classification: 'SIMULATION',
      title: '8-Phenomenon Rule-Based Hypothesis & Confounder Engine',
      granuleId: 'HYPOTHESIS_ENGINE_V1_8_PHENOMENA',
      collectionShortName: 'PEDAGOGICAL_DIAGNOSTIC_RUBRIC',
      acquisitionDates: 'Multi-Temporal Diagnostic Evaluation',
      crid: 'HYPOTHESIS_RUBRIC',
      units: 'HH, HV, HH/HV Ratio, Coherence γ & Relative LOS',
      maskRule: 'Mandatory confounder & falsification checks',
      sourceUrl: 'https://appliedsciences.nasa.gov/what-we-do/capacity-building/arset',
      credit: 'NASA ARSET SAR Curriculum & NISAR Applications White Papers (2026)',
    },
  },
  {
    beatNumber: 8,
    waltzMeasure: 'Measure 8/8 · Open Science & Field Action',
    title: '8. From Orbit to Community: Reproducible Pipelines & Field Ground Truth',
    subtitle:
      'Explore the Analyst Workbench, run the HDF5 ingest pipeline, or enter the 5-Biome Field Expedition',
    narrativeParagraphs: [
      'Open science means every claim can be inspected, reproduced, and challenged. This repository ships with a standalone Python HDF5 ingest pipeline (pipeline/ingest_nisar.py), a Jupyter notebook tutorial, live NASA CMR granule discovery across 6 global AOIs, and an automated claim-integrity linter (npm run verify).',
      'Choose your next step below: jump into the Multi-Temporal Analyst Workbench to calibrate thresholds and export GeoJSON/CSV data, open the SAR 101 Physics Lab, or step into the 5-Biome Field Expedition to collect ground-truth observations on the ground.',
    ],
    keyTakeaway:
      'Satellite radar reaches its full societal value when open algorithms, transparent uncertainty bounds, and local ground-truth stewardship work together.',
    aoiLinkId: 'yukon_alaska',
    passport: {
      classification: 'CATALOG_SNAPSHOT',
      title: 'Open-Source NISAR Workbench & Reproducible Pipeline',
      granuleId: 'ECHOES_OF_RASUWA_GLOBAL_WALTZ_V2026',
      collectionShortName: 'MIT Open-Source Submission',
      acquisitionDates: '2025–2026 NISAR Archive + Multi-Mission Context',
      crid: 'V2026_VERIFIED',
      units: 'Full L/S/C Multi-Mission Integration',
      maskRule: 'End-to-end provenance from NASA CMR to DataPassport-stamped exports',
      sourceUrl: 'https://github.com/swaruptimsina/echoes-of-rasuwa-global-waltz',
      credit: 'Echoes of Rasuwa: Global Waltz (2026)',
    },
  },
];

interface SonificationStep {
  passNumber: number;
  dateIso: string;
  hhDb: number;
  hvDb: number;
  coherence: number;
  pitchHz: number;
  acousticDescription: string;
  physicalInterpretation: string;
}

const SONIFICATION_SERIES: SonificationStep[] = [
  {
    passNumber: 1,
    dateIso: '2026-07-01',
    hhDb: -11.2,
    hvDb: -17.1,
    coherence: 0.84,
    pitchHz: 330,
    acousticDescription: 'Clear E4 waltz downbeat + pure harmonic fifth (high coherence γ=0.84)',
    physicalInterpretation: 'Pre-monsoon baseline: stable valley floor and intact hillslope coherence.',
  },
  {
    passNumber: 2,
    dateIso: '2026-07-13',
    hhDb: -10.4,
    hvDb: -16.6,
    coherence: 0.79,
    pitchHz: 349,
    acousticDescription: 'Warm F4 downbeat (+0.8 dB dielectric soil wetting)',
    physicalInterpretation: 'Early monsoon rainfall raises top-5 cm soil dielectric permittivity.',
  },
  {
    passNumber: 3,
    dateIso: '2026-07-25',
    hhDb: -9.8,
    hvDb: -16.1,
    coherence: 0.74,
    pitchHz: 370,
    acousticDescription: 'Rising F#4 downbeat with steady canopy volume chord',
    physicalInterpretation: 'Progressive soil saturation and peak summer vegetation canopy volume.',
  },
  {
    passNumber: 4,
    dateIso: '2026-08-06',
    hhDb: -10.1,
    hvDb: -16.3,
    coherence: 0.76,
    pitchHz: 362,
    acousticDescription: 'Balanced F#4 waltz measure prior to late-August disturbance',
    physicalInterpretation: 'Immediate pre-event reference pass (Track 155 / Frame 008).',
  },
  {
    passNumber: 5,
    dateIso: '2026-08-18',
    hhDb: -15.6,
    hvDb: -20.8,
    coherence: 0.22,
    pitchHz: 220,
    acousticDescription:
      'Sharp drop to low A3 (-5.5 dB specular water loss) + detuned shimmer (γ=0.22 decorrelation)',
    physicalInterpretation: 'Valley-floor inundation pocket: specular forward scatter + coherence collapse.',
  },
  {
    passNumber: 6,
    dateIso: '2026-08-30',
    hhDb: -7.4,
    hvDb: -12.9,
    coherence: 0.31,
    pitchHz: 440,
    acousticDescription:
      'Bright A4 spike (+2.7 dB rough debris fan gain) with partial coherence recovery',
    physicalInterpretation:
      'Post-flood rough boulder/debris deposition along gorge toe as standing water recedes.',
  },
];

export const StoryScrollyModal: React.FC<StoryScrollyModalProps> = ({
  onClose,
  onOpenWorkbench,
  onOpenSciencePrimer,
  onStartExpedition,
}) => {
  const [activeBeatIdx, setActiveBeatIdx] = useState<number>(0);
  const [isSonificationPlaying, setIsSonificationPlaying] = useState<boolean>(false);
  const [activeSonificationStep, setActiveSonificationStep] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const stopSonification = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsSonificationPlaying(false);
    setActiveSonificationStep(null);
  };

  const playWaltzMeasureSound = (step: SonificationStep) => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const notes = [
        { time: 0.0, freq: step.pitchHz, gain: 0.12, type: 'sine' as OscillatorType },
        { time: 0.26, freq: step.pitchHz * 1.25, gain: 0.07, type: 'triangle' as OscillatorType },
        {
          time: 0.52,
          freq: step.coherence >= 0.5 ? step.pitchHz * 1.5 : step.pitchHz * 1.414,
          gain: 0.07,
          type: step.coherence >= 0.5 ? ('sine' as OscillatorType) : ('sawtooth' as OscillatorType),
        },
      ];

      for (const n of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = n.type;
        osc.frequency.setValueAtTime(n.freq, now + n.time);
        gain.gain.setValueAtTime(0.001, now + n.time);
        gain.gain.exponentialRampToValueAtTime(n.gain, now + n.time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.time);
        osc.stop(now + n.time + 0.25);
      }
    } catch {
      // Ignore audio errors in headless environments
    }
  };

  const handleToggleSonification = () => {
    if (isSonificationPlaying) {
      stopSonification();
      return;
    }

    setIsSonificationPlaying(true);
    let idx = 0;
    setActiveSonificationStep(0);
    playWaltzMeasureSound(SONIFICATION_SERIES[0]);

    timerRef.current = window.setInterval(() => {
      idx += 1;
      if (idx >= SONIFICATION_SERIES.length) {
        stopSonification();
        return;
      }
      setActiveSonificationStep(idx);
      playWaltzMeasureSound(SONIFICATION_SERIES[idx]);
    }, 880);
  };

  return (
    <div
      data-testid="story-scrolly-modal"
      role="dialog"
      aria-modal="true"
      aria-label="8-Beat Scrollytelling Story Mode and Time-Series Sonification"
      className="fixed inset-0 z-[950] bg-[#080d14] text-slate-100 flex flex-col overflow-y-auto"
    >
      <header className="sticky top-0 z-30 bg-[#0e1622] border-b border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-mono font-bold">
              DOOR 1 · 8-BEAT SCROLLYTELLING STORY
            </span>
            <h1 className="text-base sm:text-lg font-bold font-mono text-white">
              DANCING WITH THE SARs // THE 12-DAY ORBITAL WALTZ
            </h1>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Every narrative beat is anchored by an explicit DataPassport and links directly to the live Analyst Workbench
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenWorkbench('rasuwa_nepal')}
            className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-bold flex items-center gap-1.5"
          >
            Open Analyst Workbench <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Story Mode"
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Return
          </button>
        </div>
      </header>

      <div className="max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <nav aria-label="Story Beats Navigation" className="bg-[#111926] border border-slate-700 rounded-lg p-3">
          <div className="text-[11px] font-mono uppercase text-slate-400 mb-2">
            Jump to Story Beat (8 Beats in 3/4 Orbital Waltz Cadence):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {STORY_BEATS.map((b, idx) => (
              <button
                key={b.beatNumber}
                type="button"
                onClick={() => {
                  setActiveBeatIdx(idx);
                  const el = document.getElementById(`story-beat-${b.beatNumber}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`text-left px-2.5 py-1.5 rounded text-[11px] font-mono border transition ${
                  activeBeatIdx === idx
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                    : 'bg-[#0b1017] border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="truncate">
                  Beat {b.beatNumber}: {b.title.split(':')[0].replace(/^\d+\.\s*/, '')}
                </div>
              </button>
            ))}
          </div>
        </nav>

        <section
          aria-label="Hear the Surface Change — 3/4 Waltz Time-Series Sonification"
          className="bg-[#111926] border-2 border-amber-500/50 rounded-lg p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {isSonificationPlaying ? (
                <Volume2 className="w-5 h-5 text-amber-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-400" />
              )}
              <div>
                <h2 className="text-sm font-bold font-mono text-amber-300 uppercase">
                  Multimodal Data Sonification · Hear the 12-Day SAR Time Series (Muted by Default)
                </h2>
                <p className="text-xs text-slate-300">
                  Maps each 12-day NISAR pass into a 3/4 Waltz measure: Beat 1 = HH Backscatter pitch (Hz), Beat 2 = HV Canopy Volume fifth, Beat 3 = Interferometric Coherence (pure fifth when coherent γ ≥ 0.50; dissonant tritone when decorrelated).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSonification}
              className={`px-3.5 py-2 rounded font-mono text-xs font-bold flex items-center gap-1.5 border ${
                isSonificationPlaying
                  ? 'bg-rose-900/90 border-rose-400 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300'
              }`}
            >
              {isSonificationPlaying ? (
                <>
                  <Square className="w-3.5 h-3.5" /> Stop Radar Waltz Audio
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Play 6-Pass Sonification Waltz
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-[11px]">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-1.5 px-2">Pass / Date</th>
                  <th className="py-1.5 px-2">HH (dB)</th>
                  <th className="py-1.5 px-2">HV (dB)</th>
                  <th className="py-1.5 px-2">Coherence γ</th>
                  <th className="py-1.5 px-2">Acoustic Mapping</th>
                  <th className="py-1.5 px-2">Physical Interpretation (Text Transcript)</th>
                </tr>
              </thead>
              <tbody>
                {SONIFICATION_SERIES.map((s, idx) => {
                  const isCurrent = activeSonificationStep === idx;
                  return (
                    <tr
                      key={s.dateIso}
                      className={`border-b border-slate-800/80 ${
                        isCurrent ? 'bg-amber-500/20 text-white font-bold' : 'text-slate-300'
                      }`}
                    >
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        Pass #{s.passNumber} · {s.dateIso}
                      </td>
                      <td className="py-1.5 px-2 tabular-nums">{s.hhDb.toFixed(1)} dB</td>
                      <td className="py-1.5 px-2 tabular-nums">{s.hvDb.toFixed(1)} dB</td>
                      <td className="py-1.5 px-2 tabular-nums">{s.coherence.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-amber-200">{s.acousticDescription}</td>
                      <td className="py-1.5 px-2 text-slate-200">{s.physicalInterpretation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          {STORY_BEATS.map((beat, idx) => (
            <article
              key={beat.beatNumber}
              id={`story-beat-${beat.beatNumber}`}
              onMouseEnter={() => setActiveBeatIdx(idx)}
              className="bg-[#111926] border border-slate-700/90 rounded-lg p-5 space-y-4 shadow-lg"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[11px] font-mono uppercase text-amber-300 font-bold">
                    {beat.waltzMeasure}
                  </span>
                  <h2 className="text-lg font-bold font-mono text-white mt-0.5">{beat.title}</h2>
                  <p className="text-xs text-sky-300 font-mono">{beat.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenWorkbench(beat.aoiLinkId)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-sky-500/50 text-sky-200 text-xs font-mono flex items-center gap-1.5"
                >
                  Inspect in Workbench ({beat.aoiLinkId}) <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5 text-sm text-slate-200 leading-relaxed max-w-[75ch]">
                {beat.narrativeParagraphs.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}
              </div>

              <div className="bg-[#0b1017] border-l-4 border-amber-400 p-3 rounded text-xs font-mono text-amber-100">
                <strong className="text-amber-300 uppercase">Scientific Takeaway:</strong>{' '}
                {beat.keyTakeaway}
              </div>

              <DataPassport {...beat.passport} compact />
            </article>
          ))}
        </div>

        <footer className="bg-[#111926] border border-slate-700 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-300">
            Completed the 8-Beat Story? Continue into the interactive Analyst Workbench, SAR 101 Lab, or 5-Biome Field Expedition:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOpenWorkbench('rasuwa_nepal')}
              className="px-3.5 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold"
            >
              Launch SAR Analyst Workbench
            </button>
            <button
              type="button"
              onClick={() => onOpenSciencePrimer('sar101')}
              className="px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-mono text-xs font-bold"
            >
              Open SAR 101 & Rosetta
            </button>
            <button
              type="button"
              onClick={onStartExpedition}
              className="px-3.5 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold"
            >
              Enter 5-Biome Field Expedition
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default StoryScrollyModal;
