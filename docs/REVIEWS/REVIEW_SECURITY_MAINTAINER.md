# Adversarial Persona Review 5: Security, Provenance & Open-Source Maintainer

## Reviewer Profile
- **Domain:** Supply-chain security, secret hygiene, automated CI guardrails, cryptographic asset verification, and open-source licensing.

## Audit Findings & Verification
1. **Zero Runtime LLM Scientific Logic & Strict Secret Hygiene:**
   - Verified across `src/`, `server.ts`, and `package.json`: zero LLM/AI calls in scientific calculations, `DataPassport`, or UI copy. `@google/genai` is used strictly server-side in `server.ts` (`/api/tts`) for optional character voice synthesis when `GEMINI_API_KEY` is configured via server environment (and `POST /api/tts/config` returns `403` when `NODE_ENV=production` so visitors cannot overwrite server keys), with built-in zero-key `msedge-tts` / Web Speech fallback. `.env`, `.env.local`, `.netrc`, and `.tts-cache/` are gitignored; zero client-side secret leakage; external NASA requests (CMR, POWER, EONET, GIBS) use deterministic offline fallbacks and `AbortController` timeouts.
2. **Automated Claim-Integrity Linter (`scripts/check-claims.mjs`):**
   - Verified that `npm run lint:claims` scans all source and submission files for forbidden unverified strings and validates SHA-256 provenance ledgers (`/public/nisar-reference/provenance.json`, `/public/nisar-reference/rasuwa-provenance.json`, `/docs/research-ledger.json`, `/docs/sources-ledger.json`).
3. **Production Build & Code Splitting:**
   - Configured manual chunk splitting in `vite.config.ts` (`vendor-three`, `vendor-react`, `game-world`) plus `React.lazy` route-level splitting in `src/App.tsx` so all production JS bundles stay under the 500 kB threshold.
4. **Open-Source Repository Governance:**
   - Verified `/LICENSE` (MIT), `/NOTICE`, `/CONTRIBUTING.md`, `/CODE_OF_CONDUCT.md`, `/SECURITY.md`, `/CITATION.cff`, `/.github/workflows/ci.yml`, and `/docs/AI_DISCLOSURE.md`.

## Status
- **PASS (0 Security, Provenance, or Build Warnings)**
