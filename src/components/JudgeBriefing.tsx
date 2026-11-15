import React, { useEffect, useRef, useState } from 'react';

interface JudgeBriefingProps {
  onClose: () => void;
  onOpenObservatory: () => void;
  onOpenEvidence: () => void;
  onOpenAction: () => void;
  initialStep?: number;
  isOpen?: boolean;
}

const source = 'https://science.nasa.gov/earth/earth-observatory/landslide-and-avalanche-debris-litter-hubbard-glacier/';
const challenge = 'https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/';
const steps = ['Problem', 'Observation', 'Evidence', 'Interpretation', 'Possible action', 'Limitations'];

export const JudgeBriefing: React.FC<JudgeBriefingProps> = ({ onClose, onOpenObservatory, onOpenEvidence, onOpenAction, initialStep = 0, isOpen = true }) => {
  const [step, setStep] = useState(Math.max(0, Math.min(5, initialStep)));
  const [split, setSplit] = useState(50);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageCount, setImageCount] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    headingRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, summary') || [])];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [onClose, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="judge-backdrop">
      <div className="judge-briefing" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="judge-title">
        <header className="judge-header">
          <div><span className="judge-kicker">6-STEP PHOTO &amp; EVIDENCE GUIDE</span>
            <h2 id="judge-title" ref={headingRef} tabIndex={-1}>How to Read Space Radar Safely</h2></div>
          <button type="button" onClick={onClose}>Back to Game</button>
        </header>
        <p className="judge-purpose">For a community-preparedness educator in Rasuwa: learn what photos and local checks you need before talking about flood safety. No operational warning, alarm, or dam control.</p>
        <nav className="judge-steps" aria-label="Guided evidence trail">
          {steps.map((label, index) => <button key={label} type="button" aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)}>{index + 1}. {label}</button>)}
        </nav>
        <div className="judge-body">
          <section className="judge-story" aria-live="polite">
            <span className="judge-kicker">{step + 1} / {steps.length} • {steps[step]}</span>
            {step === 0 && <><h3>A map shows change. Who checks what it really means?</h3><p>Mountain villages need clear, honest facts — not scary colors without an explanation. This short guide shows how to connect a space picture to real local questions.</p><p><strong>Background context:</strong> Nepal&apos;s NDRRMA situation report (2026-09-01) describes a glacial ice–rock slide and debris flood on 2026-08-26 along the Bhote Koshi–Trishuli river valley. That is an outside news report, not something measured by this game. <a href="https://ndrrma.gov.np/mediafiles/rasuwa/Rasuwa_Flood_SitRep_Temp_ENG_01_01092026.pdf" target="_blank" rel="noreferrer">Read report &amp; limits</a></p><p>First, look at a real NASA NISAR radar photo from Hubbard Glacier in Alaska on the right. Then see how those same simple checks apply to Rasuwa.</p><p>Our goal here is learning the steps: compare before/after, ask why, check the ground, and stay honest about what we don&apos;t know yet.</p></>}
            {step === 1 && <><h3>Slide the bar to compare two real NASA NISAR photos</h3><p>Drag the slider on the right image back and forth. Look for new bright green patches on December 8 that were not there on November 26! Also notice green mountains that were already there before.</p><p>NASA explains that rough landslide rock piles bounced back stronger radar echoes (green) after the December 6, 2025 earthquake. These are NASA-colored space radar photos — not an app-invented map.</p><p>Still, green spots alone don&apos;t prove danger level, depth, or when something might fall next.</p></>}
            {step === 2 && <><h3>How do we know the green patches were really rockslides?</h3><p>NASA&apos;s article mentions geologists flew over the glacier on December 12, 2025 in real airplanes to confirm the rockslides on the snow. Always double-check space pictures with local eyes!</p><p><strong>Empirical 26 Aug 2026 Rasuwa Multi-Sensor Findings (4,774.048 km² HydroBASINS System · 6,803 Exact CMR Granules):</strong> In our real GeoTIFF &amp; GeoJSON audit of the upper source, NISAR L-band GUNW median coherence dropped from 0.2188 to 0.1021 with connected unwrapped phase surviving in only 9 of 528 pixels (1.70%) vs. 420/420 control—so no quantitative NISAR displacement claim is defensible there. Companion Sentinel-1D C-band coherence screening flagged 158/307 (51.5%) UNOSAT detachment target pixels alongside 1,225/30,161 (4.06%) control false alarms, 3-view OPERA RTC-S1 consensus flagged 1.1871 km² across 48.15% 2-view observable steep terrain, and GPM IMERG recorded 0.0 ± 0.24 mm/hr at the 02:52:10 UTC collapse instant.</p><p>In-game characters in this app are fictional teaching guides, and the dish mini-game is practice. In real life, pair satellite screening with dated local photos, river gauges, and archive latency awareness (+3.25d Sentinel-1D to +46.38d OPERA CMR insertion).</p><button type="button" onClick={onOpenEvidence}>See Rasuwa Photo Checklist</button></>}
            {step === 3 && <><h3>See why 3D hills make things easier to understand</h3><p>Open our 3D Valley Lab! When you switch from flat 2D to 3D hills, it is much easier to see which slopes hang over which river villages.</p><p>Remember: the Rasuwa radar colors and hill shapes inside the lab are practice simulations — they are not Rasuwa measurements! Radar only sees motion toward or away from the satellite, so 3D terrain helps people talk about where to check next.</p><button type="button" onClick={onOpenObservatory}>Open Rasuwa observatory</button><p className="judge-hint">You can always come back using the menu button anytime.</p></>}
            {step === 4 && <><h3>Try a practice safety plan</h3><p>In the Safety Checklist window, adjust the two simple sliders into the green zone and tick the reminder box. Notice it says right there: this is only a learning checklist — no real river sensors, sirens, or dams are wired up.</p><p>In real life, the right next step is sharing questions with trained local engineers and village leaders.</p><button type="button" onClick={onOpenAction}>Open Practice Safety Plan</button><p>If you save a worksheet, it simply saves your notes and reminder list.</p></>}
            {step === 5 && <><h3>What this learning app can and cannot do</h3><ul><li><strong>What it CAN do:</strong> Let you compare real NASA NISAR radar photos, explore real NASA satellite lists, and learn how radar sees through clouds and darkness.</li><li><strong>What it CANNOT do:</strong> It cannot predict earthquakes, send real-time flood alarms, or replace local river gauges and field engineers.</li><li>Weather charts come from past-year NASA averages (POWER), not live rain sensors today.</li></ul><p>Next real-world step when studying a valley: pair official NASA NISAR files directly with local village photos and river measurements.</p></>}
          </section>
          <section className="judge-observation" aria-label="Archived NASA NISAR comparison">
            <span className="judge-data-badge">ARCHIVED OBSERVATION • REAL NASA RADAR PHOTO</span>
            <h3>Hubbard Glacier (Alaska) — not Rasuwa</h3>
            <div className="judge-date-row"><span>Before: 2025-11-26</span><span>After: 2025-12-08</span></div>
            {imageFailed ? <div className="judge-image-unavailable" role="status">Reference imagery unavailable. Read the linked NASA source; the Rasuwa learning game still works.</div> : <div className="judge-image-wipe">
              <img src="/nisar-reference/hubbard-2025-12-08.jpg" alt="NASA NISAR color space radar photo near Hubbard Glacier on December 8, 2025" onLoad={() => setImageCount(n => n + 1)} onError={() => setImageFailed(true)} />
              <img className="judge-before" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} src="/nisar-reference/hubbard-2025-11-26.jpg" alt="Same NASA NISAR space radar photo on November 26, 2025, before the earthquake" onLoad={() => setImageCount(n => n + 1)} onError={() => setImageFailed(true)} />
              <div className="judge-wipe-line" style={{ left: `${split}%` }} />
            </div>}
            <label className="judge-wipe-control">Slide to compare dates: {split}% before / {100 - split}% after
              <input type="range" min={0} max={100} value={split} aria-label="Compare archived NISAR dates" onChange={e => setSplit(Number(e.target.value))} />
            </label>
            <p role="status" className="judge-hint">{imageFailed ? 'Image load failed' : imageCount >= 2 ? 'Real NASA photos loaded (saved locally)' : 'Loading real NASA photos…'}</p>
            <p className="judge-legend"><strong>Color Guide:</strong> Green = rough ground / rock debris (strong echo); Purple = smooth snow / ice (weak echo).</p>
            <p className="judge-credit">Credit: Eric Fielding &amp; Gustavo H. X. Shiroma (JPL/NISAR Team); prepared for NASA Earth Observatory by Lauren Dauphin (2026-02-25). <a href={source} target="_blank" rel="noreferrer">Read original NASA story</a></p>
          </section>
        </div>
        <details className="judge-provenance"><summary>Where the data comes from (Simple Source List)</summary>
          <p><a href={challenge} target="_blank" rel="noreferrer">2026 challenge: Dancing with the SARs</a> asks teams to help people explore NISAR space radar images. The Hubbard Glacier pair is real NASA browse imagery, and our bundled 26 Aug 2026 Rasuwa Datum GeoTIFFs/GeoJSONs and P05023 GCOV subset are empirical satellite/catalog observations, while the interactive 2D/3D valley lab scenes remain learning simulations.</p>
          <dl><dt>Archived observation</dt><dd>Real dated NASA NISAR photos (Hubbard Glacier) and fixed satellite backdrop tiles.</dd><dt>Model output</dt><dd>NASA POWER past-year rain/wetness averages (not today&apos;s live weather).</dd><dt>Reported estimate</dt><dd>Outside news reports (like Nepal NDRRMA and NASA EONET event pins).</dd><dt>Simulation</dt><dd>Practice Rasuwa radar layers, games, dish mini-game, and safety checklist.</dd><dt>Illustration</dt><dd>Drawings, story characters, and unverified example photos.</dd><dt>Live observation</dt><dd>None in this learning app — no live warning sensors connected.</dd></dl>
        </details>
        <footer className="judge-footer"><button type="button" disabled={step === 0} onClick={() => setStep(n => n - 1)}>Previous</button><span>Learning Prototype • Pictures help ask better questions</span><button type="button" onClick={() => step < steps.length - 1 ? setStep(n => n + 1) : onClose()}>{step < steps.length - 1 ? `Next: ${steps[step + 1]}` : 'Back to Game'}</button></footer>
      </div>
    </div>
  );
};
