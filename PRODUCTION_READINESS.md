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
no infrastructure changes. These checks do not prove the live API or headers.

Before publication:

1. Complete and verify the API origin hostname/vhost, certificate and browser
   CORS for the canonical website. The prepared Pages profile does not proxy API
   requests through GitHub; it requires the separately configured API hostname.
2. Replace the local bounded community-summary reader with a production aggregate
   endpoint before wider use. Do not remove its cap or sum rounded per-map values.
3. Complete second-browser, narrow layout, keyboard, zoom, clipboard and actual
   website-to-installed-desktop import checks.
4. Verify actual CSP, worker/WASM behavior, referrer policy, caching, HTTPS,
   redirects and private-route isolation. Local preview headers do not prove
   the production host's behavior.
5. Confirm About/Privacy, source/download/support links and provider logging
   disclosures against the actual deployment.
6. Review bundle performance, verify the custom domain, review/activate the
   separately triggered publication-workflow draft and its environment protection.
   Retain the prior static artifact and matching header policy for rollback.
   Record the exact source commit and artifact hashes. Website rollback must not
   roll back application data.

The community review is synthetic. Production community discovery, visibility,
aggregates and admission controls need a separately tested backend contract.
Public aliases and temporary recipient links are additional work. Browser
preferences grant no access, and the website exposes no voting or authoring API.

Domain verification, DNS changes, enabling Pages, publishing the website and
application-server deployment remain separately controlled operations.
