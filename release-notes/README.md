# Release Notes Directory

This directory contains one Markdown file per released version of
**fdsc-dashboard**, named `<version>.md` (e.g. `1.2.3.md`).

Files in here are consumed by `.github/scripts/update-release-notes-index.sh`
to regenerate the top-level [`RELEASE-NOTES.md`](../RELEASE-NOTES.md) table.

## Authoring Release Notes

There are two ways to author the release notes for your PR:

1. **Inline (default)** — Fill in the `## Release Notes` section of the
   pull-request description using the template in
   `.github/pull_request_template.md`. The release workflow extracts that
   section and writes it to `<version>.md` on merge.

2. **Dedicated file (opt-in)** — Add a file named `release-notes/next.md`
   on your PR branch. The release workflow prefers this file over the PR
   body and promotes it to `release-notes/<version>.md` on merge. Use this
   when you need multiple sections, long-form copy, or embedded media that
   would be awkward inside a PR description.

You may edit past release notes (e.g. to fix typos), but remember that they
have already been shipped in GitHub Releases too — for substantive changes,
prefer amending the next release notes with a correction.
