export interface OfficialResourceItem {
  id: string;
  agency: 'NASA' | 'CSA (Canada)' | 'CONAE (Argentina)' | 'Pipeline & Tutorials';
  title: string;
  url: string;
  description: string;
  howUsedInApp: string;
}

export const OFFICIAL_CHALLENGE_RESOURCES: OfficialResourceItem[] = [
  {
    id: 'nasa_earthdata_search',
    agency: 'NASA',
    title: 'NASA Earthdata Search',
    url: 'https://search.earthdata.nasa.gov/search?q=NISAR',
    description:
      'Enables data discovery, search, comparison, visualization, and access across NASA’s Earth science data holdings including NISAR, OPERA, SMAP, GEDI, GRACE-FO, and ICESat-2.',
    howUsedInApp:
      'Deep-linked dynamically per Area of Interest (AOI) in the Analyst Workbench and queried programmatically via the NASA CMR API (cmr.earthdata.nasa.gov).',
  },
  {
    id: 'nasa_asf_vertex',
    agency: 'NASA',
    title: 'ASF Data Search Vertex',
    url: 'https://search.asf.alaska.edu/#/?dataset=NISAR',
    description:
      'The Alaska Satellite Facility (ASF) operates the NASA archive of SAR data and provides services to researchers supporting NASA’s ESDIS project.',
    howUsedInApp:
      'Queries real CMR NISAR browse imagery (_LATLON.png), WKT polygon deep links, and asf_search Python download snippets across our global expedition regions.',
  },
  {
    id: 'nisar_data_user_guide',
    agency: 'NASA',
    title: 'NISAR Data User Guide',
    url: 'https://nisar.jpl.nasa.gov/data/products/',
    description:
      'Official guide from ASF and JPL covering how to access and work with NISAR Level-1/2/3 HDF5 products (RSLC, GSLC, GCOV, GUNW, GOFF, SME2) and granule naming.',
    howUsedInApp:
      'Implemented in src/services/nisarCatalogService.ts (parseNisarGranuleId), src/components/DataPassport.tsx, and pipeline/ingest_nisar.py (/science/LSAR/GCOV/grids/frequencyA/*).',
  },
  {
    id: 'nasa_intro_remote_sensing',
    agency: 'NASA',
    title: 'Intro to Remote Sensing',
    url: 'https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/remote-sensing',
    description:
      'Learn the basics about remotely-sensed data, from instrument characteristics and active vs. passive sensors to spatial/spectral/temporal resolution and data analysis.',
    howUsedInApp:
      'Forms the optical vs. microwave foundation of Beat 1 in the Story Mode and Tab 1 (SAR 101) of the SAR Science Lab.',
  },
  {
    id: 'nasa_intro_sar',
    agency: 'NASA',
    title: 'Intro to Synthetic Aperture Radar (SAR)',
    url: 'https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/sar',
    description:
      'Learn the basics about SAR data, from frequency and wavelength (L, S, C, X bands) to polarization (HH, HV, VV, VH), dielectric permittivity, and scattering mechanisms.',
    howUsedInApp:
      'Powers the interactive backscatter physics lab (dielectric moisture, roughness vs wavelength, double-bounce, canopy HV, and specular reflection).',
  },
  {
    id: 'nasa_arset_sar_en_es',
    agency: 'NASA',
    title: 'NASA ARSET Trainings (English & Spanish)',
    url: 'https://appliedsciences.nasa.gov/what-we-do/capacity-building/arset',
    description:
      'Online beginner-to-advanced trainings covering disaster management, ecological forecasting, agriculture, public health, air quality, and water resources—including SAR & NISAR in English and Spanish.',
    howUsedInApp:
      'Guides log-ratio dB differencing, stable-ROI threshold calibration, and bilingual Spanish (ES) accessibility support across the app.',
  },
  {
    id: 'nisar_storymaps_5_themes',
    agency: 'NASA',
    title: 'NISAR StoryMaps (Floods, Wildfires, Subsidence, Oil Slicks, Glacial Motion)',
    url: 'https://nisar.jpl.nasa.gov/science/overview/',
    description:
      'Interactive NASA StoryMaps demonstrating SAR applications across floods, wildfires, land subsidence, marine oil slicks, and glacial motion.',
    howUsedInApp:
      'Mapped across our 9-chapter story adventure and 5 expedition biomes (Rasuwa floods/landslides, San Joaquin farms/wells, Pantanal forests/fires, Hatay faults, Alaska oil slicks & glaciers).',
  },
  {
    id: 'nisar_white_papers',
    agency: 'NASA',
    title: 'NISAR Applications White Papers',
    url: 'https://nisar.jpl.nasa.gov/science/applications/',
    description:
      'Concise 2-page overviews of NISAR applications providing societal benefit across disaster response, water security, infrastructure, ecosystems, and permafrost.',
    howUsedInApp:
      'Synthesized in Tab 5 ("Future of NISAR & White Papers") of the SAR Science Lab and docs/submission/FUTURE_NISAR_APPLICATIONS.md.',
  },
  {
    id: 'uavsar_postcards',
    agency: 'NASA',
    title: 'UAVSAR Postcards & Mount Rainier L-Band Through-Cloud Illustration',
    url: 'https://uavsar.jpl.nasa.gov/',
    description:
      'False-color polarimetric composites of airborne L-band UAVSAR data depicting Earth processes, alongside the Mount Rainier (Nov. 10, 2025) L-band SAR through-cloud showcase.',
    howUsedInApp:
      'Integrated in the Polarization Explorer, Sensor Rosetta, and Real Resources Showcase inside the Field Supercomputer.',
  },
  {
    id: 'csa_rcm',
    agency: 'CSA (Canada)',
    title: 'CSA RADARSAT Constellation Mission (RCM) - Data',
    url: 'https://www.asc-csa.gc.ca/eng/satellites/radarsat/',
    description:
      'Canada’s trio of C-band (5.6 cm) SAR satellites imaging day/night in all weather for maritime surveillance (ice, wind, oil pollution, ships), disaster management, and ecosystem monitoring (agriculture, wetlands, forestry, coastal change).',
    howUsedInApp:
      'Paired with NISAR L-band in Chapter 9 (Oil Slicks & Arctic Coast) and Sensor Rosetta (CSA_RCM_C, 4-day repeat & compact-pol).',
  },
  {
    id: 'csa_sar_python_qgis',
    agency: 'CSA (Canada)',
    title: 'CSA Synthetic Aperture Radar Python & QGIS Tutorial',
    url: 'https://www.asc-csa.gc.ca/eng/satellites/radarsat/technical-features/sar-tutorial.asp',
    description:
      'Demonstrates practical workflows to access, calibrate, speckle-filter, and visualize SAR imagery using Python and QGIS.',
    howUsedInApp:
      'Paired with pipeline/ingest_nisar.py and the copy-ready Python + QGIS workflow snippet inside the Computer Resources tab.',
  },
  {
    id: 'csa_radarsat1_archive',
    agency: 'CSA (Canada)',
    title: 'CSA RADARSAT-1 - Data (Open Archive)',
    url: 'https://www.asc-csa.gc.ca/eng/satellites/radarsat1/',
    description:
      'Launched Nov. 1995, RADARSAT-1 acquired C-band HH imagery day and night through clouds, smoke, and haze; all historical products are released under an open license.',
    howUsedInApp:
      'Featured in the Sensor Rosetta multi-decade recommender (1995–2013 open baseline) for multi-decadal glacier, coastal, and wetland comparisons.',
  },
  {
    id: 'conae_saocom_catalog',
    agency: 'CONAE (Argentina)',
    title: 'CONAE SAOCOM Catalogue',
    url: 'https://catalogos.conae.gov.ar/catalogo/catalogoSat.html',
    description:
      'Access CONAE’s L-band (23.5 cm) SAOCOM 1A/1B SAR mission catalog, image search, download, and processing tutorials.',
    howUsedInApp:
      'Paired with Chapter 6 (Agriculture Soil Moisture) & Sensor Rosetta (CONAE_SAOCOM_L) as a synergistic L-band companion to NISAR.',
  },
  {
    id: 'conae_saocom_registration',
    agency: 'CONAE (Argentina)',
    title: 'SAOCOM Catalogue Registration (ONE CLICK Login Profile)',
    url: 'https://catalogos.conae.gov.ar/',
    description:
      'Official registration protocol to create a ONE CLICK Login Profile for requesting and downloading SAOCOM L-band SAR imagery.',
    howUsedInApp:
      'Documented step-by-step inside the Field Supercomputer Resources tab and docs/SAOCOM_REQUEST_GUIDE.md.',
  },
];

export const PYTHON_QGIS_RECIPE = `# 1. Python: Search ASF Vertex for NISAR / Mount Rainier / Rasuwa granules
import asf_search as asf
results = asf.geo_search(
    platform=[asf.PLATFORM.NISAR],
    intersectsWith='POLYGON((-122.05 46.65,-121.45 46.65,-121.45 47.05,-122.05 47.05,-122.05 46.65))',
    maxResults=5,
)
# 2. QGIS: Layer -> Add Layer -> Add Raster Layer -> select exported GeoTIFF / HDF5 subdataset
#    Style as Singleband Pseudocolor (or RGB HH/HV composite) over OpenTopoMap DEM`;
