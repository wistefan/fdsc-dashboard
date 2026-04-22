# Implementation Plan: fdsc-dashboard should propagate tokens to the backend apis

## Overview
When auth is configured, the dashboard must attach `Authorization: Bearer <jwt>` on every outbound call to the three managed-resource backends (TIL, CCS, ODRL-PAP) and, for consistency, to the TIR read API. When no token is configured, no `Authorization` header is sent and the current behavior is preserved. The implementation introduces a single reactive auth composable that owns the current JWT, wires a shared token **resolver** into each generated OpenAPI client's `TOKEN` field (picked up automatically by the existing `getHeaders` helper), and adds a minimal UI affordance so users can set/clear a token at runtime. Bootstrapping supports a build-time `VITE_AUTH_TOKEN` env var and a persisted runtime override in `localStorage`.

## Steps

### Step 1: Create the auth composable with reactive token state
Create `src/composables/useAuth.ts` that owns the application's JWT and exposes a reactive API, mirroring the style used by `src/composables/useTheme.ts` and `src/composables/useLocale.ts` (module-level state + `init*` function called from `App.vue`).

**Requirements:**
- Module-level `ref<string>('')` holding the current token. Empty string means "no token / unauthenticated".
- Named constants at the top of the file:
  - `AUTH_TOKEN_STORAGE_KEY = 'fdsc-dashboard-auth-token'`
  - `AUTH_TOKEN_ENV_KEY = 'VITE_AUTH_TOKEN'` (documentation only; the env is read via `import.meta.env.VITE_AUTH_TOKEN`).
- `useAuth()` returns:
  - `token` – `ComputedRef<string>` of the current token.
  - `isAuthenticated` – `ComputedRef<boolean>` = `token.value.length > 0`.
  - `setToken(value: string): void` – trims whitespace, stores in the ref, persists non-empty values to `localStorage`, removes the key when empty.
  - `clearToken(): void` – convenience wrapper for `setToken('')`.
  - `initAuth(): void` – called once at app startup. Resolution order:
    1. `localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)` if present.
    2. `import.meta.env.VITE_AUTH_TOKEN` if present and non-empty.
    3. No-op (stays empty).
  - `getAuthTokenSync(): string` – non-reactive getter, used by the API-client resolver (see Step 3) so it can be called from non-component contexts without needing to re-run `useAuth()`.
- All public functions documented with JSDoc. No magic constants.

**Files:**
- `src/composables/useAuth.ts` (new)
- `src/vite-env.d.ts` (modify — add `readonly VITE_AUTH_TOKEN?: string` to `ImportMetaEnv`)

**Acceptance criteria:**
- `useAuth()` returns a stable object whose `token` reacts to `setToken`/`clearToken`.
- `initAuth()` prefers `localStorage` over the env var when both are present.
- `setToken('')` removes the `localStorage` entry; `setToken('abc')` writes it.
- No changes yet to any API-client configuration — the composable is wired in Step 3.

### Step 2: Call `initAuth()` at application startup
Invoke the new composable's initializer alongside the existing theme and locale initializers so the token is loaded before the first render.

**Requirements:**
- In `src/App.vue`, import `useAuth` and call `initAuth()` inside the existing `onMounted` block (next to `initTheme()` and `initLocale()`).
- Order: `initAuth()` is called **before** `initTheme()`/`initLocale()` is irrelevant functionally, but place it first so the token is present if any early route guard ever needs it.
- No other changes in this step.

**Files:**
- `src/App.vue` (modify — add `initAuth()` call)

**Acceptance criteria:**
- `npm run dev` starts with no console errors.
- A token set in `localStorage` under `fdsc-dashboard-auth-token` is available via `useAuth().token` on mount.
- The app still renders identically when no token is configured.

### Step 3: Wire a shared token resolver into every generated OpenAPI client
Modify `src/api/config.ts` so each generated client emits `Authorization: Bearer <jwt>` whenever a token is present, and no `Authorization` header otherwise. The existing generated `getHeaders` helper in `core/request.ts` (line 158-160 of each generated client) already adds the header when `TOKEN` resolves to a non-empty string — so all we need is to set `OpenAPI.TOKEN` to a `Resolver<string>`.

**Requirements:**
- Import `getAuthTokenSync` from `@/composables/useAuth`.
- Define a module-level resolver:
  ```ts
  const authTokenResolver = async (): Promise<string> => getAuthTokenSync()
  ```
  JSDoc must state that returning an empty string suppresses the `Authorization` header (because `isStringWithValue` in the generated `request.ts` returns false for empty strings).
- In `configureApiClients()`, after setting each client's `BASE`, also set:
  ```ts
  TilOpenAPI.TOKEN = authTokenResolver
  TirOpenAPI.TOKEN = authTokenResolver
  CcsOpenAPI.TOKEN = authTokenResolver
  OdrlOpenAPI.TOKEN = authTokenResolver
  ```
- The resolver must be a single shared reference (one function literal) to make equality checks in tests straightforward.
- Do not edit anything under `src/api/generated/` — that directory is auto-generated.
- The resolver is a `Resolver<string>` per the generated `OpenAPIConfig` type signature (`TOKEN?: string | Resolver<string> | undefined`) so no `any` casts are required.

**Files:**
- `src/api/config.ts` (modify)

**Acceptance criteria:**
- With a token present (`setToken('dummy.jwt.value')`), every outbound request to TIL, CCS, ODRL, and TIR carries `Authorization: Bearer dummy.jwt.value`.
- With no token, **no** `Authorization` header is emitted (verified via browser devtools or a unit test that inspects request headers).
- TypeScript compiles cleanly; `npx vue-tsc --noEmit` passes.
- No changes required in any view, store, or generated client.

### Step 4: Add a minimal auth-token affordance to the app bar
Provide a small UI so users can set/clear a JWT at runtime without editing `localStorage` by hand. This satisfies the "when auth is configured" branch explicitly and is the minimum UX needed to verify the feature end-to-end.

**Requirements:**
- In `src/App.vue`, add a new icon button in the app bar, placed before the theme toggle:
  - Icon `mdi-shield-lock` when `isAuthenticated.value === true`.
  - Icon `mdi-shield-lock-open-outline` when unauthenticated.
  - `aria-label` bound to a new i18n key `auth.toggle`.
- Clicking it opens a `v-dialog` containing:
  - Title `auth.dialogTitle` ("Authentication Token").
  - A `v-textarea` (monospace, rows=4) bound to a local `tokenInput` ref, labeled via `auth.tokenLabel`.
  - A help string `auth.tokenHelp` ("Paste a JWT. It will be sent as `Authorization: Bearer …` on all API calls and persisted in your browser.").
  - Footer actions: `common.cancel`, `auth.clear` (disabled when no token is set), and `auth.save`.
- `auth.save` calls `setToken(tokenInput.value)` then closes the dialog.
- `auth.clear` calls `clearToken()` and closes the dialog.
- Add all new i18n keys to `src/locales/en.json` under a new `auth` section:
  - `auth.toggle`
  - `auth.dialogTitle`
  - `auth.tokenLabel`
  - `auth.tokenHelp`
  - `auth.save`
  - `auth.clear`
  - `auth.statusAuthenticated` ("Authenticated")
  - `auth.statusUnauthenticated` ("No token configured")
- All strings rendered via `t()`. No hardcoded literals.

**Files:**
- `src/App.vue` (modify — add auth button + dialog)
- `src/locales/en.json` (modify — add `auth` section)

**Acceptance criteria:**
- Clicking the shield icon opens the dialog pre-populated with the current token (if any).
- After saving a non-empty value, the icon switches to the locked variant and subsequent API requests include the header.
- After clearing, the icon switches back and no `Authorization` header is sent.
- The token survives a page reload (via `localStorage`).
- `npm run lint` and `npx vue-tsc --noEmit` pass.

### Step 5: Unit tests for the auth composable and the API-client wiring
Add Vitest unit tests covering both the composable and the resolver integration. Use the existing test infrastructure (`vitest.config.ts`, `src/test-setup.ts`).

**Requirements:**
- `src/composables/__tests__/useAuth.spec.ts` (new):
  - Setup: reset `localStorage` and the module's internal `ref` between tests (re-import the module via `vi.resetModules()` in a `beforeEach`, or expose a test-only `__resetForTests` helper — prefer `vi.resetModules()`).
  - Tests (use `it.each` where the assertions are uniform):
    - `setToken` stores a non-empty token in `localStorage` under `fdsc-dashboard-auth-token`.
    - `setToken('')` removes the key from `localStorage`.
    - `clearToken()` is equivalent to `setToken('')`.
    - `setToken('  abc  ')` trims whitespace.
    - `isAuthenticated` is `true` iff token is non-empty.
    - `initAuth()` restores a token persisted in `localStorage`.
    - `initAuth()` falls back to `import.meta.env.VITE_AUTH_TOKEN` when `localStorage` is empty. Stub via `vi.stubEnv('VITE_AUTH_TOKEN', 'env.jwt.value')`.
    - `initAuth()` prefers `localStorage` over the env var when both are set.
    - `getAuthTokenSync()` returns the current token synchronously (no promise).
- `src/api/__tests__/config.spec.ts` (new):
  - Mock `@/composables/useAuth` so `getAuthTokenSync` returns a controllable value.
  - After calling `configureApiClients()`, assert that `TilOpenAPI.TOKEN`, `TirOpenAPI.TOKEN`, `CcsOpenAPI.TOKEN`, and `OdrlOpenAPI.TOKEN` are all set to the **same function reference**.
  - Invoke the resolver: when `getAuthTokenSync` returns `'abc'`, the resolver resolves to `'abc'`; when it returns `''`, the resolver resolves to `''`.
  - Assert that each client's `BASE` is set from the corresponding `VITE_*_API_URL` (stub with `vi.stubEnv`) or the default proxy prefix.
- Use `it.each` for the four parallel `OpenAPI` client assertions (`[['til', TilOpenAPI], ['tir', TirOpenAPI], ['ccs', CcsOpenAPI], ['odrl', OdrlOpenAPI]]`).
- Every test file includes JSDoc at the top describing what it covers.

**Files:**
- `src/composables/__tests__/useAuth.spec.ts` (new)
- `src/api/__tests__/config.spec.ts` (new)

**Acceptance criteria:**
- `npm run test` passes all new tests alongside the existing suite.
- No real network requests are made (generated clients are imported but never invoked).
- Each behavior above has at least one assertion.
- Parameterized (`it.each`) tests are used where test cases are structurally identical.

### Step 6: Document the feature and finalize lint/type-check/build
Update the README and CLAUDE.md so future contributors know how auth works, then run the full quality gate.

**Requirements:**
- `README.md`: add a new top-level **Authentication** section after "Running with Docker Compose (Mock Backends)". Contents:
  - Describe the `VITE_AUTH_TOKEN` build-time env var (same table format used for the API URL vars).
  - Describe the runtime dialog in the app bar (locked vs unlocked shield icons).
  - Note that the token is persisted in `localStorage` under the key `fdsc-dashboard-auth-token` and that setting an empty value clears it.
  - Note that all four backend clients (TIL, TIR, CCS, ODRL) include the header when a token is present, and no `Authorization` header is sent otherwise.
- `CLAUDE.md`: append `useAuth.ts` to the `composables/` tree and add a one-line "Auth token is propagated to all generated API clients via `configureApiClients`" bullet under **Key Conventions**.
- Run and ensure all of the following pass with zero errors:
  - `npm run lint`
  - `npx vue-tsc --noEmit`
  - `npm run test`
  - `npm run build`

**Files:**
- `README.md` (modify)
- `CLAUDE.md` (modify)
- Any files with lint or type errors surfaced during the final pass.

**Acceptance criteria:**
- `npm run lint` exits 0.
- `npx vue-tsc --noEmit` exits 0.
- `npm run test` exits 0 with all suites green.
- `npm run build` completes successfully.
- README clearly explains how to configure, use, and clear a JWT.
- No hardcoded user-facing strings were introduced; every new user-facing string is keyed under `auth.*` in `en.json`.
