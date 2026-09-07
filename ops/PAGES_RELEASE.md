# Pages release preparation

`pages.yml.example` is an inactive draft, outside `.github/workflows`. It cannot
run on GitHub. Copying/activating it and dispatching it are later reviewed steps.
No domain, Pages environment, certificate, DNS, header rule or live service is
configured by local validation. Normal source CI remains read-only.

Current state and the proposed first-launch settings are in
[LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md). API infrastructure is accepted;
the remaining canonical-browser, community-summary and website-host gates still
apply. Organization domain verification does not configure the repository domain.

## Build profiles

- `npm run validate` defaults to same-origin `/web/v1`, preserving local fixture
  review. Clear explicit profile/API overrides when returning to that default.
- `npm run validate:pages` selects only
  `https://api.wraeclastledger.com/web/v1`. Review flags, alternative addresses,
  credentials, suffix hosts, query strings and trailing slashes are rejected.
- Both validate source and build into `dist/client`. Only that directory is the
  static artifact. Reports live separately in ignored `outputs/<profile>/`.
  Preserve a Pages candidate before running another build; the next build replaces
  `dist/client`. Dev/community previews keep their existing configuration.
- The build performs no API requests. Passing proves a prepared client, not a
  functioning production API or browser CORS connection.

The manifest hashes every static file. `release-policy.json` includes the profile,
API base, manifest digest (`artifactId`) and proposed response headers. It includes
hashes of actual inline scripts across every exported HTML file; new builds may
change those hashes. Never reuse the previous build's CSP without comparison.
Reports are not served or committed. The artifact scanner catches bounded known
preview/private content, linked files, source maps and profile mix-ups; it is not
a universal privacy scanner. Review the staged source and final artifact too.
Vite build metadata is retained in the evidence directory before the website is
hashed. Hidden entries are rejected in the final static directory because the
GitHub Pages packaging action omits them. Downloaded release files and the actual
Pages tar must both match the reviewed manifest before deployment approval.

## Preconditions before activating the workflow

1. The source SHA has passed both build profiles, Windows/Linux CI and the
   pre-publication browser/import checks in PRODUCTION_READINESS. Reserve actual
   canonical-origin browser/header checks for the controlled launch acceptance;
   they cannot pass before that origin serves the site. The API hostname's
   three safe read routes, exact CORS and exposed Retry-After are tested; private
   routes and browser credentials are not forwarded. Community production gaps
   remain independent launch blockers for those features.
2. GitHub Pages is in Actions/workflow mode with `wraeclastledger.com` configured
   through repository settings. This draft reads those settings and fails if they
   differ; it never creates them. No `CNAME` file substitutes for this setup.
3. Inspect and deliberately configure the `github-pages` environment protection:
   required reviewer approval and main-only deployment. Confirm who can approve
   and the effective self-approval/admin-bypass rules. An environment name by itself
   does not require approval. If a suitable review gate cannot be configured,
   keep the draft inactive and prepare an alternative review process first.
4. Confirm the final API origin certificate, Cloudflare Full (strict), HTTPS
   redirect (already accepted) and the proposed minimum TLS 1.2 (not yet applied).
   Keep Origin CA API traffic proxied. Domain routing,
   publishing and origin changes retain their separate approvals.

## Reviewing one release

After activation is approved, dispatch from main using one full tested source SHA.
The read-only preparation job validates it, verifies main ancestry and retains the
exact static files plus manifest/policy for 90 days. The separate deployment job
has Pages/OIDC permissions and no checkout or application scripts.

Before approving the environment, download `release-evidence`, review the exact
artifact and apply the separately authorized matching header policy. Scope the
Cloudflare response rule to website apex/www. GitHub Pages does not apply these
headers from a local `_headers` file. Generated CSP must stay within 4 KiB; it
allows this API and official item artwork, self-hosted scripts/workers and browser
WASM. Clipboard write is allowed for the website itself. Test actual enforcement.

Plan old/new CSP hashes during deployment and cache turnover. Start HTML and the
new API without forced edge caching; response headers alone do not control edge
cache eligibility. Do not purge assets needed by an older approved HTML version.
The deployment job uses the same packaged bytes, without rebuilding after approval.
Inspect the deployed identity, direct/hash navigation, errors, clipboard/WASM,
headers, redirects, HTTPS and CORS before calling the launch complete.

## Rollback

Before replacing a release, retain its exact static files, manifest, source SHA,
header policy and workflow run ID. The first launch has no previous live version.
A rebuild of an older SHA may produce new inline hashes and is not byte-identical
rollback. A bounded artifact-restore dispatch must be prepared and reviewed before
a second release: retrieve the retained bytes from the identified successful run,
verify its manifest, restore matching headers and deploy without rebuilding.
Do not enable an arbitrary-run downloader or restore database state for website
rollback. Do not claim a tested rollback until the live artifact route is exercised.

For first-launch recovery, `maintenance.yml.example` is also inactive. Its pinned
manual workflow packages two reviewed inert documents, without application installs
or builds, behind the same environment gate. `scripts/check-maintenance.mjs` rejects
extra, changed or linked files. The ordinary test suite exercises those failures.
This is a prepared website replacement; actual hosted recovery still needs a drill.
See LAUNCH_CHECKLIST for replacement/unpublish distinctions and acceptance checks.

References: [GitHub custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[environment protection](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).
