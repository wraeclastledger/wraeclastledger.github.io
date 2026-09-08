# WraeclastLedger website

Read-only Path of Exile strategy browser with filtering, sorting, pagination,
immutable run evidence and proof-checked setup codes for the desktop application.

The website is live at [wraeclastledger.com](https://wraeclastledger.com).
This repository contains the website source and synthetic tests. Source CI only
validates; the separate manual Pages workflow publishes a reviewed artifact.
The website reads a safe public API. It does not include the database, private
server implementation, Discord credentials or desktop session storage.
The community totals card uses one server aggregate at
`/web/v1/strategies?summary=community` (optional `league`). Historical losses and
missing coverage remain visible; the frontend does not enumerate detail records
or impose a 50-strategy total limit. A matching API deployment is required.

League choices include the supported catalogue even on a fresh filtered or empty
page. Additional observed or explicitly entered leagues remain selectable. At
rollover, update `CURRENT_LEAGUE` and retain historical `KNOWN_LEAGUES` entries in
`lib/model.ts`; never derive the whole catalogue from a filtered result page.

## Development

Use Node 24.20.0 and npm 11.19.0, matching CI:

```sh
npm ci
npm run validate
```

Validation runs typecheck, tests, lint, static build and artifact/header checks. The
exported website is `dist/client`; server intermediates are not public assets.

For a local synthetic strategy preview, start these in separate terminals:

```sh
npm run review:api
npm run review:static
```

Open http://127.0.0.1:43122/ . The preferred prototype presentation is the standard
layout for every route. Older `?design=prototype` bookmarks still work; no design
switch is required. The former alternate layout has been retired.

For development with live reloading, set `C1_LOCAL_API=1` in the process environment
and run `npm run dev` (loopback port 43120). A development-only HTTPS API endpoint
may be supplied through `VITE_PUBLIC_API_URL`. Export builds reject preview flags.
The default export uses same-origin `/web/v1`. `npm run validate:pages` prepares
a separate profile using only `https://api.wraeclastledger.com/web/v1`; it does
not connect or publish that service. Each build replaces `dist/client`, so preserve
a candidate before building the other profile. Generated manifests and proposed
response headers are written outside the artifact in `outputs/<profile>/`.

The [Pages release runbook](ops/PAGES_RELEASE.md) describes artifact review and
the protected manual publication and maintenance workflows in `.github/workflows`.
Normal source CI validates both profiles on Windows and Ubuntu and cannot deploy.
The [release checklist](ops/LAUNCH_CHECKLIST.md) covers candidate review,
browser checks and artifact recovery.

## Isolated community workflow review

Start these in separate terminals:

```sh
npm run review:communities:api
npm run review:communities
```

Open http://127.0.0.1:43127/#/communities . The frontend uses
31 synthetic communities from the loopback fixture service on 43128. Home and
Following use the review-only `wraeclastledger-web-community-review-v1` browser key.
The service has no production connection. Review flags are set only in the child
process and are forbidden in export builds.

The review covers Home, Following, My Feed, a paginated directory and unavailable
communities. It is not production tenancy, authentication or access control.

## Data and compatibility

Historical values retain authored prices. Missing economics stays unavailable;
display-only prices never grant setup-code authority. Copy requires matching
strategy/revision evidence and uses the production wl3 codec. Desktop Load applies
reusable setup with fresh new-run prices; website presentation does not reprice history.

`lib/vendor/provenance.json` and `tests/vendor/provenance.json` record source hashes
for the vendored adapter and desktop compatibility reader. Normal builds and tests
need no other checkout. Maintainer refresh commands accept explicit source paths:

```sh
npm run codec:sync -- /path/to/desktop-source
node tests/sync-upstream.mjs /path/to/desktop-source /path/to/api-source
```

Artwork catalogue refresh is explicit (`node scripts/refresh-artwork.mjs`). It
retains verified official image URLs and source-family information, never economy
prices. Unknown items retain visible fallbacks. Game artwork remains attributed
to its respective owner; portrait provenance is beside the bundled asset.

The release league defaults to Allflame; `VITE_CURRENT_LEAGUE` is the bounded
release-time override. An explicit empty league route means All leagues.

## Related project

The desktop application's current public location is
[gund0lf/wraeclastledger_react](https://github.com/gund0lf/wraeclastledger_react).
Its download/support links remain there until a coordinated repository move.
Website source and CI are independent of desktop releases.

See [VALIDATION.md](VALIDATION.md) for the test scope and
[PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) for launch requirements.
