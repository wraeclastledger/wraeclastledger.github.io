# Production readiness

Source preparation and GitHub CI are separate from website publication. The
included workflow has read-only repository permission and no deployment step.

The intended static host is GitHub Pages, with wraeclastledger.com as the custom
domain. The existing application API supplies data; it is not bundled here.
`.openai/hosting.json` describes the static output and has no registered project.

The preferred prototype is now the standard presentation on every route; the
former alternate layout is retired. Closer visual acceptance remains separate.

Before publication:

1. Configure the exact API address and browser CORS origins or an approved edge
   proxy. The current export requires same-origin `/web/v1`; GitHub Pages alone
   will not proxy it. Change the build policy and artifact checks together for
   the approved configuration.
2. Replace the local bounded community-summary reader with a production aggregate
   endpoint before wider use. Do not remove its cap or sum rounded per-map values.
3. Complete second-browser, narrow layout, keyboard, zoom, clipboard and actual
   website-to-installed-desktop import checks.
4. Verify actual CSP, worker/WASM behavior, referrer policy, caching, HTTPS,
   redirects and private-route isolation. Local preview headers do not prove
   the production host's behavior.
5. Confirm About/Privacy, source/download/support links and provider logging
   disclosures against the actual deployment.
6. Review bundle performance, verify the custom domain, prepare a separately
   triggered publication workflow and retain the prior static artifact for rollback.
   Record the exact source commit and artifact hashes. Website rollback must not
   roll back application data.

The community review is synthetic. Production community discovery, visibility,
aggregates and admission controls need a separately tested backend contract.
Public aliases and temporary recipient links are additional work. Browser
preferences grant no access, and the website exposes no voting or authoring API.

Domain verification, DNS changes, enabling Pages, publishing the website and
application-server deployment remain separately controlled operations.
