# First website launch

Preparation only. This file is not a DNS import or permission to publish.
The static host remains GitHub Pages. The existing API, desktop application,
original prototype and isolated community preview retain their current roles.

## Current state — September 7, 2026

| Area | Verified state | Remaining work |
| --- | --- | --- |
| Source | Both profiles passed Windows/Ubuntu CI at `232709328b4af37c12c910efca797f0d6d505bb6` | Validate every subsequent candidate |
| API | Public HTTPS, exact website CORS, no-store, safe-route isolation and HTTP 308 accepted | Browser proof from the canonical website |
| Domain | Organization ownership verified; retain the verification TXT | Repository custom domain, apex/www serving DNS |
| Pages | Workflow mode; custom domain unset; publication draft inactive | Review and activate the exact workflow after gates pass |
| Deployment environment | Main-only branch policy; no reviewer; admin bypass allowed | Configure the proposed approval gate deliberately |
| Website policy | Generated CSP/header proposal only | Apply and verify actual edge headers/cache/redirect rules |
| Community totals | Card retained; tested single-request aggregate deployed and accepted | Verify the card from the canonical website origin |
| User acceptance | Local presentation provisionally accepted | Browser/clipboard/native-import checks; closer visual review deferred |

CI checks source. GitHub hosts the static files. Cloudflare handles DNS, edge TLS
and response rules. The API server supplies safe strategy data. A source push
does not deploy the application server or activate the inactive Pages draft.

## Proposed settings, subject to approval

**Execution target: maintainer workstation, GitHub/Cloudflare dashboards; these
are proposed account configuration changes, not commands for either server VM.**

1. In the website repository's `github-pages` environment, retain the exact
   `main` branch policy. Add the repository owner as required reviewer, keep
   self-review allowed so the owner can approve a run they requested, and disable
   administrator bypass. This provides a deliberate second approval of the
   generated artifact; it does not require another maintainer's code review.
   Confirm the resolved reviewer account and resulting settings before activation.
2. Set the Pages custom domain to `wraeclastledger.com` in repository settings,
   retaining Actions/workflow mode. Preserve organization ownership verification.
3. Add the following website records only after the repository domain is set.
   Inspect existing records first and preserve unrelated records, especially the
   accepted API and verification TXT. Do not create wildcard DNS.

| Type | Name | Content | Certificate bootstrap | Final state |
| --- | --- | --- | --- | --- |
| A | @ | 185.199.108.153 | DNS-only, TTL 300 | Proxied, Auto |
| A | @ | 185.199.109.153 | DNS-only, TTL 300 | Proxied, Auto |
| A | @ | 185.199.110.153 | DNS-only, TTL 300 | Proxied, Auto |
| A | @ | 185.199.111.153 | DNS-only, TTL 300 | Proxied, Auto |
| CNAME | www | wraeclastledger.github.io | DNS-only, TTL 300 | Proxied, Auto |

4. Wait for GitHub's certificate to cover the canonical domain and www, verify
   normal CA/hostname validation directly against GitHub, and retain Enforce HTTPS.
   Then enable website proxying while retaining Full (strict). Cloudflare's
   visitor certificate and GitHub's origin certificate are separate; neither is
   the API Origin CA certificate. Verify issuance and later renewal work through
   the final proxy/redirect configuration; do not promise that first issuance
   proves renewal. Never weaken TLS to work around a certificate error.
5. Propose minimum visitor TLS 1.2 for this zone. This also affects the accepted
   API, so recheck it after approval/application. Keep existing host ports/ACLs.
6. Prepare two website-only edge redirects, ahead of any conflicting rule:
   `http.host eq "www.wraeclastledger.com"` redirects to the canonical HTTPS
   hostname; `(http.host eq "wraeclastledger.com" and not ssl)` upgrades HTTP.
   Both use status 308, target expression
   `concat("https://wraeclastledger.com", http.request.uri.path)` and preserve
   query string. Keep the API redirect unchanged. Exclude
   `starts_with(http.request.uri.path, "/.well-known/acme-challenge/")` from
   these website redirects so certificate validation reaches GitHub unchanged.
7. Set the five response headers from the exact candidate's `release-policy.json`
   on apex/www only. Add `Cache-Control: no-store` for HTML and route responses;
   start with a website-only edge cache bypass. The policy report's five security
   headers do not set cache eligibility. Do not enable Rocket Loader, HTML/script
   rewriting, forced HTML caching or broad HSTS as part of this launch.

Cloudflare rule edits must preserve other rules in each existing phase. Record
new resource IDs and previous values privately for rollback. Public source must
not contain account IDs, origin addresses, operator paths, private keys or logs.

## Release sequence

The approved scope keeps community totals. Complete their backend acceptance and pre-publication checks in
[PRODUCTION_READINESS](../PRODUCTION_READINESS.md). Review the exact source diff
and both CI profiles. Then, with explicit launch authorization, configure the
approved settings and activate the reviewed `pages.yml.example` by placing it in
`.github/workflows`. It has only a manual trigger; regular CI remains validation-only.

Dispatch from main with the full tested source SHA. The preparation job creates
the final candidate; local build hashes are not a substitute for that artifact.
Inspect the retained files, manifest and matching header proposal before approving
the waiting deployment. Apply the matching approved edge policy and deploy those
same packaged bytes. Capture source SHA, workflow run ID and manifest digest.

After deployment verify public TLS, redirects with paths/queries, asset identity,
security headers, API CORS, filters/sorts/pagination, direct hash links, Back/Forward,
missing/error states, keyboard/narrow/zoom behavior, artwork and Brotli worker/WASM.
Verify clipboard success and fallback, then inspect a website-generated setup code
in the installed desktop app without overwriting valuable session work. A second
browser check remains required. Canonical-origin browser checks necessarily happen
after the controlled publication; do not describe them as already passed.

## First-launch stop and recovery

Stop on wrong content/host, TLS errors, broken CSP/worker/clipboard behavior,
unexpected credential/private-route exposure or manifest mismatch. Before the
first dispatch, record the current Pages/DNS/rules state and the exact unpublish
operation available for this repository. Deleting Pages previously returned 422;
do not assume that operation will work or call DNS removal alone an unpublish.
Removing DNS may take time and does not remove a public github.io artifact.
If an effective first-launch removal/rollback route cannot be established, keep
deployment inactive. Never include a secret in a candidate relying on later deletion.

Later releases require retained exact prior artifacts and a reviewed restore
dispatch as described in [PAGES_RELEASE](PAGES_RELEASE.md). Static rollback never
rolls back the application database.

Sources: [GitHub domain setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site),
[environment protection](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments),
[Cloudflare response-header behavior](https://developers.cloudflare.com/rules/transform/response-header-modification/).
