# Implementation Plan: Add copyright header to all code

## Overview
Introduce a repo-wide Apache 2.0 copyright header, a Node-based script that can both
verify and apply the header across in-scope source files, npm wrappers for the script,
a GitHub Actions workflow that enforces the header on every push / pull request, and
documentation updates so contributors know how to use the tooling.

The canonical header text is the exact block from the Taiga ticket (Copyright 2026
Seamless Middleware Technologies S.L. and/or its affiliates, Apache License 2.0).

**Scope of files covered** (under `src/`):
- `*.ts` and `*.vue` — header applied as `/* … */` block comment at the top of the file.
- `src/locales/*.json` — **excluded** (JSON disallows comments).
- `src/api/generated/**` — **excluded by default** because the directory is regenerated
  from upstream OpenAPI specs by `scripts/generate-api-clients.sh`; Step 5 wires the
  apply step into that script so regenerated files still receive the header.
- Outside `src/`: config files (`vite.config.ts`, `tsconfig*.json`, `scripts/*.sh`,
  `Dockerfile`, `mocks/**`) are out of scope per the ticket wording ("All src files").

## Steps

### Step 1: Add license header template and the check/apply Node script
Create the canonical header text and the tool that enforces it.

**Files to add:**
- `scripts/license-header.txt` — the exact header block from the ticket (without any
  language-specific comment delimiters). Stored once so tests/scripts stay in sync.
- `scripts/license.mjs` — a zero-dependency Node ESM script (Node >= 20, already
  required by the project) with the following CLI contract:
  - `node scripts/license.mjs check` — scans in-scope files; exits `0` if all have the
    header, exits `1` and prints the list of offenders otherwise.
  - `node scripts/license.mjs apply` — prepends the header (wrapped in `/* … */`) to
    every in-scope file that lacks it; idempotent (detects existing header via a
    stable marker string, e.g. `Seamless Middleware Technologies S.L`).
  - `--include` / `--exclude` glob args overridable from the command line; defaults
    below come from a single constant inside the script.
  - Default include globs: `src/**/*.ts`, `src/**/*.vue`.
  - Default exclude globs: `src/api/generated/**`, `src/**/*.d.ts` (optional — discuss
    in review; `vite-env.d.ts` is trivial and auto-generated-style), `src/**/*.json`.
  - Preserves a leading shebang line if one is ever encountered (future-proofing).
  - For `.vue` files, prepends the `/* … */` block **before** any `<template>` /
    `<script>` tags — Vue SFCs tolerate a leading HTML/JS comment block at the top of
    the file.
  - Uses only Node built-ins (`fs`, `path`, `url`, `node:fs/promises`) and a tiny
    hand-rolled glob matcher or Node 22's `fs.glob` guarded by a version check; no
    new runtime/devDependency must be added.

**Acceptance criteria:**
- `node scripts/license.mjs check` runs cleanly on a fresh clone and currently
  reports every in-scope file as missing the header (pre-Step 3 state).
- `node scripts/license.mjs apply` is idempotent — running it twice leaves the tree
  unchanged on the second run.
- Header text in `scripts/license-header.txt` matches the ticket description
  character-for-character (copyright year `2026`, entity `Seamless Middleware
  Technologies S.L and/or its affiliates`, Apache 2.0 URL).

### Step 2: Wire npm scripts into `package.json`
Expose the tool through the project's standard entry point so contributors and CI
invoke it identically.

**Files to modify:**
- `package.json` — add under `"scripts"`:
  - `"license:check": "node scripts/license.mjs check"`
  - `"license:apply": "node scripts/license.mjs apply"`
- Keep existing scripts untouched; alphabetise nothing (match current style, which
  does not sort keys).

**Acceptance criteria:**
- `npm run license:check` and `npm run license:apply` execute the script successfully.
- `package.json` remains valid JSON and no dependencies are added.

### Step 3: Apply the header to all existing in-scope source files
One-shot bulk application so the repository is compliant going forward.

**Procedure:**
- Run `npm run license:apply` from the repo root.
- Commit the resulting changes as a single "chore: add copyright headers" commit.

**Files affected (expected, as of `main`):**
- `src/App.vue`
- `src/main.ts`
- `src/vite-env.d.ts` (unless excluded per Step 1 decision)
- `src/api/config.ts`
- `src/composables/useLocale.ts`, `src/composables/useTheme.ts`
- `src/plugins/i18n.ts`, `src/plugins/vuetify.ts`
- `src/router/index.ts`
- `src/stores/index.ts`, `src/stores/til.ts`
- `src/views/HomeView.vue`
- `src/views/ccs/CcsListView.vue`, `src/views/ccs/CcsDetailView.vue`
- `src/views/policies/PolicyListView.vue`, `src/views/policies/PolicyDetailView.vue`
- `src/views/til/TilListView.vue`, `src/views/til/TilDetailView.vue`

**Acceptance criteria:**
- `npm run license:check` exits `0` after this step.
- `npm run build` still succeeds (headers do not break Vue SFC parsing or TS compile).
- `npm run lint` passes; if ESLint flags the block comment anywhere, update
  `.eslintrc.cjs` or header wrapping accordingly (there is no rule against file-top
  block comments in the current config, so no change is expected).

### Step 4: Add GitHub Actions workflow to enforce the header in CI
Block pull requests that introduce unlicensed files.

**Files to add:**
- `.github/workflows/license-check.yml` — trigger on `push` to `main` and on every
  `pull_request`. Single job `license-check` running on `ubuntu-latest`:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with `node-version: '20'` and `cache: npm`
  3. `npm ci`
  4. `npm run license:check`

**Acceptance criteria:**
- The workflow is syntactically valid (`yamllint` / GitHub workflow parser).
- When run against `main` post-Step 3, the workflow succeeds.
- Intentionally removing the header from any in-scope file causes the workflow to
  fail with a clear message naming the offending file(s).

### Step 5: Wire the apply step into the API-client generator and update docs
Ensure regenerated and newly added files remain compliant, and tell contributors how
the mechanism works.

**Files to modify:**
- `scripts/generate-api-clients.sh` — at the end of the script (after the existing
  "post-generation fixes" section and before the final success echo), invoke
  `node "${PROJECT_ROOT}/scripts/license.mjs" apply --include 'src/api/generated/**/*.ts'`.
  Document the reason in a short comment block. This keeps `src/api/generated/**`
  excluded from the default check but guarantees headers exist after regeneration.
- `README.md` — add a new short section "License headers" under "Available Scripts"
  that:
  - Lists the two npm scripts and what they do.
  - States that CI runs `npm run license:check` on every PR.
  - Explains the default include/exclude globs and how to add a header to new files
    (`npm run license:apply`).

**Acceptance criteria:**
- Running `npm run generate:api` leaves every file under `src/api/generated/**`
  containing the header (idempotent on repeat runs).
- `README.md` renders cleanly on GitHub and documents both scripts plus the CI guard.
- `npm run license:check` still exits `0` after Steps 3–5 combined.
