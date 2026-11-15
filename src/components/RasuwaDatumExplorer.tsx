import React, { useEffect, useMemo, useRef, useState } from 'react';
import { type ProductManifest } from '../data/nisarProducts';
import {
  BUNDLED_RASUWA_GEOTIFF_PRESETS,
  type BundledRasuwaGeoTiffPreset,
  fetchValidatedRasuwaProductManifest,
  loadRasuwaDatumBundle,
  RASUWA_DATUM_STATIC_FACTS,
  type RasuwaDatumBundle,
} from '../services/rasuwaDatumService';
import {
  inspectBundledGeoTiff,
  type ParsedGeoTiffSummary,
} from '../utils/geotiffInspector';

type ExplorerTab = 'geotiff' | 'gis' | 'coherence' | 'rainfall';

interface GeoJsonFeature {
  type?: string;
  id?: string | number;
  properties?: Record<string, unknown>;
  geometry?: {
    type: string;
    coordinates: unknown;
  } | null;
}

interface GeoJsonCollection {
  type?: string;
  name?: string;
  features?: GeoJsonFeature[];
}

interface GisLayerState {
  id: 'connected_aoi' | 'subareas' | 'hazard_screening' | 'unosat_detachment';
  label: string;
  url: string;
  stroke: string;
  fill: string;
  lineWidth: number;
  visible: boolean;
  data: GeoJsonCollection | null;
}

const INITIAL_GIS_LAYERS: Omit<GisLayerState, 'data'>[] = [
  {
    id: 'connected_aoi',
    label: 'HydroBASINS System AOI (4,774 km²)',
    url: '/rasuwa-datum/gis/connected_system_aoi.geojson',
    stroke: 'rgb(56, 189, 248)',
    fill: 'rgba(56, 189, 248, 0.10)',
    lineWidth: 2,
    visible: true,
  },
  {
    id: 'subareas',
    label: '6 Corridor Subareas (HydroBASINS L12)',
    url: '/rasuwa-datum/gis/subareas.geojson',
    stroke: 'rgb(167, 139, 250)',
    fill: 'rgba(167, 139, 250, 0.14)',
    lineWidth: 1.5,
    visible: true,
  },
  {
    id: 'hazard_screening',
    label: 'S1D & OPERA SAR Screening Polygons',
    url: '/rasuwa-datum/gis/hazard_screening.geojson',
    stroke: 'rgb(251, 191, 36)',
    fill: 'rgba(251, 191, 36, 0.25)',
    lineWidth: 2,
    visible: true,
  },
  {
    id: 'unosat_detachment',
    label: 'UNOSAT Detachment Crown (2.53 km²)',
    url: '/rasuwa-datum/gis/unosat_detachment.geojson',
    stroke: 'rgb(244, 63, 94)',
    fill: 'rgba(244, 63, 94, 0.35)',
    lineWidth: 2.5,
    visible: true,
  },
];

function extractLonLatPairs(geometry: GeoJsonFeature['geometry'], out: Array<[number, number]>) {
  if (!geometry || !geometry.coordinates) return;
  const walk = (node: unknown) => {
    if (!Array.isArray(node)) return;
    if (
      node.length >= 2 &&
      typeof node[0] === 'number' &&
      typeof node[1] === 'number'
    ) {
      out.push([node[0], node[1]]);
      return;
    }
    for (const child of node) walk(child);
  };
  walk(geometry.coordinates);
}

function drawPolygonRings(
  ctx: CanvasRenderingContext2D,
  rings: number[][][],
  project: (lon: number, lat: number) => [number, number]
) {
  ctx.beginPath();
  for (const ring of rings) {
    ring.forEach((pt, idx) => {
      const [x, y] = project(pt[0], pt[1]);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }
  ctx.fill('evenodd');
  ctx.stroke();
}

function rasterValueToRgb(
  value: number,
  presetId: string,
  p2: number,
  p98: number
): [number, number, number] {
  if (!Number.isFinite(value)) return [12, 18, 28];

  if (presetId === 'copernicus_glo30_dem') {
    const t = Math.max(0, Math.min(1, (value - p2) / Math.max(1e-6, p98 - p2)));
    const r = Math.round(35 + t * 210);
    const g = Math.round(70 + Math.sin(t * Math.PI) * 140 + t * 35);
    const b = Math.round(90 + (1 - t) * 70 + t * 120);
    return [Math.min(255, r), Math.min(255, g), Math.min(255, b)];
  }

  if (presetId === 'nisar_event_source_gunw') {
    const span = Math.max(1e-6, p98 - p2);
    const t = Math.max(0, Math.min(1, (value - p2) / span));
    const r = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(t - 0.75) * 4)));
    const g = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(t - 0.5) * 4)));
    const b = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(t - 0.25) * 4)));
    return [r, g, b];
  }

  // Diverging blue -> dark-neutral -> amber/red for backscatter change (dB)
  const limit = Math.max(1, Math.abs(p2), Math.abs(p98));
  const norm = Math.max(-1, Math.min(1, value / limit));
  if (norm < 0) {
    const mag = -norm;
    return [
      Math.round(24 * (1 - mag) + 14 * mag),
      Math.round(32 * (1 - mag) + 165 * mag),
      Math.round(48 * (1 - mag) + 233 * mag),
    ];
  }
  return [
    Math.round(24 * (1 - norm) + 245 * norm),
    Math.round(32 * (1 - norm) + 92 * norm),
    Math.round(48 * (1 - norm) + 36 * norm),
  ];
}

export interface RasuwaDatumExplorerProps {
  compact?: boolean;
  onSummaryInspect?: (summary: ParsedGeoTiffSummary, preset: BundledRasuwaGeoTiffPreset) => void;
}

export const RasuwaDatumExplorer: React.FC<RasuwaDatumExplorerProps> = ({
  compact = false,
  onSummaryInspect,
}) => {
  const [tab, setTab] = useState<ExplorerTab>('geotiff');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    BUNDLED_RASUWA_GEOTIFF_PRESETS[0].id
  );
  const [geotiffSummary, setGeotiffSummary] = useState<ParsedGeoTiffSummary | null>(null);
  const [geotiffLoading, setGeotiffLoading] = useState<boolean>(false);
  const [geotiffError, setGeotiffError] = useState<string | null>(null);
  const [datumBundle, setDatumBundle] = useState<RasuwaDatumBundle | null>(null);
  const [validatedManifest, setValidatedManifest] = useState<ProductManifest | null>(null);

  const [gisLayers, setGisLayers] = useState<GisLayerState[]>(
    INITIAL_GIS_LAYERS.map((l) => ({ ...l, data: null }))
  );
  const [gisZoomMode, setGisZoomMode] = useState<'basin' | 'source'>('basin');
  const [gisCursorCoord, setGisCursorCoord] = useState<string | null>(null);

  const rasterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gisCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedPreset = useMemo(
    () =>
      BUNDLED_RASUWA_GEOTIFF_PRESETS.find((p) => p.id === selectedPresetId) ||
      BUNDLED_RASUWA_GEOTIFF_PRESETS[0],
    [selectedPresetId]
  );

  // Load handoff telemetry bundle, NISAR manifest, and GeoJSON boundaries
  useEffect(() => {
    let active = true;
    loadRasuwaDatumBundle().then((b) => {
      if (active) setDatumBundle(b);
    });
    fetchValidatedRasuwaProductManifest().then((m) => {
      if (active) setValidatedManifest(m);
    });
    Promise.all(
      INITIAL_GIS_LAYERS.map(async (layer) => {
        try {
          const resp = await fetch(layer.url);
          if (!resp.ok) return { ...layer, data: null };
          const data = (await resp.json()) as GeoJsonCollection;
          return { ...layer, data };
        } catch {
          return { ...layer, data: null };
        }
      })
    ).then((loaded) => {
      if (active) setGisLayers(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  // Load selected GeoTIFF summary automatically
  useEffect(() => {
    let active = true;
    setGeotiffLoading(true);
    setGeotiffError(null);
    inspectBundledGeoTiff(
      selectedPreset.publicPath,
      selectedPreset.shortLabel,
      selectedPreset.bandIndex
    )
      .then((summary) => {
        if (!active) return;
        setGeotiffSummary(summary);
        onSummaryInspect?.(summary, selectedPreset);
      })
      .catch((err) => {
        if (!active) return;
        setGeotiffError(err instanceof Error ? err.message : 'Unable to decode GeoTIFF.');
      })
      .finally(() => {
        if (active) setGeotiffLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedPreset]);

  // Draw GeoTIFF raster preview canvas
  useEffect(() => {
    if (tab !== 'geotiff' || !geotiffSummary || !rasterCanvasRef.current) return;
    const canvas = rasterCanvasRef.current;
    const w = geotiffSummary.previewWidth;
    const h = geotiffSummary.previewHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = ctx.createImageData(w, h);
    const grid = geotiffSummary.previewGrid;
    for (let i = 0; i < w * h; i++) {
      const [r, g, b] = rasterValueToRgb(
        grid[i],
        selectedPreset.id,
        geotiffSummary.p2Val,
        geotiffSummary.p98Val
      );
      const off = i * 4;
      img.data[off] = r;
      img.data[off + 1] = g;
      img.data[off + 2] = b;
      img.data[off + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [tab, geotiffSummary, selectedPreset.id]);

  // Compute GeoJSON bounding box
  const gisBounds = useMemo(() => {
    if (gisZoomMode === 'source') {
      return { lonMin: 85.44, lonMax: 85.57, latMin: 28.22, latMax: 28.34 };
    }
    const pts: Array<[number, number]> = [];
    for (const layer of gisLayers) {
      if (!layer.visible || !layer.data?.features) continue;
      for (const f of layer.data.features) {
        extractLonLatPairs(f.geometry, pts);
      }
    }
    if (pts.length === 0) {
      return { lonMin: 85.05, lonMax: 85.9, latMin: 27.8, latMax: 28.9 };
    }
    let lonMin = Infinity;
    let lonMax = -Infinity;
    let latMin = Infinity;
    let latMax = -Infinity;
    for (const [lon, lat] of pts) {
      if (lon < lonMin) lonMin = lon;
      if (lon > lonMax) lonMax = lon;
      if (lat < latMin) latMin = lat;
      if (lat > latMax) latMax = lat;
    }
    const padLon = (lonMax - lonMin) * 0.06 || 0.05;
    const padLat = (latMax - latMin) * 0.06 || 0.05;
    return {
      lonMin: lonMin - padLon,
      lonMax: lonMax + padLon,
      latMin: latMin - padLat,
      latMax: latMax + padLat,
    };
  }, [gisLayers, gisZoomMode]);

  // Draw GeoJSON GIS Map
  useEffect(() => {
    if (tab !== 'gis' || !gisCanvasRef.current) return;
    const canvas = gisCanvasRef.current;
    const W = 680;
    const H = 320;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgb(8, 15, 28)';
    ctx.fillRect(0, 0, W, H);

    // Subtle lat/lon graticule
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const gx = (W * i) / 6;
      const gy = (H * i) / 6;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }

    const project = (lon: number, lat: number): [number, number] => {
      const x = ((lon - gisBounds.lonMin) / Math.max(1e-6, gisBounds.lonMax - gisBounds.lonMin)) * W;
      const y = H - ((lat - gisBounds.latMin) / Math.max(1e-6, gisBounds.latMax - gisBounds.latMin)) * H;
      return [x, y];
    };

    for (const layer of gisLayers) {
      if (!layer.visible || !layer.data?.features) continue;
      ctx.strokeStyle = layer.stroke;
      ctx.fillStyle = layer.fill;
      ctx.lineWidth = layer.lineWidth;

      for (const feat of layer.data.features) {
        const g = feat.geometry;
        if (!g) continue;
        if (g.type === 'Polygon') {
          drawPolygonRings(ctx, g.coordinates as number[][][], project);
        } else if (g.type === 'MultiPolygon') {
          for (const poly of g.coordinates as number[][][][]) {
            drawPolygonRings(ctx, poly, project);
          }
        } else if (g.type === 'LineString') {
          ctx.beginPath();
          (g.coordinates as number[][]).forEach((pt, idx) => {
            const [x, y] = project(pt[0], pt[1]);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        } else if (g.type === 'Point') {
          const [px, py] = project(
            (g.coordinates as number[])[0],
            (g.coordinates as number[])[1]
          );
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    // Reference anchor dot: Langtang Lirung / Detachment Source
    const [sx, sy] = project(85.521, 28.29);
    ctx.fillStyle = 'rgb(251, 191, 36)';
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 11px monospace';
    ctx.fillText('Detachment Zone (28.29°N, 85.52°E)', Math.min(W - 220, sx + 8), Math.max(16, sy - 6));
  }, [tab, gisLayers, gisBounds]);

  const maxRainfallMm = useMemo(() => {
    const rows = datumBundle?.rainfall?.series ?? [];
    return Math.max(
      1,
      ...rows.map((r) => Math.max(r.imerg_mm_day, r.power_corrected_mm_day))
    );
  }, [datumBundle]);

  return (
    <div
      data-testid="rasuwa-datum-explorer"
      className={`rounded-lg border border-cyan-500/40 bg-slate-950/90 text-slate-100 ${
        compact ? 'p-3 space-y-3' : 'p-4 space-y-4'
      }`}
    >
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
            Real NASA · ASF · OPERA · Sentinel-1D · GPM IMERG · Copernicus Datum (26 Aug 2026)
          </div>
          <h4 className="text-sm font-mono font-bold text-white mt-0.5">
            Rasuwa–Bhotekoshi Multi-Sensor Research Explorer ({RASUWA_DATUM_STATIC_FACTS.cmrExactGranules.toLocaleString()} Exact-AOI CMR Granules)
          </h4>
        </div>
        {validatedManifest && (
          <span className="px-2 py-1 rounded border border-emerald-400/50 bg-emerald-950/60 text-emerald-200 text-[10px] font-mono font-bold">
            {validatedManifest.classification} · {validatedManifest.maturity} · CRID {validatedManifest.crid}
          </span>
        )}
      </div>

      {/* Key Empirical Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] font-mono">
        <div className="rounded border border-slate-800 bg-slate-900/80 p-2">
          <div className="text-slate-400">HydroBASINS Catchment</div>
          <div className="text-cyan-300 font-bold">
            {RASUWA_DATUM_STATIC_FACTS.catchmentAreaKm2} km² · {RASUWA_DATUM_STATIC_FACTS.glacialLakesCount} lakes
          </div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900/80 p-2">
          <div className="text-slate-400">NISAR L2 GUNW Phase</div>
          <div className="text-rose-300 font-bold">
            {RASUWA_DATUM_STATIC_FACTS.nisarPhaseValidSource} (Diagnosed Failure)
          </div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900/80 p-2">
          <div className="text-slate-400">S1D &amp; OPERA Consensus</div>
          <div className="text-amber-300 font-bold">
            {RASUWA_DATUM_STATIC_FACTS.s1dTargetFlagged} · {RASUWA_DATUM_STATIC_FACTS.operaConsensusEventKm2} km²
          </div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900/80 p-2">
          <div className="text-slate-400">GPM IMERG at Collapse</div>
          <div className="text-emerald-300 font-bold">
            {RASUWA_DATUM_STATIC_FACTS.imergEventHalfHourMmHr.toFixed(1)} mm/hr (02:30–02:59Z)
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Rasuwa Real NASA Datum Views">
        {(
          [
            { id: 'geotiff', label: '🛰️ Real GeoTIFF Raster Canvas (5)' },
            { id: 'gis', label: '🗺️ Interactive GIS Boundaries (4 GeoJSONs)' },
            { id: 'coherence', label: '📡 L vs C Coherence & WebP Plates' },
            { id: 'rainfall', label: '🌧️ GPM IMERG Rain & CMR Latency' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`px-3 py-1.5 rounded border text-xs font-mono cursor-pointer transition ${
              tab === item.id
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 font-bold'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* TAB 1: REAL GEOTIFF RASTER INSPECTOR */}
      {tab === 'geotiff' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {BUNDLED_RASUWA_GEOTIFF_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedPresetId(preset.id)}
                className={`px-2.5 py-1.5 rounded border text-[11px] font-mono cursor-pointer ${
                  selectedPresetId === preset.id
                    ? 'bg-amber-400 text-slate-950 border-white font-bold'
                    : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-amber-400/60'
                }`}
              >
                {preset.shortLabel}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded border border-slate-800 bg-slate-900/70 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 mb-2">
                <strong>{selectedPreset.title}</strong>
                <span>{selectedPreset.crs}</span>
              </div>

              <div className="relative flex items-center justify-center bg-slate-950 rounded border border-slate-800 min-h-[210px] overflow-hidden">
                {geotiffLoading ? (
                  <span className="text-xs font-mono text-cyan-300">Decoding binary GeoTIFF raster…</span>
                ) : geotiffError ? (
                  <span className="text-xs font-mono text-rose-300 px-3">{geotiffError}</span>
                ) : (
                  <canvas
                    ref={rasterCanvasRef}
                    data-testid="rasuwa-geotiff-canvas"
                    className="max-w-full max-h-[240px] object-contain"
                  />
                )}
              </div>

              {geotiffSummary && (
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-300">
                  <span>p02: {geotiffSummary.p2Val}</span>
                  <span>mean: {geotiffSummary.meanVal} ({selectedPreset.units})</span>
                  <span>p98: {geotiffSummary.p98Val}</span>
                </div>
              )}
            </div>

            <div className="rounded border border-slate-800 bg-slate-900/70 p-3 space-y-2 text-[11px] font-mono">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-400/50 text-sky-200 font-bold">
                  {selectedPreset.classification} · {selectedPreset.maturity}
                </span>
                <span className="text-slate-400">{selectedPreset.shapeLabel}</span>
              </div>
              <div>
                <strong className="text-slate-300">Sensor:</strong> {selectedPreset.sensor}
              </div>
              <div>
                <strong className="text-slate-300">Acquisition Window:</strong> {selectedPreset.acquisitionWindow}
              </div>
              <div className="break-all text-[10px] text-slate-400">
                <strong className="text-slate-300">Granule ID:</strong> {selectedPreset.granuleId}
              </div>
              <div className="break-all text-[10px] text-slate-400">
                <strong className="text-slate-300">SHA-256:</strong> {selectedPreset.sha256}
              </div>
              {geotiffSummary && (
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-cyan-200">
                  <div>Raster: {geotiffSummary.width} × {geotiffSummary.height} px</div>
                  <div>Valid: {geotiffSummary.validPixels.toLocaleString()} px</div>
                  <div>Min / Max: {geotiffSummary.minVal} / {geotiffSummary.maxVal}</div>
                  <div>Format: {geotiffSummary.sampleFormatLabel}</div>
                </div>
              )}
              <div className="rounded border border-amber-500/40 bg-amber-950/30 p-2 text-amber-100 leading-relaxed">
                <strong>Scientific Guardrail:</strong> {selectedPreset.interpretationLimit}
              </div>
              <a
                href={selectedPreset.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-cyan-300 underline"
              >
                Open Official NASA/ASF/Copernicus Source Granule ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE GIS GEOJSON BOUNDARIES */}
      {tab === 'gis' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex flex-wrap gap-2">
              {gisLayers.map((layer) => (
                <label
                  key={layer.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-700 bg-slate-900 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={layer.visible}
                    onChange={() =>
                      setGisLayers((prev) =>
                        prev.map((l) => (l.id === layer.id ? { ...l, visible: !l.visible } : l))
                      )
                    }
                  />
                  <span>{layer.label}</span>
                  <span className="text-slate-400">({layer.data?.features?.length ?? 0})</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGisZoomMode('basin')}
                className={`px-2 py-1 rounded border cursor-pointer ${
                  gisZoomMode === 'basin'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 font-bold'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                Full HydroBASINS (4,774 km²)
              </button>
              <button
                type="button"
                onClick={() => setGisZoomMode('source')}
                className={`px-2 py-1 rounded border cursor-pointer ${
                  gisZoomMode === 'source'
                    ? 'bg-rose-500/20 border-rose-400 text-rose-100 font-bold'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                Zoom Source Detachment
              </button>
            </div>
          </div>

          <div className="rounded border border-slate-800 bg-slate-950 p-2">
            <canvas
              ref={gisCanvasRef}
              data-testid="rasuwa-gis-canvas"
              className="w-full h-auto max-h-[300px] block"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const u = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const v = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                const lon = gisBounds.lonMin + u * (gisBounds.lonMax - gisBounds.lonMin);
                const lat = gisBounds.latMax - v * (gisBounds.latMax - gisBounds.latMin);
                setGisCursorCoord(`${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
              }}
              onMouseLeave={() => setGisCursorCoord(null)}
            />
            <div className="mt-1.5 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400">
              <span>
                Extent: {gisBounds.latMin.toFixed(3)}–{gisBounds.latMax.toFixed(3)}°N,{' '}
                {gisBounds.lonMin.toFixed(3)}–{gisBounds.lonMax.toFixed(3)}°E
              </span>
              <span>{gisCursorCoord ? `Cursor: ${gisCursorCoord}` : 'Hover map to read WGS84 coordinates'}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: L-BAND VS C-BAND COHERENCE & WEBP PLATES */}
      {tab === 'coherence' && (
        <div className="space-y-3 text-[11px] font-mono">
          {datumBundle?.coherence && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="rounded border border-sky-500/40 bg-slate-900/70 p-2.5 space-y-1">
                <div className="font-bold text-sky-300">{datumBundle.coherence.c_band.sensor}</div>
                <div>
                  Target median γ: {datumBundle.coherence.c_band.quiet_target_median.toFixed(4)} →{' '}
                  <strong className="text-amber-300">
                    {datumBundle.coherence.c_band.event_target_median.toFixed(4)}
                  </strong>{' '}
                  (Δ {datumBundle.coherence.c_band_target_delta.toFixed(4)})
                </div>
                {datumBundle.screeningMask && (
                  <div className="text-slate-300">
                    Screening mask: <strong>{datumBundle.screeningMask.target_filtered_anomaly_pixels}/{datumBundle.screeningMask.target_valid_pixels}</strong> target pixels flagged vs{' '}
                    <strong>{datumBundle.screeningMask.control_filtered_false_alarm_pixels}/{datumBundle.screeningMask.control_valid_pixels}</strong> control false alarms.
                  </div>
                )}
              </div>

              <div className="rounded border border-rose-500/40 bg-slate-900/70 p-2.5 space-y-1">
                <div className="font-bold text-rose-300">{datumBundle.coherence.l_band.sensor} (Honest Failure Audit)</div>
                <div>
                  Target median γ: {datumBundle.coherence.l_band.quiet_target_median.toFixed(4)} →{' '}
                  <strong className="text-rose-300">
                    {datumBundle.coherence.l_band.event_target_median.toFixed(4)}
                  </strong>{' '}
                  (Control: {datumBundle.coherence.l_band.event_control_median.toFixed(4)})
                </div>
                <div className="text-rose-200">
                  Connected phase survived in only <strong>{datumBundle.coherence.l_band.event_phase_valid_pixels}/{datumBundle.coherence.l_band.event_phase_total_pixels}</strong> source pixels — no displacement reported.
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {[
              {
                src: '/rasuwa-datum/handoff/cband_coherence_comparison.webp',
                caption: 'Sentinel-1D C-Band Coherence Plate (158/307 target vs 1,225/30,161 control)',
              },
              {
                src: '/rasuwa-datum/handoff/lband_coherence_comparison.webp',
                caption: 'NISAR L-Band GUNW Plate (9/528 connected pixels — Phase Failure Audit)',
              },
              {
                src: '/rasuwa-datum/handoff/coherence_loss_screening_mask.webp',
                caption: 'Sentinel-1D Coherence Loss Screening Mask Overlay',
              },
              {
                src: '/rasuwa-datum/handoff/sar_change_overlay.webp',
                caption: 'OPERA L2 RTC-S1 3-View Consensus Change Overlay (1.1871 km²)',
              },
            ].map((plate) => (
              <figure key={plate.src} className="rounded border border-slate-800 bg-slate-900 p-2 space-y-1">
                <img
                  src={plate.src}
                  alt={plate.caption}
                  className="w-full h-36 object-contain bg-slate-950 rounded"
                />
                <figcaption className="text-[10px] text-slate-300">{plate.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: GPM IMERG RAINFALL & LATENCY CLOCKS */}
      {tab === 'rainfall' && (
        <div className="space-y-3 text-[11px] font-mono">
          {datumBundle?.rainfall && (
            <div className="rounded border border-slate-800 bg-slate-900/70 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-emerald-300">
                  GPM IMERG Half-Hour Event Window (26 Aug 2026 02:30Z–02:59Z)
                </strong>
                <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-400/50 text-emerald-200">
                  {datumBundle.rainfall.native_imerg_event_half_hour[0]?.precipitation_rate_mm_hr.toFixed(1) ?? '0.0'} mm/hr · Refutes instantaneous storm trigger
                </span>
              </div>

              <div className="flex items-end gap-1 h-24 pt-2 border-b border-slate-700 overflow-x-auto">
                {datumBundle.rainfall.series.slice(-18).map((row) => {
                  const pct = Math.max(4, Math.round((row.imerg_mm_day / maxRainfallMm) * 100));
                  const isEventDay = row.date_utc === '2026-08-26';
                  return (
                    <div
                      key={row.date_utc}
                      title={`${row.date_utc}: IMERG ${row.imerg_mm_day.toFixed(1)} mm/d • POWER ${row.power_corrected_mm_day.toFixed(1)} mm/d`}
                      className="flex-1 min-w-[14px] flex flex-col items-center justify-end h-full"
                    >
                      <div
                        className={`w-full rounded-t ${
                          isEventDay ? 'bg-rose-400' : 'bg-cyan-400/80'
                        }`}
                        style={{ height: `${pct}%` }}
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5">
                        {row.date_utc.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400">{datumBundle.rainfall.limitations}</p>
            </div>
          )}

          {datumBundle && datumBundle.latencyRows.length > 0 && (
            <div className="rounded border border-slate-800 bg-slate-900/70 p-2.5 overflow-x-auto">
              <div className="font-bold text-amber-300 mb-1.5">
                Acquisition vs. CMR Archive Availability Clocks
              </div>
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="py-1 pr-2">Product</th>
                    <th className="py-1 pr-2">Maturity</th>
                    <th className="py-1 pr-2">Acq Offset</th>
                    <th className="py-1 pr-2">CMR Archive Offset</th>
                    <th className="py-1">Usability</th>
                  </tr>
                </thead>
                <tbody>
                  {datumBundle.latencyRows.map((row) => (
                    <tr key={row.mission_product} className="border-b border-slate-800/80 text-slate-200">
                      <td className="py-1 pr-2 font-bold">{row.mission_product}</td>
                      <td className="py-1 pr-2">{row.maturity}</td>
                      <td className="py-1 pr-2">
                        {row.acquisition_offset_days !== null ? `+${row.acquisition_offset_days.toFixed(2)}d` : '—'}
                      </td>
                      <td className="py-1 pr-2">
                        {row.archive_insertion_offset_days !== null ? `+${row.archive_insertion_offset_days.toFixed(2)}d` : '—'}
                      </td>
                      <td className="py-1 text-slate-300">{row.usability_for_this_study}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
