# Production readiness

Source preparation and GitHub CI are separate from website publication. The
included workflow has read-only repository permission and no deployment step.

The intended static host is GitHub Pages, with wraeclastledger.com as the custom
domain. The existing application API supplies data; it is not bundled here.
`.openai/hosting.json` describes the static output and has no registered project.

The preferred prototype is now the standard presentation on every route; the
former alternate layout is retired. Closer visual acceptance remains separate.

Prepared locally: an explicit Pages profile targets only
`https://api.wraeclastledger.com/web/v1`; the default same-origin preview profile
is preserved. API requests omit credentials/referrers and reject redirects.
Artifact validation produces content hashes and a CSP/header proposal from the
actual HTML. [The deployment draft](ops/PAGES_RELEASE.md) is inactive and applies
no infrastructure changes. Build checks alone do not prove live behavior.

## Accepted infrastructure — September 7, 2026

The API hostname is live. Origin installation and public-CA HTTPS checks passed.
Cloudflare Full (strict), API cache bypass and an API-only HTTP 308 redirect are
active. The redirect preserves paths and query strings at the edge; origin port
80 is not a prerequisite. Twenty-four external network checks passed, covering
safe list/detail/evidence reads, exact canonical-site CORS, preflights, denied
routes, no-store, absence of cookie/credential headers and existing desktop
compatibility. This is network evidence, not full website browser acceptance.

The organization has verified domain ownership. Pages is in workflow mode with
no custom domain and no activated publication workflow. Its existing environment
allows the main branch, but has no required reviewer and permits admin bypass.
Those settings are not yet the proposed publication gate. The GitHub-generated
legacy workflow remains listed; it is not evidence of a successful deployment.
Website apex/www DNS and website response-header rules remain unapplied.

The matching community aggregate is deployed and accepted. Thirty-six external
network checks passed after rollout, including summary scope/schema, repeat/HEAD
reads, rejected parameters, edge HTTPS query retention and ordinary/desktop API
compatibility. Production image tests also cover a 100,000-strategy synthetic
catalogue. The website card is retained and its detail-request loop is removed.

## Remaining launch gates

Complete preparation before dispatch; checks requiring the actual canonical
website run immediately after the separately approved controlled deployment,
before accepting the launch:

1. Verify the actual canonical website's browser connection to the accepted API.
   Local previews and command-line CORS checks cannot replace this. The Pages
   profile makes direct browser requests; GitHub does not proxy the API.
2. Keep the community totals card, as approved. It now uses one aggregate request
   at `/web/v1/strategies?summary=community` with an optional league. The matching
   tested backend is deployed; verify the card through the final website origin.
   The original 50-strategy/detail-request loop is removed. Historical losses,
   missing profit and independent map/run coverage remain disclosed; no current
   prices or rounded per-map values supply the total. Production multi-community
   discovery/admission remains separate from this existing catalogue summary.
3. Complete second-browser, narrow layout, keyboard, zoom, clipboard and actual
   website-to-installed-desktop import checks.
4. Verify actual CSP, worker/WASM behavior, referrer policy, caching, HTTPS,
   redirects and private-route isolation. Local preview headers do not prove
   the production host's behavior.
5. Confirm About/Privacy, source/download/support links and provider logging
   disclosures against the actual deployment.
6. Review bundle performance, configure the repository custom domain, review/activate the
   separately triggered publication-workflow draft and its environment protection.
   Retain the prior static artifact and matching header policy for rollback.
   Record the exact source commit and artifact hashes. Website rollback must not
   roll back application data.

The multi-community review is synthetic. Production multi-community discovery,
visibility, cross-community aggregates and admission controls need a separately
tested backend contract; the existing home catalogue totals are already live.
Public aliases and temporary recipient links are additional work. Browser
preferences grant no access, and the website exposes no voting or authoring API.

The [launch checklist](ops/LAUNCH_CHECKLIST.md) records the proposed settings and
execution order. DNS, deployment-environment changes, publication and application
deployment remain separately controlled operations.
