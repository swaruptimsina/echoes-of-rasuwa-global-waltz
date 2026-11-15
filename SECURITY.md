# Security Policy

## Supported Versions
The `main` branch of **Echoes of Rasuwa: Global Waltz** is actively maintained for the 2026 NASA Space Apps Challenge.

## Credential & API Key Safety
- **Zero Embedded Secrets:** This repository never stores NASA Earthdata Login tokens, `.netrc` credentials, or private API keys in source control.
- **Public Read-Only Browser Calls:** Browser runtime network requests query only unauthenticated public endpoints (`cmr.earthdata.nasa.gov`, `gibs.earthdata.nasa.gov`, `power.larc.nasa.gov`, `eonet.gsfc.nasa.gov`) with automatic offline fallback to committed snapshots.
- **Authenticated HDF5 Downloads:** When using `pipeline/ingest_nisar.py` with `asf_search`, store credentials exclusively in your local `~/.netrc` (`chmod 600 ~/.netrc`) outside the git working tree.

## Reporting a Vulnerability
If you discover a security issue or accidental credential exposure, please open a security advisory on the GitHub repository rather than posting credentials in a public issue.
