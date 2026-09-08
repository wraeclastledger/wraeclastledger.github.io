# Website build and release checks

The website is available at [wraeclastledger.com](https://wraeclastledger.com).
GitHub Pages hosts the static frontend; the public API supplies strategy data.
This document describes contributor-facing checks for release candidates.

## Source and build

- Use the pinned Node/npm versions and committed lockfile described in README.
- Run `npm run validate` and `npm run validate:pages`. CI checks both profiles
  on Windows and Ubuntu. See [VALIDATION](VALIDATION.md) for test coverage.
- Publish only `dist/client`, excluding server intermediates, tests and local
  review data. Each build replaces that directory.
- Inspect the generated manifest and header policy in `outputs/<profile>/`.
  Build success does not establish live routing, headers or browser behavior.

## Behavior to verify

- Filters, sorting, pagination, direct links, Back/Forward and reload.
- Empty, missing, offline, timeout and rate-limit feedback.
- Keyboard navigation, narrow layouts, zoom and explicit Light/Dark preferences.
- Immutable historical prices, signed losses and visible missing-evidence coverage.
- Exact-proof setup-code generation, browser compression, clipboard success and
  selectable fallback. Desktop Load applies reusable setup with fresh run prices.
- Atlas/artwork links, readable fallbacks and accurate About/Privacy disclosures.

Community workflow fixtures are for isolated development. They do not provide
production community access control. The public website has no authoring or
vote-casting API. Missing financial proof keeps setup-code generation unavailable.

## Publication

Source CI validates without publishing. Separate manual workflows publish an
identified artifact or a static maintenance notice. See the
[release checklist](ops/LAUNCH_CHECKLIST.md) and
[Pages workflow guide](ops/PAGES_RELEASE.md) for repository-facing steps.

Verify the deployed artifact and browser behavior before recording acceptance.
Retain the prior artifact and compatible header policy for recovery. A website
rollback must not require application-data rollback.
