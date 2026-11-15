import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Compass,
  ExternalLink,
  Layers,
  Radio,
  Sparkles,
  X,
} from 'lucide-react';
import {
  evaluateCandidateHypotheses,
  SURFACE_CHANGE_HYPOTHESES,
  type PhenomenonId,
} from '../science/hypotheses';
import {
  recommendSensorsForTask,
  SAR_MISSION_ROSETTA,
  type SensorMissionId,
} from '../science/sensorRosetta';

export interface SciencePrimerModalProps {
  initialTab?: 'sar101' | 'polarization' | 'rosetta' | 'hypotheses' | 'future';
  onClose: () => void;
}

export const SciencePrimerModal: React.FC<SciencePrimerModalProps> = ({
  initialTab = 'sar101',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'sar101' | 'polarization' | 'rosetta' | 'hypotheses' | 'future'>(
    initialTab
  );

  // SAR 101 interactive mini-demo states
  const [enlLooks, setEnlLooks] = useState<number>(4);
  const [incidenceDeg, setIncidenceDeg] = useState<number>(38);
  const [slopeDeg, setSlopeDeg] = useState<number>(28);
  const [soilMoistureVol, setSoilMoistureVol] = useState<number>(0.22);
  const [soilFrozen, setSoilFrozen] = useState<boolean>(false);
  const [rmsRoughnessCm, setRmsRoughnessCm] = useState<number>(2.2);
  const [losDisplacementCm, setLosDisplacementCm] = useState<number>(14.0);

  // Polarization Explorer state
  const [selectedPolChannel, setSelectedPolChannel] = useState<'HH' | 'HV' | 'VV' | 'HH_HV_RATIO' | 'QUAD_PAULI'>('HH');

  // Sensor Rosetta recommender state
  const [canopyDensity, setCanopyDensity] = useState<'dense_forest' | 'moderate_crops' | 'bare_urban_ice'>('dense_forest');
  const [needSubWeeklyRevisit, setNeedSubWeeklyRevisit] = useState<boolean>(false);
  const [needMultiDecadeBaseline, setNeedMultiDecadeBaseline] = useState<boolean>(false);
  const [needFreeImmediateDownload, setNeedFreeImmediateDownload] = useState<boolean>(true);
  const [selectedMissionId, setSelectedMissionId] = useState<SensorMissionId>('NISAR_L');

  // Hypothesis Engine state
  const [selectedPhenomenonId, setSelectedPhenomenonId] = useState<PhenomenonId>('flooding_wetlands');
  const [simHhDelta, setSimHhDelta] = useState<number>(-4.8);
  const [simHvDelta, setSimHvDelta] = useState<number>(-3.9);
  const [simCoherence, setSimCoherence] = useState<number>(0.24);
  const [simLosMeters, setSimLosMeters] = useState<number>(0.04);
  const [simSlopeDeg, setSimSlopeDeg] = useState<number>(4);

  // Derived SAR 101 physics quantities
  const speckleStdDb = useMemo(() => Number((5.57 / Math.sqrt(Math.max(1, enlLooks))).toFixed(2)), [enlLooks]);
  const isLayover = slopeDeg >= incidenceDeg;
  const effectiveDielectric = useMemo(() => {
    if (soilFrozen) return 4.2; // Frozen soil drops to low permittivity ~ dry soil
    return Number((3.5 + 62 * Math.pow(soilMoistureVol, 1.35)).toFixed(1));
  }, [soilMoistureVol, soilFrozen]);
  const simulatedMoistureDb = useMemo(() => {
    if (soilFrozen) return -15.4;
    return Number((-16.2 + 18.5 * Math.pow(soilMoistureVol, 0.85)).toFixed(1));
  }, [soilMoistureVol, soilFrozen]);

  // Rayleigh / Fraunhofer electromagnetic roughness parameter k * h_rms * cos(theta)
  const roughnessComparison = useMemo(() => {
    const cosTheta = Math.cos((incidenceDeg * Math.PI) / 180);
    const calcKh = (wavelengthCm: number) => {
      const k = (2 * Math.PI) / wavelengthCm;
      const kh = k * rmsRoughnessCm * cosTheta;
      const regime = kh < 0.3 ? 'Smooth (Specular)' : kh < 1.0 ? 'Intermediate (Bragg)' : 'Rough (Diffuse)';
      return { kh: Number(kh.toFixed(2)), regime };
    };
    return {
      lBand: calcKh(24.0),
      sBand: calcKh(9.4),
      cBand: calcKh(5.6),
    };
  }, [rmsRoughnessCm, incidenceDeg]);

  // Sensor recommendations
  const sensorRecommendations = useMemo(
    () =>
      recommendSensorsForTask({
        canopyDensity,
        needSubWeeklyRevisit,
        needMultiDecadeBaseline,
        needFreeImmediateDownload,
      }),
    [canopyDensity, needSubWeeklyRevisit, needMultiDecadeBaseline, needFreeImmediateDownload]
  );

  // Ranked candidate hypotheses
  const rankedHypotheses = useMemo(
    () =>
      evaluateCandidateHypotheses({
        meanDeltaHhDb: simHhDelta,
        meanDeltaHvDb: simHvDelta,
        meanCoherence: simCoherence,
        maxAbsLosMeters: simLosMeters,
        terrainSlopeDeg: simSlopeDeg,
      }),
    [simHhDelta, simHvDelta, simCoherence, simLosMeters, simSlopeDeg]
  );

  const activePhenomenon = SURFACE_CHANGE_HYPOTHESES[selectedPhenomenonId];
  const activeMission = SAR_MISSION_ROSETTA[selectedMissionId];

  return (
    <div
      data-testid="science-primer-modal"
      role="dialog"
      aria-modal="true"
      aria-label="SAR 101 Physics, Polarization Explorer, Sensor Rosetta, and Hypothesis Engine"
      className="fixed inset-0 z-[950] bg-slate-950/90 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#0d1520] border-2 border-slate-600 rounded-lg max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <header className="bg-[#111c2b] border-b border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base sm:text-lg font-bold font-mono text-slate-100">
                HOW SPACE RADAR WORKS — SIMPLE SCIENCE GUIDE
              </h2>
              <p className="text-xs text-slate-300">
                Simple guide based on NASA NISAR, ARSET, CSA, and CONAE public training guides
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close How Space Radar Works guide"
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 text-xs font-mono flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </header>

        {/* Tab Bar */}
        <nav
          aria-label="Science Lab Sections"
          className="bg-[#0b111a] border-b border-slate-800 px-4 py-2 flex flex-wrap gap-1.5"
        >
          {(
            [
              { id: 'sar101', label: '1. 5 Simple Radar Rules' },
              { id: 'polarization', label: '2. Radar Angles (HH / HV / VV)' },
              { id: 'rosetta', label: '3. Which Satellite to Use (8 Tools)' },
              { id: 'hypotheses', label: '4. Match the Disaster Clue (8 Events)' },
              { id: 'future', label: '5. Why Space Radar Matters' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold border transition ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold'
                  : 'bg-[#111926] text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-200">
          {activeTab === 'sar101' && (
            <div className="space-y-4">
              <div className="bg-[#111926] border border-slate-700 rounded p-3.5 text-xs font-mono space-y-1">
                <div className="text-amber-300 font-bold uppercase">
                  In Simple Words: Why Space Radar Is Different From a Normal Camera
                </div>
                <p className="text-slate-300 leading-relaxed">
                  A normal camera needs sunlight and gets blocked by clouds and smoke. Space radar (like NASA&apos;s NISAR satellite) beams down its own long radio waves (24 cm or 9.4 cm wide) and listens to the echo bouncing back. Because radio waves pass straight through monsoon clouds and darkness, space radar sees the ground day and night. Move the 5 sliders below to see how it works!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Demo 1: Speckle & ENL */}
                <div className="bg-[#111926] border border-slate-700 rounded-lg p-3.5 space-y-2.5 font-mono text-xs">
                  <div className="font-bold text-sky-300 uppercase">
                    Rule 1 · Why Raw Radar Pictures Look Grainy (Speckle)
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Raw radar photos look salt-and-pepper grainy because echoes from leaves and pebbles mix together. Blending multiple shots together smooths out the grain so real changes stand out.
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label htmlFor="demo-enl-slider">Clearer Picture — Shots Merged ({enlLooks}):</label>
                      <span className="text-amber-300 font-bold">Grain Noise ±{speckleStdDb} dB</span>
                    </div>
                    <input
                      id="demo-enl-slider"
                      type="range"
                      min={1}
                      max={25}
                      value={enlLooks}
                      onChange={(e) => setEnlLooks(Number(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                  </div>
                  <div className="bg-[#0b1017] p-2 rounded border border-slate-800 text-[11px] text-slate-300">
                    Real change must be stronger than:{' '}
                    <strong className="text-white">±{(speckleStdDb * 2.5).toFixed(2)} dB</strong> (so we don&apos;t confuse noise for a disaster)
                  </div>
                </div>

                {/* Demo 2: Side-Looking Geometry, Layover & Shadow */}
                <div className="bg-[#111926] border border-slate-700 rounded-lg p-3.5 space-y-2.5 font-mono text-xs">
                  <div className="font-bold text-amber-300 uppercase">
                    Rule 2 · Sideways Viewing & Steep Mountains
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Space radar looks sideways, not straight down. If a mountain slope is steeper than the satellite&apos;s tilt angle, the mountaintop echo comes back BEFORE the bottom—scrambling the slope!
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="demo-inc-slider" className="block text-[11px] text-slate-400">
                        Satellite Side Tilt ({incidenceDeg}°):
                      </label>
                      <input
                        id="demo-inc-slider"
                        type="range"
                        min={25}
                        max={52}
                        value={incidenceDeg}
                        onChange={(e) => setIncidenceDeg(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </div>
                    <div>
                      <label htmlFor="demo-slope-slider" className="block text-[11px] text-slate-400">
                        Mountain Steepness ({slopeDeg}°):
                      </label>
                      <input
                        id="demo-slope-slider"
                        type="range"
                        min={0}
                        max={55}
                        value={slopeDeg}
                        onChange={(e) => setSlopeDeg(Number(e.target.value))}
                        className="w-full accent-sky-400"
                      />
                    </div>
                  </div>
                  <div
                    className={`p-2 rounded border text-[11px] ${
                      isLayover
                        ? 'bg-amber-950/60 border-amber-400 text-amber-200'
                        : 'bg-[#0b1017] border-slate-800 text-slate-300'
                    }`}
                  >
                    {isLayover
                      ? `⚠ SCRAMBLED SLOPE (Mountain ${slopeDeg}° ≥ Satellite ${incidenceDeg}°): Peak echoes arrive before the valley floor! View from the other side of the valley to fix.`
                      : `✓ CLEAR VIEW (Mountain ${slopeDeg}° < Satellite ${incidenceDeg}°): Slope order stays normal and easy to map.`}
                  </div>
                </div>

                {/* Demo 3: Dielectric Constant & Freeze-Thaw */}
                <div className="bg-[#111926] border border-slate-700 rounded-lg p-3.5 space-y-2.5 font-mono text-xs">
                  <div className="font-bold text-sky-300 uppercase">
                    Rule 3 · Wet Ground Bounces Stronger (Unless Frozen!)
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Liquid water acts like a bright mirror for radar (water score ~80 vs. dry dirt ~4). Soaking mud bounces back much louder—unless it freezes solid into ice, dropping back down like dry dirt.
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="demo-moisture-slider" className="text-[11px]">
                      How Wet the Soil Is ({Math.round(soilMoistureVol * 100)}%):
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-amber-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={soilFrozen}
                        onChange={(e) => setSoilFrozen(e.target.checked)}
                        className="accent-amber-400"
                      />
                      Freeze Soil (&lt; 0°C)
                    </label>
                  </div>
                  <input
                    id="demo-moisture-slider"
                    type="range"
                    min={0.03}
                    max={0.45}
                    step={0.01}
                    value={soilMoistureVol}
                    onChange={(e) => setSoilMoistureVol(Number(e.target.value))}
                    className="w-full accent-sky-400"
                  />
                  <div className="bg-[#0b1017] p-2 rounded border border-slate-800 text-[11px] flex justify-between">
                    <span>Water Mirror Score ≈ {effectiveDielectric}</span>
                    <span className="font-bold text-amber-300">Radar Echo ≈ {simulatedMoistureDb} dB</span>
                  </div>
                </div>

                {/* Demo 4: Surface Roughness vs Wavelength */}
                <div className="bg-[#111926] border border-slate-700 rounded-lg p-3.5 space-y-2.5 font-mono text-xs">
                  <div className="font-bold text-amber-300 uppercase">
                    Rule 4 · Bumpy vs. Smooth Depends on Wave Size
                  </div>
                  <p className="text-[11px] text-slate-300">
                    A pebble road feels smooth to a big wave (24 cm) and bounces away dark, but feels bumpy to a tiny wave (5 cm) and scatters bright. Slide bump size to compare:
                  </p>
                  <div>
                    <label htmlFor="demo-rough-slider" className="block text-[11px]">
                      How Bumpy the Ground Is = {rmsRoughnessCm.toFixed(1)} cm bumps:
                    </label>
                    <input
                      id="demo-rough-slider"
                      type="range"
                      min={0.2}
                      max={6.0}
                      step={0.2}
                      value={rmsRoughnessCm}
                      onChange={(e) => setRmsRoughnessCm(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] bg-[#0b1017] p-2 rounded border border-slate-800">
                    <div>
                      <div className="text-sky-300 font-bold">NISAR Deep (24 cm)</div>
                      <div>Score = {roughnessComparison.lBand.kh}</div>
                      <div className="text-slate-400">{roughnessComparison.lBand.regime}</div>
                    </div>
                    <div>
                      <div className="text-amber-300 font-bold">NISAR Mid (9.4 cm)</div>
                      <div>Score = {roughnessComparison.sBand.kh}</div>
                      <div className="text-slate-400">{roughnessComparison.sBand.regime}</div>
                    </div>
                    <div>
                      <div className="text-slate-200 font-bold">Short Wave (5.6 cm)</div>
                      <div>Score = {roughnessComparison.cBand.kh}</div>
                      <div className="text-slate-400">{roughnessComparison.cBand.regime}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo 5: InSAR Phase Wrapping across Bands */}
              <div className="bg-[#111926] border border-slate-700 rounded-lg p-3.5 space-y-2 font-mono text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-sky-300 uppercase">
                    Rule 5 · Rainbow Stripes Count How Many Centimeters the Ground Moved
                  </span>
                  <span className="text-amber-300">
                    How Far the Ground Moved = {losDisplacementCm.toFixed(1)} cm
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Each full rainbow cycle (red → blue → red) equals half a wave of ground movement. Bigger waves make wider stripes that are easier to count without getting confused!
                </p>
                <input
                  id="demo-los-slider"
                  type="range"
                  min={0}
                  max={36}
                  step={0.5}
                  value={losDisplacementCm}
                  onChange={(e) => setLosDisplacementCm(Number(e.target.value))}
                  aria-label="Simulated ground movement in centimeters"
                  className="w-full accent-sky-400"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                  <div className="bg-[#0b1017] p-2 rounded border border-sky-500/40">
                    <div className="font-bold text-sky-300">NISAR Deep Wave (12 cm per stripe)</div>
                    <div>{(losDisplacementCm / 12.0).toFixed(2)} rainbow stripes (Easy to count big shifts)</div>
                  </div>
                  <div className="bg-[#0b1017] p-2 rounded border border-amber-500/40">
                    <div className="font-bold text-amber-300">NISAR Mid Wave (4.7 cm per stripe)</div>
                    <div>{(losDisplacementCm / 4.7).toFixed(2)} rainbow stripes (Medium detail)</div>
                  </div>
                  <div className="bg-[#0b1017] p-2 rounded border border-slate-700">
                    <div className="font-bold text-slate-200">Short Wave C-Band (2.8 cm per stripe)</div>
                    <div>{(losDisplacementCm / 2.78).toFixed(2)} rainbow stripes (Spots tiny shifts, tangles fast)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'polarization' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="bg-[#111926] border border-slate-700 rounded p-3 text-[11px] text-slate-200">
                <strong className="text-amber-300">In Simple Words:</strong> Radar waves can vibrate sideways (H = Horizontal) or up-and-down (V = Vertical), just like jumping rope! Different shapes on Earth bounce H and V waves differently—helping us tell flooded trees, forests, and smooth water apart.
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'HH', label: 'HH · Flat Bounce (Floods & Walls)' },
                    { id: 'HV', label: 'HV · Tree Branches (Forests & Debris)' },
                    { id: 'VV', label: 'VV · Tall Stems (Crops & Ripples)' },
                    { id: 'HH_HV_RATIO', label: 'HH vs HV · Water Under Trees' },
                    { id: 'QUAD_PAULI', label: 'Full Color Radar Recipe (RGB)' },
                  ] as const
                ).map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedPolChannel(ch.id)}
                    className={`px-3 py-1.5 rounded border ${
                      selectedPolChannel === ch.id
                        ? 'bg-sky-900 border-sky-400 text-white font-bold'
                        : 'bg-[#111926] border-slate-700 text-slate-300'
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>

              <div className="bg-[#111926] border border-slate-700 rounded-lg p-4 space-y-3">
                {selectedPolChannel === 'HH' && (
                  <>
                    <h3 className="text-sm font-bold text-amber-300">
                      HH · Sideways Wave: Best for Floods Under Trees &amp; Buildings
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      The satellite sends a sideways (Horizontal) wave and listens for a sideways echo. When radar hits flat floodwater and then bounces off a vertical tree trunk or house wall (like a pool-table corner shot), it comes back super bright! That&apos;s why NISAR uses HH to spot hidden floods under jungle trees and mangroves.
                    </p>
                  </>
                )}
                {selectedPolChannel === 'HV' && (
                  <>
                    <h3 className="text-sm font-bold text-sky-300">
                      HV · Cross Wave: Spots Messy Tree Branches &amp; Broken Rock Piles
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      The satellite sends a sideways wave (H) and listens for an up-and-down echo (V). Flat roads and calm water almost never twist a wave, so they look dark. Tangled tree branches, tall crops, and messy landslide rubble twist the wave in all directions—lighting up bright in HV so we can measure forest trees or fresh rockfalls.
                    </p>
                  </>
                )}
                {selectedPolChannel === 'VV' && (
                  <>
                    <h3 className="text-sm font-bold text-amber-300">
                      VV · Up-and-Down Wave: Best for Crops &amp; Water Ripples
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      The satellite sends an up-and-down wave (V) and listens for an up-and-down echo (V). Because wheat and rice stalks stand straight up, VV interacts strongly with farm fields and wind ripples on water—or smooth dark patches where an oil spill flattens the ripples.
                    </p>
                  </>
                )}
                {selectedPolChannel === 'HH_HV_RATIO' && (
                  <>
                    <h3 className="text-sm font-bold text-sky-300">
                      HH vs HV Compare · Separates Hidden Water From Regular Trees
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      We compare how loud the flat-water bounce (HH) is against the tree-branch bounce (HV). When a forest floor floods, HH jumps way up while tree branches (HV) stay the same—proving water is hiding underneath the canopy!
                    </p>
                  </>
                )}
                {selectedPolChannel === 'QUAD_PAULI' && (
                  <>
                    <h3 className="text-sm font-bold text-amber-300">
                      Full Color Radar Recipe (RGB) · Painting With Radio Waves
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      When a radar measures every bounce angle at once (like NASA airplanes and NISAR calibration passes), we turn the three main bounces into Red, Green, and Blue colors anyone can read:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-300">
                      <li>
                        <strong className="text-amber-300">Red/Pink (Corner Bounce):</strong> Flooded tree trunks, city buildings, and broken ice walls.
                      </li>
                      <li>
                        <strong className="text-emerald-300">Green (Branch Bounce):</strong> Forests, thick bushes, and farm crops.
                      </li>
                      <li>
                        <strong className="text-sky-300">Blue/Dark (Flat Surface):</strong> Calm lakes, bare dirt, roads, and flat glacier ice.
                      </li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'rosetta' && (
            <div className="space-y-4 font-mono text-xs">
              {/* Interactive Rule-Based Sensor Recommender */}
              <div className="bg-[#111926] border border-slate-700 rounded-lg p-3.5 space-y-3">
                <div className="text-amber-300 font-bold uppercase">
                  In Simple Words: Pick What You Need &amp; We&apos;ll Suggest the Best Satellite
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="ros-canopy-select" className="block text-[11px] text-slate-400 mb-1">
                      What Is on the Ground?
                    </label>
                    <select
                      id="ros-canopy-select"
                      value={canopyDensity}
                      onChange={(e) => setCanopyDensity(e.target.value as typeof canopyDensity)}
                      className="w-full bg-[#0b1017] border border-slate-600 rounded px-2 py-1.5 text-slate-100"
                    >
                      <option value="dense_forest">Thick Forest / Flooded Trees</option>
                      <option value="moderate_crops">Farms, Crops &amp; Bushes</option>
                      <option value="bare_urban_ice">Bare Rock, Cities or Glaciers</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 bg-[#0b1017] p-2 rounded border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={needSubWeeklyRevisit}
                      onChange={(e) => setNeedSubWeeklyRevisit(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>Need Photos Faster Than 1 Week</span>
                  </label>
                  <label className="flex items-center gap-2 bg-[#0b1017] p-2 rounded border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={needMultiDecadeBaseline}
                      onChange={(e) => setNeedMultiDecadeBaseline(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>Need 10–30 Years of Old Photos</span>
                  </label>
                  <label className="flex items-center gap-2 bg-[#0b1017] p-2 rounded border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={needFreeImmediateDownload}
                      onChange={(e) => setNeedFreeImmediateDownload(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>Free Public Download Only</span>
                  </label>
                </div>

                {/* Top 3 Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {sensorRecommendations.slice(0, 3).map((rec, idx) => (
                    <button
                      key={rec.sensor.id}
                      type="button"
                      onClick={() => setSelectedMissionId(rec.sensor.id)}
                      className={`text-left p-2.5 rounded border transition ${
                        selectedMissionId === rec.sensor.id
                          ? 'bg-sky-950/90 border-sky-400'
                          : 'bg-[#0b1017] border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">
                          #{idx + 1} {rec.sensor.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 text-[10px]">
                          Match {rec.matchScore}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {rec.sensor.band} ({rec.sensor.wavelengthCm} cm wave) · {rec.sensor.agencies}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1.5">{rec.rationale}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* All 8 Missions Comparison Selector & Detail Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {Object.values(SAR_MISSION_ROSETTA).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMissionId(m.id)}
                    className={`p-2 rounded border text-left ${
                      selectedMissionId === m.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                        : 'bg-[#111926] border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="truncate">{m.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {m.band} ({m.wavelengthCm} cm)
                    </div>
                  </button>
                ))}
              </div>

              <div className="bg-[#111926] border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{activeMission.name}</h3>
                    <div className="text-[11px] text-sky-300">
                      {activeMission.agencies} · {activeMission.band} (Wave size = {activeMission.wavelengthCm} cm /{' '}
                      {activeMission.frequencyGhz} GHz)
                    </div>
                  </div>
                  <a
                    href={activeMission.archiveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-sky-900/80 hover:bg-sky-800 border border-sky-400 text-white inline-flex items-center gap-1"
                  >
                    Open Satellite Website <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-[#0b1017] p-2.5 rounded border border-slate-800">
                    <div className="text-slate-400">How Often It Passes &amp; Width</div>
                    <div className="text-slate-100 mt-0.5">{activeMission.repeatCycleDays}</div>
                    <div className="text-amber-300 mt-0.5">Strip width: {activeMission.swathWidthKm}</div>
                  </div>
                  <div className="bg-[#0b1017] p-2.5 rounded border border-slate-800">
                    <div className="text-slate-400">Can See Under Trees? &amp; Stripe Size</div>
                    <div className="text-slate-100 mt-0.5">{activeMission.canopyPenetrationDepth}</div>
                    <div className="text-sky-300 mt-0.5">
                      1 Rainbow Stripe = {activeMission.fringeSensitivityPerHalfWavelengthCm} cm shift
                    </div>
                  </div>
                  <div className="bg-[#0b1017] p-2.5 rounded border border-slate-800">
                    <div className="text-slate-400">Who Can Download Data?</div>
                    <div className="text-slate-100 mt-0.5">{activeMission.dataAccessPolicy}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-[#0b1017] p-2.5 rounded border border-slate-800">
                    <div className="font-bold text-emerald-300 mb-1">What This Satellite Does Best</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      {activeMission.primaryStrengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-[#0b1017] p-2.5 rounded border border-slate-800">
                    <div className="font-bold text-amber-300 mb-1">Things to Watch Out For</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      {activeMission.keyLimitations.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hypotheses' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="bg-amber-950/40 border border-amber-500/50 rounded p-3 text-[11px] text-amber-100">
                <strong>IN SIMPLE WORDS — ONE CLUE IS NOT ENOUGH:</strong> A bright or dark radar spot can happen for multiple reasons (for example: mud getting wet looks similar to a flood). Move the 5 sliders below to see which disaster best matches the clues, plus what can fool the satellite!
              </div>

              {/* Interactive Anomaly Signature Tester */}
              <div className="bg-[#111926] border border-slate-700 rounded-lg p-3.5 space-y-3">
                <div className="text-sky-300 font-bold uppercase">
                  Test Your Clues (Guess What Happened on the Ground)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-[11px]">
                  <div>
                    <label htmlFor="hyp-hh-slider" className="block text-slate-400">
                      Water Bounce Change ({simHhDelta.toFixed(1)} dB):
                    </label>
                    <input
                      id="hyp-hh-slider"
                      type="range"
                      min={-8}
                      max={8}
                      step={0.2}
                      value={simHhDelta}
                      onChange={(e) => setSimHhDelta(Number(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="hyp-hv-slider" className="block text-slate-400">
                      Tree Bounce Change ({simHvDelta.toFixed(1)} dB):
                    </label>
                    <input
                      id="hyp-hv-slider"
                      type="range"
                      min={-8}
                      max={8}
                      step={0.2}
                      value={simHvDelta}
                      onChange={(e) => setSimHvDelta(Number(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="hyp-coh-slider" className="block text-slate-400">
                      Match Score ({simCoherence.toFixed(2)}):
                    </label>
                    <input
                      id="hyp-coh-slider"
                      type="range"
                      min={0.1}
                      max={0.95}
                      step={0.05}
                      value={simCoherence}
                      onChange={(e) => setSimCoherence(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="hyp-los-slider" className="block text-slate-400">
                      Ground Shift ({simLosMeters.toFixed(2)} m):
                    </label>
                    <input
                      id="hyp-los-slider"
                      type="range"
                      min={0}
                      max={0.4}
                      step={0.02}
                      value={simLosMeters}
                      onChange={(e) => setSimLosMeters(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="hyp-slope-slider" className="block text-slate-400">
                      Hill Steepness ({simSlopeDeg}°):
                    </label>
                    <input
                      id="hyp-slope-slider"
                      type="range"
                      min={0}
                      max={42}
                      step={1}
                      value={simSlopeDeg}
                      onChange={(e) => setSimSlopeDeg(Number(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {rankedHypotheses.slice(0, 3).map((item, idx) => (
                    <button
                      key={item.hypothesis.id}
                      type="button"
                      onClick={() => setSelectedPhenomenonId(item.hypothesis.id)}
                      className={`text-left p-2.5 rounded border ${
                        selectedPhenomenonId === item.hypothesis.id
                          ? 'bg-sky-950/90 border-sky-400'
                          : 'bg-[#0b1017] border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">
                          #{idx + 1} {item.hypothesis.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-200">
                          {item.confidenceTier} ({item.confidenceScore}%)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-1">{item.matchingEvidence[0]}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 8 Phenomena Selector Pills */}
              <div className="flex flex-wrap gap-1.5">
                {Object.values(SURFACE_CHANGE_HYPOTHESES).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSelectedPhenomenonId(h.id)}
                    className={`px-2.5 py-1 rounded text-[11px] border ${
                      selectedPhenomenonId === h.id
                        ? 'bg-amber-500 text-slate-950 border-white font-bold'
                        : 'bg-[#111926] text-slate-300 border-slate-700'
                    }`}
                  >
                    {h.title}
                  </button>
                ))}
              </div>

              {/* Detailed Phenomenon Card */}
              <div className="bg-[#111926] border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{activePhenomenon.title}</h3>
                    <span className="text-[11px] text-amber-300">
                      Topic: {activePhenomenon.nisarStoryMapTheme}
                    </span>
                  </div>
                  <span className="text-[11px] text-sky-300">
                    Helpful Extra Satellites: {activePhenomenon.ancillaryMissions.join(' · ')}
                  </span>
                </div>

                <p className="text-slate-300 text-xs">{activePhenomenon.summary}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-[#0b1017] p-3 rounded border border-slate-800 space-y-1.5">
                    <div className="font-bold text-sky-300 uppercase">What Clues We Expect to See</div>
                    <div>
                      <strong className="text-slate-200">Flat Bounce (HH):</strong> {activePhenomenon.expectedSignatures.hhBackscatter}
                    </div>
                    <div>
                      <strong className="text-slate-200">Branch Bounce (HV):</strong> {activePhenomenon.expectedSignatures.hvBackscatter}
                    </div>
                    <div>
                      <strong className="text-slate-200">Match Score:</strong>{' '}
                      {activePhenomenon.expectedSignatures.interferometricCoherence}
                    </div>
                    <div>
                      <strong className="text-slate-200">Ground Movement:</strong>{' '}
                      {activePhenomenon.expectedSignatures.losPhaseBehavior}
                    </div>
                  </div>

                  <div className="bg-[#0b1017] p-3 rounded border border-slate-800 space-y-2">
                    <div>
                      <div className="font-bold text-amber-300 uppercase">What Can Trick the Radar</div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-300 mt-1">
                        {activePhenomenon.confounders.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="font-bold text-emerald-300 uppercase">How to Double-Check</div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-300 mt-1">
                        {activePhenomenon.discriminatingTests.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                        {activePhenomenon.falsificationCriteria.map((f, i) => (
                          <li key={`f-${i}`} className="text-amber-200">
                            <strong>Not this if:</strong> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'future' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="bg-[#111926] border border-slate-700 rounded-lg p-4 space-y-2">
                <h3 className="text-sm font-bold text-amber-300 uppercase">
                  In Simple Words: Why NASA &amp; ISRO Built NISAR
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Launched in 2025 by NASA (USA) and ISRO (India), NISAR takes a fresh radar picture of almost all land and ice on Earth every 12 days—seeing right through storm clouds, wildfire smoke, and polar darkness. Even better, its data is completely free so local towns, scientists, and rescue teams everywhere can spot hidden danger early:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="bg-[#111926] border border-slate-700 rounded p-3.5 space-y-1.5">
                  <div className="font-bold text-sky-300">1. Landslides, Quakes &amp; Volcanoes</div>
                  <p className="text-slate-300">
                    Spots slow creeping hillsides in cloudy mountains (like the Himalayas and Andes), volcano swelling under ash clouds, and earthquake ground shifts along fault lines.
                  </p>
                </div>
                <div className="bg-[#111926] border border-slate-700 rounded p-3.5 space-y-1.5">
                  <div className="font-bold text-amber-300">2. Forests, Wildfires &amp; Smoke</div>
                  <p className="text-slate-300">
                    Looks right through wildfire smoke to measure burned trees and illegal tree clearing—helping protect thick rainforests like the Amazon.
                  </p>
                </div>
                <div className="bg-[#111926] border border-slate-700 rounded p-3.5 space-y-1.5">
                  <div className="font-bold text-sky-300">3. Melting Glaciers &amp; Ice</div>
                  <p className="text-slate-300">
                    Tracks how fast glaciers and ice sheets slide in Alaska, Greenland, and the Himalayas, even during dark winter months.
                  </p>
                </div>
                <div className="bg-[#111926] border border-slate-700 rounded p-3.5 space-y-1.5">
                  <div className="font-bold text-amber-300">
                    4. Hidden Floods, Sinking Farms &amp; Oil Spills
                  </div>
                  <p className="text-slate-300">
                    Finds floodwater hiding under trees, tracks sinking farmland when too much groundwater is pumped, and spots oil slicks out at sea.
                  </p>
                </div>
              </div>

              <div className="bg-[#0b1017] border border-sky-500/40 rounded-lg p-3.5 space-y-2 text-[11px]">
                <div className="font-bold text-amber-300 uppercase">
                  How Color Radar Pictures Work (Red = Water/Walls, Green = Trees, Blue = Smooth Ground)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Anyone can load free NASA NISAR images in free map software (QGIS or Python) and color the echoes Red (flooded trunks &amp; buildings), Green (forests), and Blue (calm lakes &amp; bare roads) to check what changed after a storm or quake.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SciencePrimerModal;
