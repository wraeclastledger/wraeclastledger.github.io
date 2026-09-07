# Production readiness

The website is live at https://wraeclastledger.com. Source CI remains read-only;
publication and maintenance use separate manual workflows and a protected environment.

The static host is GitHub Pages, with wraeclastledger.com as the custom
domain. The existing application API supplies data; it is not bundled here.
`.openai/hosting.json` describes the static output and has no registered project.

The preferred prototype is now the standard presentation on every route; the
former alternate layout is retired. Closer visual acceptance remains separate.

Prepared locally: an explicit Pages profile targets only
`https://api.wraeclastledger.com/web/v1`; the default same-origin preview profile
is preserved. API requests omit credentials/referrers and reject redirects.
Artifact validation produces content hashes and a CSP/header proposal from the
actual HTML. [The deployment runbook](ops/PAGES_RELEASE.md) describes the active
manual workflow. Build checks alone do not prove live behavior.

## Accepted infrastructure — September 7, 2026

The API hostname is live. Origin installation and public-CA HTTPS checks passed.
Cloudflare Full (strict), API cache bypass and an API-only HTTP 308 redirect are
active. The redirect preserves paths and query strings at the edge; origin port
80 is not a prerequisite. Twenty-four external network checks passed, covering
safe list/detail/evidence reads, exact canonical-site CORS, preflights, denied
routes, no-store, absence of cookie/credential headers and existing desktop
compatibility. This is network evidence, not full website browser acceptance.

The organization has verified domain ownership. As of September 8, Pages uses the
active manual publication workflow and `wraeclastledger.com`. Its environment
requires maintainer approval, allows only main, permits self-review and disables
administrator bypass. Apex/www DNS is proxied through Cloudflare. GitHub's
certificate covers both names and Enforce HTTPS is enabled. Website-only rules
apply canonical HTTPS redirects, cache bypass, page no-store and the reviewed
release's five security headers. Future certificate renewal is not yet observed.

The corrected release is `b7900295788885831c3d23b6f97379648783678a`, run
34167928482, artifact `ee20b8c19c6d56a04f2c4d3555b839217a26a95eb6bf6a7c36ed1538088c140d`.
All 171 tests and both local build profiles passed; hosted Windows/Ubuntu CI
passed all four jobs. Downloaded evidence and the actual Pages tar match all 24
manifest files. Thirty live file/header/redirect checks passed. Canonical browser
list, home totals, league changes and detail reads work. Built and live Chromium
checks passed all four OS/site Light/Dark combinations, including reloads. The
original production build reproduced the two conflicting-preference failures;
the CSS correction removes the prototype's independent OS preference.

The matching community aggregate is deployed and accepted. Thirty-six external
network checks passed after rollout, including summary scope/schema, repeat/HEAD
reads, rejected parameters, edge HTTPS query retention and ordinary/desktop API
compatibility. Production image tests also cover a 100,000-strategy synthetic
catalogue. The website card is retained and its detail-request loop is removed.

## Remaining acceptance

- Complete the broader keyboard, narrow-layout and zoom matrix. Theme checks
  passed in the in-app browser and isolated Chromium; a different browser engine
  has not been checked.
- Prove successful worker/WASM generation, clipboard success/fallback and import
  into the installed desktop app using a record with complete exact setup/price
  evidence. A tested historical record reported incomplete evidence and copied
  nothing; that is not successful copy/import proof.
- Finish the live About/Privacy, external-link and provider-disclosure review.
- Exercise hosted recovery. Exact artifacts and policies are retained, and the
  manual maintenance workflow and deploy-job rerun route are prepared. Neither a
  hosted replacement nor unpublish drill has been claimed.

Retain the configured custom domain, protected manual publication workflow and
the exact prior artifact/header policy on each release. Website rollback must
not roll back application data. Closer visual sign-off remains separate.

The multi-community review is synthetic. Production multi-community discovery,
visibility, cross-community aggregates and admission controls need a separately
tested backend contract; the existing home catalogue totals are already live.
Public aliases and temporary recipient links are additional work. Browser
preferences grant no access, and the website exposes no voting or authoring API.

The [launch checklist](ops/LAUNCH_CHECKLIST.md) records the proposed settings and
execution order. DNS, deployment-environment changes, publication and application
deployment remain separately controlled operations.
