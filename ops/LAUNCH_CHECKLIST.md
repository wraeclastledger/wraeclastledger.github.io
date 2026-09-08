# Website release checklist

Use this checklist with the [Pages workflow guide](PAGES_RELEASE.md).
It describes repeatable release checks, not account-specific operational settings.

## Before publication

- Identify the reviewed source revision on main and confirm successful validation
  for both build profiles on Windows and Ubuntu.
- Check the candidate's affected behavior against
  [website build and release checks](../PRODUCTION_READINESS.md).
- Review source and artifacts for content appropriate to this public repository.
  Keep real user captures, personal information and private operational material out.
- Retain the current artifact, manifest and compatible response policy for recovery.
- Dispatch the manual Pages workflow with the full tested source SHA.
- Compare the retained candidate and actual Pages package against the manifest;
  review the generated header policy before authorizing publication.

## After publication

- Verify the served files match the approved artifact.
- Check HTTPS, canonical links, API access and actual response-policy enforcement.
- Check direct strategy links, list navigation, filters/sorts, missing/error states,
  themes, keyboard/narrow layouts and browser compression/clipboard behavior.
- Verify setup-code compatibility using disposable test state.
- Record the outcome and retain the previous working artifact. A failed check
  must remain visible to maintainers rather than being inferred from passing CI.

## Recovery

Use the identified previous artifact with its compatible policy, or the reviewed
static maintenance workflow. Verify the result and keep recovery separate from
application data. Maintenance replacement, unpublishing and removal of cached
content are different operations; do not treat one as proof of another.
