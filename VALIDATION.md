# Validation

The source validation command is `npm run validate`, using Node 24.20.0 and
npm 11.19.0. CI runs it on Windows and Ubuntu after a clean locked install.

The suite covers:

- Bounded API responses, deadlines, aborts and stale request ownership.
- Query-bound pagination, route safety and Back/Forward restoration.
- Null/zero/negative economics and immutable per-run prices.
- Synthetic historical cost itemization, including duplicate scarabs and exact
  setup-code authority remaining unavailable for display-only legacy costs.
- Browser Brotli output read by the vendored desktop parser and price-free Load.
- Exact item artwork, normalized identity and visible ambiguous-name fallbacks.
- Preferred layout at the plain root and direct detail links, with compatibility
  for old prototype-query bookmarks; clipboard fallback and disclosures.
- Synthetic Home/Following persistence, failure warnings, directory pagination,
  unavailable communities and audience invalidation.
- Export configuration rejecting local review flags and unapproved API addresses.

All test records are constructed fixtures. No saved live strategy responses,
real publication IDs, participant identities, authored notes, private operational
reports or original local Git history are included in this public repository.

Artifact validation requires an index and Brotli WASM, rejects known fixture and
review content, and produces a SHA256 manifest. The scanner is a bounded check,
not a general security guarantee. Logs and manifests are ignored generated files.

The existing >500 kB chunk warning remains visible. Repeated builds can have
separate generated build IDs; source reproducibility does not imply byte-identical
artifacts. A release must use one identified, validated artifact.

Automated tests do not replace final browser/native-import acceptance or proof of
actual deployed routing, headers, cache behavior and TLS. Those remain in
[PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).
