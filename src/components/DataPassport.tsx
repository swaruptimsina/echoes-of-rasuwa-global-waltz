import React, { useState } from 'react';
import {
  DataClassification,
  ProductManifest,
  ProductMaturity,
  getMaturityDisclaimer
} from '../data/nisarProducts';

export interface DataPassportProps {
  /** Required compile-time classification (Integrity Rule 1) */
  classification: DataClassification;
  title: string;
  maturity?: ProductMaturity;
  granuleId?: string;
  collectionShortName?: string;
  acquisitionDates?: string;
  crid?: string;
  units?: string;
  maskRule?: string;
  sha256?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  credit?: string;
  manifest?: ProductManifest;
  compact?: boolean;
}

interface ClassificationStyleMeta {
  badgeText: string;
  iconGlyph: string;
  patternLabel: string;
  borderStyle: string;
}

const CLASSIFICATION_META: Record<DataClassification, ClassificationStyleMeta> = {
  REAL_NISAR_PRODUCT: {
    badgeText: 'REAL NISAR PRODUCT',
    iconGlyph: '◈',
    patternLabel: '[SOLID DOUBLE BORDER]',
    borderStyle: 'double'
  },
  NASA_PUBLISHED_BROWSE: {
    badgeText: 'NASA PUBLISHED BROWSE',
    iconGlyph: '▣',
    patternLabel: '[SOLID BORDER]',
    borderStyle: 'solid'
  },
  CATALOG_METADATA_LIVE: {
    badgeText: 'CATALOG METADATA • LIVE CMR',
    iconGlyph: '◎',
    patternLabel: '[SOLID BORDER]',
    borderStyle: 'solid'
  },
  CATALOG_SNAPSHOT: {
    badgeText: 'CATALOG SNAPSHOT (2026-11-13)',
    iconGlyph: '◔',
    patternLabel: '[DASHED BORDER]',
    borderStyle: 'dashed'
  },
  MODEL_OUTPUT: {
    badgeText: 'MODEL OUTPUT • CLIMATOLOGY',
    iconGlyph: '≈',
    patternLabel: '[DASHED BORDER]',
    borderStyle: 'dashed'
  },
  REPORTED_ESTIMATE: {
    badgeText: 'REPORTED ESTIMATE • EXTERNAL',
    iconGlyph: '⚑',
    patternLabel: '[DOTTED BORDER]',
    borderStyle: 'dotted'
  },
  ILLUSTRATION: {
    badgeText: 'ILLUSTRATION • SCHEMATIC / UNVERIFIED',
    iconGlyph: '✎',
    patternLabel: '[DOTTED BORDER]',
    borderStyle: 'dotted'
  },
  SIMULATION: {
    badgeText: 'SIMULATION • EDUCATIONAL SCENARIO',
    iconGlyph: '⚙',
    patternLabel: '[DASHED BORDER]',
    borderStyle: 'dashed'
  },
  TEST_FIXTURE: {
    badgeText: 'TEST FIXTURE • SYNTHETIC RASTER',
    iconGlyph: '⬡',
    patternLabel: '[DOTTED BORDER]',
    borderStyle: 'dotted'
  }
};

export const DataPassport: React.FC<DataPassportProps> = ({
  classification,
  title,
  maturity = 'N/A',
  granuleId,
  collectionShortName,
  acquisitionDates,
  crid,
  units,
  maskRule,
  sha256,
  sourceUrl,
  sourceLabel,
  credit,
  manifest,
  compact = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const meta = CLASSIFICATION_META[classification];
  const effectiveMaturity = manifest?.maturity ?? maturity;
  const disclaimer = getMaturityDisclaimer(classification, effectiveMaturity);

  const effGranule = manifest?.granuleId ?? granuleId;
  const effCollection = manifest?.collectionShortName ?? collectionShortName;
  const effDates =
    manifest
      ? `${manifest.acquisitionStartUtc.slice(0, 19)}Z${
          manifest.secondaryAcquisitionStartUtc
            ? ` → ${manifest.secondaryAcquisitionStartUtc.slice(0, 19)}Z`
            : ''
        }`
      : acquisitionDates;
  const effCrid = manifest?.crid ?? crid;
  const effUnits = manifest?.units ?? units;
  const effMask = manifest?.maskRule ?? maskRule;
  const effSha = manifest?.outputManifestSha256 ?? sha256;
  const effSourceUrl = manifest?.sourceUrl ?? sourceUrl;
  const effCredit = manifest?.credit ?? credit;

  const buildCitation = () => {
    const parts = [
      `${title} [${meta.badgeText}${effectiveMaturity !== 'N/A' ? ` / ${effectiveMaturity}` : ''}].`,
      effGranule ? `Granule: ${effGranule}.` : '',
      effCollection ? `Collection: ${effCollection}.` : '',
      effDates ? `Dates: ${effDates}.` : '',
      effCredit ? `Credit: ${effCredit}` : 'Echoes of Rasuwa: Global Waltz (NASA Space Apps 2026).',
      effSourceUrl ? `Source: ${effSourceUrl}` : ''
    ].filter(Boolean);
    return parts.join(' ');
  };

  const handleCopyCitation = () => {
    const text = buildCitation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div
      className={`data-passport-card passport-${classification.toLowerCase()} ${
        compact ? 'passport-compact' : ''
      }`}
      data-classification={classification}
      role="region"
      aria-label={`Data Passport: ${title} (${meta.badgeText})`}
    >
      <div className="data-passport-bar">
        <div className="data-passport-badges">
          <span className="data-passport-badge" title={ meta.patternLabel }>
            <span aria-hidden="true" className="passport-glyph">
              {meta.iconGlyph}
            </span>{' '}
            <span>{meta.badgeText}</span>
          </span>
          {effectiveMaturity !== 'N/A' && (
            <span className="data-passport-maturity">
              MATURITY: {effectiveMaturity}
            </span>
          )}
          {effUnits && (
            <span className="data-passport-units">UNITS: {effUnits}</span>
          )}
        </div>

        <div className="data-passport-actions">
          <button
            type="button"
            className="passport-btn"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? 'Hide Passport ▴' : 'What am I looking at? / Passport ▾'}
          </button>
          <button
            type="button"
            className="passport-btn"
            onClick={handleCopyCitation}
            title="Copy data citation and provenance classification"
          >
            {copied ? '✓ Copied' : 'Copy Citation'}
          </button>
        </div>
      </div>

      <p className="data-passport-disclaimer">{disclaimer}</p>

      {expanded && (
        <div className="data-passport-details">
          <dl className="data-passport-grid">
            <div>
              <dt>Layer / Dataset</dt>
              <dd>{title}</dd>
            </div>
            <div>
              <dt>Classification</dt>
              <dd>
                {meta.iconGlyph} {meta.badgeText} ({meta.borderStyle} border encoding)
              </dd>
            </div>
            {effGranule && (
              <div>
                <dt>Granule ID</dt>
                <dd className="passport-mono">{effGranule}</dd>
              </div>
            )}
            {effCollection && (
              <div>
                <dt>Collection Short Name</dt>
                <dd className="passport-mono">{effCollection}</dd>
              </div>
            )}
            {effDates && (
              <div>
                <dt>Acquisition / Period</dt>
                <dd className="passport-mono">{effDates}</dd>
              </div>
            )}
            {effCrid && (
              <div>
                <dt>CRID / Processing Version</dt>
                <dd className="passport-mono">{effCrid}</dd>
              </div>
            )}
            {effUnits && (
              <div>
                <dt>Units &amp; Scaling</dt>
                <dd>{effUnits}</dd>
              </div>
            )}
            {effMask && (
              <div>
                <dt>Nodata &amp; Mask Rule</dt>
                <dd>{effMask}</dd>
              </div>
            )}
            {effSha && (
              <div>
                <dt>SHA-256 Checksum</dt>
                <dd className="passport-mono">{effSha.slice(0, 24)}…</dd>
              </div>
            )}
            {effCredit && (
              <div>
                <dt>Attribution / Credit</dt>
                <dd>{effCredit}</dd>
              </div>
            )}
          </dl>
          <div className="data-passport-links">
            {effSourceUrl && (
              <a href={effSourceUrl} target="_blank" rel="noreferrer">
                {sourceLabel || 'Primary Source / Documentation ↗'}
              </a>
            )}
            <a
              href="https://nisar-docs.asf.alaska.edu/"
              target="_blank"
              rel="noreferrer"
            >
              ASF NISAR Data User Guide ↗
            </a>
            <span className="passport-boundary-note">
              Boundary: Observation ≠ Physical Cause ≠ Operational Warning
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
