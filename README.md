# WraeclastLedger website

Read-only Path of Exile strategy browser with filtering, sorting, pagination,
immutable run evidence and proof-checked setup codes for the desktop application.

This repository contains the website source and synthetic tests. GitHub Pages
publication is a separate operation; the included CI workflow only validates source.
The website reads a safe public API. It does not include the database, private
server implementation, Discord credentials or desktop session storage.

## Development

Use Node 24.20.0 and npm 11.19.0, matching CI:

```sh
npm ci
npm run validate
```

Validation runs typecheck, tests, lint, static build and artifact checks. The
exported website is `dist/client`; server intermediates are not public assets.

For a local synthetic strategy preview, start these in separate terminals:

```sh
npm run review:api
npm run review:static
```

Open http://127.0.0.1:43122/?design=prototype#/ . `/compare` shows both retained
presentations with the same synthetic data. The preferred presentation currently
requires `?design=prototype`; making it the default is a pre-publication follow-up.

For development with live reloading, set `C1_LOCAL_API=1` in the process environment
and run `npm run dev` (loopback port 43120). A development-only HTTPS API endpoint
may be supplied through `VITE_PUBLIC_API_URL`. Export builds reject preview flags
and external API settings until production routing is separately configured.

## Isolated community workflow review

Start these in separate terminals:

```sh
npm run review:communities:api
npm run review:communities
```

Open http://127.0.0.1:43127/?design=prototype#/communities . The frontend uses
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
