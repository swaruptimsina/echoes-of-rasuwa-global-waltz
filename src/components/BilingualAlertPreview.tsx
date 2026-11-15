import React, { useState } from 'react';

export interface BilingualAlertPreviewProps {
  regionName: string;
  displacementMm?: number;
  wetnessPct?: number;
  compact?: boolean;
}

type DrillLang = 'ne' | 'tamang' | 'en';

export const BilingualAlertPreview: React.FC<BilingualAlertPreviewProps> = ({
  regionName,
  displacementMm = 18,
  wetnessPct = 74,
  compact = false,
}) => {
  const [lang, setLang] = useState<DrillLang>('ne');

  const safeRegion = regionName.split('—')[0].split(',')[0].trim() || 'Rasuwa';

  const messages: Record<
    DrillLang,
    { label: string; smsText: string; voiceCue: string }
  > = {
    ne: {
      label: 'नेपाली (SMS)',
      smsText: `[अभ्यास मात्र] ${safeRegion}: जमिन ${displacementMm}mm र चिस्यान ${wetnessPct}% अभ्यास जाँच। उच्च सुरक्षित डाँडामा सचेत रहनुहोस्। (No real alarm)`,
      voiceCue: 'अभ्यास सन्देश: सामुदायिक वर्षात मापक र रडार अभ्यास पूरा भयो।',
    },
    tamang: {
      label: 'तामाङ (Tamang)',
      smsText: `[अभ्यास सूचना] ${safeRegion}: गाङ/पहिरो ${displacementMm}mm अभ्यास जाँच। सुरक्षित उच्च थलीमा परिवारसहित सचेत बसिबक्सियोस्। (Drill Only)`,
      voiceCue: 'तामाङ अभ्यास सूचना: गाउँले दाजुभाइ तथा दिदीबहिनी सचेत अभ्यास।',
    },
    en: {
      label: 'English (SMS)',
      smsText: `[PRACTICE DRILL] ${safeRegion}: Threshold check (${displacementMm}mm shift, ${wetnessPct}% wetness). Move calmly to high ridge assembly point. No real sensors.`,
      voiceCue: 'Learning simulation only — no real sensors or telecom dispatch connected.',
    },
  };

  const active = messages[lang];

  return (
    <div
      data-testid="bilingual-alert-preview"
      className={`rounded-lg border border-sky-500/40 bg-slate-950/90 text-slate-100 ${
        compact ? 'p-2.5 space-y-1.5' : 'p-3 space-y-2'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-mono font-bold text-sky-300 uppercase tracking-wide">
          📣 Last-Mile Community Drill Preview (No real sensors)
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Drill Message Language">
          {(['ne', 'tamang', 'en'] as const).map((code) => (
            <button
              key={code}
              type="button"
              data-testid={`drill-lang-${code}`}
              onClick={() => setLang(code)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                lang === code
                  ? 'bg-amber-400 text-slate-950 border-amber-200 font-bold'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              {messages[code].label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded bg-slate-900/95 border border-slate-700/80 px-2.5 py-2 text-xs leading-relaxed text-amber-100 font-mono">
        {active.smsText}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
        <span>{active.voiceCue}</span>
        <span className="tabular-nums text-sky-300">
          {active.smsText.length}/160 chars · Learning Simulation
        </span>
      </div>
    </div>
  );
};
