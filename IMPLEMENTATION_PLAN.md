# Implementation Plan: Make service URLs configurable at runtime

## Overview

The four API service URLs (`VITE_TIL_API_URL`, `VITE_TIR_API_URL`, `VITE_CCS_API_URL`, `VITE_ODRL_API_URL`) are currently baked into the JavaScript bundle at Vite build time via `import.meta.env.VITE_*` in `src/api/config.ts`. This means changing a URL requires rebuilding the Docker image. The goal is to make these URLs configurable at container startup (runtime) using environment variables, following the same pattern already established for authentication configuration (`window.__AUTH_CONFIG__` / `config.template.js` / `10-render-config.sh`).

## Steps

### Step 1: Extend runtime config template and entrypoint script to inject API URLs

**Goal:** Add API URL environment variables to the existing runtime config injection pipeline so they are available on `window` before the Vue app bootstraps.

**Files to modify:**

1. **`public/config.template.js`** — Add a new global assignment for API URLs alongside the existing `window.__AUTH_CONFIG__`:
   ```js
   window.__AUTH_CONFIG__ = ${AUTH_CONFIG_JSON};
   window.__API_CONFIG__ = ${API_CONFIG_JSON};
   ```

2. **`public/config.js`** (dev stub) — Add a comment explaining that `window.__API_CONFIG__` is intentionally not set in dev mode, so `configureApiClients()` falls back to `import.meta.env.VITE_*` variables and the Vite dev proxy.

3. **`scripts/docker-entrypoint.d/10-render-config.sh`** — Extend the script to:
   - Read four new environment variables: `TIL_API_URL`, `TIR_API_URL`, `CCS_API_URL`, `ODRL_API_URL`.
   - Build an `API_CONFIG_JSON` string as a JSON object, e.g. `{"tilApiUrl":"...","tirApiUrl":"...","ccsApiUrl":"...","odrlApiUrl":"..."}`.
   - Default each URL to an empty string `""` when unset (which tells the frontend to use the nginx proxy path `/api/<service>`).
   - Add `API_CONFIG_JSON` to the `envsubst` variable list.

4. **`src/vite-env.d.ts`** — Extend the `Window` interface to declare `__API_CONFIG__?: unknown`.

**Acceptance criteria:**
- The entrypoint script correctly renders `config.js` with both `__AUTH_CONFIG__` and `__API_CONFIG__` globals.
- When API URL env vars are unset, `__API_CONFIG__` contains empty strings for all four URLs.
- When API URL env vars are set (e.g. `TIL_API_URL=https://til.example.com`), the values appear in the rendered `config.js`.
- The dev stub `public/config.js` does not set `window.__API_CONFIG__`.
- The template file is still deleted after rendering.

### Step 2: Update frontend to consume runtime API config with fallback chain

**Goal:** Modify `src/api/config.ts` to read service URLs from `window.__API_CONFIG__` at runtime, falling back to `import.meta.env.VITE_*` (for dev), then to default proxy paths (`/api/<service>`).

**Files to modify:**

1. **`src/api/config.ts`** — Refactor `configureApiClients()` to implement a three-tier URL resolution:
   - **Priority 1:** `window.__API_CONFIG__.<service>ApiUrl` (runtime injection, production path).
   - **Priority 2:** `import.meta.env.VITE_<SERVICE>_API_URL` (build-time, local dev with env vars).
   - **Priority 3:** Default proxy prefix constants (`/api/til`, `/api/tir`, etc.).

   Add a helper function (e.g. `loadApiConfig()`) that:
   - Reads `window.__API_CONFIG__` if available.
   - Validates it is a plain object.
   - Extracts string URL fields, ignoring empty strings (so that unset env vars at the Docker level gracefully fall through to the default proxy paths).
   - Returns an object with optional URL overrides.

   Define named constants for the `window.__API_CONFIG__` global key (e.g. `API_CONFIG_GLOBAL = '__API_CONFIG__'`) and the expected field names to avoid magic strings.

**Acceptance criteria:**
- In production with `TIL_API_URL=https://til.example.com` set, the TIL client uses `https://til.example.com` as its base URL.
- In production with no API URL env vars set, all clients use the default `/api/<service>` proxy paths (same as current behavior).
- In development (`npm run dev`), the fallback to `import.meta.env.VITE_*` and then to default proxy paths still works exactly as before.
- No magic strings — all global/env var names are defined as named constants.
- The function and all constants are documented with JSDoc/TSDoc comments.
- `npm run build` succeeds (type-check passes).
- `npm run lint` passes.

### Step 3: Update Docker and documentation to demonstrate runtime URL configuration

**Goal:** Update `docker-compose.yml` and related files to demonstrate and document the new runtime URL configuration capability.

**Files to modify:**

1. **`docker-compose.yml`** — Add commented-out `environment` block on the `dashboard` service showing how to pass the new env vars:
   ```yaml
   environment:
     # TIL_API_URL: http://custom-til:8080
     # TIR_API_URL: http://custom-tir:8080
     # CCS_API_URL: http://custom-ccs:8080
     # ODRL_API_URL: http://custom-odrl:8080
   ```

2. **`Dockerfile`** — The Dockerfile already installs `gettext` for `envsubst` and copies the entrypoint script. No changes needed unless the entrypoint script filename or path changed. Add a comment documenting the new env vars alongside the existing `AUTH_CONFIG_JSON` comment.

**Verification:**
- `docker compose up --build` still works with mock backends (no env vars set = default proxy paths used).
- Setting `TIL_API_URL=http://mock-til:80` (etc.) on the dashboard service in docker-compose also works correctly.
- `npm run build` succeeds.
- `npm run lint` passes.
