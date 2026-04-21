<!--
Thank you for contributing to fdsc-dashboard!

Before you submit:

1. Apply exactly ONE semver label to this PR: `major`, `minor`, or `patch`.
   The CI will fail without it.
2. Keep the section headings below intact — the CI validates their presence.
3. Fill in a meaningful `## Release Notes` block; it is the source of the
   generated release notes for the next version.
4. If the release needs richer / multi-section notes, create
   `release-notes/next.md` on this branch instead. The release workflow will
   prefer that file and rename it to `release-notes/<version>.md` on merge.
-->

## Summary

<!-- A short, high-level description of WHAT this PR does and WHY. -->

## Release Notes

<!--
User-facing summary that will appear in RELEASE-NOTES.md. Think
"what would I want to read in a changelog?". Keep it concise and write for
humans. If you need more structure, add release-notes/next.md instead and
this section can remain brief.
-->

## Testing

<!-- How did you verify the change? Commands run, screenshots, etc. -->

## Checklist

- [ ] I applied exactly one of `major` / `minor` / `patch` labels.
- [ ] The `## Summary` and `## Release Notes` sections are filled in, _or_
      I added a `release-notes/next.md` file on this branch.
- [ ] Lint and build pass locally (`npm run lint`, `npm run build`).
