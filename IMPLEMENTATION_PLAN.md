# Implementation Plan: Dashboard OAuth2 Authentication (Ticket #10)

## Overview

Add optional OAuth2 / OpenID Connect authentication to the FDSC Dashboard with
the following behaviour:

- If no OAuth2 provider is configured, the dashboard operates exactly as today
  (no sign-in required, no guards, no user menu).
- Operators can configure **one or more** OAuth2 providers. When at least one
  provider is configured, users must authenticate before using the dashboard.
- Two roles are supported:
  - `viewer` — read-only access to all endpoints (no create / edit / delete).
  - `admin` — full access to all functionality.
- Configuration is injected at runtime (via nginx env-var templating into a
  `window.__AUTH_CONFIG__` global) and can also be provided at build time via
  `VITE_AUTH_*` environment variables for local development.

The design follows the project's established conventions:
- JSDoc on every exported symbol.
- No magic constants — named constants live in dedicated `constants.ts` files.
- Errors bubble up through Pinia stores with `ApiError`-style handling where
  applicable.
- Every user-facing string goes through Vue I18n.
- Each step is independently mergeable, reviewable, and tested.

## Terminology

- **Provider** — a configured OAuth2 / OIDC Identity Provider (e.g. Keycloak).
  Each provider has an `id`, `displayName`, `issuer`, `clientId`, `scopes`, and
  an optional `rolesClaimPath` for extracting the user's role from the token.
- **Auth enabled** — at least one provider is configured.
- **User** — the authenticated subject with a `subject`, `name`, `email`,
  `roles`, `providerId`.

## Steps

### Step 1: Auth configuration types and runtime loader

Lay the groundwork for the whole feature by defining the authentication data
model and a runtime configuration loader.

**Files (new):**
- `src/auth/constants.ts` — role identifiers, default OAuth2 scopes, storage
  keys, and the name of the runtime-config global.
- `src/auth/types.ts` — `Role`, `OAuthProviderConfig`, `AuthConfig`,
  `AuthenticatedUser` TypeScript types.
- `src/auth/config.ts` — `loadAuthConfig()`, `isAuthEnabled()`, and
  `getProviderById()` helpers. Reads config from
  `window.__AUTH_CONFIG__` (runtime) with a fallback to `VITE_AUTH_PROVIDERS`
  (build-time JSON string) for local development.
- `src/auth/__tests__/config.spec.ts` — parameterised unit tests covering:
  empty config → disabled, malformed JSON → disabled with logged warning,
  single provider, multiple providers, fallback to `DEFAULT_OAUTH_SCOPES`
  when scopes are omitted.
- `src/vite-env.d.ts` — extend with `VITE_AUTH_PROVIDERS` typing and the
  `window.__AUTH_CONFIG__` global declaration.

**Acceptance criteria:**
- `loadAuthConfig()` returns a deterministic `AuthConfig` object.
- `isAuthEnabled(config)` returns `false` for an empty provider list and
  `true` otherwise.
- `DEFAULT_OAUTH_SCOPES = ['openid', 'profile']` (no `email` — data
  minimisation).
- All new symbols carry JSDoc.
- `npm run test` passes.
- `npm run lint` and `npx vue-tsc --noEmit` pass.

### Step 2: OIDC client wrapper (oidc-client-ts integration)

Add `oidc-client-ts` and expose a thin per-provider facade the store can call.

**Files:**
- `package.json` — add `oidc-client-ts` runtime dependency.
- `src/auth/oidcClient.ts` — `createUserManager(provider)`, plus
  `signinRedirect`, `signinRedirectCallback`, `signoutRedirect`,
  `getUser`, `removeUser` helpers. PKCE authorisation-code flow.
  Uses `sessionStorage` for state and a dedicated storage key per provider.
- `src/auth/__tests__/oidcClient.spec.ts` — unit tests that mock
  `oidc-client-ts` and verify the UserManager is constructed with the correct
  `authority`, `client_id`, `redirect_uri`, `response_type`, and `scope`.

**Acceptance criteria:**
- UserManager settings derive from `OAuthProviderConfig` with no duplication.
- Redirect URI is built from `window.location.origin` and the callback
  route so it works in dev, preview, and production.
- Silent renew is wired up when the provider config sets `silentRenew: true`.

### Step 3: Auth Pinia store

Create `src/stores/auth.ts` with the runtime auth state plus actions.

**State:** `config` (from Step 1), `user` (`AuthenticatedUser | null`),
`activeProviderId`, `status` (`idle` | `authenticating` | `authenticated` |
`error`), `error`.

**Getters:** `isAuthEnabled`, `isAuthenticated`, `isAdmin`, `isViewer`,
`providers` (list for the login picker).

**Actions:** `init()` (read from storage, restore session), `login(providerId)`,
`handleCallback(providerId, url)`, `logout()`, `$reset()`.

**Role extraction:** follow the provider's `rolesClaimPath` (defaults to
`realm_access.roles` — Keycloak style), map to the canonical `Role` enum,
and fall back to `viewer` when no matching role is found.

**Files:**
- `src/stores/auth.ts` (new).
- `src/stores/__tests__/auth.spec.ts` (new) — covers init from stored user,
  login redirect, callback success / failure, logout, role mapping.

### Step 4: Login view, callback view, router guard

**Files:**
- `src/views/auth/LoginView.vue` — lists configured providers as
  "Sign in with &lt;provider&gt;" buttons. Auto-redirects when exactly one
  provider is configured and the user is already authenticated.
- `src/views/auth/CallbackView.vue` — three-state rendering (loading, error
  with retry, success → redirect to `returnTo` or `/`). Calls
  `store.handleCallback()` on mount.
- `src/router/index.ts` — add `/login` and `/callback/:providerId` routes.
  Install a `beforeEach` guard that, when `isAuthEnabled`, requires
  `isAuthenticated` for every route except the login/callback pair, and
  preserves `returnTo`.

**Acceptance criteria:**
- With no providers configured, no redirects happen, no guard interferes.
- With providers configured, an unauthenticated user is sent to `/login`
  preserving the target route.
- Logout returns the user to `/login` and clears storage.

### Step 5: RBAC — role-based UI gating

**Files:**
- `src/composables/useAuth.ts` — `isAdmin`, `isViewer`, `canEdit`, `canDelete`
  reactive helpers that return `true` when auth is disabled (backwards compat).
- `src/views/til/TilListView.vue`, `CcsListView.vue`, `PolicyListView.vue` —
  hide the "Create" button when `!canEdit`.
- `src/views/til/TilDetailView.vue`, `CcsDetailView.vue`, `PolicyDetailView.vue`
  — hide Edit/Delete actions when `!canEdit` / `!canDelete`.
- `src/views/til/TilFormView.vue`, `CcsFormView.vue`, `PolicyFormView.vue` —
  the route guard blocks viewer access to these, but add a defensive redirect
  in the component as well.

**Acceptance criteria:**
- Viewer cannot see or navigate to create/edit/delete controls.
- Admin sees the current full UI.
- Auth-disabled mode preserves today's behaviour exactly.

### Step 6: App bar integration & i18n

**Files:**
- `src/App.vue` — add a user menu showing the user's name, provider, role, and
  a Logout item. Hidden when auth is disabled.
- `src/views/auth/LoginView.vue` — picks up i18n strings.
- `src/locales/en.json` — new `auth` section with `signIn`, `signInWith`,
  `signOut`, `role`, `viewer`, `admin`, `provider`, `loginRequired`,
  `callbackFailed`, `callbackRetry`, etc.

### Step 7: Runtime configuration templating

**Files:**
- `public/config.template.js` — `window.__AUTH_CONFIG__ = ${AUTH_CONFIG_JSON};`
  placeholder template.
- `Dockerfile` — add an entrypoint that runs `envsubst` (or a small shell
  script) to materialise `/usr/share/nginx/html/config.js` from the template
  at container start.
- `index.html` — `<script src="/config.js"></script>` before the bundle.
- `README.md` — document the `AUTH_CONFIG_JSON` env var, the expected JSON
  shape, and an example Keycloak configuration.

**Acceptance criteria:**
- `docker run -e AUTH_CONFIG_JSON='{"providers":[...]}' fdsc-dashboard`
  activates auth without rebuilding the image.
- Omitting the env var leaves `providers: []` → auth disabled.

### Step 8: Tests, documentation, and polish

**Files:**
- `src/views/__tests__/LoginView.spec.ts`, `CallbackView.spec.ts` — component
  tests covering the three render states and navigation.
- `src/router/__tests__/guards.spec.ts` — guard tests with a mocked store.
- `README.md` — a dedicated "Authentication" section with the Keycloak
  example realm config.
- `src/locales/en.json` — i18n completeness pass.
- Run `npm run lint`, `npx vue-tsc --noEmit`, `npm run build`, `npm run test`
  — all must pass with zero errors.
