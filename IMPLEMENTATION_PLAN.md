# Implementation Plan: Add apisix dashboard to fdsc-dashboard

## Overview

The Apache APISIX project ships its own first-party dashboard (Apache APISIX
Dashboard). The FIWARE Data Space Connector already deploys this component, so
the goal is to **embed** it inside `fdsc-dashboard` rather than reimplementing
its functionality. The integration must satisfy the two ticket requirements:

1. **No additional login.** Once a user is signed in to `fdsc-dashboard` via
   the existing OAuth2 / OIDC flow (Tickets #10, #12), they must be able to
   use the embedded Apisix Dashboard with the **same identity and the same
   roles** — no second sign-in prompt.
2. **Easy navigation back to the rest of the dashboard.** The user must be
   able to leave the embedded Apisix view and return to TIL / TIR / CCS /
   Policies with a single, obvious affordance.

### Architectural decision: same-origin reverse proxy + iframe view

Two patterns were considered:

| Option | How it works | Verdict |
|---|---|---|
| **A. Same-origin reverse proxy + iframe (chosen)** | nginx (prod) and Vite (dev) proxy `/apisix-dashboard/*` to the upstream Apisix Dashboard service. A new Vue route `/apisix` renders an `<iframe src="/apisix-dashboard/">`. fdsc-dashboard's app bar + navigation drawer remain visible above the iframe; SSO is achieved by configuring the Apisix Dashboard against the **same OIDC Identity Provider (IdP)** that fdsc-dashboard uses. Same origin avoids cookie/CORS/`frame-ancestors` problems. | ✅ Chosen |
| **B. Cross-origin iframe to a separate Apisix host** | Direct iframe to a different origin. Requires Apisix Dashboard to relax `frame-ancestors`/CSP, requires CORS for any token-handoff, and breaks third-party cookies in modern browsers. | ❌ Rejected |
| **C. External tab link** | Just open Apisix Dashboard in a new browser tab. | ❌ Fails the "easy move back" requirement and provides no in-UI integration. |

Option A is also consistent with the project's existing pattern of proxying
the four backend APIs (`/api/{til,tir,ccs,odrl}/`) through nginx, and with the
single-origin runtime model the Dockerfile/nginx setup already supports.

### How SSO works (Option A)

- Apisix Dashboard 3.x supports OIDC via its `conf/conf.yaml` `authentication`
  block. Operators configure it against the **same OIDC Identity Provider
  (IdP)** — e.g. Keycloak, Authentik, Dex, or any spec-compliant OIDC
  provider — and the **same OIDC client** (or a sibling client on the same
  issuer) that fdsc-dashboard already uses.
- Because both applications live on the same origin and share an active
  OIDC SSO session, the user's first navigation to `/apisix` either
  reuses the existing session silently (`prompt=none` works, see Apisix's
  OIDC plugin docs) or completes a redirect-then-back round-trip with no
  password prompt.
- Roles propagate through the OIDC token's roles claim (configurable via
  `rolesClaimPath` in the fdsc-dashboard auth config; defaults to
  `realm_access.roles` for Keycloak compatibility but works with any
  claim path the IdP supports). This is the **same claim path** the
  existing fdsc-dashboard auth store already reads
  (`DEFAULT_ROLES_CLAIM_PATH` in `src/auth/constants.ts`). Apisix
  Dashboard's role mapping is configured to honour the same role names, so
  an `admin` in fdsc-dashboard is an admin in Apisix Dashboard
  automatically.

### How "back to dashboard" works (Option A)

- The fdsc-dashboard app bar (`<v-app-bar>` in `src/App.vue`) and the
  navigation drawer (`<v-navigation-drawer>`) remain rendered **outside the
  iframe** at all times. Clicking any drawer entry navigates the parent
  window (vue-router), unloading the iframe.
- The new `ApisixView` also renders an explicit "Back to dashboard" button
  in a small toolbar above the iframe, for users who hide the drawer.
- A keyboard shortcut (Esc) optionally returns to the home route — added in
  the iframe view for accessibility.

### Scope: what this plan does and doesn't deliver

This plan delivers the **dashboard-side integration**: configuration,
proxying, routing, the iframe view, navigation, RBAC gating, mocks for local
dev, and documentation. It does **not** modify the upstream Apisix Dashboard
or the FIWARE Data Space Connector helm chart — operators of the connector
must configure their Apisix Dashboard's OIDC settings against the same
OIDC Identity Provider. That requirement is documented in the README in Step 6.

### Configuration model

A single new configuration value is introduced:

- `apisixDashboardUrl: string | null` — the upstream URL the reverse proxy
  should forward `/apisix-dashboard/*` to. When `null`/unset, the navigation
  drawer entry is hidden and the `/apisix` route returns a "not configured"
  message instead of a broken iframe.

The value is exposed two ways, mirroring the existing
`VITE_{TIL,TIR,CCS,ODRL}_API_URL` and runtime-config patterns:

- **Build-time** for local dev: `VITE_APISIX_DASHBOARD_URL` (consumed by
  `vite.config.ts`, same shape as the four backend URL vars).
- **Runtime** for production containers: `APISIX_DASHBOARD_URL` env var read
  by nginx via `envsubst` (same envsubst entrypoint Ticket #10 Step 7
  introduces for `AUTH_CONFIG_JSON`).

### Conventions followed

- JSDoc on every exported symbol; named constants (no magic strings); every
  user-facing string keyed under i18n.
- New code under `src/views/apisix/`, `src/composables/`, and `src/auth/`
  follows the project's existing `<script setup lang="ts">` Composition API
  style, Pinia store conventions, and Vitest test layout.
- Each step is independently mergeable and ends with a clean
  `npm run lint` + `npx vue-tsc --noEmit` + `npm run test` + `npm run build`.

## Steps

### Step 1: Apisix configuration types, constants, and runtime/env loader

Lay the configuration groundwork before any UI or proxy work. This step adds
the data model and a loader so subsequent steps can read a single,
well-typed `ApisixConfig`.

**Files to add:**
- `src/apisix/constants.ts`
  - `APISIX_DASHBOARD_BASE_PATH = '/apisix-dashboard/'` — the on-origin
    path the dashboard mounts at (matches the nginx/Vite proxy prefix in
    Step 2).
  - `APISIX_DASHBOARD_ROUTE_PATH = '/apisix'` — the internal Vue route
    path that renders the iframe view.
  - `APISIX_DASHBOARD_ROUTE_NAME = 'apisix-dashboard'`.
  - `BUILD_TIME_APISIX_URL_ENV_VAR = 'VITE_APISIX_DASHBOARD_URL'`
    (documentation only; consumed via `import.meta.env`).
  - `RUNTIME_APISIX_CONFIG_KEY = 'apisixDashboardUrl'` — the field name
    inside `window.__AUTH_CONFIG__` (or the dedicated `__APISIX_CONFIG__`
    global, see below) that carries the upstream URL.
- `src/apisix/types.ts`
  - `interface ApisixConfig { readonly upstreamUrl: string | null }`.
- `src/apisix/config.ts`
  - `loadApisixConfig(): ApisixConfig` — resolution order:
    1. `window.__APISIX_CONFIG__?.upstreamUrl` if it is a non-empty string.
    2. `import.meta.env.VITE_APISIX_DASHBOARD_URL` if non-empty.
    3. `null` (= "not configured" → drawer entry hidden).
  - `isApisixConfigured(config): boolean` — `config.upstreamUrl !== null`.
- `src/apisix/__tests__/config.spec.ts` — parameterised Vitest spec covering
  empty/missing config, env-var fallback, runtime override precedence, and
  whitespace-only values being treated as unset.
- `src/vite-env.d.ts` — extend with
  `readonly VITE_APISIX_DASHBOARD_URL?: string` and a
  `declare global { interface Window { __APISIX_CONFIG__?: ApisixConfig } }`.

**Files to modify:** none beyond `vite-env.d.ts`.

**Acceptance criteria:**
- `loadApisixConfig()` returns a deterministic `ApisixConfig` for each
  resolution branch.
- All exported symbols carry JSDoc; no magic strings.
- `npm run test`, `npm run lint`, `npx vue-tsc --noEmit` pass.

### Step 2: Reverse-proxy passthrough wiring (Vite dev + nginx prod + docker-compose)

Make `/apisix-dashboard/*` resolvable on the same origin as fdsc-dashboard
in every environment we ship.

**Files to modify:**
- `vite.config.ts`
  - Add a `DEFAULT_APISIX_URL = 'http://localhost:9000'` named constant
    (Apisix Dashboard's default port).
  - Add a `'/apisix-dashboard'` entry to `server.proxy` that targets
    `process.env.VITE_APISIX_DASHBOARD_URL || DEFAULT_APISIX_URL`,
    `changeOrigin: true`, and **does NOT rewrite the path** — the upstream
    Apisix Dashboard expects to be served at `/apisix-dashboard/` (its
    `conf.yaml` `web_dir` / `path_prefix`), matching the way Apisix's own
    docker image documents reverse-proxy embedding. If the operator's
    Apisix Dashboard is configured with a root prefix instead, document
    the alternative `rewrite` snippet in a code comment.
  - WebSocket support is not required (Apisix Dashboard does not use
    websockets), but enable `ws: true` defensively to avoid surprises with
    HMR-style endpoints.
- `nginx.conf`
  - Add a new `location /apisix-dashboard/ { ... }` block proxying to
    `http://apisix-dashboard:9000/apisix-dashboard/`. The upstream host is
    parameterised via nginx variables so the Dockerfile entrypoint can
    rewrite the host at container start (see Step 6 docs for how
    `APISIX_DASHBOARD_URL` becomes the upstream).
  - Standard `proxy_set_header Host`, `X-Real-IP`, `X-Forwarded-For`,
    `X-Forwarded-Proto` headers; raise `proxy_buffer_size` modestly to
    accommodate Apisix Dashboard's HTML chunk sizes.
  - Forward the user's `Authorization: Bearer <jwt>` header so the
    upstream sees the same SSO token (this is implicit because nginx
    passes through request headers by default — verify and document).
- `nginx-docker-compose.conf` — same `location /apisix-dashboard/` block
  pointing at the new `mock-apisix-dashboard` service introduced in
  Step 5, using the embedded Docker DNS resolver pattern already used for
  the four mock backends.
- `Dockerfile` — extend the `envsubst` allowlist (Ticket #10 Step 7) to
  include `${APISIX_DASHBOARD_URL}` so operators can override the upstream
  at container start without rebuilding the image. Default value when
  unset: `http://apisix-dashboard:9000`.

**Acceptance criteria:**
- `npm run dev` proxies `/apisix-dashboard/foo` to
  `${VITE_APISIX_DASHBOARD_URL}/apisix-dashboard/foo` (or the default port).
- `docker compose up --build` (after Step 5) serves a placeholder Apisix
  Dashboard at `http://localhost:8080/apisix-dashboard/`.
- `nginx -t` reports a valid configuration in the production image.
- No regressions in the four existing `/api/*` proxies — they keep their
  current behaviour.

### Step 3: ApisixView component, route registration, and admin-only guard

Add the Vue route and the iframe-bearing component, and register them in
the router behind the existing `meta.requiresAdmin` guard.

**Files to add:**
- `src/views/apisix/ApisixView.vue` — `<script setup lang="ts">`:
  - Reads `loadApisixConfig()` at mount and renders one of three states:
    1. **Configured** → shows a small toolbar (back button + "Open in new
       tab" icon) followed by an `<iframe>` whose `src` is
       `APISIX_DASHBOARD_BASE_PATH`. The iframe has
       `referrerpolicy="no-referrer-when-downgrade"`,
       `loading="eager"`, `title` bound to `t('apisix.iframeTitle')`,
       and a `sandbox` attribute that includes `allow-scripts`,
       `allow-same-origin`, `allow-forms`, `allow-popups`, and
       `allow-popups-to-escape-sandbox` (required because Apisix
       Dashboard relies on JS, cookies, form submission, and same-origin
       fetch). The iframe fills the available height
       (`height: calc(100vh - <appbar+toolbar>); width: 100%; border: 0`).
    2. **Not configured** → renders an `<v-alert type="info">` with the
       i18n key `apisix.notConfigured` instructing the operator to set
       `VITE_APISIX_DASHBOARD_URL` / `APISIX_DASHBOARD_URL`. A "Back to
       home" button is included.
    3. **Forbidden** (defensive, shouldn't normally render because the
       guard catches first) → `<v-alert type="warning">` with
       `apisix.adminOnly`.
  - Exposes a `goBack()` function that calls `router.push({ name: 'home' })`
    and is wired to both the toolbar button and a `keydown.esc` listener
    on the wrapper element. JSDoc on every function.
- `src/views/apisix/__tests__/ApisixView.spec.ts` — Vitest + Vue Test Utils:
  - Renders the iframe when configured.
  - Renders the "not configured" alert otherwise.
  - Calls `router.push` when the back button is clicked.
  - Esc keypress triggers the same `goBack()` path.
  - Iframe `src` equals `APISIX_DASHBOARD_BASE_PATH`.

**Files to modify:**
- `src/router/index.ts`
  - Import `APISIX_DASHBOARD_ROUTE_PATH` and `APISIX_DASHBOARD_ROUTE_NAME`
    from `@/apisix/constants`.
  - Register the route:
    ```ts
    {
      path: APISIX_DASHBOARD_ROUTE_PATH,
      name: APISIX_DASHBOARD_ROUTE_NAME,
      component: () => import('@/views/apisix/ApisixView.vue'),
      meta: { ...ADMIN_ONLY_META },
    }
    ```
  - The existing `authGuard` already understands `meta.requiresAdmin`, so
    no guard changes are required. Update `adminOnlyFallback` to redirect
    name-prefix `apisix-` routes to `home` (already the default branch —
    verify only).
- `src/router/__tests__/guards.spec.ts` (existing or new from Ticket #10)
  — add a parameterised case for the new route asserting:
  - Anonymous user → redirected to `/login`.
  - Viewer → redirected to `/`.
  - Admin → allowed.
  - Auth disabled → allowed (consistent with existing behaviour).

**Acceptance criteria:**
- Visiting `/apisix` as `admin` renders the iframe pointing at
  `/apisix-dashboard/`.
- Visiting `/apisix` as `viewer` redirects to `/`.
- Visiting `/apisix` unauthenticated (with auth enabled) redirects to
  `/login` with `returnTo` preserved.
- All new code is JSDoc-documented; tests are parameterised where the
  cases share assertion shape.

### Step 4: Navigation drawer entry, app-bar shortcut, i18n strings

Surface the new view in the existing `App.vue` navigation, gated on
configuration **and** the user's role.

**Files to modify:**
- `src/App.vue`
  - Import `loadApisixConfig`, `isApisixConfigured` from `@/apisix/config`,
    and the `APISIX_DASHBOARD_ROUTE_NAME` constant.
  - Compute `apisixVisible = computed(() => isApisixConfigured(apisixConfig)
    && (!isAuthEnabled.value || isAdmin.value))`. When auth is disabled
    Apisix is shown unconditionally (preserves the legacy "no providers
    configured" mode), otherwise it requires the `admin` role — matching
    the route guard.
  - In `<v-navigation-drawer>`, after the "Policies" entry, add:
    ```html
    <v-divider v-if="apisixVisible" class="my-2" />
    <v-list-item
      v-if="apisixVisible"
      prepend-icon="mdi-traffic-light"
      :title="t('nav.apisix')"
      :to="{ name: APISIX_DASHBOARD_ROUTE_NAME }"
    />
    ```
    Use a distinct icon (e.g. `mdi-traffic-light` or `mdi-router-network`)
    so the entry is visually separable from the resource-management
    section.
  - Pull the canonical role from the existing auth store (`isAdmin`
    getter) — do not reimplement role checks.

- `src/locales/en.json` — append a new top-level `apisix` section:
  - `apisix.iframeTitle`: "Apache APISIX Dashboard"
  - `apisix.toolbarBack`: "Back to dashboard"
  - `apisix.openInNewTab`: "Open in new tab"
  - `apisix.notConfiguredTitle`: "Apisix Dashboard not configured"
  - `apisix.notConfigured`: explanatory paragraph naming the env vars
    `VITE_APISIX_DASHBOARD_URL` and `APISIX_DASHBOARD_URL`.
  - `apisix.adminOnly`: "Apisix Dashboard access requires the admin role."
  - Add `nav.apisix`: "Apisix Dashboard" under the existing `nav` section.
  - Every new string is wired into the view in Step 3 / `App.vue` here.

- `src/views/HomeView.vue` — add a new dashboard tile (Vuetify card) next
  to TIL/CCS/Policies that links to `/apisix`, gated on the same
  `apisixVisible` computed (extracted into the new
  `src/composables/useApisix.ts` so HomeView and App.vue share one
  predicate). The tile uses `home.apisixDescription`: "Manage gateway
  routes, services, and consumers."

**Files to add:**
- `src/composables/useApisix.ts` — `useApisix()` returns reactive
  `{ config, isConfigured, isVisible }`. JSDoc on every export. The
  `isVisible` getter encapsulates the auth-disabled vs. admin-required
  rule so the same policy is enforced in `App.vue`, `HomeView.vue`, and
  the route guard test fixtures.
- `src/composables/__tests__/useApisix.spec.ts` — parameterised Vitest
  cases covering `(authEnabled, role, configured) → isVisible` for the
  full truth table.

**Acceptance criteria:**
- Drawer entry appears for admins (or in auth-disabled mode) only when the
  upstream URL is set.
- Clicking the entry navigates to `/apisix` without a full reload.
- HomeView tile mirrors the same visibility rule.
- All new strings render via `t(...)`; no hardcoded user-facing literals.

### Step 5: Mock Apisix Dashboard service for local docker-compose

Provide a stand-in service so contributors can exercise the integration
end-to-end without a full OIDC IdP + Apisix stack. The mock simulates the
Apisix Dashboard's served HTML so the iframe renders something
recognisable.

**Files to add:**
- `mocks/apisix-dashboard/index.html` — minimal HTML page with
  `<title>Mock Apisix Dashboard</title>`, a heading, a paragraph
  explaining "this is a placeholder for the Apache APISIX Dashboard",
  and a small JS snippet that prints the `Authorization` header value
  to the page if it was forwarded by the proxy (for visual verification
  of SSO header passthrough during dev). The HTML is self-contained —
  no external assets — so it works in offline CI environments.
- `mocks/apisix-dashboard/health.json` — `{"status":"ok"}` (consumed by
  the docker-compose healthcheck).
- `mocks/apisix-dashboard-nginx.conf` — nginx config exposing the static
  files at `/apisix-dashboard/`. Mirrors the four existing
  `mocks/*-nginx.conf` files in style.

**Files to modify:**
- `docker-compose.yml`
  - Add a new service `mock-apisix-dashboard` using the same
    `nginx:alpine` image and the new mounts:
    ```yaml
    mock-apisix-dashboard:
      image: nginx:alpine
      volumes:
        - ./mocks/apisix-dashboard:/usr/share/nginx/html/apisix-dashboard:ro
        - ./mocks/apisix-dashboard-nginx.conf:/etc/nginx/conf.d/default.conf:ro
    ```
  - Add it to the dashboard service's `depends_on` list.
- `nginx-docker-compose.conf` — finalise the proxy block to point at
  `http://mock-apisix-dashboard:80/apisix-dashboard/` (the partial block
  added in Step 2 used a placeholder hostname; this step swaps to the
  real mock service hostname).

**Acceptance criteria:**
- `docker compose up --build` boots the dashboard, the four backend mocks,
  and the new Apisix mock.
- Browsing `http://localhost:8080/apisix-dashboard/` directly shows the
  placeholder HTML.
- Browsing `http://localhost:8080/apisix` (the Vue route) renders the
  iframe with the placeholder HTML inside it.
- Removing `mock-apisix-dashboard` from `depends_on` and unsetting
  `VITE_APISIX_DASHBOARD_URL` causes the drawer entry to disappear and
  `/apisix` to render the "not configured" alert — confirming the
  configuration gate works.

### Step 6: SSO + RBAC documentation, README updates, final quality gate

Document the operator-side configuration so SSO and role propagation
actually happen in real deployments, and lock in the conventional final
quality gate.

**Files to modify:**
- `README.md` — add three new sections:
  1. **"Apisix Dashboard integration"** under the existing top-level
     navigation overview. Explains that the dashboard is *embedded*, not
     reimplemented, names the new env vars (`VITE_APISIX_DASHBOARD_URL`
     for dev, `APISIX_DASHBOARD_URL` for the container), and links to
     the upstream Apisix Dashboard project.
  2. **"SSO with Apisix Dashboard"** — operator instructions:
     - Configure Apisix Dashboard's `conf.yaml` `authentication.oidc`
       block against the **same OIDC Identity Provider (IdP)** and
       either the same OIDC client id or a sibling client on the same
       issuer.
     - Set the redirect URI to the same `/apisix-dashboard/` path so the
       embedded session terminates inside the iframe.
     - Use `prompt=none` for silent SSO when an active session exists.
     - The roles claim path must match the one configured in
       fdsc-dashboard's `rolesClaimPath` (defaults to
       `realm_access.roles` for Keycloak; adjust to suit the IdP, e.g.
       `roles` for Authentik, `groups` for Dex, etc.). Ensure the IdP's
       client configuration includes the relevant roles/groups mapper.
     - Provide worked examples for common IdPs (Keycloak realm JSON
       snippet, generic OIDC provider config) and an Apisix Dashboard
       `conf.yaml` snippet.
  3. **"Role propagation"** — explains that fdsc-dashboard's `admin` and
     `viewer` roles map to Apisix Dashboard's role model via the shared
     OIDC roles claim (path is configurable per provider), and that no
     token forwarding is performed by fdsc-dashboard for the embedded
     session — Apisix Dashboard authenticates **directly** with the OIDC
     IdP in its own redirect flow. (This avoids the security pitfall of
     injecting a dashboard-issued token into a third-party app.)
- ~~`CLAUDE.md`~~ — **Skipped.** `CLAUDE.md` is appended to the system
  prompt and cached across agent sessions; editing it invalidates the
  cached prefix for every subsequent chained session. The project
  structure and conventions are already documented in `README.md`.

**Files affected by the quality gate (any that need fixes):** TBD —
likely none new.

**Quality gate:**
- `npm run lint` exits 0.
- `npx vue-tsc --noEmit` exits 0.
- `npm run test` exits 0; new specs from Steps 1, 3, and 4 are green.
- `npm run build` completes successfully.
- `nginx -t` against `nginx.conf` and `nginx-docker-compose.conf` passes.

**Acceptance criteria:**
- README sections render correctly on GitHub and contain the worked
  OIDC IdP + Apisix `conf.yaml` examples (with Keycloak as one
  example among other supported IdPs).
- All new user-facing strings are i18n-keyed under `apisix.*` and
  `nav.apisix`.
- The dashboard runs unchanged when `APISIX_DASHBOARD_URL` is unset
  (drawer entry hidden, `/apisix` route still loads but shows the
  "not configured" alert).
- A user logged in as admin can switch between fdsc-dashboard sections
  and the embedded Apisix Dashboard with no second login prompt and a
  single click to return.
