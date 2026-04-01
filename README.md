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

The project includes mock backend services that return empty collections so the UI can render without real services running.

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
