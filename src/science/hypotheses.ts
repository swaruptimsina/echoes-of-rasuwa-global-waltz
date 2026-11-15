export type PhenomenonId =
  | 'flooding_wetlands'
  | 'glacier_ice_motion'
  | 'landslide_debris'
  | 'deforestation_fire'
  | 'agriculture_crop_cycle'
  | 'soil_moisture'
  | 'subsidence'
  | 'earthquake_fault_rupture';

export interface SurfaceChangeHypothesis {
  id: PhenomenonId;
  title: string;
  nisarStoryMapTheme: 'Water & Wetlands' | 'Cryosphere & Glaciers' | 'Solid Earth & Hazards' | 'Forests & Biomass' | 'Agriculture & Food Security';
  summary: string;
  expectedSignatures: {
    hhBackscatter: string;
    hvBackscatter: string;
    hhHvRatio: string;
    interferometricCoherence: string;
    losPhaseBehavior: string;
    optimalBandReason: string;
  };
  candidateDrivers: string[];
  confounders: string[];
  discriminatingTests: string[];
  falsificationCriteria: string[];
  ancillaryMissions: string[];
}

export const SURFACE_CHANGE_HYPOTHESES: Record<PhenomenonId, SurfaceChangeHypothesis> = {
  flooding_wetlands: {
    id: 'flooding_wetlands',
    title: 'Inundation & Sub-Canopy Wetland Flooding',
    nisarStoryMapTheme: 'Water & Wetlands',
    summary:
      'Distinguishes specular open-water inundation (sharp backscatter drop) from water beneath standing forest or marsh vegetation (strong L-band trunk–water double-bounce increase).',
    expectedSignatures: {
      hhBackscatter:
        'Open water: drops by -4 to -10 dB (specular forward reflection away from radar). Flooded forest/emergent vegetation: increases by +3 to +7 dB due to dihedral water–trunk double-bounce.',
      hvBackscatter:
        'Open water: drops strongly toward noise floor (<-22 dB). Flooded forest: remains moderate (-14 to -11 dB) from persistent crown volume scattering.',
      hhHvRatio:
        'Increases sharply (+4 to +8 dB) in flooded forest where dihedral HH double-bounce dominates over HV depolarized volume scatter.',
      interferometricCoherence:
        'Open water decorrelates completely (γ < 0.20) within milliseconds; flooded vegetation can retain partial L-band double-bounce coherence over 12 days.',
      losPhaseBehavior:
        'Open water phase is random noise; emergent wetland plants with coherent double-bounce can track relative water-level stage changes (wetland InSAR).',
      optimalBandReason:
        'L-band (24 cm) penetrates leafy forest canopies to reach the water surface and tree trunks; C-band (5.6 cm) scatters off upper leaves and misses sub-canopy flooding.',
    },
    candidateDrivers: [
      'Monsoon river overbank inundation or glacial-lake outburst flood (GLOF) ponding along valley floors',
      'Seasonal floodplain pulse beneath gallery forest or herbaceous marsh (e.g., Pantanal)',
      'Agricultural paddy flooding or reservoir stage rise',
    ],
    confounders: [
      'Strong surface wind (>7 m/s) roughening open water via Bragg capillary waves, raising HH/VV backscatter and masking inundation',
      'Wet snowpack or smooth paved/alluvial surfaces mimicking low specular backscatter',
      'Radar shadow in steep canyon walls mimicking dark open-water pixels',
    ],
    discriminatingTests: [
      'Compare HH vs HV: if HH increases while HV stays steady, sub-canopy double-bounce flooding is favored over open water.',
      'Check DEM Height Above Nearest Drainage (HAND) and slope (<5°): true ponding cannot persist on steep >20° slopes.',
      'Cross-check with OPERA DSWx (Dynamic Surface Water Extent) and GPM IMERG antecedent 7-day precipitation.',
    ],
    falsificationCriteria: [
      'Anomaly occurs on steep (>18°) hillslopes where water cannot pond (indicates radar shadow or freeze/dry soil drop instead).',
      'Coherence γ remains >0.75 across an alleged open-water pond (refutes open standing water).',
    ],
    ancillaryMissions: ['OPERA DSWx', 'GPM IMERG', 'SWOT', 'Landsat / Sentinel-2'],
  },

  glacier_ice_motion: {
    id: 'glacier_ice_motion',
    title: 'Glacier Flow, Crevassing & Cryosphere Dynamics',
    nisarStoryMapTheme: 'Cryosphere & Glaciers',
    summary:
      'Tracks ice-sheet and mountain-glacier velocity, crevasse opening, supraglacial meltwater ponding, and dynamically triggered calving or fracturing.',
    expectedSignatures: {
      hhBackscatter:
        'Increases (+2 to +6 dB) when smooth firn/ice fractures into rough crevasse fields or calving icebergs; decreases (-3 to -6 dB) during surface meltwater wetting.',
      hvBackscatter:
        'Increases across dry refrozen percolation zones and chaotic multi-bounce serac/crevasse blocks; drops during wet surface melt.',
      hhHvRatio:
        'Decreases slightly in chaotic serac fields due to strong multiple-scattering depolarization.',
      interferometricCoherence:
        'Drops in fast-flowing glacier trunks (>1 m/day) or active calving margins; L-band maintains higher 12-day coherence on snow/firn than C-band.',
      losPhaseBehavior:
        'Dense fringe belts along ice margins (GUNW) or meter-scale pixel offsets (GOFF dense feature tracking) where ice displacement exceeds half-wavelength phase aliasing.',
      optimalBandReason:
        'L-band (24 cm) has a 4.3× larger ambiguity velocity than C-band (5.6 cm) and penetrates dry surface snow, preserving 12-day coherence across mountain glaciers.',
    },
    candidateDrivers: [
      'Seasonal basal-sliding acceleration driven by subglacial meltwater pressurization',
      'Coseismic or post-seismic dynamic fracturing and serac collapse (e.g., Dec 6, 2025 Mw 7.0 Hubbard Glacier earthquake)',
      'Tidewater terminus calving and fjord mélange reorganization',
    ],
    confounders: [
      'Diurnal/seasonal surface meltwater transition (0°C isotherm) causing an abrupt -5 dB dielectric absorption drop without structural ice change',
      'Heavy fresh snowfall burial altering firn volume scattering',
      'Ionospheric streak artifacts at high latitudes mimicking ice-stream phase gradients in L-band GUNW',
    ],
    discriminatingTests: [
      'Inspect NISAR GOFF (Geocoded Pixel Offsets) alongside GUNW: when motion exceeds 12 cm per 12 days, speckle tracking resolves displacements where phase unwrapping aliases.',
      'Check MERRA-2 / NASA POWER 2m air temperature to separate warm-spell melt wetting (T > 0°C) from cold-season mechanical crevassing (T < -5°C).',
      'Compare ascending vs descending tracks to separate horizontal down-glacier flow from vertical surface lowering.',
    ],
    falsificationCriteria: [
      'Apparent backscatter drop reverses completely within 24–48 hours following a freeze event (proves transient surface melt rather than ice loss).',
      'Phase streaks cut straight across bedrock ridges and fjords alike (diagnostic of ionospheric scintillation, not glacier flow).',
    ],
    ancillaryMissions: ['ICESat-2 ATL06', 'ITS_LIVE Velocity', 'Operation IceBridge'],
  },

  landslide_debris: {
    id: 'landslide_debris',
    title: 'Hillslope Failure, Landslide Scars & Debris Fans',
    nisarStoryMapTheme: 'Solid Earth & Hazards',
    summary:
      'Detects pre-failure slow gravitational slope creep via L-band InSAR (GUNW) and post-failure canopy stripping / rough boulder debris deposition via polarimetric backscatter (GCOV).',
    expectedSignatures: {
      hhBackscatter:
        'Increases (+2 to +5 dB) where smooth soil or uniform grass is replaced by angular boulder/cobble debris fans; can decrease if failure exposes smooth wet clay slip planes.',
      hvBackscatter:
        'Drops (-2 to -5 dB) on vegetated slopes stripped of forest canopy; increases on rough blocky talus cones.',
      hhHvRatio:
        'Increases when forest cover (high HV) is stripped to bare rough rock/debris (higher HH surface/dihedral scattering).',
      interferometricCoherence:
        'Catastrophic failure zones suffer severe coherence loss (γ < 0.25) between pre- and post-failure passes; slow pre-failure creep retains moderate coherence (γ > 0.45) in L-band.',
      losPhaseBehavior:
        'Slow-moving landslides show localized downslope LOS phase lobes (mm to cm per 12-day cycle) bounded by headscarp and lateral shear margins.',
      optimalBandReason:
        'Steep Himalayan and cordilleran slopes are heavily vegetated; only L-band (24 cm) penetrates monsoon vegetation to maintain interferometric coherence on creeping hillslopes.',
    },
    candidateDrivers: [
      'Monsoon pore-pressure saturation triggering translational or rotational rock/debris slides',
      'Glacial-lake or moraine-dammed flood undercutting river gorge toes (e.g., Rasuwa / Bhotekoshi–Trishuli corridor)',
      'Coseismic slope failure during shallow crustal earthquakes',
    ],
    confounders: [
      'Geometric layover and foreshortening on slopes facing the radar look direction (~33°–47° incidence), compressing entire mountain faces into a few bright pixels',
      'Tropospheric water-vapor stratification correlated with elevation (topography-correlated phase delay mimicking slope creep)',
      'Agricultural terracing or road construction excavation',
    ],
    discriminatingTests: [
      'Verify layover/shadow mask from the RTC local incidence angle layer before interpreting any steep-wall anomaly.',
      'Combine ascending (east-looking) and descending (west-looking) tracks: west-facing slopes in layover on ascending passes are well-imaged in descending passes.',
      'Test whether GUNW phase scales linearly with elevation across stable ridges (diagnostic of stratified tropospheric delay, not localized slope motion).',
    ],
    falsificationCriteria: [
      'Anomaly lies inside the geometric radar shadow or layover mask derived from the DEM and orbit state vectors.',
      'Phase gradient appears identically on both sides of a stable bedrock ridge and vanishes after GACOS/weather-model tropospheric correction.',
    ],
    ancillaryMissions: ['OPERA DIST / RTC', 'SRTM / Copernicus DEM', 'GPM IMERG', 'Sentinel-2'],
  },

  deforestation_fire: {
    id: 'deforestation_fire',
    title: 'Canopy Disturbance, Deforestation & Fire Scars',
    nisarStoryMapTheme: 'Forests & Biomass',
    summary:
      'Monitors woody biomass removal, selective logging, windthrow, and wildfire consumption using cross-polarized L-band volume scattering (HV) and dual-band L+S sensitivity.',
    expectedSignatures: {
      hhBackscatter:
        'Variable: may drop (-1 to -3 dB) after complete clearing, or transiently rise (+2 dB) if felled trunks remain on wet soil creating dihedral corner reflectors.',
      hvBackscatter:
        'Consistent drop (-2.5 to -6 dB) as branches and trunks (primary L-band depolarizing scatterers) are removed.',
      hhHvRatio:
        'Increases after clearing because HV cross-pol volume scatter drops much faster than HH surface scatter.',
      interferometricCoherence:
        '12-day L-band coherence often increases (γ rises from ~0.40 to >0.70) after forest clearing because bare soil has less temporal volume decorrelation than wind-blown trees.',
      losPhaseBehavior:
        'Apparent phase jump at the scattering phase-center height transition from canopy volume to ground surface.',
      optimalBandReason:
        'L-band HV backscatter saturates at ~100–150 Mg/ha biomass (vs ~30 Mg/ha for C-band), enabling NISAR to track structural forest loss across dense tropical and temperate woodlands.',
    },
    candidateDrivers: [
      'Clear-cut logging, agricultural frontier expansion, or infrastructure corridor clearing',
      'Wildfire canopy consumption and post-fire salvage',
      'Severe storm windthrow or insect defoliation',
    ],
    confounders: [
      'Heavy rainfall wetting the soil immediately after clearing, elevating HH and partially masking the HV drop',
      'Seasonal leaf-off phenology in deciduous forests (affects S-band and C-band strongly, L-band much less)',
      'Post-clearing slash piles or standing dead snags producing transient dihedral backscatter spikes',
    ],
    discriminatingTests: [
      'Track HV time-series across multiple consecutive 12-day passes: true deforestation produces a persistent step-change drop in HV, whereas rainfall wetting decays within 1–2 passes.',
      'Compare NISAR L-band HV (trunks/primary branches) with S-band or Sentinel-1 C-band VH (twigs/foliage) via the Sensor Rosetta.',
      'Cross-reference with GEDI L4A lidar footprint biomass and OPERA DIST-ALERT.',
    ],
    falsificationCriteria: [
      'HV backscatter recovers to pre-anomaly levels within 12–24 days (rules out structural woody biomass removal).',
      'Optical NDVI and GEDI canopy height show intact overstory crowns (indicates sub-canopy soil moisture shift rather than deforestation).',
    ],
    ancillaryMissions: ['GEDI Lidar', 'OPERA DIST', 'MODIS / VIIRS Active Fire', 'Landsat'],
  },

  agriculture_crop_cycle: {
    id: 'agriculture_crop_cycle',
    title: 'Agricultural Phenology, Tillage & Harvest',
    nisarStoryMapTheme: 'Agriculture & Food Security',
    summary:
      'Captures parcel-scale crop growth, stem elongation, irrigation scheduling, and harvesting using combined NISAR L-band (24 cm) and S-band (9.4 cm) polarimetry.',
    expectedSignatures: {
      hhBackscatter:
        'Rises during vegetative stem elongation and irrigation wetting; drops sharply (-3 to -5 dB) after harvest or smoothing tillage.',
      hvBackscatter:
        'Rises steadily (+3 to +6 dB) with crop canopy biomass and leaf area index (LAI), then drops abruptly at harvest.',
      hhHvRatio:
        'Tracks crop architecture: vertical-stem cereals (wheat/rice) show distinct HH/VV/HV evolution compared to broadleaf crops (soy/corn/cotton).',
      interferometricCoherence:
        'Low during rapid vegetative growth or plowing (γ < 0.30); high on fallow bare fields between seasons (γ > 0.75).',
      losPhaseBehavior:
        'Field-scale phase decorrelation during plowing; regional unwrapped phase over agricultural basins reflects underlying groundwater pumping subsidence.',
      optimalBandReason:
        'Dual-frequency L-band (24 cm, penetrates thick corn/sugarcane canopies) + S-band (9.4 cm, sensitive to smaller cereal/soybean leaves and tillers) avoids single-band saturation.',
    },
    candidateDrivers: [
      'Scheduled crop planting, vegetative growth, and mechanical harvesting',
      'Flooded rice-paddy transplanting or furrow/sprinkler irrigation cycles',
      'Post-harvest tillage changing surface RMS roughness along row orientation',
    ],
    confounders: [
      'Row-direction azimuth resonance (Bragg scattering when radar look direction is perpendicular to plowed ridges)',
      'Dew or convective rain showers just prior to dawn/dusk 6 AM / 6 PM sun-synchronous passes',
    ],
    discriminatingTests: [
      'Check parcel boundary geometry: agricultural changes conform to rectilinear field edges with sharp step boundaries.',
      'Compare L-band vs S-band/C-band growth curves across the 12-day repeat series to separate early emergence (C/S-band) from peak biomass (L-band).',
    ],
    falsificationCriteria: [
      'Change footprint crosses field boundaries along topographic contours or drainage channels (points to natural flooding or erosion, not farm management).',
    ],
    ancillaryMissions: ['SMAP Soil Moisture', 'Sentinel-2 NDVI', 'USDA CDL / WorldCereal'],
  },

  soil_moisture: {
    id: 'soil_moisture',
    title: 'Surface Dielectric Soil Moisture Shifts (SME2)',
    nisarStoryMapTheme: 'Agriculture & Food Security',
    summary:
      'Estimates top-5 cm volumetric soil moisture at 200 m field resolution (NISAR L3 SME2) by exploiting the large dielectric contrast between dry mineral soil (ε ≈ 3–5) and liquid water (ε ≈ 80).',
    expectedSignatures: {
      hhBackscatter:
        'Increases monotonically (+1.5 to +4.5 dB) as volumetric soil moisture rises from dry (<0.05 m³/m³) to saturated (~0.40 m³/m³), provided roughness stays constant.',
      hvBackscatter:
        'Increases modestly (+1 to +2.5 dB) with soil wetting on bare/sparse surfaces, less sensitive than co-pol wherever vegetation volume dominates.',
      hhHvRatio:
        'Remains relatively stable when roughness and vegetation structure are unchanged over a single 12-day repeat interval.',
      interferometricCoherence:
        'Moderate to high (γ > 0.50), though sharp wetting/drying transitions introduce a soil-moisture phase bias in L-band interferograms.',
      losPhaseBehavior:
        'Dielectric penetration-depth shifts can induce millimeter-to-centimeter apparent LOS phase artifacts that must not be confused with tectonic motion.',
      optimalBandReason:
        'L-band (24 cm) senses the top ~5 cm soil layer through moderate crop covers where C-band and X-band are blocked by vegetation.',
    },
    candidateDrivers: [
      'Synoptic rainfall wetting or post-storm evaporative drydown',
      'Snowmelt infiltration at the start of spring thaw',
      'Canal seepage or agricultural irrigation',
    ],
    confounders: [
      'Simultaneous tillage or erosion changing surface RMS roughness (roughness and dielectric constant both raise σ⁰)',
      'Rapid vegetation flush increasing canopy attenuation and volume scatter',
      'Soil freeze–thaw state transition (frozen soil has ε ≈ 4–5 similar to dry soil, causing a sudden dB drop upon freezing)',
    ],
    discriminatingTests: [
      'Inspect NISAR L3 SME2 product alongside GPM IMERG rainfall and NASA POWER skin temperature (verify T > 2°C to rule out freeze–thaw).',
      'Use time-series invariant roughness inversion across consecutive 12-day cycles where surface roughness is stationary.',
    ],
    falsificationCriteria: [
      'Soil temperatures drop below 0°C between acquisitions (backscatter drop is caused by dielectric freezing, not evaporative drying).',
      'HV cross-pol jumps disproportionately with coherence collapse (indicates tillage or vegetation change, not pure moisture change).',
    ],
    ancillaryMissions: ['NISAR L3 SME2', 'SMAP L3/L4', 'GPM IMERG', 'NASA POWER'],
  },

  subsidence: {
    id: 'subsidence',
    title: 'Aquifer Compaction & Land Subsidence Bowls',
    nisarStoryMapTheme: 'Solid Earth & Hazards',
    summary:
      'Measures centimeter-to-decimeter land elevation lowering over groundwater basins, deltas, and permafrost thaw corridors using persistent L-band InSAR time series (GUNW).',
    expectedSignatures: {
      hhBackscatter:
        'Generally stable (<1.5 dB change) over long-term subsidence bowls unless accompanied by surface fissuring or agricultural land-use change.',
      hvBackscatter:
        'Stable across the subsidence footprint; used primarily to mask out rapidly growing crop parcels.',
      hhHvRatio: 'Unchanged by vertical crustal/aquifer compaction alone.',
      interferometricCoherence:
        'High in L-band (γ > 0.60) even across agricultural basins and peri-urban deltas where C-band decorrelates within 12–24 days.',
      losPhaseBehavior:
        'Smooth, concentric negative ΔLOS phase bowls (range increase away from satellite) accumulating steadily across multiple 12-day cycles.',
      optimalBandReason:
        'Groundwater subsidence bowls (e.g., San Joaquin Valley) are covered by irrigated crops; L-band maintains multi-month interferometric coherence across farmed basins.',
    },
    candidateDrivers: [
      'Over-drafting of confined/unconfined aquifers causing inelastic clay aquitard compaction',
      'Seasonal poroelastic aquifer recharge and drawdown oscillation',
      'Active-layer permafrost thaw consolidation (thermokarst subsidence in Arctic/sub-Arctic tundra)',
    ],
    confounders: [
      'Turbulent and stratified tropospheric water-vapor delays producing false 2–8 cm bowls in a single interferogram',
      'Long-wavelength ionospheric total electron content (TEC) ramps in L-band',
      'Soil-moisture phase bias in agricultural fields',
    ],
    discriminatingTests: [
      'Stack ≥5 consecutive 12-day GUNW interferograms: genuine aquifer compaction accumulates monotonically over time, whereas weather-system tropospheric blobs are uncorrelated in time.',
      'Project ascending + descending LOS vectors to decompose vertical subsidence vs horizontal strain.',
      'Compare basin-scale InSAR volume loss with GRACE-FO terrestrial water storage anomalies and continuous GNSS benchmarks.',
    ],
    falsificationCriteria: [
      'Apparent subsidence bowl changes sign randomly from one 12-day pass to the next with zero cumulative secular trend (diagnostic of atmospheric noise).',
    ],
    ancillaryMissions: ['GRACE-FO', 'UNAVCO / EarthScope GNSS', 'Sentinel-1 ARIA'],
  },

  earthquake_fault_rupture: {
    id: 'earthquake_fault_rupture',
    title: 'Coseismic Fault Rupture & Structural Damage Corridors',
    nisarStoryMapTheme: 'Solid Earth & Hazards',
    summary:
      'Maps 3D crustal strain fields across strike-slip, thrust, and normal fault ruptures via GUNW unwrapped phase andGOFF pixel offsets, plus urban damage via coherence loss.',
    expectedSignatures: {
      hhBackscatter:
        'Drops or shifts across collapsed building blocks or surface liquefaction ejecta; largely unchanged in elastic far-field deformation lobes.',
      hvBackscatter:
        'Can increase in rubble zones where oriented building walls (dihedrals) collapse into random depolarizing debris piles.',
      hhHvRatio:
        'Decreases in severely damaged urban blocks as ordered dihedral wall-ground reflections break down.',
      interferometricCoherence:
        'Sharp linear decorrelation ribbon (γ < 0.20) directly along the surface fault trace and within collapsed building districts; high coherence (γ > 0.70) in elastic deformation lobes.',
      losPhaseBehavior:
        'Butterfly / antisymmetric phase lobes across strike-slip faults (e.g., East Anatolian Fault in Hatay) or asymmetric hanging-wall uplift lobes on thrust faults.',
      optimalBandReason:
        'Large earthquakes (>Mw 6.5) produce steep phase gradients that alias C-band (2.8 cm/fringe); L-band (12 cm/fringe) unwraps cleanly closer to the fault trace and penetrates vegetated epicentral hills.',
    },
    candidateDrivers: [
      'Coseismic elastic fault slip and surface rupture during crustal earthquakes',
      'Post-seismic afterslip, poroelastic rebound, and viscoelastic relaxation',
      'Secondary triggered liquefaction, lateral spreading, and coseismic landslides',
    ],
    confounders: [
      'Phase unwrapping branch-cut errors jumping by integer multiples of 2π (12 cm LOS steps) across the fault trace',
      'Ionospheric split-spectrum phase streaks corrupting long-wavelength tectonic deformation',
      'Non-damage urban coherence loss caused by parked vehicles, construction, or snow',
    ],
    discriminatingTests: [
      'Use NISAR GOFF (range/azimuth pixel offsets) right along the fault trace where strain exceeds the GUNW unwrapping limit.',
      'Compare pre-event baseline coherence pair (pre1–pre2) against co-event pair (pre2–post) to isolate true damage decorrelation (ARIA Damage Proxy Map method).',
      'Cross-check with USGS NEIC finite-fault models and regional GNSS station displacements.',
    ],
    falsificationCriteria: [
      'Coherence drop was already present in the pre-earthquake baseline interferogram (rules out coseismic building collapse).',
      'Discontinuity aligns with an unwrapping tile boundary rather than a mapped fault or GOFF offset gradient.',
    ],
    ancillaryMissions: ['USGS NEIC', 'NASA ARIA DPM', 'EarthScope GNSS', 'ALOS-2 / SAOCOM'],
  },
};

export interface ObservedAnomalySignature {
  meanDeltaHhDb: number;
  meanDeltaHvDb: number;
  meanCoherence: number;
  maxAbsLosMeters: number;
  terrainSlopeDeg: number;
}

export interface RankedHypothesisEvaluation {
  hypothesis: SurfaceChangeHypothesis;
  confidenceScore: number; // 0 to 100
  confidenceTier: 'MODERATE-HIGH' | 'MODERATE' | 'LOW-EXPLORATORY';
  matchingEvidence: string[];
  requiredVerificationNextStep: string;
}

/**
 * Transparent rule-based Hypothesis Evaluator.
 * Never claims a single unique physical cause; always returns ranked candidate hypotheses with confounders & falsification tests.
 */
export function evaluateCandidateHypotheses(
  obs: ObservedAnomalySignature
): RankedHypothesisEvaluation[] {
  const results: RankedHypothesisEvaluation[] = [];

  for (const hyp of Object.values(SURFACE_CHANGE_HYPOTHESES)) {
    let score = 35;
    const matches: string[] = [];

    if (hyp.id === 'flooding_wetlands') {
      if (obs.meanDeltaHhDb <= -3.0 && obs.terrainSlopeDeg < 12) {
        score += 42;
        matches.push(`Strong HH backscatter drop (${obs.meanDeltaHhDb.toFixed(1)} dB) on low-slope terrain (<12°) matches specular water inundation.`);
      } else if (obs.meanDeltaHhDb >= 2.5 && obs.meanDeltaHvDb < obs.meanDeltaHhDb - 1.5) {
        score += 38;
        matches.push(`HH increase (+${obs.meanDeltaHhDb.toFixed(1)} dB) exceeding HV change matches L-band canopy–water double-bounce.`);
      }
      if (obs.meanCoherence < 0.45) {
        score += 12;
        matches.push(`Reduced interferometric coherence (γ=${obs.meanCoherence.toFixed(2)}) consistent with surface water rearrangement.`);
      }
    } else if (hyp.id === 'landslide_debris') {
      if (obs.terrainSlopeDeg >= 14) {
        score += 28;
        matches.push(`Steep hillslope setting (${obs.terrainSlopeDeg.toFixed(0)}°) favors gravitational slope processes.`);
      }
      if (Math.abs(obs.meanDeltaHhDb) >= 2.5 && obs.meanCoherence < 0.55) {
        score += 26;
        matches.push(`Backscatter roughness shift (${obs.meanDeltaHhDb.toFixed(1)} dB) + coherence loss (γ=${obs.meanCoherence.toFixed(2)}) matches debris-fan or scar disturbance.`);
      }
      if (obs.maxAbsLosMeters >= 0.05) {
        score += 14;
        matches.push(`Localized relative LOS displacement (${obs.maxAbsLosMeters.toFixed(2)} m) observed along slope profile.`);
      }
    } else if (hyp.id === 'glacier_ice_motion') {
      if (obs.maxAbsLosMeters >= 0.12) {
        score += 32;
        matches.push(`Large relative LOS displacement (${obs.maxAbsLosMeters.toFixed(2)} m) consistent with cryospheric flow or dynamic fracturing.`);
      }
      if (Math.abs(obs.meanDeltaHhDb) >= 2.5) {
        score += 20;
        matches.push(`Surface backscatter shift (${obs.meanDeltaHhDb.toFixed(1)} dB) consistent with crevasse opening or surface melt transition.`);
      }
    } else if (hyp.id === 'subsidence') {
      if (obs.maxAbsLosMeters >= 0.08 && obs.meanCoherence >= 0.55 && obs.terrainSlopeDeg < 10) {
        score += 48;
        matches.push(`Coherent (γ=${obs.meanCoherence.toFixed(2)}) relative LOS bowl (${obs.maxAbsLosMeters.toFixed(2)} m) on flat basin floor matches aquifer or thaw subsidence.`);
      }
    } else if (hyp.id === 'earthquake_fault_rupture') {
      if (obs.maxAbsLosMeters >= 0.18) {
        score += 44;
        matches.push(`High-amplitude relative LOS gradient (${obs.maxAbsLosMeters.toFixed(2)} m) consistent with coseismic crustal strain.`);
      }
      if (obs.meanCoherence < 0.5) {
        score += 15;
        matches.push(`Localized coherence drop (γ=${obs.meanCoherence.toFixed(2)}) consistent with near-fault rupture or building damage corridor.`);
      }
    } else if (hyp.id === 'deforestation_fire') {
      if (obs.meanDeltaHvDb <= -2.2) {
        score += 40;
        matches.push(`Cross-pol HV drop (${obs.meanDeltaHvDb.toFixed(1)} dB) indicates reduction in depolarizing woody canopy volume.`);
      }
    } else if (hyp.id === 'agriculture_crop_cycle') {
      if (obs.terrainSlopeDeg < 8 && Math.abs(obs.meanDeltaHvDb) >= 2.0) {
        score += 32;
        matches.push(`Low-slope parcel HV shift (${obs.meanDeltaHvDb.toFixed(1)} dB) consistent with crop biomass growth or harvest.`);
      }
    } else if (hyp.id === 'soil_moisture') {
      if (Math.abs(obs.meanDeltaHhDb) >= 1.5 && Math.abs(obs.meanDeltaHhDb) <= 4.5 && obs.meanCoherence >= 0.5) {
        score += 34;
        matches.push(`Coherent HH shift (${obs.meanDeltaHhDb.toFixed(1)} dB) with intact coherence (γ=${obs.meanCoherence.toFixed(2)}) matches surface dielectric wetting/drying.`);
      }
    }

    const clampedScore = Math.max(15, Math.min(92, score)); // Never 100% — SAR alone never proves a unique cause
    const confidenceTier: RankedHypothesisEvaluation['confidenceTier'] =
      clampedScore >= 72 ? 'MODERATE-HIGH' : clampedScore >= 52 ? 'MODERATE' : 'LOW-EXPLORATORY';

    results.push({
      hypothesis: hyp,
      confidenceScore: clampedScore,
      confidenceTier,
      matchingEvidence:
        matches.length > 0
          ? matches
          : ['Partial signature overlap; evaluate confounders and ancillary datasets before attribution.'],
      requiredVerificationNextStep: hyp.discriminatingTests[0],
    });
  }

  return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
