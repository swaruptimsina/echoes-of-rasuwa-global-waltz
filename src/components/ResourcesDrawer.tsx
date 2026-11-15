import React, { useState } from 'react';
import { Code2, ExternalLink, Globe, ShieldCheck, X } from 'lucide-react';
import {
  OFFICIAL_CHALLENGE_RESOURCES,
  PYTHON_QGIS_RECIPE,
} from '../data/officialResources';

export { OFFICIAL_CHALLENGE_RESOURCES, PYTHON_QGIS_RECIPE };

export interface ResourcesDrawerProps {
  onClose: () => void;
}

export const ResourcesDrawer: React.FC<ResourcesDrawerProps> = ({ onClose }) => {
  const [agencyFilter, setAgencyFilter] = useState<'ALL' | 'NASA' | 'CSA (Canada)' | 'CONAE (Argentina)'>('ALL');
  const [copiedCode, setCopiedCode] = useState(false);

  const filtered = OFFICIAL_CHALLENGE_RESOURCES.filter(
    (r) => agencyFilter === 'ALL' || r.agency === agencyFilter
  );

  const handleCopySnippet = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(PYTHON_QGIS_RECIPE).catch(() => {});
    }
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1800);
  };

  return (
    <div
      data-testid="resources-drawer-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Official NASA, CSA, and CONAE Challenge Resources and SAOCOM Guide"
      className="fixed inset-0 z-[950] bg-slate-950/90 flex justify-end"
    >
      <div className="bg-[#0d1520] border-l-2 border-slate-600 w-full max-w-3xl h-full flex flex-col overflow-hidden shadow-2xl">
        <header className="bg-[#111c2b] border-b border-slate-700 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold font-mono text-white">
                DANCING WITH THE SARs // OFFICIAL RESOURCES
              </h2>
              <p className="text-xs text-slate-300">
                NASA · Canadian Space Agency (CSA) · Argentina (CONAE) — 2026 Space Apps Challenge
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Official Resources Drawer"
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-mono text-slate-100 flex items-center gap-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs font-mono text-slate-200">
          {/* Agency Filter Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {(['ALL', 'NASA', 'CSA (Canada)', 'CONAE (Argentina)'] as const).map((ag) => (
              <button
                key={ag}
                type="button"
                onClick={() => setAgencyFilter(ag)}
                className={`px-3 py-1.5 rounded border cursor-pointer ${
                  agencyFilter === ag
                    ? 'bg-sky-500 text-slate-950 border-white font-bold'
                    : 'bg-[#111926] text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {ag}
              </button>
            ))}
          </div>

          {/* Highlight: Mount Rainier Nov 10, 2025 Showcase Quick-Search */}
          <div className="bg-[#111c2b] border border-sky-500/40 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-amber-300 font-bold">
                Mount Rainier Challenge Illustration (Nov. 10, 2025)
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                L-band SAR reveals volcanic ridges and glaciers cleanly right through thick Pacific Northwest cloud cover — alongside official NISAR StoryMaps covering floods, wildfires, land subsidence, oil slicks, and glacial motion.
              </p>
            </div>
            <a
              href="https://search.asf.alaska.edu/#/?polygon=POLYGON((-122.05%2046.65,-121.45%2046.65,-121.45%2047.05,-122.05%2047.05,-122.05%2046.65))&dataset=NISAR"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[11px] inline-flex items-center gap-1"
            >
              Inspect Mount Rainier in ASF Vertex <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Resource Cards */}
          <div className="space-y-3">
            {filtered.map((res) => (
              <div
                key={res.id}
                className="bg-[#111926] border border-slate-700/90 rounded-lg p-3.5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-bold mr-2">
                      {res.agency}
                    </span>
                    <strong className="text-sm text-white">{res.title}</strong>
                  </div>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-300 hover:text-sky-200 underline inline-flex items-center gap-1 text-[11px]"
                  >
                    Open Official Portal <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-slate-300 leading-relaxed">{res.description}</p>
                <div className="bg-[#0b1017] p-2 rounded border border-slate-800 text-[11px] text-sky-200">
                  <strong className="text-amber-300">How Used in This App:</strong> {res.howUsedInApp}
                </div>
              </div>
            ))}
          </div>

          {/* Python & QGIS Workflow + CONAE ONE CLICK Profile */}
          <div className="bg-[#111926] border border-amber-500/40 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-amber-300 uppercase flex items-center gap-1.5">
                <Code2 className="w-4 h-4" /> Python &amp; QGIS Workflow + CONAE ONE CLICK Profile
              </h3>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] text-sky-200 cursor-pointer"
              >
                {copiedCode ? '✓ Copied Python + QGIS' : 'Copy Python + QGIS Recipe'}
              </button>
            </div>
            <pre className="bg-[#090e15] border border-slate-800 rounded p-2.5 text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
              {PYTHON_QGIS_RECIPE}
            </pre>
            <ol className="list-decimal pl-5 space-y-1.5 text-slate-300 text-[11px]">
              <li>
                <strong className="text-white">CONAE SAOCOM ONE CLICK Login Profile:</strong> Register a ONE CLICK Login Profile at{' '}
                <code className="text-sky-300">catalogos.conae.gov.ar</code>, then search SAOCOM-1A/1B L-band quad-pol scenes across South America or global targets to download images and follow processing tutorials.
              </li>
              <li>
                <strong className="text-white">CSA RCM &amp; RADARSAT-1 Open Archive:</strong> Access open RADARSAT-1 (1995–2013 all-weather HH) and RCM 4-day C-band collections for maritime ice/wind/oil/ship surveillance, disaster response, and ecosystem change.
              </li>
            </ol>
          </div>

          {/* Non-Endorsement Disclaimer */}
          <div className="bg-[#0b1017] border border-slate-800 rounded p-3 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites. Participants comply with each portal’s data use parameters.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesDrawer;
