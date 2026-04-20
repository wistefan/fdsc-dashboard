# FDSC Dashboard

A Vue 3 dashboard for managing FIWARE Data Space Connector (DSC) resources including Trusted Issuers Lists (TIL), Credentials Config Service (CCS), and ODRL Policies.

## Tech Stack

- **Vue 3** with Composition API and TypeScript
- **Vuetify 3** – Material Design component library
- **Vue Router** – client-side routing
- **Pinia** – state management
- **Vue I18n** – internationalization (English by default)
- **Vite** – build tooling and dev server

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- npm (comes with Node.js)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (optional, for containerized setup)

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

The app starts at **http://localhost:3000**. Hot-module replacement is enabled so changes are reflected instantly.

### 3. Configure backend API URLs (optional)

By default the Vite dev server proxies API requests to local backend services:

| Service | Env Variable        | Default                |
|---------|---------------------|------------------------|
| TIL     | `VITE_TIL_API_URL`  | `http://localhost:8080` |
| TIR     | `VITE_TIR_API_URL`  | `http://localhost:8081` |
| CCS     | `VITE_CCS_API_URL`  | `http://localhost:8082` |
| ODRL    | `VITE_ODRL_API_URL` | `http://localhost:8083` |

Override them by setting environment variables before running the dev server:

```bash
VITE_TIL_API_URL=http://my-til-host:8080 npm run dev
```

## Running with Docker Compose (Mock Backends)

The project includes mock backend services that return empty collections so the UI can render without real services running. Docker Compose mounts a dedicated nginx config (`nginx-docker-compose.conf`) that routes API requests to the mock service containers.

```bash
# Build and start the dashboard with mock backends
docker compose up --build
```

This starts:

| Service        | Description                         |
|----------------|-------------------------------------|
| `dashboard`    | The dashboard UI on **http://localhost:8080** |
| `mock-til`     | Mock Trusted Issuers List service   |
| `mock-tir`     | Mock Trusted Issuers Registry       |
| `mock-ccs`     | Mock Credentials Config Service     |
| `mock-odrl`    | Mock ODRL-PAP service               |

Stop the stack with:

```bash
docker compose down
```

## Available Scripts

| Command           | Description                                   |
|-------------------|-----------------------------------------------|
| `npm run dev`     | Start the Vite dev server with HMR            |
| `npm run build`   | Type-check and build for production           |
| `npm run preview` | Preview the production build locally          |
| `npm run lint`    | Lint source files with ESLint (auto-fix)      |
| `npm run format`  | Format source files with Prettier             |

## Building for Production

```bash
npm run build
```

The production bundle is output to the `dist/` directory. You can preview it with:

```bash
npm run preview
```

### Docker Image

Build a standalone Docker image:

```bash
docker build -t fdsc-dashboard .
docker run -p 8080:80 fdsc-dashboard
```

The image uses a multi-stage build (Node 20 for building, nginx for serving).

## Project Structure

```
src/
  App.vue              # Root component with navigation drawer
  main.ts              # Application entry point
  router/index.ts      # Route definitions
  stores/index.ts      # Pinia store setup
  plugins/
    vuetify.ts         # Vuetify configuration and theming
    i18n.ts            # Vue I18n setup
  locales/
    en.json            # English translations
  composables/
    useTheme.ts        # Theme toggle composable
  views/
    HomeView.vue       # Landing page
    til/               # Trusted Issuers List views
    ccs/               # Credentials Config Service views
    policies/          # ODRL Policy views
mocks/                 # Mock backend data and nginx configs
```

## Theming

The dashboard is fully themable via Vuetify's theming system. Light and dark themes are configured in `src/plugins/vuetify.ts`. A theme toggle is available in the UI via the `useTheme` composable.

## Localization

Translations are managed with Vue I18n. Language files live in `src/locales/`. Currently only English (`en.json`) is provided. To add a new language, create a new JSON file in that directory and register it in `src/plugins/i18n.ts`.

## Backend Services

This dashboard is designed to work with the following FIWARE services:

- **TIL** – [Trusted Issuers List](https://github.com/FIWARE/trusted-issuers-list)
- **TIR** – Global Trusted Issuers Registry (EBSI-compatible, same repo as TIL)
- **CCS** – [Credentials Config Service](https://github.com/FIWARE/credentials-config-service)
- **Policies** – [ODRL-PAP](https://github.com/SEAMWARE/odrl-pap)

API clients are kept in sync with the OpenAPI specifications published by these services.

## CI / CD Pipeline

The project ships with a full GitHub Actions pipeline. The workflows live under
[`.github/workflows/`](.github/workflows/).

### Overview

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `pr-labels.yml` | `pull_request` | Enforces exactly one `major` / `minor` / `patch` label and validates the PR description format. |
| `test.yml`      | `push`, `pull_request` | Runs `npm ci`, `npm run generate:api`, `npm run lint`, `npm run build`, and `npm test --if-present`. |
| `pr-build.yml`  | `pull_request` | Builds a multi-arch (`linux/amd64`, `linux/arm64`) Docker image and pushes it to Quay.io tagged `<nextVersion>-PRE-<shortSha>`. |
| `release.yml`   | `push` to `main` | Computes the next version, tags the repo, builds and pushes the multi-arch image tagged `<version>` (and `latest`), promotes release notes, and creates a GitHub Release. |

### Semantic Versioning via PR Labels

Every PR **must** carry exactly one of these labels:

- `major` – breaking changes; bumps `MAJOR`, resets `MINOR`/`PATCH`.
- `minor` – new features, backward compatible; bumps `MINOR`, resets `PATCH`.
- `patch` – bug fixes, docs, tooling; bumps `PATCH`.

The workflow `pr-labels.yml` — modelled after
[FIWARE/contract-management's `check.yml`](https://github.com/FIWARE/contract-management/blob/main/.github/workflows/check.yml)
— fails the PR if the rule is violated.

### Docker Image Tagging

All images are pushed to
[`quay.io/seamware/fdsc-dashboard`](https://quay.io/repository/seamware/fdsc-dashboard).

- **Pull-request builds** → `quay.io/seamware/fdsc-dashboard:<nextVersion>-PRE-<shortSha>`
  (the `-PRE-` marker makes them easy to spot and prune).
- **Main (release) builds** → `quay.io/seamware/fdsc-dashboard:<version>` and
  `:latest`.

Images are built for `linux/amd64` and `linux/arm64` via `docker/buildx`.

### Required Secrets

Configure these in the repository settings (`Settings → Secrets and variables → Actions`):

| Secret           | Purpose                                               |
|------------------|-------------------------------------------------------|
| `QUAY_USERNAME`  | Robot account or user login for `quay.io`             |
| `QUAY_PASSWORD`  | Token/password for the above                          |

### PR Description Format

PRs must follow the template in
[`.github/pull_request_template.md`](.github/pull_request_template.md). The CI
rejects PRs that are missing the `## Summary` or `## Release Notes` sections.
The `## Release Notes` content is promoted to
[`release-notes/<version>.md`](release-notes/) on merge.

### Release-Notes Mechanism

Two options for authoring release notes:

1. **Inline** — fill in the `## Release Notes` section of the PR description
   (recommended for most changes).
2. **Dedicated file** — add `release-notes/next.md` on the PR branch.
   The release workflow prefers this file over the PR body and renames it
   to `release-notes/<version>.md` on merge. Use this for long-form or
   multi-section notes.

On every merge to `main`, the release workflow:

1. Writes `release-notes/<version>.md` using the resolution above.
2. Regenerates [`RELEASE-NOTES.md`](RELEASE-NOTES.md) — a Markdown table
   (`Version` / `Date` / `Notes`) linking to each file in `release-notes/`.
3. Creates an annotated git tag `v<version>` and a GitHub Release whose
   body is the notes file.
