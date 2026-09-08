# Pages workflow guide

Source CI validates without deploying. `.github/workflows/pages.yml` publishes a
reviewed static artifact; `.github/workflows/maintenance.yml` publishes the bounded
maintenance notice. Both are manual workflows. Files under `ops/*.yml.example`
are reference copies, not active workflows.

## Build profiles

- `npm run validate` uses same-origin `/web/v1`.
- `npm run validate:pages` uses `https://api.wraeclastledger.com/web/v1`.
- Export builds reject local review flags and alternative API addresses.
- Both write `dist/client`; preserve a candidate before building another profile.
  Generated reports remain outside the website in `outputs/<profile>/`.

The build makes no API requests. Passing does not prove production CORS, headers
or browser behavior. See [release checks](../PRODUCTION_READINESS.md).

## Artifact review

`artifact-manifest.json` lists file sizes and SHA256 hashes. `release-policy.json`
records the selected profile, public API URL, manifest digest and proposed headers.
The header proposal derives inline-script hashes from the actual exported HTML;
a rebuild may change those hashes even for the same source revision.

Vite metadata remains in build evidence rather than the static directory. Hidden
entries are rejected because Pages packaging omits them. Compare the downloaded
release evidence and the actual Pages package with the manifest before publishing.

The scanner checks bounded known review/private content, linked files, source maps
and profile mix-ups. It does not replace source/artifact review. Public repository
content should be useful to users or contributors; internal planning, operational
records and personal data belong outside this repository.

## Manual publication

Dispatch from main with the full tested source SHA. The preparation job verifies
main ancestry and the configured website target, then validates and retains the
candidate and manifest/policy evidence. Repository workflow definitions specify
the exact permissions, pinned tools and artifact-retention period.

Review the generated artifact and compatible response policy before approving the
protected deployment job. That job publishes the packaged bytes without rebuilding.
Header proposals are evidence files; GitHub Pages does not apply them automatically.

After publication, verify file identity, API/browser behavior and actual policy
enforcement using the [release checklist](LAUNCH_CHECKLIST.md). Keep operational
account configuration and internal acceptance records in maintainer documentation.

## Recovery

Retain each accepted artifact, manifest, source revision and compatible policy.
A rebuild of an older source revision is not necessarily byte-identical recovery.
Use a reviewed path that restores the identified artifact without rerunning its
build, and verify the resulting website. Recovery must not roll back application data.

The maintenance workflow packages only the two checked static documents under
`ops/maintenance/`, without application dependency installation or builds.
`scripts/check-maintenance.mjs` rejects changed, extra or linked files. This is
a static replacement, not proof that a site was unpublished or cached copies removed.
