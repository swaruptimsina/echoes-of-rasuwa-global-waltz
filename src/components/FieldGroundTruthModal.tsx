import React, { useEffect, useState } from 'react';
import { GlobalRegionDefinition } from '../data/globalRegionsAtlas';
import { Station } from '../types';
import { getCharacterSprite } from '../game/biomePixelArtEngine';
import { retroAudio } from '../audio/retroAudioAndVoice';

interface FieldGroundTruthModalProps {
  station: Station | null;
  region: GlobalRegionDefinition;
  isScanned: boolean;
  isHypothesisVerified: boolean;
  interventionDeployed: boolean;
  onCompleteScan: (stationId: string) => void;
  onVerifyHypothesis: (stationId: string) => void;
  onOpenPhotos: (stationId: string) => void;
  onClose: () => void;
}

export const FieldGroundTruthModal: React.FC<FieldGroundTruthModalProps> = ({
  station,
  region,
  isScanned,
  isHypothesisVerified,
  interventionDeployed,
  onCompleteScan,
  onVerifyHypothesis,
  onOpenPhotos,
  onClose
}) => {
  const [azimuthDeg, setAzimuthDeg] = useState<number>(() =>
    isScanned ? 0 : -22
  );
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'wrong' | 'correct'>(
    isHypothesisVerified ? 'correct' : 'idle'
  );

  useEffect(() => {
    if (!station) return;
    setAzimuthDeg(isScanned ? 0 : -22);
    setSelectedOption(
      isHypothesisVerified && station.physicalDriverHypothesis
        ? station.physicalDriverHypothesis.correctIndex
        : null
    );
    setFeedbackState(isHypothesisVerified ? 'correct' : 'idle');
  }, [station, isScanned, isHypothesisVerified]);

  useEffect(() => {
    if (!station) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [station, onClose]);

  if (!station) return null;

  const isAligned = Math.abs(azimuthDeg) <= 6;
  const signalGainPct = Math.max(
    12,
    Math.round(100 - Math.min(88, Math.abs(azimuthDeg) * 2.4))
  );
  const rcsDb = (28.4 - Math.abs(azimuthDeg) * 0.55).toFixed(1);

  const handleSliderChange = (val: number) => {
    setAzimuthDeg(val);
    if (Math.abs(val) <= 6 && !isScanned) {
      retroAudio.playDiscoveryChime();
      onCompleteScan(station.id);
    }
  };

  const handleAutoAlign = () => {
    setAzimuthDeg(0);
    retroAudio.playDiscoveryChime();
    if (!isScanned) {
      onCompleteScan(station.id);
    }
  };

  const handleAnswerHypothesis = (idx: number) => {
    if (!station.physicalDriverHypothesis) return;
    setSelectedOption(idx);
    if (!isScanned) {
      setAzimuthDeg(0);
      onCompleteScan(station.id);
    }
    if (idx === station.physicalDriverHypothesis.correctIndex) {
      setFeedbackState('correct');
      retroAudio.playDiscoveryChime();
      if (!isHypothesisVerified) {
        onVerifyHypothesis(station.id);
      }
    } else {
      setFeedbackState('wrong');
      retroAudio.playBlip();
    }
  };

  const portraitSrc = getCharacterSprite(region.playerPalette, 'down', 0).toDataURL();

  return (
    <div className="field-gt-backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Simulated field evidence exercise" className="field-gt-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="field-gt-header">
          <div className="field-gt-header-left">
            <span className="field-gt-code-pill">
              {station.code}
            </span>
            <div>
              <div className="field-gt-title">
                📡 {station.name} — Practice Dish &amp; Field Quiz
              </div>
              <div className="field-gt-subtitle">
                {station.nepaliSub} • {station.lat.toFixed(2)}°, {station.lon.toFixed(2)}° • Height{' '}
                {station.elevationM.toLocaleString()}m •{' '}
                <span className="field-gt-prov-tag">
                  {region.scientificIntegrity.isForwardScenarioSimulated
                    ? 'PRACTICE GAME • NOT REAL SENSOR DATA'
                    : 'PRACTICE GAME • EXAMPLE NUMBERS ONLY'}
                </span>
              </div>
            </div>
          </div>
          <button type="button" className="field-gt-close-btn" onClick={onClose}>
            ✕ Close [ESC]
          </button>
        </div>

        <div className="field-gt-body">
          {/* Left Column: Step 1 — Trihedral Corner Reflector Alignment + Measured Telemetry */}
          <div className="field-gt-col">
            <div className="field-gt-card">
              <div className="field-gt-step-header">
                <span className="field-gt-step-badge">STEP 1 • AIM THE METAL MIRROR DISH</span>
                <span
                  className={`field-gt-status-pill ${isScanned || isAligned ? 'locked' : 'pending'}`}
                >
                  {isScanned || isAligned ? 'DISH AIMED RIGHT!' : 'SLIDE DISH TO 0°'}
                </span>
              </div>

              <p className="field-gt-desc">
                Point this shiny Metal Mirror Dish straight at the{' '}
                <strong>NISAR satellite (0°)</strong> so space radar waves bounce right back! (Just a practice mini-game — no real dish is connected):
              </p>

              <div className="field-gt-align-box">
                <div className="field-gt-signal-row">
                  <span>
                    Aim Angle: <strong>{azimuthDeg > 0 ? `+${azimuthDeg}°` : `${azimuthDeg}°`}</strong>
                  </span>
                  <span>
                    Signal Strength: <strong style={{ color: isAligned ? 'var(--game-safe)' : 'var(--game-accent)' }}>+{rcsDb} dBsm ({signalGainPct}%)</strong>
                  </span>
                </div>

                <div className="field-gt-meter-track">
                  <div
                    className={`field-gt-meter-fill ${isAligned ? 'locked' : ''}`}
                    style={{ width: `${signalGainPct}%` }}
                  />
                </div>

                <div className="field-gt-slider-row">
                  <input
                    type="range"
                    min={-35}
                    max={35}
                    step={1}
                    value={azimuthDeg}
                    onChange={(e) => handleSliderChange(Number(e.target.value))}
                    className="field-gt-slider"
                    aria-label="Corner reflector orbital azimuth alignment"
                  />
                  <button
                    type="button"
                    className="field-gt-auto-btn"
                    onClick={handleAutoAlign}
                  >
                    ⚡ Auto-Lock 0°
                  </button>
                </div>
              </div>

              {/* Simulated Radar Readings Table */}
              <div className="field-gt-telemetry-title">
                📊 Practice radar numbers (not real field sensors)
              </div>
              <div className="field-gt-pass-grid">
                <div className="field-gt-pass-box">
                  <div className="field-gt-pass-tag">PASS 1 • NORMAL</div>
                  <div className="field-gt-pass-val">{station.baselineMetrics.displacementText}</div>
                  <div className="field-gt-pass-sub">
                    Water {station.baselineMetrics.hhDb} dB • Trees {station.baselineMetrics.hvDb} dB • Match{' '}
                    {station.baselineMetrics.coherence.toFixed(2)}
                  </div>
                </div>
                <div className="field-gt-pass-box warn">
                  <div className="field-gt-pass-tag">PASS 2 • EARLY SIGN</div>
                  <div className="field-gt-pass-val">{station.precursorMetrics.displacementText}</div>
                  <div className="field-gt-pass-sub">
                    Water {station.precursorMetrics.hhDb} dB • Trees {station.precursorMetrics.hvDb} dB • Match{' '}
                    {station.precursorMetrics.coherence.toFixed(2)}
                  </div>
                </div>
                <div className="field-gt-pass-box crit">
                  <div className="field-gt-pass-tag">PASS 4 • BIG EVENT</div>
                  <div className="field-gt-pass-val">{station.catastropheMetrics.displacementText}</div>
                  <div className="field-gt-pass-sub">
                    Water {station.catastropheMetrics.hhDb} dB • Trees {station.catastropheMetrics.hvDb} dB • Match{' '}
                    {station.catastropheMetrics.coherence.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="field-gt-insight-callout">
                <strong>🛰️ What Space Radar Sees Here:</strong> {station.nisarInsight}
              </div>
            </div>
          </div>

          {/* Right Column: Local Witness Story + Step 2 Physical Driver Deduction */}
          <div className="field-gt-col">
            {/* Local Human Testimony Card */}
            <div className="field-gt-witness-card">
              <div className="field-gt-witness-top">
                <img
                  src={portraitSrc}
                  alt="Field log"
                  className="field-gt-portrait"
                />
                <div>
                  <div className="field-gt-witness-name">
                    🗣️ {station.npcName} — <span>{station.npcRole}</span>
                  </div>
                  <div className="field-gt-witness-stakes">
                    {station.humanEconomicStory}
                  </div>
                </div>
              </div>
              <blockquote
                className={`field-gt-quote ${interventionDeployed ? 'post-recovery' : ''}`}
              >
                “{interventionDeployed ? station.npcDialoguePost : station.npcDialoguePre}”
                <span className="field-gt-quote-badge">
                  {interventionDeployed
                    ? 'FICTIONAL POST-EXERCISE SCENE'
                    : 'FICTIONAL CHARACTER DIALOGUE'}
                </span>
              </blockquote>
            </div>

            {/* Step 2: Physical Driver Hypothesis Verification */}
            {station.physicalDriverHypothesis && (
              <div className="field-gt-card hypothesis-card">
                <div className="field-gt-step-header">
                  <span className="field-gt-step-badge">
                    STEP 2 • QUICK QUIZ: WHAT CAUSED THIS?
                  </span>
                  <span
                    className={`field-gt-status-pill ${
                      feedbackState === 'correct' ? 'locked' : 'quiz'
                    }`}
                  >
                    {feedbackState === 'correct'
                      ? 'QUIZ SOLVED! (+50 PTS)'
                      : 'PICK THE BEST ANSWER'}
                  </span>
                </div>

                <div className="field-gt-question">
                  {station.physicalDriverHypothesis.question}
                </div>

                <div className="field-gt-options">
                  {station.physicalDriverHypothesis.options.map((opt, idx) => {
                    const isCorrectOpt =
                      idx === station.physicalDriverHypothesis!.correctIndex;
                    const isPicked = selectedOption === idx;
                    let cls = 'field-gt-opt-btn';
                    if (feedbackState === 'correct' && isCorrectOpt) cls += ' correct';
                    else if (feedbackState === 'wrong' && isPicked && !isCorrectOpt)
                      cls += ' wrong';

                    return (
                      <button
                        key={idx}
                        type="button"
                        className={cls}
                        onClick={() => handleAnswerHypothesis(idx)}
                      >
                        <span className="field-gt-opt-letter">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {feedbackState === 'wrong' && (
                  <div className="field-gt-feedback wrong">
                    Not quite! Remember: long 24 cm space radar sees right through clouds and tree leaves, while normal cameras get blocked. Try another answer!
                  </div>
                )}

                {feedbackState === 'correct' && (
                  <div className="field-gt-feedback correct">
                    <strong>Why that&apos;s right:</strong>{' '}
                    {station.physicalDriverHypothesis.explanation}
                  </div>
                )}
              </div>
            )}

            <div className="field-gt-footer-actions">
              <button
                type="button"
                className="field-gt-photo-btn"
                onClick={() => {
                  onClose();
                  onOpenPhotos(station.id);
                }}
              >
                📸 See Photos Here ({station.code})
              </button>
              <button
                type="button"
                className="field-gt-done-btn"
                onClick={() => {
                  if (!isScanned) onCompleteScan(station.id);
                  onClose();
                }}
              >
                {isScanned ? '✓ Back to Map' : '✓ Save & Close'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

