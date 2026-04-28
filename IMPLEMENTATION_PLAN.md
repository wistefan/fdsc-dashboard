# Implementation Plan: Fetch through backend-for-frontend service

## Overview

Replace the current architecture where the browser can communicate directly with downstream services (TIL, TIR, CCS, ODRL-PAP) by introducing a Node.js/Express Backend-for-Frontend (BFF) server. The BFF becomes the single point of contact for the browser — it serves the static SPA, proxies all `/api/*` requests to downstream services on a private network, and serves runtime configuration. This eliminates the need for downstream services to be publicly accessible.

### Architecture Decision

**Current state:** nginx serves static files and reverse-proxies `/api/*` paths. The frontend's `src/api/config.ts` supports direct service URLs via `window.__API_CONFIG__` and `VITE_*_API_URL`, allowing (and in some deployments likely using) direct browser-to-service communication.

**Target state:** A programmable Express.js BFF replaces nginx as the application server. It:
1. Serves the built SPA from `dist/` as static files.
2. Proxies `/api/{til,tir,ccs,odrl}/*` to internal downstream services using `http-proxy-middleware`.
3. Forwards client `Authorization` headers to downstream services transparently.
4. Serves a `/config.js` endpoint for runtime auth configuration (replacing the entrypoint-script approach).
5. Provides a `/health` endpoint for orchestrators.

**Why Express over nginx-only:** The current nginx proxy technically already prevents direct browser-to-service calls in Docker/production, but the frontend config still supports bypassing it. More importantly, a programmable BFF enables future enhancements: request/response transformation, aggregated API calls, server-side auth flows, rate limiting, and structured logging — none of which are practical with nginx alone.

**Why single-container (BFF replaces nginx):** The BFF serves both static files and API proxy from one Node.js process. This follows the Docker single-process best practice, avoids process-manager complexity, and simplifies deployment. For dashboards with moderate traffic, Express static file serving is more than adequate. If needed, an nginx reverse proxy can always be placed in front externally.

## Steps

### Step 1: Create BFF Express server with proxy routes

Create a `server/` directory at the repository root with a standalone Node.js/Express application that proxies requests to the four downstream services.

**Files to create:**
- `server/package.json` — Dependencies: `express`, `http-proxy-middleware`, `cors`, `helmet`, `dotenv`; devDependencies: `typescript`, `@types/express`, `@types/cors`
- `server/tsconfig.json` — TypeScript config targeting Node.js 20 (ES2022, NodeNext modules, strict mode)
- `server/src/index.ts` — Express app entry point; mounts middleware, starts server
- `server/src/config.ts` — Configuration module; reads `TIL_API_URL`, `TIR_API_URL`, `CCS_API_URL`, `ODRL_API_URL`, `PORT`, `AUTH_CONFIG_JSON` from env vars with sensible defaults
- `server/src/proxy.ts` — Creates `http-proxy-middleware` instances for each service; maps `/api/til/*` to `TIL_API_URL`, `/api/tir/*` to `TIR_API_URL`, `/api/ccs/*` to `CCS_API_URL`, `/api/odrl/*` to `ODRL_API_URL`; strips the `/api/<service>` prefix before forwarding; forwards all request headers (including `Authorization`) transparently
- `server/src/health.ts` — `GET /health` endpoint returning `{ status: "ok" }`
- `server/src/static.ts` — Serves static files from a configurable directory (default: `../dist`); SPA fallback: non-file, non-API routes return `index.html`
- `server/src/runtime-config.ts` — `GET /config.js` endpoint that dynamically generates `window.__AUTH_CONFIG__ = <AUTH_CONFIG_JSON>;` from the env var, replacing the current `10-render-config.sh` + `config.template.js` approach for auth config

**Acceptance criteria:**
- `cd server && npm install && npm run build` succeeds
- Running `npm start` starts the Express server on configurable port
- `/api/til/`, `/api/tir/`, `/api/ccs/`, `/api/odrl/` proxy to their respective upstream URLs
- `/health` returns 200 with JSON body
- `/config.js` returns auth configuration JavaScript
- Static files from the dist directory are served at `/`
- Non-matching routes return `index.html` (SPA fallback)
- All public functions/classes are documented with JSDoc
- No magic constants — all config values are named constants

### Step 2: Simplify frontend API configuration

Remove the three-tier URL fallback system from the frontend. Since all API requests now go through the BFF at relative `/api/*` paths, the frontend no longer needs runtime URL injection or build-time URL env vars.

**Files to modify:**
- `src/api/config.ts` — Remove `loadApiConfig()`, `resolveServiceUrl()`, `extractStringField()`, the `ApiConfigOverrides` interface, and all `VITE_*_API_URL` / `window.__API_CONFIG__` constants. Replace `configureApiClients()` with a simplified version that sets each `OpenAPI.BASE` to its fixed default proxy path (`/api/til`, `/api/tir`, `/api/ccs`, `/api/odrl`) and wires the `authTokenResolver`. The token resolver itself is unchanged.
- `src/vite-env.d.ts` — Remove `ImportMetaEnv` declarations for `VITE_TIL_API_URL`, `VITE_TIR_API_URL`, `VITE_CCS_API_URL`, `VITE_ODRL_API_URL` if present, and remove the `Window.__API_CONFIG__` augmentation if present.
- `public/config.template.js` — Remove the `__API_CONFIG__` assignment. Keep only `__AUTH_CONFIG__` (or remove entirely if the BFF now serves `/config.js` dynamically).

**Files NOT modified:**
- Pinia stores (`src/stores/til.ts`, `ccs.ts`, `policies.ts`) — No changes needed. They call generated service methods which use `OpenAPI.BASE`; the base URL change is transparent.
- Views — No changes needed. They interact with stores, not API clients directly.
- Generated API clients (`src/api/generated/**`) — No changes needed. They read `OpenAPI.BASE` at request time.

**Acceptance criteria:**
- `npm run build` (which includes `vue-tsc --noEmit`) passes without errors
- `npm run lint` passes
- `configureApiClients()` sets all four `OpenAPI.BASE` values to their `/api/<service>` paths
- `authTokenResolver` still wired to all four clients
- No references to `window.__API_CONFIG__` URL fields remain in non-generated source
- No `VITE_*_API_URL` references remain in non-generated source (except potentially in `vite.config.ts` which is addressed in Step 3)

### Step 3: Update Docker and deployment infrastructure

Replace the nginx-based production setup with the BFF server. The Dockerfile builds both the frontend and the BFF, and the container runs the Node.js BFF as its sole process.

**Files to modify:**
- `Dockerfile` — Rewrite as a multi-stage build:
  - Stage 1 (`build-frontend`): Same as current — `node:20-alpine`, `npm ci`, `npm run generate:api`, `npm run build` producing `dist/`
  - Stage 2 (`build-server`): `node:20-alpine`, copies `server/`, runs `npm ci --omit=dev` + `npm run build` producing `server/dist/`
  - Stage 3 (`production`): `node:20-alpine` (not nginx), copies frontend `dist/` and server `dist/` + `node_modules/`, sets env vars with defaults, `EXPOSE 3000`, `CMD ["node", "server/dist/index.js"]`
- `docker-compose.yml` — Update `dashboard` service:
  - Remove `NGINX_*_UPSTREAM` env vars
  - Add `TIL_API_URL`, `TIR_API_URL`, `CCS_API_URL`, `ODRL_API_URL` pointing to mock services
  - Update port mapping if BFF uses a different default port
- `scripts/docker-entrypoint.d/10-render-config.sh` — Remove or simplify. The BFF serves `/config.js` dynamically, so file-based config rendering is no longer needed for API URLs. Auth config is passed via `AUTH_CONFIG_JSON` env var directly to the BFF.
- `scripts/docker-entrypoint.d/15-set-nginx-env.envsh` — Remove (nginx upstream vars no longer used)
- `vite.config.ts` — Keep the dev proxy configuration pointing to local backend ports (it still works for frontend-only development without the BFF). Optionally add a comment noting the BFF is used in production.

**Files to remove or deprecate:**
- `default.conf.template` — No longer needed (BFF replaces nginx)
- `nginx.conf` — No longer needed
- `nginx-docker-compose.conf` — No longer needed

**Acceptance criteria:**
- `docker compose up --build` starts the dashboard with BFF serving the frontend
- Browser at `http://localhost:8080` loads the SPA
- API calls from the SPA reach the mock backends through the BFF
- No nginx process runs inside the dashboard container
- `docker compose down && docker compose up` works without errors
- Existing env vars (`AUTH_CONFIG_JSON`, `TIL_API_URL`, etc.) still work for configuration

### Step 4: Add BFF tests

Add automated tests for the BFF server to verify proxy routing, configuration, static serving, and the health endpoint.

**Files to create:**
- `server/vitest.config.ts` — Vitest config for the BFF (separate from the frontend)
- `server/src/__tests__/config.test.ts` — Tests for configuration loading:
  - Default values when env vars are unset
  - Custom values from env vars
  - Port parsing and defaults
- `server/src/__tests__/health.test.ts` — Tests for health endpoint:
  - Returns 200 with `{ status: "ok" }`
- `server/src/__tests__/proxy.test.ts` — Tests for proxy middleware creation:
  - Correct target URLs from config
  - Path rewriting (strips `/api/<service>` prefix)
  - Verify all four services have proxy routes
- `server/src/__tests__/runtime-config.test.ts` — Tests for `/config.js` endpoint:
  - Returns valid JavaScript with auth config
  - Handles missing `AUTH_CONFIG_JSON` gracefully
  - Content-Type is `application/javascript`
- `server/src/__tests__/static.test.ts` — Tests for static file serving:
  - Serves files from the configured directory
  - SPA fallback returns `index.html` for unknown routes
- Update `server/package.json` with `vitest` dev dependency and `test` / `test:watch` scripts

**Acceptance criteria:**
- `cd server && npm test` runs all tests and passes
- Tests use parameterized test cases where applicable (e.g., testing each of the four proxy routes)
- All test files use descriptive test names
- No tests depend on external network calls (mock downstream services)
- Config tests verify env var parsing without setting process-wide env vars (use test-local overrides)

### Step 5: Update Vite dev proxy, documentation, and cleanup

Ensure the local development workflow still functions smoothly with the new BFF architecture, and update all project documentation.

**Files to modify:**
- `vite.config.ts` — Add an optional `VITE_BFF_URL` env var so the Vite dev server can proxy to a locally running BFF instance. Keep the existing direct-to-backend proxy as the default for convenience.
- `CLAUDE.md` — Update to reflect:
  - New `server/` directory in project structure
  - BFF architecture (browser → BFF → downstream services)
  - New build/run commands (`cd server && npm install && npm run build && npm start`)
  - Updated Docker workflow
  - New env vars documentation
  - Removed nginx configs
- `package.json` (root) — Add convenience scripts: `bff:dev` (runs BFF in dev mode with ts-node or tsx), `bff:build` (builds the BFF)

**Files to remove (if not already removed in Step 3):**
- `public/config.template.js` — If fully replaced by BFF's `/config.js` endpoint
- `nginx.conf` — No longer used
- `nginx-docker-compose.conf` — No longer used

**Acceptance criteria:**
- `npm run dev` still works for frontend-only development (Vite dev server with proxy)
- Running the BFF locally (`cd server && npm run dev`) and setting `VITE_BFF_URL=http://localhost:3001` proxies through the BFF
- `CLAUDE.md` accurately describes the new architecture, build commands, and project structure
- `npm run build` (frontend) and `cd server && npm run build` (BFF) both succeed
- `npm run lint` passes on all modified files
- No orphaned references to removed nginx configs remain in documentation or scripts
