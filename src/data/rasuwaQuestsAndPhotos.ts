export interface IncidentPhotoRecord {
  id: string;
  stationId: string;
  locationLabel: string;
  nepaliLabel: string;
  dateBadge: string;
  coords: string;
  imageUrl: string;
  title: string;
  description: string;
  nisarCorrelation: string;
  credit: string;
  isDisasterCapture?: boolean;
}

export interface RasuwaQuest {
  id: string;
  number: number;
  title: string;
  nepaliTitle: string;
  giverNpcId: string;
  giverName: string;
  targetStationId: string;
  targetLocationName: string;
  summary: string;
  objectiveHint: string;
  rewardKnowledge: string;
}

export const REAL_INCIDENT_PHOTOS: IncidentPhotoRecord[] = [
  {
    id: 'photo_mudslide_border_live',
    stationId: 'miteri_bridge',
    locationLabel: 'Miteri Bridge & Rasuwagadhi–Gyirong Gorge',
    nepaliLabel: 'मितेरी पुल / रसुवागढी भन्सार नाका',
    dateBadge: "ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED",
    coords: "Exact image location, scale and elevation not verified",
    imageUrl: '/incident_photos/gyirong_rasuwagadhi_mudslide_2025.png',
    title: 'Wall of Rock-Ice Mud Engulfing the Rasuwagadhi–Gyirong Border Crossing',
    description:
      "Unverified local asset retained for review, not evidence of a particular event, place or acquisition date. Confirm original source, author and reuse permission before public presentation.",
    nisarCorrelation:
      "Illustrative prompt: compare surface patterns with radar and independent evidence. No co-registered NISAR analysis or field validation is performed.",
    credit: "Supplied credit, unverified: Border Port Surveillance Capture / Wikimedia Commons (Public Domain); exact source, date, author and permissions require confirmation.",
    isDisasterCapture: true
  },
  {
    id: 'photo_landsat_after_2026',
    stationId: 'purugu_glacier',
    locationLabel: 'Purugu Glacier -> Lhende -> Bhote Koshi Corridor',
    nepaliLabel: 'पुरुगु हिमनदी र ल्हेन्दे–भोटेकोशी बाढी मार्ग',
    dateBadge: "ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED",
    coords: "Exact image location, scale and elevation not verified",
    imageUrl: '/incident_photos/landsat_rasuwa_flood_2026_08_26.png',
    title: "Illustrative surface-change investigation",
    description:
      "Unverified local asset retained for review, not evidence of a particular event, place or acquisition date. Confirm original source, author and reuse permission before public presentation.",
    nisarCorrelation:
      "Illustrative prompt: compare surface patterns with radar and independent evidence. No co-registered NISAR analysis or field validation is performed.",
    credit: "Supplied credit, unverified: NASA / USGS Landsat-9 OLI-2 via Wikimedia Commons (Public Domain); exact source, date, author and permissions require confirmation.",
    isDisasterCapture: true
  },
  {
    id: 'photo_optical_before_2026',
    stationId: 'purugu_glacier',
    locationLabel: 'Upper Lhende & Purugu Basin (48h Pre-Disaster)',
    nepaliLabel: 'विपद् पूर्वको ल्हेन्दे र पुरुगु उपत्यका',
    dateBadge: "ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED",
    coords: "Exact image location, scale and elevation not verified",
    imageUrl: '/incident_photos/nepal_flood_2026_before_after.webp',
    title: "Illustrative surface-change investigation",
    description:
      "Unverified local asset retained for review, not evidence of a particular event, place or acquisition date. Confirm original source, author and reuse permission before public presentation.",
    nisarCorrelation:
      "Illustrative prompt: compare surface patterns with radar and independent evidence. No co-registered NISAR analysis or field validation is performed.",
    credit: "Supplied credit, unverified: Copernicus Sentinel-2 / ESA via Wikimedia Commons; exact source, date, author and permissions require confirmation.",
    isDisasterCapture: true
  },
  {
    id: 'photo_rasuwagadhi_fort',
    stationId: 'miteri_bridge',
    locationLabel: 'Historic 1855 Rasuwagadhi Stone Fort & Bridge Piers',
    nepaliLabel: 'ऐतिहासिक रसुवागढी किल्ला र मितेरी पुल क्षेत्र',
    dateBadge: "ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED",
    coords: "Exact image location, scale and elevation not verified",
    imageUrl: '/incident_photos/rasuwagadhi_fort.jpg',
    title: 'Dry-Stacked Stone Ramparts of Rasuwagadhi Fort Overlooking the Lhende Gorge',
    description:
      "Unverified local asset retained for review, not evidence of a particular event, place or acquisition date. Confirm original source, author and reuse permission before public presentation.",
    nisarCorrelation:
      "Illustrative prompt: compare surface patterns with radar and independent evidence. No co-registered NISAR analysis or field validation is performed.",
    credit: "Supplied credit, unverified: Wikimedia Commons (CC BY-SA 3.0); exact source, date, author and permissions require confirmation."
  },
  {
    id: 'photo_timure_customs',
    stationId: 'timure',
    locationLabel: 'Timure Customs Post & Border Highway',
    nepaliLabel: 'टिमुरे भन्सार कार्यालय, रसुवा',
    dateBadge: "ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED",
    coords: "Exact image location, scale and elevation not verified",
    imageUrl: '/incident_photos/timure_customs_office.jpg',
    title: 'Rasuwa Customs Post in Timure Beneath Sheer Himalayan Rock Walls',
    description:
      "Unverified local asset retained for review, not evidence of a particular event, place or acquisition date. Confirm original source, author and reuse permission before public presentation.",
    nisarCorrelation:
      "Illustrative prompt: compare surface patterns with radar and independent evidence. No co-registered NISAR analysis or field validation is performed.",
    credit: "Supplied credit, unverified: Wikimedia Commons (CC BY-SA 3.0); exact source, date, author and permissions require confirmation."
  },
  {
    id: 'photo_hydropower_dam',
    stationId: 'rasuwagadhi_hydro',
    locationLabel: 'Rasuwa Hydropower Headworks & Desanding Basin',
    nepaliLabel: 'रसुवा जलविद्युत आयोजना बाँध क्षेत्र',
    dateBadge: "ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED",
    coords: "Exact image location, scale and elevation not verified",
    imageUrl: '/incident_photos/chilime_hydropower_dam.jpg',
    title: 'Himalayan Run-of-River Hydropower Basin in the Rasuwa Corridor',
    description:
      "Unverified local asset retained for review, not evidence of a particular event, place or acquisition date. Confirm original source, author and reuse permission before public presentation.",
    nisarCorrelation:
      "Illustrative prompt: compare surface patterns with radar and independent evidence. No co-registered NISAR analysis or field validation is performed.",
    credit: "Supplied credit, unverified: Wikimedia Commons (CC BY-SA 3.0); exact source, date, author and permissions require confirmation."
  },
  {
    id: 'photo_chilime_houses',
    stationId: 'chilime',
    locationLabel: 'Chilime & Goljung Tamang Heritage Terraces',
    nepaliLabel: 'चिलिमे र गोल्जुङका परम्परागत तामाङ बस्ती',
    dateBadge: "ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED",
    coords: "Exact image location, scale and elevation not verified",
    imageUrl: '/incident_photos/chilime_village_houses.jpg',
    title: 'Authentic Dry-Stone & Carved-Timber Tamang Houses Above Terraced Fields',
    description:
      "Unverified local asset retained for review, not evidence of a particular event, place or acquisition date. Confirm original source, author and reuse permission before public presentation.",
    nisarCorrelation:
      "Illustrative prompt: compare surface patterns with radar and independent evidence. No co-registered NISAR analysis or field validation is performed.",
    credit: "Supplied credit, unverified: Wikimedia Commons (CC BY-SA 3.0); exact source, date, author and permissions require confirmation."
  },
  {
    id: 'photo_syabrubesi_dobhan',
    stationId: 'syabrubesi',
    locationLabel: 'Syabrubesi Confluence (Langtang Khola + Bhote Koshi)',
    nepaliLabel: 'स्याफ्रुबेसी दोभान (लाङटाङ खोला र भोटेकोशी संगम)',
    dateBadge: "ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED",
    coords: "Exact image location, scale and elevation not verified",
    imageUrl: '/incident_photos/syabrubesi_confluence.jpg',
    title: 'Syabrubesi Bazaar Perched Right Beside the Roaring Himalayan River Confluence',
    description:
      "Unverified local asset retained for review, not evidence of a particular event, place or acquisition date. Confirm original source, author and reuse permission before public presentation.",
    nisarCorrelation:
      "Illustrative prompt: compare surface patterns with radar and independent evidence. No co-registered NISAR analysis or field validation is performed.",
    credit: "Supplied credit, unverified: Wikimedia Commons (CC BY-SA 4.0); exact source, date, author and permissions require confirmation."
  },
  {
    id: 'photo_langtang_lirung',
    stationId: 'purugu_glacier',
    locationLabel: 'Langtang Lirung (7,227m) & Hanging Glaciers',
    nepaliLabel: 'लाङटाङ लिरुङ हिमाल र झुन्डिएका हिमनदीहरू',
    dateBadge: "ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED",
    coords: "Exact image location, scale and elevation not verified",
    imageUrl: '/incident_photos/langtang_lirung_glacier.jpg',
    title: 'Steep Hanging Ice & Permafrost Headwalls Above the Rasuwa–Langtang Basin',
    description:
      "Unverified local asset retained for review, not evidence of a particular event, place or acquisition date. Confirm original source, author and reuse permission before public presentation.",
    nisarCorrelation:
      "Illustrative prompt: compare surface patterns with radar and independent evidence. No co-registered NISAR analysis or field validation is performed.",
    credit: "Supplied credit, unverified: Wikimedia Commons (CC BY-SA 3.0); exact source, date, author and permissions require confirmation."
  },
  {
    id: 'photo_nisar_satellite',
    stationId: 'syabrubesi',
    locationLabel: 'NASA-ISRO NISAR Dual-Band Observatory',
    nepaliLabel: 'नासा–इसरो निसार (NISAR) भू-उपग्रह',
    dateBadge: "ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED",
    coords: "Exact image location, scale and elevation not verified",
    imageUrl: '/incident_photos/nisar_spacecraft_cleanroom.jpg',
    title: 'NASA L-Band & ISRO S-Band Radar Payloads Integrated on the NISAR Spacecraft',
    description:
      "Unverified local asset retained for review, not evidence of a particular event, place or acquisition date. Confirm original source, author and reuse permission before public presentation.",
    nisarCorrelation:
      "Illustrative prompt: compare surface patterns with radar and independent evidence. No co-registered NISAR analysis or field validation is performed.",
    credit: "Supplied credit, unverified: NASA / JPL-Caltech / ISRO (Public Domain); exact source, date, author and permissions require confirmation."
  },
  {
    id: 'photo_border_bridge_span',
    stationId: 'miteri_bridge',
    locationLabel: 'Miteri Friendship Bridge Span (Nepal–China Border)',
    nepaliLabel: 'नेपाल–चीन मितेरी पुल संरचना (१,८१४ मि.)',
    dateBadge: "ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED",
    coords: "Exact image location, scale and elevation not verified",
    imageUrl: '/incident_photos/nepal_china_border_bridge.jpg',
    title: 'Pre-Collapse Concrete & Steel Span at the Rasuwagadhi–Gyirong Gorge Crossing',
    description:
      "Unverified local asset retained for review, not evidence of a particular event, place or acquisition date. Confirm original source, author and reuse permission before public presentation.",
    nisarCorrelation:
      "Illustrative prompt: compare strong dihedral bridge returns against post-event channel decorrelation and request independent structural records.",
    credit: "Supplied credit, unverified: Wikimedia Commons; exact source, date, author and permissions require confirmation."
  },
  {
    id: 'photo_nisar_first_light',
    stationId: 'syabrubesi',
    locationLabel: 'NISAR L-Band First-Light Polarimetric Reference',
    nepaliLabel: 'निसार एल-ब्यान्ड (२४ से.मी.) पहिलो रडार छवि',
    dateBadge: "ILLUSTRATION • ASSET ORIGIN / DATE UNVERIFIED",
    coords: "Exact image location, scale and elevation not verified",
    imageUrl: '/incident_photos/nisar_first_radar_image.webp',
    title: 'Multi-Polarization L-Band SAR Backscatter Demonstration (HH / HV / VV)',
    description:
      "Unverified local asset retained for review, not evidence of a particular event, place or acquisition date. Confirm original source, author and reuse permission before public presentation.",
    nisarCorrelation:
      "Illustrative prompt: compare L-band canopy penetration and double-bounce scattering with ground truth before interpreting hazard.",
    credit: "Supplied credit, unverified: NASA / JPL-Caltech / ISRO; exact source, date, author and permissions require confirmation."
  }
];

export const RASUWA_QUESTS: RasuwaQuest[] = [
  {
    id: 'quest_miteri_scar',
    number: 1,
    title: 'Zone 4 & Cause 4: Miteri Bridge & High-Altitude Avalanche Plunge',
    nepaliTitle: 'मितेरी पुल र उच्च हिमाली चट्टान–हिमपहिरो (कारण ४)',
    giverNpcId: 'npc_rudra_lab',
    giverName: 'Pasang Tamang & Prof. Dr. Rudra ("Radar Bajey")',
    targetStationId: 'miteri_bridge',
    targetLocationName: 'Rasuwagadhi Fort & Miteri Friendship Bridge (1,814 m)',
    summary:
      "REPORTED / SIMULATION TRAIL (Stage 4): Investigate how the historic 1855 stone fort walls were battered and Miteri Bridge spans torn off their piers. Retrospective NISAR L-band 24-day offset tracking reported >5 m horizontal slope displacement before the 2 km vertical plunge.",
    objectiveHint: 'Trek North to Miteri Bridge (1,814 m), inspect Incident Photos & scan Beacon ST-05',
    rewardKnowledge:
      "CAUSE 4 UNCOVERED (Reported Context): High-altitude rock-ice detachment fell nearly 2 vertical km into the Lhende gorge. Always pair satellite offset maps with dated field records."
  },
  {
    id: 'quest_timure_witness',
    number: 2,
    title: 'Zone 3 & Cause 3: Timure Dry Port & Temporary Debris Dam Breach',
    nepaliTitle: 'टिमुरे सुख्खा बन्दरगाह र अस्थायी पहिरो बाँध विस्फोट (कारण ३)',
    giverNpcId: 'npc_sita_syabru',
    giverName: 'Pasang Tamang & Didi Sita (Rasuwa Relief)',
    targetStationId: 'timure',
    targetLocationName: 'Timure Bazaar & International Dry Port (1,760 m)',
    summary:
      "REPORTED / SIMULATION TRAIL (Stage 3): Investigate how Timure's trade hub was buried under 4–6 m of boulder debris. The mass plunge into the narrow Lhende Khola gorge formed a temporary natural dam that breached within ~7 minutes, releasing an explosive hydrostatic surge.",
    objectiveHint: 'Enter Timure Tamang Tea-House (1,760 m), talk to Aama Dolma & scan Beacon ST-03',
    rewardKnowledge:
      "CAUSE 3 UNCOVERED (Reported Context): Temporary gorge impoundment and rapid ~7-minute breach amplified peak surge depth across Timure Dry Port."
  },
  {
    id: 'quest_hydro_terrace',
    number: 3,
    title: 'Zone 1–2 & Causes 1–2: Monsoon Saturation & Pre-Collapse Bedrock Creep',
    nepaliTitle: 'मनसुनी माटो संतृप्ति र चिलिमे चट्टान विस्थापन (कारण १ र २)',
    giverNpcId: 'npc_maila_chilime',
    giverName: 'Kaka Maila & Pasang Tamang',
    targetStationId: 'rasuwagadhi_hydro',
    targetLocationName: 'Syabrubesi (1,460 m) -> Chilime & 111 MW Hydropower Intake (1,640 m)',
    summary:
      "MODEL OUTPUT / REPORTED TRAIL (Stages 1 & 2): Corroborate Cause 1 (Antecedent Monsoon Saturation via NASA POWER GWETTOP > 78%) and Cause 2 (Pre-Collapse Bedrock Creep: Sentinel-1 InSAR LOS phase analysis retrospectively revealed up to 40 cm displacement between Jul 7 and Aug 24).",
    objectiveHint: 'Scan Chilime Terrace Beacon ST-02 & Rasuwagadhi 111 MW Hydro Beacon ST-04',
    rewardKnowledge:
      "CAUSES 1 & 2 UNCOVERED: Persistent monsoon saturation (GWETTOP > 78%) and progressive Jul–Aug slope creep (up to 40 cm LOS) preceded the intake clogging."
  },
  {
    id: 'quest_purugu_crown',
    number: 4,
    title: 'High-Altitude Detachment Crown & Multi-Sensor Geometry Check',
    nepaliTitle: 'उच्च हिमाली उद्गमस्थल र बहु-सेन्सर ज्यामिति परीक्षण',
    giverNpcId: 'npc_dawa_glacier',
    giverName: 'Dawa Sherpa (High-Altitude Guide)',
    targetStationId: 'purugu_glacier',
    targetLocationName: 'Upper Detachment Crown (5,366 m East-Northeast)',
    summary:
      "SIMULATION / REPORTED TRAIL: Ascend the alpine switchbacks to compare L-band (24 cm, half-wavelength 12 cm) and C-band (5.6 cm, half-wavelength 2.8 cm) phase wrapping, layover, and shadow in steep Himalayan relief.",
    objectiveHint: 'Trek East-Northeast to the 5,366 m Detachment Crown & scan Beacon ST-06',
    rewardKnowledge:
      "CRYOSPHERE GEOMETRY VERIFIED: Steep relief causes layover and phase wrapping; combining ascending/descending tracks with ICESat-2 and ground benchmarks is essential."
  },
  {
    id: 'quest_arm_siren',
    number: 5,
    title: 'Zone 5: DHM Geomatics Kendra & The Regional Screening Verdict',
    nepaliTitle: 'निसार प्रयोगशाला • क्षेत्रीय स्क्रिनिङ बनाम स्वचालित साइरन निष्कर्ष',
    giverNpcId: 'npc_rudra_lab',
    giverName: 'Prof. Dr. Rudra ("Radar Bajey") & Pasang Tamang',
    targetStationId: 'syabrubesi',
    targetLocationName: 'Inside DHM–NISAR Himalayan Kendra (Syabrubesi 1,460 m)',
    summary:
      "CENTRAL SCIENTIFIC LESSON (Silwal & Dahal / Nature npj / Zenodo 22730419): Pre-failure motion was measurable in hindsight, but numerous non-failing candidate slopes across the upper basin showed identical multi-meter displacement. Satellite radar is a regional screening and triage tool to direct field teams—NOT a standalone automated warning siren.",
    objectiveHint: 'Boot Giant Lab Supercomputer [C] -> View 3D Terrain -> Complete Tab F5 Triage Checklist',
    rewardKnowledge:
      "SYNTHESIS COMPLETE: Because many moving slopes do not catastrophically fail, SAR is an indispensable regional screening & prioritization tool to guide field instrumentation, not an automated evacuation trigger."
  }
];
