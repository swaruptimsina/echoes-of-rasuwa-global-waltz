export type RadarWaveBand = 'L' | 'C';

export interface WaveAlignmentMetrics {
  band: RadarWaveBand;
  wavelengthCm: number;
  halfWavelengthCm: number;
  targetDisplacementCm: number;
  userDisplacementCm: number;
  phaseDifferenceRad: number;
  wrappedResidualRad: number;
  alignmentPct: number;
  speckleNoiseRatio: number;
  fringeCycles: number;
  isPhaseLocked: boolean;
}

export interface WaveTraceSample {
  xNorm: number;
  referenceY: number;
  repeatShiftedY: number;
  residualY: number;
}

export function getBandWavelengthCm(band: RadarWaveBand): number {
  return band === 'L' ? 24.0 : 5.6;
}

export function wrapPhaseSignedRad(rad: number): number {
  const twoPi = Math.PI * 2;
  let wrapped = ((rad + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  if (wrapped <= -Math.PI) wrapped += twoPi;
  return wrapped;
}

/**
 * Computes two-way InSAR phase alignment metrics for L-band (24.0 cm) or C-band (5.6 cm).
 * Two-way line-of-sight phase: deltaPhi = (4 * pi / lambda) * deltaR.
 */
export function evaluateInsarWaveAlignment(
  band: RadarWaveBand,
  userSliderPct: number,
  targetDisplacementCm = 40.0,
  canopyCoherencePenalty = 0
): WaveAlignmentMetrics {
  const wavelengthCm = getBandWavelengthCm(band);
  const halfWavelengthCm = wavelengthCm / 2;
  const clampedPct = Math.max(0, Math.min(100, userSliderPct));
  const userDisplacementCm = (clampedPct / 100) * targetDisplacementCm;

  const targetPhaseRad = (4 * Math.PI * targetDisplacementCm) / wavelengthCm;
  const userPhaseRad = (4 * Math.PI * userDisplacementCm) / wavelengthCm;

  // For C-band under dense vegetation, coherence degrades strongly (0.28 penalty -> noisy phase)
  const effectivePenalty = band === 'C' ? Math.max(0.42, canopyCoherencePenalty) : canopyCoherencePenalty;
  const phaseDifferenceRad = userPhaseRad - targetPhaseRad;
  const wrappedResidualRad = wrapPhaseSignedRad(phaseDifferenceRad);

  const normalizedError = Math.min(1, Math.abs(targetDisplacementCm - userDisplacementCm) / Math.max(1, targetDisplacementCm));
  const baseAlignment = Math.max(0, 1 - normalizedError * 1.15);
  const effectiveAlignment = baseAlignment * (1 - effectivePenalty * 0.75);
  const alignmentPct = Math.round(Math.max(0, Math.min(100, effectiveAlignment * 100)));

  const speckleNoiseRatio = Number(
    Math.max(0.04, Math.min(0.95, 1 - alignmentPct / 100 + effectivePenalty * 0.35)).toFixed(3)
  );
  const fringeCycles = Number((userDisplacementCm / halfWavelengthCm).toFixed(2));
  const isPhaseLocked = band === 'L' && alignmentPct >= 88;

  return {
    band,
    wavelengthCm,
    halfWavelengthCm,
    targetDisplacementCm,
    userDisplacementCm: Number(userDisplacementCm.toFixed(1)),
    phaseDifferenceRad: Number(phaseDifferenceRad.toFixed(3)),
    wrappedResidualRad: Number(wrappedResidualRad.toFixed(3)),
    alignmentPct,
    speckleNoiseRatio,
    fringeCycles,
    isPhaseLocked,
  };
}

/**
 * Generates synchronized Pass-1 (Reference) and Pass-2 (Repeat) sine traces for canvas rendering.
 */
export function sampleWaveAlignmentTraces(
  band: RadarWaveBand,
  userSliderPct: number,
  sampleCount = 64,
  targetDisplacementCm = 40.0
): WaveTraceSample[] {
  const metrics = evaluateInsarWaveAlignment(band, userSliderPct, targetDisplacementCm);
  const cycles = band === 'L' ? 3.5 : 8.5;
  const phaseShift = ((targetDisplacementCm - metrics.userDisplacementCm) / metrics.halfWavelengthCm) * Math.PI;
  const count = Math.max(8, sampleCount);
  const out: WaveTraceSample[] = [];

  for (let i = 0; i < count; i++) {
    const xNorm = i / (count - 1);
    const theta = xNorm * Math.PI * 2 * cycles;
    const referenceY = Math.sin(theta);
    const repeatShiftedY = Math.sin(theta + phaseShift);
    const residualY = (referenceY - repeatShiftedY) * 0.5;
    out.push({ xNorm, referenceY, repeatShiftedY, residualY });
  }
  return out;
}
