import { fromArrayBuffer, fromBlob, fromUrl } from 'geotiff';

export interface ParsedGeoTiffSummary {
  sourceName: string;
  sourceKind: 'LOCAL_FILE' | 'REMOTE_COG_URL' | 'SAMPLE_SYNTHETIC_TIFF' | 'BUNDLED_NASA_GEOTIFF';
  width: number;
  height: number;
  previewWidth: number;
  previewHeight: number;
  bandCount: number;
  selectedBandIndex?: number;
  bitsPerSample: number;
  sampleFormatLabel: string;
  crsLabel: string;
  bbox: [number, number, number, number] | null;
  minVal: number;
  maxVal: number;
  meanVal: number;
  p2Val: number;
  p98Val: number;
  validPixels: number;
  nodataPixels: number;
  previewGrid: Float32Array;
}

function writeAsciiTag(view: DataView, offset: number, tag: number, type: number, count: number, valueOrOffset: number) {
  view.setUint16(offset, tag, true);
  view.setUint16(offset + 2, type, true);
  view.setUint32(offset + 4, count, true);
  view.setUint32(offset + 8, valueOrOffset, true);
}

/**
 * Builds a valid IEEE-754 little-endian Float32 TIFF binary representing
 * a synthetic Dual-Pol SAR backscatter (dB) scene with dark flood water (-21 dB)
 * and bright landslide/urban scatter (-5 dB). Useful for testing real binary TIFF
 * ingestion offline or exporting as a downloadable .tif fixture.
 */
export function createSampleSarFloat32TiffBuffer(width = 72, height = 48): ArrayBuffer {
  const numPixels = width * height;
  const pixelByteLength = numPixels * 4;
  const numTags = 10;
  const headerSize = 8;
  const ifdSize = 2 + numTags * 12 + 4;
  const pixelOffset = headerSize + ifdSize;
  const totalBytes = pixelOffset + pixelByteLength;

  const buf = new ArrayBuffer(totalBytes);
  const view = new DataView(buf);

  // Little-endian TIFF header ("II", 42, offset=8)
  view.setUint8(0, 0x49);
  view.setUint8(1, 0x49);
  view.setUint16(2, 42, true);
  view.setUint32(4, headerSize, true);

  let cursor = headerSize;
  view.setUint16(cursor, numTags, true);
  cursor += 2;

  // Sorted ascending by TIFF tag ID (required by baseline TIFF spec)
  writeAsciiTag(view, cursor, 256, 4, 1, width); cursor += 12; // ImageWidth
  writeAsciiTag(view, cursor, 257, 4, 1, height); cursor += 12; // ImageLength
  writeAsciiTag(view, cursor, 258, 3, 1, 32); cursor += 12; // BitsPerSample = 32
  writeAsciiTag(view, cursor, 259, 3, 1, 1); cursor += 12; // Compression = Uncompressed
  writeAsciiTag(view, cursor, 262, 3, 1, 1); cursor += 12; // PhotometricInterpretation = BlackIsZero
  writeAsciiTag(view, cursor, 273, 4, 1, pixelOffset); cursor += 12; // StripOffsets
  writeAsciiTag(view, cursor, 277, 3, 1, 1); cursor += 12; // SamplesPerPixel = 1
  writeAsciiTag(view, cursor, 278, 4, 1, height); cursor += 12; // RowsPerStrip
  writeAsciiTag(view, cursor, 279, 4, 1, pixelByteLength); cursor += 12; // StripByteCounts
  writeAsciiTag(view, cursor, 339, 3, 1, 3); cursor += 12; // SampleFormat = 3 (IEEE Floating Point)
  view.setUint32(cursor, 0, true); // Next IFD offset = 0

  // Deterministic SAR dB backscatter surface: braided river channel + landslide boulder lobe + village corner reflectors
  let pOff = pixelOffset;
  for (let y = 0; y < height; y++) {
    const v = y / (height - 1);
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1);
      const riverCenter = 0.28 + 0.14 * Math.sin(v * Math.PI * 1.4);
      const distRiver = Math.abs(u - riverCenter);
      const distSlide = Math.hypot((u - 0.68) * 1.3, v - 0.42);
      const distVillage = Math.hypot(u - 0.38, v - 0.74);

      let db = -11.8 + Math.sin(u * 18) * 0.9 + Math.cos(v * 14) * 0.8;
      if (distRiver < 0.08) {
        // Specular flood water drop
        db = -21.5 + (distRiver / 0.08) * 3.2;
      } else if (distSlide < 0.18) {
        // Rough avalanche/landslide boulder scatter
        db = -4.2 - (distSlide / 0.18) * 4.5;
      } else if (distVillage < 0.07) {
        // Double-bounce village structures
        db = -3.1;
      }
      view.setFloat32(pOff, Number(db.toFixed(3)), true);
      pOff += 4;
    }
  }

  return buf;
}

async function extractSummaryFromTiff(
  tiff: Awaited<ReturnType<typeof fromArrayBuffer>>,
  sourceName: string,
  sourceKind: ParsedGeoTiffSummary['sourceKind'],
  bandIndex = 0
): Promise<ParsedGeoTiffSummary> {
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const bandCount = image.getSamplesPerPixel();
  const safeBand = Math.max(0, Math.min(bandCount - 1, bandIndex));
  const bitsPerSampleRaw = image.getBitsPerSample() as number | number[] | undefined;
  const bitsPerSample = Array.isArray(bitsPerSampleRaw)
    ? (bitsPerSampleRaw[0] ?? 16)
    : typeof bitsPerSampleRaw === 'number'
      ? bitsPerSampleRaw
      : 16;
  const fileDir = image.getFileDirectory() as unknown as Record<string, unknown>;
  const rawSf = typeof (image as unknown as { getSampleFormat?: (s?: number) => number }).getSampleFormat === 'function'
    ? (image as unknown as { getSampleFormat: (s?: number) => number }).getSampleFormat(0)
    : (fileDir.SampleFormat as ArrayLike<number> | undefined)?.[0] ?? fileDir.SampleFormat;
  const sampleFormatLabel =
    rawSf === 3
      ? 'Float32 (IEEE-754)'
      : rawSf === 2
        ? 'Signed Int'
        : 'Unsigned Int';

  const geoKeys = (image.getGeoKeys() ?? {}) as Record<string, unknown>;
  const epsg = geoKeys.ProjectedCSTypeGeoKey || geoKeys.GeographicTypeGeoKey;
  const crsLabel = epsg ? `EPSG:${epsg}` : 'Pixel Grid (No EPSG Header)';

  let bbox: [number, number, number, number] | null = null;
  try {
    const rawBox = image.getBoundingBox();
    if (Array.isArray(rawBox) && rawBox.length === 4 && rawBox.every(Number.isFinite)) {
      bbox = [rawBox[0], rawBox[1], rawBox[2], rawBox[3]];
    }
  } catch {
    bbox = null;
  }

  // Downsample large COGs smoothly for instant browser inspection
  const maxPreviewW = 144;
  const maxPreviewH = 96;
  const scale = Math.min(1, maxPreviewW / Math.max(1, width), maxPreviewH / Math.max(1, height));
  const previewWidth = Math.max(1, Math.round(width * scale));
  const previewHeight = Math.max(1, Math.round(height * scale));

  const rasterRes = await image.readRasters({
    width: previewWidth,
    height: previewHeight,
    samples: [safeBand],
  });
  const firstBand = rasterRes[0] as ArrayLike<number>;
  const nodataVal = image.getGDALNoData();

  const validList: number[] = [];
  const previewGrid = new Float32Array(previewWidth * previewHeight);
  let nodataPixels = 0;

  for (let i = 0; i < previewGrid.length; i++) {
    const val = Number(firstBand[i]);
    const isNodata =
      !Number.isFinite(val) ||
      (nodataVal !== null && nodataVal !== undefined && Math.abs(val - nodataVal) < 1e-6) ||
      val <= -9990;
    if (isNodata) {
      nodataPixels++;
      previewGrid[i] = Number.NaN;
    } else {
      previewGrid[i] = val;
      validList.push(val);
    }
  }

  if (validList.length === 0) {
    throw new Error('No finite pixel values found in Band 1 of GeoTIFF.');
  }

  const sorted = [...validList].sort((a, b) => a - b);
  const minVal = sorted[0];
  const maxVal = sorted[sorted.length - 1];
  const sum = validList.reduce((acc, v) => acc + v, 0);
  const meanVal = sum / validList.length;
  const p2Val = sorted[Math.floor((sorted.length - 1) * 0.02)];
  const p98Val = sorted[Math.floor((sorted.length - 1) * 0.98)];

  return {
    sourceName,
    sourceKind,
    width,
    height,
    previewWidth,
    previewHeight,
    bandCount,
    selectedBandIndex: safeBand,
    bitsPerSample,
    sampleFormatLabel,
    crsLabel,
    bbox,
    minVal: Number(minVal.toFixed(3)),
    maxVal: Number(maxVal.toFixed(3)),
    meanVal: Number(meanVal.toFixed(3)),
    p2Val: Number(p2Val.toFixed(3)),
    p98Val: Number(p98Val.toFixed(3)),
    validPixels: validList.length,
    nodataPixels,
    previewGrid,
  };
}

export async function inspectGeoTiffFromArrayBuffer(
  buffer: ArrayBuffer,
  sourceName: string,
  sourceKind: ParsedGeoTiffSummary['sourceKind'] = 'SAMPLE_SYNTHETIC_TIFF'
): Promise<ParsedGeoTiffSummary> {
  const tiff = await fromArrayBuffer(buffer);
  return extractSummaryFromTiff(tiff, sourceName, sourceKind);
}

export async function inspectGeoTiffFromFile(file: File): Promise<ParsedGeoTiffSummary> {
  const tiff = await fromBlob(file);
  return extractSummaryFromTiff(tiff, file.name, 'LOCAL_FILE');
}

export async function inspectCogFromUrl(url: string): Promise<ParsedGeoTiffSummary> {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('Enter a valid http:// or https:// Cloud-Optimized GeoTIFF URL.');
  }
  const tiff = await fromUrl(trimmed);
  const shortName = trimmed.split('/').pop() || 'remote-cog.tif';
  return extractSummaryFromTiff(tiff, shortName, 'REMOTE_COG_URL');
}

export async function inspectBundledGeoTiff(
  publicPath: string,
  displayName?: string,
  bandIndex = 0
): Promise<ParsedGeoTiffSummary> {
  const resp = await fetch(publicPath);
  if (!resp.ok) {
    throw new Error(`Failed to load GeoTIFF (${resp.status}) from ${publicPath}`);
  }
  const buffer = await resp.arrayBuffer();
  const tiff = await fromArrayBuffer(buffer);
  const name = displayName || publicPath.split('/').pop() || 'bundled.tif';
  return extractSummaryFromTiff(tiff, name, 'BUNDLED_NASA_GEOTIFF', bandIndex);
}
