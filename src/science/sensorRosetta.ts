export type SensorMissionId =
  | 'NISAR_L'
  | 'NISAR_S'
  | 'SENTINEL_1_C'
  | 'CSA_RCM_C'
  | 'CSA_RADARSAT1_C'
  | 'CONAE_SAOCOM_L'
  | 'JAXA_ALOS2_L'
  | 'NASA_UAVSAR_L';

export interface SarMissionProfile {
  id: SensorMissionId;
  name: string;
  agencies: string;
  band: 'L-Band' | 'S-Band' | 'C-Band';
  wavelengthCm: number;
  frequencyGhz: number;
  repeatCycleDays: string;
  nominalResolutionMeters: string;
  swathWidthKm: string;
  polarizations: string;
  dataAccessPolicy: string;
  archiveUrl: string;
  canopyPenetrationDepth: 'Deep (Full Crown to Trunk/Ground)' | 'Moderate (Upper/Mid Canopy & Crops)' | 'Shallow (Top Leaf Layer)';
  insarCoherenceInVegetation: 'High (Preserves 12-day phase through vegetation)' | 'Moderate' | 'Low (Rapid volume decorrelation in trees)';
  fringeSensitivityPerHalfWavelengthCm: number;
  primaryStrengths: string[];
  keyLimitations: string[];
}

export const SAR_MISSION_ROSETTA: Record<SensorMissionId, SarMissionProfile> = {
  NISAR_L: {
    id: 'NISAR_L',
    name: 'NISAR L-Band SAR (NASA JPL)',
    agencies: 'NASA / ISRO',
    band: 'L-Band',
    wavelengthCm: 24.0,
    frequencyGhz: 1.257,
    repeatCycleDays: '12 days (exact repeat, Dawn–Dusk 6 AM / 6 PM orbit)',
    nominalResolutionMeters: '3–10 m (GSLC) · 10–20 m (GCOV) · 80 m (GUNW)',
    swathWidthKm: '240 km (SweepSAR)',
    polarizations: 'Dual-pol (HH+HV or VV+VH), Single-pol, Quad-pol over selected targets',
    dataAccessPolicy: 'Free & open global policy via NASA ASF DAAC (no embargo)',
    archiveUrl: 'https://search.asf.alaska.edu/#/?dataset=NISAR',
    canopyPenetrationDepth: 'Deep (Full Crown to Trunk/Ground)',
    insarCoherenceInVegetation: 'High (Preserves 12-day phase through vegetation)',
    fringeSensitivityPerHalfWavelengthCm: 12.0,
    primaryStrengths: [
      '24 cm wavelength penetrates forest canopies and monsoon clouds to track sub-canopy flooding and vegetated slope creep',
      '240 km SweepSAR swath delivers systematically acquired global land and ice-sheet coverage every 12 days',
      '12 cm/fringe InSAR ambiguity tolerates steeper coseismic and cryospheric strain gradients without phase aliasing',
    ],
    keyLimitations: [
      'Stronger sensitivity to ionospheric Total Electron Content (TEC) streaks than C-band (mitigated via split-spectrum processing)',
      '12-day repeat cannot capture sub-diurnal flash-flood peaks between orbital passes',
    ],
  },

  NISAR_S: {
    id: 'NISAR_S',
    name: 'NISAR S-Band SAR (ISRO SAC)',
    agencies: 'ISRO / NASA',
    band: 'S-Band',
    wavelengthCm: 9.4,
    frequencyGhz: 3.2,
    repeatCycleDays: '12 days (co-mounted on NISAR observatory)',
    nominalResolutionMeters: '6–12 m',
    swathWidthKm: '240 km (SweepSAR)',
    polarizations: 'Dual-pol, Compact-pol (Circular transmit, Linear receive), Quasi-Quad-pol',
    dataAccessPolicy:
      'Primary distribution over India & surrounding regions via ISRO NRSC Bhoonidhi portal; selected cross-calibration targets in NASA archive',
    archiveUrl: 'https://bhoonidhi.nrsc.gov.in/',
    canopyPenetrationDepth: 'Moderate (Upper/Mid Canopy & Crops)',
    insarCoherenceInVegetation: 'Moderate',
    fringeSensitivityPerHalfWavelengthCm: 4.7,
    primaryStrengths: [
      '9.4 cm wavelength bridges the gap between L-band (24 cm) and C-band (5.6 cm), ideal for agricultural crop tillers, coastal wind, and wet snow',
      'Simultaneous L+S acquisition on the same platform eliminates temporal change confounders between bands',
    ],
    keyLimitations: [
      'Focused geographic acquisition plan (primarily India, Himalayan arc, polar cryosphere, and calibration sites) rather than uniform global wall-to-wall coverage',
    ],
  },

  SENTINEL_1_C: {
    id: 'SENTINEL_1_C',
    name: 'Copernicus Sentinel-1 (1A / 1C)',
    agencies: 'ESA / European Commission',
    band: 'C-Band',
    wavelengthCm: 5.55,
    frequencyGhz: 5.405,
    repeatCycleDays: '6–12 days',
    nominalResolutionMeters: '5 × 20 m (IW mode) · 30 m (OPERA RTC/CSLC)',
    swathWidthKm: '250 km (Interferometric Wide Swath)',
    polarizations: 'Dual-pol (VV+VH over land; HH+HV over polar/sea ice)',
    dataAccessPolicy: 'Free & open global archive (2014–present) via ESA Copernicus & NASA ASF DAAC',
    archiveUrl: 'https://search.asf.alaska.edu/#/?dataset=SENTINEL-1',
    canopyPenetrationDepth: 'Shallow (Top Leaf Layer)',
    insarCoherenceInVegetation: 'Low (Rapid volume decorrelation in trees)',
    fringeSensitivityPerHalfWavelengthCm: 2.77,
    primaryStrengths: [
      'Over a decade of continuous open global C-band time-series (2014–present) for multi-year baseline comparison',
      '2.8 cm/fringe sensitivity resolves subtle millimeter/year urban and arid-basin deformation where coherence is high',
      'Foundation of NASA OPERA DSWx-S1 and DIST-S1 operational products',
    ],
    keyLimitations: [
      '5.6 cm wavelength scatters off upper leaves and decorrelates rapidly over dense forests (e.g., Pantanal, Himalayan gorges)',
      'Steep coseismic or glacier strain gradients alias across the 2.8 cm half-wavelength cycle',
    ],
  },

  CSA_RCM_C: {
    id: 'CSA_RCM_C',
    name: 'RADARSAT Constellation Mission (RCM 1/2/3)',
    agencies: 'Canadian Space Agency (CSA)',
    band: 'C-Band',
    wavelengthCm: 5.55,
    frequencyGhz: 5.405,
    repeatCycleDays: '4 days (constellation coherent repeat) · Daily revisit at high latitudes',
    nominalResolutionMeters: '3 m (Very High Res) to 100 m (Low Noise / Ship Detection)',
    swathWidthKm: '30 km to 500 km (ScanSAR)',
    polarizations: 'Single, Dual, Compact Polarization (CTL-R), Quad-pol',
    dataAccessPolicy:
      'Open public datasets & vetted user access via CSA Earth Observation Data Management System (EODMS)',
    archiveUrl: 'https://www.eodms-sgdot.nrcan-rncan.gc.ca/',
    canopyPenetrationDepth: 'Shallow (Top Leaf Layer)',
    insarCoherenceInVegetation: 'Moderate',
    fringeSensitivityPerHalfWavelengthCm: 2.77,
    primaryStrengths: [
      '3-spacecraft constellation provides 4-day interferometric repeat and rapid sub-weekly emergency flood/ice monitoring',
      'Operational Compact Polarization (circular transmit, linear H/V receive) delivers wide-swath pseudo-quad-pol decomposition',
    ],
    keyLimitations: [
      'C-band penetration limits in dense tropical/temperate forest canopies',
      'Full-resolution scenes outside open collections require an EODMS account',
    ],
  },

  CSA_RADARSAT1_C: {
    id: 'CSA_RADARSAT1_C',
    name: 'RADARSAT-1 Historical Archive (1995–2013)',
    agencies: 'Canadian Space Agency (CSA)',
    band: 'C-Band',
    wavelengthCm: 5.66,
    frequencyGhz: 5.3,
    repeatCycleDays: '24 days',
    nominalResolutionMeters: '8 m (Fine) to 100 m (ScanSAR Wide)',
    swathWidthKm: '45 km to 500 km',
    polarizations: 'Single-pol HH',
    dataAccessPolicy: 'Open historical archive (1995–2013) via CSA EODMS & NASA ASF DAAC',
    archiveUrl: 'https://www.asc-csa.gc.ca/eng/satellites/radarsat1/',
    canopyPenetrationDepth: 'Shallow (Top Leaf Layer)',
    insarCoherenceInVegetation: 'Low (Rapid volume decorrelation in trees)',
    fringeSensitivityPerHalfWavelengthCm: 2.83,
    primaryStrengths: [
      'Establishes a 30-year baseline (1995–2026) for multi-decadal glacier retreat, permafrost coastal erosion, and wetland shifts',
      'HH polarization provides stronger water–vegetation contrast than VV for historical flood mapping',
    ],
    keyLimitations: [
      'Mission ended in 2013; single-pol HH only with 24-day repeat orbit',
    ],
  },

  CONAE_SAOCOM_L: {
    id: 'CONAE_SAOCOM_L',
    name: 'SAOCOM 1A & 1B L-Band Constellation',
    agencies: 'CONAE (Argentina Space Agency)',
    band: 'L-Band',
    wavelengthCm: 23.5,
    frequencyGhz: 1.275,
    repeatCycleDays: '8 days (1A+1B constellation) · 16 days (single spacecraft)',
    nominalResolutionMeters: '10 m (Stripmap) to 100 m (TOPSAR Wide)',
    swathWidthKm: '20 km (Quad-pol Stripmap) to 350 km (TOPSAR)',
    polarizations: 'Full Quad-Pol (HH+HV+VH+VV) & Dual-Pol (HH+HV)',
    dataAccessPolicy:
      'Public catalog browse via CONAE GeoCatalog; full L1/L2 products available via scientific/educational request',
    archiveUrl: 'https://catalogos.conae.gov.ar/catalogo/catalogoSat.html',
    canopyPenetrationDepth: 'Deep (Full Crown to Trunk/Ground)',
    insarCoherenceInVegetation: 'High (Preserves 12-day phase through vegetation)',
    fringeSensitivityPerHalfWavelengthCm: 11.75,
    primaryStrengths: [
      'Operational L-band sister capability to NISAR with full quad-pol soil moisture and biomass retrieval heritage',
      '8-day two-satellite repeat over South America (e.g., Pantanal wetlands & Andean cryosphere) complements NISAR 12-day passes',
    ],
    keyLimitations: [
      'Full SLC/GCOV downloads require registered scientific/institutional order approval through CONAE',
    ],
  },

  JAXA_ALOS2_L: {
    id: 'JAXA_ALOS2_L',
    name: 'ALOS-2 PALSAR-2 L-Band',
    agencies: 'JAXA (Japan Aerospace Exploration Agency)',
    band: 'L-Band',
    wavelengthCm: 22.9,
    frequencyGhz: 1.257,
    repeatCycleDays: '14 days',
    nominalResolutionMeters: '3–10 m (Stripmap) · 25–100 m (ScanSAR)',
    swathWidthKm: '50–70 km (Stripmap) · 350 km (ScanSAR)',
    polarizations: 'Single, Dual (HH+HV), Full Quad-pol',
    dataAccessPolicy: 'Open annual global mosaic & ScanSAR; high-res Stripmap via JAXA G-Portal / research RA',
    archiveUrl: 'https://gportal.jaxa.jp/gpr/',
    canopyPenetrationDepth: 'Deep (Full Crown to Trunk/Ground)',
    insarCoherenceInVegetation: 'High (Preserves 12-day phase through vegetation)',
    fringeSensitivityPerHalfWavelengthCm: 11.45,
    primaryStrengths: [
      '2014–present L-band archive bridging ALOS-1 (2006–2011) to the 2025/2026 NISAR era',
      'Proven L-band ScanSAR interferometry for Himalayan earthquakes and tropical forest alerts (JJ-FAST)',
    ],
    keyLimitations: [
      'Tasked acquisition conflict between high-resolution Stripmap and wide-area ScanSAR (unlike NISAR continuous SweepSAR)',
    ],
  },

  NASA_UAVSAR_L: {
    id: 'NASA_UAVSAR_L',
    name: 'NASA/JPL UAVSAR Airborne L-Band Testbed',
    agencies: 'NASA / JPL-Caltech',
    band: 'L-Band',
    wavelengthCm: 23.8,
    frequencyGhz: 1.26,
    repeatCycleDays: 'Campaign-based custom airborne flight lines (hours to months)',
    nominalResolutionMeters: '1.6 m × 0.6 m (Single-Look Complex) · 5 m (Multi-look PolSAR)',
    swathWidthKm: '16–22 km',
    polarizations: 'Full Calibrated Quad-Pol (HH, HV, VH, VV)',
    dataAccessPolicy: 'Free & open via NASA ASF DAAC & JPL UAVSAR Portal',
    archiveUrl: 'https://uavsar.jpl.nasa.gov/',
    canopyPenetrationDepth: 'Deep (Full Crown to Trunk/Ground)',
    insarCoherenceInVegetation: 'High (Preserves 12-day phase through vegetation)',
    fringeSensitivityPerHalfWavelengthCm: 11.9,
    primaryStrengths: [
      'Direct airborne physics prototype for NISAR with meter-scale Full Quad-Pol (Pauli/Freeman-Durden decomposition)',
      'Custom flight headings allow multi-azimuth look angles to eliminate mountain layover or decompose full 3D motion vectors',
    ],
    keyLimitations: [
      'Airborne campaign coverage only (North/Central/South America & targeted campaigns), not synoptic global satellite coverage',
    ],
  },
};

export interface SensorRecommendationQuery {
  canopyDensity: 'dense_forest' | 'moderate_crops' | 'bare_urban_ice';
  needSubWeeklyRevisit: boolean;
  needMultiDecadeBaseline: boolean;
  needFreeImmediateDownload: boolean;
}

export interface RankedSensorRecommendation {
  sensor: SarMissionProfile;
  matchScore: number;
  rationale: string;
}

/**
 * Rule-based Sensor Rosetta recommender explaining which SAR mission/band fits a user's analytical task.
 */
export function recommendSensorsForTask(
  query: SensorRecommendationQuery
): RankedSensorRecommendation[] {
  const list = Object.values(SAR_MISSION_ROSETTA).map((sensor) => {
    let score = 50;
    const reasons: string[] = [];

    if (query.canopyDensity === 'dense_forest') {
      if (sensor.band === 'L-Band') {
        score += 35;
        reasons.push(`${sensor.wavelengthCm} cm L-band penetrates dense canopy crowns to trunk/ground level.`);
      } else if (sensor.band === 'S-Band') {
        score += 10;
        reasons.push(`9.4 cm S-band probes upper/mid canopy structure.`);
      } else {
        score -= 20;
        reasons.push(`5.6 cm C-band scatters off top leaves and decorrelates rapidly in dense forest.`);
      }
    } else if (query.canopyDensity === 'moderate_crops') {
      if (sensor.id === 'NISAR_S' || sensor.id === 'NISAR_L') {
        score += 28;
        reasons.push(`Dual L+S sensitivity separates crop emergence from peak biomass without early saturation.`);
      } else if (sensor.band === 'C-Band') {
        score += 20;
        reasons.push(`C-band is highly sensitive to early cereal/soybean leaf emergence.`);
      }
    } else {
      // bare_urban_ice
      if (sensor.id === 'NISAR_L' || sensor.id === 'SENTINEL_1_C' || sensor.id === 'CSA_RCM_C') {
        score += 25;
        reasons.push(`High coherence on bare rock, urban dihedrals, and glacier surfaces.`);
      }
    }

    if (query.needSubWeeklyRevisit) {
      if (sensor.id === 'CSA_RCM_C') {
        score += 25;
        reasons.push(`RCM 3-satellite constellation achieves 4-day coherent repeat and daily high-latitude revisit.`);
      } else if (sensor.id === 'CONAE_SAOCOM_L') {
        score += 18;
        reasons.push(`SAOCOM 1A+1B constellation achieves 8-day L-band repeat.`);
      } else if (sensor.id === 'SENTINEL_1_C') {
        score += 15;
        reasons.push(`Sentinel-1A/1C achieves 6-day C-band repeat.`);
      }
    }

    if (query.needMultiDecadeBaseline) {
      if (sensor.id === 'CSA_RADARSAT1_C') {
        score += 30;
        reasons.push(`RADARSAT-1 archive (1995–2013) extends change baselines back 30 years.`);
      } else if (sensor.id === 'SENTINEL_1_C' || sensor.id === 'JAXA_ALOS2_L') {
        score += 20;
        reasons.push(`Provides >10-year continuous satellite archive (2014–2026).`);
      }
    }

    if (query.needFreeImmediateDownload) {
      if (
        sensor.id === 'NISAR_L' ||
        sensor.id === 'SENTINEL_1_C' ||
        sensor.id === 'NASA_UAVSAR_L' ||
        sensor.id === 'CSA_RADARSAT1_C'
      ) {
        score += 15;
        reasons.push(`Immediate open HTTP download via NASA ASF DAAC / Earthdata Search.`);
      } else {
        score -= 10;
        reasons.push(`Requires portal registration or scientific order approval for full SLC/GCOV granules.`);
      }
    }

    return {
      sensor,
      matchScore: Math.max(10, Math.min(99, score)),
      rationale: reasons.join(' '),
    };
  });

  return list.sort((a, b) => b.matchScore - a.matchScore);
}
