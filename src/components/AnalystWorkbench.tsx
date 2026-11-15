import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Camera,
  CheckCircle2,
  Download,
  ExternalLink,
  Filter,
  Globe,
  Info,
  Layers,
  Link2,
  Play,
  Pause,
  RefreshCw,
  Sliders,
  Sparkles,
  Terminal,
  Upload,
  X,
} from 'lucide-react';
import { DataPassport, type DataPassportProps } from './DataPassport';
import {
  CATALOG_AOI_PRESETS,
  buildAsfDownloadSnippet,
  buildAsfVertexDeepLink,
  buildEarthdataSearchDeepLink,
  fetchNisarCatalogForAoi,
  rankPrePostEventPairs,
  type AoiCatalogResponse,
  type CatalogAoiId,
  type NisarCatalogGranule,
} from '../services/nisarCatalogService';
import {
  computeBackscatterChangeRaster,
  decodeWorkbenchPermalinkHash,
  encodeWorkbenchPermalinkHash,
  evaluateSafePalette,
  exportChangePolygonsToGeoJSON,
  exportTransectToCsv,
  generateDeterministicAoiRasters,
  generateScreenReaderChangeSummary,
  sampleLosTransect,
  type SafePaletteId,
} from '../utils/changeDetection';
import {
  createSampleSarFloat32TiffBuffer,
  inspectBundledGeoTiff,
  inspectCogFromUrl,
  inspectGeoTiffFromArrayBuffer,
  inspectGeoTiffFromFile,
  type ParsedGeoTiffSummary,
} from '../utils/geotiffInspector';
import {
  BUNDLED_RASUWA_GEOTIFF_PRESETS,
  fetchValidatedRasuwaProductManifest,
  loadRasuwaDatumBundle,
  type BundledRasuwaGeoTiffPreset,
  type RasuwaDatumBundle,
} from '../services/rasuwaDatumService';
import type { ProductManifest } from '../data/nisarProducts';

export interface AnalystWorkbenchProps {
  initialAoiId?: string;
  onClose?: () => void;
  onOpenSciencePrimer?: (
    initialTab?: 'sar101' | 'polarization' | 'rosetta' | 'hypotheses' | 'future'
  ) => void;
  onOpenResources?: () => void;
  onCompleteWorkbenchAnalysis?: (summary: {
    aoiId: string;
    totalChangedAreaKm2: number;
    uncertaintyKm2: number;
    effectiveThresholdDb: number;
  }) => void;
}

interface GibsLayerPreset {
  id: string;
  title: string;
  layerIdentifier: string;
  date: string;
  unitNote: string;
}

const GIBS_BASEMAP_PRESETS: GibsLayerPreset[] = [
  {
    id: 'none',
    title: 'None (Radar View Only)',
    layerIdentifier: 'NONE',
    date: 'N/A',
    unitNote: 'Shows only the radar change colors without a map photo underneath.',
  },
  {
    id: 'bluemarble',
    title: 'Mountain Hills Background (Blue Marble)',
    layerIdentifier: 'BlueMarble_ShadedRelief_Bathymetry',
    date: '2026-08-01',
    unitNote: 'NASA world terrain map backdrop showing valleys and peaks.',
  },
  {
    id: 'modis_truecolor',
    title: 'Normal Satellite Photo (Blocked by Clouds)',
    layerIdentifier: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    date: '2026-08-26',
    unitNote:
      'Shows why storm clouds block normal cameras while space radar sees right through.',
  },
  {
    id: 'imerg_precip',
    title: 'Heavy Rain Overlay (NASA GPM)',
    layerIdentifier: 'IMERG_Precipitation_Rate',
    date: '2026-08-26',
    unitNote: 'Shows rainfall so we know whether wet mud fooled the radar.',
  },
];

export const AnalystWorkbench: React.FC<AnalystWorkbenchProps> = ({
  initialAoiId = 'rasuwa_nepal',
  onClose,
  onOpenSciencePrimer,
  onOpenResources,
  onCompleteWorkbenchAnalysis,
}) => {
  const permalinkInit = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return decodeWorkbenchPermalinkHash(window.location.hash);
  }, []);

  const resolveValidAoi = (raw?: string): CatalogAoiId => {
    if (raw && raw in CATALOG_AOI_PRESETS) return raw as CatalogAoiId;
    return 'rasuwa_nepal';
  };

  const [selectedAoiId, setSelectedAoiId] = useState<CatalogAoiId>(
    resolveValidAoi(permalinkInit?.aoiId ?? initialAoiId)
  );
  const [compareMode, setCompareMode] = useState<'swipe' | 'flicker' | 'opacity' | 'side_by_side'>(
    permalinkInit?.compareMode ?? 'swipe'
  );
  const [polarization, setPolarization] = useState<'HH' | 'HV' | 'HH_HV_RATIO' | 'GUNW_LOS'>(
    permalinkInit?.polarization ?? 'HH'
  );
  const [palette, setPalette] = useState<SafePaletteId>(
    permalinkInit?.palette ?? 'diverging_blue_orange'
  );
  const [viewSource, setViewSource] = useState<'numeric_grid' | 'published_browse'>('numeric_grid');
  const [swipePercent, setSwipePercent] = useState<number>(54);
  const [opacityPercent, setOpacityPercent] = useState<number>(75);
  const [flickerShowAfter, setFlickerShowAfter] = useState<boolean>(true);
  const [isFlickerPlaying, setIsFlickerPlaying] = useState<boolean>(false);

  // Change detection controls
  const [useRoiCalibration, setUseRoiCalibration] = useState<boolean>(
    permalinkInit?.useRoiCalibration ?? true
  );
  const [manualThresholdDb, setManualThresholdDb] = useState<number>(
    permalinkInit?.thresholdDb ?? 2.6
  );
  const [sigmaMultiplier, setSigmaMultiplier] = useState<number>(2.5);
  const [mmuPixels, setMmuPixels] = useState<number>(permalinkInit?.mmuPixels ?? 6);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showRoiBox, setShowRoiBox] = useState<boolean>(true);
  const [showTransectLine, setShowTransectLine] = useState<boolean>(true);
  const [showCmrFootprints, setShowCmrFootprints] = useState<boolean>(true);
  const [selectedGibsPresetId, setSelectedGibsPresetId] = useState<string>('none');
  const [transectPreset, setTransectPreset] = useState<'primary' | 'cross_valley' | 'flipped_ref'>(
    'primary'
  );

  // Catalog state
  const [catalogResult, setCatalogResult] = useState<AoiCatalogResponse | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);
  const [selectedGranule, setSelectedGranule] = useState<NisarCatalogGranule | null>(null);
  const [productFilter, setProductFilter] = useState<string>('ALL');
  const [timelinePlaying, setTimelinePlaying] = useState<boolean>(false);
  const [timelineIndex, setTimelineIndex] = useState<number>(0);

  // Feedback toast state
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [loggedToMission, setLoggedToMission] = useState<boolean>(false);

  // Live GeoTIFF / Cloud-Optimized GeoTIFF (COG) Ingest State
  const [loadedGeoTiff, setLoadedGeoTiff] = useState<ParsedGeoTiffSummary | null>(null);
  const [activeBundledPreset, setActiveBundledPreset] = useState<BundledRasuwaGeoTiffPreset | null>(
    null
  );
  const [validatedRasuwaManifest, setValidatedRasuwaManifest] = useState<ProductManifest | null>(
    null
  );
  const [rasuwaDatum, setRasuwaDatum] = useState<RasuwaDatumBundle | null>(null);
  const [datumPlateTab, setDatumPlateTab] = useState<'coherence' | 'rainfall' | 'latency'>(
    'coherence'
  );
  const [geoTiffLoading, setGeoTiffLoading] = useState<boolean>(false);
  const [geoTiffError, setGeoTiffError] = useState<string | null>(null);
  const [cogUrlInput, setCogUrlInput] = useState<string>('');
  const geoTiffFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadRasuwaDatumBundle(), fetchValidatedRasuwaProductManifest()])
      .then(([bundle, manifest]) => {
        if (cancelled) return;
        setRasuwaDatum(bundle);
        setValidatedRasuwaManifest(manifest);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const secondaryCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const aoiPreset = CATALOG_AOI_PRESETS[selectedAoiId] ?? CATALOG_AOI_PRESETS.rasuwa_nepal;

  // Fetch NASA CMR catalog for selected AOI
  useEffect(() => {
    let cancelled = false;
    setLoadingCatalog(true);
    fetchNisarCatalogForAoi(selectedAoiId)
      .then((res) => {
        if (cancelled) return;
        setCatalogResult(res);
        setSelectedGranule(res.granules[0] ?? null);
        setTimelineIndex(0);
        setLoadingCatalog(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingCatalog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAoiId]);

  const handleRefreshLiveCmr = async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetchNisarCatalogForAoi(selectedAoiId, false);
      setCatalogResult(res);
      setSelectedGranule(res.granules[0] ?? null);
      setTimelineIndex(0);
      triggerToast(
        res.classification === 'CATALOG_METADATA_LIVE'
          ? `Refreshed live NASA CMR: ${res.totalGranules} ASF/NISAR hits (${res.retrievedAt.slice(11, 19)}Z).`
          : `Live CMR offline/blocked — showing verified snapshot (${res.totalGranules} real granule records).`
      );
    } catch {
      triggerToast('Could not reach NASA CMR right now — retaining bundled catalog snapshot.');
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleLoadSampleGeoTiff = async () => {
    setGeoTiffLoading(true);
    setGeoTiffError(null);
    setActiveBundledPreset(null);
    try {
      const buf = createSampleSarFloat32TiffBuffer(72, 48);
      const summary = await inspectGeoTiffFromArrayBuffer(
        buf,
        `rasuwa_sample_float32_dB.tif`,
        'SAMPLE_SYNTHETIC_TIFF'
      );
      setLoadedGeoTiff(summary);
      setViewSource('numeric_grid');
      triggerToast(`Parsed real Float32 GeoTIFF (${summary.width}×${summary.height}, p2=${summary.p2Val}..p98=${summary.p98Val}).`);
    } catch (err) {
      setGeoTiffError(err instanceof Error ? err.message : 'Failed to parse sample GeoTIFF.');
    } finally {
      setGeoTiffLoading(false);
    }
  };

  const handleLoadBundledGeoTiff = async (preset: BundledRasuwaGeoTiffPreset) => {
    setGeoTiffLoading(true);
    setGeoTiffError(null);
    try {
      const summary = await inspectBundledGeoTiff(
        preset.publicPath,
        preset.shortLabel,
        preset.bandIndex
      );
      setActiveBundledPreset(preset);
      setLoadedGeoTiff(summary);
      setViewSource('numeric_grid');
      triggerToast(
        `Loaded NASA/ASF GeoTIFF "${preset.shortLabel}" (${summary.width}×${summary.height}, ${summary.crsLabel}).`
      );
    } catch (err) {
      setGeoTiffError(
        err instanceof Error ? err.message : `Failed to load GeoTIFF ${preset.shortLabel}.`
      );
    } finally {
      setGeoTiffLoading(false);
    }
  };

  const handleDownloadSampleGeoTiff = () => {
    const buf = createSampleSarFloat32TiffBuffer(72, 48);
    const blob = new Blob([buf], { type: 'image/tiff' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rasuwa-sar-sample-float32.tif`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Downloaded binary IEEE-754 Float32 GeoTIFF sample (.tif).');
  };

  const handleUploadGeoTiffFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActiveBundledPreset(null);
    setGeoTiffLoading(true);
    setGeoTiffError(null);
    try {
      const summary = await inspectGeoTiffFromFile(file);
      setLoadedGeoTiff(summary);
      setViewSource('numeric_grid');
      triggerToast(`Loaded GeoTIFF "${summary.sourceName}" (${summary.width}×${summary.height}, ${summary.crsLabel}).`);
    } catch (err) {
      setGeoTiffError(err instanceof Error ? err.message : 'Failed to parse uploaded GeoTIFF.');
    } finally {
      setGeoTiffLoading(false);
      if (geoTiffFileInputRef.current) geoTiffFileInputRef.current.value = '';
    }
  };

  const handleLoadCogUrl = async () => {
    if (!cogUrlInput.trim()) return;
    setActiveBundledPreset(null);
    setGeoTiffLoading(true);
    setGeoTiffError(null);
    try {
      const summary = await inspectCogFromUrl(cogUrlInput);
      setLoadedGeoTiff(summary);
      setViewSource('numeric_grid');
      triggerToast(`Streamed remote COG "${summary.sourceName}" (${summary.width}×${summary.height}).`);
    } catch (err) {
      setGeoTiffError(err instanceof Error ? err.message : 'Remote COG fetch failed (check URL or CORS).');
    } finally {
      setGeoTiffLoading(false);
    }
  };

  // Flicker timer
  useEffect(() => {
    if (!isFlickerPlaying) return;
    const id = window.setInterval(() => {
      setFlickerShowAfter((prev) => !prev);
    }, 650);
    return () => window.clearInterval(id);
  }, [isFlickerPlaying]);

  const rasterBundle = useMemo(
    () => generateDeterministicAoiRasters(selectedAoiId, 72, 48),
    [selectedAoiId]
  );

  const activeBeforeGrid = useMemo(() => {
    if (polarization === 'HV') return rasterBundle.beforeHvDb;
    if (polarization === 'HH_HV_RATIO') {
      const out = new Float32Array(rasterBundle.beforeHhDb.length);
      for (let i = 0; i < out.length; i++) {
        out[i] = rasterBundle.beforeHhDb[i] - rasterBundle.beforeHvDb[i];
      }
      return out;
    }
    return rasterBundle.beforeHhDb;
  }, [rasterBundle, polarization]);

  const activeAfterGrid = useMemo(() => {
    if (polarization === 'HV') return rasterBundle.afterHvDb;
    if (polarization === 'HH_HV_RATIO') {
      const out = new Float32Array(rasterBundle.afterHhDb.length);
      for (let i = 0; i < out.length; i++) {
        out[i] = rasterBundle.afterHhDb[i] - rasterBundle.afterHvDb[i];
      }
      return out;
    }
    return rasterBundle.afterHhDb;
  }, [rasterBundle, polarization]);

  const changeResult = useMemo(
    () =>
      computeBackscatterChangeRaster(
        activeBeforeGrid,
        activeAfterGrid,
        rasterBundle.width,
        rasterBundle.height,
        {
          manualThresholdDb,
          useRoiCalibration,
          stableRoi: rasterBundle.defaultStableRoi,
          sigmaMultiplier,
          mmuPixels,
          pixelSpacingMeters: rasterBundle.pixelSpacingMeters,
        }
      ),
    [
      activeBeforeGrid,
      activeAfterGrid,
      rasterBundle,
      manualThresholdDb,
      useRoiCalibration,
      sigmaMultiplier,
      mmuPixels,
    ]
  );

  const activeTransectCoords = useMemo(() => {
    if (transectPreset === 'cross_valley') {
      return {
        start: [0.15, 0.55] as [number, number],
        end: [0.85, 0.42] as [number, number],
        ref: [0.12, 0.15] as [number, number],
      };
    }
    if (transectPreset === 'flipped_ref') {
      return {
        start: rasterBundle.defaultTransect.start,
        end: rasterBundle.defaultTransect.end,
        ref: [0.82, 0.22] as [number, number],
      };
    }
    return rasterBundle.defaultTransect;
  }, [transectPreset, rasterBundle]);

  const transectProfile = useMemo(
    () =>
      sampleLosTransect(
        rasterBundle.losDisplacementM,
        rasterBundle.coherence,
        activeBeforeGrid,
        activeAfterGrid,
        rasterBundle.width,
        rasterBundle.height,
        activeTransectCoords.start,
        activeTransectCoords.end,
        activeTransectCoords.ref,
        [
          rasterBundle.width * rasterBundle.pixelSpacingMeters[0],
          rasterBundle.height * rasterBundle.pixelSpacingMeters[1],
        ],
        42,
        0.35,
        0.24
      ),
    [rasterBundle, activeBeforeGrid, activeAfterGrid, activeTransectCoords]
  );

  const filteredGranules = useMemo(() => {
    const list = catalogResult?.granules ?? [];
    if (productFilter === 'ALL') return list;
    return list.filter((g: NisarCatalogGranule) => g.parsed.productType === productFilter);
  }, [catalogResult, productFilter]);

  const rankedPairs = useMemo(() => {
    const list = catalogResult?.granules ?? [];
    return rankPrePostEventPairs(list, aoiPreset.eventDate).slice(0, 4);
  }, [catalogResult, aoiPreset.eventDate]);

  // Chronological acquisition timeline with orbital gap detection (> 15 days between passes)
  const chronologicalTimeline = useMemo(() => {
    const list = [...(catalogResult?.granules ?? [])]
      .filter((g) => g.timeStart)
      .sort((a, b) => Date.parse(a.timeStart) - Date.parse(b.timeStart));
    const dedupByDay: Array<{
      dateIso: string;
      granule: NisarCatalogGranule;
      gapDaysFromPrev: number;
      hasMissingPassGap: boolean;
    }> = [];
    for (const g of list) {
      const dayIso = g.timeStart.slice(0, 10);
      if (dedupByDay.length > 0 && dedupByDay[dedupByDay.length - 1].dateIso === dayIso) {
        continue;
      }
      const prevTime =
        dedupByDay.length > 0
          ? Date.parse(dedupByDay[dedupByDay.length - 1].granule.timeStart)
          : null;
      const currTime = Date.parse(g.timeStart);
      const gapDays =
        prevTime !== null && Number.isFinite(currTime)
          ? Math.round((currTime - prevTime) / (1000 * 3600 * 24))
          : 0;
      dedupByDay.push({
        dateIso: dayIso,
        granule: g,
        gapDaysFromPrev: gapDays,
        hasMissingPassGap: gapDays > 15,
      });
    }
    return dedupByDay;
  }, [catalogResult]);

  useEffect(() => {
    if (!timelinePlaying || chronologicalTimeline.length <= 1) return;
    const id = window.setInterval(() => {
      setTimelineIndex((prev) => (prev + 1) % chronologicalTimeline.length);
    }, 1100);
    return () => window.clearInterval(id);
  }, [timelinePlaying, chronologicalTimeline.length]);

  const activePassportProps: DataPassportProps = useMemo(() => {
    if (viewSource === 'numeric_grid' && loadedGeoTiff) {
      if (loadedGeoTiff.sourceKind === 'BUNDLED_NASA_GEOTIFF' && activeBundledPreset) {
        const useManifest =
          validatedRasuwaManifest && activeBundledPreset.id === 'nisar_event_source_gcov';
        const effectiveClass = useManifest
          ? validatedRasuwaManifest.classification
          : activeBundledPreset.classification === 'REAL_NISAR_PRODUCT'
            ? 'CATALOG_SNAPSHOT'
            : activeBundledPreset.classification;
        return {
          classification: effectiveClass,
          title: `${activeBundledPreset.title} (${loadedGeoTiff.width}×${loadedGeoTiff.height} px)`,
          maturity: activeBundledPreset.maturity,
          granuleId: activeBundledPreset.granuleId,
          collectionShortName: `${activeBundledPreset.sensor} · ${loadedGeoTiff.crsLabel}`,
          acquisitionDates: activeBundledPreset.acquisitionWindow,
          crid: useManifest ? validatedRasuwaManifest.crid : 'ASF / NASA Range-Read Subset',
          units: `${activeBundledPreset.units} · p2=${loadedGeoTiff.p2Val} .. p98=${loadedGeoTiff.p98Val}`,
          maskRule: `${loadedGeoTiff.validPixels} valid pixels (${loadedGeoTiff.nodataPixels} masked/NaN) · ${activeBundledPreset.interpretationLimit}`,
          sha256: activeBundledPreset.sha256,
          manifest: useManifest ? validatedRasuwaManifest : undefined,
          sourceUrl: activeBundledPreset.sourceUrl,
          credit: 'NASA/JPL-Caltech/ISRO/ASF DAAC / ESA / Copernicus via rasuwa_sar_impact_datum',
        };
      }
      const isSynthetic = loadedGeoTiff.sourceKind === 'SAMPLE_SYNTHETIC_TIFF';
      return {
        classification: isSynthetic ? 'TEST_FIXTURE' : 'SIMULATION',
        title: `Parsed GeoTIFF Raster: ${loadedGeoTiff.sourceName} (${loadedGeoTiff.width}×${loadedGeoTiff.height} px)`,
        maturity: 'N/A',
        granuleId: `${loadedGeoTiff.sourceName} · ${loadedGeoTiff.bandCount} band(s) · ${loadedGeoTiff.bitsPerSample}-bit ${loadedGeoTiff.sampleFormatLabel}`,
        collectionShortName: `${loadedGeoTiff.crsLabel}`,
        acquisitionDates: loadedGeoTiff.bbox
          ? `BBOX [${loadedGeoTiff.bbox.map((v) => v.toFixed(3)).join(', ')}]`
          : 'Client-Side Parsed GeoTIFF Header',
        crid: loadedGeoTiff.sourceKind,
        units: `2%–98% Stretch (${loadedGeoTiff.p2Val} to ${loadedGeoTiff.p98Val}) · Min ${loadedGeoTiff.minVal} / Max ${loadedGeoTiff.maxVal}`,
        maskRule: `${loadedGeoTiff.validPixels} valid preview pixels (${loadedGeoTiff.nodataPixels} nodata/NaN ignored)`,
        sourceUrl: buildAsfVertexDeepLink(aoiPreset.bbox),
        credit: isSynthetic
          ? 'Deterministic Float32 IEEE-754 GeoTIFF fixture parsed live via geotiff.js'
          : 'User-supplied / remote Cloud-Optimized GeoTIFF parsed live in browser via geotiff.js',
      };
    }

    if (viewSource === 'published_browse' && selectedAoiId === 'hubbard_glacier') {
      return {
        classification: 'NASA_PUBLISHED_BROWSE',
        title: 'NISAR L-Band SAR Published Reference Browse (Hubbard Glacier Mw 7.0 Earthquake)',
        maturity: 'BROWSE',
        granuleId: 'hubbard-2025-11-26 / hubbard-2025-12-08',
        collectionShortName: 'NASA Earth Observatory NISAR Reference',
        acquisitionDates: '2025-11-26 to 2025-12-08 UTC (12-Day Repeat)',
        crid: 'Published Earth Observatory Reference',
        units: 'Display Brightness (0–255, uncalibrated browse)',
        maskRule: 'Qualitative visual reference; use HDF5 pipeline for radiometric dB scaling',
        sourceUrl:
          'https://science.nasa.gov/earth/earth-observatory/glacier-aftereffects-of-the-hubbard-earthquake/',
        credit: 'NASA Earth Observatory / JPL-Caltech / ASF / USGS (2026)',
      };
    }

    if (viewSource === 'published_browse' && selectedGranule) {
      return {
        classification: catalogResult?.classification ?? 'CATALOG_SNAPSHOT',
        title: `NISAR ${selectedGranule.parsed.productType} Public Browse Quicklook (${aoiPreset.name})`,
        maturity: selectedGranule.parsed.maturity,
        granuleId: selectedGranule.granuleId,
        collectionShortName: selectedGranule.collectionShortName,
        acquisitionDates: `${selectedGranule.timeStart.slice(0, 19)}Z → ${selectedGranule.timeEnd.slice(0, 19)}Z`,
        crid: selectedGranule.parsed.crid,
        units: `L-Band (24 cm) · ${selectedGranule.parsed.polarizationLabel}`,
        maskRule: `Track ${selectedGranule.parsed.relativeOrbitTrack}${selectedGranule.parsed.orbitDirection} Frame ${selectedGranule.parsed.frame}`,
        sourceUrl: selectedGranule.browseUrl ?? buildAsfVertexDeepLink(aoiPreset.bbox),
        credit: 'NASA/JPL-Caltech/ASF DAAC via NASA CMR',
      };
    }

    return {
      classification: 'TEST_FIXTURE',
      title:
        polarization === 'GUNW_LOS'
          ? `Co-Registered L-Band GUNW Relative LOS Grid (${aoiPreset.name})`
          : `Co-Registered L-Band GCOV Backscatter Change Grid (${polarization} · ${aoiPreset.name})`,
      maturity: 'N/A',
      granuleId: `SYNTH_${selectedAoiId.toUpperCase()}_${rasterBundle.beforeDate}_${rasterBundle.afterDate}`,
      collectionShortName: 'SYNTHETIC_WORKBENCH_FIXTURE (Paired with NASA CMR Catalog)',
      acquisitionDates: `${rasterBundle.beforeDate} vs ${rasterBundle.afterDate}`,
      crid: 'DETERMINISTIC_PHYSICS_FIXTURE',
      units:
        polarization === 'GUNW_LOS'
          ? 'Relative LOS Displacement (m vs Ref R) + Coherence γ'
          : `Backscatter σ⁰/γ⁰ (dB) · ${rasterBundle.pixelSpacingMeters[0]}m grid`,
      maskRule: `Stable-ROI Threshold ±${changeResult.effectiveThresholdDb} dB + ${mmuPixels}-px MMU speckle filter`,
      sourceUrl: buildAsfVertexDeepLink(aoiPreset.bbox),
      credit: `Echoes of Rasuwa Workbench (2026) paired with NASA CMR (${catalogResult?.totalGranules ?? 0} archive hits)`,
    };
  }, [
    viewSource,
    loadedGeoTiff,
    selectedAoiId,
    selectedGranule,
    catalogResult,
    aoiPreset,
    polarization,
    rasterBundle,
    changeResult.effectiveThresholdDb,
    mmuPixels,
  ]);

  // Draw Numeric SAR Workbench Canvas (supports uploaded/parsed Float32 GeoTIFF or AOI Change Grid)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewSource !== 'numeric_grid') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;

    if (loadedGeoTiff) {
      const gw = loadedGeoTiff.previewWidth;
      const gh = loadedGeoTiff.previewHeight;
      const span = Math.max(1e-6, loadedGeoTiff.p98Val - loadedGeoTiff.p2Val);
      const img = ctx.createImageData(cw, ch);
      const data = img.data;

      for (let py = 0; py < ch; py++) {
        const r = Math.min(gh - 1, Math.floor((py / ch) * gh));
        for (let px = 0; px < cw; px++) {
          const c = Math.min(gw - 1, Math.floor((px / cw) * gw));
          const val = loadedGeoTiff.previewGrid[r * gw + c];
          const pOffset = (py * cw + px) * 4;
          if (!Number.isFinite(val)) {
            data[pOffset] = 15;
            data[pOffset + 1] = 23;
            data[pOffset + 2] = 34;
            data[pOffset + 3] = 255;
          } else {
            const v01 = (val - loadedGeoTiff.p2Val) / span;
            const rgb = evaluateSafePalette(v01, palette);
            data[pOffset] = rgb[0];
            data[pOffset + 1] = rgb[1];
            data[pOffset + 2] = rgb[2];
            data[pOffset + 3] = 255;
          }
        }
      }

      ctx.clearRect(0, 0, cw, ch);
      ctx.putImageData(img, 0, 0);
      ctx.save();
      ctx.fillStyle = 'rgba(11, 16, 23, 0.9)';
      ctx.fillRect(10, 10, Math.min(cw - 20, 410), 40);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(10, 10, Math.min(cw - 20, 410), 40);
      ctx.fillStyle = '#f6c177';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `GEOTIFF RASTER: ${loadedGeoTiff.sourceName} (${loadedGeoTiff.width}x${loadedGeoTiff.height})`,
        18,
        26
      );
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px monospace';
      ctx.fillText(
        `${loadedGeoTiff.sampleFormatLabel} | p2=${loadedGeoTiff.p2Val} | mean=${loadedGeoTiff.meanVal} | p98=${loadedGeoTiff.p98Val}`,
        18,
        42
      );
      ctx.restore();
      return;
    }

    const gw = rasterBundle.width;
    const gh = rasterBundle.height;

    const renderRasterToImageData = (mode: 'before' | 'after' | 'delta_or_los'): ImageData => {
      const img = ctx.createImageData(cw, ch);
      const data = img.data;

      for (let py = 0; py < ch; py++) {
        const r = Math.min(gh - 1, Math.floor((py / ch) * gh));
        for (let px = 0; px < cw; px++) {
          const c = Math.min(gw - 1, Math.floor((px / cw) * gw));
          const idx = r * gw + c;

          let rgb: [number, number, number] = [20, 28, 38];

          if (polarization === 'GUNW_LOS') {
            if (mode === 'before') {
              const v01 = (rasterBundle.beforeHhDb[idx] + 22) / 18;
              rgb = evaluateSafePalette(v01, 'cividis');
            } else {
              const los = rasterBundle.losDisplacementM[idx];
              const coh = rasterBundle.coherence[idx];
              if (coh < 0.35) {
                const hatch = (px + py) % 8 < 2 ? 68 : 34;
                rgb = [hatch, hatch + 6, hatch + 14];
              } else {
                const v01 = (los + 0.32) / 0.64;
                rgb = evaluateSafePalette(v01, palette);
              }
            }
          } else {
            if (mode === 'before') {
              const minDb = polarization === 'HH_HV_RATIO' ? 1 : -22;
              const spanDb = polarization === 'HH_HV_RATIO' ? 10 : 18;
              const v01 = (activeBeforeGrid[idx] - minDb) / spanDb;
              rgb = evaluateSafePalette(
                v01,
                palette === 'diverging_blue_orange' ? 'cividis' : palette
              );
            } else if (mode === 'after') {
              const minDb = polarization === 'HH_HV_RATIO' ? 1 : -22;
              const spanDb = polarization === 'HH_HV_RATIO' ? 10 : 18;
              const v01 = (activeAfterGrid[idx] - minDb) / spanDb;
              rgb = evaluateSafePalette(
                v01,
                palette === 'diverging_blue_orange' ? 'cividis' : palette
              );
            } else {
              const d = changeResult.deltaDb[idx];
              const v01 = (d + 6.5) / 13.0;
              rgb = evaluateSafePalette(v01, palette);
            }
          }

          if (selectedGibsPresetId !== 'none') {
            const latNorm = py / ch;
            const lonNorm = px / cw;
            if (selectedGibsPresetId === 'modis_truecolor') {
              const cloud =
                0.5 +
                0.5 * Math.sin(lonNorm * 14 + latNorm * 9) * Math.cos(lonNorm * 7 - latNorm * 11);
              if (mode === 'before' && cloud > 0.58) {
                const alpha = (cloud - 0.58) * 1.4;
                rgb = [
                  Math.round(rgb[0] * (1 - alpha) + 225 * alpha),
                  Math.round(rgb[1] * (1 - alpha) + 232 * alpha),
                  Math.round(rgb[2] * (1 - alpha) + 240 * alpha),
                ];
              }
            } else if (selectedGibsPresetId === 'imerg_precip') {
              const rain = Math.exp(-((lonNorm - 0.52) ** 2 / 0.08 + (latNorm - 0.54) ** 2 / 0.08));
              rgb = [
                Math.round(rgb[0] * (1 - rain * 0.25) + 40 * rain * 0.25),
                Math.round(rgb[1] * (1 - rain * 0.25) + 180 * rain * 0.25),
                Math.round(rgb[2] * (1 - rain * 0.25) + 255 * rain * 0.25),
              ];
            }
          }

          const pOffset = (py * cw + px) * 4;
          data[pOffset] = rgb[0];
          data[pOffset + 1] = rgb[1];
          data[pOffset + 2] = rgb[2];
          data[pOffset + 3] = 255;
        }
      }
      return img;
    };

    const beforeImg = renderRasterToImageData('before');
    const afterImg = renderRasterToImageData(
      polarization === 'GUNW_LOS'
        ? 'delta_or_los'
        : compareMode === 'opacity'
        ? 'delta_or_los'
        : 'after'
    );

    ctx.clearRect(0, 0, cw, ch);

    if (compareMode === 'swipe') {
      const splitX = Math.round((swipePercent / 100) * cw);
      ctx.putImageData(beforeImg, 0, 0, 0, 0, splitX, ch);
      ctx.putImageData(afterImg, 0, 0, splitX, 0, cw - splitX, ch);

      ctx.save();
      ctx.strokeStyle = '#f6c177';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, ch);
      ctx.stroke();

      ctx.fillStyle = '#0f1722';
      ctx.fillRect(Math.max(4, splitX - 118), 10, 110, 22);
      ctx.fillRect(Math.min(cw - 114, splitX + 8), 10, 110, 22);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`PRE ${rasterBundle.beforeDate}`, Math.max(10, splitX - 112), 25);
      ctx.fillStyle = '#f6c177';
      ctx.fillText(`POST ${rasterBundle.afterDate}`, Math.min(cw - 108, splitX + 14), 25);
      ctx.restore();
    } else if (compareMode === 'flicker') {
      ctx.putImageData(flickerShowAfter ? afterImg : beforeImg, 0, 0);
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 34, 0.88)';
      ctx.fillRect(12, 12, 220, 26);
      ctx.fillStyle = flickerShowAfter ? '#f6c177' : '#94c1e4';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(
        flickerShowAfter
          ? `ACTIVE FRAME: POST (${rasterBundle.afterDate})`
          : `ACTIVE FRAME: PRE (${rasterBundle.beforeDate})`,
        20,
        29
      );
      ctx.restore();
    } else if (compareMode === 'opacity') {
      ctx.putImageData(beforeImg, 0, 0);
      const offscreen = document.createElement('canvas');
      offscreen.width = cw;
      offscreen.height = ch;
      const octx = offscreen.getContext('2d');
      if (octx) {
        octx.putImageData(afterImg, 0, 0);
        ctx.save();
        ctx.globalAlpha = opacityPercent / 100;
        ctx.drawImage(offscreen, 0, 0);
        ctx.restore();
      }
    } else {
      ctx.putImageData(beforeImg, 0, 0);
      const sec = secondaryCanvasRef.current;
      if (sec) {
        const sctx = sec.getContext('2d');
        if (sctx) {
          sctx.putImageData(afterImg, 0, 0);
        }
      }
    }

    if (showContours && polarization !== 'GUNW_LOS') {
      ctx.save();
      ctx.lineWidth = 1.8;
      for (const seg of changeResult.contours) {
        ctx.strokeStyle = seg.changeClass === -1 ? '#38bdf8' : '#f59e0b';
        ctx.beginPath();
        ctx.moveTo((seg.x1 / gw) * cw, (seg.y1 / gh) * ch);
        ctx.lineTo((seg.x2 / gw) * cw, (seg.y2 / gh) * ch);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (showRoiBox) {
      const roi = rasterBundle.defaultStableRoi;
      const rx = roi.x0 * cw;
      const ry = roi.y0 * ch;
      const rw = (roi.x1 - roi.x0) * cw;
      const rh = (roi.y1 - roi.y0) * ch;
      ctx.save();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(15, 23, 34, 0.85)';
      ctx.fillRect(rx, Math.max(0, ry - 18), 148, 17);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '10px monospace';
      ctx.fillText(
        `STABLE ROI (σ=${changeResult.roiStats.stdDb.toFixed(2)}dB)`,
        rx + 4,
        Math.max(12, ry - 6)
      );
      ctx.restore();
    }

    if (showCmrFootprints && catalogResult && catalogResult.granules.length > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 193, 228, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(cw * 0.04, ch * 0.05, cw * 0.92, ch * 0.9);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(15, 23, 34, 0.85)';
      ctx.fillRect(cw - 245, ch - 26, 237, 20);
      ctx.fillStyle = '#94c1e4';
      ctx.font = '10px monospace';
      ctx.fillText(
        `CMR FOOTPRINT: Track ${catalogResult.granules[0].parsed.relativeOrbitTrack} / Frame ${catalogResult.granules[0].parsed.frame}`,
        cw - 240,
        ch - 12
      );
      ctx.restore();
    }

    if (showTransectLine) {
      const [sx, sy] = activeTransectCoords.start;
      const [ex, ey] = activeTransectCoords.end;
      const [rfx, rfy] = activeTransectCoords.ref;

      ctx.save();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(sx * cw, sy * ch);
      ctx.lineTo(ex * cw, ey * ch);
      ctx.stroke();

      const drawEndpoint = (nx: number, ny: number, label: string, color: string) => {
        const x = nx * cw;
        const y = ny * ch;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f1722';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#0f1722';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(label, x - 3.5, y + 3.5);
      };

      drawEndpoint(sx, sy, 'A', '#38bdf8');
      drawEndpoint(ex, ey, 'B', '#f59e0b');
      drawEndpoint(rfx, rfy, 'R', '#e2e8f0');
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 34, 0.88)';
    ctx.fillRect(10, ch - 34, 150, 26);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, ch - 16);
    ctx.lineTo(88, ch - 16);
    ctx.moveTo(18, ch - 21);
    ctx.lineTo(18, ch - 11);
    ctx.moveTo(88, ch - 21);
    ctx.lineTo(88, ch - 11);
    ctx.stroke();
    const scaleKm = ((70 / cw) * gw * rasterBundle.pixelSpacingMeters[0]) / 1000;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px monospace';
    ctx.fillText(`${scaleKm.toFixed(1)} km`, 95, ch - 13);
    ctx.fillText('N↑', 138, ch - 13);
    ctx.restore();
  }, [
    viewSource,
    loadedGeoTiff,
    rasterBundle,
    polarization,
    palette,
    compareMode,
    swipePercent,
    opacityPercent,
    flickerShowAfter,
    showContours,
    showRoiBox,
    showTransectLine,
    showCmrFootprints,
    selectedGibsPresetId,
    changeResult,
    activeBeforeGrid,
    activeAfterGrid,
    activeTransectCoords,
    catalogResult,
  ]);

  const handleViewportKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (compareMode === 'opacity') {
        setOpacityPercent((p) => Math.max(0, p - 5));
      } else {
        setSwipePercent((p) => Math.max(0, p - 5));
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (compareMode === 'opacity') {
        setOpacityPercent((p) => Math.min(100, p + 5));
      } else {
        setSwipePercent((p) => Math.min(100, p + 5));
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      setFlickerShowAfter((prev) => !prev);
    }
  };

  const triggerToast = (msg: string) => {
    setStatusToast(msg);
    window.setTimeout(() => setStatusToast(null), 3200);
  };

  const handleExportGeoJson = () => {
    const json = exportChangePolygonsToGeoJSON(changeResult, rasterBundle.bbox, {
      aoiId: selectedAoiId,
      beforeDate: rasterBundle.beforeDate,
      afterDate: rasterBundle.afterDate,
      classification: activePassportProps.classification,
      granuleBefore: rankedPairs[0]?.preGranule.granuleId,
      granuleAfter: rankedPairs[0]?.postGranule?.granuleId ?? rankedPairs[0]?.preGranule.granuleId,
    });
    const blob = new Blob([json], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nisar-change-${selectedAoiId}-${rasterBundle.afterDate}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Exported GeoJSON change polygons with DataPassport provenance.');
  };

  const handleExportCsv = () => {
    const csv = exportTransectToCsv(transectProfile, selectedAoiId);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nisar-los-transect-${selectedAoiId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Exported relative LOS transect CSV with coherence flags.');
  };

  const handleExportPngFigure = () => {
    const srcCanvas = canvasRef.current;
    if (!srcCanvas) return;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = srcCanvas.width;
    outCanvas.height = srcCanvas.height + 64;
    const octx = outCanvas.getContext('2d');
    if (!octx) return;

    octx.fillStyle = '#0b111a';
    octx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    octx.drawImage(srcCanvas, 0, 0);

    octx.fillStyle = '#111a27';
    octx.fillRect(0, srcCanvas.height, outCanvas.width, 64);
    octx.fillStyle = '#f6c177';
    octx.font = 'bold 12px monospace';
    octx.fillText(
      `[${activePassportProps.classification}] ${aoiPreset.name} · ${rasterBundle.beforeDate} → ${rasterBundle.afterDate} (${polarization})`,
      12,
      srcCanvas.height + 22
    );
    octx.fillStyle = '#cbd5e1';
    octx.font = '11px monospace';
    octx.fillText(
      `Loss: ${changeResult.lossAreaKm2} km² | Gain: ${changeResult.gainAreaKm2} km² | Total: ${changeResult.totalChangedAreaKm2} ± ${changeResult.uncertaintyKm2} km² (Thr ±${changeResult.effectiveThresholdDb} dB)`,
      12,
      srcCanvas.height + 42
    );
    octx.fillStyle = '#94a3b8';
    octx.font = '10px monospace';
    octx.fillText(
      activePassportProps.credit ?? 'Echoes of Rasuwa: Global Waltz (2026)',
      12,
      srcCanvas.height + 57
    );

    const url = outCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `nisar-figure-${selectedAoiId}-${polarization}.png`;
    a.click();
    triggerToast('Saved publication-ready PNG figure with embedded DataPassport footer.');
  };

  const handleCopyPermalink = () => {
    const hash = encodeWorkbenchPermalinkHash({
      aoiId: selectedAoiId,
      compareMode,
      polarization,
      thresholdDb: changeResult.effectiveThresholdDb,
      useRoiCalibration,
      mmuPixels,
      palette,
    });
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', hash);
      const fullUrl = `${window.location.origin}${window.location.pathname}${hash}`;
      navigator.clipboard?.writeText(fullUrl).catch(() => {});
    }
    triggerToast('Copied reproducible Workbench permalink URL to clipboard.');
  };

  const handleLogToMission = () => {
    setLoggedToMission(true);
    onCompleteWorkbenchAnalysis?.({
      aoiId: selectedAoiId,
      totalChangedAreaKm2: changeResult.totalChangedAreaKm2,
      uncertaintyKm2: changeResult.uncertaintyKm2,
      effectiveThresholdDb: changeResult.effectiveThresholdDb,
    });
    triggerToast(`Logged ${aoiPreset.name} SAR change metrics to Field Expedition Logbook!`);
  };

  const screenReaderSummary = useMemo(
    () =>
      generateScreenReaderChangeSummary(
        aoiPreset.name,
        rasterBundle.beforeDate,
        rasterBundle.afterDate,
        changeResult,
        activePassportProps.classification
      ),
    [aoiPreset.name, rasterBundle, changeResult, activePassportProps.classification]
  );

  return (
    <section
      data-testid="analyst-workbench-modal"
      aria-label="Multi-Temporal SAR Analyst Workbench"
      className="fixed inset-0 z-[950] bg-[#0b1017] text-slate-100 flex flex-col overflow-y-auto"
    >
      {/* Top Command Header */}
      <header className="sticky top-0 z-30 bg-[#0f1722] border-b border-slate-700/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-300 font-mono font-bold text-sm">
            SAR
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-100 font-mono">
                REAL NASA SATELLITE CHECKER
              </h1>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-sky-950/90 border border-sky-500/40 text-sky-200">
                NISAR 24cm Deep Radar
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Compare Before &amp; After radar scans, check real NASA satellite pass lists, and measure ground movement along a line
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenSciencePrimer && (
            <button
              type="button"
              onClick={() => onOpenSciencePrimer('polarization')}
              className="px-3 py-1.5 rounded text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-amber-200 border border-amber-500/40 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              How Radar Works
            </button>
          )}
          {onOpenResources && (
            <button
              type="button"
              onClick={onOpenResources}
              className="px-3 py-1.5 rounded text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-sky-200 border border-sky-500/40 flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" />
              NASA &amp; Space Links
            </button>
          )}
          {onCompleteWorkbenchAnalysis && (
            <button
              type="button"
              onClick={handleLogToMission}
              className="px-3 py-1.5 rounded text-xs font-mono font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {loggedToMission ? 'Analysis Logged ✓' : 'Log to Expedition'}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Analyst Workbench"
              className="px-3 py-1.5 rounded text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Return
            </button>
          )}
        </div>
      </header>

      {statusToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 bg-slate-900 border-2 border-amber-400 text-amber-200 px-4 py-2.5 rounded shadow-xl text-xs font-mono"
        >
          {statusToast}
        </div>
      )}

      {/* Main Workbench Grid */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 p-4 max-w-[1680px] w-full mx-auto">
        {/* LEFT COLUMN (3 cols): AOI Selector, NASA CMR Catalog & Event Pair Finder */}
        <aside className="xl:col-span-3 space-y-4">
          <div className="bg-[#111926] border border-slate-700/80 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="workbench-aoi-select"
                className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                1. Pick a Place on Earth
              </label>
              <span className="text-[11px] font-mono text-slate-400">6 Places</span>
            </div>

            <select
              id="workbench-aoi-select"
              value={selectedAoiId}
              onChange={(e) => setSelectedAoiId(resolveValidAoi(e.target.value))}
              className="w-full bg-[#0b1017] border border-slate-600 rounded px-2.5 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-400"
            >
              {(Object.entries(CATALOG_AOI_PRESETS) as Array<
                [CatalogAoiId, (typeof CATALOG_AOI_PRESETS)[CatalogAoiId]]
              >).map(([id, cfg]) => (
                <option key={id} value={id}>
                  {cfg.name} ({cfg.eventDate})
                </option>
              ))}
            </select>

            <div className="text-[11px] font-mono text-slate-300 bg-[#0b1017] p-2.5 rounded border border-slate-800 space-y-1">
              <div>
                <span className="text-slate-400">Map Box:</span> [{aoiPreset.bbox}]
              </div>
              <div>
                <span className="text-slate-400">Event Date:</span> {aoiPreset.eventDate} ({aoiPreset.eventDescription})
              </div>
              <div className="flex flex-wrap gap-2 pt-1.5">
                <a
                  href={buildAsfVertexDeepLink(aoiPreset.bbox)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 underline"
                >
                  Download on ASF Vertex <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={buildEarthdataSearchDeepLink('NISAR_L2_GCOV_PROVISIONAL_V1', aoiPreset.bbox)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 underline"
                >
                  NASA Earthdata <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* NASA CMR Granule Discovery & Event Pair Finder */}
          <div className="bg-[#111926] border border-slate-700/80 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-mono uppercase tracking-wider text-sky-300 font-bold flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                2. Real NASA Satellite Scans
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 tabular-nums">
                  {loadingCatalog
                    ? 'Checking...'
                    : `${catalogResult?.totalGranules ?? 0} scans`}
                </span>
                <button
                  type="button"
                  data-testid="workbench-refresh-cmr-btn"
                  disabled={loadingCatalog}
                  onClick={handleRefreshLiveCmr}
                  title="Re-query live NASA CMR (provider=ASF)"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sky-200 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingCatalog ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'GCOV', 'GUNW', 'GOFF', 'GSLC', 'SME2'].map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setProductFilter(pt)}
                  className={`px-2 py-1 rounded text-[11px] font-mono border ${
                    productFilter === pt
                      ? 'bg-sky-900/80 border-sky-400 text-white font-bold'
                      : 'bg-[#0b1017] border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>

            {rankedPairs.length > 0 && (
              <div className="bg-[#0b1017] border border-amber-500/40 rounded p-2.5 space-y-1.5">
                <div className="text-[11px] font-mono font-bold text-amber-300 flex items-center justify-between">
                  <span>BEST BEFORE/AFTER PAIR ({aoiPreset.eventDate})</span>
                  <span className="text-[10px] text-slate-400">Matching Path</span>
                </div>
                <div className="text-[11px] font-mono text-slate-200 space-y-1">
                  <div className="truncate" title={rankedPairs[0].preGranule.granuleId}>
                    <span className="text-sky-300">PRE:</span>{' '}
                    {rankedPairs[0].preGranule.timeStart.slice(0, 10)} ·{' '}
                    {rankedPairs[0].preGranule.parsed.productType} T
                    {rankedPairs[0].preGranule.parsed.relativeOrbitTrack}/F
                    {rankedPairs[0].preGranule.parsed.frame}
                  </div>
                  <div
                    className="truncate"
                    title={
                      rankedPairs[0].postGranule?.granuleId ?? rankedPairs[0].preGranule.granuleId
                    }
                  >
                    <span className="text-amber-300">POST:</span>{' '}
                    {(
                      rankedPairs[0].postGranule?.timeStart ?? rankedPairs[0].preGranule.timeEnd
                    ).slice(0, 10)}{' '}
                    · ({rankedPairs[0].temporalBaselineDays}d span)
                  </div>
                </div>
              </div>
            )}

            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {filteredGranules.slice(0, 14).map((g: NisarCatalogGranule) => {
                const isSelected = selectedGranule?.granuleId === g.granuleId;
                return (
                  <button
                    key={g.granuleId}
                    type="button"
                    onClick={() => setSelectedGranule(g)}
                    className={`w-full text-left p-2 rounded border text-[11px] font-mono transition ${
                      isSelected
                        ? 'bg-sky-950/80 border-sky-400 text-slate-100'
                        : 'bg-[#0b1017] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-sky-300">
                        {g.parsed.productType} · {g.parsed.polarizationCode}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-amber-200 text-[10px]">
                        {g.parsed.crid} · {g.parsed.maturity}
                      </span>
                    </div>
                    <div className="truncate text-[10px] text-slate-400 mt-0.5">{g.granuleId}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-300 mt-1">
                      <span>{g.timeStart.slice(0, 16).replace('T', ' ')}Z</span>
                      <span>
                        {g.parsed.orbitDirection} T{g.parsed.relativeOrbitTrack}/F{g.parsed.frame}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <details className="bg-[#0b1017] border border-slate-800 rounded p-2 text-[11px] font-mono">
              <summary className="cursor-pointer text-slate-300 hover:text-white flex items-center gap-1.5 font-semibold">
                <Terminal className="w-3.5 h-3.5 text-amber-300" />
                Reproducible asf_search Python Snippet
              </summary>
              <pre className="mt-2 text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap bg-slate-950 p-2 rounded border border-slate-800">
                {buildAsfDownloadSnippet(
                  selectedAoiId,
                  selectedGranule ? [selectedGranule] : filteredGranules.slice(0, 2)
                )}
              </pre>
            </details>
          </div>

          {/* Real GeoTIFF / Cloud-Optimized GeoTIFF (COG) Ingest Card */}
          <div
            data-testid="workbench-geotiff-card"
            className="bg-[#111926] border border-slate-700/80 rounded-lg p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                2B. Real GeoTIFF / COG Loader
              </h2>
              {loadedGeoTiff && (
                <button
                  type="button"
                  data-testid="workbench-clear-geotiff-btn"
                  onClick={() => setLoadedGeoTiff(null)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-300 leading-snug">
              Drop any local Float32/Uint16 <code className="text-sky-300">.tif</code> SAR raster or stream a remote Cloud-Optimized GeoTIFF URL directly in your browser.
            </p>

            <input
              ref={geoTiffFileInputRef}
              type="file"
              accept=".tif,.tiff,.geotiff"
              data-testid="workbench-geotiff-file-input"
              onChange={handleUploadGeoTiffFile}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              <button
                type="button"
                data-testid="workbench-load-sample-tif-btn"
                disabled={geoTiffLoading}
                onClick={handleLoadSampleGeoTiff}
                className="px-2 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 font-bold cursor-pointer"
              >
                ▶ Load Sample .tif
              </button>
              <button
                type="button"
                data-testid="workbench-download-sample-tif-btn"
                onClick={handleDownloadSampleGeoTiff}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 cursor-pointer"
              >
                ⬇ Save Sample .tif
              </button>
            </div>

            <button
              type="button"
              disabled={geoTiffLoading}
              onClick={() => geoTiffFileInputRef.current?.click()}
              className="w-full px-2.5 py-1.5 rounded bg-[#0b1017] hover:bg-slate-900 border border-dashed border-sky-500/50 text-sky-200 text-[11px] font-mono cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              {geoTiffLoading ? 'Reading TIFF IFD...' : 'Upload Local .tif / .tiff File'}
            </button>

            <div className="flex items-center gap-1.5">
              <input
                type="url"
                value={cogUrlInput}
                onChange={(e) => setCogUrlInput(e.target.value)}
                placeholder="https://.../sar-scene-cog.tif"
                aria-label="Remote Cloud-Optimized GeoTIFF URL"
                className="flex-1 min-w-0 bg-[#0b1017] border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-slate-100 placeholder:text-slate-500"
              />
              <button
                type="button"
                disabled={geoTiffLoading || !cogUrlInput.trim()}
                onClick={handleLoadCogUrl}
                className="px-2 py-1 rounded bg-sky-900/80 hover:bg-sky-800 disabled:opacity-40 border border-sky-400/60 text-sky-100 text-[11px] font-mono cursor-pointer shrink-0"
              >
                Fetch COG
              </button>
            </div>

            {geoTiffError && (
              <div className="text-[10px] font-mono text-rose-300 bg-rose-950/60 border border-rose-500/50 rounded p-2">
                {geoTiffError}
              </div>
            )}

            <div className="space-y-1.5 border-t border-slate-800 pt-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
                Real NASA / ASF / Copernicus Rasuwa GeoTIFFs
              </div>
              <div className="grid grid-cols-1 gap-1">
                {BUNDLED_RASUWA_GEOTIFF_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`workbench-bundled-tif-${preset.id}`}
                    disabled={geoTiffLoading}
                    onClick={() => handleLoadBundledGeoTiff(preset)}
                    className={`w-full text-left px-2 py-1.5 rounded border text-[10px] font-mono cursor-pointer transition ${
                      activeBundledPreset?.id === preset.id && loadedGeoTiff
                        ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100 font-bold'
                        : 'bg-[#0b1017] hover:bg-slate-900 border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">{preset.shortLabel}</span>
                      <span className="text-[9px] text-sky-300 shrink-0">{preset.shapeLabel}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {loadedGeoTiff && (
              <div
                data-testid="workbench-geotiff-stats"
                className="bg-[#0b1017] border border-sky-500/40 rounded p-2 text-[10px] font-mono text-slate-200 space-y-1 tabular-nums"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-sky-300 truncate" title={loadedGeoTiff.sourceName}>
                    ✓ {loadedGeoTiff.sourceName}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoadedGeoTiff(null);
                      setActiveBundledPreset(null);
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[9px] text-slate-200 cursor-pointer shrink-0"
                  >
                    Reset
                  </button>
                </div>
                <div>
                  Grid: {loadedGeoTiff.width}×{loadedGeoTiff.height} · {loadedGeoTiff.bitsPerSample}-bit {loadedGeoTiff.sampleFormatLabel}
                </div>
                <div>CRS: {loadedGeoTiff.crsLabel}</div>
                <div>
                  Stats: min {loadedGeoTiff.minVal} · mean {loadedGeoTiff.meanVal} · max {loadedGeoTiff.maxVal}
                </div>
                {activeBundledPreset && (
                  <div className="text-[9px] text-amber-200/90 border-t border-slate-800 pt-1">
                    {activeBundledPreset.interpretationLimit}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* CENTER COLUMN (6 cols): Interactive Multi-Mode Compare Viewport & Transect Profiler */}
        <main className="xl:col-span-6 space-y-4">
          <DataPassport {...activePassportProps} />

          <div className="bg-[#111926] border border-slate-700/80 rounded-lg p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-1.5" role="group" aria-label="Viewport Layer Source">
                <button
                  type="button"
                  onClick={() => setViewSource('numeric_grid')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                    viewSource === 'numeric_grid'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-[#0b1017] border-slate-700 text-slate-300'
                  }`}
                >
                  Before vs. After Change Map
                </button>
                <button
                  type="button"
                  onClick={() => setViewSource('published_browse')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                    viewSource === 'published_browse'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-[#0b1017] border-slate-700 text-slate-300'
                  }`}
                >
                  {selectedAoiId === 'hubbard_glacier'
                    ? 'Real NASA Photos (2025)'
                    : 'Real NASA Quick Preview'}
                </button>
              </div>

              <div className="flex items-center gap-1" role="group" aria-label="Compare Mode">
                {(['swipe', 'flicker', 'opacity', 'side_by_side'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCompareMode(m)}
                    className={`px-2 py-1 rounded text-[11px] font-mono uppercase border ${
                      compareMode === m
                        ? 'bg-slate-200 text-slate-950 border-white font-bold'
                        : 'bg-[#0b1017] text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {m === 'swipe' ? 'slider' : m === 'flicker' ? 'blink' : m === 'opacity' ? 'fade' : '2 maps'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400">Radar Filter:</span>
                {(
                  [
                    { id: 'HH', label: 'HH · Water & Walls' },
                    { id: 'HV', label: 'HV · Trees & Rubble' },
                    { id: 'HH_HV_RATIO', label: 'Water Under Trees' },
                    { id: 'GUNW_LOS', label: 'Ground Shift (m)' },
                  ] as const
                ).map((pol) => (
                  <button
                    key={pol.id}
                    type="button"
                    onClick={() => setPolarization(pol.id)}
                    className={`px-2 py-1 rounded text-[11px] border ${
                      polarization === pol.id
                        ? 'bg-sky-900/90 border-sky-400 text-white font-bold'
                        : 'bg-[#0b1017] border-slate-700 text-slate-300'
                    }`}
                  >
                    {pol.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <label htmlFor="wb-palette-select" className="text-slate-400 text-[11px]">
                  Colors:
                </label>
                <select
                  id="wb-palette-select"
                  value={palette}
                  onChange={(e) => setPalette(e.target.value as SafePaletteId)}
                  className="bg-[#0b1017] border border-slate-600 rounded px-2 py-1 text-[11px] text-slate-100"
                >
                  <option value="diverging_blue_orange">Blue / Orange (Colorblind Safe)</option>
                  <option value="viridis">Purple → Yellow</option>
                  <option value="cividis">Blue → Yellow</option>
                </select>
              </div>
            </div>

            {viewSource === 'numeric_grid' ? (
              <div
                tabIndex={0}
                onKeyDown={handleViewportKeyDown}
                aria-label="Interactive SAR Change Canvas. Use Left and Right arrow keys to adjust swipe or opacity, Space to toggle flicker."
                className="space-y-2 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded"
              >
                <div
                  className={`grid gap-2 ${
                    compareMode === 'side_by_side' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                  }`}
                >
                  <div className="relative bg-[#070b10] border border-slate-700 rounded overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={576}
                      height={384}
                      data-testid="workbench-primary-canvas"
                      className="w-full h-auto block"
                    />
                  </div>
                  {compareMode === 'side_by_side' && (
                    <div className="relative bg-[#070b10] border border-slate-700 rounded overflow-hidden">
                      <canvas
                        ref={secondaryCanvasRef}
                        width={576}
                        height={384}
                        data-testid="workbench-secondary-canvas"
                        className="w-full h-auto block"
                      />
                      <div className="absolute top-2 left-2 bg-slate-950/90 border border-amber-400/50 px-2 py-0.5 rounded text-[11px] font-mono text-amber-200">
                        POST / DELTA ({rasterBundle.afterDate})
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-[#0b1017] border border-slate-800 rounded p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  {compareMode === 'swipe' && (
                    <div className="flex-1 flex items-center gap-3">
                      <label htmlFor="wb-swipe-slider" className="text-slate-300 whitespace-nowrap">
                        Wipe Split ({swipePercent}%):
                      </label>
                      <input
                        id="wb-swipe-slider"
                        type="range"
                        min={0}
                        max={100}
                        value={swipePercent}
                        onChange={(e) => setSwipePercent(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </div>
                  )}

                  {compareMode === 'opacity' && (
                    <div className="flex-1 flex items-center gap-3">
                      <label htmlFor="wb-opacity-slider" className="text-slate-300 whitespace-nowrap">
                        Delta Overlay Opacity ({opacityPercent}%):
                      </label>
                      <input
                        id="wb-opacity-slider"
                        type="range"
                        min={0}
                        max={100}
                        value={opacityPercent}
                        onChange={(e) => setOpacityPercent(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </div>
                  )}

                  {compareMode === 'flicker' && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFlickerShowAfter((p) => !p)}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-200"
                      >
                        Toggle Frame ({flickerShowAfter ? 'POST' : 'PRE'})
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsFlickerPlaying((p) => !p)}
                        className="px-3 py-1 rounded bg-sky-900/80 hover:bg-sky-800 border border-sky-400 text-white flex items-center gap-1"
                      >
                        {isFlickerPlaying ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        {isFlickerPlaying ? 'Stop Blink' : 'Auto-Blink (650ms)'}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={showContours}
                        onChange={(e) => setShowContours(e.target.checked)}
                        className="accent-amber-400"
                      />
                      Outlines
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={showRoiBox}
                        onChange={(e) => setShowRoiBox(e.target.checked)}
                        className="accent-amber-400"
                      />
                      Calm Test Box
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={showTransectLine}
                        onChange={(e) => setShowTransectLine(e.target.checked)}
                        className="accent-amber-400"
                      />
                      Measure Line
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={showCmrFootprints}
                        onChange={(e) => setShowCmrFootprints(e.target.checked)}
                        className="accent-amber-400"
                      />
                      Satellite Frame
                    </label>
                  </div>
                </div>

                <div className="bg-[#0b1017] border border-slate-800 rounded p-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-sky-300 font-bold">■ Blue Outline:</span>
                    <span>
                      {polarization === 'GUNW_LOS'
                        ? 'Ground Sank Down (-m)'
                        : `Signal Dropped (Water / Flat) (≤ -${changeResult.effectiveThresholdDb} dB)`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">▲ Orange Outline:</span>
                    <span>
                      {polarization === 'GUNW_LOS'
                        ? 'Ground Pushed Up (+m)'
                        : `Signal Jumped (Rocks / Flooded Trees) (≥ +${changeResult.effectiveThresholdDb} dB)`}
                    </span>
                  </div>
                  <div className="text-slate-400">▨ Striped = Blurry / Noisy Area (Hard to Read)</div>
                </div>
              </div>
            ) : (
              <div className="bg-[#070b10] border border-slate-700 rounded p-3 space-y-3">
                {selectedAoiId === 'hubbard_glacier' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <figure className="space-y-1.5">
                      <img
                        src="/nisar-reference/hubbard-2025-11-26.jpg"
                        alt="NISAR Hubbard Glacier November 26, 2025 before Mw 7.0 earthquake"
                        className="w-full h-64 object-cover rounded border border-slate-700"
                      />
                      <figcaption className="text-[11px] font-mono text-slate-300">
                        <strong className="text-sky-300">PRE (2025-11-26):</strong> Real NASA Earth Observatory NISAR L-band browse before the Dec 6, 2025 Mw 7.0 Hubbard Glacier earthquake.
                      </figcaption>
                    </figure>
                    <figure className="space-y-1.5">
                      <img
                        src="/nisar-reference/hubbard-2025-12-08.jpg"
                        alt="NISAR Hubbard Glacier December 8, 2025 after Mw 7.0 earthquake"
                        className="w-full h-64 object-cover rounded border border-amber-500/50"
                      />
                      <figcaption className="text-[11px] font-mono text-slate-300">
                        <strong className="text-amber-300">POST (2025-12-08):</strong> Real NASA Earth Observatory NISAR L-band browse 2 days after the Mw 7.0 earthquake.
                      </figcaption>
                    </figure>
                  </div>
                ) : selectedGranule?.browseUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-sky-300 font-bold">
                        ASF Earthdata Cloud Public Browse: {selectedGranule.granuleId}
                      </span>
                      <a
                        href={selectedGranule.browseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-300 underline inline-flex items-center gap-1"
                      >
                        Open Raw PNG <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col items-center justify-center min-h-[240px]">
                      <img
                        src={selectedGranule.browseUrl}
                        alt={`ASF browse quicklook for ${selectedGranule.granuleId}`}
                        className="max-h-72 object-contain rounded"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-slate-400 p-6 text-center">
                    Select a granule with a public browse URL in the left panel or switch to Numeric Change Grid.
                  </div>
                )}
              </div>
            )}

            {/* 12-Day Repeat Acquisition Timeline */}
            <div className="bg-[#0b1017] border border-slate-800 rounded p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  12-DAY ORBITAL REPEAT TIMELINE (Gaps Explicitly Flagged — Never Interpolated)
                </div>
                <button
                  type="button"
                  onClick={() => setTimelinePlaying((p) => !p)}
                  className="px-2.5 py-1 rounded text-[11px] font-mono bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-200 flex items-center gap-1"
                >
                  {timelinePlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {timelinePlaying ? 'Pause Series' : 'Step Acquisition Pass'}
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {chronologicalTimeline.map((item, idx) => {
                  const active = idx === timelineIndex;
                  return (
                    <React.Fragment key={item.granule.granuleId}>
                      {item.hasMissingPassGap && (
                        <div
                          title={`Orbital acquisition gap: ${item.gapDaysFromPrev} days elapsed (>12-day nominal repeat). Data is NOT interpolated across this gap.`}
                          className="px-1.5 py-1 rounded border border-dashed border-amber-500/60 bg-amber-950/30 text-[10px] font-mono text-amber-300 whitespace-nowrap"
                        >
                          ⚠ GAP ({item.gapDaysFromPrev}d)
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setTimelineIndex(idx);
                          setSelectedGranule(item.granule);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap border ${
                          active
                            ? 'bg-sky-500 text-slate-950 border-white font-bold'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {item.dateIso} ({item.granule.parsed.productType})
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* InSAR Relative Line-of-Sight (LOS) Transect Profiler Card */}
          <div className="bg-[#111926] border border-slate-700/80 rounded-lg p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
                  3. Measure Ground Shift Along a Line (Point A → B)
                </h2>
                <p className="text-[11px] text-slate-300">
                  Shows how much the ground moved compared to a safe calm spot (R). Up/down or sideways toward the satellite — one angle alone can&apos;t tell exact direction.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'primary', label: 'Main Hill Line' },
                    { id: 'cross_valley', label: 'Across Valley Line' },
                    { id: 'flipped_ref', label: 'Move Safe Spot (R)' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setTransectPreset(preset.id)}
                    className={`px-2 py-1 rounded text-[11px] font-mono border ${
                      transectPreset === preset.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                        : 'bg-[#0b1017] border-slate-700 text-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0b1017] border border-slate-800 rounded p-2.5">
              <svg
                viewBox="0 0 600 140"
                className="w-full h-36 overflow-visible"
                role="img"
                aria-label={`Ground movement chart across ${transectProfile.totalLengthMeters} meters`}
              >
                <line x1="40" y1="70" x2="585" y2="70" stroke="#475569" strokeDasharray="4 4" strokeWidth="1" />
                <text x="6" y="73" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                  0.00m
                </text>
                <text x="6" y="24" fill="#f59e0b" fontSize="9" fontFamily="monospace">
                  +0.25m
                </text>
                <text x="6" y="124" fill="#38bdf8" fontSize="9" fontFamily="monospace">
                  -0.25m
                </text>

                {transectProfile.samples.map((s, idx) => {
                  if (s.isCoherent) return null;
                  const x = 40 + (idx / Math.max(1, transectProfile.samples.length - 1)) * 545;
                  return (
                    <rect
                      key={`mask-${s.index}`}
                      x={x - 6}
                      y={12}
                      width={12}
                      height={116}
                      fill="rgba(245, 158, 11, 0.16)"
                    />
                  );
                })}

                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                  points={transectProfile.samples
                    .map((s, idx) => {
                      const x = 40 + (idx / Math.max(1, transectProfile.samples.length - 1)) * 545;
                      const clamped = Math.max(-0.3, Math.min(0.3, s.relativeLosMeters));
                      const y = 70 - (clamped / 0.3) * 52;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')}
                />

                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                  points={transectProfile.samples
                    .map((s, idx) => {
                      const x = 40 + (idx / Math.max(1, transectProfile.samples.length - 1)) * 545;
                      const clampedDb = Math.max(-7, Math.min(7, s.deltaBackscatterDb));
                      const y = 70 - (clampedDb / 7) * 50;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')}
                />
              </svg>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800/80">
                <span>
                  <strong className="text-sky-300">─── Blue Line:</strong> Ground Shift (max{' '}
                  {transectProfile.maxAbsRelativeLosMeters.toFixed(3)} m)
                </span>
                <span>
                  <strong className="text-amber-400">--- Orange Line:</strong> Echo Brightness Change (dB)
                </span>
                <span>
                  Signal Match = {transectProfile.meanCoherence.toFixed(2)} (
                  {Math.round(transectProfile.unreliableFraction * 100)}% blurry spots hidden)
                </span>
              </div>
            </div>
          </div>

          {selectedAoiId === 'rasuwa_nepal' && rasuwaDatum && (
            <div
              data-testid="workbench-rasuwa-datum-panel"
              className="bg-[#111926] border border-emerald-500/40 rounded-lg p-3.5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
                    Real NASA / ASF / Sentinel-1D / GPM Datum · 26 Aug 2026 Event
                  </div>
                  <h3 className="text-xs font-mono font-bold text-white">
                    4. Cross-Band Coherence, GPM Rainfall &amp; Archive Latency Evidence
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  {(
                    [
                      { id: 'coherence', label: 'L vs C Coherence' },
                      { id: 'rainfall', label: 'GPM IMERG Rain' },
                      { id: 'latency', label: 'Latency Clocks' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDatumPlateTab(t.id)}
                      className={`px-2 py-1 rounded border cursor-pointer ${
                        datumPlateTab === t.id
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                          : 'bg-[#0b1017] border-slate-700 text-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {datumPlateTab === 'coherence' && rasuwaDatum.coherence && (
                <div className="space-y-2.5 text-[11px] font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-[#0b1017] border border-sky-500/40 rounded p-2.5 space-y-1">
                      <div className="font-bold text-sky-300">
                        {rasuwaDatum.coherence.c_band.sensor}
                      </div>
                      <div className="text-slate-200">
                        Target median γ: {rasuwaDatum.coherence.c_band.quiet_target_median.toFixed(3)} →{' '}
                        <strong className="text-amber-300">
                          {rasuwaDatum.coherence.c_band.event_target_median.toFixed(3)}
                        </strong>{' '}
                        (Δ {rasuwaDatum.coherence.c_band_target_delta.toFixed(3)})
                      </div>
                      {rasuwaDatum.screeningMask && (
                        <div className="text-[10px] text-slate-400">
                          Mask: {rasuwaDatum.screeningMask.target_filtered_anomaly_pixels}/
                          {rasuwaDatum.screeningMask.target_valid_pixels} target flagged vs{' '}
                          {rasuwaDatum.screeningMask.control_filtered_false_alarm_pixels}/
                          {rasuwaDatum.screeningMask.control_valid_pixels} control false alarms
                        </div>
                      )}
                    </div>

                    <div className="bg-[#0b1017] border border-amber-500/40 rounded p-2.5 space-y-1">
                      <div className="font-bold text-amber-300">
                        {rasuwaDatum.coherence.l_band.sensor} (Diagnosed Phase Failure)
                      </div>
                      <div className="text-slate-200">
                        Target median γ: {rasuwaDatum.coherence.l_band.quiet_target_median.toFixed(3)} →{' '}
                        <strong className="text-rose-300">
                          {rasuwaDatum.coherence.l_band.event_target_median.toFixed(3)}
                        </strong>{' '}
                        (Control: {rasuwaDatum.coherence.l_band.event_control_median.toFixed(3)})
                      </div>
                      <div className="text-[10px] text-rose-200/90">
                        Connected phase survived in only{' '}
                        <strong>
                          {rasuwaDatum.coherence.l_band.event_phase_valid_pixels}/
                          {rasuwaDatum.coherence.l_band.event_phase_total_pixels}
                        </strong>{' '}
                        source pixels — no displacement claimed.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <figure className="bg-[#0b1017] border border-slate-800 rounded p-1.5 space-y-1">
                      <img
                        src="/rasuwa-datum/handoff/cband_coherence_comparison.webp"
                        alt="Sentinel-1D C-band quiet vs event coherence comparison"
                        className="w-full h-36 object-contain rounded bg-slate-950"
                      />
                      <figcaption className="text-[10px] text-slate-400">
                        Sentinel-1D C-Band Coherence Plate (4–16 Aug vs 16–28 Aug)
                      </figcaption>
                    </figure>
                    <figure className="bg-[#0b1017] border border-slate-800 rounded p-1.5 space-y-1">
                      <img
                        src="/rasuwa-datum/handoff/lband_coherence_comparison.webp"
                        alt="NISAR L-band quiet vs event coherence comparison"
                        className="w-full h-36 object-contain rounded bg-slate-950"
                      />
                      <figcaption className="text-[10px] text-slate-400">
                        NISAR L-Band Coherence Plate (14–26 Jul vs 19–31 Aug)
                      </figcaption>
                    </figure>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {rasuwaDatum.coherence.comparison_limit}
                  </div>
                </div>
              )}

              {datumPlateTab === 'rainfall' && rasuwaDatum.rainfall && (
                <div className="space-y-2 text-[11px] font-mono">
                  <div className="bg-[#0b1017] border border-sky-500/40 rounded p-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-sky-300">
                        Native GPM IMERG Half-Hour at Collapse (2026-08-26T02:30Z–02:59Z)
                      </div>
                      <div className="text-[10px] text-slate-300">
                        Early &amp; Late Runs both measured{' '}
                        <strong className="text-emerald-300">
                          {rasuwaDatum.rainfall.native_imerg_event_half_hour[0]?.precipitation_rate_mm_hr.toFixed(
                            1
                          )}{' '}
                          mm/hr
                        </strong>{' '}
                        (±
                        {rasuwaDatum.rainfall.native_imerg_event_half_hour[0]?.random_error_mm_hr.toFixed(
                          2
                        )}{' '}
                        mm/hr random error) — refutes an acute rainstorm trigger at collapse.
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto bg-[#0b1017] border border-slate-800 rounded p-2">
                    <table className="w-full text-[10px] tabular-nums">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 text-left">
                          <th className="py-1 pr-2">Date (UTC)</th>
                          <th className="py-1 pr-2">GPM IMERG (mm/d)</th>
                          <th className="py-1">NASA POWER (mm/d)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rasuwaDatum.rainfall.series.slice(2, 10).map((row) => (
                          <tr
                            key={row.date_utc}
                            className={`border-b border-slate-900 ${
                              row.date_utc === '2026-08-26' ? 'bg-amber-950/30 text-amber-200 font-bold' : 'text-slate-300'
                            }`}
                          >
                            <td className="py-1 pr-2">{row.date_utc}</td>
                            <td className="py-1 pr-2">{row.imerg_mm_day.toFixed(2)}</td>
                            <td className="py-1">{row.power_corrected_mm_day.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {rasuwaDatum.rainfall.limitations}
                  </div>
                </div>
              )}

              {datumPlateTab === 'latency' && (
                <div className="space-y-2 text-[11px] font-mono">
                  <div className="overflow-x-auto bg-[#0b1017] border border-slate-800 rounded p-2">
                    <table className="w-full text-[10px] tabular-nums">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 text-left">
                          <th className="py-1 pr-2">Product</th>
                          <th className="py-1 pr-2">Acq Offset</th>
                          <th className="py-1 pr-2">CMR Archive</th>
                          <th className="py-1">Usability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rasuwaDatum.latencyRows.slice(0, 7).map((row) => (
                          <tr key={row.mission_product} className="border-b border-slate-900 text-slate-300">
                            <td className="py-1 pr-2 font-bold text-slate-100">
                              {row.mission_product}
                            </td>
                            <td className="py-1 pr-2">
                              {row.acquisition_offset_days !== null
                                ? `+${row.acquisition_offset_days.toFixed(3)} d`
                                : 'Gap'}
                            </td>
                            <td className="py-1 pr-2">
                              {row.archive_insertion_offset_days !== null
                                ? `+${row.archive_insertion_offset_days.toFixed(3)} d`
                                : 'Gap'}
                            </td>
                            <td className="py-1 text-slate-400">{row.usability_for_this_study}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-[10px] text-amber-200/80">
                    Acquisition, product generation, and CMR archive insertion are separate clocks—none is warning time.
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* RIGHT COLUMN (3 cols): Change Detection Calibration, Quantified Area + Uncertainty, GIBS Context & Exports */}
        <aside className="xl:col-span-3 space-y-4">
          <div className="bg-[#111926] border border-slate-700/80 rounded-lg p-3.5 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              4. Clean Up Grain &amp; Noise
            </h2>

            <label className="flex items-start gap-2 text-xs font-mono text-slate-200 cursor-pointer bg-[#0b1017] p-2.5 rounded border border-slate-800">
              <input
                type="checkbox"
                checked={useRoiCalibration}
                onChange={(e) => setUseRoiCalibration(e.target.checked)}
                className="mt-0.5 accent-amber-400"
              />
              <div>
                <div className="font-bold text-amber-200">Auto-Pick Noise Cutoff (Recommended)</div>
                <div className="text-[11px] text-slate-400">
                  Measures normal grain inside the Calm Test Box and ignores small changes below{' '}
                  <strong className="text-white">±{changeResult.effectiveThresholdDb} dB</strong>
                </div>
              </div>
            </label>

            {useRoiCalibration ? (
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <label htmlFor="wb-sigma-slider" className="text-slate-300">
                    Noise Filter Strength ({sigmaMultiplier.toFixed(1)}×):
                  </label>
                  <span className="text-amber-300 font-bold">±{changeResult.effectiveThresholdDb} dB</span>
                </div>
                <input
                  id="wb-sigma-slider"
                  type="range"
                  min={1.0}
                  max={4.5}
                  step={0.1}
                  value={sigmaMultiplier}
                  onChange={(e) => setSigmaMultiplier(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
            ) : (
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <label htmlFor="wb-manual-thr-slider" className="text-slate-300">
                    Manual Cutoff (dB):
                  </label>
                  <span className="text-amber-300 font-bold">±{manualThresholdDb.toFixed(2)} dB</span>
                </div>
                <input
                  id="wb-manual-thr-slider"
                  type="range"
                  min={0.5}
                  max={6.0}
                  step={0.1}
                  value={manualThresholdDb}
                  onChange={(e) => setManualThresholdDb(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
            )}

            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <label htmlFor="wb-mmu-slider" className="text-slate-300">
                  Ignore Tiny Dots Smaller Than:
                </label>
                <span className="text-sky-300 font-bold">{mmuPixels} dots</span>
              </div>
              <input
                id="wb-mmu-slider"
                type="range"
                min={1}
                max={20}
                step={1}
                value={mmuPixels}
                onChange={(e) => setMmuPixels(Number(e.target.value))}
                className="w-full accent-sky-400"
              />
              <div className="text-[11px] text-slate-400">
                Hid {changeResult.filteredSpecklePixels} stray noise dots smaller than {mmuPixels} pixels.
              </div>
            </div>
          </div>

          <div className="bg-[#111926] border border-slate-700/80 rounded-lg p-3.5 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-sky-300 font-bold">
              5. How Much Area Changed?
            </h2>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="bg-[#0b1017] border border-sky-500/40 rounded p-2.5">
                <div className="text-[10px] text-sky-300 uppercase">■ Signal Drop (Water)</div>
                <div className="text-base font-bold text-white tabular-nums">
                  {changeResult.lossAreaKm2.toFixed(2)} km²
                </div>
                <div className="text-[10px] text-slate-400">{changeResult.lossPatchCount} spots</div>
              </div>
              <div className="bg-[#0b1017] border border-amber-500/40 rounded p-2.5">
                <div className="text-[10px] text-amber-300 uppercase">▲ Signal Jump (Rough)</div>
                <div className="text-base font-bold text-white tabular-nums">
                  {changeResult.gainAreaKm2.toFixed(2)} km²
                </div>
                <div className="text-[10px] text-slate-400">{changeResult.gainPatchCount} spots</div>
              </div>
            </div>

            <div className="bg-[#0b1017] border border-slate-700 rounded p-2.5 font-mono text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300">Total Changed Area:</span>
                <span className="font-bold text-amber-300 tabular-nums">
                  {changeResult.totalChangedAreaKm2.toFixed(2)} ± {changeResult.uncertaintyKm2.toFixed(2)} km²
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Includes ± margin for blurry edges and radar speckle grain.
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] font-mono text-slate-300 bg-[#0b1017] p-2.5 rounded border border-slate-800">
              <div className="font-bold text-amber-200 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Things That Can Fool This Scan:
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-300">
                {changeResult.uncertaintySources.map((src, i) => (
                  <li key={i}>{src}</li>
                ))}
              </ul>
            </div>

            <div
              aria-live="polite"
              className="text-[11px] font-mono text-slate-300 bg-slate-950/90 border border-slate-800 rounded p-2"
            >
              <strong className="text-sky-300">Plain Summary:</strong> {screenReaderSummary}
            </div>
          </div>

          <div className="bg-[#111926] border border-slate-700/80 rounded-lg p-3.5 space-y-2.5">
            <label
              htmlFor="wb-gibs-select"
              className="text-xs font-mono uppercase tracking-wider text-slate-200 font-bold block"
            >
              6. Add Extra Weather / Map Layer
            </label>
            <select
              id="wb-gibs-select"
              value={selectedGibsPresetId}
              onChange={(e) => setSelectedGibsPresetId(e.target.value)}
              className="w-full bg-[#0b1017] border border-slate-600 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100"
            >
              {GIBS_BASEMAP_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <div className="text-[11px] font-mono text-slate-400">
              {GIBS_BASEMAP_PRESETS.find((p) => p.id === selectedGibsPresetId)?.unitNote}
            </div>
          </div>

          <div className="bg-[#111926] border border-slate-700/80 rounded-lg p-3.5 space-y-2.5">
            <h2 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
              7. Save or Share Results
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={handleExportPngFigure}
                className="px-2.5 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 flex items-center justify-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-amber-300" />
                Save Picture (.PNG)
              </button>
              <button
                type="button"
                onClick={handleExportGeoJson}
                className="px-2.5 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-sky-300" />
                Save Shapes (GeoJSON)
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-2.5 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                Save Line Data (.CSV)
              </button>
              <button
                type="button"
                onClick={handleCopyPermalink}
                className="px-2.5 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 flex items-center justify-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5 text-sky-300" />
                Copy Link
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default AnalystWorkbench;
