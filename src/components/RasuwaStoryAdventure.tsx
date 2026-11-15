import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getCharacterSprite,
  getPropSprite,
  getTerrainTile,
  type CharacterPaletteId,
} from '../game/biomePixelArtEngine';
import { GlobalRegionId } from '../services/nasaEarthDataService';
import { retroAudio } from '../audio/retroAudioAndVoice';
import type { SupportedLocale } from '../i18n/translations';
import {
  AgriSubsidencePlayable,
  AvalancheSweepPlayable,
  BreachRunPlayable,
  CreepHydroPlayable,
  DielectricFloodMapperPlayable,
  ForestCanopyPlayable,
  OceanIcePlayable,
  QuakeTriagePlayable,
} from './RasuwaPlayableMissions';
import { BilingualAlertPreview } from './BilingualAlertPreview';
import { RasuwaDatumExplorer } from './RasuwaDatumExplorer';

export type StorySceneKey =
  | 'scene-intro'
  | 'exploreScene'
  | 'chapter-1'
  | 'chapter-2'
  | 'chapter-3'
  | 'chapter-4'
  | 'chapter-5'
  | 'chapter-6'
  | 'chapter-7'
  | 'chapter-8'
  | 'chapter-9'
  | 'FinalScene';

export interface ChapterDefinition {
  id:
    | 'chapter-1'
    | 'chapter-2'
    | 'chapter-3'
    | 'chapter-4'
    | 'chapter-5'
    | 'chapter-6'
    | 'chapter-7'
    | 'chapter-8'
    | 'chapter-9';
  act: 1 | 2;
  number: number;
  regionId: GlobalRegionId;
  zoneName: string;
  mapLabel: string;
  elevation: string;
  mapPos: { xPct: number; yPct: number };
  causeTitle: string;
  shortName: string;
  speakerName: string;
  speakerRole: string;
  speakerSprite: CharacterPaletteId;
  guideLine: string;
  photoBeforeUrl: string;
  photoBeforeLabel: string;
  photoAfterUrl: string;
  photoAfterLabel: string;
  provenanceBadge: 'observation' | 'reported' | 'model output' | 'simulation';
  provenanceSource: string;
  radarMetricBefore: string;
  radarMetricAfter: string;
  storyDialogues: {
    speaker: string;
    role: string;
    sprite: CharacterPaletteId;
    text: string;
    showDisplay?: 'photos' | 'slider' | 'prompt';
    proofTitle?: string;
    proofSource?: string;
    proofImageUrl?: string;
    proofBeforeUrl?: string;
    proofAfterUrl?: string;
  }[];
  miniGameTitle: string;
  miniGameInstruction: string;
  victoryMessage: string;
  scientificTakeaway: string;
}

interface EvidenceProofStory {
  id: string;
  title: string;
  location: string;
  sensorTag: string;
  imageUrl: string;
  beforeUrl?: string;
  storyText: string;
  radarProof: string;
  provenanceNote: string;
}

const EVIDENCE_PROOF_STORIES: EvidenceProofStory[] = [
  {
    id: 'proof-nisar-cleanroom',
    title: 'Inside the Cleanroom: NASA–ISRO 12 m Radar Reflector',
    location: 'JPL / ISRO Spacecraft Integration',
    sensorTag: 'L-Band (24 cm) + S-Band (9.4 cm)',
    imageUrl: '/incident_photos/nisar_spacecraft_cleanroom.jpg',
    storyText:
      'Normal satellite cameras bounce sunlight—so dark monsoon clouds hide mountains below. NISAR carries a giant gold-mesh drum antenna that sends its own microwave pulses through clouds, fog, and night.',
    radarProof: 'Sweeps a 240 km wide track every 12 days so no valley goes unwatched during storms.',
    provenanceNote: 'Reference Asset: NASA / JPL-Caltech / ISRO Cleanroom Photograph',
  },
  {
    id: 'proof-nisar-first-light',
    title: 'Seeing Double-Bounce & Smooth Water in L-Band Polarimetry',
    location: 'NISAR First-Light Calibration Scene',
    sensorTag: 'HH / HV / VV Polarizations',
    imageUrl: '/incident_photos/nisar_first_radar_image.webp',
    storyText:
      'Flat calm water acts like a mirror—bouncing radar waves away so floods look pitch black. Meanwhile, wet tree trunks and stone houses reflect waves twice ("double bounce"), glowing bright gold and cyan.',
    radarProof: 'Separates open river channels from flooded forests and soaked soil in seconds.',
    provenanceNote: 'Reference Visualization: NASA / JPL-Caltech / ISRO Multi-Pol L-Band',
  },
  {
    id: 'proof-syabrubesi-flood',
    title: 'Syabrubesi Dobhan: Two Rivers Meet Outside Flag House',
    location: 'Syabrubesi Confluence • 1,460 m',
    sensorTag: 'NASA POWER Wetness + Flood Scour',
    imageUrl: '/incident_photos/landsat_rasuwa_flood_2026_08_26.png',
    beforeUrl: '/incident_photos/syabrubesi_confluence.jpg',
    storyText:
      'Langtang Khola and Bhote Koshi meet right beside Pasang and Lali Maya’s Flag House. Weeks of relentless monsoon rain pushed topsoil wetness past 78% before the surge scoured riverbanks.',
    radarProof: 'Wipe the slider to compare the calm town confluence against flood-scoured cobbles.',
    provenanceNote: 'Illustrative Case Comparison • Local Photo & Flood Context',
  },
  {
    id: 'proof-chilime-creep',
    title: 'Chilime Hydropower: Bedrock Slipped 40 cm Under Green Trees',
    location: 'Chilime 111 MW Intake • 1,640 m',
    sensorTag: 'Sentinel-1 C-Band & NISAR L-Band InSAR',
    imageUrl: '/incident_photos/chilime_hydropower_dam.jpg',
    beforeUrl: '/incident_photos/chilime_village_houses.jpg',
    storyText:
      'From the valley road, green pine slopes above Chilime Hydro Dam looked completely still. Short radar waves bounced off treetops, but deeper radar phase tracking caught up to 40 cm of downhill bedrock creep between Jul 7 and Aug 24.',
    radarProof: 'Revealing slow creep early lets dam engineers lower steel intake gates before gravel slurry hits.',
    provenanceNote: 'Reported Context (Jul 7–Aug 24) + Hydropower Infrastructure Case',
  },
  {
    id: 'proof-timure-mudslide',
    title: 'Timure Dry Port: When a Canyon Landslide Blocks the River',
    location: 'Timure Customs • 1,760 m',
    sensorTag: 'Coherence Loss (γ < 0.15) & Boulder Mapping',
    imageUrl: '/incident_photos/gyirong_rasuwagadhi_mudslide_2025.png',
    beforeUrl: '/incident_photos/timure_customs_office.jpg',
    storyText:
      'When sheer gorge walls collapse into the narrow Lhende Khola, they form a temporary rock dam that traps water upstream. When that natural dam breaches in ~7 minutes, 4–6 m of angular boulders bury yards downstream.',
    radarProof: 'Sudden surface rearrangement drops radar coherence sharply—pinpointing buried highways through fog.',
    provenanceNote: 'Illustrative Case Comparison • Border Port & Customs Corridor',
  },
  {
    id: 'proof-miteri-bridge',
    title: 'Rasuwagadhi 1855 Fort & Miteri Bridge: >5 m Pre-Collapse Motion',
    location: 'Nepal–China Border Gorge • 1,814 m',
    sensorTag: 'L-Band Pixel-Offset Tracking (>5 m)',
    imageUrl: '/incident_photos/nepal_china_border_bridge.jpg',
    beforeUrl: '/incident_photos/rasuwagadhi_fort.jpg',
    storyText:
      'High above the historic 1855 stone fort, snow and permafrost rock hung nearly 2 vertical km overhead. When motion exceeds several meters, standard radar fringes wrap too tightly—so analysts use pixel-offset tracking.',
    radarProof: 'L-band amplitude offset tracking measured >5 m horizontal slope displacement prior to impact.',
    provenanceNote: 'Reported Synthesis + Border Heritage & Bridge Case',
  },
  {
    id: 'proof-langtang-glacier',
    title: 'Hanging Glaciers & Permafrost Headwalls (Why SAR Is Screening)',
    location: 'Upper Langtang–Purugu Crown • 5,366 m+',
    sensorTag: 'Silwal & Dahal (Zenodo 22730419)',
    imageUrl: '/incident_photos/langtang_lirung_glacier.jpg',
    storyText:
      'High-altitude slopes constantly creep, freeze, and thaw. Silwal & Dahal (Zenodo 22730419) proved that many completely stable neighboring slopes ALSO move meters—so radar alone would trigger too many false alarms.',
    radarProof: 'Best practice: pair regional SAR screening with village rain gauges and on-the-ground checks.',
    provenanceNote: 'Scientific Integrity Anchor • Zenodo 22730419 Synthesis',
  },
  {
    id: 'proof-rasuwa-l-vs-c-2026',
    title: 'Real 26 Aug Datum: NISAR L-Band Phase Audit (9/528) vs. Sentinel-1D Coherence',
    location: 'Upper Langtang–Lhende Source • EPSG:32645',
    sensorTag: 'NISAR L2 GUNW (P05023) vs. Sentinel-1D C-Band HyP3',
    imageUrl: '/rasuwa-datum/handoff/cband_coherence_comparison.webp',
    beforeUrl: '/rasuwa-datum/handoff/lband_coherence_comparison.webp',
    storyText:
      'In real August 19 → 31, 2026 NISAR L-band GUNW data across 6,803 exact-AOI CMR granules, median L-band coherence at the source collapsed from 0.2188 to 0.1021 and connected phase survived in only 9/528 pixels (1.70%)—making a quantitative NISAR displacement claim impossible.',
    radarProof: 'Sentinel-1D C-band HyP3 (0.5129 → 0.3950) retained enough backscatter coherence to map localized surface change instead.',
    provenanceNote: 'NASA ASF NISAR Provisional L2 GUNW + ESA/ASF Sentinel-1D HyP3 (rasuwa_sar_impact_datum)',
  },
  {
    id: 'proof-rasuwa-opera-imerg-2026',
    title: 'Real 26 Aug Datum: OPERA RTC-S1 Consensus (1.1871 km²) & Zero Collapse Rain',
    location: '4,774.048 km² HydroBASINS System · 2026-08-26T02:52:10Z',
    sensorTag: 'OPERA RTC-S1 + GPM IMERG (0.0 mm/hr) + NASA POWER',
    imageUrl: '/rasuwa-datum/handoff/sar_change_overlay.webp',
    beforeUrl: '/rasuwa-datum/handoff/coherence_loss_screening_mask.webp',
    storyText:
      'Sentinel-1D coherence screening flagged 158/307 (51.5%) target pixels alongside 1,225/30,161 (4.06%) control false alarms, while 3-view OPERA L2 RTC-S1 flagged 1.1871 km² (48.15% 2-view observable). At the collapse instant (02:30–02:59 UTC), GPM IMERG measured 0.0 ± 0.24 mm/hr—refuting a local storm cloudburst.',
    radarProof: 'Regional SAR screening must disclose false-alarm rates and corroborate triggers with GPM precipitation & terrain slopes.',
    provenanceNote: 'NASA OPERA L2 RTC-S1 v1.0 + GPM IMERG + NASA POWER + Copernicus GLO-30 DEM',
  },
  {
    id: 'proof-hubbard-earthquake',
    title: 'Real NASA NISAR Proof: Hubbard Glacier Mw 7.0 Earthquake',
    location: 'Yakutat Bay / Hubbard Glacier • Alaska',
    sensorTag: 'Published NASA NISAR Pair (Nov 26 ↔ Dec 8, 2025)',
    imageUrl: '/nisar-reference/hubbard-2025-12-08.jpg',
    beforeUrl: '/nisar-reference/hubbard-2025-11-26.jpg',
    storyText:
      'Real 12-day repeat NISAR L-band acquisitions bracketed the December 6, 2025 Mw 7.0 earthquake in Alaska—capturing glacier fracturing and coastal terminus reorganization in dark subarctic winter.',
    radarProof: '624 real NASA CMR granules verify how 12-day interferometry captures sudden crustal shifts.',
    provenanceNote: 'NASA Earth Observatory / JPL-Caltech / ASF / USGS (NASA_PUBLISHED_BROWSE)',
  },
  {
    id: 'proof-california-subsidence',
    title: 'Sinking Farmland: San Joaquin Aqueduct Subsidence',
    location: 'San Joaquin Valley • California, USA',
    sensorTag: 'L-Band InSAR + Soil Moisture (εr)',
    imageUrl: '/incident_photos/california_aqueduct_subsidence.jpg',
    beforeUrl: '/incident_photos/california_subsidence_pole.jpg',
    storyText:
      'Over-pumping deep aquifers during drought causes valley clay layers to compact permanently—tilting irrigation canals and cracking bridge piers by up to 28 cm/yr while fields look flat to the eye.',
    radarProof: '12-day InSAR spots millimeter-to-centimeter sinking bowls so towns can recharge groundwater.',
    provenanceNote: 'Global Region Case • Paired with NASA CMR San Joaquin AOI',
  },
  {
    id: 'proof-brazil-pantanal',
    title: 'Seeing Under Amazon & Pantanal Leaves: Canopy & Stilt-House Floods',
    location: 'Mato Grosso & Pantanal • Brazil',
    sensorTag: 'NISAR 24 cm L-Band + HV Biomass',
    imageUrl: '/incident_photos/brazil_pantanal_floodplain.jpg',
    beforeUrl: '/incident_photos/brazil_mato_grosso_nasa.jpg',
    storyText:
      'Persistent tropical clouds and thick green branches hide illegal forest clearing and rising river floods underneath. Short radar bounces off upper leaves; 24 cm L-band reaches down to tree trunks and floodwater.',
    radarProof: 'Tracks hidden logging scars and wetland water levels beneath intact canopies.',
    provenanceNote: 'Global Region Case • Paired with NASA CMR Pantanal/Amazon AOI',
  },
  {
    id: 'proof-turkiye-fault',
    title: 'Post-Quake Lifelines: Mapping Fault Rupture & Urban Damage',
    location: 'Hatay–Pazarcık Corridor • Türkiye',
    sensorTag: 'Coseismic Interferogram + Damage Proxy',
    imageUrl: '/incident_photos/turkiye_hatay_quake_fault.jpg',
    beforeUrl: '/incident_photos/turkiye_antakya_courtyard.jpg',
    storyText:
      'After major earthquakes, dust, clouds, and power blackouts delay helicopter surveys. Radar coherence-change maps immediately highlight cracked bridge approaches versus intact safe highway routes.',
    radarProof: 'Directs ambulances toward clear lifelines and engineers toward stressed dams.',
    provenanceNote: 'Global Region Case • Paired with NASA CMR Hatay AOI',
  },
  {
    id: 'proof-alaska-permafrost',
    title: 'Arctic Coastline Watch: Thawing Permafrost & Winter Storms',
    location: 'Yukon–Kuskokwim Yup’ik Coast • Alaska',
    sensorTag: 'All-Weather L-Band + RADARSAT',
    imageUrl: '/incident_photos/alaska_permafrost_bluff.jpg',
    beforeUrl: '/incident_photos/alaska_yupik_tundra.jpg',
    storyText:
      'Frozen permafrost holds coastal bluffs together like concrete until summer thaw and autumn storm surges carve back yards and wooden boardwalks—often under weeks of dark subarctic overcast.',
    radarProof: 'Radar monitors coastline retreat and surface heave year-round in zero sunlight.',
    provenanceNote: 'Global Region Case • Paired with NASA CMR Yukon AOI',
  },
];

export const RASUWA_STORY_CHAPTERS: ChapterDefinition[] = [
  {
    id: 'chapter-1',
    act: 1,
    number: 1,
    regionId: 'rasuwa_nepal',
    zoneName: 'Syabrubesi Flag House',
    mapLabel: '1. Syabrubesi',
    elevation: '1,460 m',
    mapPos: { xPct: 16, yPct: 76 },
    causeTitle: 'Cause 1: Antecedent Monsoon Saturation',
    shortName: '1. Monsoon Rain',
    speakerName: 'LALI MAYA (PASANG TAMANG)',
    speakerRole: 'Syabrubesi Village Guide • 1,460 m',
    speakerSprite: 'lali_girl',
    guideLine: 'Start at my Flag House! Heavy rain soaked the ground before the flood!',
    photoBeforeUrl: '/incident_photos/syabrubesi_confluence.jpg',
    photoBeforeLabel: 'Syabrubesi Confluence (1,460 m)',
    photoAfterUrl: '/incident_photos/landsat_rasuwa_flood_2026_08_26.png',
    photoAfterLabel: '26 Aug 2026 Flood Scour',
    provenanceBadge: 'model output',
    provenanceSource: 'NASA Rain + Soil Wetness Maps',
    radarMetricBefore: 'Dry Ground (Before Rain)',
    radarMetricAfter: 'Soaked Mud & Flood (Over 78% Wet)',
    storyDialogues: [
      {
        speaker: 'LALI MAYA',
        role: 'Syabrubesi · 1,460 m',
        sprite: 'lali_girl',
        text: "Namaste! Look at the midnight monsoon rain pouring outside my Flag House—normal camera satellites see 0% through these thick storm clouds!",
        showDisplay: 'prompt',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Proof 1/3 · NASA-ISRO Cleanroom',
        sprite: 'lali_girl',
        text: "Proof #1: Meet NASA & ISRO's NISAR spacecraft! Its 12-meter golden mesh antenna fires 24 cm microwave pulses straight through clouds and midnight darkness.",
        showDisplay: 'photos',
        proofTitle: 'Proof #1: NISAR 12 m Dual-Band Radar Antenna',
        proofSource: 'NASA / JPL-Caltech / ISRO Spacecraft Cleanroom',
        proofImageUrl: '/incident_photos/nisar_spacecraft_cleanroom.jpg',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Proof 2/3 · Radar Polarimetry',
        sprite: 'lali_girl',
        text: "Proof #2: On real NISAR radar images, calm floodwater reflects signals away like a mirror (pitch black), while flooded walls double-bounce brightly!",
        showDisplay: 'photos',
        proofTitle: 'Proof #2: NISAR L-Band First-Light Polarization',
        proofSource: 'NASA / JPL-Caltech / ISRO L-Band Reference',
        proofImageUrl: '/incident_photos/nisar_first_radar_image.webp',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Proof 3/3 · Confluence Wipe',
        sprite: 'lali_girl',
        text: "Proof #3: Slide left and right across our Syabrubesi river confluence! Weeks of rain pushed soil wetness past 78% before cobbles washed across the banks.",
        showDisplay: 'slider',
        proofTitle: 'Proof #3: Syabrubesi Confluence ↔ Flood Scour Wipe',
        proofSource: 'NASA Soil Wetness + River Confluence Comparison',
        proofBeforeUrl: '/incident_photos/syabrubesi_confluence.jpg',
        proofAfterUrl: '/incident_photos/landsat_rasuwa_flood_2026_08_26.png',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Syabrubesi · 1,460 m',
        sprite: 'lali_girl',
        text: "Click 'Start Mission' next, turn ON the radar, walk me to all 4 glowing village circles, and help keep our homes and cow safe!",
        showDisplay: 'prompt',
      },
    ],
    miniGameTitle: 'Mission 1: Check Wet Ground & Flood Zones (NASA Radar)',
    miniGameInstruction: 'Step 1: Click "Turn ON Radar". Step 2: Click all 4 circles on the map and pick the highlighted safety action!',
    victoryMessage: 'Great job! We checked all 4 village zones and kept everyone safe!',
    scientificTakeaway:
      'NASA-ISRO NISAR radar sees through rain clouds to spot flooded water (looks dark on radar) and soaked muddy hills (looks bright).',
  },
  {
    id: 'chapter-2',
    act: 1,
    number: 2,
    regionId: 'rasuwa_nepal',
    zoneName: 'Chilime 111 MW Hydro Intake',
    mapLabel: '2. Chilime Hydro',
    elevation: '1,640 m',
    mapPos: { xPct: 35, yPct: 60 },
    causeTitle: 'Cause 2: Pre-Collapse Bedrock Creep',
    shortName: '2. Slipping Hill',
    speakerName: 'LALI MAYA & ENG. BIKRAM',
    speakerRole: 'Chilime Valley • 1,640 m',
    speakerSprite: 'lali_girl',
    guideLine: 'Next is the Chilime Hydropower Dam! The hill rock was slowly slipping!',
    photoBeforeUrl: '/incident_photos/chilime_hydropower_dam.jpg',
    photoBeforeLabel: 'Chilime 111 MW Hydro Intake',
    photoAfterUrl: '/incident_photos/chilime_village_houses.jpg',
    photoAfterLabel: 'Chilime After Surge',
    provenanceBadge: 'reported',
    provenanceSource: 'Space Radar Ground Check (Jul 7 – Aug 24)',
    radarMetricBefore: '07 Jul: Still Mountain',
    radarMetricAfter: '24 Aug: Hill Slipped 40 cm',
    storyDialogues: [
      {
        speaker: 'ENG. BIKRAM',
        role: 'Chilime Hydro Dam · 1,640 m',
        sprite: 'engineer',
        text: 'Lali, look! From the ground the forest hill looks totally normal—but boulders are tumbling near our 3 hydropower water gates!',
        showDisplay: 'prompt',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Proof 1/2 · Hydro Intake',
        sprite: 'lali_girl',
        text: 'Proof #1: Real run-of-river hydropower gates sit at the bottom of steep canyons. Tens of thousands of tons of gravel slurry can clog these intake basins!',
        showDisplay: 'photos',
        proofTitle: 'Proof #1: Himalayan Run-of-River Hydropower Basin',
        proofSource: 'Chilime / Rasuwa Hydro Corridor Reference',
        proofImageUrl: '/incident_photos/chilime_hydropower_dam.jpg',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Proof 2/2 · Jul–Aug Creep',
        sprite: 'lali_girl',
        text: "Proof #2: Sentinel-1 & NISAR phase wipes caught 40 cm of downhill bedrock creep between Jul 7 and Aug 24—hidden underneath green forest leaves!",
        showDisplay: 'slider',
        proofTitle: 'Proof #2: Terraces ↔ Monsoon Surge Wipe',
        proofSource: 'Retrospective InSAR Context (Jul 7 – Aug 24)',
        proofBeforeUrl: '/incident_photos/chilime_village_houses.jpg',
        proofAfterUrl: '/incident_photos/nepal_flood_2026_before_after.webp',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Chilime Hydro Dam · 1,640 m',
        sprite: 'lali_girl',
        text: 'Hurry! Slam all 3 steel dam gates shut right on the dam, then align the radar wave phase to reveal the creeping hill before it slides!',
        showDisplay: 'prompt',
      },
    ],
    miniGameTitle: 'Mission 2: Close the 3 Dam Gates & Scan Under the Trees',
    miniGameInstruction: 'Step 1: Click Shut Intake #1, #2, and #3 to close the dam gates. Step 2: Click NISAR Deep Radar!',
    victoryMessage: 'Awesome! All 3 hydropower gates closed and the slipping hill is mapped!',
    scientificTakeaway:
      'Deep space radar waves pass right through forest leaves to measure slow hillside movement so engineers can close dam gates early.',
  },
  {
    id: 'chapter-3',
    act: 1,
    number: 3,
    regionId: 'rasuwa_nepal',
    zoneName: 'Timure Dry Port',
    mapLabel: '3. Timure Port',
    elevation: '1,760 m',
    mapPos: { xPct: 55, yPct: 45 },
    causeTitle: 'Cause 3: Temporary Debris Damming & 7-Min Breach',
    shortName: '3. Dam Breach',
    speakerName: 'LALI MAYA & AMA DOLMA',
    speakerRole: 'Timure Bazaar • 1,760 m',
    speakerSprite: 'lali_girl',
    guideLine: 'Hurry to Timure! Falling rocks blocked the river for 7 minutes!',
    photoBeforeUrl: '/incident_photos/timure_customs_office.jpg',
    photoBeforeLabel: 'Timure Customs',
    photoAfterUrl: '/incident_photos/gyirong_rasuwagadhi_mudslide_2025.png',
    photoAfterLabel: '4–6 m Boulder Fan',
    provenanceBadge: 'observation',
    provenanceSource: 'European Space Agency Radar Photo',
    radarMetricBefore: '24 Aug: Clear River',
    radarMetricAfter: '28 Aug: Fallen Boulder Pile',
    storyDialogues: [
      {
        speaker: 'AMA DOLMA',
        role: 'Timure Bazaar · 1,760 m',
        sprite: 'elder',
        text: 'Listen, child! The roaring Bhote Koshi river suddenly went silent! That means giant rocks just plugged the narrow canyon upstream!',
        showDisplay: 'prompt',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Proof 1/2 · Timure Gorge',
        sprite: 'lali_girl',
        text: 'Proof #1: Look how narrow the Timure customs road sits beneath vertical cliff faces. Any rockfall acts like an instant wall across the river.',
        showDisplay: 'photos',
        proofTitle: 'Proof #1: Timure Highway & Sheer Canyon Walls',
        proofSource: 'Rasuwa Customs Corridor Reference',
        proofImageUrl: '/incident_photos/timure_customs_office.jpg',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Proof 2/2 · 7-Min Breach',
        sprite: 'lali_girl',
        text: 'Proof #2: Slide to compare the clear customs highway with the 4–6 meter boulder-and-mud wall that swept through ~7 minutes after damming!',
        showDisplay: 'slider',
        proofTitle: 'Proof #2: Intact Port ↔ Mudslide Boulder Surge',
        proofSource: 'Border Port & ESA Coherence Loss Context',
        proofBeforeUrl: '/incident_photos/timure_customs_office.jpg',
        proofAfterUrl: '/incident_photos/gyirong_rasuwagadhi_mudslide_2025.png',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Timure Bazaar · 1,760 m',
        sprite: 'lali_girl',
        text: 'Click every neighbor in Timure so I can sprint to warn all 4 families up to high ground—and dodge the falling rocks!',
        showDisplay: 'prompt',
      },
    ],
    miniGameTitle: 'Mission 3: 7-Minute Flood Warning Run (Move Lali to Warn Villagers)',
    miniGameInstruction: 'Click on each of the 4 villagers (or use Arrow keys / WASD) so Lali runs over to warn them!',
    victoryMessage: 'Hooray! Lali warned all 4 villagers and everyone reached high ground safely!',
    scientificTakeaway:
      'When landslides block a narrow river canyon, water builds up fast—moving uphill immediately saves lives.',
  },
  {
    id: 'chapter-4',
    act: 1,
    number: 4,
    regionId: 'rasuwa_nepal',
    zoneName: 'Rasuwagadhi & Miteri Bridge',
    mapLabel: '4. Miteri Bridge',
    elevation: '1,814 m',
    mapPos: { xPct: 73, yPct: 30 },
    causeTitle: 'Cause 4: Massive Rock-Ice Avalanche Plunge',
    shortName: '4. Ice Plunge',
    speakerName: 'LALI MAYA & OFFICER PEMBA',
    speakerRole: 'Border Gorge • 1,814 m',
    speakerSprite: 'lali_girl',
    guideLine: 'Up at Miteri Bridge! Storm clouds hide the broken bridge—use space radar!',
    photoBeforeUrl: '/incident_photos/nepal_china_border_bridge.jpg',
    photoBeforeLabel: 'Miteri Bridge (1,814 m)',
    photoAfterUrl: '/incident_photos/rasuwagadhi_fort.jpg',
    photoAfterLabel: 'Rasuwagadhi Fort',
    provenanceBadge: 'reported',
    provenanceSource: 'NASA NISAR + Ice Laser Satellite',
    radarMetricBefore: '2 km Ice Fall',
    radarMetricAfter: 'Bridge Shifted Over 5 m',
    storyDialogues: [
      {
        speaker: 'OFFICER PEMBA',
        role: 'Miteri Bridge · 1,814 m',
        sprite: 'rudra',
        text: 'A roaring rock-and-ice avalanche plunged down the high gorge! Rescue choppers cannot land because clouds cover the whole border.',
        showDisplay: 'prompt',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Proof 1/2 · Hanging Ice',
        sprite: 'lali_girl',
        text: 'Proof #1: Hanging glaciers and permafrost cliffs tower over 5,300 m up here. Retrospective L-band pixel-offset tracking caught >5 m slope slip!',
        showDisplay: 'photos',
        proofTitle: 'Proof #1: Langtang–Purugu Hanging Glacier Headwall',
        proofSource: 'High-Altitude Detachment Crown (5,366 m+)',
        proofImageUrl: '/incident_photos/langtang_lirung_glacier.jpg',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Proof 2/2 · Bridge & Fort',
        sprite: 'lali_girl',
        text: 'Proof #2: Slide between Miteri Friendship Bridge and the 1855 stone fort! Bright metal bridge echoes vanish on radar as soon as spans wash off piers.',
        showDisplay: 'slider',
        proofTitle: 'Proof #2: Miteri Bridge ↔ 1855 Rasuwagadhi Fort',
        proofSource: 'Dihedral Bridge Echo Reference',
        proofBeforeUrl: '/incident_photos/nepal_china_border_bridge.jpg',
        proofAfterUrl: '/incident_photos/rasuwagadhi_fort.jpg',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Miteri Bridge · 1,814 m',
        sprite: 'lali_girl',
        text: 'Sweep your radar beam across the storm clouds and lock onto all 4 pulsing signals so rescue crews know where to land!',
        showDisplay: 'prompt',
      },
    ],
    miniGameTitle: 'Mission 4: Cloud-Seeing Radar Flashlight',
    miniGameInstruction: 'Move your mouse over the 4 pulsing blue rings in the clouds and click each one!',
    victoryMessage: 'Awesome! Space radar saw right through the storm clouds and guided the rescue!',
    scientificTakeaway:
      'NASA-ISRO NISAR radar and ICESat-2 lasers map avalanche damage even through dark storm clouds.',
  },
  {
    id: 'chapter-5',
    act: 1,
    number: 5,
    regionId: 'rasuwa_nepal',
    zoneName: '3D Himalayan Science Lab',
    mapLabel: '5. 3D Science Lab',
    elevation: '3D Lab',
    mapPos: { xPct: 86, yPct: 18 },
    causeTitle: 'Cause 5: The Screening vs. Prediction Verdict',
    shortName: '5. 3D Lab Verdict',
    speakerName: 'LALI MAYA & PROF. RUDRA',
    speakerRole: 'DHM Science Lab',
    speakerSprite: 'lali_girl',
    guideLine: 'Final Rasuwa Story Stop! Visit our 3D Science Lab to pick the smartest village plan!',
    photoBeforeUrl: '/nisar-reference/hubbard-2025-11-26.jpg',
    photoBeforeLabel: 'NISAR Pass 1 (2025-11-26)',
    photoAfterUrl: '/nisar-reference/hubbard-2025-12-08.jpg',
    photoAfterLabel: 'NISAR Pass 2 (2025-12-08)',
    provenanceBadge: 'observation',
    provenanceSource: 'Silwal & Dahal (Zenodo 22730419)',
    radarMetricBefore: 'Moving Slopes Seen',
    radarMetricAfter: 'Stable Ones Creep Too',
    storyDialogues: [
      {
        speaker: 'LALI MAYA',
        role: 'Proof · Real NASA NISAR Pair',
        sprite: 'lali_girl',
        text: 'Proof: Compare these two real NASA NISAR acquisitions (Nov 26 vs Dec 8, 2025) showing how Alaska’s Hubbard Glacier fractured after a Mw 7.0 quake!',
        showDisplay: 'slider',
        proofTitle: 'Real NASA Published Pair: Hubbard Glacier Mw 7.0 Quake',
        proofSource: 'NASA Earth Observatory / JPL-Caltech / ASF / USGS',
        proofBeforeUrl: '/nisar-reference/hubbard-2025-11-26.jpg',
        proofAfterUrl: '/nisar-reference/hubbard-2025-12-08.jpg',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Proof · Real 26 Aug Rasuwa Datum',
        sprite: 'lali_girl',
        text: 'Even better—check the real Aug 26, 2026 Rasuwa telemetry! NISAR L-band GUNW phase survived in only 9/528 source pixels, Sentinel-1D flagged 158/307 target vs 1,225/30,161 control false alarms, and GPM IMERG recorded 0.0 mm/hr at collapse!',
        showDisplay: 'slider',
        proofTitle: 'Real 26 Aug Datum: NISAR GUNW Failure vs. Sentinel-1D Coherence',
        proofSource: 'NASA ASF NISAR Provisional L2 + Sentinel-1D HyP3 + GPM IMERG',
        proofBeforeUrl: '/rasuwa-datum/handoff/lband_coherence_comparison.webp',
        proofAfterUrl: '/rasuwa-datum/handoff/cband_coherence_comparison.webp',
      },
      {
        speaker: 'LALI MAYA',
        role: '3D Science Lab · Zenodo 22730419',
        sprite: 'lali_girl',
        text: 'Many hills move meters without ever collapsing! Click 3 slopes to compare them, then pick the regional screening plan pairing radar with local rain gauges!',
        showDisplay: 'prompt',
      },
    ],
    miniGameTitle: 'Mission 5: Smart Village Safety Plan (Final Rasuwa Mission)',
    miniGameInstruction: 'Step 1: Click any 3 Slope boxes on the left. Step 2: Click the green Regional Screening plan on the right!',
    victoryMessage: 'You completed all 5 Rasuwa Story Missions! Click Finish Rasuwa Story or explore the 2D Valley & 3D Lab!',
    scientificTakeaway:
      'Silwal & Dahal (Zenodo 22730419): Space radar is best used for regional screening paired with local rain gauges and community drills.',
  },
  {
    id: 'chapter-6',
    act: 2,
    number: 6,
    regionId: 'san_joaquin_usa',
    zoneName: 'San Joaquin Farms & Aquifer',
    mapLabel: '6. Smart Farming',
    elevation: 'California',
    mapPos: { xPct: 18, yPct: 68 },
    causeTitle: 'Bonus World Mission 6: Smart Farming & Sinking Ground',
    shortName: '6. Farms & Wells',
    speakerName: 'LALI MAYA & ROSA',
    speakerRole: 'San Joaquin Valley • USA',
    speakerSprite: 'ca_campesino',
    guideLine: 'Bonus World Mission: Help California farmers save water and stop the ground from sinking!',
    photoBeforeUrl: '/incident_photos/california_subsidence_pole.jpg',
    photoBeforeLabel: 'Historic Subsidence Benchmark',
    photoAfterUrl: '/incident_photos/california_aqueduct_subsidence.jpg',
    photoAfterLabel: 'Aqueduct Canal Stress (-28 cm/yr)',
    provenanceBadge: 'model output',
    provenanceSource: 'NASA & Argentina Space Radar',
    radarMetricBefore: 'Ground Reference Level',
    radarMetricAfter: 'Sinking Canal Bowl (-28 cm/yr)',
    storyDialogues: [
      {
        speaker: 'LALI MAYA',
        role: 'San Joaquin · Proof Case',
        sprite: 'lali_girl',
        text: 'Proof: Slide to compare California’s classic subsidence pole with modern aqueduct canals! Pumping deep groundwater makes clay soil compact irreversibly.',
        showDisplay: 'slider',
        proofTitle: 'California Aqueduct Subsidence Proof',
        proofSource: 'USGS / NASA NISAR Ground Subsidence Context',
        proofBeforeUrl: '/incident_photos/california_subsidence_pole.jpg',
        proofAfterUrl: '/incident_photos/california_aqueduct_subsidence.jpg',
      },
      {
        speaker: 'LALI MAYA',
        role: 'San Joaquin · USA',
        sprite: 'lali_girl',
        text: 'Click all 4 farm circles so I walk out to inspect them, then pick the safe recharge button marked with ✨!',
        showDisplay: 'prompt',
      },
    ],
    miniGameTitle: 'Bonus Mission 6: Smart Farming & Sinking Ground (California)',
    miniGameInstruction: 'Click each of the 4 farm circles so Lali walks there, then click the action button marked with ✨!',
    victoryMessage: 'Amazing! The crops stayed watered and the ground stopped sinking!',
    scientificTakeaway:
      'NASA NISAR and Argentina’s SAOCOM radar measure soil wetness under crops and catch sinking ground early.',
  },
  {
    id: 'chapter-7',
    act: 2,
    number: 7,
    regionId: 'pantanal_brazil',
    zoneName: 'Pantanal & Amazon Canopy',
    mapLabel: '7. Forests & Fires',
    elevation: 'Brazil',
    mapPos: { xPct: 42, yPct: 44 },
    causeTitle: 'Bonus World Mission 7: See Under Forest Trees & Smoke',
    shortName: '7. Forest Canopy',
    speakerName: 'LALI MAYA & IARA',
    speakerRole: 'Pantanal Wetlands • Brazil',
    speakerSprite: 'br_indigenous',
    guideLine: 'Bonus World Mission: Use deep space radar to see under forest leaves in Brazil!',
    photoBeforeUrl: '/incident_photos/brazil_mato_grosso_nasa.jpg',
    photoBeforeLabel: 'Amazon Frontier Canopy',
    photoAfterUrl: '/incident_photos/brazil_pantanal_floodplain.jpg',
    photoAfterLabel: 'Sub-Canopy Pantanal Flood',
    provenanceBadge: 'model output',
    provenanceSource: 'NASA NISAR + GEDI Forest Lasers',
    radarMetricBefore: 'Short Radar: Leaves Block View',
    radarMetricAfter: 'Deep Radar: Sees Trunks & Floods',
    storyDialogues: [
      {
        speaker: 'LALI MAYA',
        role: 'Pantanal · Proof Case',
        sprite: 'lali_girl',
        text: 'Proof: Compare Mato Grosso deforestation fronts with flooded Pantanal plains! Short radar bounces off green canopies, while 24 cm L-band penetrates right down to water.',
        showDisplay: 'slider',
        proofTitle: 'Amazon Clearing ↔ Pantanal Sub-Canopy Flood Proof',
        proofSource: 'NASA Earth Observatory / INPE Brazil Reference',
        proofBeforeUrl: '/incident_photos/brazil_mato_grosso_nasa.jpg',
        proofAfterUrl: '/incident_photos/brazil_pantanal_floodplain.jpg',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Pantanal · Brazil',
        sprite: 'lali_girl',
        text: 'Click the green Deep Radar button to see under the trees, then click all 4 forest spots!',
        showDisplay: 'prompt',
      },
    ],
    miniGameTitle: 'Bonus Mission 7: See Under Forest Leaves (Deep Space Radar)',
    miniGameInstruction: 'Step 1: Click "Deep Radar (See Under Trees)". Step 2: Click each of the 4 forest boxes and pick the ✨ button!',
    victoryMessage: 'Great job! Rangers spotted every hidden clearing and fire scar under the trees!',
    scientificTakeaway:
      'Deep space radar passes through top leaves to spot cut logs, wildfire burns, and flooded forests.',
  },
  {
    id: 'chapter-8',
    act: 2,
    number: 8,
    regionId: 'hatay_turkiye',
    zoneName: 'Hatay Fault & Dam Corridor',
    mapLabel: '8. Quake Triage',
    elevation: 'Türkiye',
    mapPos: { xPct: 65, yPct: 58 },
    causeTitle: 'Bonus World Mission 8: Earthquake Bridge & Dam Check',
    shortName: '8. Quake & Dams',
    speakerName: 'LALI MAYA & ZEYNEP',
    speakerRole: 'Hatay Corridor • Türkiye',
    speakerSprite: 'lali_girl',
    guideLine: 'Bonus World Mission: Check which bridges and dams are safe after an earthquake!',
    photoBeforeUrl: '/incident_photos/turkiye_antakya_courtyard.jpg',
    photoBeforeLabel: 'Antakya Stone Courtyard',
    photoAfterUrl: '/incident_photos/turkiye_hatay_quake_fault.jpg',
    photoAfterLabel: 'Fault Surface Rupture Offset',
    provenanceBadge: 'model output',
    provenanceSource: 'NASA NISAR + OPERA Damage Maps',
    radarMetricBefore: 'Intact Roadway',
    radarMetricAfter: 'Split Olive-Grove Fault',
    storyDialogues: [
      {
        speaker: 'LALI MAYA',
        role: 'Hatay · Proof Case',
        sprite: 'lali_girl',
        text: 'Proof: Slide to inspect Antakya stone buildings versus the literal surface fault rupture that split olive rows! Radar coherence maps highlight broken bridges at night.',
        showDisplay: 'slider',
        proofTitle: 'Antakya Urban Block ↔ Hatay Fault Rupture Proof',
        proofSource: 'Kandilli / NASA ARIA-OPERA Quake Triage Case',
        proofBeforeUrl: '/incident_photos/turkiye_antakya_courtyard.jpg',
        proofAfterUrl: '/incident_photos/turkiye_hatay_quake_fault.jpg',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Hatay · Türkiye',
        sprite: 'lali_girl',
        text: 'Turn ON the radar and click all 4 infrastructure boxes so ambulances find safe routes!',
        showDisplay: 'prompt',
      },
    ],
    miniGameTitle: 'Bonus Mission 8: Earthquake Bridge & Dam Safety Check',
    miniGameInstruction: 'Step 1: Click "Turn ON Quake Damage Radar". Step 2: Click each of the 4 bridge/dam boxes and pick the ✨ button!',
    victoryMessage: 'Ambulances took the safe highway and engineers checked the dam in time!',
    scientificTakeaway:
      'NASA radar maps show exact ground movement in centimeters so rescue teams avoid broken bridges.',
  },
  {
    id: 'chapter-9',
    act: 2,
    number: 9,
    regionId: 'yukon_alaska',
    zoneName: 'Arctic Coast & Hubbard Glacier',
    mapLabel: '9. Oil & Glaciers',
    elevation: 'Alaska',
    mapPos: { xPct: 84, yPct: 26 },
    causeTitle: 'Bonus World Mission 9: Ocean Oil Spills & Moving Glaciers',
    shortName: '9. Ocean & Ice',
    speakerName: 'LALI MAYA & ELENA',
    speakerRole: 'Yukon–Hubbard Coast • USA',
    speakerSprite: 'lali_girl',
    guideLine: 'Bonus World Mission: Spot dark ocean oil spills and fast glaciers in the Arctic winter!',
    photoBeforeUrl: '/incident_photos/alaska_yupik_tundra.jpg',
    photoBeforeLabel: 'Yup’ik Coastal Boardwalk',
    photoAfterUrl: '/incident_photos/alaska_permafrost_bluff.jpg',
    photoAfterLabel: 'Thawing Permafrost Bluff',
    provenanceBadge: 'observation',
    provenanceSource: 'NASA NISAR + Canada Radar + ICESat-2',
    radarMetricBefore: 'Frozen Tundra Crust',
    radarMetricAfter: 'Slumping Thaw Bluff',
    storyDialogues: [
      {
        speaker: 'LALI MAYA',
        role: 'Alaska · Proof Case',
        sprite: 'lali_girl',
        text: 'Proof: Compare frozen coastal boardwalks against collapsing permafrost bluffs! In dark subarctic winter, radar also spots smooth oil spills as dark ocean patches.',
        showDisplay: 'slider',
        proofTitle: 'Yukon–Kuskokwim Tundra ↔ Permafrost Bluff Erosion Proof',
        proofSource: 'NASA ABoVE / CSA RADARSAT Arctic Watch',
        proofBeforeUrl: '/incident_photos/alaska_yupik_tundra.jpg',
        proofAfterUrl: '/incident_photos/alaska_permafrost_bluff.jpg',
      },
      {
        speaker: 'LALI MAYA',
        role: 'Arctic Coast · Alaska',
        sprite: 'lali_girl',
        text: 'Turn ON the Arctic radar and click all 4 coastal targets to protect docks and sea ice!',
        showDisplay: 'prompt',
      },
    ],
    miniGameTitle: 'Bonus Mission 9: Arctic Oil Spill & Glacier Watch',
    miniGameInstruction: 'Step 1: Click "Dark Winter (Turn ON Arctic Radar)". Step 2: Click all 4 boxes on the map and pick the ✨ button!',
    victoryMessage: 'Clean ocean, safe coastal docks, and all Arctic targets protected!',
    scientificTakeaway:
      'Canada’s RADARSAT and NASA-ISRO NISAR spot smooth oil spills and track glaciers day or night.',
  },
];

interface IntroBeat {
  headline: string;
  subline: string;
  voiceMood: 'warm' | 'curious' | 'gentle' | 'joy';
  visualMood: 'house_morning' | 'valley_storm' | 'radar_eyes' | 'invite_journey';
}

const INTRO_BEATS: IntroBeat[] = [
  {
    headline: "Namaste! I'm Lali!",
    subline: 'Welcome to my Flag House in Syabrubesi (1,460 m). My cow Lali is grazing outside while the Bhote Koshi River rushes by!',
    voiceMood: 'joy',
    visualMood: 'house_morning',
  },
  {
    headline: 'When midnight storms hit, regular cameras are blind!',
    subline: 'Thick clouds and dark night drop regular satellite visibility to 0%—right when mountain homes need help most.',
    voiceMood: 'curious',
    visualMood: 'valley_storm',
  },
  {
    headline: 'Mountains quietly slip before they break!',
    subline: 'Even under green forests, rainwater weakens steep rocks and hills creep centimeter by centimeter.',
    voiceMood: 'curious',
    visualMood: 'valley_storm',
  },
  {
    headline: "NASA's space radar sees right through clouds & trees!",
    subline: 'Day or night, NISAR & OPERA radar beams reveal flooded water, hidden boulders, and rainbow movement rings.',
    voiceMood: 'warm',
    visualMood: 'radar_eyes',
  },
  {
    headline: 'You steer the radar & protect our neighbors!',
    subline: 'Turn on cloud-piercing radar, seal steel hydropower gates before surges hit, and sprint with me to warn our valley.',
    voiceMood: 'warm',
    visualMood: 'radar_eyes',
  },
  {
    headline: "Let's save Rasuwa Valley—and the Earth!",
    subline: 'Walk 5 exciting Rasuwa story stops, explore our 2D Pixel Valley & 3D Science Lab, plus 4 global missions!',
    voiceMood: 'joy',
    visualMood: 'invite_journey',
  },
];

const FINALE_CONVERSATION: {
  speaker: string;
  country: string;
  sprite: CharacterPaletteId;
  text: string;
}[] = [
  {
    speaker: 'LALI MAYA',
    country: '🇳🇵 Syabrubesi, Nepal',
    sprite: 'lali_girl',
    text: 'Thank you! Together we walked from my Flag House to Miteri Bridge and solved all 5 mountain clues.',
  },
  {
    speaker: 'PROF. DR. RUDRA',
    country: '🇳🇵 DHM Science Lab',
    sprite: 'rudra',
    text: 'We saw how rain-soaked mud, a slowly slipping hill, a blocked river, and falling ice piled together into one big flood.',
  },
  {
    speaker: 'IARA KAIOWÁ',
    country: '🇧🇷 Pantanal, Brazil',
    sprite: 'br_indigenous',
    text: 'The same space radar looks right under forest smoke and tree leaves to protect our wetlands.',
  },
  {
    speaker: 'ROSA, ZEYNEP & ELENA',
    country: '🇺🇸 California • 🇹🇷 Hatay • 🇺🇸 Alaska',
    sprite: 'ca_campesino',
    text: 'All around the world, space radar helps towns stay ready—when we pair it with local rain gauges and neighbors helping neighbors.',
  },
];

/**
 * Handcrafted animated SVG portrait of our Nepali little girl guide (inspired by Lali Hamri Gai):
 * twin braided pigtails with crimson dhago ribbons, cholo blouse, patuki sash, forehead tika,
 * blinking eyes & mouth animation synced with speech.
 */
const LaliGirlAvatar: React.FC<{
  mouthOpen: boolean;
  waving?: boolean;
  pointing?: 'right' | 'up' | 'none';
  size?: number;
}> = ({ mouthOpen, waving = false, pointing = 'none', size = 128 }) => {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 160);
    }, 3400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 130"
      role="img"
      aria-label="Lali Maya, young Nepali guide"
      className="select-none drop-shadow-lg"
    >
      {/* Soft ground shadow */}
      <ellipse cx="60" cy="122" rx="28" ry="5" fill="rgba(10, 22, 16, 0.35)" />

      {/* Twin braided pigtails behind shoulders with crimson dhago ribbons */}
      <g>
        <path d="M35 48 Q22 65 24 88" stroke="#1e1518" strokeWidth="9" strokeLinecap="round" fill="none" />
        <path d="M85 48 Q98 65 96 88" stroke="#1e1518" strokeWidth="9" strokeLinecap="round" fill="none" />
        {/* Red dhago ribbons */}
        <circle cx="24" cy="87" r="5" fill="#dc2626" />
        <path d="M22 90 L16 100 M26 90 L29 101" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
        <circle cx="96" cy="87" r="5" fill="#dc2626" />
        <path d="M94 90 L91 101 M98 90 L104 100" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Festive Nepali Fariya Pleated Skirt */}
      <path d="M38 88 L82 88 L90 116 L30 116 Z" fill="#ea580c" stroke="#431407" strokeWidth="2" />
      <path d="M34 106 L86 106 L89 114 L31 114 Z" fill="#facc15" opacity="0.9" />
      <path d="M46 88 L43 116 M60 88 L60 116 M74 88 L77 116" stroke="#9a3412" strokeWidth="1.5" opacity="0.55" />

      {/* Boots / feet */}
      <ellipse cx="47" cy="118" rx="6" ry="3.5" fill="#451a03" />
      <ellipse cx="73" cy="118" rx="6" ry="3.5" fill="#451a03" />

      {/* Crimson Cholo Blouse & Golden Patuki Waist Sash */}
      <path d="M40 62 Q60 58 80 62 L83 86 L37 86 Z" fill="#be123c" stroke="#4c0519" strokeWidth="2" />
      <rect x="38" y="82" width="44" height="7" rx="2" fill="#facc15" stroke="#854d0e" strokeWidth="1.5" />
      <path d="M52 62 L60 72 L68 62" fill="none" stroke="#fde047" strokeWidth="2" />

      {/* Arms (waving or pointing gently) */}
      <g>
        <path
          d={waving ? 'M40 66 Q24 55 21 42' : 'M40 66 Q28 76 31 86'}
          stroke="#f1bc8e"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx={waving ? 21 : 31} cy={waving ? 41 : 86} r="4.5" fill="#f1bc8e" />

        <path
          d={
            pointing === 'right'
              ? 'M80 66 Q97 64 108 58'
              : pointing === 'up'
                ? 'M80 66 Q96 52 100 38'
                : 'M80 66 Q92 76 89 86'
          }
          stroke="#f1bc8e"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <circle
          cx={pointing === 'right' ? 109 : pointing === 'up' ? 100 : 89}
          cy={pointing === 'right' ? 58 : pointing === 'up' ? 37 : 86}
          r="4.5"
          fill="#f1bc8e"
        />
      </g>

      {/* Head + Ears */}
      <circle cx="35" cy="43" r="5" fill="#e5a978" />
      <circle cx="85" cy="43" r="5" fill="#e5a978" />
      <circle cx="60" cy="40" r="24" fill="#f4c297" stroke="#5c361c" strokeWidth="2" />

      {/* Warm glossy black hair parting */}
      <path d="M36 37 Q37 14 60 14 Q83 14 84 37 Q72 24 60 28 Q48 24 36 37 Z" fill="#1e1518" />
      {/* Tiny crimson dhago hair clips */}
      <circle cx="38" cy="34" r="3.5" fill="#ef4444" />
      <circle cx="82" cy="34" r="3.5" fill="#ef4444" />

      {/* Tiny auspicious crimson forehead tika */}
      <circle cx="60" cy="30" r="2.2" fill="#dc2626" />

      {/* Expressive blinking eyes */}
      {blink ? (
        <>
          <path d="M46 42 Q50 45 54 42" stroke="#1e1518" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M66 42 Q70 45 74 42" stroke="#1e1518" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="50" cy="41" r="3.6" fill="#1e1518" />
          <circle cx="70" cy="41" r="3.6" fill="#1e1518" />
          <circle cx="51.2" cy="39.8" r="1.3" fill="#ffffff" />
          <circle cx="71.2" cy="39.8" r="1.3" fill="#ffffff" />
        </>
      )}

      {/* Eyebrows & Rosy cheeks */}
      <path d="M45 35 Q50 32.5 55 34.5" stroke="#2d1e22" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M65 34.5 Q70 32.5 75 35" stroke="#2d1e22" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <ellipse cx="44" cy="48" rx="4.2" ry="2.5" fill="#fb7185" opacity="0.45" />
      <ellipse cx="76" cy="48" rx="4.2" ry="2.5" fill="#fb7185" opacity="0.45" />

      {/* Mouth animated when speaking */}
      {mouthOpen ? (
        <ellipse cx="60" cy="52.5" rx="4.5" ry="3.8" fill="#9f1239" stroke="#4c0519" strokeWidth="1.2" />
      ) : (
        <path d="M54 51.5 Q60 56.5 66 51.5" stroke="#7f1d1d" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
};

interface RasuwaStoryAdventureProps {
  onStartGame: (
    mode: 'world_atlas' | 'syabrubesi' | 'inside_lab' | 'judge_demo',
    initialRegionId?: GlobalRegionId,
    audioPrefs?: { voiceOn?: boolean; bgmOn?: boolean }
  ) => void;
  onOpenStoryMode?: () => void;
  onOpenWorkbench?: (aoiId?: string) => void;
  onOpenSciencePrimer?: (
    tab?: 'sar101' | 'polarization' | 'rosetta' | 'hypotheses' | 'future'
  ) => void;
  onOpenResources?: () => void;
  locale?: SupportedLocale;
  onChangeLocale?: (locale: SupportedLocale) => void;
  initialSolvedChapters?: string[];
  onSolvedChaptersChange?: (chapters: string[]) => void;
  requestedChapterId?: string | null;
  onConsumeRequestedChapter?: () => void;
  onStartJudgeTour?: () => void;
  onChapterCompleted?: (chapterId: string) => void;
  onOpenModeOverview?: () => void;
  onOpen3DLab?: () => void;
}

export const RasuwaStoryAdventure: React.FC<RasuwaStoryAdventureProps> = ({
  onStartGame,
  onOpenStoryMode,
  onOpenWorkbench,
  onOpenSciencePrimer,
  onOpenResources,
  initialSolvedChapters,
  onSolvedChaptersChange,
  requestedChapterId,
  onConsumeRequestedChapter,
  onStartJudgeTour,
  onChapterCompleted,
  onOpenModeOverview,
  onOpen3DLab,
}) => {
  const [currentScene, setCurrentScene] = useState<StorySceneKey>('scene-intro');
  const [introBeatIdx, setIntroBeatIdx] = useState<number>(0);
  const [chapterDialogIdx, setChapterDialogIdx] = useState<number>(0);
  const [chapterMode, setChapterMode] = useState<'story' | 'minigame'>('story');
  const [finaleDialogIdx, setFinaleDialogIdx] = useState<number>(0);

  // Audio controls (Relaxing music + Human Neural / Gemini Girl Voice)
  const [bgmOn, setBgmOn] = useState<boolean>(false);
  const [voiceOn, setVoiceOn] = useState<boolean>(true);
  const [mouthOpen, setMouthOpen] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [voiceEngine, setVoiceEngine] = useState<string>(() => retroAudio.activeVoiceEngine);
  const [neuralVoiceId, setNeuralVoiceId] = useState<string>(() => retroAudio.neuralVoiceId);
  const [geminiKeyOpen, setGeminiKeyOpen] = useState<boolean>(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>('');
  const [voiceConfigNote, setVoiceConfigNote] = useState<string | null>(null);

  // Interactive Map Travel State & Act Switcher (Act I: Rasuwa Gorge 1-5, Act II: Global Pro SAR 6-9)
  const [mapAct, setMapAct] = useState<1 | 2>(1);
  const [guideMapPos, setGuideMapPos] = useState<{ xPct: number; yPct: number }>({
    xPct: 16,
    yPct: 76,
  });
  const [travelTargetId, setTravelTargetId] = useState<string | null>(null);

  // Typewriter for concise chapter dialogues
  const [typedText, setTypedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Sliders in chapters
  const [chapterWipe, setChapterWipe] = useState<number>(52);

  // Completed chapters & interactive play session reset
  const [solvedChapters, setSolvedChapters] = useState<string[]>(() => initialSolvedChapters ?? []);
  const [playSessionKey, setPlaySessionKey] = useState<number>(0);

  // Chapter 5 Slope Screening State
  const [ch5InspectedSlopes, setCh5InspectedSlopes] = useState<number[]>([]);
  const [ch5SelectedVerdict, setCh5SelectedVerdict] = useState<
    'none' | 'false_siren' | 'regional_screening'
  >('none');

  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouthOpenRef = useRef<boolean>(false);
  mouthOpenRef.current = mouthOpen;

  // Evidence Proof Casebook Modal State (12 interesting single-image NASA/Himalayan proof stories)
  const [proofArchiveOpen, setProofArchiveOpen] = useState<boolean>(false);
  const [proofArchiveIdx, setProofArchiveIdx] = useState<number>(0);
  const [proofModalWipe, setProofModalWipe] = useState<number>(52);
  const [realDatumOpen, setRealDatumOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!proofArchiveOpen && !realDatumOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProofArchiveOpen(false);
        setRealDatumOpen(false);
      } else if (proofArchiveOpen && e.key === 'ArrowRight') {
        setProofArchiveIdx((i) => (i + 1) % EVIDENCE_PROOF_STORIES.length);
        setProofModalWipe(52);
      } else if (proofArchiveOpen && e.key === 'ArrowLeft') {
        setProofArchiveIdx((i) => (i - 1 + EVIDENCE_PROOF_STORIES.length) % EVIDENCE_PROOF_STORIES.length);
        setProofModalWipe(52);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [proofArchiveOpen, realDatumOpen]);

  // Wire animated mouth state and live voice engine status from audio engine
  useEffect(() => {
    retroAudio.onMouthState(setMouthOpen);
    const unsubVoice = retroAudio.onVoiceEngineChange(setVoiceEngine);
    void fetch(`/api/tts/status?neuralVoice=${encodeURIComponent(retroAudio.neuralVoiceId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.activeEngine === 'gemini-tts') {
          setVoiceEngine(data.model || 'gemini-tts');
        } else if (data.neuralVoice) {
          setVoiceEngine(`edge-neural:${data.neuralVoice}`);
        }
      })
      .catch(() => {});
    return () => {
      unsubVoice();
      retroAudio.onMouthState(null);
      retroAudio.stopSpeaking();
    };
  }, []);

  const activeChapter = useMemo(
    () => RASUWA_STORY_CHAPTERS.find((c) => c.id === currentScene) ?? null,
    [currentScene]
  );

  // Recommended next unvisited chapter on the map
  const nextRecommendedChapter = useMemo(() => {
    return (
      RASUWA_STORY_CHAPTERS.find((c) => !solvedChapters.includes(c.id)) ??
      RASUWA_STORY_CHAPTERS[RASUWA_STORY_CHAPTERS.length - 1]
    );
  }, [solvedChapters]);

  // Ensure relaxing audio unlocks cleanly on first click
  const ensureStoryAudio = useCallback(() => {
    retroAudio.unlock();
    retroAudio.voiceEnabled = voiceOn;
    if (!bgmOn) {
      retroAudio.startRelaxingStoryBgm();
      setBgmOn(true);
    }
  }, [bgmOn, voiceOn]);

  const lastAutoSpokenKeyRef = useRef<string>('');

  // Speak active scene line in Lali's sweet voice (supports forceReplay on manual replay button)
  const speakActiveLine = useCallback(
    (
      line: string,
      mood: 'warm' | 'curious' | 'gentle' | 'joy' = 'warm',
      forceReplay = false
    ) => {
      if (!voiceOn || !line) return;
      retroAudio.voiceEnabled = true;
      retroAudio.speakStoryGirl(line, mood, forceReplay);
    },
    [voiceOn]
  );

  // Determine the full target text for current dialogue
  const activeFullDialogueText = useMemo(() => {
    if (currentScene === 'scene-intro') {
      const b = INTRO_BEATS[introBeatIdx];
      return `${b.headline} ${b.subline}`;
    }
    if (currentScene === 'exploreScene') {
      if (travelTargetId) {
        const dest = RASUWA_STORY_CHAPTERS.find((c) => c.id === travelTargetId);
        return dest ? `Traveling to ${dest.zoneName}...` : '';
      }
      if (solvedChapters.length === RASUWA_STORY_CHAPTERS.length) {
        return 'We solved all 9 Earth missions! Tap Global Gathering or explore the 3D Modern Computer!';
      }
      if (mapAct === 2) {
        const nextAct2 =
          RASUWA_STORY_CHAPTERS.find((c) => c.act === 2 && !solvedChapters.includes(c.id)) ??
          RASUWA_STORY_CHAPTERS[5];
        return nextAct2.guideLine;
      }
      return nextRecommendedChapter.guideLine;
    }
    if (activeChapter) {
      if (chapterMode === 'minigame') {
        const isSolved = solvedChapters.includes(activeChapter.id);
        return isSolved ? activeChapter.victoryMessage : activeChapter.miniGameInstruction;
      }
      return (
        activeChapter.storyDialogues[chapterDialogIdx]?.text ??
        activeChapter.storyDialogues[0].text
      );
    }
    if (currentScene === 'FinalScene') {
      return (
        FINALE_CONVERSATION[Math.min(finaleDialogIdx, FINALE_CONVERSATION.length - 1)]?.text ?? ''
      );
    }
    return '';
  }, [
    currentScene,
    introBeatIdx,
    travelTargetId,
    mapAct,
    solvedChapters,
    nextRecommendedChapter,
    activeChapter,
    chapterMode,
    chapterDialogIdx,
    finaleDialogIdx,
  ]);

  // Typewriter for chapter/finale dialogue lines
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || currentScene === 'exploreScene' || currentScene === 'scene-intro') {
      setTypedText(activeFullDialogueText);
      setIsTyping(false);
      return;
    }

    setTypedText('');
    setIsTyping(true);
    let idx = 0;
    const timer = window.setInterval(() => {
      idx += 3;
      if (idx >= activeFullDialogueText.length) {
        setTypedText(activeFullDialogueText);
        setIsTyping(false);
        window.clearInterval(timer);
      } else {
        setTypedText(activeFullDialogueText.slice(0, idx));
      }
    }, 20);

    return () => window.clearInterval(timer);
  }, [activeFullDialogueText, currentScene]);

  // Pre-warm all intro story lines on mount so Lali's voice plays crisply without lag
  useEffect(() => {
    if (!voiceOn) return;
    INTRO_BEATS.forEach((b) => {
      retroAudio.prefetchStoryGirl(`${b.headline} ${b.subline}`, b.voiceMood);
    });
  }, [voiceOn]);

  // Prefetch upcoming chapter lines silently
  useEffect(() => {
    if (!voiceOn) return;
    if (activeChapter && chapterMode === 'story') {
      const nextLine = activeChapter.storyDialogues[chapterDialogIdx + 1];
      if (nextLine) retroAudio.prefetchStoryGirl(nextLine.text, 'warm');
    }
  }, [voiceOn, activeChapter, chapterMode, chapterDialogIdx]);

  const bgmOnRef = useRef(bgmOn);
  bgmOnRef.current = bgmOn;
  const ensureStoryAudioRef = useRef(ensureStoryAudio);
  ensureStoryAudioRef.current = ensureStoryAudio;
  const speakActiveLineRef = useRef(speakActiveLine);
  speakActiveLineRef.current = speakActiveLine;

  // Single-instance speaker hook — speaks each scene/beat strictly ONCE
  useEffect(() => {
    if (!voiceOn) {
      lastAutoSpokenKeyRef.current = '';
      return;
    }
    if (proofArchiveOpen) return;

    const beatKey =
      currentScene === 'scene-intro'
        ? `intro:${introBeatIdx}`
        : currentScene === 'exploreScene'
          ? travelTargetId
            ? ''
            : `map:${mapAct}:${solvedChapters.length}`
          : activeChapter
            ? `ch:${activeChapter.id}:${chapterMode}:${chapterMode === 'story' ? chapterDialogIdx : 'mg'}`
            : currentScene === 'FinalScene'
              ? `finale:${finaleDialogIdx}`
              : '';

    if (!beatKey || lastAutoSpokenKeyRef.current === beatKey) return;

    let line = '';
    let mood: 'warm' | 'curious' | 'gentle' | 'joy' = 'joy';

    if (currentScene === 'scene-intro') {
      const b = INTRO_BEATS[introBeatIdx];
      line = `${b.headline} ${b.subline}`;
      mood = b.voiceMood;
      if (introBeatIdx === 0 && !bgmOnRef.current) {
        const onFirstGesture = (ev: Event) => {
          const target = ev.target as HTMLElement | null;
          // Ignore button presses (Continue / Skip / Proof / Menu) so navigation never double-speaks beat 0 + next scene
          if (target?.closest('button, [role="button"]')) return;
          if (lastAutoSpokenKeyRef.current === beatKey) return;
          lastAutoSpokenKeyRef.current = beatKey;
          ensureStoryAudioRef.current();
          speakActiveLineRef.current(line, mood);
        };
        window.addEventListener('pointerdown', onFirstGesture, { once: true });
        return () => window.removeEventListener('pointerdown', onFirstGesture);
      }
    } else if (currentScene === 'exploreScene' && !travelTargetId) {
      line =
        solvedChapters.length === RASUWA_STORY_CHAPTERS.length
          ? 'We solved all nine radar missions! Tap Global Council or explore our 3D Lab.'
          : mapAct === 2
            ? (
                RASUWA_STORY_CHAPTERS.find((c) => c.act === 2 && !solvedChapters.includes(c.id)) ??
                RASUWA_STORY_CHAPTERS[5]
              ).guideLine
            : nextRecommendedChapter.guideLine;
      mood = 'curious';
    } else if (activeChapter) {
      if (chapterMode === 'story') {
        line = activeChapter.storyDialogues[chapterDialogIdx]?.text ?? '';
        mood = 'warm';
      } else {
        line = activeChapter.miniGameInstruction;
        mood = 'warm';
      }
    } else if (currentScene === 'FinalScene') {
      const f = FINALE_CONVERSATION[Math.min(finaleDialogIdx, FINALE_CONVERSATION.length - 1)];
      line = f?.text ?? '';
      mood = 'joy';
    }

    if (!line) return;
    lastAutoSpokenKeyRef.current = beatKey;
    speakActiveLineRef.current(line, mood);
  }, [
    currentScene,
    introBeatIdx,
    chapterDialogIdx,
    chapterMode,
    finaleDialogIdx,
    travelTargetId,
    mapAct,
    voiceOn,
    proofArchiveOpen,
    solvedChapters,
    nextRecommendedChapter,
    activeChapter,
  ]);

  // Animated Pixel-Art Landscape Canvas Backdrop (Traditional Stone Flag House + Lali Cow + Himalayan Gorge)
  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let timerId = 0;
    let tick = 0;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = () => {
      if (disposed) return;
      if (!prefersReducedMotion) tick++;
      const c = bgCanvasRef.current;
      if (!c) return;
      const W = 512;
      const H = 260;
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
      }
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const anim = prefersReducedMotion ? 0 : Math.floor(tick / 5) % 4;
      const walkF = (prefersReducedMotion ? 0 : Math.floor(tick / 4) % 2 === 0 ? 1 : 2) as
        | 0
        | 1
        | 2;

      // Sky wash gradient (warm morning dawn -> overcast storm -> crisp mountain sun)
      const beatMood =
        currentScene === 'scene-intro' ? INTRO_BEATS[introBeatIdx]?.visualMood : 'house_morning';
      const isStorm = beatMood === 'valley_storm' || currentScene === 'chapter-3';
      const skyTop = isStorm ? '#1b263b' : '#23456b';
      const skyHorizon = isStorm ? '#415a77' : '#94bdb9';
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 114);
      skyGrad.addColorStop(0, skyTop);
      skyGrad.addColorStop(1, skyHorizon);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, 114);

      // Far sunlit Himalayan snow ridge (smooth undulating curves, zero jagged triangles)
      ctx.fillStyle = isStorm ? '#475569' : '#64748b';
      ctx.beginPath();
      ctx.moveTo(0, 112);
      ctx.quadraticCurveTo(58, 36, 112, 62);
      ctx.quadraticCurveTo(165, 86, 206, 24);
      ctx.quadraticCurveTo(256, 68, 308, 42);
      ctx.quadraticCurveTo(356, 18, 408, 56);
      ctx.quadraticCurveTo(462, 82, 512, 36);
      ctx.lineTo(512, 112);
      ctx.closePath();
      ctx.fill();

      // Soft snow-draped upper crests following curved silhouettes
      ctx.fillStyle = isStorm ? 'rgba(203, 213, 225, 0.72)' : 'rgba(248, 250, 252, 0.88)';
      ctx.beginPath();
      ctx.moveTo(168, 48);
      ctx.quadraticCurveTo(206, 22, 246, 52);
      ctx.quadraticCurveTo(212, 46, 168, 48);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(324, 40);
      ctx.quadraticCurveTo(360, 18, 396, 48);
      ctx.quadraticCurveTo(360, 40, 324, 40);
      ctx.fill();

      // Midground forested valley hills with atmospheric valley mist
      const midGrad = ctx.createLinearGradient(0, 56, 0, 114);
      midGrad.addColorStop(0, isStorm ? '#283845' : '#2f5241');
      midGrad.addColorStop(1, isStorm ? '#1e293b' : '#1b3a2b');
      ctx.fillStyle = midGrad;
      ctx.beginPath();
      ctx.moveTo(0, 114);
      ctx.quadraticCurveTo(78, 62, 164, 84);
      ctx.quadraticCurveTo(256, 102, 344, 68);
      ctx.quadraticCurveTo(432, 46, 512, 76);
      ctx.lineTo(512, 114);
      ctx.closePath();
      ctx.fill();

      // Morning valley mist ribbon
      const mistGrad = ctx.createLinearGradient(0, 82, 0, 114);
      mistGrad.addColorStop(0, 'rgba(226, 232, 240, 0)');
      mistGrad.addColorStop(1, isStorm ? 'rgba(148, 163, 184, 0.25)' : 'rgba(241, 245, 249, 0.26)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(0, 82, W, 32);

      // Natural foreground valley ground tiles (below y=96)
      const cols = Math.ceil(W / 16);
      const startRow = 6;
      const rows = Math.ceil(H / 16);
      for (let ty = startRow; ty < rows; ty++) {
        for (let tx = 0; tx < cols; tx++) {
          let kind = 'grass';
          if (currentScene === 'scene-intro' || currentScene === 'chapter-1') {
            if (tx >= 21 && tx <= 25) {
              kind = ty === 11 ? 'bridge_wood' : tx === 23 ? 'rapids' : 'water';
            } else if (tx === 20 || tx === 26) {
              kind = 'river_cobble';
            } else if (ty === 11) {
              kind = 'path';
            }
          } else if (currentScene === 'chapter-2') {
            if (tx >= 14 && tx <= 18) kind = ty === 10 ? 'bridge_wood' : 'rapids';
            else if (ty === 10) kind = 'path';
          } else if (currentScene === 'chapter-3') {
            if (tx >= 14 && tx <= 17) kind = 'rapids';
            else if (tx >= 7 && tx <= 24 && ty >= 9 && ty <= 13) kind = 'scree';
            else kind = 'river_cobble';
          } else if (currentScene === 'chapter-4') {
            if (tx >= 14 && tx <= 17) kind = ty === 11 ? 'bridge_wood' : 'rapids';
            else kind = 'scree';
          } else if (currentScene === 'chapter-5') {
            if (ty === 11) kind = 'limestone_paving';
          }
          ctx.drawImage(getTerrainTile(kind, anim, tx, ty), tx * 16, ty * 16);
        }
      }

      // Draw Opening Flag House, Lali Cow, Prayer Flags & Nepali Girl Guide standing outside
      if (currentScene === 'scene-intro' || currentScene === 'chapter-1') {
        ctx.drawImage(getPropSprite('tamang_stone_house', anim), 42, 82);
        ctx.drawImage(getPropSprite('laliguras_tree', anim), 8, 92);
        ctx.drawImage(getPropSprite('prayer_flags', anim), 126, 98);
        // Gentle cow Lali grazing beside her home!
        ctx.drawImage(getPropSprite('lali_cow', anim), 126, 134);
        ctx.drawImage(getPropSprite('laliguras_tree', anim), 456, 96);

        // Bamboo flagpole + Crimson Nepali Double-Triangle Flag outside the house
        ctx.fillStyle = '#d97706';
        ctx.fillRect(114, 72, 2, 62);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(116, 72);
        ctx.lineTo(132, 79);
        ctx.lineTo(116, 83);
        ctx.lineTo(134, 91);
        ctx.lineTo(116, 94);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Always draw expressive pixel Lali standing on open green ground outside her Flag House beside her cow!
        const laliBounce = currentScene === 'scene-intro' && tick % 24 < 12 ? -1 : 0;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.36)';
        ctx.fillRect(179, 161, 16, 4);
        ctx.drawImage(getCharacterSprite('lali_girl', 'down', walkF), 176, 132 + laliBounce, 22, 30);
        // Clear floating "LALI" ground label + subtle speaking sound arcs
        ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
        ctx.fillRect(173, 118 + laliBounce, 28, 10);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('LALI', 178, 126 + laliBounce);
        if (currentScene === 'scene-intro' && (mouthOpenRef.current || tick % 40 < 24)) {
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.9)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(202, 140 + laliBounce, 4 + (tick % 6), -0.6, 0.6);
          ctx.stroke();
        }
      } else if (currentScene === 'chapter-2') {
        ctx.drawImage(getPropSprite('hydro_dam', anim), 204, 88);
        ctx.drawImage(getPropSprite('laliguras_tree', anim), 36, 96);
        ctx.drawImage(getCharacterSprite('lali_girl', 'right', walkF), 152, 136);
        ctx.drawImage(getCharacterSprite('engineer', 'left', 0), 302, 136);
      } else if (currentScene === 'chapter-3') {
        ctx.drawImage(getPropSprite('house_red', anim), 56, 88);
        ctx.drawImage(getPropSprite('flood_siren_tower', anim), 382, 88);
        ctx.drawImage(getCharacterSprite('lali_girl', 'right', walkF), 158, 136);
        ctx.drawImage(getCharacterSprite('elder', 'left', 0), 208, 136);
      } else if (currentScene === 'chapter-4') {
        ctx.drawImage(getPropSprite('buddhist_stupa', anim), 68, 90);
        ctx.drawImage(getPropSprite('radar_beacon', anim), 372, 98);
        ctx.drawImage(getCharacterSprite('lali_girl', 'right', walkF), 154, 136);
        ctx.drawImage(getCharacterSprite('rudra', 'left', 0), 308, 136);
      } else if (currentScene === 'chapter-5') {
        ctx.drawImage(getPropSprite('dhm_nisar_kendra', anim), 196, 62);
        ctx.drawImage(getPropSprite('radar_beacon', anim), 124, 108);
        ctx.drawImage(getCharacterSprite('lali_girl', 'right', walkF), 174, 138);
        ctx.drawImage(getCharacterSprite('rudra', 'down', 0), 248, 138);
      } else if (currentScene === 'chapter-6') {
        ctx.drawImage(getPropSprite('house_red', anim), 62, 92);
        ctx.drawImage(getPropSprite('radar_beacon', anim), 368, 96);
        ctx.drawImage(getCharacterSprite('lali_girl', 'right', walkF), 152, 138);
        ctx.drawImage(getCharacterSprite('ca_campesino', 'left', 0), 278, 138);
      } else if (currentScene === 'chapter-7') {
        ctx.drawImage(getPropSprite('laliguras_tree', anim), 48, 86);
        ctx.drawImage(getPropSprite('laliguras_tree', anim), 416, 86);
        ctx.drawImage(getPropSprite('radar_beacon', anim), 240, 88);
        ctx.drawImage(getCharacterSprite('lali_girl', 'right', walkF), 146, 138);
        ctx.drawImage(getCharacterSprite('br_indigenous', 'left', 0), 302, 138);
      } else if (currentScene === 'chapter-8') {
        ctx.drawImage(getPropSprite('hydro_dam', anim), 208, 86);
        ctx.drawImage(getPropSprite('flood_siren_tower', anim), 382, 88);
        ctx.drawImage(getCharacterSprite('lali_girl', 'right', walkF), 146, 138);
        ctx.drawImage(getCharacterSprite('engineer', 'left', 0), 298, 138);
      } else if (currentScene === 'chapter-9') {
        ctx.drawImage(getPropSprite('radar_beacon', anim), 360, 92);
        ctx.drawImage(getPropSprite('buddhist_stupa', anim), 64, 92);
        ctx.drawImage(getCharacterSprite('lali_girl', 'right', walkF), 150, 138);
        ctx.drawImage(getCharacterSprite('rudra', 'left', 0), 286, 138);
      } else if (currentScene === 'FinalScene') {
        ctx.drawImage(getPropSprite('dhm_nisar_kendra', anim), 198, 56);
        ctx.drawImage(getPropSprite('prayer_flags', anim), 90, 92);
        ctx.drawImage(getPropSprite('lali_cow', anim), 398, 130);
        ctx.drawImage(getCharacterSprite('lali_girl', 'down', walkF), 96, 138);
        ctx.drawImage(getCharacterSprite('rudra', 'down', 0), 156, 138);
        ctx.drawImage(getCharacterSprite('elder', 'down', 0), 214, 138);
        ctx.drawImage(getCharacterSprite('br_indigenous', 'down', 0), 274, 138);
        ctx.drawImage(getCharacterSprite('ca_campesino', 'down', 0), 332, 138);
      }

      // Soft rain / atmospheric radar sweep only during storm / radar intro beats
      if (isStorm) {
        ctx.fillStyle = 'rgba(186, 230, 253, 0.35)';
        for (let i = 0; i < 36; i++) {
          const rx = (i * 41 + tick * 2) % W;
          const ry = (i * 29 + tick * 6) % H;
          ctx.fillRect(rx, ry, 1, 8);
        }
      }
      if (beatMood === 'radar_eyes') {
        const beamX = prefersReducedMotion ? 256 : ((tick * 2.2) % (W + 120)) - 60;
        const grad = ctx.createLinearGradient(beamX - 36, 0, beamX + 36, 0);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.25)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(beamX - 36, 0, 72, H);
      }

      if (!prefersReducedMotion && !disposed) {
        timerId = window.setTimeout(() => {
          if (!disposed) raf = requestAnimationFrame(draw);
        }, 62);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timerId);
    };
  }, [currentScene, introBeatIdx, chapterDialogIdx, chapterMode]);

  const markChapterSolved = useCallback(
    (chId: string) => {
      setSolvedChapters((prev) => {
        if (prev.includes(chId)) return prev;
        const next = [...prev, chId];
        onSolvedChaptersChange?.(next);
        return next;
      });
      onChapterCompleted?.(chId);
    },
    [onChapterCompleted, onSolvedChaptersChange]
  );

  const handleMissionSolved = useCallback(
    (chId: string) => {
      if (!solvedChapters.includes(chId)) {
        retroAudio.playBadgeUnlock();
        markChapterSolved(chId);
      }
    },
    [solvedChapters, markChapterSolved]
  );

  useEffect(() => {
    if (
      ch5InspectedSlopes.length >= 3 &&
      ch5SelectedVerdict === 'regional_screening' &&
      !solvedChapters.includes('chapter-5')
    ) {
      retroAudio.playBadgeUnlock();
      markChapterSolved('chapter-5');
    }
  }, [ch5InspectedSlopes, ch5SelectedVerdict, solvedChapters, markChapterSolved]);

  // Smoothly walk the girl guide along the map to any chosen stop, then enter it
  const travelToChapterOnMap = useCallback(
    (ch: ChapterDefinition) => {
      ensureStoryAudio();
      retroAudio.playUiClick(720);
      setTravelTargetId(ch.id);

      const startPos = { ...guideMapPos };
      const endPos = ch.mapPos;
      const startTime = performance.now();
      const durationMs = 620;

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / durationMs);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        setGuideMapPos({
          xPct: startPos.xPct + (endPos.xPct - startPos.xPct) * ease,
          yPct: startPos.yPct + (endPos.yPct - startPos.yPct) * ease,
        });
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          setTravelTargetId(null);
          setMapAct(ch.act);
          setCurrentScene(ch.id);
          setChapterDialogIdx(0);
          setChapterMode('story');
          setChapterWipe(52);
        }
      };
      requestAnimationFrame(step);
    },
    [ensureStoryAudio, guideMapPos]
  );

  const openChapterDirect = useCallback((chId: ChapterDefinition['id'], initialMode: 'story' | 'minigame' = 'story') => {
    const ch = RASUWA_STORY_CHAPTERS.find((c) => c.id === chId);
    if (ch) {
      setMapAct(ch.act);
      setGuideMapPos(ch.mapPos);
      setCurrentScene(chId);
      setChapterDialogIdx(0);
      setChapterMode(initialMode);
      setChapterWipe(52);
    }
  }, []);

  useEffect(() => {
    if (!requestedChapterId) return;
    const ch = RASUWA_STORY_CHAPTERS.find((c) => c.id === requestedChapterId);
    if (ch) {
      openChapterDirect(ch.id, 'minigame');
    }
    onConsumeRequestedChapter?.();
  }, [requestedChapterId, openChapterDirect, onConsumeRequestedChapter]);

  // Dialogue & intro advance handler (unskippable intro flows beat-by-beat into the map!)
  const handleAdvanceDialogue = useCallback(() => {
    ensureStoryAudio();
    retroAudio.playUiClick(640);

    if (currentScene === 'scene-intro') {
      if (introBeatIdx < INTRO_BEATS.length - 1) {
        setIntroBeatIdx((prev) => prev + 1);
      } else {
        setCurrentScene('exploreScene');
      }
      return;
    }

    if (isTyping) {
      setTypedText(activeFullDialogueText);
      setIsTyping(false);
      return;
    }

    if (activeChapter && chapterMode === 'story') {
      if (chapterDialogIdx < activeChapter.storyDialogues.length - 1) {
        setChapterDialogIdx((prev) => prev + 1);
      } else {
        setChapterMode('minigame');
      }
      return;
    }

    if (currentScene === 'FinalScene') {
      if (finaleDialogIdx < FINALE_CONVERSATION.length - 1) {
        setFinaleDialogIdx((prev) => prev + 1);
      }
    }
  }, [
    ensureStoryAudio,
    currentScene,
    introBeatIdx,
    isTyping,
    activeFullDialogueText,
    activeChapter,
    chapterMode,
    chapterDialogIdx,
    finaleDialogIdx,
  ]);

  // Spacebar support to continue story naturally
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.querySelector('[role="dialog"]') ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLButtonElement
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleAdvanceDialogue();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleAdvanceDialogue]);

  const handleRestartStory = () => {
    retroAudio.stopSpeaking();
    setCurrentScene('scene-intro');
    setIntroBeatIdx(0);
    setChapterDialogIdx(0);
    setChapterMode('story');
    setFinaleDialogIdx(0);
    setMapAct(1);
    setGuideMapPos({ xPct: 16, yPct: 76 });
    setPlaySessionKey((k) => k + 1);
    setCh5InspectedSlopes([]);
    setCh5SelectedVerdict('none');
    setSolvedChapters([]);
    onSolvedChaptersChange?.([]);
    setMenuOpen(false);
  };

  const toggleMusic = () => {
    retroAudio.unlock();
    retroAudio.setBgmStyle('relaxing');
    const next = retroAudio.toggleBgm(!bgmOn);
    setBgmOn(next);
  };

  const toggleVoice = () => {
    retroAudio.unlock();
    const next = !voiceOn;
    retroAudio.voiceEnabled = next;
    setVoiceOn(next);
    if (!next) {
      retroAudio.stopSpeaking();
    } else if (activeFullDialogueText) {
      speakActiveLine(activeFullDialogueText, 'warm', true);
    }
  };

  const currentBeat = INTRO_BEATS[introBeatIdx];
  const currentChapterDialogue = activeChapter
    ? activeChapter.storyDialogues[Math.min(chapterDialogIdx, activeChapter.storyDialogues.length - 1)]
    : null;
  const isEvidenceFullImageBeat = Boolean(
    activeChapter &&
      chapterMode === 'story' &&
      (currentChapterDialogue?.showDisplay === 'photos' ||
        currentChapterDialogue?.showDisplay === 'slider')
  );
  // Keep ONE single full-screen visual per beat: hide the pixel house backdrop during full missions, the full-bleed Valley Map, and full-screen proof photo beats!
  const hideBackdropCanvas = Boolean(
    (activeChapter && chapterMode === 'minigame' && activeChapter.id !== 'chapter-5') ||
      currentScene === 'exploreScene' ||
      isEvidenceFullImageBeat
  );

  return (
    <div className="relative w-full flex-1 min-h-screen bg-slate-900 overflow-hidden flex flex-col justify-between">
      {/* FULL-BLEED ANIMATED HIMALAYAN SCENE CANVAS (Only shown on pixel-world beats so zero double images overlap!) */}
      {!hideBackdropCanvas && (
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-0 w-full h-full object-cover block pointer-events-none"
          role="img"
          aria-label="Nepali village stone house outside Syabrubesi and Bhote Koshi valley"
        />
      )}

      {/* FULL-BLEED VALLEY TRAIL MAP BACKGROUND (Single Full-Screen View for exploreScene!) */}
      {currentScene === 'exploreScene' && (
        <svg
          viewBox="0 0 1000 500"
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="gorgeSkyGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={mapAct === 1 ? '#0f2922' : '#0f172a'} />
              <stop offset="55%" stopColor={mapAct === 1 ? '#0e3a38' : '#0c2742'} />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>
          <rect width="1000" height="500" fill="url(#gorgeSkyGlow)" />
          {mapAct === 1 ? (
            <>
              <path d="M480 0 Q600 95 720 42 Q840 120 960 28 L1000 60 L1000 0 Z" fill="rgba(226, 232, 240, 0.16)" />
              <path d="M0 460 Q250 400 490 285 T980 110 L1000 500 L0 500 Z" fill="rgba(16, 185, 129, 0.14)" />
              <path d="M0 375 Q300 320 560 215 T1000 55 L1000 500 L0 500 Z" fill="rgba(20, 184, 166, 0.11)" />
              <path d="M70 460 Q210 380 350 320 T620 215 T880 85" fill="none" stroke="rgba(14, 165, 233, 0.48)" strokeWidth="26" strokeLinecap="round" />
              <path d="M160 380 Q255 340 350 300 T550 225 T730 150 T860 90" fill="none" stroke="#facc15" strokeWidth="4" strokeDasharray="10 8" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M70 110 Q180 70 250 180 Q220 310 130 390 Q80 280 70 110 Z" fill="rgba(16, 185, 129, 0.18)" stroke="rgba(16, 185, 129, 0.35)" />
              <path d="M350 210 Q460 180 510 320 Q440 430 370 390 Q340 300 350 210 Z" fill="rgba(5, 150, 105, 0.22)" stroke="rgba(52, 211, 153, 0.4)" />
              <path d="M580 130 Q720 120 790 240 Q740 320 620 290 Q570 220 580 130 Z" fill="rgba(245, 158, 11, 0.18)" stroke="rgba(251, 191, 36, 0.35)" />
              <path d="M760 40 Q880 30 930 130 Q870 190 770 150 Z" fill="rgba(226, 232, 240, 0.2)" stroke="rgba(186, 230, 253, 0.4)" />
              <path d="M180 340 Q310 260 420 220 T650 290 T840 130" fill="none" stroke="#38bdf8" strokeWidth="4" strokeDasharray="10 8" strokeLinecap="round" />
            </>
          )}
        </svg>
      )}

      {/* FULL-BLEED SINGLE EVIDENCE PHOTO / INTERACTIVE WIPE BACKDROP (One full-screen image, zero split cards!) */}
      {isEvidenceFullImageBeat && activeChapter && currentChapterDialogue && (
        <div className="absolute inset-0 w-full h-full bg-slate-950 pointer-events-none select-none">
          {currentChapterDialogue.showDisplay === 'slider' ? (
            <>
              <img
                src={currentChapterDialogue.proofAfterUrl ?? activeChapter.photoAfterUrl}
                alt={activeChapter.photoAfterLabel}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <img
                src={currentChapterDialogue.proofBeforeUrl ?? activeChapter.photoBeforeUrl}
                alt={activeChapter.photoBeforeLabel}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ clipPath: `inset(0 ${100 - chapterWipe}% 0 0)` }}
              />
              <div
                className="absolute inset-y-0 w-0.5 bg-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.95)]"
                style={{ left: `${chapterWipe}%` }}
              />
            </>
          ) : (
            <img
              src={currentChapterDialogue.proofImageUrl ?? activeChapter.photoBeforeUrl}
              alt={currentChapterDialogue.proofTitle ?? activeChapter.photoBeforeLabel}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
        </div>
      )}

      {/* MINIMAL TOP CORNER CONTROLS (Clean floating edge controls, zero website bars) */}
      <div className="relative z-30 flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          {currentScene !== 'scene-intro' && (
            <button
              type="button"
              data-testid="story-back-btn"
              onClick={() => {
                retroAudio.playUiClick();
                setCurrentScene('exploreScene');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-950/30 backdrop-blur-sm hover:bg-slate-900/50 border border-white/35 text-amber-100 text-xs font-medium cursor-pointer [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]"
            >
              ← Valley Map
            </button>
          )}
          <span className="px-3 py-1 rounded-lg bg-slate-950/25 backdrop-blur-sm border border-white/20 text-stone-100 text-xs font-medium [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
            {currentScene === 'scene-intro'
              ? '🇳🇵 Syabrubesi, Rasuwa • 1,460 m'
              : currentScene === 'exploreScene'
                ? `Earth Waltz Trail • ${solvedChapters.length}/${RASUWA_STORY_CHAPTERS.length} Solved`
                : activeChapter
                  ? `Ch.${activeChapter.number} · ${activeChapter.zoneName} (${activeChapter.elevation})`
                  : 'Global Gathering'}
          </span>
        </div>

        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            data-testid="story-real-datum-btn"
            onClick={() => {
              retroAudio.playUiClick(760);
              setRealDatumOpen(true);
            }}
            title="Inspect real 26 Aug 2026 NISAR GeoTIFFs, GeoJSON boundaries, L-vs-C coherence plates & GPM IMERG rainfall"
            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-400/70 text-emerald-100 font-semibold text-xs cursor-pointer shadow"
          >
            🛰️ Real 26 Aug NASA Data
          </button>
          <button
            type="button"
            data-testid="story-proof-archive-btn"
            onClick={() => {
              retroAudio.playUiClick(740);
              setProofArchiveIdx(0);
              setProofModalWipe(52);
              setProofArchiveOpen(true);
            }}
            title="Browse 12 NASA & Himalayan Evidence Proof Stories"
            className="px-2.5 py-1.5 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-400/70 text-sky-100 font-semibold text-xs cursor-pointer shadow"
          >
            📜 Proof Stories ({EVIDENCE_PROOF_STORIES.length})
          </button>
          {onStartJudgeTour && (
            <button
              type="button"
              data-testid="story-judge-tour-btn"
              onClick={() => {
                retroAudio.playUiClick(780);
                onStartJudgeTour();
              }}
              title="Open 90-Second Guided Judge Showcase"
              className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 border border-amber-200 text-slate-950 font-bold text-xs cursor-pointer shadow"
            >
              🏆 90s Judge Tour
            </button>
          )}
          <button
            type="button"
            data-testid="toggle-music-btn"
            onClick={toggleMusic}
            title="Toggle relaxing Himalayan music"
            className="px-2.5 py-1.5 rounded-lg bg-slate-950/25 backdrop-blur-sm hover:bg-slate-900/50 border border-white/30 text-amber-100 text-xs cursor-pointer"
          >
            {bgmOn ? '🎵 Music On' : '🎵 Music Off'}
          </button>
          <button
            type="button"
            data-testid="toggle-voice-btn"
            onClick={toggleVoice}
            title={`Toggle Lali's human voice narration (${voiceEngine})`}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950/25 backdrop-blur-sm hover:bg-slate-900/50 border border-white/30 text-amber-100 text-xs cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>{voiceOn ? '🗣️ Voice On' : '🔇 Voice Off'}</span>
            {voiceOn && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  voiceEngine === 'browser-fallback' ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                aria-hidden="true"
              />
            )}
          </button>
          <button
            type="button"
            data-testid="story-menu-btn"
            onClick={() => {
              retroAudio.playUiClick();
              setMenuOpen((v) => !v);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950/25 backdrop-blur-sm hover:bg-slate-900/50 border border-white/30 text-stone-100 text-xs cursor-pointer"
          >
            ☰ Menu
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 w-68 p-2 rounded-lg bg-slate-950/95 border border-stone-600 shadow-2xl flex flex-col gap-1 z-50 text-xs">
              <div className="px-2.5 py-1.5 rounded bg-slate-900/90 border border-stone-700/80 mb-1 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-emerald-300">🎙️ Lali Human Voice</span>
                  <span
                    data-testid="story-voice-engine-badge"
                    className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-200"
                  >
                    {voiceEngine.startsWith('gemini')
                      ? 'Gemini Zephyr'
                      : voiceEngine === 'browser-fallback'
                        ? 'Offline Speech'
                        : 'Neural Girl'}
                  </span>
                </div>
                <label className="flex flex-col gap-1 text-[11px] text-stone-300">
                  <span>Neural Voice Persona</span>
                  <select
                    data-testid="story-voice-select"
                    value={neuralVoiceId}
                    onChange={(e) => {
                      const nextVoice = e.target.value;
                      setNeuralVoiceId(nextVoice);
                      retroAudio.setNeuralVoiceId(nextVoice);
                      setVoiceConfigNote(null);
                      if (voiceOn && activeFullDialogueText) {
                        retroAudio.speakStoryGirl(activeFullDialogueText, 'joy', true);
                      }
                    }}
                    className="w-full rounded bg-slate-950 border border-stone-700 px-2 py-1 text-[11px] text-stone-100 focus:outline-none focus:border-emerald-400"
                  >
                    <option value="en-US-AnaNeural">Ana Neural · Bright Girl (Default)</option>
                    <option value="en-GB-MaisieNeural">Maisie Neural · UK Girl</option>
                    <option value="en-IN-NeerjaExpressiveNeural">Neerja · Expressive South-Asian</option>
                    <option value="en-US-AvaNeural">Ava Neural · Warm Storyteller</option>
                    <option value="en-US-EmmaNeural">Emma Neural · Cheerful Guide</option>
                  </select>
                </label>
                <button
                  type="button"
                  data-testid="story-gemini-key-toggle"
                  onClick={() => setGeminiKeyOpen((v) => !v)}
                  className="text-left text-[11px] text-sky-300 hover:text-sky-200 cursor-pointer"
                >
                  {geminiKeyOpen ? '▾ Hide Gemini AI Studio Key' : '▸ Optional: Use Gemini AI Studio Key'}
                </button>
                {geminiKeyOpen && (
                  <div className="flex flex-col gap-1 pt-0.5">
                    <input
                      type="password"
                      data-testid="story-gemini-key-input"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="Paste GEMINI_API_KEY (optional)"
                      className="w-full rounded bg-slate-950 border border-stone-700 px-2 py-1 text-[11px] text-stone-100 focus:outline-none focus:border-sky-400"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-testid="story-gemini-key-save"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/tts/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                apiKey: geminiKeyInput.trim(),
                                persist: true,
                              }),
                            });
                            const data = await res.json();
                            retroAudio.clearVoiceCache();
                            setGeminiKeyInput('');
                            if (data?.geminiHealthy) {
                              setVoiceEngine(data.model || 'gemini-tts');
                              setVoiceConfigNote('Gemini Zephyr activated & saved to .env.local');
                            } else {
                              setVoiceEngine(`edge-neural:${neuralVoiceId}`);
                              setVoiceConfigNote('Using built-in Human Neural voice');
                            }
                            if (voiceOn && activeFullDialogueText) {
                              retroAudio.speakStoryGirl(activeFullDialogueText, 'joy', true);
                            }
                          } catch {
                            setVoiceConfigNote('Could not update server voice config');
                          }
                        }}
                        className="flex-1 rounded bg-sky-700 hover:bg-sky-600 text-white px-2 py-1 text-[11px] font-semibold cursor-pointer"
                      >
                        Apply Key
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setGeminiKeyInput('');
                          await fetch('/api/tts/config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ apiKey: '', persist: true }),
                          }).catch(() => {});
                          retroAudio.clearVoiceCache();
                          setVoiceEngine(`edge-neural:${neuralVoiceId}`);
                          setVoiceConfigNote('Switched back to built-in Human Neural');
                        }}
                        className="rounded bg-slate-800 hover:bg-slate-700 text-stone-300 px-2 py-1 text-[11px] cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
                {voiceConfigNote && (
                  <p className="text-[10px] text-emerald-300 leading-tight">{voiceConfigNote}</p>
                )}
              </div>
              <button
                type="button"
                data-testid="story-restart-btn"
                onClick={handleRestartStory}
                className="text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-stone-200 cursor-pointer"
              >
                🔄 Restart Story
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (onOpen3DLab) onOpen3DLab();
                  else onStartGame('inside_lab', 'rasuwa_nepal');
                }}
                className="text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-amber-200 cursor-pointer"
              >
                ⛰️ Open 3D Science Lab
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onStartGame('syabrubesi', 'rasuwa_nepal', { voiceOn, bgmOn });
                }}
                className="text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-emerald-200 cursor-pointer"
              >
                🚶 Walk 2D Village
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onStartGame('judge_demo');
                }}
                className="text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-sky-200 cursor-pointer"
              >
                📋 6-Step Photo Guide
              </button>
              {onOpenWorkbench && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenWorkbench('rasuwa_nepal');
                  }}
                  className="text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-stone-300 cursor-pointer"
                >
                  🛰️ Real Satellite Checker
                </button>
              )}
              {onOpenSciencePrimer && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSciencePrimer('sar101');
                  }}
                  className="text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-stone-300 cursor-pointer"
                >
                  🔬 How Radar Works (Simple Guide)
                </button>
              )}
              {onOpenResources && (
                <button
                  type="button"
                  data-testid="story-menu-resources-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenResources();
                  }}
                  className="text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-sky-200 cursor-pointer"
                >
                  📚 NASA &amp; Space Data Links
                </button>
              )}
              {onOpenModeOverview && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenModeOverview();
                  }}
                  className="text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-stone-400 cursor-pointer"
                >
                  🧭 All Game Modes
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CENTER & PERIMETER STAGE */}
      <div
        className={`relative z-20 flex-1 flex flex-col px-4 py-2 ${
          currentScene === 'scene-intro'
            ? 'justify-end pb-4'
            : hideBackdropCanvas && currentScene !== 'exploreScene' && !isEvidenceFullImageBeat
              ? 'justify-start min-h-0'
              : currentScene === 'exploreScene'
                ? 'justify-between min-h-0'
                : isEvidenceFullImageBeat
                  ? 'justify-between min-h-0'
                  : 'items-center justify-center'
        }`}
      >
        {/* 1. UNSKIPPABLE OPENING SCENE: Clear Open Stone Flag House + Cow + Mountains, Crisp Bottom Dialogue Dock */}
        {currentScene === 'scene-intro' && (
          <div
            data-testid="unskippable-opening-stage"
            className="w-full max-w-4xl mx-auto flex flex-col gap-2"
          >
            {/* Optional quick Skip >> corner button */}
            {introBeatIdx < INTRO_BEATS.length - 1 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  data-testid="intro-jump-map-btn"
                  onClick={() => {
                    ensureStoryAudio();
                    retroAudio.playUiClick(680);
                    setCurrentScene('exploreScene');
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-950/25 backdrop-blur-sm hover:bg-slate-950/45 border border-white/35 text-amber-100 text-xs font-semibold cursor-pointer [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]"
                >
                  Skip Intro ⏭️
                </button>
              </div>
            )}

            {/* Transparent/semi-transparent bottom dialogue dock — keeps sky, mountains & Flag House clearly visible! */}
            <div className="w-full px-4 py-3 rounded-xl border border-amber-300/65 bg-slate-950/20 backdrop-blur-sm shadow-xl flex flex-col sm:flex-row items-center gap-3.5 [text-shadow:0_1px_6px_rgba(0,0,0,0.98),0_0_12px_rgba(0,0,0,0.85)]">
              <div className="shrink-0">
                <LaliGirlAvatar mouthOpen={mouthOpen} waving={introBeatIdx === 0} size={84} />
              </div>

              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-between gap-2 mb-0.5">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                    LALI MAYA · SYABRUBESI (1,460 m)
                  </span>
                  <div className="flex items-center gap-1.5" aria-label="Story progress">
                    {INTRO_BEATS.map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === introBeatIdx
                            ? 'w-6 bg-amber-300'
                            : idx < introBeatIdx
                              ? 'w-2.5 bg-emerald-400'
                              : 'w-2 bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-amber-50 leading-snug">
                  {currentBeat.headline}
                </h1>
                <p className="mt-1 text-sm sm:text-base text-stone-100 leading-snug">
                  {currentBeat.subline}
                </p>
              </div>

              <div className="shrink-0 [text-shadow:none]">
                <button
                  type="button"
                  data-testid={
                    introBeatIdx === INTRO_BEATS.length - 1
                      ? 'start-adventure-btn'
                      : 'intro-next-btn'
                  }
                  onClick={handleAdvanceDialogue}
                  className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-lg transition transform hover:scale-[1.02] cursor-pointer whitespace-nowrap"
                >
                  {introBeatIdx === INTRO_BEATS.length - 1
                    ? 'Start Adventure →'
                    : 'Continue →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. FULL-SCREEN TWO-ACT EXPEDITION ROUTE MAP (ACT I RASUWA + ACT II GLOBAL PRO SAR) */}
        {currentScene === 'exploreScene' && (
          <div className="relative w-full flex-1 min-h-0 flex flex-col justify-between py-2">
            {/* Top Act Switcher floating cleanly over the full-screen map */}
            <div className="flex flex-wrap items-center justify-between gap-2 z-10">
              <div className="flex items-center gap-1.5 bg-slate-950/25 backdrop-blur-sm p-1 rounded-lg border border-white/25">
                <button
                  type="button"
                  data-testid="map-act-1-btn"
                  onClick={() => {
                    retroAudio.playUiClick(620);
                    setMapAct(1);
                  }}
                  className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                    mapAct === 1 ? 'bg-amber-400 text-slate-950' : 'text-stone-200 hover:bg-slate-800/60'
                  }`}
                >
                  🏔️ Main Story: Rasuwa Valley (5 Missions)
                </button>
                <button
                  type="button"
                  data-testid="map-act-2-btn"
                  onClick={() => {
                    retroAudio.playUiClick(700);
                    setMapAct(2);
                  }}
                  className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                    mapAct === 2 ? 'bg-sky-400 text-slate-950' : 'text-sky-200 hover:bg-slate-800/60'
                  }`}
                >
                  🌍 Bonus World Map (4 Extra NASA Missions)
                </button>
              </div>
              <div className="px-3 py-1 rounded-lg bg-slate-950/25 backdrop-blur-sm border border-white/25 text-[11px] text-amber-200 [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                🧭 Rasuwa Story: {solvedChapters.filter((id) => Number(id.split('-')[1]) <= 5).length}/5 · Bonus World: {solvedChapters.filter((id) => Number(id.split('-')[1]) > 5).length}/4
              </div>
            </div>

            {/* Interactive Map Destination Pins + Lali Guide directly across full-screen canvas */}
            <div className="relative flex-1 min-h-[340px]">
              {RASUWA_STORY_CHAPTERS.filter((ch) => ch.act === mapAct).map((ch) => {
                const isSolved = solvedChapters.includes(ch.id);
                const isNext = nextRecommendedChapter.id === ch.id && !isSolved;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    data-testid={`hub-card-${ch.id}`}
                    onClick={() => travelToChapterOnMap(ch)}
                    style={{
                      left: `${ch.mapPos.xPct}%`,
                      top: `${ch.mapPos.yPct}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg border text-left transition transform hover:scale-105 cursor-pointer shadow-lg ${
                      isSolved
                        ? 'bg-emerald-900/95 border-emerald-400 text-emerald-100'
                        : isNext
                          ? 'bg-amber-400 border-amber-100 text-slate-950 font-bold ring-4 ring-amber-400/35'
                          : 'bg-slate-900/90 border-stone-500 text-stone-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="text-[11px] leading-tight whitespace-nowrap flex items-center gap-1">
                      <span>{isSolved ? '✓' : isNext ? '➜' : `${ch.number}.`}</span>
                      <span>{ch.mapLabel.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                    <div className="text-[10px] opacity-80 whitespace-nowrap">{ch.elevation}</div>
                  </button>
                );
              })}

              {/* Animated Nepali Little Girl Standing Cleanly Beside the Active Stop */}
              <div
                style={{
                  left: `${guideMapPos.xPct}%`,
                  top: `${guideMapPos.yPct}%`,
                }}
                className="absolute -translate-x-[175%] -translate-y-[82%] pointer-events-none transition-transform"
              >
                <LaliGirlAvatar mouthOpen={mouthOpen} pointing="right" size={64} />
              </div>
            </div>

            {/* Bottom-Right Map Shortcut for 2D Pixel Valley, 3D Lab, SAR Workbench & Global Gathering */}
            <div className="flex flex-wrap items-center justify-end gap-2 z-10">
              {onOpenWorkbench && (
                <button
                  type="button"
                  data-testid="enter-sar-workbench-btn"
                  onClick={() => {
                    retroAudio.playUiClick(760);
                    onOpenWorkbench('rasuwa_nepal');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-lg cursor-pointer"
                >
                  📊 Open SAR Workbench
                </button>
              )}
              {onOpenStoryMode && (
                <button
                  type="button"
                  data-testid="enter-scrolly-story-btn"
                  onClick={() => {
                    retroAudio.playUiClick(720);
                    onOpenStoryMode();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-300/95 hover:bg-amber-200 text-slate-950 font-bold text-xs shadow-lg cursor-pointer"
                >
                  🎵 8-Beat Story &amp; Sonata
                </button>
              )}
              <button
                type="button"
                data-testid="enter-2d-pixel-map-btn"
                onClick={() => {
                  retroAudio.playUiClick(740);
                  onStartGame('syabrubesi', 'rasuwa_nepal', { voiceOn, bgmOn });
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg cursor-pointer"
              >
                🚶 Walk 2D Pixel Valley
              </button>
              <button
                type="button"
                data-testid="enter-3d-lab-btn"
                onClick={() => {
                  retroAudio.playWarpTo3D();
                  if (onOpen3DLab) onOpen3DLab();
                  else onStartGame('inside_lab', 'rasuwa_nepal', { voiceOn, bgmOn });
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg cursor-pointer"
              >
                ⛰️ Enter 3D Lab
              </button>
              <button
                type="button"
                data-testid="hub-card-finale"
                onClick={() => {
                  retroAudio.playBadgeUnlock();
                  setCurrentScene('FinalScene');
                  setFinaleDialogIdx(0);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs shadow-lg cursor-pointer ${
                  solvedChapters.filter((id) => Number(id.split('-')[1]) <= 5).length >= 5
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    : 'bg-slate-900/90 hover:bg-slate-800 border border-stone-500 text-stone-200'
                }`}
              >
                🌟 Global Gathering
              </button>
            </div>
          </div>
        )}

        {/* 3. CHAPTER SCENE: One Full-Screen Visual per Beat (Either Full-Screen Pixel Scene OR Full-Screen NASA/Field Proof Photo & Wipe) */}
        {activeChapter && (
          <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col min-h-0">
            {chapterMode === 'story' ? (
              <div className="w-full flex-1 flex flex-col justify-between gap-3 py-1">
                {/* Slim Semi-Transparent Top Story Banner */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border border-white/30 bg-slate-950/20 backdrop-blur-sm [text-shadow:0_1px_6px_rgba(0,0,0,0.98),0_0_10px_rgba(0,0,0,0.85)]">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-amber-200">
                      {activeChapter.causeTitle}
                    </h2>
                    <div className="text-[11px] text-sky-200">
                      {currentChapterDialogue?.proofSource ?? activeChapter.provenanceSource} · Story {chapterDialogIdx + 1}/{activeChapter.storyDialogues.length}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 [text-shadow:none]">
                    <button
                      type="button"
                      data-testid="launch-chapter-minigame-btn"
                      onClick={() => {
                        retroAudio.playUiClick(700);
                        setChapterMode('minigame');
                      }}
                      className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg"
                    >
                      ▶ Start Mission →
                    </button>
                  </div>
                </div>

                {/* Single Full-Screen Evidence Overlay Controls (Transparent glass so full image remains vividly visible!) */}
                {isEvidenceFullImageBeat && currentChapterDialogue && (
                  <div className="mt-auto flex flex-col gap-2">
                    <div className="self-start max-w-xl px-3 py-2 rounded-xl border border-white/30 bg-slate-950/22 backdrop-blur-sm [text-shadow:0_1px_6px_rgba(0,0,0,0.98),0_0_10px_rgba(0,0,0,0.85)]">
                      <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                        📸 {currentChapterDialogue.proofTitle ?? activeChapter.photoBeforeLabel}
                      </div>
                      <div className="text-xs text-emerald-100 mt-0.5">
                        <strong>Key Proof:</strong> {activeChapter.scientificTakeaway}
                      </div>
                    </div>

                    {currentChapterDialogue.showDisplay === 'slider' && (
                      <div className="w-full px-3 py-2 rounded-xl border border-amber-300/55 bg-slate-950/24 backdrop-blur-sm flex flex-wrap items-center gap-3 [text-shadow:0_1px_5px_rgba(0,0,0,0.98)]">
                        <span className="text-[11px] font-mono text-emerald-200 shrink-0">
                          ◀ {activeChapter.radarMetricBefore}
                        </span>
                        <input
                          type="range"
                          min={5}
                          max={95}
                          value={chapterWipe}
                          onChange={(e) => setChapterWipe(Number(e.target.value))}
                          aria-label="Compare Before and After Full-Screen Proof Images"
                          className="flex-1 min-w-[160px] accent-amber-400 cursor-pointer"
                        />
                        <span className="text-[11px] font-mono text-amber-200 shrink-0">
                          {activeChapter.radarMetricAfter} ({chapterWipe}%) ▶
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* REAL INTERACTIVE PLAYABLE MISSION — FULL-SCREEN VIEWPORT, SEMI-TRANSPARENT HEADER */
              <div className="flex-1 min-h-0 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-950/18 backdrop-blur-sm border border-white/25 [text-shadow:0_1px_5px_rgba(0,0,0,0.98)]">
                  <span className="text-xs sm:text-sm font-bold text-emerald-300">
                    {activeChapter.miniGameTitle}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 [text-shadow:none]">
                    <button
                      type="button"
                      onClick={() => setChapterMode('story')}
                      className="px-2.5 py-1 rounded-lg border border-stone-600 bg-slate-900 hover:bg-slate-800 text-stone-200 text-xs cursor-pointer"
                    >
                      📷 Photos
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onStartGame('syabrubesi', activeChapter.regionId, { voiceOn, bgmOn })
                      }
                      className="px-2.5 py-1 rounded-lg border border-emerald-500/60 bg-emerald-950/85 hover:bg-emerald-900 text-emerald-200 text-xs cursor-pointer"
                    >
                      🚶 Interactive 2D Valley
                    </button>
                    {activeChapter.id === 'chapter-5' && (
                      <button
                        type="button"
                        data-testid="open-3d-lab-from-ch5"
                        onClick={() => {
                          retroAudio.playWarpTo3D();
                          if (onOpen3DLab) onOpen3DLab();
                          else onStartGame('inside_lab', 'rasuwa_nepal', { voiceOn, bgmOn });
                        }}
                        className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        ⛰️ Open 3D Lab View
                      </button>
                    )}
                    {!solvedChapters.includes(activeChapter.id) && (
                      <button
                        type="button"
                        data-testid="chapter-advance-btn"
                        onClick={() => {
                          retroAudio.playUiClick(700);
                          handleMissionSolved(activeChapter.id);
                          const nextIdx = activeChapter.number;
                          if (activeChapter.number === 5) {
                            setCurrentScene('FinalScene');
                            setFinaleDialogIdx(0);
                          } else if (nextIdx < RASUWA_STORY_CHAPTERS.length) {
                            openChapterDirect(RASUWA_STORY_CHAPTERS[nextIdx].id);
                          } else {
                            setCurrentScene('FinalScene');
                            setFinaleDialogIdx(0);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg border border-amber-400/60 bg-slate-900 hover:bg-slate-800 text-amber-200 text-xs font-semibold cursor-pointer"
                      >
                        Skip ⏭️
                      </button>
                    )}
                    {solvedChapters.includes(activeChapter.id) && (
                      <>
                        {activeChapter.number === 5 && (
                          <button
                            type="button"
                            data-testid="explore-bonus-global-btn"
                            onClick={() => {
                              retroAudio.playUiClick(720);
                              setMapAct(2);
                              setCurrentScene('exploreScene');
                            }}
                            className="px-2.5 py-1 rounded-lg border border-sky-400 bg-sky-950/90 hover:bg-sky-900 text-sky-200 font-bold text-xs cursor-pointer"
                          >
                            🌍 4 Bonus World Missions
                          </button>
                        )}
                        <button
                          type="button"
                          data-testid="next-chapter-btn"
                          onClick={() => {
                            retroAudio.playUiClick();
                            const nextIdx = activeChapter.number;
                            // Core Rasuwa story completes cleanly after Chapter 5!
                            if (activeChapter.number === 5) {
                              setCurrentScene('FinalScene');
                              setFinaleDialogIdx(0);
                            } else if (nextIdx < RASUWA_STORY_CHAPTERS.length) {
                              openChapterDirect(RASUWA_STORY_CHAPTERS[nextIdx].id);
                            } else {
                              setCurrentScene('FinalScene');
                              setFinaleDialogIdx(0);
                            }
                          }}
                          className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          {activeChapter.number === 5
                            ? '🌟 Finish Rasuwa Story →'
                            : activeChapter.number < RASUWA_STORY_CHAPTERS.length
                              ? 'Next Stop →'
                              : '🌟 Finale Council →'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {activeChapter.id === 'chapter-1' && (
                  <DielectricFloodMapperPlayable
                    key={`ch1-${playSessionKey}`}
                    solved={solvedChapters.includes('chapter-1')}
                    onSolve={() => handleMissionSolved('chapter-1')}
                  />
                )}

                {activeChapter.id === 'chapter-2' && (
                  <CreepHydroPlayable
                    key={`ch2-${playSessionKey}`}
                    solved={solvedChapters.includes('chapter-2')}
                    onSolve={() => handleMissionSolved('chapter-2')}
                  />
                )}

                {activeChapter.id === 'chapter-3' && (
                  <BreachRunPlayable
                    key={`ch3-${playSessionKey}`}
                    solved={solvedChapters.includes('chapter-3')}
                    onSolve={() => handleMissionSolved('chapter-3')}
                  />
                )}

                {activeChapter.id === 'chapter-4' && (
                  <AvalancheSweepPlayable
                    key={`ch4-${playSessionKey}`}
                    solved={solvedChapters.includes('chapter-4')}
                    onSolve={() => handleMissionSolved('chapter-4')}
                  />
                )}

                {activeChapter.id === 'chapter-6' && (
                  <AgriSubsidencePlayable
                    key={`ch6-${playSessionKey}`}
                    solved={solvedChapters.includes('chapter-6')}
                    onSolve={() => handleMissionSolved('chapter-6')}
                  />
                )}

                {activeChapter.id === 'chapter-7' && (
                  <ForestCanopyPlayable
                    key={`ch7-${playSessionKey}`}
                    solved={solvedChapters.includes('chapter-7')}
                    onSolve={() => handleMissionSolved('chapter-7')}
                  />
                )}

                {activeChapter.id === 'chapter-8' && (
                  <QuakeTriagePlayable
                    key={`ch8-${playSessionKey}`}
                    solved={solvedChapters.includes('chapter-8')}
                    onSolve={() => handleMissionSolved('chapter-8')}
                  />
                )}

                {activeChapter.id === 'chapter-9' && (
                  <OceanIcePlayable
                    key={`ch9-${playSessionKey}`}
                    solved={solvedChapters.includes('chapter-9')}
                    onSolve={() => handleMissionSolved('chapter-9')}
                  />
                )}

                {/* CHAPTER 5: HONEST SCREENING & VILLAGE PREPAREDNESS */}
                {activeChapter.id === 'chapter-5' && (
                  <div className="flex flex-col gap-2 text-xs [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                    <div className="px-3 py-2 rounded-lg bg-slate-950/25 backdrop-blur-sm border border-amber-400/50 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-stone-100 leading-snug">
                        <strong className="text-amber-300">What You Are Doing:</strong> Several mountain slopes moved a few meters, but only one actually collapsed! Click 3 slopes on the left to check them, then click the green Regional Screening plan on the right!
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-6 p-2.5 rounded-lg border border-white/25 bg-slate-950/25 backdrop-blur-sm">
                        <div className="font-semibold text-sky-300 mb-2">
                          Step 1: Click Any 3 Valley Slopes ({ch5InspectedSlopes.length}/3 Checked · Zenodo 22730419)
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {[
                            { id: 1, name: 'Slope A (5.1 m)', outcome: 'Failed' },
                            { id: 2, name: 'Slope B (4.4 m)', outcome: 'Stayed Safe' },
                            { id: 3, name: 'Slope C (3.8 m)', outcome: 'Stayed Safe' },
                            { id: 4, name: 'Slope D (4.7 m)', outcome: 'Stayed Safe' },
                            { id: 5, name: 'Slope E (3.2 m)', outcome: 'Stayed Safe' },
                            { id: 6, name: 'Slope F (4.1 m)', outcome: 'Stayed Safe' },
                          ].map((sl) => {
                            const inspected = ch5InspectedSlopes.includes(sl.id);
                            return (
                              <button
                                key={sl.id}
                                type="button"
                                data-testid={`ch5-slope-${sl.id}`}
                                onClick={() => {
                                  retroAudio.playUiClick(680);
                                  setCh5InspectedSlopes((prev) =>
                                    prev.includes(sl.id) ? prev : [...prev, sl.id]
                                  );
                                }}
                                className={`p-2 rounded border text-left cursor-pointer ${
                                  inspected
                                    ? sl.id === 1
                                      ? 'border-amber-400 bg-amber-950/65 text-amber-100'
                                      : 'border-emerald-400 bg-emerald-950/65 text-emerald-100'
                                    : 'border-white/30 bg-slate-950/30 text-stone-100 hover:bg-slate-900/50'
                                }`}
                              >
                                <div className="font-bold text-[11px]">{sl.name}</div>
                                {inspected && (
                                  <div className="text-[10px] font-semibold mt-0.5">
                                    → {sl.outcome}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="md:col-span-6 p-2.5 rounded-lg border border-white/25 bg-slate-950/25 backdrop-blur-sm flex flex-col gap-2">
                        <div className="font-semibold text-amber-300">
                          Step 2: Pick the Smart Village Safety Plan
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            retroAudio.playUiClick(300);
                            setCh5SelectedVerdict('false_siren');
                          }}
                          className={`p-2 rounded border text-left cursor-pointer ${
                            ch5SelectedVerdict === 'false_siren'
                              ? 'border-rose-400 bg-rose-950/65 text-rose-100'
                              : 'border-white/25 bg-slate-950/30 text-stone-100 hover:bg-slate-900/45'
                          }`}
                        >
                          ❌ Ring false alarms on every moving hill without checking rain gauges.
                        </button>
                        <button
                          type="button"
                          data-testid="ch5-verdict-correct"
                          onClick={() => {
                            retroAudio.playBadgeUnlock();
                            setCh5SelectedVerdict('regional_screening');
                          }}
                          className={`p-2 rounded border text-left cursor-pointer ${
                            ch5SelectedVerdict === 'regional_screening'
                              ? 'border-emerald-400 bg-emerald-950/65 text-emerald-100 font-semibold'
                              : 'border-emerald-400/70 bg-slate-950/30 text-emerald-200 hover:bg-emerald-950/45 ring-1 ring-emerald-400/50'
                          }`}
                        >
                          ✅ Use radar for regional screening + local rain gauges &amp; drills. ✨
                        </button>
                        {onOpenResources && (
                          <button
                            type="button"
                            onClick={onOpenResources}
                            className="mt-1 px-2.5 py-1.5 rounded border border-sky-400/60 bg-slate-950/30 hover:bg-slate-900/50 text-sky-200 text-[11px] font-semibold cursor-pointer text-left"
                          >
                            📚 Open NASA Earthdata &amp; ASF SAR Tools
                          </button>
                        )}
                        <div className="pt-1 border-t border-white/15 grid grid-cols-2 gap-1.5 text-[10px] text-stone-200">
                          <div className="p-1.5 rounded bg-slate-950/25 border border-white/15">
                            <strong className="text-sky-300">Floods &amp; Wetlands:</strong> NISAR Soil Moisture &amp; Water Finder
                          </div>
                          <div className="p-1.5 rounded bg-slate-950/25 border border-white/15">
                            <strong className="text-emerald-300">Forests &amp; Wildfires:</strong> 24 cm L-Band Sees Under Leaves
                          </div>
                          <div className="p-1.5 rounded bg-slate-950/25 border border-white/15">
                            <strong className="text-amber-300">Quakes &amp; Subsidence:</strong> Centimeter Ground Shift Maps
                          </div>
                          <div className="p-1.5 rounded bg-slate-950/25 border border-white/15">
                            <strong className="text-indigo-300">Glaciers &amp; Ice:</strong> All-Weather Ice &amp; Oil Watch
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. FINAL COMMUNITY GATHERING */}
        {currentScene === 'FinalScene' && (
          <div className="w-full max-w-3xl mx-auto p-5 rounded-xl border border-amber-400/80 bg-slate-950/35 backdrop-blur-md text-center shadow-2xl [text-shadow:0_1px_5px_rgba(0,0,0,0.98)]">
            <h2 className="text-xl sm:text-2xl font-bold text-amber-200">
              Echoes of Rasuwa: Village &amp; Global Gathering
            </h2>
            <p className="mt-2 text-sm text-stone-200">
              Thank you for helping Lali protect Rasuwa Valley with NASA &amp; ISRO space radar! You can also explore the Interactive 2D Pixel Valley, the 3D Supercomputer Lab, or the 4 Bonus World Missions anytime!
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {FINALE_CONVERSATION.map((member, idx) => (
                <button
                  key={member.speaker}
                  type="button"
                  onClick={() => {
                    retroAudio.playUiClick();
                    setFinaleDialogIdx(idx);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                    finaleDialogIdx === idx
                      ? 'border-amber-300 bg-amber-400 text-slate-950 font-bold'
                      : 'border-stone-600 bg-slate-900 text-stone-200 hover:bg-slate-800'
                  }`}
                >
                  {member.country}
                </button>
              ))}
            </div>
            <div className="mt-4 text-left">
              <BilingualAlertPreview
                regionName="Syabrubesi, Rasuwa"
                displacementMm={18}
                wetnessPct={78}
                compact
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                data-testid="play-again-btn"
                onClick={handleRestartStory}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
              >
                PLAY AGAIN (RESTART STORY)
              </button>
              <button
                type="button"
                onClick={() => {
                  retroAudio.playUiClick(740);
                  onStartGame('syabrubesi', 'rasuwa_nepal', { voiceOn, bgmOn });
                }}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                🚶 Walk 2D Pixel Valley
              </button>
              <button
                type="button"
                onClick={() => {
                  retroAudio.playWarpTo3D();
                  if (onOpen3DLab) onOpen3DLab();
                  else onStartGame('inside_lab', 'rasuwa_nepal');
                }}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                ⛰️ Open 3D Laboratory
              </button>
              {onOpenWorkbench && (
                <button
                  type="button"
                  data-testid="finale-workbench-btn"
                  onClick={() => {
                    retroAudio.playUiClick(760);
                    onOpenWorkbench('rasuwa_nepal');
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs cursor-pointer"
                >
                  📊 Open Quantitative SAR Workbench
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  retroAudio.playUiClick(700);
                  setRealDatumOpen(true);
                }}
                className="px-4 py-2 rounded-lg border border-emerald-400/80 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-100 font-bold text-xs cursor-pointer"
              >
                🛰️ Inspect Real 26 Aug NASA GeoTIFFs &amp; GIS
              </button>
              <button
                type="button"
                onClick={() => {
                  retroAudio.playUiClick(700);
                  setMapAct(2);
                  setCurrentScene('exploreScene');
                }}
                className="px-4 py-2 rounded-lg border border-sky-400 bg-slate-900 hover:bg-slate-800 text-sky-200 font-bold text-xs cursor-pointer"
              >
                🌍 Play 4 Bonus World Missions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM DIALOGUE BAR: Translucent Open Overlay on Map/Story/Finale, Hidden during active Minigame */}
      {currentScene !== 'scene-intro' && !(activeChapter && chapterMode === 'minigame') && (
        <div className="relative z-20 px-4 pb-4 flex justify-center">
          <div
            role="button"
            tabIndex={0}
            data-testid="story-dialog-box"
            onClick={handleAdvanceDialogue}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAdvanceDialogue();
              }
            }}
            className="w-full max-w-4xl px-4 py-3 rounded-xl border border-amber-300/70 bg-slate-950/20 backdrop-blur-sm hover:border-amber-300 transition cursor-pointer shadow-xl flex items-center gap-3.5 [text-shadow:0_1px_6px_rgba(0,0,0,0.98),0_0_12px_rgba(0,0,0,0.85)]"
          >
            <div className="shrink-0">
              <LaliGirlAvatar mouthOpen={mouthOpen} size={64} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  {activeChapter && chapterMode === 'story'
                    ? activeChapter.storyDialogues[chapterDialogIdx]?.speaker ?? 'LALI MAYA'
                    : currentScene === 'FinalScene'
                      ? FINALE_CONVERSATION[finaleDialogIdx]?.speaker ?? 'LALI MAYA'
                      : 'LALI MAYA'}
                </span>
                <span className="text-[11px] text-amber-200 font-semibold">
                  {currentScene === 'exploreScene'
                    ? 'Tap a stop or Walk 2D Pixel Valley'
                    : activeChapter && chapterMode === 'story'
                      ? chapterDialogIdx < activeChapter.storyDialogues.length - 1
                        ? 'Click to Continue →'
                        : 'Click to Start Mission ▶'
                      : ''}
                </span>
              </div>
              <p className="text-sm text-white leading-snug mt-0.5">{typedText}</p>
            </div>
          </div>
        </div>
      )}

      {/* TINY FLOATING LALI COMPANION BADGE DURING PLAYABLE MISSIONS */}
      {activeChapter && chapterMode === 'minigame' && (
        <div className="relative z-20 px-4 pb-2 flex items-center justify-start pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/18 backdrop-blur-sm border border-amber-300/55 shadow-lg [text-shadow:0_1px_5px_rgba(0,0,0,0.98)]">
            <LaliGirlAvatar mouthOpen={mouthOpen} size={30} />
            <span className="text-xs text-amber-100 font-medium">
              {solvedChapters.includes(activeChapter.id)
                ? activeChapter.victoryMessage
                : activeChapter.storyDialogues[activeChapter.storyDialogues.length - 1]?.text}
            </span>
          </div>
        </div>
      )}

      {/* REAL 26 AUG 2026 RASUWA NASA DATUM EXPLORER MODAL */}
      {realDatumOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Real 26 Aug 2026 Rasuwa NASA GeoTIFF and GIS Data Explorer"
          data-testid="story-real-datum-modal"
          className="fixed inset-0 z-[990] bg-slate-950/90 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex items-start justify-center"
        >
          <div className="w-full max-w-5xl space-y-3">
            <div className="flex items-center justify-between gap-2 bg-slate-900 border border-emerald-400/50 rounded-lg px-4 py-2.5">
              <div className="text-xs sm:text-sm font-mono font-bold text-emerald-200">
                🛰️ Real NASA · ASF NISAR · OPERA RTC-S1 · Sentinel-1D · GPM IMERG · Copernicus Explorer
              </div>
              <button
                type="button"
                data-testid="story-real-datum-close-btn"
                onClick={() => {
                  retroAudio.playUiClick();
                  setRealDatumOpen(false);
                }}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-500 text-slate-100 text-xs font-mono font-bold cursor-pointer"
              >
                ✕ Close (Esc)
              </button>
            </div>
            <RasuwaDatumExplorer />
          </div>
        </div>
      )}

      {/* FULL-SCREEN SINGLE-IMAGE EVIDENCE PROOF STORIES MODAL (12+ NASA & Himalayan Cases) */}
      {proofArchiveOpen && (() => {
        const story = EVIDENCE_PROOF_STORIES[proofArchiveIdx] ?? EVIDENCE_PROOF_STORIES[0];
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="NASA and Himalayan Evidence Proof Stories"
            data-testid="proof-archive-modal"
            className="fixed inset-0 z-[980] bg-slate-950 flex flex-col justify-between overflow-hidden"
          >
            {/* Single Full-Screen Proof Image / Before-After Wipe */}
            <div className="absolute inset-0 w-full h-full pointer-events-none select-none">
              <img
                src={story.imageUrl}
                alt={story.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {story.beforeUrl && (
                <>
                  <img
                    src={story.beforeUrl}
                    alt={`${story.title} — Before Comparison`}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ clipPath: `inset(0 ${100 - proofModalWipe}% 0 0)` }}
                  />
                  <div
                    className="absolute inset-y-0 w-0.5 bg-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.95)]"
                    style={{ left: `${proofModalWipe}%` }}
                  />
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
            </div>

            {/* Semi-Transparent Top Modal Header */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-950/20 backdrop-blur-sm border-b border-white/20 [text-shadow:0_1px_5px_rgba(0,0,0,0.98)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-sky-500 text-slate-950 font-bold text-xs [text-shadow:none]">
                  Proof Story {proofArchiveIdx + 1}/{EVIDENCE_PROOF_STORIES.length}
                </span>
                <span className="text-xs font-semibold text-amber-200">{story.location}</span>
                <span className="px-2 py-0.5 rounded bg-slate-950/30 border border-sky-400/50 text-[11px] font-mono text-sky-200">
                  {story.sensorTag}
                </span>
              </div>
              <button
                type="button"
                data-testid="proof-archive-close-btn"
                onClick={() => {
                  retroAudio.playUiClick();
                  setProofArchiveOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-950/35 hover:bg-slate-900/55 border border-white/40 text-amber-100 font-bold text-xs cursor-pointer"
              >
                ✕ Close Proof Archive
              </button>
            </div>

            {/* Bottom Floating Evidence Card + Wipe Scrubber + Prev/Next */}
            <div className="relative z-10 w-full max-w-5xl mx-auto px-4 pb-4 flex flex-col gap-2">
              {story.beforeUrl && (
                <div className="w-full px-3 py-2 rounded-xl border border-amber-300/60 bg-slate-950/22 backdrop-blur-sm flex flex-wrap items-center gap-3 [text-shadow:0_1px_5px_rgba(0,0,0,0.98)]">
                  <span className="text-[11px] font-mono text-emerald-200 shrink-0">
                    ◀ Before / Baseline ({proofModalWipe}%)
                  </span>
                  <input
                    type="range"
                    min={5}
                    max={95}
                    value={proofModalWipe}
                    onChange={(e) => setProofModalWipe(Number(e.target.value))}
                    aria-label="Compare Before and After Evidence Proof Image"
                    className="flex-1 min-w-[160px] accent-amber-400 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-amber-200 shrink-0">
                    After / Radar Event ▶
                  </span>
                </div>
              )}

              <div className="p-4 rounded-xl border border-amber-300/55 bg-slate-950/22 backdrop-blur-md shadow-2xl [text-shadow:0_1px_6px_rgba(0,0,0,0.98),0_0_12px_rgba(0,0,0,0.88)]">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-xl font-bold text-amber-200 leading-snug">
                      {story.title}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-stone-100 leading-relaxed">
                      {story.storyText}
                    </p>
                    <p className="mt-1.5 text-xs text-emerald-200 font-medium">
                      <strong>Radar Proof:</strong> {story.radarProof}
                    </p>
                    <div className="mt-1 text-[11px] text-sky-300/95">
                      {story.provenanceNote}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 [text-shadow:none]">
                    <button
                      type="button"
                      data-testid="proof-archive-prev-btn"
                      onClick={() => {
                        retroAudio.playUiClick(620);
                        setProofModalWipe(52);
                        setProofArchiveIdx(
                          (i) => (i - 1 + EVIDENCE_PROOF_STORIES.length) % EVIDENCE_PROOF_STORIES.length
                        );
                      }}
                      className="px-3.5 py-2 rounded-lg bg-slate-950/35 hover:bg-slate-900/55 border border-white/40 text-stone-100 font-semibold text-xs cursor-pointer"
                    >
                      ← Prev Proof
                    </button>
                    <button
                      type="button"
                      data-testid="proof-archive-next-btn"
                      onClick={() => {
                        retroAudio.playUiClick(740);
                        setProofModalWipe(52);
                        setProofArchiveIdx((i) => (i + 1) % EVIDENCE_PROOF_STORIES.length);
                      }}
                      className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      Next Proof →
                    </button>
                  </div>
                </div>

                {/* Compact Story Number Jump Strip */}
                <div className="mt-3 pt-2 border-t border-white/20 flex flex-wrap items-center gap-1.5 [text-shadow:none]">
                  {EVIDENCE_PROOF_STORIES.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        retroAudio.playUiClick(660);
                        setProofModalWipe(52);
                        setProofArchiveIdx(idx);
                      }}
                      title={item.title}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        idx === proofArchiveIdx
                          ? 'bg-sky-400 text-slate-950'
                          : 'bg-slate-950/35 hover:bg-slate-900/55 border border-white/25 text-stone-200'
                      }`}
                    >
                      #{idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
