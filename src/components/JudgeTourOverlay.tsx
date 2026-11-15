import React from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Trophy, X } from 'lucide-react';

export interface JudgeTourStop {
  id: 'phase_lock' | 'pixel_valley' | 'terrain_3d' | 'workbench_geotiff';
  stepNumber: number;
  title: string;
  criterion: string;
  whatToTry: string;
  ctaLabel: string;
}

export const JUDGE_TOUR_STOPS: JudgeTourStop[] = [
  {
    id: 'phase_lock',
    stepNumber: 1,
    title: 'InSAR Wave-Phase Matching (Chilime Hydro Dam)',
    criterion: 'Creativity & Physics',
    whatToTry:
      'Shut the 3 animated steel dam gates, then tune the Phase-Lock slider or click NISAR Deep Radar to resolve speckle noise into rainbow fringes (24 cm L-band vs 5.6 cm C-band).',
    ctaLabel: 'Jump to Dam Mission',
  },
  {
    id: 'pixel_valley',
    stepNumber: 2,
    title: 'Walkable 2D Pixel Rasuwa Valley',
    criterion: 'Narrative Empathy',
    whatToTry:
      'Walk Lali Maya along Syabrubesi riverbanks, interview villagers, inspect site photographs, and test SAR clues against local ground truth.',
    ctaLabel: 'Walk 2D Village',
  },
  {
    id: 'terrain_3d',
    stepNumber: 3,
    title: '3D PBR Terrain + Story-Linked Interferogram',
    criterion: '3D Engineering',
    whatToTry:
      'Orbit the smoothed 3D Himalayan terrain, scrub 12-day passes, and jump from solved Story Missions directly to their 3D mountain slopes.',
    ctaLabel: 'Open 3D Valley Lab',
  },
  {
    id: 'workbench_geotiff',
    stepNumber: 4,
    title: 'Real GeoTIFF Ingest + Live NASA CMR & Provenance',
    criterion: 'Scientific Validity',
    whatToTry:
      'Load or download a real Float32 GeoTIFF raster, re-query NASA CMR granules, inspect DataPassport provenance, and export GeoJSON/CSV/PNG.',
    ctaLabel: 'Open SAR Workbench',
  },
];

interface JudgeTourOverlayProps {
  isOpen: boolean;
  activeStopIndex: number;
  onSelectStop: (index: number) => void;
  onExecuteStop: (stopId: JudgeTourStop['id']) => void;
  onOpenEvidenceTrail: () => void;
  onClose: () => void;
}

export const JudgeTourOverlay: React.FC<JudgeTourOverlayProps> = ({
  isOpen,
  activeStopIndex,
  onSelectStop,
  onExecuteStop,
  onOpenEvidenceTrail,
  onClose,
}) => {
  const [minimized, setMinimized] = React.useState(false);

  if (!isOpen) return null;

  const safeIdx = Math.max(0, Math.min(JUDGE_TOUR_STOPS.length - 1, activeStopIndex));
  const stop = JUDGE_TOUR_STOPS[safeIdx];

  const goTo = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(JUDGE_TOUR_STOPS.length - 1, nextIdx));
    onSelectStop(clamped);
    onExecuteStop(JUDGE_TOUR_STOPS[clamped].id);
    setMinimized(true);
  };

  if (minimized) {
    return (
      <aside
        data-testid="judge-tour-overlay"
        aria-label="90-Second Judge Guided Tour (Compact)"
        className="fixed bottom-3 right-3 z-[980] flex items-center gap-1.5 rounded-xl border-2 border-amber-400/90 bg-slate-950/95 px-2.5 py-1.5 shadow-2xl"
      >
        <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span className="text-[11px] font-mono font-bold text-amber-200 whitespace-nowrap">
          Tour {stop.stepNumber}/{JUDGE_TOUR_STOPS.length}: {stop.criterion.split(' ')[0]}
        </span>
        <button
          type="button"
          data-testid="judge-tour-prev-btn"
          disabled={safeIdx === 0}
          onClick={() => goTo(safeIdx - 1)}
          aria-label="Previous tour stop"
          className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-[11px] font-mono text-slate-200 cursor-pointer"
        >
          ‹
        </button>
        <button
          type="button"
          data-testid="judge-tour-next-btn"
          disabled={safeIdx === JUDGE_TOUR_STOPS.length - 1}
          onClick={() => goTo(safeIdx + 1)}
          aria-label="Next tour stop"
          className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-[11px] font-mono text-slate-200 cursor-pointer"
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="px-1.5 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] font-mono cursor-pointer"
        >
          Details
        </button>
        <button
          type="button"
          data-testid="judge-tour-close-btn"
          onClick={onClose}
          aria-label="Close 90-Second Judge Tour"
          className="p-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      data-testid="judge-tour-overlay"
      aria-label="90-Second Judge Guided Tour"
      className="fixed top-14 right-3 z-[980] w-[min(350px,calc(100vw-24px))] rounded-xl border-2 border-amber-400/90 bg-slate-950/95 text-slate-100 shadow-2xl p-3 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wide">
            90-Sec Judge Tour · {stop.stepNumber}/{JUDGE_TOUR_STOPS.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 border border-sky-500/40 text-sky-200">
            {stop.criterion}
          </span>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Minimize Judge Tour"
            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 cursor-pointer"
          >
            _
          </button>
          <button
            type="button"
            data-testid="judge-tour-close-btn"
            onClick={onClose}
            aria-label="Close 90-Second Judge Tour"
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step dots */}
      <div className="grid grid-cols-4 gap-1">
        {JUDGE_TOUR_STOPS.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            data-testid={`judge-tour-step-${item.stepNumber}`}
            onClick={() => goTo(idx)}
            className={`py-1 px-1.5 rounded text-[10px] font-mono font-bold border cursor-pointer transition ${
              idx === safeIdx
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
          >
            #{item.stepNumber} {item.criterion.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-bold text-white leading-snug">{stop.title}</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{stop.whatToTry}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid="judge-tour-prev-btn"
            disabled={safeIdx === 0}
            onClick={() => goTo(safeIdx - 1)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-xs font-mono text-slate-200 flex items-center gap-0.5 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>
          <button
            type="button"
            data-testid="judge-tour-next-btn"
            disabled={safeIdx === JUDGE_TOUR_STOPS.length - 1}
            onClick={() => goTo(safeIdx + 1)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-xs font-mono text-slate-200 flex items-center gap-0.5 cursor-pointer"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenEvidenceTrail}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-sky-500/50 text-sky-200 text-[11px] font-mono cursor-pointer"
          >
            6-Step Trail
          </button>
          <button
            type="button"
            data-testid="judge-tour-go-btn"
            onClick={() => {
              onExecuteStop(stop.id);
              setMinimized(true);
            }}
            className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs font-mono flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            {stop.ctaLabel}
          </button>
        </div>
      </div>
    </aside>
  );
};
