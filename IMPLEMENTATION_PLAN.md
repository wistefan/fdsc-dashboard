# Implementation Plan: CI for fdsc-dashboard (Ticket #11)

## Background

The `fdsc-dashboard` project has no continuous integration pipeline yet. This plan
introduces a GitHub Actions based CI/CD pipeline that covers testing, PR label
enforcement, semantic versioning, multi-arch Docker image building/pushing to
`quay.io/seamware/fdsc-dashboard`, and an auditable release-notes mechanism.

## Goals

1. Enforce a `major`/`minor`/`patch` label on every pull request.
2. Compute the next semantic version automatically from the applied label.
3. Run the test / lint / build pipeline on every push and pull request.
4. Build and push multi-arch (`linux/amd64`, `linux/arm64`) Docker images to
   `quay.io/seamware/fdsc-dashboard`:
   - PR builds are tagged `<version>-PRE-<sha>` (the `-PRE-` marker makes them
     easy to identify as pre-release artefacts).
   - Post-merge builds on `main` are tagged with the generated semantic
     version (and `latest`).
5. Provide an enforced PR description format that produces the release note
   body automatically.
6. Allow contributors to ship a dedicated `release-notes/<version>.md` file in
   their PR branch (overrides the description-derived note).
7. Maintain `RELEASE-NOTES.md` at repo root as a table that links to individual
   release notes in `release-notes/`.

## Step Summary

| # | Title | Artefacts |
|---|---|---|
| 1 | Full CI/CD pipeline, versioning, release-notes mechanism | `.github/workflows/*.yml`, `.github/scripts/*.sh`, `.github/pull_request_template.md`, `RELEASE-NOTES.md`, `release-notes/`, `README.md` section on CI |

Because the project is green-field with respect to CI, the entire pipeline is
delivered as a single cohesive change: every piece is interdependent (the release
job reads the version computed by the label check, the docker tags come from the
same version computer, etc.). Splitting the change into multiple sub-steps would
leave the repository in broken intermediate states where (for example) PR
images are built but no version can be computed.

## Step 1 — Detailed Design

### 1.1 Workflows

- **`.github/workflows/pr-labels.yml`** — runs on `pull_request` events
  (`opened`, `reopened`, `labeled`, `unlabeled`, `synchronize`, `edited`).
  Uses `.github/scripts/check-labels.sh` to assert exactly one of
  `major`, `minor`, `patch` is applied; fails otherwise. Also validates
  that the PR description matches the enforced format using
  `.github/scripts/check-pr-description.sh`.

- **`.github/workflows/test.yml`** — runs on `push` (any branch) and
  `pull_request`. Checks out the repo, installs Node 20, runs
  `npm ci`, `npm run lint`, `npm run build`. A separate `test` step runs
  `npm test --if-present` so the workflow keeps working once actual unit
  tests are added to the project later.

- **`.github/workflows/pr-build.yml`** — runs on `pull_request`
  (synchronized). Computes the next version
  from the applied label and the latest git tag, tags the Docker image
  `<nextVersion>-PRE-<shortSha>`, and pushes a multi-arch build to
  `quay.io/seamware/fdsc-dashboard`. Uses `docker/setup-buildx-action`
  with `linux/amd64,linux/arm64`.

- **`.github/workflows/release.yml`** — runs on `push` to `main`
  (i.e., after a PR merge). Computes the new version from the merged PR's
  label, creates an annotated git tag, builds and pushes the multi-arch
  image tagged with the version (and `latest`), then:
  - Writes `release-notes/<version>.md` either from the dedicated file the
    PR branch supplied, or from the PR description (the "## Release Notes"
    section).
  - Regenerates `RELEASE-NOTES.md` (table of version → link → date).
  - Creates a GitHub Release pointing to the version tag.

### 1.2 Helper Scripts (`.github/scripts/`)

- `check-labels.sh` — validates that a PR carries exactly one of
  `major`, `minor`, `patch`.
- `check-pr-description.sh` — validates that the PR body contains the
  required template sections (`## Summary`, `## Release Notes`).
- `compute-next-version.sh` — reads the latest `vMAJOR.MINOR.PATCH` tag and
  the chosen bump label, outputs the next version.
- `extract-release-notes.sh` — on post-merge, prefers
  `release-notes/<version>.md` in the PR branch if it exists, otherwise
  extracts the `## Release Notes` section of the PR body and writes it to
  `release-notes/<version>.md`.
- `update-release-notes-index.sh` — regenerates `RELEASE-NOTES.md` as a
  Markdown table with columns *Version*, *Date*, *Notes*.

### 1.3 PR Template

- `.github/pull_request_template.md` — defines `## Summary`,
  `## Release Notes`, `## Testing` sections with placeholders. The
  description check workflow enforces the first two.

### 1.4 Dedicated Release-Notes File Mechanism

A contributor who wants richer, multi-section release notes may add a file
`release-notes/next.md` on the PR branch. On merge, the release workflow
renames it to `release-notes/<version>.md` and uses it verbatim instead of
the PR body. This keeps trivial PRs lightweight (description only) while
still allowing elaborate release notes when needed.

### 1.5 Secrets

Requires `QUAY_USERNAME` and `QUAY_PASSWORD` (or `QUAY_ROBOT_TOKEN`) repo
secrets — documented in the README.

## Definition of Done

- All workflow files parse correctly (`yamllint`-style valid YAML) and
  reference existing scripts.
- Helper scripts are executable and have self-tests (`--help`/`--version`
  exit cleanly, parameterized internal logic).
- README contains a new "CI/CD" section explaining the label flow, image
  tagging, PR template, and release-notes mechanism.
- `RELEASE-NOTES.md` exists with a placeholder entry explaining the format.
- `release-notes/` folder exists with a `README.md` entry explaining the
  dedicated-file override.
